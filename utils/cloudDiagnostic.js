const DIAGNOSTIC_PAGE = '/pages/clouddiag/clouddiag';
const TIMEOUT_MS = 10000;

function errorText(error) {
  if (error == null) return '未知错误';
  return error.errMsg || error.message || String(error);
}

function errorCode(error) {
  if (error && error.errCode !== undefined) return String(error.errCode);
  if (error && error.code !== undefined) return String(error.code);
  const match = errorText(error).match(/errCode:\s*(-?\d+)/i);
  return match ? match[1] : '无';
}

function isMissingFunction(code, message) {
  return code === '-501005' || /function\s+not\s+exist|function\s+not\s+found|云函数不存在|找不到云函数/i.test(message);
}

function run() {
  let version;
  try {
    version = wx.getAccountInfoSync().miniProgram.envVersion;
  } catch (error) {
    version = 'unknown';
  }
  if (version === 'release') return;
  wx.navigateTo({
    url: DIAGNOSTIC_PAGE,
    fail(error) {
      wx.showModal({ title: '诊断页面打开失败', content: errorText(error), showCancel: false });
    }
  });
}

function diagnose(onUpdate) {
  const state = getApp().globalData || {};
  const envId = state.cloudEnvId || '未配置';
  let finished = false;
  let timer;
  const publish = value => {
    if (!finished) onUpdate(Object.assign({ envId }, value));
  };
  const finish = value => {
    if (finished) return;
    clearTimeout(timer);
    publish(value);
    finished = true;
  };
  const fail = (stage, error) => {
    const code = errorCode(error);
    let message = errorText(error);
    if (isMissingFunction(code, message)) {
      message += '\n云函数未找到：在微信开发者工具选择当前云环境，右键 cloudfunctions/orders，选择“上传并部署：云端安装依赖”，完成后重新编译并预览。';
    }
    finish({ status: 'error', stage, code, message, openid: '' });
  };
  const succeed = response => {
    const result = response && response.result;
    if (!result || result.ok !== true || typeof result.openid !== 'string' || !result.openid) {
      fail('解析 orders.identity 返回值', {
        code: 'INVALID_RESPONSE',
        message: `云函数返回异常：${JSON.stringify(result)}`
      });
      return;
    }
    finish({ status: 'success', stage: 'orders.identity 已完成', code: '0', message: '云函数调用成功', openid: result.openid });
  };

  if (!state.cloudReady) {
    fail('wx.cloud 初始化', { code: 'INIT_FAILED', message: state.cloudInitError || '云开发未就绪' });
    return () => {};
  }
  if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
    fail('调用前检查', { code: 'API_UNAVAILABLE', message: '小程序业务代码中 wx.cloud.callFunction 不可用' });
    return () => {};
  }

  publish({ status: 'loading', stage: '正在调用 orders.identity', code: '等待中', message: '最多等待 10 秒', openid: '' });
  timer = setTimeout(() => {
    finish({ status: 'error', stage: '等待 orders.identity 响应', code: 'TIMEOUT', message: '10 秒内没有收到云函数响应。请检查手机网络、云环境和云函数部署状态。', openid: '' });
  }, TIMEOUT_MS);
  try {
    const request = wx.cloud.callFunction({ name: 'orders', data: { action: 'identity' }, success: succeed, fail: error => fail('调用 orders.identity', error) });
    if (request && typeof request.then === 'function') request.then(succeed, error => fail('调用 orders.identity', error));
  } catch (error) {
    fail('发起 orders.identity 调用', error);
  }
  return () => { finished = true; clearTimeout(timer); };
}

module.exports = { run, diagnose };
