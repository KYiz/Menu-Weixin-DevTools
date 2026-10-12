const names = { pending: '已下单', accepted: '已接单', cooking: '制作中', done: '制作完成', delivering: '配送中', delivered: '已送达' };
const deliverySteps = ['pending', 'accepted', 'cooking', 'done', 'delivering', 'delivered'];
const dineSteps = deliverySteps.slice(0, 4);
function mode(order) { return order && order.diningMode === 'dine_in' ? 'dine_in' : 'delivery'; }
function modeLabel(order) { return mode(order) === 'dine_in' ? '到店堂食' : '闪电专送'; }
function label(order) {
  const status = order && order.status || 'pending';
  return mode(order) === 'dine_in' && status === 'done' ? '可以开饭啦' : names[status] || '已下单';
}
function message(order) {
  const status = order && order.status || 'pending';
  if (status === 'delivered') return '心意送到啦，快趁热吃吧 ❤️';
  if (status === 'done' && mode(order) === 'dine_in') return '香喷喷的饭菜正等你来吃 ❤️';
  if (status === 'delivering') return '心意正在路上，很快就到啦 ❤️';
  return '主厨正在为你准备这份心意 ❤️';
}
function steps(order) {
  const statuses = mode(order) === 'dine_in' ? dineSteps : deliverySteps;
  const current = statuses.indexOf(order && order.status || 'pending');
  return statuses.map((status, index) => ({ status, label: status === 'done' && mode(order) === 'dine_in' ? '可以开饭啦' : names[status], reached: index <= current, current: index === current }));
}
module.exports = { mode, modeLabel, label, message, steps };
