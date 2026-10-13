const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.wx = {
  getStorageSync: () => '',
  setStorageSync() {},
  navigateTo() {},
  showToast() {}
};
global.Page = definition => {
  global.page = {
    ...definition,
    data: { ...definition.data },
    setData(update) { Object.assign(this.data, update); }
  };
};
require('../pages/menu/menu');
const page = global.page;
page.onLoad();
assert.strictEqual(page.data.selected, 'chicken');

const wxml = fs.readFileSync(path.join(__dirname, '../pages/menu/menu.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(__dirname, '../pages/menu/menu.wxss'), 'utf8');
assert.ok(wxml.includes('class="dish-price"') && wxml.includes('class="small-add"'));
assert.ok(wxml.includes('class="small-add" data-id="{{item.id}}" catchtap="add" aria-role="button"'));
assert.ok(!wxml.includes('<button class="small-add"'));
assert.ok(wxml.includes('<view class="cat-list">'));
assert.ok(wxml.includes('<view class="dish-list">'));
assert.ok(wxml.includes('<scroll-view class="cart-sheet-list" scroll-y="true"'));
assert.ok(!wxml.includes('class="dish-list" scroll-y='));
assert.ok(!wxml.includes('footerStyle'));
assert.ok(wxss.includes('.menu-page{display:flex;flex-direction:column;box-sizing:border-box;min-height:100vh;overflow:visible;'));
assert.ok(wxss.includes('.menu-layout{display:flex;flex:1 0 auto;'));
assert.ok(wxss.includes('.cat{min-height:98rpx;'));
assert.ok(wxss.includes('padding-bottom:calc(171rpx + env(safe-area-inset-bottom))'));
assert.ok(wxml.includes('class="top-banner-frame"><image class="top-banner" src="/assets/images/shinchan-kitchen.jpg" mode="widthFix"'));
assert.ok(wxml.includes('class="kitchen-strip" src="/assets/images/kitchen-strip.jpg" mode="widthFix"'));
assert.ok(wxss.includes('.top-banner-frame{height:245rpx}'));
assert.ok(wxss.includes('.top-banner{position:relative;top:-18rpx'));
assert.ok(wxss.includes('.kitchen-strip{height:auto}'));
assert.ok(!/@media[\s\S]*?\.top-banner\{height:\d+rpx\}/.test(wxss));
console.log('PASS: menu columns move with the page and footer space matches its safe-area height');
