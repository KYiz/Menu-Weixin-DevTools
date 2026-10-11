const { categories, items } = require('../../data/catalog');
const store = require('../../utils/store');
const cloudOrders = require('../../utils/cloudOrders');
const cloudError = require('../../utils/cloudError');
const labels = { pending: ['待接单', 'accepted', '接单'], accepted: ['已接单', 'cooking', '开始制作'], cooking: ['制作中', 'done', '标记完成'], done: ['已完成', '', ''] };

function displayOrder(order) {
  const [statusLabel, nextStatus, actionLabel] = labels[order.status] || labels.pending;
  return { ...order, statusLabel, nextStatus, actionLabel, summary: order.lines.map(line => `${line.name} × ${line.qty}`).join('、') };
}

Page({
  data: { categories, selected: 'chicken', visible: [], authorized: false, loading: true, accessError: '', orders: [], selectedOrder: null, orderCount: 0, favCount: 0, updating: false },
  onLoad() { this.select('chicken'); },
  onShow() { this.setData({ favCount: store.favorites().length }); this.refreshOrders(); },
  refreshOrders() {
    const serial = this.refreshSerial = (this.refreshSerial || 0) + 1;
    this.setData({ authorized: false, loading: true, accessError: '', orders: [], selectedOrder: null });
    return cloudOrders.chefList().then(orders => {
      if (serial !== this.refreshSerial) return;
      const shown = orders.map(displayOrder);
      this.setData({ authorized: true, loading: false, orders: shown, orderCount: shown.length, selectedOrder: shown.find(order => order.key === this.selectedKey) || null });
    }).catch(error => {
      if (serial !== this.refreshSerial) return;
      cloudError.log('主厨订单读取失败', error);
      this.setData({ authorized: false, loading: false, orderCount: 0, accessError: cloudError.describe(error) });
    });
  },
  chooseOrder(e) {
    this.selectedKey = e.currentTarget.dataset.key;
    this.setData({ selectedOrder: this.data.orders.find(order => order.key === this.selectedKey) || null });
  },
  advanceStatus() {
    const order = this.data.selectedOrder;
    if (!this.data.authorized || this.data.updating || !order || !order.nextStatus) return;
    this.setData({ updating: true });
    cloudOrders.setStatus(order.key, order.nextStatus).then(() => {
      this.setData({ updating: false });
      return this.refreshOrders();
    }).catch(error => {
      this.setData({ updating: false });
      cloudError.log('主厨订单状态更新失败', error);
      wx.showToast({ title: cloudError.describe(error), icon: 'none' });
      this.refreshOrders();
    });
  },
  select(id) { this.setData({ selected: id, visible: items.filter(item => item.categoryId === id) }); },
  tapCategory(e) { this.select(e.currentTarget.dataset.id); },
  open(e) { const id = e.currentTarget.dataset.id; const item = items.find(x => x.id === id); wx.navigateTo({ url: item.type === 'dish' ? '/pages/recipe/recipe?id=' + id : '/pages/detail/detail?id=' + id }); },
  favorites() { wx.navigateTo({ url: '/pages/favorites/favorites' }); },
  guest() { wx.navigateBack({ delta: 1 }); }
});
