const store=require('../../utils/store');
const cloudOrders=require('../../utils/cloudOrders');
const cloudError=require('../../utils/cloudError');
const orderStatus=require('../../utils/orderStatus');

Page({
  data:{orders:[],loadMessage:'',refreshing:false,stale:false},
  onShow(){this.refreshStatus()},
  refreshStatus(){
    const serial=this.loadSerial=(this.loadSerial||0)+1;
    this.setData({refreshing:true,loadMessage:''});
    return cloudOrders.listWithIdentity().then(result=>{
      if(serial===this.loadSerial){this.verifiedOpenid=result.openid;store.cacheConfirmedOrders(result.orders,result.openid);this.showOrders(result.orders,result.openid);this.setData({stale:false,refreshing:false})}
    }).catch(error=>{
      if(serial!==this.loadSerial)return;
      cloudError.log('云端订单读取失败，核对当前账号后尝试本机订单',error);
      return cloudOrders.identity().then(openid=>{
        if(serial===this.loadSerial){this.verifiedOpenid=openid;this.showOrders([],openid,'暂时无法更新，显示上次确认的状态。');this.setData({stale:true,refreshing:false})}
      }).catch(()=>{
        if(serial!==this.loadSerial)return;
        if(this.verifiedOpenid)this.showOrders([],this.verifiedOpenid,'暂时无法更新，显示上次确认的状态。');
        else this.setData({orders:[],loadMessage:'暂时无法确认当前微信账号，无法安全显示本机订单。请联网后重试。'});
        this.setData({stale:true,refreshing:false});
      });
    });
  },
  onHide(){this.loadSerial=(this.loadSerial||0)+1},
  showOrders(orders,openid,loadMessage=''){
    const remoteIds=new Set(orders.map(order=>order.id));
    const localOnly=store.ordersFor(openid).filter(order=>!remoteIds.has(order.id));
    const merged=orders.concat(localOnly);
    const message=loadMessage || (localOnly.length ? '部分订单暂未从云端确认，显示上次保存的状态。' : '');
    this.setData({loadMessage:message,orders:merged.map(x=>({...x,statusLabel:orderStatus.label(x),diningModeLabel:orderStatus.modeLabel(x),summary:x.lines.map(l=>`${l.name} × ${l.qty}`).join('、')}))});
  },
  open(e){wx.navigateTo({url:'/pages/order/order?id='+e.currentTarget.dataset.id})}
});
