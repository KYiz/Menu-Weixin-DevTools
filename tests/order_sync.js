const assert = require('assert');
const memory = {};
let attempts = 0;
let page;
const order = { id: 'SD2026101112345678', time: '2026-10-11 12:34', lines: [{ id: 'chicken-1', name: '可乐鸡翅', qty: 1, price: 15, type: 'dish' }], taste: '不辣', note: '少盐', total: 15 };
const app = { globalData: { cloudReady: true, pendingOrderId: order.id } };
global.getApp = () => app;
global.wx = {
  getStorageSync: key => memory[key] === undefined ? '' : memory[key],
  setStorageSync: (key, value) => { memory[key] = value; },
  cloud: { callFunction({ data }) {
    if (data.action === 'identity') return Promise.resolve({ result: { ok: true, openid: 'user-a' } });
    assert.strictEqual(data.action, 'create');
    attempts += 1;
    return attempts === 1 ? Promise.reject(Object.assign(new Error('database collection not exists: orders\nprivate stack'), { errCode: -502005 })) : Promise.resolve({ result: { ok: true, order: { ...data.order, openid: 'user-a' } } });
  } },
  showToast() {}, navigateTo() {}, setClipboardData() {}
};
global.Page = definition => {
  page = { ...definition, data: { ...definition.data }, setData(update) { Object.assign(this.data, update); } };
};
const store = require('../utils/store');
store.saveOrder(order);
require('../pages/order/order');
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

(async () => {
  page.onLoad({ id: order.id, local: '1' });
  assert.strictEqual(page.data.syncState, 'syncing');
  await settle();
  assert.strictEqual(page.data.syncState, 'failed');
  assert.ok(page.data.syncMessage.includes('订单已保存本机，云端同步失败'));
  assert.ok(page.data.syncMessage.includes('-502005'));
  assert.ok(!page.data.syncMessage.includes('private stack'));
  assert.strictEqual(store.orders()[0].id, order.id);
  assert.strictEqual(store.ordersFor('user-a')[0].id, order.id);
  page.syncOrder();
  await settle();
  assert.strictEqual(page.data.syncState, 'synced');
  assert.strictEqual(attempts, 2);
  console.log('PASS: local order survives cloud failure and manual retry confirms cross-device sync');
})().catch(error => { console.error(error); process.exitCode = 1; });
