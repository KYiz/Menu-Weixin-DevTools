const store = require('../../utils/store');
const cloudOrders = require('../../utils/cloudOrders');
const cloudError = require('../../utils/cloudError');
const orderStatus = require('../../utils/orderStatus');
const { getItem } = require('../../data/catalog');

Page({
  data: { order: null, text: '', food: [], service: [], steps: [], syncState: '', syncMessage: '', stale: false, refreshing: false },
  onLoad(options) {
    this.orderId = options.id;
    this.skipFirstShow = true;
    if (options.local === '1' && getApp().globalData.pendingOrderId === options.id) {
      getApp().globalData.pendingOrderId = '';
      const order = store.orders().find(x => x.id === options.id);
      if (order) { this.showOrder(order); this.syncOrder(); return; }
    }
    this.refreshStatus();
  },
  onShow() {
    if (this.skipFirstShow) { this.skipFirstShow = false; return; }
    if (this.orderId && this.data.syncState !== 'syncing') this.refreshStatus();
  },
  refreshStatus() {
    if (this.data.refreshing || !this.orderId) return Promise.resolve();
    this.setData({ refreshing: true });
    return cloudOrders.get(this.orderId).then(remote => {
      if (remote) {
        this.showOrder(remote);
        store.cacheConfirmedOrders([remote], remote.openid);
        this.setSyncState('synced', '已从云端更新订单状态。');
        this.setData({ stale: false });
      } else if (!this.data.order) return this.showLocal(this.orderId);
      else this.setData({ stale: true, syncMessage: '暂时无法更新，请稍后刷新状态。' });
    }).catch(() => {
      this.setData({ stale: true, syncMessage: '暂时无法更新，显示上次确认的状态。' });
      if (!this.data.order) return this.showLocal(this.orderId);
    }).then(() => this.setData({ refreshing: false }));
  },
  showLocal(id) {
    return cloudOrders.identity().then(openid => {
      const order = store.ordersFor(openid).find(x => x.id === id);
      if (order) {
        this.showOrder(order);
        this.setSyncState(order.openid ? 'synced' : 'failed', '暂时无法更新，显示上次确认的状态。');
        this.setData({ stale: true });
      } else wx.showToast({ title: '没有找到当前账号的订单', icon: 'none' });
    }).catch(() => wx.showToast({ title: '无法验证当前账号，请联网后重试', icon: 'none' }));
  },
  setSyncState(state, message) {
    this.setData({ syncState: state, syncMessage: message });
    if (wx.setNavigationBarTitle) wx.setNavigationBarTitle({ title: state === 'synced' ? '订单详情' : state === 'failed' ? '订单待同步' : '正在同步订单' });
  },
  syncOrder() {
    if (this.data.syncState === 'syncing' || !this.data.order) return;
    const order = this.data.order;
    this.setSyncState('syncing', '正在同步云端…');
    let timer;
    Promise.race([cloudOrders.save(order), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('10 秒内未收到云端确认')), 10000); })])
      .then(remote => {
        this.showOrder(remote);
        store.cacheConfirmedOrders([remote], remote.openid);
        this.setData({ stale: false });
        this.setSyncState('synced', '订单已同步云端，主厨可以查看。');
      })
      .catch(error => {
        cloudError.log('订单云端同步失败', error);
        this.setData({ stale: true });
        this.setSyncState('failed', `订单已保存本机，云端同步失败。${cloudError.describe(error)}，请重试。`);
        cloudOrders.identity().then(openid => store.bindOrderOwner(order.id, openid)).catch(() => {});
      })
      .then(() => clearTimeout(timer));
  },
  showOrder(order) {
    const shown = { ...order, statusLabel: orderStatus.label(order), statusMessage: orderStatus.message(order), diningModeLabel: orderStatus.modeLabel(order) };
    this.setData({ order: shown, steps: orderStatus.steps(order), text: store.formatOrder(order), food: order.lines.filter(x => x.type === 'dish'), service: order.lines.filter(x => x.type === 'special_service') });
  },
  copy() {
    wx.setClipboardData({
      data: this.data.text,
      success() { wx.showModal({ title: '复制成功 💌', content: '打开与闪电主厨的微信聊天，长按输入框粘贴并发送订单。', showCancel: false }); },
      fail() { wx.showToast({ title: '复制失败，请重试', icon: 'none' }); }
    });
  },
  reorder() {
    const valid = this.data.order.lines.filter(x => getItem(x.id));
    valid.forEach(x => store.add(x.id, x.qty));
    wx.navigateTo({ url: '/pages/cart/cart' });
  },
  onShareAppMessage() {
    const o = this.data.order;
    return { title: o ? `${orderStatus.modeLabel(o)} ⚡ ${o.lines.map(x => `${x.name}×${x.qty}`).join('、')}` : '小霞饱饱食堂', path: '/pages/menu/menu' };
  }
});
