const { categories, items, getItem } = require('../../data/catalog');
const store = require('../../utils/store');
const cloudOrders = require('../../utils/cloudOrders');

Page({
  data: {
    categories, menuCount: items.length, selected: 'chicken', selectedName: '🐔 鸡肉料理',
    visible: [], cartCount: 0, total: 0, cartLines: [], cartOpen: false,
    cartScrollTop: 0, showChefEntry: false
  },
  onLoad(options = {}) {
    this.selectCategory('chicken');
    this.openCartOnShow = options.cart === '1';
  },
  onShow() {
    this.checkoutNavigating = false;
    this.refresh();
    this.checkChef();
    if (this.openCartOnShow) {
      this.openCartOnShow = false;
      this.goCart();
    }
  },
  onHide() { this.setData({ cartOpen: false }); },
  checkChef() {
    if (this.chefChecked) return;
    this.chefChecked = true;
    this.setData({ showChefEntry: false });
    return cloudOrders.identityResult()
      .then(result => this.setData({ showChefEntry: result.isChef === true }))
      .catch(() => { this.chefChecked = false; this.setData({ showChefEntry: false }); });
  },
  refresh() {
    const cart = store.cart();
    const cartLines = cart.map(line => {
      const item = getItem(line.id);
      return { ...line, item, subtotal: item.price * line.qty };
    });
    this.setData({
      cartLines,
      cartCount: cart.reduce((count, line) => count + line.qty, 0),
      total: store.total(cart),
      visible: items.filter(item => item.categoryId === this.data.selected)
    });
  },
  selectCategory(id) {
    const category = categories.find(item => item.id === id);
    this.setData({ selected: id, selectedName: category ? category.name : '菜单', visible: items.filter(item => item.categoryId === id) });
  },
  tapCategory(e) { this.selectCategory(e.currentTarget.dataset.id); },
  detail(e) { wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id }); },
  add(e) {
    store.add(e.currentTarget.dataset.id);
    this.refresh();
    wx.showToast({ title: '已装进小餐车', icon: 'none' });
  },
  goCart() {
    if (this.data.cartOpen) return;
    this.refresh();
    this.cartListTop = 0;
    this.setData({ cartOpen: true, cartScrollTop: 0 });
  },
  closeCart() { this.setData({ cartOpen: false }); },
  blockTouch() {},
  cartTouchStart(e) { this.cartTouchY = e.touches && e.touches[0] ? e.touches[0].pageY : null; },
  cartTouchEnd(e) {
    const end = e.changedTouches && e.changedTouches[0];
    if (this.cartTouchY !== null && end && end.pageY - this.cartTouchY > 80 && this.cartListTop <= 0) this.closeCart();
    this.cartTouchY = null;
  },
  cartListScroll(e) { this.cartListTop = e.detail.scrollTop; },
  cartIncrease(e) { store.add(e.currentTarget.dataset.id); this.refresh(); },
  cartDecrease(e) {
    const id = e.currentTarget.dataset.id;
    const line = store.cart().find(item => item.id === id);
    if (!line) return;
    store.setQty(id, line.qty - 1);
    this.refresh();
  },
  cartRemove(e) { store.setQty(e.currentTarget.dataset.id, 0); this.refresh(); },
  goCheckout() {
    if (this.checkoutNavigating) return;
    if (!store.cart().length) {
      wx.showToast({ title: '先选点心爱的吧', icon: 'none' });
      return;
    }
    this.checkoutNavigating = true;
    this.setData({ cartOpen: false });
    wx.navigateTo({ url: '/pages/cart/cart', fail: () => { this.checkoutNavigating = false; } });
  },
  goOrders() { wx.navigateTo({ url: '/pages/orders/orders' }); },
  goFavorites() { wx.navigateTo({ url: '/pages/favorites/favorites' }); },
  goRandom() { wx.navigateTo({ url: '/pages/random/random' }); },
  goChef() { if (this.data.showChefEntry) wx.navigateTo({ url: '/pages/chef/chef' }); },
  diagnoseCloud() { this.chefChecked = false; require('../../utils/cloudDiagnostic').run(); },
  onShareAppMessage() {
    return { title: '小霞饱饱食堂 ⚡ 闪电专送开张啦', path: '/pages/menu/menu', imageUrl: '/assets/images/shinchan-kitchen.jpg' };
  }
});
