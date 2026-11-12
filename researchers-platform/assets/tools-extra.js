/* خدمات إضافية: اقتراح مجلة، دور النشر، تقرير جودة البحث، فحص العنوان، استمارة الرصانة،
   فحص الباحثين المشاركين، العبارات المشوّهة، فحص المؤتمر، المجلات العراقية، الروابط الرسمية */

/* ---------- قائمة Beall للناشرين المحتمل افتراسهم ---------- */
let _beall;
const beallList = () => _beall || (_beall = fetch('data/beall.json').then(r => r.json()).catch(() => []));
const normPub = s => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/\b(the|inc|ltd|llc|pvt|limited)\b/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
async function beallMatch(name, url) {
  const list = await beallList(), n = normPub(name), host = String(url || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  return list.find(([bn, bd]) => (host && (host === bd || host.endsWith('.' + bd))) || (n.length > 5 && normPub(bn) === n)) || null;
}
const beallNote = m => m ? `<div class="verdict bad">تحذير: «${esc(m[0])}» مدرج في قائمة Beall للناشرين المحتمل أنهم مفترسون. القائمة مرجع تحذيري غير رسمي، فتحقق من المجلة نفسها قبل الحكم.</div>` : '';

/* ---------- اقترح مجلة لبحثك ---------- */
tool({
  id: 'journal-match', cat: 'journals', net: true, title: 'اقترح مجلة لبحثك',
  desc: 'الصق عنوان بحثك وملخصه لتظهر المجلات التي نشرت بحوثاً مشابهة له، مع رسومها وحالتها وأقرب البحوث إليه.',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="ti">عنوان البحث (بالإنجليزية)</label><input type="text" id="ti" class="ltr" required></div>
      <div class="field"><label for="ab">الملخص <span class="hint">(اختياري، يحسّن الدقة)</span></label><textarea id="ab" class="ltr" rows="6"></textarea></div><button class="btn">اقترح المجلات</button></form><div id="out"></div>`;
    $('#f', el).onsubmit = async e => {
      e.preventDefault();
      const out = $('#out', el), q = ($('#ti', el).value + ' ' + $('#ab', el).value).replace(/\s+/g, ' ').trim().slice(0, 600);
      out.innerHTML = loading('جارٍ البحث عن بحوث مشابهة…');
      try {
        const items = (await getJSON(`${CR}/works?query.bibliographic=${encodeURIComponent(q)}&rows=100&filter=type:journal-article,from-pub-date:${new Date().getFullYear() - 6}&select=DOI,title,container-title,ISSN,issued,is-referenced-by-count,author,updated-by,publisher`)).message.items;
        const J = {};
        items.forEach((w, rank) => { const n = w['container-title']?.[0]; if (!n) return; const j = J[n] = J[n] || { n, issn: w.ISSN || [], pub: w.publisher, c: 0, score: 0, ex: w }; j.c++; j.score += 1 / (1 + rank / 20); });
        const list = Object.values(J).sort((a, b) => b.score - a.score).slice(0, 20);
        if (!list.length) { out.innerHTML = '<div class="verdict warn">لم نجد بحوثاً مشابهة. جرّب عنواناً أوضح بالإنجليزية.</div>'; return; }
        const doaj = {}, is = [...new Set(list.flatMap(j => j.issn))];
        let doajOk = true;
        for (let i = 0; i < is.length; i += 20) {
          try { (await getJSON(DOAJ + encodeURIComponent('issn:(' + is.slice(i, i + 20).map(x => `"${x}"`).join(' OR ') + ')') + '?pageSize=100')).results.forEach(r => [r.bibjson.pissn, r.bibjson.eissn].forEach(x => x && (doaj[x] = r.bibjson))); }
          catch { doajOk = false; }
        }
        const flags = await Promise.all(list.map(j => beallMatch(j.pub)));
        out.innerHTML = `<div class="panel"><h2>مجلات نشرت بحوثاً مشابهة</h2><p class="hint">مرتّبة بحسب عدد البحوث القريبة من بحثك وقوة تشابهها، من بين أقرب 100 بحث منشور خلال ست سنوات.</p>
          <div class="tbl-wrap"><table><thead><tr><th>المجلة</th><th>الناشر</th><th class="num">بحوث مشابهة</th><th>الوصول الحر والرسوم</th><th></th></tr></thead><tbody>${list.map((j, i) => {
            const d = j.issn.map(x => doaj[x]).find(Boolean);
            return `<tr><td class="ltr">${esc(j.n)}${flags[i] ? ' <span class="badge bad">ناشر في قائمة Beall</span>' : ''}</td><td class="ltr">${esc(j.pub || '')}</td><td class="num">${j.c}</td>
              <td class="ltr">${d ? (d.apc?.has_apc ? esc((d.apc.max || []).map(a => fmt(a.price) + ' ' + a.currency).join(' / ')) : '<span class="badge ok">وصول حر بلا رسوم</span>') : `<span class="hint">${doajOk ? 'غير مدرجة في DOAJ' : 'تعذّر التحقق من DOAJ'}</span>`}</td>
              <td>${j.issn[0] ? `<a class="btn ghost sm" href="#/tool/journal-check?q=${esc(j.issn[0])}">تقرير</a>` : ''}</td></tr>`;
          }).join('')}</tbody></table></div></div>
          <div class="panel"><h2>أقرب البحوث إلى بحثك</h2>${items.slice(0, 8).map(workLine).join('')}</div>`;
      } catch (er) { out.innerHTML = errBox(er); }
    };
  }
});

/* ---------- دور النشر ---------- */
tool({
  id: 'publishers', cat: 'journals', net: true, title: 'دور النشر',
  desc: 'ابحث عن ناشر لتعرف حجم نشره وموقعه وبادئات DOI التابعة له، وهل هو مدرج في قائمة الناشرين المشبوهين.',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="q">اسم دار النشر</label><input type="search" id="q" class="ltr" placeholder="Elsevier, Springer, MDPI…" required></div><button class="btn">ابحث</button></form><div id="out"></div>`;
    $('#f', el).onsubmit = async e => {
      e.preventDefault();
      const out = $('#out', el); out.innerHTML = loading();
      try {
        const items = (await getJSON(`${CR}/members?query=${encodeURIComponent($('#q', el).value.trim())}&rows=12`)).message.items;
        if (!items.length) { out.innerHTML = '<div class="verdict warn">لا يوجد ناشر بهذا الاسم مسجّل في Crossref.</div>'; return; }
        const flags = await Promise.all(items.map(m => beallMatch(m['primary-name'])));
        out.innerHTML = items.map((m, i) => {
          const ys = (m.breakdowns?.['dois-by-issued-year'] || []).slice().sort((a, b) => a[0] - b[0]).filter(y => y[0] >= new Date().getFullYear() - 11), mx = Math.max(1, ...ys.map(y => y[1]));
          return `<div class="panel"><h2 class="ltr">${esc(m['primary-name'])}</h2>${beallNote(flags[i])}
            <dl class="kv"><dt>الموقع</dt><dd class="ltr">${esc(m.location || '—')}</dd><dt>إجمالي الأعمال المسجّلة</dt><dd>${fmt(m.counts?.['total-dois'])}</dd><dt>أعمال السنتين الأخيرتين</dt><dd>${fmt(m.counts?.['current-dois'])}</dd>
            <dt>بادئات DOI</dt><dd class="ltr">${esc((m.prefixes || []).slice(0, 12).join(' · '))}${(m.prefixes || []).length > 12 ? ' …' : ''}</dd>
            ${m.names?.length > 1 ? `<dt>أسماء أخرى</dt><dd class="ltr">${esc(m.names.slice(0, 6).join(' · '))}</dd>` : ''}</dl>
            ${ys.length ? `<div class="bars" style="height:70px">${ys.map(y => `<div style="height:${y[1] / mx * 100}%" data-t="${y[0]}: ${fmt(y[1])}"></div>`).join('')}</div><div class="axis"><span>${ys[0][0]}</span><span>${ys[ys.length - 1][0]}</span></div>` : ''}</div>`;
        }).join('') + '<p class="hint">Crossref لا يصنّف نوع الجهة (جامعة، جمعية، شركة)؛ استدلّ عليه من اسم الناشر وموقعه الرسمي.</p>';
      } catch (er) { out.innerHTML = errBox(er); }
    };
  }
});

