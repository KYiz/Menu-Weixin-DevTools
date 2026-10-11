const cloudDiagnostic = require('../../utils/cloudDiagnostic');

Page({
  data: { status: 'loading', stage: '准备诊断', code: '等待中', message: '', envId: '', openid: '', copyFeedback: '' },
  onLoad() {
    try {
      const version = wx.getAccountInfoSync().miniProgram.envVersion;
      if (version === 'release') {
        wx.navigateBack();
        return;
      }
      if (version !== 'develop' && version !== 'trial') {
        this.setData({ status: 'error', stage: '版本检查', code: 'UNSUPPORTED_VERSION', message: `无法确认开发版或体验版：${version}`, envId: getApp().globalData.cloudEnvId || '未配置' });
        return;
      }
    } catch (error) {
      this.setData({ status: 'error', stage: '版本检查', code: 'VERSION_CHECK_FAILED', message: error.errMsg || error.message || String(error), envId: getApp().globalData.cloudEnvId || '未配置' });
      return;
    }
    this.stopDiagnosis = cloudDiagnostic.diagnose(result => this.setData(result));
  },
  onUnload() {
    if (this.stopDiagnosis) this.stopDiagnosis();
  },
  copyOpenid() {
    if (!this.data.openid) {
      this.setData({ copyFeedback: '暂无可复制的 OpenID' });
      return;
    }
    this.setData({ copyFeedback: '正在复制…' });
    let finished = false;
    let timer;
    const finish = message => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      this.setData({ copyFeedback: message });
    };
    const copied = () => finish('复制成功，可在输入框长按粘贴。');
    const failed = error => {
      const code = error && (error.errCode !== undefined ? error.errCode : error.code);
      const detail = error && (error.errMsg || error.message) || String(error);
      finish(`复制失败${code !== undefined ? `（${code}）` : ''}：${detail}。可长按上方 OpenID 手动复制。`);
    };
    timer = setTimeout(() => finish('没有收到剪贴板接口反馈，请长按上方 OpenID 手动复制。'), 3000);
    try {
      const request = wx.setClipboardData({ data: this.data.openid, success: copied, fail: failed });
      if (request && typeof request.then === 'function') request.then(copied, failed);
    } catch (error) {
      failed(error);
    }
  }
});
