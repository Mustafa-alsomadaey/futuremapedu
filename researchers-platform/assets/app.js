/* منصة مساعدة الباحثين — النواة: التوجيه، السجل، والمساعدات المشتركة */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 3 });
const store = {
  get(k, d) { try { const v = localStorage.getItem('rp:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('rp:' + k, JSON.stringify(v)); } catch { /* التخزين غير متاح */ } }
};
const CATS = {
  promotion: 'الترقية العلمية',
  journals: 'المجلات والنشر',
  papers: 'فحص البحوث والمراجع',
  researcher: 'الباحث ومؤشراته',
  grad: 'الدراسات العليا والإحصاء',
  writing: 'أدوات الكتابة',
  conf: 'المؤتمرات والروابط'
};
const ICONS = {
  promotion: '<path d="M4 20h16M7 16V9m5 7V4m5 12v-5"/>',
  journals: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
  papers: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5M8.5 11l2 2 3.5-4"/>',
  researcher: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  grad: '<path d="m2 9 10-5 10 5-10 5zM6 11.5V16c3.5 3 8.5 3 12 0v-4.5M22 9v6"/>',
  writing: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  conf: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4m8-4v4"/>'
};
const icon = c => `<span class="ic ic-${c}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[c]}</svg></span>`;
const TOOLS = [];
function tool(def) { TOOLS.push(def); }

async function getJSON(url, opt = {}) {
  let r;
  for (let i = 0; ; i++) {
    try { r = await fetch(url, { headers: { Accept: 'application/json' }, ...opt }); if (r.status < 500 || i >= 2) break; }
    catch { if (i >= 2) throw new Error('تعذّر الاتصال بمصدر البيانات. تحقق من اتصالك بالإنترنت ثم أعد المحاولة.'); }
    await new Promise(ok => setTimeout(ok, 1200 * (i + 1)));
  }
  if (r.status === 404) { const e = new Error('لم يُعثر على نتيجة.'); e.notFound = true; throw e; }
  if (r.status === 429) throw new Error('مصدر البيانات مشغول حالياً (تجاوز حد الطلبات). انتظر دقيقة ثم أعد المحاولة.');
  if (!r.ok) throw new Error('أعاد مصدر البيانات خطأً (' + r.status + ').');
  return r.json();
}
const loading = t => `<p><span class="spinner"></span>${esc(t || 'جارٍ البحث…')}</p>`;
const errBox = e => `<div class="verdict bad">${esc(e.message || e)}</div>`;
const cleanDOI = s => { const m = String(s || '').match(/10\.\d{4,9}\/[^\s"<>]+/i); return m ? m[0].replace(/[.,;)\]]+$/, '') : ''; };
const cleanISSN = s => { const m = String(s || '').toUpperCase().match(/\b(\d{4})-?(\d{3}[\dX])\b/); return m ? m[1] + '-' + m[2] : ''; };
const yearOf = w => w?.issued?.['date-parts']?.[0]?.[0] || w?.published?.['date-parts']?.[0]?.[0] || '';
const stripTags = s => String(s || '').replace(/<[^>]+>/g, '');
function copyBtn(text, label = 'نسخ') {
  const id = 'c' + Math.random().toString(36).slice(2);
  copyBtn.map[id] = text;
  return `<button type="button" class="btn ghost sm" data-copy="${id}">${label}</button>`;
}
copyBtn.map = {};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]');
  if (b) {
    navigator.clipboard?.writeText(copyBtn.map[b.dataset.copy] || '').then(() => {
      const t = b.textContent; b.textContent = 'تم النسخ ✓'; setTimeout(() => b.textContent = t, 1400);
    });
  }
  const f = e.target.closest('[data-fav]');
  if (f) {
    e.preventDefault();
    const favs = new Set(store.get('favs', []));
    favs.has(f.dataset.fav) ? favs.delete(f.dataset.fav) : favs.add(f.dataset.fav);
    store.set('favs', [...favs]);
    f.classList.toggle('on'); f.textContent = f.classList.contains('on') ? '★' : '☆';
  }
  if (e.target.closest('[data-print]')) window.print();
});
function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: type + ';charset=utf-8' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const App = {
  card(t) {
    const on = store.get('favs', []).includes(t.id);
    return `<a class="card" href="#/tool/${t.id}">
      <button class="fav ${on ? 'on' : ''}" data-fav="${t.id}" aria-label="إضافة إلى المفضلة">${on ? '★' : '☆'}</button>
      ${icon(t.cat)}<h3>${esc(t.title)}</h3><p>${esc(t.desc)}</p>
      <span class="tag ${t.net ? 'net' : ''}">${t.net ? 'بيانات حيّة' : 'يعمل دون إنترنت'}</span></a>`;
  },
  home(el) {
    const feat = ['promo-2025', 'journal-check', 'paper-report', 'ref-check', 'cite'].map(id => TOOLS.find(t => t.id === id)).filter(Boolean);
    el.innerHTML = `
    <section class="hero">
      <span class="eyebrow">منصة أكاديمية مجانية · ${TOOLS.length} خدمة</span>
      <h1>رفيق الباحث من <em>فكرة البحث</em> إلى <em>الترقية العلمية</em></h1>
      <p class="lead">احسب نقاط ترقيتك وفق التعليمات النافذة، افحص المجلة والمراجع قبل النشر، ولّد التوثيق، وحلّل بياناتك — كل ذلك في متصفحك وبلا تسجيل.</p>
      <form class="cmd" id="quick" role="search">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" id="q" autocomplete="off" aria-label="بحث" placeholder="اكتب اسم خدمة، أو الصق DOI، أو ISSN، أو اسم مجلة…">
        <button class="btn alt">ابدأ</button>
        <div class="sugg" id="sugg" hidden></div>
      </form>
      <div class="chips"><a class="chip" href="#/tool/promo-2025">احسب نقاط الترقية</a><a class="chip" href="#/tool/journal-check">افحص مجلة</a><a class="chip" href="#/tool/ref-check">افحص مراجعك</a><a class="chip" href="#/tool/journal-match">اقترح مجلة لبحثي</a><a class="chip" href="#/tool/sample">حجم العينة</a></div>
    </section>
    <div class="stats">
      <div class="stat"><b>${TOOLS.length}</b><span>خدمة وأداة</span></div>
      <div class="stat"><b>${Object.keys(CATS).length}</b><span>أقسام متخصصة</span></div>
      <div class="stat"><b>${TOOLS.filter(t => !t.net).length}</b><span>أداة تعمل دون إنترنت</span></div>
      <div class="stat"><b>0</b><span>تسجيل أو رسوم</span></div>
    </div>
    <div class="sec-head"><h2>الأكثر استخداماً</h2></div>
    <div class="bento">${feat.map((t, i) => `<a class="feat f${i}" href="#/tool/${t.id}">${icon(t.cat)}<h3>${esc(t.title)}</h3><p>${esc(t.desc)}</p><span class="go">افتح الخدمة ←</span></a>`).join('')}</div>
    <nav class="catnav" aria-label="الأقسام">${Object.entries(CATS).map(([k, n]) => `<a href="#/tools?c=${k}">${icon(k)}<span>${n}</span><small>${TOOLS.filter(t => t.cat === k).length}</small></a>`).join('')}</nav>
    ${Object.entries(CATS).map(([k, name]) => {
      const list = TOOLS.filter(t => t.cat === k);
      return `<div class="sec-head" id="c-${k}"><h2>${name}</h2><span class="count">${list.length} خدمات</span></div><div class="grid">${list.map(App.card).join('')}</div>`;
    }).join('')}`;
    const q = $('#q'), sg = $('#sugg');
    q.oninput = () => {
      const v = q.value.trim(), hits = v.length < 2 || cleanDOI(v) ? [] : TOOLS.filter(t => (t.title + ' ' + t.desc).includes(v)).slice(0, 6);
      sg.hidden = !hits.length; sg.innerHTML = hits.map(t => `<a href="#/tool/${t.id}">${icon(t.cat)}<span>${esc(t.title)}</span></a>`).join('');
    };
    $('#quick').onsubmit = e => {
      e.preventDefault();
      const v = q.value.trim(); if (!v) return;
      const hit = sg.querySelector('a');
      location.hash = cleanDOI(v) ? '#/tool/paper-report?q=' + encodeURIComponent(v) : (!cleanISSN(v) && hit) ? hit.getAttribute('href') : '#/tool/journal-check?q=' + encodeURIComponent(v);
    };
  },
  tools(el, p, onlyFav) {
    let cat = CATS[p.c] ? p.c : '', q = '';
    const favs = store.get('favs', []);
    const draw = () => {
      const list = TOOLS.filter(t => (!onlyFav || favs.includes(t.id)) && (!cat || t.cat === cat) && (!q || (t.title + t.desc).includes(q)));
      $('#list').innerHTML = list.length ? list.map(App.card).join('') :
        `<p class="hint">${onlyFav ? 'لم تضف أي خدمة إلى المفضلة بعد — اضغط النجمة ☆ على أي بطاقة.' : 'لا توجد خدمة مطابقة.'}</p>`;
    };
    el.innerHTML = `<h1>${onlyFav ? 'خدماتي المفضلة' : 'كل خدمات المنصة'}</h1>
      <div class="field"><input type="search" id="f" placeholder="ابحث في الخدمات…" aria-label="ابحث في الخدمات"></div>
      <div class="filters"><button class="pill ${cat ? '' : 'on'}" data-c="">الكل</button>${Object.entries(CATS).map(([k, n]) => `<button class="pill ${cat === k ? 'on' : ''}" data-c="${k}">${n}</button>`).join('')}</div>
      <div class="grid" id="list"></div>`;
    $('#f').oninput = e => { q = e.target.value.trim(); draw(); };
    $$('.pill', el).forEach(b => b.onclick = () => { cat = b.dataset.c; $$('.pill', el).forEach(x => x.classList.toggle('on', x === b)); draw(); });
    draw();
  },
  about(el) {
    el.innerHTML = `<h1>عن المنصة</h1>
    <div class="panel"><h2>ما هي منصة مساعدة الباحثين؟</h2>
      <p>منصة مجانية تجمع الأدوات التي يحتاجها الباحث يومياً: التحقق من المجلات والبحوث والمراجع، إعداد التوثيق، البحث في الأدبيات، والحاسبات الإحصائية وأدوات الكتابة. لا تحتاج إلى حساب، ولا تُرفع نصوصك أو بياناتك إلى أي خادم تابع للمنصة.</p></div>
    <div class="panel"><h2>مصادر البيانات</h2>
      <dl class="kv">
        <dt>Crossref</dt><dd>بيانات البحوث والمجلات وأعداد الاستشهادات المسجّلة لديه.</dd>
        <dt>Retraction Watch</dt><dd>سجل البحوث المسحوبة والتصحيحات (يصل عبر Crossref).</dd>
        <dt>DOAJ</dt><dd>دليل مجلات الوصول الحر المحكّمة ورسوم النشر فيها.</dd>
        <dt>ORCID</dt><dd>الملفات التعريفية العلنية للباحثين.</dd>
        <dt>Open Library</dt><dd>بيانات الكتب بحسب رقم ISBN.</dd>
        <dt>DataCite</dt><dd>الرسائل والأطاريح الجامعية المودعة رقمياً.</dd>
        <dt>قائمة Beall</dt><dd>قائمة تحذيرية غير رسمية بالناشرين المحتمل أنهم مفترسون (beallslist.net).</dd>
        <dt>تعليمات الترقيات</dt><dd>النص الرسمي لتعليمات رقم (10) لسنة 2025 ورقم (167) لسنة 2017 الصادرة عن وزارة التعليم العالي والبحث العلمي العراقية.</dd>
      </dl></div>
    <div class="panel"><h2>حدود يجب معرفتها</h2>
      <p>فهرسة Scopus وClarivate وأرباع المجلات (Q1–Q4) بيانات مملوكة لا تتيحها المصادر المفتوحة، لذلك تعرض المنصة ما يمكن التحقق منه علناً وتضع لك روابط مباشرة إلى المواقع الرسمية للتأكد النهائي. أعداد الاستشهادات مأخوذة من Crossref وقد تقلّ عن أرقام Scopus أو Google Scholar.</p>
      <p>نتائج الحاسبات الإحصائية للاسترشاد، ويبقى القرار المنهجي مسؤولية الباحث ومشرفه.</p></div>`;
  },
  route() {
    const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
    const params = Object.fromEntries(new URLSearchParams(qs || ''));
    const el = $('#view');
    const parts = path.split('/');
    $$('.nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#/' + (parts[0] === 'tool' ? 'tools' : parts[0])));
    if (parts[0] === 'tool') {
      const t = TOOLS.find(x => x.id === parts[1]);
      if (!t) { el.innerHTML = '<h1>الخدمة غير موجودة</h1><a class="btn" href="#/tools">كل الخدمات</a>'; return; }
      const on = store.get('favs', []).includes(t.id);
      el.innerHTML = `<div class="crumb"><a href="#/">الرئيسية</a> ‹ <a href="#/tools">الخدمات</a> ‹ ${esc(CATS[t.cat])}</div>
        <div class="tool-head"><div><h1>${esc(t.title)}</h1><p>${esc(t.long || t.desc)}</p></div>
        <button class="fav ${on ? 'on' : ''}" style="position:static;font-size:1.6rem" data-fav="${t.id}" aria-label="المفضلة">${on ? '★' : '☆'}</button></div>
        <div id="tool"></div>`;
      document.title = t.title + ' — منصة مساعدة الباحثين';
      t.render($('#tool'), params);
    } else {
      document.title = 'منصة مساعدة الباحثين';
      ({ tools: App.tools, favorites: (e, p) => App.tools(e, p, true), about: App.about }[parts[0]] || App.home)(el, params);
    }
    window.scrollTo(0, 0);
  },
  start() {
    const th = store.get('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = th;
    $('#theme').onclick = () => {
      const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = n; store.set('theme', n);
    };
    addEventListener('hashchange', App.route);
    App.route();
  }
};
