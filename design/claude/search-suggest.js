/* ===========================================================
   Live search results (fixed demo dataset) — shared
   Markup contract inside .search:
     <input id="searchInput">
     <div class="search-results" id="searchResults"></div>
   Selected results navigate to tours.html.
   =========================================================== */
(function () {
  var DATA = [
    { nm: '北海道 美瑛・富良野 花田', region: '日本', tags: ['花季', '溫泉', '5 日'], price: '42,900', img: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=200&q=70', kw: '北海道 美瑛 富良野 花 日本 hokkaido' },
    { nm: '京都 嵐山・嵯峨野祕境', region: '日本', tags: ['世界遺產', '美食', '6 日'], price: '48,500', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=200&q=70', kw: '京都 嵐山 嵯峨野 日本 kyoto' },
    { nm: '沖繩 離島跳島漫遊', region: '日本', tags: ['海島', '跳島', '5 日'], price: '39,800', img: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=200&q=70', kw: '沖繩 離島 跳島 日本 okinawa 海' },
    { nm: '首爾 美食與宮殿散策', region: '韓國', tags: ['美食', '購物', '4 日'], price: '25,900', img: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?w=200&q=70', kw: '首爾 韓國 美食 宮殿 seoul' },
    { nm: '釜山 海雲台・甘川文化村', region: '韓國', tags: ['海景', '文化', '5 日'], price: '28,500', img: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=200&q=70', kw: '釜山 韓國 海雲台 甘川 busan' },
    { nm: '冰島 環島・極光獵旅', region: '歐洲', tags: ['極光', '環島', '8 日'], price: '128,000', img: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=200&q=70', kw: '冰島 歐洲 極光 環島 iceland 北歐' },
    { nm: '義大利 托斯卡尼莊園', region: '歐洲', tags: ['莊園', '美食', '9 日'], price: '138,000', img: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=200&q=70', kw: '義大利 托斯卡尼 歐洲 italy tuscany' },
    { nm: '瑞士 少女峰・黃金列車', region: '歐洲', tags: ['雪景', '鐵道', '10 日'], price: '158,000', img: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=200&q=70', kw: '瑞士 少女峰 黃金列車 歐洲 switzerland 阿爾卑斯' },
    { nm: '峇里島 烏布森林療癒', region: '東南亞', tags: ['療癒', 'SPA', '5 日'], price: '32,900', img: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=200&q=70', kw: '峇里島 烏布 東南亞 bali 印尼' },
    { nm: '清邁 古城與山林咖啡', region: '東南亞', tags: ['咖啡', '古城', '5 日'], price: '26,800', img: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=200&q=70', kw: '清邁 泰國 東南亞 chiang mai 咖啡' },
    { nm: '張家界 天門山奇景', region: '中國', tags: ['奇景', '健行', '6 日'], price: '34,900', img: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=200&q=70', kw: '張家界 天門山 中國 china' },
    { nm: '花蓮 太魯閣・海岸縱谷', region: '國旅', tags: ['山海', '輕旅行', '3 日'], price: '12,800', img: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=200&q=70', kw: '花蓮 太魯閣 國旅 台灣 taiwan' }
  ];

  var input = document.getElementById('searchInput');
  var panel = document.getElementById('searchResults');
  if (!input || !panel) return;

  var matches = [];
  var active = -1;

  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  function highlight(name, q) {
    if (!q) return esc(name);
    var i = name.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(name);
    return esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + q.length)) + '</mark>' + esc(name.slice(i + q.length));
  }

  function render(q) {
    if (!matches.length) {
      panel.innerHTML = '<div class="sr-empty">找不到符合「<span class="k">' + esc(q) + '</span>」的行程<br>試試「日本」「極光」「海島」等關鍵字</div>';
      return;
    }
    var html = '<div class="sr-head"><span>搜尋結果</span><span><b>' + matches.length + '</b> 筆</span></div>';
    matches.forEach(function (m, i) {
      var tagsHtml = (m.tags || []).map(function (t) { return '<span class="sr-chip">' + esc(t) + '</span>'; }).join('');
      html += '<div class="sr-item' + (i === active ? ' active' : '') + '" data-i="' + i + '">' +
        '<div class="sr-thumb"><img src="' + m.img + '" alt=""></div>' +
        '<div class="sr-txt"><div class="sr-nm">' + highlight(m.nm, q) + '</div>' +
        '<div class="sr-tags">' + tagsHtml + '</div></div>' +
        '<span class="sr-price"><span class="cur">$</span><span class="num">' + esc(m.price || '') + '</span><span class="unit">起</span></span>' +
      '</div>';
    });
    panel.innerHTML = html;
    Array.prototype.forEach.call(panel.querySelectorAll('.sr-item'), function (el) {
      el.addEventListener('mousedown', function (e) { e.preventDefault(); location.href = 'tours.html'; });
    });
  }

  function update() {
    var q = input.value.trim();
    active = -1;
    if (!q) { close(); return; }
    var ql = q.toLowerCase();
    matches = DATA.filter(function (d) {
      return d.nm.toLowerCase().indexOf(ql) >= 0 || d.kw.toLowerCase().indexOf(ql) >= 0 || d.region.indexOf(q) >= 0;
    }).slice(0, 8);
    render(q);
    panel.classList.add('open');
  }

  function close() { panel.classList.remove('open'); }

  input.addEventListener('input', update);
  input.addEventListener('focus', function () { if (input.value.trim()) update(); });

  input.addEventListener('keydown', function (e) {
    if (!panel.classList.contains('open') || !matches.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % matches.length; render(input.value.trim()); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + matches.length) % matches.length; render(input.value.trim()); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); location.href = 'tours.html'; }
    else if (e.key === 'Escape') { close(); }
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.search')) close();
  });
})();
