const {getItem}=require('../data/catalog');
const prefix='lightning-v1-';
function read(key,fallback){try{const value=wx.getStorageSync(prefix+key);return value===''||value===undefined?fallback:value}catch(e){return fallback}}
function write(key,value){wx.setStorageSync(prefix+key,value);return value}
function cart(){return read('cart',[]).filter(x=>getItem(x.id)&&x.qty>0)}
function setQty(id,qty){const next=cart().filter(x=>x.id!==id);if(qty>0)next.push({id,qty});write('cart',next);return next}
function add(id,n=1){const old=cart().find(x=>x.id===id);return setQty(id,(old?old.qty:0)+n)}
function favorites(){return read('favorites',[]).filter(id=>!!getItem(id))}
function toggleFavorite(id){const list=favorites();const next=list.includes(id)?list.filter(x=>x!==id):list.concat(id);write('favorites',next);return next.includes(id)}
function orders(){return read('orders',[])}
function bindOrderOwner(id,openid){if(!id||!openid)return;const owners=read('orderOwners',{});owners[id]=openid;write('orderOwners',owners)}
function ordersFor(openid){if(!openid)return[];const owners=read('orderOwners',{});return orders().filter(order=>owners[order.id]===openid)}
function saveOrder(order){write('orders',[order].concat(orders()));write('cart',[])}
function cacheConfirmedOrders(remote,openid){if(!openid)return;const local=orders();const byId=new Map(local.map(order=>[order.id,order]));remote.forEach(order=>{if(order&&order.id){byId.set(order.id,order);bindOrderOwner(order.id,openid)}});write('orders',Array.from(byId.values()))}
function total(lines){return lines.reduce((n,x)=>{const item=getItem(x.id);return n+(item?item.price*x.qty:0)},0)}
function formatOrder(order){const food=order.lines.filter(x=>x.type==='dish').map(x=>`${x.name} × ${x.qty}`).join('\n')||'无';const service=order.lines.filter(x=>x.type==='special_service').map(x=>`${x.name} × ${x.qty}`).join('\n');const mode=order.diningMode==='dine_in'?'到店堂食':'闪电专送';return `小霞饱饱食堂 ⚡\n${mode} · 新订单\n订单编号：${order.id}\n订单时间：${order.time}\n\n点餐内容：\n${food}${service?'\n\n💗 特殊服务：\n'+service:''}\n\n口味偏好：${order.taste||'无'}\n备注：${order.note||'无'}\n合计：${order.total} ⚡ 闪电币\n\n主厨快来接单啦 ❤️`}
module.exports={read,write,cart,setQty,add,favorites,toggleFavorite,orders,ordersFor,bindOrderOwner,saveOrder,cacheConfirmedOrders,total,formatOrder};
