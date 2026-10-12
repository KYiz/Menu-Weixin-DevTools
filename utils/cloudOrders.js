const FUNCTION_NAME = 'orders';
const store = require('./store');

function call(action, data = {}) {
  if (!getApp().globalData.cloudReady || !wx.cloud || !wx.cloud.callFunction) {
    return Promise.reject(new Error('云开发尚未配置或不可用'));
  }
  return wx.cloud.callFunction({ name: FUNCTION_NAME, data: { action, ...data } }).then(({ result }) => {
    if (!result || !result.ok) {
      const error = new Error(result && result.error || '云函数返回异常');
      error.code = result && result.code;
      throw error;
    }
    return result;
  });
}

function save(order) {
  return call('create', { order }).then(result => {
    store.bindOrderOwner(order.id, result.order.openid);
    return result.order;
  });
}

function identityResult() { return call('identity'); }
function identity() { return identityResult().then(result => result.openid); }

function listWithIdentity() {
  return call('list');
}

function list() {
  return listWithIdentity().then(result => result.orders);
}

function get(id) {
  return call('get', { id }).then(result => result.order);
}

function chefList() {
  return call('chefList').then(result => result.orders);
}

function setStatus(key, status) {
  return call('setStatus', { key, status }).then(result => result.order);
}

module.exports = { save, identity, identityResult, list, listWithIdentity, get, chefList, setStatus };