/* ---------- فحص المراجع بالجملة (سحب) ---------- */
async function retractedAmong(dois) {
  const bad = [];
  for (let i = 0; i < dois.length; i += 20) {
    const chunk = dois.slice(i, i + 20);
    try {
      const r = await getJSON(`${CR}/works?filter=${chunk.map(d => 'doi:' + encodeURIComponent(d)).join(',')}&rows=20&select=DOI,title,updated-by,issued,container-title`);
      r.message.items.forEach(w => { if (updates(w).retracted) bad.push(w); });
    } catch { /* نتجاوز الدفعة المتعثرة */ }
  }
  return bad;
}

/* ---------- تقرير جودة البحث ---------- */
async function paperEvidence(doi) {
  const w = (await getJSON(`${CR}/works/${encodeURIComponent(doi)}`)).message, issn = w.ISSN?.[0];
  const [jr, dj, bm] = await Promise.all([
    issn ? getJSON(`${CR}/journals/${issn}`).then(r => r.message).catch(() => null) : null,
    issn ? getJSON(DOAJ + encodeURIComponent('issn:' + issn)).then(r => r.results?.[0]?.bibjson || null).catch(() => null) : null,
    beallMatch(w.publisher)
  ]);
  return { w, u: updates(w), issn, jr, dj, bm };
}
tool({
  id: 'paper-report', cat: 'papers', net: true, star: true, title: 'تقرير جودة البحث',
  desc: 'الصق DOI ليخرج تقرير واحد: حالة السحب، المجلة وناشرها، الباحثون، وهل بين مراجع البحث مراجع مسحوبة.',
  render(el, p) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="q">DOI البحث أو رابطه</label><input type="search" id="q" class="ltr" value="${esc(p.q || '')}" placeholder="10.xxxx/xxxxx" required></div><button class="btn">أنشئ التقرير</button></form><div id="out"></div>`;
    const out = $('#out', el);
    const run = async q => {
      const doi = cleanDOI(q);
      if (!doi) { out.innerHTML = '<div class="verdict warn">لم نتعرف على DOI صالح.</div>'; return; }
      out.innerHTML = loading('جارٍ جمع الأدلة عن البحث ومجلته ومراجعه…');
      try {
        const { w, u, issn, jr, dj, bm } = await paperEvidence(doi);
        const refs = w.reference || [], rd = refs.map(r => r.DOI).filter(Boolean), bad = await retractedAmong(rd.slice(0, 200));
        const flags = [u.retracted && 'البحث مسحوب', u.concern && 'صدر بحقه إبداء قلق', bm && 'الناشر في قائمة Beall', bad.length && `${bad.length} من مراجعه مسحوب`].filter(Boolean);
        out.innerHTML = `<div class="verdict ${u.retracted || bm ? 'bad' : flags.length ? 'warn' : 'ok'}">${flags.length ? 'ملاحظات تستدعي الانتباه: ' + flags.join(' · ') : 'لم تظهر مؤشرات سلبية في السجلات المفتوحة التي فُحصت.'}</div>
        <div class="panel"><h2 class="ltr">${esc(stripTags(w.title?.[0] || ''))}</h2><div class="btns" style="margin-bottom:10px">${statusBadge(u)}<span class="badge mute">${fmt(w['is-referenced-by-count'])} استشهاد</span><span class="badge mute">${yearOf(w)}</span></div>
          <h3>المجلة</h3><dl class="kv"><dt>الاسم</dt><dd class="ltr">${esc(w['container-title']?.[0] || '—')}</dd><dt>الناشر</dt><dd class="ltr">${esc(w.publisher || '—')}</dd><dt>ISSN</dt><dd class="ltr">${esc((w.ISSN || []).join(' · ') || '—')}</dd>
            <dt>Crossref</dt><dd>${jr ? `مسجّلة — ${fmt(jr.counts?.['total-dois'])} بحثاً` : 'غير موجودة كمجلة'}</dd><dt>DOAJ</dt><dd>${dj ? 'مدرجة' + (dj.apc?.has_apc ? '' : ' — بلا رسوم نشر') : 'غير مدرجة'}</dd>
            <dt>قائمة Beall</dt><dd>${bm ? '<span class="badge bad">الناشر مدرج</span>' : 'الناشر غير مدرج'}</dd></dl>
          <h3 style="margin-top:14px">الباحثون (${(w.author || []).length})</h3><p class="ltr">${(w.author || []).map(a => esc([a.given, a.family].filter(Boolean).join(' ') || a.name) + (a.ORCID ? ` <a href="#/tool/researcher?q=${esc(a.ORCID.split('/').pop())}" class="badge ok">ORCID</a>` : '')).join('، ') || '—'}</p>
          <h3>المراجع</h3><div class="big"><div><b>${fmt(w['references-count'] || refs.length)}</b><span>مرجعاً</span></div><div><b>${rd.length}</b><span>لها DOI وفُحصت</span></div><div><b>${bad.length}</b><span>مرجع مسحوب</span></div></div>
          ${bad.map(b => `<p class="note ltr">${esc(stripTags(b.title?.[0] || b.DOI))} — <a href="https://doi.org/${esc(b.DOI)}" target="_blank" rel="noopener">${esc(b.DOI)}</a></p>`).join('')}
          ${!refs.length ? '<p class="hint">الناشر لم يودع قائمة مراجع هذا البحث في Crossref، فتعذّر فحصها.</p>' : ''}
          <div class="btns noprint" style="margin-top:14px"><button class="btn ghost" data-print>طباعة التقرير</button>${issn ? `<a class="btn ghost" href="#/tool/journal-check?q=${esc(issn)}">تقرير المجلة</a>` : ''}<a class="btn ghost" href="#/tool/integrity-form?q=${encodeURIComponent(doi)}">استمارة الرصانة</a></div></div>
          <p class="hint">التقرير يعتمد على Crossref و Retraction Watch و DOAJ وقائمة Beall. فهرسة Scopus و Web of Science وربع المجلة تُراجَع من مواقعها الرسمية.</p>`;
      } catch (er) { out.innerHTML = er.notFound ? '<div class="verdict warn">هذا الـDOI غير مسجّل في Crossref.</div>' : errBox(er); }
    };
    $('#f', el).onsubmit = e => { e.preventDefault(); run($('#q', el).value); };
    if (p.q) run(p.q);
  }
});

/* ---------- فحص عنوان البحث قبل الكتابة ---------- */
const TSTOP = new Set('the of and in on for a an to with by from using based study analysis effect effects use via its their at as is are'.split(' '));
const tTok = s => [...new Set(normT(stripTags(s)).filter(x => !TSTOP.has(x)))];
tool({
  id: 'title-check', cat: 'papers', net: true, title: 'فحص عنوان البحث قبل الكتابة',
  desc: 'اكتب العنوان الذي تنوي البحث فيه لنبحث عنه في البحوث والرسائل والأطاريح والكتب المنشورة ونرتّبها بحسب قربها منه.',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="q">العنوان المقترح <span class="hint">(بالإنجليزية للحصول على أفضل تغطية)</span></label><input type="text" id="q" dir="auto" required></div><button class="btn">افحص العنوان</button></form><div id="out"></div>`;
    $('#f', el).onsubmit = async e => {
      e.preventDefault();
      const q = $('#q', el).value.trim(), out = $('#out', el), mine = tTok(q);
      if (mine.length < 2) { out.innerHTML = '<div class="verdict warn">اكتب عنواناً من كلمتين دالّتين على الأقل.</div>'; return; }
      out.innerHTML = loading('جارٍ البحث في البحوث والرسائل الجامعية…');
      const [cr, dc] = await Promise.allSettled([
        getJSON(`${CR}/works?query.title=${encodeURIComponent(q)}&rows=40&select=DOI,title,author,issued,container-title,type,publisher`),
        getJSON(`https://api.datacite.org/dois?query=${encodeURIComponent('titles.title:(' + mine.join(' ') + ')')}&resource-type-id=dissertation&page[size]=25`)
      ]);
      const sim = t => { const o = tTok(t), set = new Set(o), inter = mine.filter(x => set.has(x)).length; return o.length ? Math.round(100 * inter / new Set([...mine, ...o]).size) : 0; };
      const TY = { 'journal-article': 'مقالة', 'proceedings-article': 'بحث مؤتمر', dissertation: 'رسالة / أطروحة', book: 'كتاب', 'book-chapter': 'فصل كتاب', 'posted-content': 'مسودة' };
      let rows = [];
      if (cr.status === 'fulfilled') rows = cr.value.message.items.filter(w => w.title?.[0]).map(w => ({ t: stripTags(w.title[0]), s: sim(w.title[0]), who: authorsShort(w), y: yearOf(w), where: w['container-title']?.[0] || w.publisher || '', type: TY[w.type] || w.type, url: 'https://doi.org/' + w.DOI }));
      if (dc.status === 'fulfilled') rows = rows.concat((dc.value.data || []).map(x => x.attributes).filter(a => a.titles?.[0]?.title).map(a => ({ t: a.titles[0].title, s: sim(a.titles[0].title), who: (a.creators || []).slice(0, 2).map(c => c.name).join('; '), y: a.publicationYear, where: a.publisher || '', type: 'رسالة / أطروحة', url: 'https://doi.org/' + a.doi })));
      if (!rows.length) { out.innerHTML = cr.status === 'rejected' ? errBox(cr.reason) : '<div class="verdict ok">لم نجد أعمالاً منشورة بعنوان قريب في المصادر المفحوصة.</div>'; return; }
      rows.sort((a, b) => b.s - a.s);
      const top = rows[0].s;
      out.innerHTML = `<div class="verdict ${top >= 80 ? 'bad' : top >= 50 ? 'warn' : 'ok'}">${top >= 80 ? 'يوجد عمل منشور بعنوان شبه مطابق — راجع ما يميّز بحثك.' : top >= 50 ? 'توجد أعمال قريبة من عنوانك. اطّلع عليها لتحدد الفجوة البحثية.' : 'لا يوجد عنوان قريب جداً من عنوانك في المصادر المفحوصة.'}</div>
        <div class="panel"><div class="tbl-wrap"><table><thead><tr><th class="num">القرب</th><th>العنوان</th><th>النوع</th><th>السنة</th></tr></thead><tbody>${rows.slice(0, 40).map(r => `<tr><td class="num"><span class="badge ${r.s >= 80 ? 'bad' : r.s >= 50 ? 'warn' : 'mute'}">${r.s}%</span></td>
          <td class="ltr"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.t)}</a><div class="hint">${esc(r.who)}${r.where ? ' · ' + esc(r.where) : ''}</div></td><td>${esc(r.type || '')}</td><td>${r.y || ''}</td></tr>`).join('')}</tbody></table></div>
        <p class="hint">«القرب» نسبة الكلمات الدالّة المشتركة بين العنوانين. التغطية: Crossref للبحوث والكتب و DataCite للرسائل الجامعية؛ الرسائل غير المودعة رقمياً (ومنها كثير من الرسائل العربية) لا تظهر هنا.</p></div>`;
    };
  }
});

