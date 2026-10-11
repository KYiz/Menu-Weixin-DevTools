const assert = require('assert');
let caller = 'guest';
let status = 'pending';
let page;
const order = { key: 'girlfriend_SD2026101112345678', id: 'SD2026101112345678', time: '2026-10-11 12:34', status, lines: [{ id: 'chicken-1', name: '可乐鸡翅', qty: 2, price: 15, type: 'dish' }], taste: '微辣', note: '不要香菜', total: 30 };
global.getApp = () => ({ globalData: { cloudReady: true } });
global.wx = {
  getStorageSync: () => '',
  cloud: { callFunction({ data }) {
    if (caller === 'old-function') return Promise.reject(new Error('不支持的订单操作\nprivate stack'));
    if (caller !== 'chef') return Promise.resolve({ result: { ok: false, code: 'CHEF_FORBIDDEN', error: '只有主厨可以查看接单管理' } });
    if (data.action === 'chefList') return Promise.resolve({ result: { ok: true, orders: [{ ...order, status }] } });
    if (data.action === 'setStatus') { status = data.status; return Promise.resolve({ result: { ok: true, order: { ...order, status } } }); }
    throw new Error('unexpected action');
  } },
  navigateTo() {}, navigateBack() {}, showToast() {}
};
global.Page = definition => {
  page = { ...definition, data: { ...definition.data }, setData(update) { Object.assign(this.data, update); } };
};
require('../pages/chef/chef');
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

(async () => {
  page.onLoad();
  wx.setStorageSync = () => {};
  page.onShow();
  await settle();
  assert.strictEqual(page.data.authorized, false);
  assert.strictEqual(page.data.orders.length, 0);
  assert.ok(page.data.accessError.includes('不是主厨'));

  caller = 'old-function';
  await page.refreshOrders();
  assert.ok(page.data.accessError.includes('重新部署'));
  assert.ok(!page.data.accessError.includes('private stack'));

  caller = 'chef';
  await page.refreshOrders();
  assert.strictEqual(page.data.authorized, true);
  assert.strictEqual(page.data.orderCount, 1);
  page.chooseOrder({ currentTarget: { dataset: { key: order.key } } });
  assert.strictEqual(page.data.selectedOrder.note, '不要香菜');
  for (const [from, to] of [['pending', 'accepted'], ['accepted', 'cooking'], ['cooking', 'done']]) {
    assert.strictEqual(page.data.selectedOrder.status, from);
    page.advanceStatus();
    await settle();
    await settle();
    assert.strictEqual(page.data.selectedOrder.status, to);
  }
  assert.strictEqual(page.data.selectedOrder.nextStatus, '');
  console.log('PASS: chef page hides orders from guest and advances cloud order through all three actions');
})().catch(error => { console.error(error); process.exitCode = 1; });
