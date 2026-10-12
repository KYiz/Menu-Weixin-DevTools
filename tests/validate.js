const assert=require('assert');const fs=require('fs');const path=require('path');const crypto=require('crypto');
const {categories,items,getItem}=require('../data/catalog');const {getRecipe,scaled,recipeIds}=require('../data/recipes');
const db={};global.wx={getStorageSync:key=>Object.prototype.hasOwnProperty.call(db,key)?db[key]:'',setStorageSync:(key,value)=>{db[key]=value}};const store=require('../utils/store');
assert.strictEqual(categories.length,9);assert.strictEqual(categories[0].id,'special');assert.strictEqual(items.length,48);assert.strictEqual(items.filter(x=>x.type==='dish').length,47);assert.strictEqual(recipeIds.length,47);
assert.strictEqual(new Set(items.map(x=>x.id)).size,48);
for(const id of ['veg-9','veg-10']){assert.strictEqual(getItem(id).categoryId,'veg');assert.ok(getRecipe(id));}
assert.strictEqual(new Set(items.filter(x=>x.type==='dish').map(x=>x.image)).size,47,'each dish needs its own image');
assert.strictEqual(new Set(items.filter(x=>x.type==='dish').map(x=>crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',x.image.slice(1)))).digest('hex'))).size,47,'dish images must have different content');
for(const item of items){assert.ok(fs.existsSync(path.join(__dirname,'..',item.image.slice(1))),`missing image: ${item.image}`);if(item.type==='dish'){const r=getRecipe(item.id);assert.ok(r,`missing recipe: ${item.name}`);assert.ok(r.ingredients.length&&r.seasonings.length&&r.prep&&r.steps.length>=2&&r.heatControl&&r.keyTiming&&r.tips&&r.plating,`incomplete recipe: ${item.name}`);for(const s of r.steps)assert.ok(s.title&&s.uses&&s.heat&&s.minutes>0&&s.text);assert.strictEqual(scaled(r.ingredients,4)[0].displayAmount,r.ingredients[0].amount*2)}else{assert.strictEqual(item.price,0);assert.strictEqual(getRecipe(item.id),null)}}
for(const item of items.filter(x=>x.type==='dish')){
  const recipe=getRecipe(item.id);
  assert.ok(Number.isInteger(recipe.prepMinutes)&&recipe.prepMinutes>0,`invalid prep time: ${item.name}`);
  assert.strictEqual(recipe.cookMinutes,recipe.steps.reduce((sum,step)=>sum+step.minutes,0),`step time mismatch: ${item.name}`);
  assert.strictEqual(item.minutes,recipe.prepMinutes+recipe.cookMinutes,`menu time mismatch: ${item.name}`);
}
assert.ok(!items.filter(x=>x.type==='dish').some(x=>!x.available));
const special=getItem('special-love'),food=getItem('chicken-1');
store.add(special.id);assert.strictEqual(store.total(store.cart()),0);assert.deepStrictEqual(store.cart(),[{id:special.id,qty:1}]);
store.add(food.id,2);assert.strictEqual(store.total(store.cart()),food.price*2);store.setQty(food.id,1);assert.strictEqual(store.total(store.cart()),food.price);
assert.strictEqual(store.toggleFavorite(special.id),true);assert.deepStrictEqual(store.favorites(),[special.id]);assert.strictEqual(store.toggleFavorite(special.id),false);
const order={id:'TEST1',time:'2026-10-11 12:00',lines:store.cart().map(x=>({...x,name:getItem(x.id).name,price:getItem(x.id).price,type:getItem(x.id).type})),taste:'微辣',note:'不要香菜',total:store.total(store.cart())};store.saveOrder(order);assert.strictEqual(store.cart().length,0);assert.strictEqual(store.orders()[0].lines.length,2);assert.ok(store.formatOrder(order).includes('💗 特殊服务'));assert.ok(store.formatOrder(order).includes('可亲可抱可爱爱 × 1'));
store.add(special.id,2);const onlyService={...order,id:'TEST2',lines:[{id:special.id,name:special.name,type:special.type,price:0,qty:2}],total:0};store.saveOrder(onlyService);assert.strictEqual(store.orders()[0].total,0);assert.ok(store.formatOrder(onlyService).includes('可亲可抱可爱爱 × 2'));
const app=JSON.parse(fs.readFileSync(path.join(__dirname,'..','app.json'),'utf8'));for(const page of app.pages)for(const ext of ['.js','.json','.wxml','.wxss'])assert.ok(fs.existsSync(path.join(__dirname,'..',page+ext)),`missing ${page+ext}`);
assert.strictEqual(app.lazyCodeLoading,'requiredComponents');
assert.deepStrictEqual(app.subPackages,[{root:'pages/chef',pages:['chef']}]);
assert.ok(categories.every(category=>!category.image),'unused category artwork should not be referenced');
const allPages=app.pages.concat(app.subPackages.flatMap(pkg=>pkg.pages.map(page=>pkg.root+'/'+page)));
for(const page of allPages){for(const ext of ['.js','.json','.wxml','.wxss'])assert.ok(fs.existsSync(path.join(__dirname,'..',page+ext)),`missing ${page+ext}`);const js=fs.readFileSync(path.join(__dirname,'..',page+'.js'),'utf8'),wxml=fs.readFileSync(path.join(__dirname,'..',page+'.wxml'),'utf8');for(const [,event] of wxml.matchAll(/(?:bindtap|catchtap|bindchange|bindinput|catchlongpress)="([^"]+)"/g))assert.ok(js.includes(event+'('),`missing event ${event} on ${page}`);for(const route of js.match(/\/pages\/[a-z]+\/[a-z]+/g)||[])assert.ok(allPages.includes(route.slice(1)),`missing route ${route}`)}
assert.ok(fs.existsSync(path.join(__dirname,'..','assets/images/shinchan-kitchen.jpg')));assert.ok(fs.existsSync(path.join(__dirname,'..','assets/images/kitchen-strip.jpg')));assert.ok(fs.existsSync(path.join(__dirname,'..','assets/images/shinchan-love.jpg')));
const menuWxml=fs.readFileSync(path.join(__dirname,'..','pages/menu/menu.wxml'),'utf8');
assert.ok(fs.existsSync(path.join(__dirname,'..','assets/images/checkout-art.jpg')));
assert.ok(menuWxml.includes('/assets/images/checkout-art.jpg')&&menuWxml.includes('{{cartCount}}')&&menuWxml.includes('{{total}}'));
assert.ok(menuWxml.includes('<scroll-view class="cat-list" scroll-y="true">')&&menuWxml.includes('<scroll-view class="dish-list" scroll-y="true"'),'menu columns must scroll independently');
console.log('PASS: 9 categories, 48 items, 47 complete recipes and matching times, local images, scaling, favorites, cart, 0-price and mixed orders, page routes and handlers');
