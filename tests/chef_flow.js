const assert = require('assert');
const fs = require('fs');
let caller = 'guest';
let status = 'pending';
let page;
const order = { key: 'girlfriend_SD2026101112345678', id: 'SD2026101112345678', time: '2026-10-11 12:34', status, lines: [{ id: 'chicken-1', name: '可乐鸡翅', qty: 2, price: 15, type: 'dish' }], taste: '微辣', note: '不要香菜', total: 30 };
const otherOrders = [
  { ...order, key: 'girlfriend_SD2026101112345679', id: 'SD2026101112345679', status: 'cooking', note: '第二份订单' },
  { ...order, key: 'girlfriend_SD2026101112345680', id: 'SD2026101112345680', status: 'done', note: '第三份订单' }
];
let listedOrders = () => [{ ...order, status }, ...otherOrders];
const scrollCalls = [];
global.getApp = () => ({ globalData: { cloudReady: true } });
global.wx = {
  getStorageSync: () => '',
  cloud: { callFunction({ data }) {
    if (caller === 'old-function') return Promise.reject(new Error('不支持的订单操作\nprivate stack'));
    if (caller !== 'chef') return Promise.resolve({ result: { ok: false, code: 'CHEF_FORBIDDEN', error: '只有主厨可以查看接单管理' } });
    if (data.action === 'chefList') return Promise.resolve({ result: { ok: true, orders: listedOrders() } });
    if (data.action === 'setStatus') { status = data.status; return Promise.resolve({ result: { ok: true, order: { ...order, status } } }); }
    throw new Error('unexpected action');
  } },
  navigateTo() {}, navigateBack() {}, showToast() {},
  pageScrollTo(options) { scrollCalls.push(options); },
  createSelectorQuery() {
    let index;
    return {
      in() { return this; },
      select(selector) { index = Number(selector.split('-').pop()); return this; },
      boundingClientRect() { return this; },
      selectViewport() { return this; },
      scrollOffset() { return this; },
      exec(callback) {
        const shifted = page.data.selectedKey === order.key && index > 0 ? 60 : 0;
        callback([{ top: 100 + index * 100 + shifted }, { scrollTop: 100 }]);
      }
    };
  }
};
global.Page = definition => {
  page = { ...definition, data: { ...definition.data }, setData(update, callback) { Object.assign(this.data, update); if (callback) callback(); } };
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
  assert.strictEqual(page.data.orderCount, 3);
  const tap = (item, index) => page.chooseOrder({ currentTarget: { dataset: { key: item.key, index } } });
  tap(order, 0);
  assert.strictEqual(page.data.selectedKey, order.key);
  assert.strictEqual(page.data.selectedOrder.note, '不要香菜');
  tap(order, 0);
  assert.strictEqual(page.data.selectedKey, '');
  assert.strictEqual(page.data.selectedOrder, null);
  const immediateQuery = wx.createSelectorQuery;
  wx.createSelectorQuery = () => {
    const query = immediateQuery();
    const exec = query.exec;
    query.exec = callback => setTimeout(() => exec.call(query, callback), 0);
    return query;
  };
  tap(order, 0);
  tap(order, 0);
  await settle();
  assert.strictEqual(page.data.selectedKey, '');
  wx.createSelectorQuery = immediateQuery;
  tap(order, 0);
  tap(otherOrders[1], 2);
  assert.strictEqual(page.data.selectedKey, otherOrders[1].key);
  assert.strictEqual(page.data.selectedOrder.status, 'done');
  assert.deepStrictEqual(scrollCalls.at(-1), { scrollTop: 40, duration: 0 });
  tap(otherOrders[0], 1);
  assert.strictEqual(page.data.selectedKey, otherOrders[0].key);
  assert.strictEqual(page.data.selectedOrder.status, 'cooking');
  tap(order, 0);
  assert.strictEqual(page.data.selectedKey, order.key);
  assert.strictEqual(page.data.selectedOrder.status, 'pending');

  listedOrders = () => [...otherOrders].reverse().concat({ ...order, status });
  await page.refreshOrders();
  assert.strictEqual(page.data.selectedKey, order.key);
  assert.strictEqual(page.data.orders[2].key, order.key);
  tap(otherOrders[1], 0);
  assert.strictEqual(page.data.selectedOrder.status, 'done');
  listedOrders = () => [{ ...order, status }];
  await page.refreshOrders();
  assert.strictEqual(page.data.selectedKey, '');
  assert.strictEqual(page.data.selectedOrder, null);
  listedOrders = () => [];
  await page.refreshOrders();
  assert.strictEqual(page.data.orders.length, 0);
  listedOrders = () => [{ ...order, status }, ...otherOrders];
  await page.refreshOrders();
  tap(order, 0);

  const wxml = fs.readFileSync(require.resolve('../pages/chef/chef.wxml'), 'utf8');
  assert.match(wxml, /wx:for="{{orders}}"[^>]*class="chef-order-group"[\s\S]*class="chef-order cream-card"[\s\S]*wx:if="{{selectedKey === item.key}}" class="chef-detail cream-card"/);
  assert.ok(!wxml.includes('selectedOrder.lines'));
  for (const [from, to] of [['pending', 'accepted'], ['accepted', 'cooking'], ['cooking', 'done']]) {
    assert.strictEqual(page.data.selectedOrder.status, from);
    page.advanceStatus();
    await settle();
    await settle();
    assert.strictEqual(page.data.selectedOrder.status, to);
  }
  for (const [from, to] of [['done', 'delivering'], ['delivering', 'delivered']]) {
    assert.strictEqual(page.data.selectedOrder.status, from);
    page.advanceStatus();
    await settle();
    await settle();
    assert.strictEqual(page.data.selectedOrder.status, to);
  }
  assert.strictEqual(page.data.selectedOrder.nextStatus, '');
  listedOrders = () => [{ ...order, diningMode: 'dine_in', status: 'done' }];
  await page.refreshOrders();
  assert.strictEqual(page.data.orders[0].statusLabel, '可以开饭啦');
  assert.strictEqual(page.data.orders[0].nextStatus, '');
  console.log('PASS: chef orders expand in place, collapse, switch with stable scroll, and advance through all delivery actions');
})().catch(error => { console.error(error); process.exitCode = 1; });
