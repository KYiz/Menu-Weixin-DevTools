const assert=require('assert');
const memory={};let redirected='';
global.wx={getStorageSync:key=>Object.prototype.hasOwnProperty.call(memory,key)?memory[key]:'',setStorageSync:(key,value)=>{memory[key]=value},redirectTo:({url})=>{redirected=url},navigateTo:()=>{},showToast:()=>{},setClipboardData:({data,success})=>{global.copied=data;success&&success()},showModal:()=>{}};
const app={globalData:{cloudReady:false,pendingOrderId:''}};global.getApp=()=>app;
global.Page=config=>{global.page={...config,data:{...config.data},setData(value){Object.assign(this.data,value)}}};
const store=require('../utils/store');const {getItem}=require('../data/catalog');
function cartPage(){delete require.cache[require.resolve('../pages/cart/cart')];require('../pages/cart/cart');return global.page}
store.add('special-love');let page=cartPage();page.onShow();assert.strictEqual(page.data.total,0);page.submit();page.submit();assert.strictEqual(store.orders().length,1,'double tap must create only one local order');assert.ok(redirected.includes('/pages/order/order?id='));let order=store.orders()[0];assert.strictEqual(order.lines.length,1);assert.strictEqual(order.lines[0].type,'special_service');assert.strictEqual(order.total,0);
store.add('special-love');store.add('chicken-1');page=cartPage();page.onShow();page.tasteChange({detail:{value:'微辣'}});page.noteChange({detail:{value:'不要香菜'}});page.submit();order=store.orders()[0];assert.strictEqual(order.lines.length,2);assert.strictEqual(order.total,getItem('chicken-1').price);assert.strictEqual(order.taste,'微辣');assert.strictEqual(order.note,'不要香菜');
delete require.cache[require.resolve('../pages/order/order')];require('../pages/order/order');const detail=global.page;detail.onLoad({id:order.id,local:'1'});assert.strictEqual(detail.data.service.length,1);assert.strictEqual(detail.data.food.length,1);detail.copy();assert.ok(global.copied.includes('可亲可抱可爱爱 × 1'));assert.ok(global.copied.includes('可乐鸡翅 × 1'));detail.reorder();assert.strictEqual(store.cart().length,2);
wx.setStorageSync('role','chef');
assert.strictEqual(store.orders().length,2,'switching entry must preserve this device history');
assert.strictEqual(store.cart().length,2,'switching entry must preserve the cart');
wx.setStorageSync('role','guest');
assert.strictEqual(detail.onShareAppMessage().path,'/pages/menu/menu','share card is a mini-program entry, not an order transfer');

console.log('PASS: special-only and mixed orders, history detail, copy, reorder, local entry switch and share route');