/* ---------- استمارة الرصانة العلمية ---------- */
tool({
  id: 'integrity-form', cat: 'papers', net: true, title: 'استمارة الرصانة العلمية',
  desc: 'الصق DOI فتمتلئ الاستمارة ببيانات البحث وأدلة مجلته والقرار المقترح مع سببه؛ تعدّلها اللجنة وتضيف أسماءها ثم تطبعها للتوقيع.',
  render(el, p) {
    el.innerHTML = `<form class="panel noprint" id="f"><div class="field"><label for="q">DOI البحث</label><input type="search" id="q" class="ltr" value="${esc(p.q || '')}" required></div><button class="btn">املأ الاستمارة</button></form><div id="out"></div>`;
    const out = $('#out', el);
    const run = async q => {
      const doi = cleanDOI(q);
      if (!doi) { out.innerHTML = '<div class="verdict warn">لم نتعرف على DOI صالح.</div>'; return; }
      out.innerHTML = loading();
      try {
        const { w, u, jr, dj, bm } = await paperEvidence(doi);
        const bad = u.retracted || bm, why = u.retracted ? 'البحث مسحوب بحسب سجل Retraction Watch.' : bm ? 'ناشر المجلة مدرج في قائمة Beall للناشرين المحتمل افتراسهم.' : u.concern ? 'صدر بحق البحث إشعار إبداء قلق.' : !jr ? 'المجلة غير مسجّلة في Crossref، ويلزم التحقق من فهرستها يدوياً.' : 'لم تظهر مؤشرات سلبية في السجلات المفتوحة؛ يُستكمل التحقق من الفهرسة في المستوعب المطلوب.';
        const dec = bad ? 2 : (u.concern || !jr) ? 1 : 0;
        out.innerHTML = `<div class="panel form-sheet"><h2 style="text-align:center">استمارة التحقق من الرصانة العلمية</h2>
          <div class="row"><div class="field"><label>الجامعة / الكلية</label><input type="text"></div><div class="field"><label>القسم</label><input type="text"></div><div class="field"><label>التاريخ</label><input type="date" value="${new Date().toISOString().slice(0, 10)}"></div></div>
          <h3>أولاً: بيانات البحث</h3><dl class="kv"><dt>العنوان</dt><dd class="ltr">${esc(stripTags(w.title?.[0] || ''))}</dd><dt>الباحثون</dt><dd class="ltr">${esc((w.author || []).map(a => [a.given, a.family].filter(Boolean).join(' ') || a.name).join(', '))}</dd>
            <dt>DOI</dt><dd class="ltr">${esc(w.DOI)}</dd><dt>سنة النشر</dt><dd>${yearOf(w)}</dd><dt>المجلد / العدد / الصفحات</dt><dd class="ltr">${esc([w.volume, w.issue, w.page].filter(Boolean).join(' / ') || '—')}</dd></dl>
          <h3>ثانياً: المجلة</h3><dl class="kv"><dt>الاسم</dt><dd class="ltr">${esc(w['container-title']?.[0] || '—')}</dd><dt>الناشر</dt><dd class="ltr">${esc(w.publisher || '—')}</dd><dt>ISSN</dt><dd class="ltr">${esc((w.ISSN || []).join(' · ') || '—')}</dd></dl>
          <h3>ثالثاً: ما تشير إليه السجلات</h3><div class="tbl-wrap"><table><tbody>
            <tr><th>سجل السحب (Retraction Watch)</th><td>${statusBadge(u)}</td></tr>
            <tr><th>تسجيل المجلة في Crossref</th><td>${jr ? '<span class="badge ok">مسجّلة</span>' : '<span class="badge warn">غير موجودة</span>'}</td></tr>
            <tr><th>دليل DOAJ</th><td>${dj ? '<span class="badge ok">مدرجة</span>' : '<span class="badge mute">غير مدرجة</span>'}</td></tr>
            <tr><th>قائمة Beall</th><td>${bm ? '<span class="badge bad">الناشر مدرج</span>' : '<span class="badge ok">الناشر غير مدرج</span>'}</td></tr>
            <tr><th>الفهرسة في Scopus</th><td><select><option>— تحددها اللجنة —</option><option>مفهرسة</option><option>غير مفهرسة</option><option>متوقفة (Discontinued)</option></select></td></tr>
            <tr><th>الفهرسة في Web of Science</th><td><select><option>— تحددها اللجنة —</option><option>مفهرسة</option><option>غير مفهرسة</option></select></td></tr>
            <tr><th>الربع (Q) في سنة النشر</th><td><select><option>—</option><option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option><option>بلا تصنيف</option></select></td></tr></tbody></table></div>
          <h3>رابعاً: القرار</h3><div class="row"><div class="field"><label>قرار اللجنة</label><select>${['المجلة رصينة ويُعتمد البحث', 'يُستكمل التحقق قبل القرار', 'لا يُعتمد البحث'].map((t, i) => `<option ${i === dec ? 'selected' : ''}>${t}</option>`).join('')}</select></div></div>
          <div class="field"><label>السبب <span class="hint">(مقترح من السجلات — عدّله)</span></label><textarea style="min-height:70px">${esc(why)}</textarea></div>
          <div class="field"><label>ملاحظات اللجنة</label><textarea style="min-height:70px"></textarea></div>
          <h3>خامساً: أعضاء اللجنة</h3><div class="row">${['رئيس اللجنة', 'عضو', 'عضو'].map(r => `<div class="field"><label>${r}</label><input type="text" placeholder="الاسم واللقب العلمي"><div class="sign">التوقيع</div></div>`).join('')}</div></div>
          <div class="btns noprint"><button class="btn" data-print>طباعة الاستمارة / حفظ PDF</button></div>
          <p class="hint noprint">استمارة عامة تصلح لأي جامعة. القرار المقترح مبني على السجلات المفتوحة فقط، والقرار الملزم للجنة بعد مراجعة المستوعبات الرسمية.</p>`;
      } catch (er) { out.innerHTML = er.notFound ? '<div class="verdict warn">هذا الـDOI غير مسجّل في Crossref.</div>' : errBox(er); }
    };
    $('#f', el).onsubmit = e => { e.preventDefault(); run($('#q', el).value); };
    if (p.q) run(p.q);
  }
});

