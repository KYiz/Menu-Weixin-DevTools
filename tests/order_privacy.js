const assert = require('assert');
const memory = {};
let caller = 'user-b';
let page;
let toast = '';
const order = { id: 'SD2026101112345678', time: '2026-10-11 12:34', lines: [{ id: 'chicken-1', name: '可乐鸡翅', qty: 1, price: 15, type: 'dish' }], taste: '不辣', note: '私人备注', total: 15 };
global.getApp = () => ({ globalData: { cloudReady: true, pendingOrderId: '' } });
global.wx = {
  getStorageSync: key => memory[key] === undefined ? '' : memory[key],
  setStorageSync: (key, value) => { memory[key] = value; },
  cloud: { callFunction({ data }) {
    if (data.action === 'get') return Promise.resolve({ result: { ok: true, order: null } });
    if (data.action === 'identity') return Promise.resolve({ result: { ok: true, openid: caller } });
    throw new Error('unexpected action');
  } },
  showToast({ title }) { toast = title; }
};
global.Page = definition => {
  page = { ...definition, data: { ...definition.data }, setData(update) { Object.assign(this.data, update); } };
};
const store = require('../utils/store');
store.saveOrder(order);
store.bindOrderOwner(order.id, 'user-a');
require('../pages/order/order');
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

(async () => {
  page.onLoad({ id: order.id, local: '1' });
  await settle();
  assert.strictEqual(page.data.order, null);
  assert.ok(toast.includes('没有找到当前账号'));
  caller = 'user-a';
  page.onLoad({ id: order.id });
  await settle();
  assert.strictEqual(page.data.order.note, '私人备注');
  console.log('PASS: order detail local fallback requires matching verified OpenID');
})().catch(error => { console.error(error); process.exitCode = 1; });
