function describe(error) {
  const raw = String((error && (error.errMsg || error.message)) || '');
  const candidate = String(error && (error.code || error.errCode) || (raw.match(/(?:errCode|错误码)\s*[:：]?\s*(-?\d+)/i) || [])[1] || (raw.match(/-502005\b/) || [])[0] || '');
  const code = /^[A-Z_]{2,40}$|^-?\d{1,10}$/.test(candidate) ? candidate : '';
  let message = '云端暂时不可用，请稍后重试';
  if (code === 'CHEF_FORBIDDEN') message = '当前微信账号不是主厨，请返回点餐';
  else if (code === '-502005' || /collection not exists?\s*:\s*orders/i.test(raw)) message = '云端缺少 orders 集合，请联系主厨创建';
  else if (/不支持的订单操作/.test(raw)) message = 'orders 云函数版本过旧，请主厨重新部署';
  else if (/超时|timeout/i.test(raw)) message = '连接超时，请检查网络后重试';
  else if (/云开发尚未配置|wx\.cloud|不可用/.test(raw)) message = '云开发不可用，请检查网络和小程序配置';
  return message + (code && code !== 'CHEF_FORBIDDEN' ? `（错误码 ${code}）` : '');
}

function log(context, error) {
  try {
    if (wx.getAccountInfoSync().miniProgram.envVersion !== 'release') console.warn(context, error);
  } catch (_) {}
}

module.exports = { describe, log };