/* ---------- فحص الباحثين المشاركين ---------- */
tool({
  id: 'coauthor-check', cat: 'papers', net: true, title: 'فحص الباحثين المشاركين',
  desc: 'قبل أن تشارك أحداً في بحث: ابحث باسمه في إشعارات السحب المسجّلة (Retraction Watch عبر Crossref).',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="t">أسماء الباحثين بالإنجليزية <span class="hint">(اسم كامل في كل سطر، حتى 10 أسماء)</span></label><textarea id="t" class="ltr" style="min-height:110px" placeholder="Given Family" required></textarea></div><button class="btn">افحص</button></form><div id="out"></div>`;
    $('#f', el).onsubmit = async e => {
      e.preventDefault();
      const names = $('#t', el).value.split(/\n+/).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 2).slice(0, 10), out = $('#out', el);
      if (!names.length) { out.innerHTML = '<div class="verdict warn">اكتب الاسم الأول واسم العائلة لكل باحث.</div>'; return; }
      out.innerHTML = loading('جارٍ البحث في إشعارات السحب…');
      const res = await Promise.all(names.map(async n => {
        const parts = n.toLowerCase().split(/\s+/), fam = parts[parts.length - 1], g0 = parts[0][0];
        try {
          const items = (await getJSON(`${CR}/works?query.author=${encodeURIComponent(n)}&filter=update-type:retraction&rows=40&select=DOI,title,author,issued,container-title,update-to`)).message.items;
          return { n, hits: items.filter(w => (w.author || []).some(a => (a.family || '').toLowerCase() === fam && (a.given || '').toLowerCase().startsWith(g0))) };
        } catch (er) { return { n, err: er.message }; }
      }));
      out.innerHTML = res.map(r => `<div class="panel"><h2 class="ltr">${esc(r.n)}</h2>${r.err ? errBox(new Error(r.err)) : r.hits.length ? `<div class="verdict warn">${r.hits.length} إشعار سحب يحمل اسماً مطابقاً — تحقق أنه الشخص نفسه.</div>${r.hits.map(w => `<div class="item"><h3 class="ltr">${esc(stripTags(w.title?.[0] || ''))}</h3><div class="meta ltr">${esc(w['container-title']?.[0] || '')} · ${yearOf(w)} · <a href="https://doi.org/${esc(w.DOI)}" target="_blank" rel="noopener">${esc(w.DOI)}</a></div></div>`).join('')}` : '<div class="verdict ok">لا توجد إشعارات سحب بهذا الاسم في Crossref.</div>'}</div>`).join('') +
        '<p class="note">تشابه الأسماء شائع جداً: المطابقة تعتمد على اسم العائلة والحرف الأول فقط، وقد تعود النتيجة لشخص آخر. لا تبنِ حكماً على باحث قبل التأكد من الانتماء المؤسسي ومن سبب السحب. وغياب النتائج لا ينفي وجود سحب غير مسجّل باسم المؤلفين.</p>';
    };
  }
});

/* ---------- كشف العبارات المشوّهة ---------- */
const TORTURED = [['counterfeit consciousness', 'artificial intelligence'], ['man-made brainpower', 'artificial intelligence'], ['human-made consciousness', 'artificial intelligence'], ['profound neural organization', 'deep neural network'], ['profound learning', 'deep learning'], ['neural organization', 'neural network'], ['convolutional neural organization', 'convolutional neural network'], ['repetitive neural organization', 'recurrent neural network'], ['long momentary memory', 'long short-term memory'], ['colossal information', 'big data'], ['enormous information', 'big data'], ['huge information', 'big data'], ['information stockroom', 'data warehouse'], ['haze figuring', 'cloud computing'], ['cloud figuring', 'cloud computing'], ['elite figuring', 'high performance computing'], ['signal to commotion', 'signal to noise'], ['flag to clamor', 'signal to noise'], ['sign to clamor', 'signal to noise'], ['motion to commotion', 'signal to noise'], ['arbitrary woodland', 'random forest'], ['irregular backwoods', 'random forest'], ['irregular woodland', 'random forest'], ['irregular esteem', 'random value'], ['bolster vector machine', 'support vector machine'], ['guileless bayes', 'naive Bayes'], ['innocent bayes', 'naive Bayes'], ['choice tree', 'decision tree'], ['k-closest neighbor', 'k-nearest neighbor'], ['back spread', 'back propagation'], ['straight relapse', 'linear regression'], ['strategic relapse', 'logistic regression'], ['head segment examination', 'principal component analysis'], ['include extraction', 'feature extraction'], ['highlight extraction', 'feature extraction'], ['characteristic language handling', 'natural language processing'], ['discourse acknowledgment', 'speech recognition'], ['picture handling', 'image processing'], ['mean square mistake', 'mean square error'], ['fluffy rationale', 'fuzzy logic'], ['versatile neuro-fluffy', 'adaptive neuro-fuzzy'], ['hereditary calculation', 'genetic algorithm'], ['molecule swarm enhancement', 'particle swarm optimization'], ['subterranean insect state', 'ant colony'], ['underground creepy crawly state', 'ant colony'], ['remote sensor organization', 'wireless sensor network'], ['focal handling unit', 'central processing unit'], ['individual computerized collaborator', 'personal digital assistant'], ['remaining vitality', 'remaining energy'], ['leftover vitality', 'residual energy'], ['vitality productivity', 'energy efficiency'], ['sun oriented vitality', 'solar energy'], ['warm exchange', 'heat transfer'], ['heat move', 'heat transfer'], ['bosom malignancy', 'breast cancer'], ['bosom disease', 'breast cancer'], ['lung malignancy', 'lung cancer'], ['cerebrum tumor', 'brain tumor'], ['kidney disappointment', 'kidney failure'], ['invulnerable framework', 'immune system'], ['glucose bigotry', 'glucose intolerance']];
tool({
  id: 'tortured', cat: 'writing', title: 'كشف العبارات المشوّهة',
  desc: 'مصانع البحوث تعيد صياغة النصوص آلياً فتشوّه المصطلحات، مثل «counterfeit consciousness» بدل «artificial intelligence». الصق نصاً لتكشفها.',
  long: 'تبحث الأداة داخل متصفحك عن عبارات مشوّهة موثّقة في أدبيات كشف البحوث المصنّعة (Cabanac وLabbé وMagazinov، 2021). وجود عبارة واحدة قرينة تستدعي التدقيق وليست دليلاً قاطعاً.',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="t">نص البحث أو ملخصه (بالإنجليزية)</label><textarea id="t" class="ltr" rows="10" required></textarea></div><button class="btn">افحص النص</button></form><div id="out"></div>`;
    $('#f', el).onsubmit = e => {
      e.preventDefault();
      const txt = $('#t', el).value, low = txt.toLowerCase(), found = [];
      TORTURED.forEach(([b, g]) => { let i = -1, c = 0; while ((i = low.indexOf(b, i + 1)) >= 0) c++; if (c) found.push([b, g, c]); });
      found.forEach(f => found.forEach(g => { if (g !== f && g[0].includes(f[0])) f[2] -= g[2]; }));
      for (let i = found.length - 1; i >= 0; i--) if (found[i][2] <= 0) found.splice(i, 1);
      const re = found.length ? new RegExp('(' + found.map(f => f[0].replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|') + ')', 'gi') : null;
      $('#out', el).innerHTML = `<div class="verdict ${found.length > 2 ? 'bad' : found.length ? 'warn' : 'ok'}">${found.length ? `وُجدت ${found.length} عبارة مشوّهة — قرينة على إعادة صياغة آلية تستدعي تدقيق البحث.` : `لم تُكتشف عبارات مشوّهة من القائمة (${TORTURED.length} عبارة).`}</div>
        ${found.length ? `<div class="panel"><div class="tbl-wrap"><table><thead><tr><th>العبارة المشوّهة</th><th>المصطلح الأصلي</th><th class="num">التكرار</th></tr></thead><tbody>${found.map(f => `<tr><td class="ltr">${esc(f[0])}</td><td class="ltr">${esc(f[1])}</td><td class="num">${f[2]}</td></tr>`).join('')}</tbody></table></div>
        <h3>النص مع التظليل</h3><p class="ltr" style="white-space:pre-wrap">${esc(txt).replace(re, '<mark>$1</mark>')}</p></div>` : '<p class="hint">خلوّ النص من هذه العبارات لا يثبت سلامته؛ القائمة تغطي العبارات الأشهر في علوم الحاسوب والهندسة والطب.</p>'}`;
    };
  }
});

