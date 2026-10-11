// 在微信开发者工具的云开发控制台复制环境 ID，填在这里。
const CLOUD_ENV_ID = "cloud1-d0gw9cl9xfef5b612";

App({
  onLaunch() {
    this.globalData = { cloudReady: false, cloudEnvId: CLOUD_ENV_ID, cloudInitError: '', pendingOrderId: '' };
    if (CLOUD_ENV_ID === '请填写云环境ID') {
      this.globalData.cloudInitError = '未填写云环境 ID';
      return;
    }
    if (!wx.cloud) {
      this.globalData.cloudInitError = '小程序业务代码中 wx.cloud 不可用';
      return;
    }
    try {
      wx.cloud.init({ env: CLOUD_ENV_ID, traceUser: true });
      this.globalData.cloudReady = true;
    } catch (error) {
      this.globalData.cloudInitError = error.errMsg || error.message || String(error);
      console.warn('云开发初始化失败，继续使用本地订单', error);
    }
  },
  globalData: { cloudReady: false, cloudEnvId: CLOUD_ENV_ID, cloudInitError: '', pendingOrderId: '' }
});
