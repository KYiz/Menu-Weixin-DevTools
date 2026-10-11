const assert = require('assert');

const state = { cloudReady: true, cloudEnvId: 'cloud1-d0gw9cl9xfef5b612', cloudInitError: '' };
let version = 'develop';
let callFunction;
let navigation;
let scheduled;
let delay;
let last;
let clipboardError;
let clipboardNoCallback = false;
let pageDefinition;

global.getApp = () => ({ globalData: state });
global.setTimeout = (callback, ms) => { scheduled = callback; delay = ms; return 1; };
global.clearTimeout = () => {};
global.Page = definition => { pageDefinition = definition; };
global.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: version } }),
  cloud: { callFunction: options => callFunction(options) },
  navigateTo: options => { navigation = options.url; },
  navigateBack() {},
  showModal() {},
  setClipboardData: options => {
    last = options.data;
    if (clipboardNoCallback) return;
    if (clipboardError) options.fail(clipboardError);
    else options.success();
  }
};

const diagnostic = require('../utils/cloudDiagnostic');
require('../pages/clouddiag/clouddiag');

function start() {
  let data = {};
  const page = Object.assign({}, pageDefinition, {
    data,
    setData(update) { this.data = Object.assign({}, this.data, update); data = this.data; }
  });
  page.onLoad();
  return page;
}

async function settle() { await Promise.resolve(); await Promise.resolve(); }

(async () => {
  diagnostic.run();
  assert.strictEqual(navigation, '/pages/clouddiag/clouddiag');

  callFunction = options => {
    assert.strictEqual(options.name, 'orders');
    assert.strictEqual(options.data.action, 'identity');
    return Promise.resolve({ result: { ok: true, openid: 'real-user-openid' } });
  };
  let page = start();
  await settle();
  assert.strictEqual(page.data.status, 'success');
  assert.strictEqual(page.data.openid, 'real-user-openid');
  assert.strictEqual(page.data.envId, state.cloudEnvId);
  page.copyOpenid();
  assert.strictEqual(last, 'real-user-openid');
  assert.ok(page.data.copyFeedback.includes('复制成功'));

  clipboardError = { errCode: -1, errMsg: 'clipboard unavailable' };
  page.copyOpenid();
  assert.ok(page.data.copyFeedback.includes('复制失败（-1）'));
  assert.ok(page.data.copyFeedback.includes('clipboard unavailable'));
  clipboardError = null;

  clipboardNoCallback = true;
  page.copyOpenid();
  assert.strictEqual(page.data.copyFeedback, '正在复制…');
  scheduled();
  assert.ok(page.data.copyFeedback.includes('没有收到剪贴板接口反馈'));
  clipboardNoCallback = false;

  callFunction = options => options.fail({ errCode: -501005, errMsg: 'function not exists' });
  page = start();
  assert.strictEqual(page.data.status, 'error');
  assert.strictEqual(page.data.code, '-501005');
  assert.ok(page.data.message.includes('上传并部署'));

  callFunction = () => new Promise(() => {});
  page = start();
  assert.strictEqual(delay, 10000);
  scheduled();
  assert.strictEqual(page.data.code, 'TIMEOUT');
  assert.strictEqual(page.data.stage, '等待 orders.identity 响应');

  state.cloudReady = false;
  state.cloudInitError = '小程序业务代码中 wx.cloud 不可用';
  page = start();
  assert.strictEqual(page.data.code, 'INIT_FAILED');
  assert.ok(page.data.message.includes(state.cloudInitError));

  version = 'release';
  navigation = null;
  diagnostic.run();
  assert.strictEqual(navigation, null);
  console.log('PASS: diagnostic page, success, copy, deployment error, timeout, initialization error, release guard');
})().catch(error => { console.error(error); process.exitCode = 1; });
