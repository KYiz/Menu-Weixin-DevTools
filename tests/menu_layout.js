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
assert.ok(wxml.includes('<scroll-view class="cat-list" scroll-y="true">'));
assert.ok(wxml.includes('<scroll-view class="dish-list" scroll-y="true" scroll-into-view="dish-group-{{selected}}">'));
assert.ok(wxml.includes('id="dish-group-{{selected}}"'));
assert.ok(!wxml.includes('footerStyle'));
assert.ok(wxss.includes('.menu-layout{display:flex;flex:1 1 0;'));
assert.ok(wxss.includes('padding-bottom:calc(171rpx + env(safe-area-inset-bottom))'));
console.log('PASS: menu columns scroll independently and footer space matches its safe-area height');
