const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CHEF = 'oAxtA3QqptjCi_-1doqOHGgIZBaM';
const records = new Map();
let caller = 'girlfriend-openid';
const collection = {
  async add({ data }) {
    if (records.has(data._id)) throw new Error('duplicate _id');
    records.set(data._id, { ...data });
  },
  doc(id) {
    return {
      async get() { return { data: records.get(id) || null }; },
      async update({ data }) { records.set(id, { ...records.get(id), ...data }); }
    };
  },
  where(filter) { return query(filter); },
  orderBy() { return query({}); }
};
function query(filter) {
  let offset = 0;
  let size = 100;
  return {
    orderBy() { return this; },
    skip(value) { offset = value; return this; },
    limit(value) { size = value; return this; },
    async get() {
      return { data: [...records.values()].filter(record =>
        Object.keys(filter).every(key => record[key] === filter[key])
      ).sort((a, b) => b.createdAt - a.createdAt).slice(offset, offset + size) };
    }
  };
}
const cloud = {
  DYNAMIC_CURRENT_ENV: 'test',
  init() {},
  database() { return { collection() { return collection; } }; },
  getWXContext() { return { OPENID: caller }; }
};
const source = fs.readFileSync(path.join(__dirname, '..', 'cloudfunctions/orders/index.js'), 'utf8');
const context = { require(name) { assert.strictEqual(name, 'wx-server-sdk'); return cloud; }, exports: {}, console };
vm.runInNewContext(source, context);
const run = event => context.exports.main(event);

(async () => {
  assert.strictEqual((await run({ action: 'identity' })).openid, caller);
  const order = { id: 'SD2026101112345678', time: '2026-10-11 12:34', lines: [{ id: 'staple-1', name: '蛋炒饭', qty: 1, price: 15, type: 'dish' }], taste: '不辣', note: '少盐', total: 15, openid: CHEF, status: 'done' };
  const saved = await run({ action: 'create', order, role: 'chef', openid: CHEF });
  assert.strictEqual(saved.order.openid, caller);
  assert.strictEqual(saved.order.status, 'pending');
  assert.strictEqual(saved.order.note, order.note);
  assert.strictEqual((await run({ action: 'list' })).orders.length, 1);
  assert.strictEqual((await run({ action: 'chefList', role: 'chef', openid: CHEF })).code, 'CHEF_FORBIDDEN');
  assert.strictEqual((await run({ action: 'setStatus', key: `${caller}_${order.id}`, status: 'accepted', role: 'chef' })).code, 'CHEF_FORBIDDEN');
  const duplicate = await run({ action: 'create', order: { ...order, note: '篡改订单' } });
  assert.strictEqual(duplicate.duplicate, true);
  assert.strictEqual(duplicate.order.note, '少盐');
  assert.strictEqual(records.size, 1);

  caller = 'other-openid';
  assert.strictEqual((await run({ action: 'list' })).orders.length, 0);
  assert.strictEqual((await run({ action: 'get', id: order.id })).order, null);

  caller = CHEF;
  assert.strictEqual((await run({ action: 'list' })).orders.length, 0, 'chef personal history must contain only chef orders');
  assert.strictEqual((await run({ action: 'get', id: order.id })).order, null);
  const inbox = await run({ action: 'chefList' });
  assert.strictEqual(inbox.orders.length, 1);
  assert.strictEqual(inbox.orders[0].note, '少盐');
  assert.strictEqual(inbox.orders[0].key, `girlfriend-openid_${order.id}`);
  const key = inbox.orders[0].key;
  assert.strictEqual((await run({ action: 'setStatus', key, status: 'done' })).code, 'STATUS_CONFLICT');
  for (const status of ['accepted', 'cooking', 'done']) {
    assert.strictEqual((await run({ action: 'setStatus', key, status })).status, status);
  }
  assert.strictEqual((await run({ action: 'chefList' })).orders[0].status, 'done');
  assert.strictEqual((await run({ action: 'create', order: { ...order, openid: 'forged' } })).order.status, 'pending', 'chef order uses a different owner key');
  assert.strictEqual((await run({ action: 'get', id: order.id })).order.status, 'pending');
  caller = 'girlfriend-openid';
  assert.strictEqual((await run({ action: 'create', order })).order.status, 'done', 'retry must not reset chef status');
  caller = 'another-experience-member';
  const second = { ...order, id: 'SD2026101112345699', note: '少辣' };
  assert.strictEqual((await run({ action: 'create', order: second })).order.openid, caller);
  assert.strictEqual((await run({ action: 'list' })).orders.length, 1);
  caller = 'girlfriend-openid';
  assert.strictEqual((await run({ action: 'list' })).orders.length, 1);
  assert.strictEqual((await run({ action: 'get', id: second.id })).order, null);
  console.log('PASS: trusted chef OpenID, cross-device inbox, owner isolation, status transitions, forged role rejection, idempotent order creation');
})().catch(error => { console.error(error); process.exitCode = 1; });
