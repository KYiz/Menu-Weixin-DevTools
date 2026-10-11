const store=require('../../utils/store');
const cloudOrders=require('../../utils/cloudOrders');
const cloudError=require('../../utils/cloudError');
const statusLabels={pending:'待接单',accepted:'已接单',cooking:'制作中',done:'已完成'};

Page({
  data:{orders:[],loadMessage:''},
  onShow(){
    const serial=this.loadSerial=(this.loadSerial||0)+1;
    this.setData({orders:[],loadMessage:''});
    cloudOrders.listWithIdentity().then(result=>{
      if(serial===this.loadSerial)this.showOrders(result.orders,result.openid);
    }).catch(error=>{
      if(serial!==this.loadSerial)return;
      cloudError.log('云端订单读取失败，核对当前账号后尝试本机订单',error);
      cloudOrders.identity().then(openid=>{
        if(serial===this.loadSerial)this.showOrders([],openid,'云端订单暂不可读，已显示当前账号的本机订单。');
      }).catch(()=>{
        if(serial===this.loadSerial)this.setData({orders:[],loadMessage:'暂时无法确认当前微信账号，无法安全显示本机订单。请联网后重试。'});
      });
    });
  },
  onHide(){this.loadSerial=(this.loadSerial||0)+1},
  showOrders(orders,openid,loadMessage=''){
    const remoteIds=new Set(orders.map(order=>order.id));
    const merged=orders.concat(store.ordersFor(openid).filter(order=>!remoteIds.has(order.id)));
    this.setData({loadMessage,orders:merged.map(x=>({...x,statusLabel:statusLabels[x.status]||'待接单',summary:x.lines.map(l=>`${l.name} × ${l.qty}`).join('、')}))});
  },
  open(e){wx.navigateTo({url:'/pages/order/order?id='+e.currentTarget.dataset.id})}
});
