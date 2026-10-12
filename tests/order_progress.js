const assert = require('assert');
const memory = {};
const order = { id: 'SD2026101112345678', time: '2026-10-11 12:34', diningMode: 'delivery', status: 'pending', openid: 'user-a', lines: [{ id: 'chicken-1', name: '可乐鸡翅', qty: 1, price: 15, type: 'dish' }], total: 15 };
let remoteStatus = 'pending';
let offline = false;
let chef = false;
let calls = 0;
let page;
global.getApp = () => ({ globalData: { cloudReady: true, pendingOrderId: '' } });
global.wx = {
  getStorageSync: key => memory[key] === undefined ? '' : memory[key],
  setStorageSync: (key, value) => { memory[key] = value; },
  cloud: { callFunction({ data }) {
    calls += 1;
    if (offline) return Promise.reject(new Error('offline'));
    if (data.action === 'identity') return Promise.resolve({ result: { ok: true, openid: 'user-a', isChef: chef } });
    if (data.action === 'get') return Promise.resolve({ result: { ok: true, order: { ...order, status: remoteStatus } } });
    if (data.action === 'list') return Promise.resolve({ result: { ok: true, openid: 'user-a', orders: [{ ...order, status: remoteStatus }] } });
    throw new Error('unexpected action');
  } },
  showToast() {}, navigateTo() {}, setNavigationBarTitle() {}
};
global.Page = definition => { page = { ...definition, data: { ...definition.data }, setData(update) { Object.assign(this.data, update); } }; };
const load = path => { delete require.cache[require.resolve(path)]; require(path); return page; };

(async () => {
  const menu = load('../pages/menu/menu');
  menu.onLoad();
  assert.strictEqual(menu.data.showChefEntry, false);
  await menu.checkChef();
  assert.strictEqual(menu.data.showChefEntry, false);
  menu.onShow();
  assert.strictEqual(calls, 1, 'returning to menu reuses the identity result');
  chef = true;
  const chefMenu = load('../pages/menu/menu');
  chefMenu.onLoad();
  await chefMenu.checkChef();
  assert.strictEqual(chefMenu.data.showChefEntry, true);
  const detail = load('../pages/order/order');
  detail.onLoad({ id: order.id });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.strictEqual(detail.data.order.statusLabel, '已下单');
  assert.strictEqual(detail.data.stale, false);
  remoteStatus = 'delivering';
  await detail.refreshStatus();
  assert.strictEqual(detail.data.order.statusLabel, '配送中');
  offline = true;
  await detail.refreshStatus();
  assert.strictEqual(detail.data.order.statusLabel, '配送中');
  assert.strictEqual(detail.data.stale, true);
  assert.ok(detail.data.syncMessage.includes('暂时无法更新'));
  offline = false;
  const history = load('../pages/orders/orders');
  await history.refreshStatus();
  assert.strictEqual(history.data.orders[0].statusLabel, '配送中');
  remoteStatus = 'delivered';
  await history.refreshStatus();
  assert.strictEqual(history.data.orders[0].statusLabel, '已送达');
  offline = true;
  await history.refreshStatus();
  assert.strictEqual(history.data.orders[0].statusLabel, '已送达');
  assert.strictEqual(history.data.stale, true);
  console.log('PASS: chef entry hidden by default, owner refreshes cloud status, and offline history marks cached status stale');
})().catch(error => { console.error(error); process.exitCode = 1; });
