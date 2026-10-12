// Browser approximation of menu WXSS for visual checks; not a WeChat simulator.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const { categories, items } = require('../data/catalog');

const root = path.resolve(__dirname, '..');
const preview = path.join(root, 'preview');
const escape = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const imageUrl = relative => pathToFileURL(path.join(root, relative.replace(/^\//, ''))).href;

async function render(width, height, categoryId) {
  const scale = width / 750;
  const css = ['app.wxss', 'pages/menu/menu.wxss']
    .map(file => fs.readFileSync(path.join(root, file), 'utf8'))
    .join('\n')
    .replace(/(\d+(?:\.\d+)?)rpx/g, (_, value) => `${Number(value) * scale}px`)
    .replace(/env\(safe-area-inset-bottom\)/g, width >= 375 ? '34px' : '0px')
    .replace(/^page\{/m, 'body{');
  const dishes = items.filter(item => item.categoryId === categoryId).map(item => `
    <div class="dish-card">
      <img class="dish-img" src="${imageUrl(item.image)}">
      <div class="dish-info">
        <div class="dish-name">${escape(item.name)}</div>
        <div class="dish-desc">${escape(item.description)}</div>
        <div class="dish-meta">${item.minutes} 分钟 · ${item.difficulty} 星难度</div>
        <div class="dish-bottom">
          <div class="dish-price"><span class="price-bolt">⚡</span><span class="price-number">${item.price}</span></div>
          <div class="small-add"><span class="add-heart">♥</span><span>点它</span></div>
        </div>
      </div>
    </div>`).join('');
  const cats = categories.map(item => `<div class="cat ${item.id === categoryId ? 'active' : ''}"><span class="cat-emoji">${item.emoji}</span><span>${escape(item.short)}</span></div>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}.top-banner,.kitchen-strip{object-fit:cover}.special-feature img{width:${174 * scale}px;height:${180 * scale}px;object-fit:cover;flex:none}@media(max-height:850px){.special-feature img{height:${140 * scale}px}}@media(max-height:600px){.special-feature img{height:${120 * scale}px}}</style></head><body style="margin:0">
    <div class="page menu-page">
      <img class="top-banner" src="${imageUrl('/assets/images/shinchan-kitchen.jpg')}">
      <div class="shop-info"><div class="shop-main"><span class="shop-name">小霞饱饱食堂</span><span class="chef-entry">主厨入口 ›</span></div><div class="notice">🔊 fxx专属食堂 闪电目标喂饱宝宝</div><div class="top-links"><div class="current">菜单 (48)</div><div>今天吃什么</div><div>♡ 收藏</div><div>订单</div></div></div>
      <img class="kitchen-strip" src="${imageUrl('/assets/images/kitchen-strip.jpg')}">
      <div class="special-feature"><img src="${imageUrl('/assets/images/shinchan-love.jpg')}"><div class="special-copy"><div class="special-kicker">💗 女朋友专属 · 无限供应</div><div class="special-title">可亲可抱可爱爱</div><div class="special-desc">主厨限定，甜蜜不限量</div></div></div>
      <div class="menu-layout"><div class="cat-list">${cats}</div><div class="dish-list">
      <div class="group-title">${escape(categories.find(item => item.id === categoryId).name)} <span class="group-heart">♡</span></div>${dishes}
    </div></div><div class="sticky-actions"><div class="cart-bar">
      <img class="checkout-art" src="${imageUrl('/assets/images/checkout-art.jpg')}">
      <div class="cart-badge">3</div><div class="cart-info"><div class="cart-main"><span class="cart-number">3</span><span>件商品</span><span class="cart-total">⚡ 77</span></div><div class="cart-caption">有你在，一起吃什么都好吃～♥</div></div>
      <div class="cart-checkout">去结算 ›</div>
    </div></div></div></body></html>`;
  const htmlPath = path.join(preview, `menu-qa-${categoryId}-${width}.html`);
  fs.writeFileSync(htmlPath, html);
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(htmlPath).href);
    await page.screenshot({ path: path.join(preview, `menu-page-${categoryId}-${width}.png`) });
    if (await page.locator('.menu-layout').evaluate(node => node.getBoundingClientRect().height > 0)) {
      await page.locator('.menu-layout').screenshot({ path: path.join(preview, `menu-card-${categoryId}-${width}.png`) });
    }
    const boxes = await page.evaluate(() => Object.fromEntries(['.menu-layout', '.cat-list', '.dish-list', '.dish-card', '.dish-img', '.dish-info', '.small-add', '.sticky-actions', '.cart-bar', '.cart-checkout'].map(selector => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return [selector, { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }];
    })));
    const cards = await page.locator('.dish-card').evaluateAll(nodes => nodes.map(node => {
      const rect = selector => node.querySelector(selector).getBoundingClientRect();
      const info = rect('.dish-info');
      const price = rect('.dish-price');
      const button = rect('.small-add');
      const card = node.getBoundingClientRect();
      return {
        ratio: button.width / info.width,
        withinCard: button.right <= card.right + 1,
        withinInfo: button.left >= info.left - 1 && button.right <= info.right + 1,
        separated: price.right + 4 <= button.left
      };
    }));
    for (const card of cards) {
      assert.ok(card.ratio >= 0.45 && card.ratio <= 0.55, `button ratio ${card.ratio}`);
      assert.ok(card.withinCard && card.withinInfo && card.separated, `card overflow at ${width}px`);
    }
    const scroll = await page.evaluate(() => {
      window.scrollTo(0, document.scrollingElement.scrollHeight);
      const menu = document.querySelector('.menu-layout').getBoundingClientRect();
      const cats = document.querySelector('.cat-list');
      const dishes = document.querySelector('.dish-list');
      const footer = document.querySelector('.sticky-actions').getBoundingClientRect();
      const last = dishes.querySelector('.dish-card:last-child').getBoundingClientRect();
      return {
        gap: Math.round(footer.top - menu.bottom),
        catHeight: cats.getBoundingClientRect().height,
        dishHeight: dishes.getBoundingClientRect().height,
        menuHeight: menu.height,
        pageScrollable: document.scrollingElement.scrollHeight > window.innerHeight,
        columnsScrollInternally: cats.scrollHeight > cats.clientHeight + 1 || dishes.scrollHeight > dishes.clientHeight + 1,
        lastVisible: last.bottom <= footer.top + 1
      };
    });
    await page.screenshot({ path: path.join(preview, `menu-page-bottom-${categoryId}-${width}.png`) });
    assert.ok(Math.abs(scroll.gap) <= 1, `menu/footer gap ${scroll.gap}px`);
    assert.ok(scroll.menuHeight > 0 && Math.abs(scroll.catHeight - scroll.dishHeight) <= 1);
    assert.ok(scroll.pageScrollable && !scroll.columnsScrollInternally && scroll.lastVisible);
    console.log(categoryId, width, height, JSON.stringify({ boxes, scroll }));
  } finally {
    await browser.close();
  }
}

(async () => { for (const categoryId of ['lamb', 'chicken']) for (const [width, height] of [[320, 580], [375, 700], [430, 820]]) await render(width, height, categoryId); })()
  .catch(error => { console.error(error); process.exitCode = 1; });
