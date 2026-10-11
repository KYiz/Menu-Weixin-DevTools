const categories = [
  {id:'special',name:'💗 特殊服务',short:'专属',emoji:'💗'},
  {id:'chicken',name:'🐔 鸡肉料理',short:'鸡肉',emoji:'🐔'},
  {id:'beef',name:'🐮 牛肉料理',short:'牛肉',emoji:'🐮'},
  {id:'lamb',name:'🐑 羊肉料理',short:'羊肉',emoji:'🐑'},
  {id:'pork',name:'🐷 猪肉料理',short:'猪肉',emoji:'🐷'},
  {id:'seafood',name:'🐟 鱼虾海鲜',short:'海鲜',emoji:'🐟'},
  {id:'staple',name:'🍚 碳水主食',short:'主食',emoji:'🍚'},
  {id:'veg',name:'🥬 蔬菜与豆腐',short:'蔬菜',emoji:'🥬'},
  {id:'drink',name:'🥤 饮料',short:'饮料',emoji:'🥤'}
];
const rows = {
 chicken:[['可乐鸡翅',1,31],['土豆炖鸡',2,53],['红烧鸡翅',2,35],['香煎鸡翅',1,32]],
 beef:[['番茄炖牛腩',3,106],['土豆炖牛肉',3,106],['青椒炒牛肉',2,21],['洋葱炒牛肉',1,22],['咖喱牛肉',2,79],['西冷牛排（Sirloin）',2,31],['Scotch Fillet 牛排',2,33],['辣椒炒牛肉',2,21]],
 lamb:[['孜然羊肉',2,14],['烤羊肉串',2,57],['清炖羊肉汤',3,128]],
 pork:[['青椒肉丝',1,22],['肉末茄子',1,32],['肉末豆腐',1,20],['鱼香肉丝',2,23],['糖醋里脊',2,24],['土豆烧排骨',2,71],['糖醋排骨',2,59],['红烧排骨',2,64],['红烧肉',3,92],['红烧大排',2,35]],
 seafood:[['香煎三文鱼',1,20],['油焖大虾',2,23],['红烧鱼',3,39]],
 staple:[['蛋炒饭',1,18],['番茄鸡蛋面',1,22],['葱油拌面',1,23],['水饺',2,45],['咖喱鸡肉饭',2,45]],
 veg:[['番茄炒蛋',1,15],['干煸四季豆',2,32],['麻婆豆腐',2,23],['蚝油生菜',1,10],['酸辣土豆丝',1,16],['炒空心菜',1,10],['茼蒿豆腐汤',1,15],['鸡蛋豆腐香菇汤',1,17],['虎皮鸡蛋',2,36],['擂椒皮蛋',1,18]],
 drink:[['拿铁',1,10],['冰美式',1,7],['柠檬蜂蜜水',1,8],['冰柠檬茶',1,12]]
};
const items=[{id:'special-love',categoryId:'special',name:'可亲可抱可爱爱',description:'闪电主厨限定服务，亲亲、抱抱、贴贴，甜蜜不限量！',image:'/assets/images/shinchan-love.jpg',price:0,available:true,recommended:true,type:'special_service',requiresRecipe:false,tags:['女朋友专属','无限供应','主厨限定']}];
Object.keys(rows).forEach(categoryId=>rows[categoryId].forEach((r,index)=>{const id=`${categoryId}-${index+1}`;items.push({id,categoryId,name:r[0],description:`闪电主厨的暖心${categories.find(c=>c.id===categoryId).short}手作，认真做好每一口。`,image:`/assets/images/dishes/${id}.jpg`,price:categoryId==='drink'?6:r[1]*8+7,difficulty:r[1],minutes:r[2],servings:2,available:true,recommended:index===0,type:'dish',requiresRecipe:true})}));
const descriptions={
chicken:['可乐慢慢收成亮汁，鸡翅甜咸入味。','鸡肉和土豆一起炖软，汤汁拌饭最香。','酱香浓郁的家常红烧鸡翅。','外皮金黄，蒜香和柠檬香刚刚好。'],
beef:['番茄酸甜与软烂牛腩，暖胃一大碗。','牛肉慢炖，土豆吸满醇厚汤汁。','青椒清香，牛肉滑嫩的下饭快炒。','洋葱微甜，黑胡椒衬出牛肉香。','柔和咖喱裹住牛肉和根茎蔬菜。','焦香西冷配黄油蒜香，仪式感满分。','油花丰富的 Scotch Fillet，煎香后静置更鲜嫩。','辣椒脆香与牛肉快炒，热辣开胃。'],
lamb:['孜然和羊肉大火碰撞，香得很直接。','烤箱也能做出焦边香香的羊肉串。','萝卜清甜、羊汤温润，慢慢炖给你喝。'],
pork:['青椒爽脆，肉丝嫩滑的经典搭配。','茄子软糯，肉末酱香刚好裹住它。','细嫩豆腐搭配肉末，连汤汁都想拌饭。','酸甜微辣，三丝脆爽的家常鱼香味。','外酥里嫩，酸甜酱汁让人想再夹一块。','排骨炖到软香，土豆吸足肉汁。','糖醋亮汁包住每一块排骨。','酱香浓浓，啃排骨也有幸福感。','五花肉慢炖软糯，肥而不腻。','带骨大排煎香再焖，肉汁饱满。'],
seafood:['鱼皮煎香，柠檬清新提味。','大虾先煎后焖，蒜香酱汁浓亮。','整鱼煎定型再红烧，鲜味都在汤里。'],
staple:['隔夜饭炒到粒粒分明，蛋香扑鼻。','番茄汤底酸甜，面条和蛋花暖呼呼。','小火熬出的葱油，拌面就很满足。','自己包的饺子，馅足皮香。','咖喱鸡肉浇在热米饭上，简单又满足。'],
veg:['嫩蛋裹着番茄汁，经典家的味道。','四季豆煸到熟软起皱，香辣下饭。','豆腐吸饱麻辣肉酱，热乎乎下饭。','脆嫩生菜淋上香香蒜蓉蚝油汁。','酸辣爽脆的土豆丝，越吃越开胃。','蒜香清炒，保留空心菜的清新。','茼蒿清香与豆腐煮一碗温柔汤。','香菇鲜香、蛋花柔软的家常汤。','鸡蛋外皮煎出金黄虎纹，酱香入味。','焦香青椒与皮蛋拌成一口香辣。'],
drink:['浓缩咖啡与温热牛奶的软乎拥抱。','冰块碰上浓缩，清爽醒神。','柠檬清香配蜂蜜，酸甜温柔。','红茶和柠檬加冰，刚好解腻。']
};
items.forEach(item=>{if(item.type==='dish'){const [category,index]=item.id.split('-');item.description=descriptions[category][Number(index)-1]}});
const stapleOrder=['staple-1','staple-5','staple-2','staple-3','staple-4'];
const stapleStart=items.findIndex(item=>item.id==='staple-1');
items.splice(stapleStart,stapleOrder.length,...stapleOrder.map(id=>items.find(item=>item.id===id)));
function getItem(id){return items.find(x=>x.id===id)}
module.exports={categories,items,getItem};
