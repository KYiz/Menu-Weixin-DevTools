# 小霞饱饱食堂 ⚡

私人情侣微信原生点餐小程序。女朋友从首页点餐，主厨从首页的「主厨入口」查看云端订单与菜谱；菜单内置于项目，购物车与收藏保存在当前微信设备本地。订单先保存在本机，再通过云函数同步至云数据库。

## 导入与运行

1. 安装并登录[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 用开发者工具选择「导入项目」，目录选本仓库根目录 `F:\Codex\幺儿菜谱`。
3. 项目已在 `project.config.json` 中配置小程序 AppID `wx4421125aa02fbd35`。导入时确认开发者工具显示的是该 AppID。
4. 编译后先打开菜单页，在模拟器中逐一检查分类、详情、购物车、订单、收藏、随机推荐与主厨入口；再使用微信扫码在 iPhone 上预览，检查安全区域、滚动和分享。
5. 使用开发者工具「上传」新版本，在微信公众平台版本管理中设为体验版并添加体验成员。对方在中国使用前，还需要确保你的微信小程序主体与版本已满足微信平台的发布和体验资格。

`appid` 位于项目根目录的 `project.config.json`，当前值为 `wx4421125aa02fbd35`。

## 订单如何发给主厨

下单后立即保存到本机，订单详情页会显示云端同步结果；失败或超时时可以手动重试，同一订单编号重复提交不会覆盖云端原订单。主厨手机在「主厨入口」读取云端所有订单，按“待接单 → 已接单 → 制作中 → 已完成”顺序操作；普通用户只能读取自己的云端订单。历史订单仅合并已经通过云函数确认归属当前 OpenID 的本机记录。点「复制完整订单」仍可打开微信聊天粘贴发送；原生分享卡片不承载完整订单正文，小程序不会自动发送私人微信消息。

## 云开发后台配置

1. 用项目 AppID `wx4421125aa02fbd35` 登录微信开发者工具，确认已开通云环境 `cloud1-d0gw9cl9xfef5b612`；`app.js` 已填写该环境 ID。环境 ID 不是 AppID。
2. 在该环境的云数据库中新建 `orders` 集合。将集合权限设为**仅管理端可读写**；小程序仅通过云函数操作订单，避免客户端绕过主厨身份检查。如控制台提示缺少索引，为主厨列表创建 `createdAt` 降序索引，为普通用户列表创建 `openid` 升序 + `createdAt` 降序组合索引；订单详情查询使用 `id`，普通用户详情还使用 `openid`。
3. 在开发者工具中确认 `cloudfunctions/` 被识别为云函数根目录。先将 `cloudfunctions/orders/` 上传并部署（选择**云端安装依赖**）。函数依赖 `wx-server-sdk`，不要把 `node_modules` 打进小程序主包。
4. 主厨 OpenID 已配置在 `cloudfunctions/orders/index.js`。代码变更后，**重新上传并部署** `orders` 云函数，再重新编译、预览小程序。菜单首页长按“主厨入口”可打开开发版与体验版诊断页；正式版不显示 OpenID。
5. 分别用女朋友与主厨的微信账号试单：女朋友下单后确认详情页显示“订单已同步云端”，云数据库 `orders` 中出现文档；主厨进入「主厨入口」刷新订单，查看菜品、数量、备注和时间，再依次执行“接单 → 开始制作 → 标记完成”。普通账号进入主厨入口应被拒绝；断网时本机订单仍保留，恢复网络后可在订单详情点“重试同步云端”。

云函数用微信上下文中的真实 OpenID 写入订单，忽略客户端传入的角色和同名字段；主厨列表与状态更新也在云函数内再次校验。`orders` 文档包含原订单字段以及 `openid`、`createdAt`、`status`。体验成员由微信公众平台管理，所有获准使用体验版的微信账号都可直接点餐，无需在小程序里预登记 OpenID 或额外登录。本机历史按云函数确认的 OpenID 过滤；若云端身份也无法确认，历史页不会展示本机私人订单。此前未绑定 OpenID 的旧本机订单不会自动归属给当前账号，避免同设备切换账号时误显示他人订单。

⚡ 闪电币只是趣味计数，无支付功能。特殊服务与普通菜品可混合结算；特殊服务单独下单时合计为 0。

## 修改菜单和菜谱

- `data/catalog.js`：分类、菜名、价格、供应状态、推荐状态和图片路径。特殊服务 ID 是 `special-love`，价格保持 0。新增普通菜品时，给它稳定的 ID，并在 `data/recipes.js` 添加同 ID 菜谱。
- `data/recipes.js`：每份菜谱的两人份食材与调味料、预处理、步骤、火候、时间、注意事项和装盘建议。格式为 `名称|数字|单位`；页面可按 1 至 4 人份比例换算用量，烹饪时间不会按人数线性变化。
- `assets/images/`：所有图片都在本地。47 道普通菜各有一张按菜品内容绘制的 JPG 图片，位于 `assets/images/dishes/<菜品ID>.jpg`。情侣服务图是 `shinchan-love.jpg`；首页顶部与菜单横幅分别是 `shinchan-kitchen.jpg` 和 `kitchen-strip.jpg`；固定结算栏插画是 `checkout-art.jpg`。这些素材由用户提供的图片本地压缩生成。
- `preview/original-images/` 保存优化前的原图，不进入小程序代码包。更换图片后，可用安装了 Pillow 的 Python 运行 `python tools/optimize_images.py` 重新优化；若要以新图替换备份，请同时更换对应的 `preview/original-images/` 文件。
- `preview/unused-category-images/` 保存目前界面未引用的八张分类插画，不进入代码包；分类列表使用表情符号，视觉布局不变。
- `utils/store.js`：本地收藏、购物车、订单和订单文字格式。数据键使用 `lightning-v1-` 前缀；清除微信小程序缓存会删除本机记录。

页面都在 `pages/` 下：`menu`、`detail`、`recipe`、`cook`、`cart`、`order`、`orders`、`favorites`、`random`、`chef`。

## 验证

在项目根目录运行 `node tests/validate.js`、`node tests/menu_layout.js`、`node tests/page_flows.js`、`node tests/cloud_orders.js`、`node tests/cloud_pages.js`、`node tests/order_privacy.js`、`node tests/chef_flow.js`、`node tests/order_sync.js`、`node tests/cloud_diagnostic.js`、`node tests/package_size.js` 和 `python tests/validate_wxml.py`。它们检查菜单安全区布局、数据与菜谱时间、图片、人数换算、重复下单拦截、云函数身份边界、跨设备订单与状态、云端失败兜底、本机订单归属隔离、诊断入口、页面文件及打包源文件体积。开发时也可对所有 JS 运行 `node --check`。

图片资源优化后，`assets/images/` 约 1.43 MB。`project.config.json` 排除 `preview/`、`tests/`、`tools/`、`cloudfunctions/` 和 README；云函数会单独部署。主厨页采用普通分包，运行 `node tests/package_size.js` 可查看主包和分包的源码体积。`app.json` 已开启 `lazyCodeLoading: requiredComponents`。图片总量仍高于开发者工具建议的 200 KB；47 张本地菜品图无法在保留当前画质的同时压到该建议值。上述体积不是微信开发者工具生成的最终代码包大小，上传前请以开发者工具的检查为准。

当前环境没有微信开发者工具，未完成微信编译、模拟器或 iPhone 真机验证；上传前请按上面的步骤在开发者工具中实测，并确认最终主包低于平台限制。菜谱中的食品安全提示参考[新西兰食品安全家庭烹饪指导](https://www.mpi.govt.nz/food-safety-home/preparing-and-storing-food-safely-at-home/safe-food-preparation-cooking-and-storage-at-home)和[USDA 食品安全温度表](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart)，实际烹饪以食材包装和当地指导为准。

首页顶部和菜单横幅采用用户提供的情侣厨房插画，并按参考截图调整菜单首页布局；特殊服务卡保留蜡笔小新与小白的卡通形象。单道菜图片保持原有明亮手绘质感，菜品各不相同，图片路径集中在 `data/catalog.js`。
