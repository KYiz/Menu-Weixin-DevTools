const assert = require('assert');
const memory = {};
let caller = 'user-a';
let listFails = false;
let identityFails = false;
let currentPage;
const remoteOrder = { id: 'SD2026101112345678', time: '2026-10-11 12:34', lines: [{ id: 'staple-1', name: '蛋炒饭', qty: 1, type: 'dish', price: 15 }], taste: '不辣', note: '', total: 15 };
const localOrder = { ...remoteOrder, id: 'SD2026101112345699' };

global.wx = {
  getStorageSync: key => memory[key] === undefined ? '' : memory[key],
  setStorageSync: (key, value) => { memory[key] = value; },
  cloud: { callFunction: ({ data }) => {
    if (data.action === 'identity') return identityFails ? Promise.reject(new Error('offline')) : Promise.resolve({ result: { ok: true, openid: caller } });
    assert.strictEqual(data.action, 'list');
    if (listFails) return Promise.reject(new Error('offline'));
    return Promise.resolve({ result: { ok: true, openid: caller, orders: caller === 'user-a' ? [remoteOrder] : [] } });
  } },
  navigateTo() {}, showToast() {}
};
global.getApp = () => ({ globalData: { cloudReady: true } });
global.Page = config => {
  currentPage = { ...config, data: { ...config.data }, setData(data) { Object.assign(this.data, data); } };
};
const store = require('../utils/store');
store.saveOrder(localOrder);
store.bindOrderOwner(localOrder.id, 'user-a');
require('../pages/orders/orders');
const page = currentPage;
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

(async () => {
  page.onShow();
  await settle();
  assert.deepStrictEqual(page.data.orders.map(order => order.id), [remoteOrder.id, localOrder.id]);

  caller = 'user-b';
  page.onShow();
  await settle();
  assert.deepStrictEqual(page.data.orders, [], 'another user must not see user-a local orders');

  caller = 'user-a';
  listFails = true;
  page.onShow();
  await settle();
  assert.deepStrictEqual(page.data.orders.map(order => order.id), [localOrder.id, remoteOrder.id]);
  assert.strictEqual(page.data.stale, true);
  assert.ok(page.data.loadMessage.includes('暂时无法更新'));

  identityFails = true;
  page.onShow();
  await settle();
  assert.deepStrictEqual(page.data.orders.map(order => order.id), [localOrder.id, remoteOrder.id], 'same verified session keeps its last confirmed state offline');
  assert.ok(page.data.loadMessage.includes('暂时无法更新'));
  console.log('PASS: cloud owner isolation, OpenID-scoped local fallback, and no private history without identity');
})().catch(error => { console.error(error); process.exitCode = 1; });
