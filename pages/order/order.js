const store=require('../../utils/store');
const cloudOrders=require('../../utils/cloudOrders');
const cloudError=require('../../utils/cloudError');
const {getItem}=require('../../data/catalog');

Page({
  data:{order:null,text:'',food:[],service:[],syncState:'',syncMessage:''},
  onLoad(options){
    if(options.local==='1'&&getApp().globalData.pendingOrderId===options.id){
      getApp().globalData.pendingOrderId='';
      const order=store.orders().find(x=>x.id===options.id);
      if(order){this.showOrder(order);this.syncOrder();return}
    }
    cloudOrders.get(options.id).then(remote=>{
      if(remote){this.showOrder(remote);this.setSyncState('synced','订单已同步云端，主厨可以查看。');}
      else this.showLocal(options.id);
    }).catch(()=>{
      this.showLocal(options.id);
    });
  },
  showLocal(id){
    cloudOrders.identity().then(openid=>{
      const order=store.ordersFor(openid).find(x=>x.id===id);
      if(order){this.showOrder(order);this.setSyncState('failed','订单已保存本机，云端同步失败。请点击重试同步云端。');}
      else wx.showToast({title:'没有找到当前账号的订单',icon:'none'});
    }).catch(()=>wx.showToast({title:'无法验证当前账号，请联网后重试',icon:'none'}));
  },
  setSyncState(state,message){
    this.setData({syncState:state,syncMessage:message});
    if(wx.setNavigationBarTitle)wx.setNavigationBarTitle({title:state==='synced'?'订单已送达':state==='failed'?'订单待同步':'正在同步订单'});
  },
  syncOrder(){
    if(this.data.syncState==='syncing'||!this.data.order)return;
    const order=this.data.order;
    this.setSyncState('syncing','正在同步云端…');
    let timer;
    Promise.race([cloudOrders.save(order),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('10 秒内未收到云端确认')),10000)})])
      .then(()=>this.setSyncState('synced','订单已同步云端，主厨可以查看。'))
      .catch(error=>{
        cloudError.log('订单云端同步失败',error);
        this.setSyncState('failed',`订单已保存本机，云端同步失败。${cloudError.describe(error)}，请重试。`);
        cloudOrders.identity().then(openid=>store.bindOrderOwner(order.id,openid)).catch(()=>{});
      })
      .then(()=>clearTimeout(timer));
  },
  showOrder(order){
    const statusLabel={pending:'待接单',accepted:'已接单',cooking:'制作中',done:'已完成'}[order.status]||'待接单';
    this.setData({order:{...order,statusLabel},text:store.formatOrder(order),food:order.lines.filter(x=>x.type==='dish'),service:order.lines.filter(x=>x.type==='special_service')});
  },
  copy(){
    wx.setClipboardData({
      data:this.data.text,
      success(){wx.showModal({title:'复制成功 💌',content:'打开与闪电主厨的微信聊天，长按输入框粘贴并发送订单。',showCancel:false})},
      fail(){wx.showToast({title:'复制失败，请重试',icon:'none'})}
    });
  },
  reorder(){
    const valid=this.data.order.lines.filter(x=>getItem(x.id));
    valid.forEach(x=>store.add(x.id,x.qty));
    wx.navigateTo({url:'/pages/cart/cart'});
  },
  onShareAppMessage(){
    const o=this.data.order;
    return{title:o?`闪电专送 ⚡ ${o.lines.map(x=>`${x.name}×${x.qty}`).join('、')}`:'小霞饱饱食堂',path:'/pages/menu/menu'};
  }
});
