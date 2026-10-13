function openCart() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  for (let index = pages.length - 2; index >= 0; index--) {
    if (pages[index].route === 'pages/menu/menu') {
      pages[index].openCartOnShow = true;
      wx.navigateBack({ delta: pages.length - 1 - index });
      return;
    }
  }
  wx.redirectTo({ url: '/pages/menu/menu?cart=1' });
}

module.exports = { openCart };
