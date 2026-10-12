const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const collection = db.collection('orders');

// 唯一主厨身份，只在云函数内校验；前端传入的 role/openid 一律不作为授权依据。
const CHEF_OPENID = 'oAxtA3QqptjCi_-1doqOHGgIZBaM';
const NEXT_STATUS = { pending: 'accepted', accepted: 'cooking', cooking: 'done', done: 'delivering', delivering: 'delivered' };
const deliveryMode = mode => mode === 'dine_in' ? 'dine_in' : 'delivery';

function publicOrder(record) {
  const { _id, _openid, ...order } = record;
  return { ...order, diningMode: deliveryMode(order.diningMode), status: order.status || 'pending' };
}

async function readOrders(query, withKey = false) {
  const orders = [];
  for (let offset = 0; ; offset += 100) {
    const page = await query.orderBy('createdAt', 'desc').skip(offset).limit(100).get();
    orders.push(...page.data.map(record => withKey ? { ...publicOrder(record), key: record._id } : publicOrder(record)));
    if (page.data.length < 100) break;
  }
  return orders;
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) throw new Error('无法识别当前微信用户');
  const isChef = openid === CHEF_OPENID;

  if (event.action === 'identity') return { ok: true, openid, isChef };

  if (event.action === 'create') {
    const source = event.order;
    if (!source || typeof source.id !== 'string' || !/^SD[0-9]{16,}$/.test(source.id) ||
        typeof source.time !== 'string' || !Array.isArray(source.lines) || !source.lines.length ||
        typeof source.total !== 'number') throw new Error('订单数据不完整');
    const { _id, _openid, openid: ignoredOpenid, createdAt: ignoredCreatedAt, ...fields } = source;
    const key = `${openid}_${source.id}`;
    if (source.diningMode !== undefined && !['delivery', 'dine_in'].includes(source.diningMode)) throw new Error('用餐方式无效');
    const order = { ...fields, diningMode: deliveryMode(source.diningMode), openid, createdAt: Date.now(), status: 'pending' };
    try {
      // 固定 _id 的 add 是原子新增；重复请求不会覆盖已接单的状态。
      await collection.add({ data: { _id: key, ...order } });
      return { ok: true, order };
    } catch (error) {
      const existing = await collection.doc(key).get().catch(() => null);
      if (existing && existing.data && existing.data.id === source.id && existing.data.openid === openid) {
        return { ok: true, order: publicOrder(existing.data), duplicate: true };
      }
      throw error;
    }
  }

  if (event.action === 'list') {
    return { ok: true, orders: await readOrders(collection.where({ openid })), openid, isChef };
  }

  if (event.action === 'chefList') {
    if (!isChef) return { ok: false, code: 'CHEF_FORBIDDEN', error: '只有主厨可以查看接单管理' };
    return { ok: true, orders: await readOrders(collection, true) };
  }

  if (event.action === 'setStatus') {
    if (!isChef) return { ok: false, code: 'CHEF_FORBIDDEN', error: '只有主厨可以修改订单状态' };
    const { key, status } = event;
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]+_SD[0-9]{16,}$/.test(key) ||
        !['accepted', 'cooking', 'done', 'delivering', 'delivered'].includes(status)) {
      return { ok: false, code: 'INVALID_STATUS', error: '订单编号或目标状态无效' };
    }
    const change = async orders => {
      const doc = orders.doc(key);
      const found = await doc.get().catch(() => null);
      if (!found || !found.data || !found.data.id) return { ok: false, code: 'ORDER_NOT_FOUND', error: '没有找到此订单' };
      const current = found.data.status || 'pending';
      if (NEXT_STATUS[current] !== status || (current === 'done' && deliveryMode(found.data.diningMode) === 'dine_in')) {
        return { ok: false, code: 'STATUS_CONFLICT', error: '订单状态已变化，请刷新后重试' };
      }
      const updatedAt = Date.now();
      await doc.update({ data: { status, updatedAt } });
      return { ok: true, status, order: publicOrder({ ...found.data, status, updatedAt }) };
    };
    // 云数据库事务将读状态与写状态串行化，防止两台设备同时推进同一订单。
    return db.runTransaction ? db.runTransaction(async transaction => change(transaction.collection('orders'))) : change(collection);
  }

  if (event.action === 'get') {
    if (typeof event.id !== 'string' || !/^SD[0-9]{16,}$/.test(event.id)) throw new Error('订单编号无效');
    const query = collection.where({ id: event.id, openid });
    const result = await query.limit(1).get();
    return { ok: true, order: result.data.length ? publicOrder(result.data[0]) : null };
  }

  throw new Error('不支持的订单操作');
};