/* ---------- فحص مؤتمر قبل المشاركة ---------- */
const CONF_SIGNS = ['نطاق المؤتمر واسع جداً ويجمع تخصصات لا رابط بينها', 'قبول البحث خلال أيام قليلة دون تقارير محكّمين', 'الوعد بالنشر في Scopus دون تسمية الوقائع أو المجلة ورقم ISSN/ISBN', 'اللجنة العلمية بلا أسماء أو بأسماء لا يمكن التحقق من انتمائها', 'موقع المؤتمر بلا جهة أكاديمية منظِّمة واضحة ولا دورات سابقة موثّقة', 'رسائل دعوة متكررة غير مطلوبة ورسوم تُدفع قبل التحكيم', 'اسم يحاكي مؤتمراً معروفاً مع تغيير طفيف'];
tool({
  id: 'conf-check', cat: 'conf', net: true, title: 'فحص مؤتمر قبل المشاركة',
  desc: 'ابحث عن الجهة المنظِّمة في قائمة Beall للناشرين المشبوهين، وراجع قاعدة اعتماد بحوث المؤتمرات في الترقية وعلامات المؤتمرات الوهمية.',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="q">اسم الجهة المنظِّمة أو رابط موقع المؤتمر</label><input type="search" id="q" class="ltr" placeholder="Organizer name or https://…" required></div><button class="btn">افحص</button></form><div id="out"></div>
      <div class="panel"><h2>هل يُحتسب بحث المؤتمر في الترقية؟</h2><p>وفق تعليمات (10) لسنة 2025 (المادة 7/ثالثاً) يُقبل <strong>بحث واحد</strong> ملقى في مؤتمر علمي دوري في إحدى حالتين:</p>
        <ul><li>منشور بأكمله ضمن وقائع المؤتمر ومفهرس في Scopus أو Web of Science حصراً: يُقدَّم ضمن الجدول (2) بخمس نقاط، ولا تُقبل خلاصته، ولا تُعتمد بحوث المؤتمر الأول إلا بعد انعقاد الثاني.</li><li>منشور في مجلة علمية محكّمة رصينة مفهرسة في Scopus أو Web of Science: يمكن تقديمه ضمن الجدول (1).</li></ul>
        <h3>علامات تحذيرية</h3>${CONF_SIGNS.map((t, i) => `<div class="check"><input type="checkbox" id="cs${i}"><label for="cs${i}">${t}</label></div>`).join('')}<p id="cnt" class="hint"></p></div>`;
    el.onchange = () => { const n = $$('input[type=checkbox]:checked', el).length; $('#cnt', el).innerHTML = n ? `<span class="badge ${n >= 3 ? 'bad' : 'warn'}">${n} علامات — ${n >= 3 ? 'يُنصح بتجنّب المؤتمر' : 'تحقق أكثر قبل الدفع'}</span>` : ''; };
    $('#f', el).onsubmit = async e => {
      e.preventDefault();
      const q = $('#q', el).value.trim(), out = $('#out', el), isUrl = /\.|\//.test(q) && !/\s/.test(q);
      out.innerHTML = loading();
      const list = await beallList(), exact = await beallMatch(isUrl ? '' : q, isUrl ? q : ''), nq = normPub(q);
      const near = isUrl || nq.length < 4 ? [] : list.filter(([n]) => normPub(n).includes(nq) || (nq.includes(normPub(n)) && normPub(n).length > 5)).slice(0, 8);
      out.innerHTML = !list.length ? errBox(new Error('تعذّر تحميل القائمة.')) : exact ? beallNote(exact) : near.length ? `<div class="verdict warn">لا تطابق تام، لكن وُجدت أسماء قريبة في قائمة Beall:</div><div class="panel">${near.map(n => `<div class="item ltr">${esc(n[0])} <span class="hint">${esc(n[1])}</span></div>`).join('')}</div>` :
        `<div class="verdict ok">الجهة غير مدرجة في قائمة Beall (${fmt(list.length)} ناشراً). هذا لا يكفي وحده لإثبات رصانة المؤتمر — راجع العلامات أدناه.</div>`;
    };
  }
});

/* ---------- دليل المجلات العراقية ---------- */
tool({
  id: 'iraqi-journals', cat: 'journals', net: true, title: 'دليل المجلات العراقية المحكّمة (DOAJ)',
  desc: 'المجلات العراقية المدرجة في دليل مجلات الوصول الحر المحكّمة، مع الناشر والتخصص ورسوم النشر، وبحث فوري بالاسم.',
  render(el) {
    el.innerHTML = `<div class="panel"><div class="field"><input type="search" id="q" placeholder="ابحث باسم المجلة أو الجامعة أو التخصص…" aria-label="بحث"></div><div id="out">${loading('جارٍ تحميل الدليل…')}</div></div>
      <p class="hint">المصدر: DOAJ (بلد الناشر: العراق). الدليل الوزاري الكامل للمجلات العراقية متاح في <a href="https://iasj.rdd.edu.iq" target="_blank" rel="noopener">IASJ ↗</a>.</p>`;
    let all = [];
    const draw = () => {
      const q = $('#q', el).value.trim().toLowerCase(), list = all.filter(b => !q || [b.title, b.alternative_title, b.publisher?.name, b.institution?.name, ...(b.subject || []).map(s => s.term), ...(b.keywords || [])].join(' ').toLowerCase().includes(q));
      $('#out', el).innerHTML = `<p class="count">${list.length} مجلة</p><div class="tbl-wrap"><table><thead><tr><th>المجلة</th><th>الناشر</th><th>التخصص</th><th>رسوم النشر</th><th></th></tr></thead><tbody>${list.map(b => `<tr><td><span class="ltr">${esc(b.title)}</span>${b.alternative_title ? `<div class="hint">${esc(b.alternative_title)}</div>` : ''}</td><td class="ltr">${esc(b.publisher?.name || '')}</td><td class="ltr">${esc((b.subject || []).slice(0, 2).map(s => s.term).join(' · '))}</td>
        <td class="ltr">${b.apc?.has_apc ? esc((b.apc.max || []).map(a => fmt(a.price) + ' ' + a.currency).join(' / ')) : '<span class="badge ok">مجاناً</span>'}</td><td><a class="btn ghost sm" href="#/tool/journal-check?q=${esc(b.eissn || b.pissn)}">تقرير</a></td></tr>`).join('')}</tbody></table></div>`;
    };
    (async () => {
      try {
        for (let page = 1; page <= 5; page++) {
          const r = await getJSON(`${DOAJ}${encodeURIComponent('bibjson.publisher.country:IQ')}?pageSize=100&page=${page}&sort=title:asc`);
          all = all.concat(r.results.map(x => x.bibjson)); draw();
          if (all.length >= r.total) break;
        }
      } catch (er) { if (!all.length) $('#out', el).innerHTML = errBox(er); }
    })();
    $('#q', el).oninput = draw;
  }
});

/* ---------- الروابط الرسمية ---------- */
const LINKS = [
  ['المجلات والفهرسة', [['المجلات الأكاديمية العلمية العراقية (IASJ)', 'https://iasj.rdd.edu.iq', 'الدليل الوزاري للمجلات العراقية'], ['قائمة مصادر Scopus', 'https://www.scopus.com/sources', 'تحقق من فهرسة المجلة و CiteScore'], ['SCImago Journal Rank', 'https://www.scimagojr.com', 'ربع المجلة (Q) بحسب السنة'], ['Clarivate Master Journal List', 'https://mjl.clarivate.com', 'فهرسة Web of Science'], ['DOAJ', 'https://doaj.org', 'مجلات الوصول الحر المحكّمة'], ['Retraction Watch Database', 'https://retractiondatabase.org', 'قاعدة البحوث المسحوبة']]],
  ['المؤتمرات', [['البحث في مؤتمرات IEEE', 'https://conferences.ieee.org/conferences_events/conferences/search', 'المؤتمرات القادمة الرسمية'], ['مؤتمرات Elsevier', 'https://www.elsevier.com/events/conferences', 'المؤتمرات القادمة الرسمية']]],
  ['تصنيفات الجامعات', [['تصنيف شنغهاي (ARWU)', 'https://www.shanghairanking.com', ''], ['تصنيف التايمز (THE)', 'https://www.timeshighereducation.com/world-university-rankings', ''], ['تصنيف CWUR', 'https://cwur.org', ''], ['تصنيف QS', 'https://www.topuniversities.com/world-university-rankings', '']]],
  ['الجهات الرسمية', [['وزارة التعليم العالي والبحث العلمي', 'https://mohesr.gov.iq', ''], ['دائرة البحث والتطوير', 'https://rdd.edu.iq', '']]]
];
tool({
  id: 'official-links', cat: 'conf', title: 'دليل الروابط الرسمية',
  desc: 'المواقع الرسمية للمؤتمرات العالمية وتصنيفات الجامعات والمستوعبات والجهات الوزارية في صفحة واحدة.',
  render(el) {
    el.innerHTML = LINKS.map(([g, items]) => `<div class="sec-head"><h2>${g}</h2></div><div class="grid">${items.map(([t, u, d]) => `<a class="card" href="${u}" target="_blank" rel="noopener"><h3>${t} ↗</h3><p>${d || ''}</p><span class="tag ltr">${u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span></a>`).join('')}</div>`).join('');
  }
});
