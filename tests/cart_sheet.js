const assert = require('assert');
const fs = require('fs');
const path = require('path');

const memory = {};
const navigation = [];
const toasts = [];
global.wx = {
  getStorageSync: key => Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : '',
  setStorageSync: (key, value) => { memory[key] = value; },
  navigateTo: options => navigation.push(options.url),
  showToast: options => toasts.push(options.title)
};
global.Page = definition => {
  global.page = {
    ...definition,
    data: { ...definition.data },
    setData(update) { Object.assign(this.data, update); }
  };
};

const store = require('../utils/store');
require('../pages/menu/menu');
const menu = global.page;
menu.onLoad();
menu.refresh();
menu.goCart();
assert.strictEqual(menu.data.cartOpen, true, 'empty cart must open');
assert.strictEqual(menu.data.cartLines.length, 0);
menu.goCheckout();
assert.strictEqual(navigation.length, 0, 'empty cart cannot check out');
assert.ok(toasts.length > 0);
menu.closeCart();
assert.strictEqual(menu.data.cartOpen, false);

store.add('chicken-1', 2);
menu.refresh();
menu.goCart();
assert.strictEqual(menu.data.cartCount, 2);
assert.strictEqual(menu.data.cartLines[0].subtotal, store.total(store.cart()));
menu.cartIncrease({ currentTarget: { dataset: { id: 'chicken-1' } } });
assert.strictEqual(menu.data.cartCount, 3);
menu.cartDecrease({ currentTarget: { dataset: { id: 'chicken-1' } } });
assert.strictEqual(menu.data.cartCount, 2);
menu.cartListScroll({ detail: { scrollTop: 30 } });
menu.cartTouchStart({ touches: [{ pageY: 100 }] });
menu.cartTouchEnd({ changedTouches: [{ pageY: 190 }] });
assert.strictEqual(menu.data.cartOpen, true, 'scrolling a long list must not dismiss the sheet');
menu.cartListScroll({ detail: { scrollTop: 0 } });
menu.cartTouchStart({ touches: [{ pageY: 100 }] });
menu.cartTouchEnd({ changedTouches: [{ pageY: 190 }] });
assert.strictEqual(menu.data.cartOpen, false, 'downward swipe closes the sheet');
menu.goCart();
menu.goCheckout();
menu.goCheckout();
assert.deepStrictEqual(navigation, ['/pages/cart/cart'], 'checkout navigates once');
assert.strictEqual(menu.data.cartOpen, false);
menu.checkoutNavigating = false;
menu.goCart();
menu.cartRemove({ currentTarget: { dataset: { id: 'chicken-1' } } });
assert.strictEqual(menu.data.cartCount, 0);
assert.strictEqual(menu.data.total, 0);
assert.strictEqual(menu.data.cartLines.length, 0);

const wxml = fs.readFileSync(path.join(__dirname, '../pages/menu/menu.wxml'), 'utf8');
assert.ok(wxml.includes('class="cart-bar"><image'));
assert.ok(!wxml.includes('class="cart-bar" bindtap='), 'whole bar must not open cart');
assert.ok(wxml.includes('class="cart-checkout {{cartCount===0?\'cart-checkout-disabled\':\'\'}}" bindtap="goCheckout"'));
assert.ok(wxml.includes('class="cart-sheet-list" scroll-y="true"'));
assert.ok(wxml.includes('catchtap="closeCart" catchtouchmove="blockTouch"'));
const cartNavigation = require('../utils/cartNavigation');
const existingMenu = { route: 'pages/menu/menu' };
global.getCurrentPages = () => [existingMenu, { route: 'pages/detail/detail' }];
wx.navigateBack = ({ delta }) => navigation.push(`back:${delta}`);
cartNavigation.openCart();
assert.strictEqual(existingMenu.openCartOnShow, true);
assert.strictEqual(navigation[navigation.length - 1], 'back:1', 'detail cart entry reuses the existing menu');
global.getCurrentPages = () => [{ route: 'pages/detail/detail' }];
wx.redirectTo = ({ url }) => navigation.push(url);
cartNavigation.openCart();
assert.strictEqual(navigation[navigation.length - 1], '/pages/menu/menu?cart=1', 'direct detail entry opens a menu with the sheet');
console.log('PASS: cart sheet open/close, quantity sync, empty guard, and one-step checkout');
