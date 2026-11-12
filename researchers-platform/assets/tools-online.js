/* الأدوات المعتمدة على مصادر البيانات المفتوحة: Crossref · DOAJ · ORCID · Open Library */
const CR = 'https://api.crossref.org';
const DOAJ = 'https://doaj.org/api/search/journals/';

/* ---------- حالة السحب والتصحيح (Retraction Watch عبر Crossref) ---------- */
function updates(w) {
  const u = (w['updated-by'] || []).map(x => ({ type: String(x.type || '').toLowerCase(), doi: x.DOI, year: x.updated?.['date-parts']?.[0]?.[0], source: x.source }));
  const title = (w.title?.[0] || '').toUpperCase();
  const retracted = u.some(x => /retract|withdraw|removal/.test(x.type)) || /^(RETRACTED|WITHDRAWN)\b/.test(title);
  const concern = u.some(x => /concern/.test(x.type));
  const corrected = u.some(x => /correct|errat|corrigend/.test(x.type));
  return { list: u, retracted, concern, corrected };
}
const UPD_AR = { retraction: 'سحب', withdrawal: 'سحب من الناشر', removal: 'إزالة', correction: 'تصحيح', erratum: 'تصويب', corrigendum: 'تصويب', expression_of_concern: 'إبداء قلق', 'expression-of-concern': 'إبداء قلق' };
function statusBadge(u) {
  if (u.retracted) return '<span class="badge bad">مسحوب</span>';
  if (u.concern) return '<span class="badge warn">إبداء قلق</span>';
  if (u.corrected) return '<span class="badge warn">صدر له تصحيح</span>';
  return '<span class="badge ok">لا إشعارات سحب</span>';
}
const authorsShort = w => { const a = w.author || []; const n = a.slice(0, 3).map(x => x.family || x.name || '').filter(Boolean).join(', '); return n + (a.length > 3 ? ' et al.' : ''); };
function workLine(w) {
  const doi = w.DOI;
  return `<div class="item"><h3 class="ltr">${esc(stripTags(w.title?.[0] || '(بلا عنوان)'))}</h3>
    <div class="meta ltr">${esc(authorsShort(w))}${yearOf(w) ? ' · ' + yearOf(w) : ''}${w['container-title']?.[0] ? ' · <i>' + esc(w['container-title'][0]) + '</i>' : ''}</div>
    <div class="btns" style="margin-top:6px">${statusBadge(updates(w))}<span class="badge mute">${fmt(w['is-referenced-by-count'] || 0)} استشهاد</span>
    ${doi ? `<a class="btn ghost sm" href="#/tool/cite?q=${encodeURIComponent(doi)}">توثيق</a><a class="btn ghost sm" href="#/tool/doi-check?q=${encodeURIComponent(doi)}">فحص</a><a class="btn ghost sm" href="https://doi.org/${esc(doi)}" target="_blank" rel="noopener">فتح البحث ↗</a>` : ''}</div></div>`;
}

/* ---------- 1. فحص مجلة ---------- */
tool({
  id: 'journal-check', cat: 'journals', net: true, title: 'فحص المجلة قبل النشر',
  desc: 'ابحث باسم المجلة أو ISSN لمعرفة الناشر، نشاط النشر، إدراجها في DOAJ، رسوم النشر وروابط التحقق الرسمية.',
  render(el, p) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="q">اسم المجلة أو ISSN</label>
      <input type="search" id="q" class="ltr" placeholder="Ain Shams Engineering Journal أو 2090-4479" value="${esc(p.q || '')}" required></div>
      <button class="btn">بحث</button></form><div id="out"></div>`;
    const out = $('#out', el);
    const detail = async issn => {
      out.innerHTML = loading('جارٍ جمع بيانات المجلة…');
      const [cr, dj] = await Promise.allSettled([getJSON(`${CR}/journals/${issn}`), getJSON(DOAJ + encodeURIComponent('issn:' + issn))]);
      const j = cr.status === 'fulfilled' ? cr.value.message : null;
      const d = dj.status === 'fulfilled' ? dj.value.results?.[0]?.bibjson : null;
      if (!j && !d) { out.innerHTML = `<div class="verdict warn">لم نجد مجلة بهذا الرقم (${esc(issn)}) في Crossref ولا DOAJ. غياب المجلة عن المصدرين معاً يستدعي الحذر، لكنه ليس دليلاً قاطعاً — تحقق من الروابط الرسمية أدناه.</div>${links(issn)}`; return; }
      const years = (j?.breakdowns?.['dois-by-issued-year'] || []).slice().sort((a, b) => a[0] - b[0]).filter(y => y[0] >= new Date().getFullYear() - 14);
      const max = Math.max(1, ...years.map(y => y[1]));
      const apc = d?.apc?.has_apc ? (d.apc.max || []).map(a => fmt(a.price) + ' ' + a.currency).join(' / ') : (d ? 'لا توجد رسوم نشر' : '—');
      const issns = [...new Set([...(j?.ISSN || []), d?.pissn, d?.eissn].filter(Boolean))];
      out.innerHTML = `<div class="panel"><h2 class="ltr">${esc(j?.title || d?.title)}</h2>
        <div class="btns" style="margin-bottom:12px">
          ${j ? '<span class="badge ok">مسجّلة في Crossref (تمنح DOI)</span>' : '<span class="badge warn">غير موجودة في Crossref</span>'}
          ${d ? '<span class="badge ok">مدرجة في DOAJ</span>' : '<span class="badge mute">غير مدرجة في DOAJ</span>'}
        </div>
        <dl class="kv">
          <dt>الناشر</dt><dd class="ltr">${esc(j?.publisher || d?.publisher?.name || '—')}</dd>
          <dt>ISSN</dt><dd class="ltr">${esc(issns.join(' · ') || '—')}</dd>
          ${d ? `<dt>بلد الناشر</dt><dd class="ltr">${esc(d.publisher?.country || '—')}</dd>
          <dt>لغات النشر</dt><dd class="ltr">${esc((d.language || []).join(', ') || '—')}</dd>
          <dt>رسوم النشر (APC)</dt><dd class="ltr">${esc(apc)}</dd>
          <dt>نوع التحكيم</dt><dd class="ltr">${esc((d.editorial?.review_process || []).join(', ') || '—')}</dd>
          <dt>مدة النشر التقريبية</dt><dd>${d.publication_time_weeks ? fmt(d.publication_time_weeks) + ' أسبوعاً من التقديم' : '—'}</dd>
          <dt>الترخيص</dt><dd class="ltr">${esc((d.license || []).map(l => l.type).join(', ') || '—')}</dd>
          <dt>التخصصات</dt><dd class="ltr">${esc((d.subject || []).map(s => s.term).join(' · ') || '—')}</dd>` : ''}
          ${j ? `<dt>إجمالي البحوث المسجّلة</dt><dd>${fmt(j.counts?.['total-dois'])}</dd>` : ''}
          ${d?.ref?.journal ? `<dt>موقع المجلة</dt><dd class="ltr"><a href="${esc(d.ref.journal)}" target="_blank" rel="noopener">${esc(d.ref.journal)}</a></dd>` : ''}
        </dl>
        ${years.length ? `<h3 style="margin-top:18px">عدد البحوث المنشورة سنوياً</h3>
          <div class="bars">${years.map(y => `<div style="height:${Math.round(y[1] / max * 100)}%" data-t="${y[0]}: ${fmt(y[1])}"></div>`).join('')}</div>
          <div class="axis"><span>${years[0][0]}</span><span>${years[years.length - 1][0]}</span></div>
          <p class="hint">قفزة مفاجئة وكبيرة في عدد البحوث خلال سنة واحدة من علامات التحذير المعروفة للمجلات المفترسة.</p>` : ''}
        </div>${links(issn)}
        <div class="btns noprint"><button class="btn ghost" data-print>طباعة التقرير</button><a class="btn ghost" href="#/tool/lit-search?issn=${issn}">أحدث بحوث المجلة</a></div>`;
    };
    const links = issn => `<div class="panel"><h3>تحقق نهائي من الفهرسة والتصنيف</h3>
      <p class="hint">فهرسة Scopus وClarivate وربع المجلة (Q) لا تتيحها المصادر المفتوحة. افتح الروابط الرسمية للتأكد:</p>
      <div class="btns"><a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.scimagojr.com/journalsearch.php?q=${issn}">SCImago (الربع Q) ↗</a>
      <a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.scopus.com/sources">Scopus Sources ↗</a>
      <a class="btn ghost sm" target="_blank" rel="noopener" href="https://mjl.clarivate.com/search-results">Clarivate Master Journal List ↗</a>
      <a class="btn ghost sm" target="_blank" rel="noopener" href="https://portal.issn.org/resource/ISSN/${issn}">ISSN Portal ↗</a></div></div>`;
    const search = async q => {
      const issn = cleanISSN(q);
      try {
        if (issn) return await detail(issn);
        out.innerHTML = loading();
        const r = await getJSON(`${CR}/journals?query=${encodeURIComponent(q)}&rows=15`);
        const items = r.message.items.filter(i => i.ISSN?.length);
        if (!items.length) { out.innerHTML = '<div class="verdict warn">لا توجد مجلة مطابقة لهذا الاسم. جرّب الاسم الإنجليزي الكامل أو رقم ISSN.</div>'; return; }
        out.innerHTML = `<div class="panel"><p class="count">${items.length} نتيجة — اختر المجلة لعرض تقريرها</p>${items.map(i => `<div class="item"><h3 class="ltr">${esc(i.title)}</h3>
          <div class="meta ltr">${esc(i.publisher || '')} · ISSN ${esc(i.ISSN.join(', '))} · ${fmt(i.counts?.['total-dois'])} بحث</div>
          <button class="btn sm" style="margin-top:6px" data-issn="${esc(i.ISSN[0])}">عرض التقرير</button></div>`).join('')}</div>`;
        $$('[data-issn]', out).forEach(b => b.onclick = () => detail(b.dataset.issn).catch(e => out.innerHTML = errBox(e)));
      } catch (e) { out.innerHTML = errBox(e); }
    };
    $('#f', el).onsubmit = e => { e.preventDefault(); search($('#q', el).value.trim()); };
    if (p.q) search(p.q);
  }
});

/* ---------- 2. مجلات تخصصك ---------- */
tool({
  id: 'journal-discover', cat: 'journals', net: true, title: 'اكتشف مجلات تخصصك',
  desc: 'اكتب موضوع بحثك بالإنجليزية لتظهر المجلات الأكثر نشراً فيه، ومجلات الوصول الحر المحكّمة مع رسومها.',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="q">موضوع البحث أو كلماته المفتاحية (بالإنجليزية)</label>
      <input type="search" id="q" class="ltr" placeholder="machine learning concrete strength" required></div>
      <div class="field"><label><input type="checkbox" id="free"> أظهر فقط مجلات الوصول الحر التي لا تفرض رسوم نشر</label></div>
      <button class="btn">اكتشف المجلات</button></form><div id="out"></div>`;
    $('#f', el).onsubmit = async e => {
      e.preventDefault();
      const q = $('#q', el).value.trim(), out = $('#out', el), free = $('#free', el).checked;
      out.innerHTML = loading('جارٍ تحليل أماكن نشر هذا الموضوع…');
      const from = new Date().getFullYear() - 5;
      const [cr, dj] = await Promise.allSettled([
        getJSON(`${CR}/works?query.bibliographic=${encodeURIComponent(q)}&rows=0&filter=type:journal-article,from-pub-date:${from}&facet=container-title:25,issn:60`),
        getJSON(DOAJ + encodeURIComponent(q) + '?pageSize=30')
      ]);
      let html = '';
      const cnt = {};
      if (cr.status === 'fulfilled') Object.entries(cr.value.message.facets?.issn?.values || {}).forEach(([k, v]) => cnt[k.split('/').pop()] = v);
      let list = dj.status === 'fulfilled' ? dj.value.results.map(r => r.bibjson) : [];
      if (Object.keys(cnt).length) {
        try {
          const top = await getJSON(DOAJ + encodeURIComponent('issn:(' + Object.keys(cnt).map(i => `"${i}"`).join(' OR ') + ')') + '?pageSize=100');
          const seen = new Set();
          list = [...top.results.map(r => r.bibjson), ...list].filter(b => { const k = b.eissn || b.pissn; return seen.has(k) ? false : seen.add(k); });
        } catch { /* نكتفي بنتائج البحث المباشر */ }
      }
      const pubs = b => cnt[b.eissn] || cnt[b.pissn] || 0;
      list.sort((a, b) => pubs(b) - pubs(a));
      if (free) list = list.filter(b => !b.apc?.has_apc);
      html += `<div class="panel"><h2>مجلات وصول حر محكّمة (DOAJ)${free ? ' — بلا رسوم نشر' : ''}</h2>${list.length ? `<div class="tbl-wrap"><table><thead><tr><th>المجلة</th><th>الناشر</th><th class="num">بحوث في موضوعك</th><th>رسوم النشر</th><th>مدة النشر</th><th></th></tr></thead><tbody>${list.map(b => {
        const issn = b.eissn || b.pissn;
        return `<tr><td class="ltr">${esc(b.title)}</td><td class="ltr">${esc(b.publisher?.name || '')}</td><td class="num">${pubs(b) ? fmt(pubs(b)) : '—'}</td>
          <td class="ltr">${b.apc?.has_apc ? esc((b.apc.max || []).map(a => fmt(a.price) + ' ' + a.currency).join(' / ')) : '<span class="badge ok">مجاناً</span>'}</td>
          <td>${b.publication_time_weeks ? b.publication_time_weeks + ' أسبوعاً' : '—'}</td>
          <td><a class="btn ghost sm" href="#/tool/journal-check?q=${esc(issn)}">تقرير</a></td></tr>`;
      }).join('')}</tbody></table></div>` : '<p class="hint">لا توجد مجلات مطابقة في DOAJ. جرّب كلمات أعمّ (اسم التخصص مثلاً).</p>'}</div>`;
      if (cr.status === 'fulfilled' && !free) {
        const v = Object.entries(cr.value.message.facets?.['container-title']?.values || {});
        html += `<div class="panel"><h2>المجلات الأكثر نشراً في الموضوع منذ ${from}</h2>
          <p class="hint">مرتّبة بعدد البحوث المطابقة في Crossref. الترتيب يعكس حجم النشر لا جودة المجلة.</p>
          ${v.length ? `<div class="tbl-wrap"><table><thead><tr><th>المجلة</th><th class="num">بحوث مطابقة</th><th></th></tr></thead><tbody>${v.map(([n, c]) => `<tr><td class="ltr">${esc(n)}</td><td class="num">${fmt(c)}</td><td><a class="btn ghost sm" href="#/tool/journal-check?q=${encodeURIComponent(n)}">فحص</a></td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">لا نتائج.</p>'}</div>`;
      }
      out.innerHTML = html || errBox(cr.reason || dj.reason);
    };
  }
});

/* ---------- 3. فحص ورقة بحثية ---------- */
tool({
  id: 'doi-check', cat: 'papers', net: true, title: 'التحقق من ورقة بحثية (السحب والتصحيح)',
  desc: 'أدخل DOI لمعرفة هل الورقة مسحوبة أو صدر بحقها تصحيح أو إبداء قلق، مع بياناتها وعدد استشهاداتها.',
  render(el, p) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="q">DOI الورقة أو رابطها</label>
      <input type="search" id="q" class="ltr" placeholder="10.1016/j.asej.2023.102345" value="${esc(p.q || '')}" required></div>
      <button class="btn">تحقق</button></form><div id="out"></div>`;
    const out = $('#out', el);
    const run = async q => {
      const doi = cleanDOI(q);
      if (!doi) { out.innerHTML = '<div class="verdict warn">لم نتعرف على DOI صالح. يبدأ الـDOI دائماً بـ 10. متبوعاً بأرقام ثم شرطة مائلة.</div>'; return; }
      out.innerHTML = loading();
      try {
        const w = (await getJSON(`${CR}/works/${encodeURIComponent(doi)}`)).message, u = updates(w);
        const verdict = u.retracted ? ['bad', 'تحذير: هذه الورقة مسحوبة (Retracted). لا يُنصح بالاستشهاد بها كمصدر علمي.'] :
          u.concern ? ['warn', 'تنبيه: صدر بحق هذه الورقة إشعار «إبداء قلق» من المجلة.'] :
          u.corrected ? ['warn', 'صدر لهذه الورقة تصحيح منشور. راجع التصحيح قبل الاستشهاد.'] :
          ['ok', 'لا توجد إشعارات سحب أو تصحيح مسجّلة لهذه الورقة حتى الآن.'];
        out.innerHTML = `<div class="verdict ${verdict[0]}">${verdict[1]}</div>
        <div class="panel"><h2 class="ltr">${esc(stripTags(w.title?.[0] || ''))}</h2>
          <dl class="kv"><dt>المؤلفون</dt><dd class="ltr">${esc((w.author || []).map(a => [a.given, a.family].filter(Boolean).join(' ') || a.name).join(', ') || '—')}</dd>
          <dt>المجلة / الوعاء</dt><dd class="ltr">${esc(w['container-title']?.[0] || '—')}</dd>
          <dt>الناشر</dt><dd class="ltr">${esc(w.publisher || '—')}</dd><dt>السنة</dt><dd>${yearOf(w) || '—'}</dd>
          <dt>النوع</dt><dd class="ltr">${esc(w.type || '—')}</dd>
          <dt>الاستشهادات (Crossref)</dt><dd>${fmt(w['is-referenced-by-count'])}</dd>
          <dt>عدد المراجع</dt><dd>${fmt(w['references-count'])}</dd>
          <dt>الترخيص</dt><dd class="ltr">${w.license?.[0]?.URL ? `<a href="${esc(w.license[0].URL)}" target="_blank" rel="noopener">${esc(w.license[0].URL)}</a>` : '—'}</dd></dl>
          ${u.list.length ? `<h3 style="margin-top:16px">الإشعارات المسجّلة</h3><div class="tbl-wrap"><table><thead><tr><th>النوع</th><th>السنة</th><th>المصدر</th><th>الإشعار</th></tr></thead><tbody>${u.list.map(x => `<tr><td>${esc(UPD_AR[x.type] || x.type)}</td><td>${x.year || '—'}</td><td class="ltr">${esc(x.source || '')}</td><td class="ltr">${x.doi ? `<a href="https://doi.org/${esc(x.doi)}" target="_blank" rel="noopener">${esc(x.doi)}</a>` : '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}
          <div class="btns" style="margin-top:16px"><a class="btn" href="#/tool/cite?q=${encodeURIComponent(doi)}">ولّد التوثيق</a>
          ${w.ISSN?.[0] ? `<a class="btn ghost" href="#/tool/journal-check?q=${esc(w.ISSN[0])}">افحص المجلة</a>` : ''}
          <a class="btn ghost" href="https://doi.org/${esc(doi)}" target="_blank" rel="noopener">فتح الورقة ↗</a><button class="btn ghost" data-print>طباعة</button></div></div>`;
      } catch (e) { out.innerHTML = e.notFound ? '<div class="verdict warn">هذا الـDOI غير مسجّل في Crossref. قد يكون مسجّلاً لدى جهة أخرى (مثل DataCite) أو مكتوباً بشكل خاطئ.</div>' : errBox(e); }
    };
    $('#f', el).onsubmit = e => { e.preventDefault(); run($('#q', el).value); };
    if (p.q) run(p.q);
  }
});

/* ---------- 4. فحص قائمة المراجع ---------- */
const normT = s => String(s).toLowerCase().replace(/[^a-z0-9؀-ۿ ]+/g, ' ').split(/\s+/).filter(x => x.length > 2);
tool({
  id: 'ref-check', cat: 'papers', net: true, title: 'افحص مراجع بحثك قبل النشر',
  desc: 'الصق قائمة المراجع ليتحقق النظام من وجود كل مرجع ومن أنه غير مسحوب، ويلتقط الـDOI الناقص.',
  long: 'الصق قائمة مراجعك (كل مرجع في سطر). يُطابَق كل مرجع مع Crossref، ويُفحص سجل السحب والتصحيح، وتُعرض الـDOI التي يمكنك إضافتها. الحد الأقصى 80 مرجعاً في المرة.',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="t">قائمة المراجع <span class="hint">(مرجع واحد في كل سطر)</span></label>
      <textarea id="t" class="ltr" rows="10" placeholder="[1] A. Author, &quot;Title of paper,&quot; Journal, vol. 1, 2020, doi: 10.xxxx/xxxxx&#10;[2] …" required></textarea></div>
      <button class="btn">افحص المراجع</button></form><div id="out"></div>`;
    $('#f', el).onsubmit = async e => {
      e.preventDefault();
      const refs = $('#t', el).value.split(/\n+/).map(s => s.trim()).filter(s => s.length > 15).slice(0, 80);
      const out = $('#out', el);
      if (!refs.length) { out.innerHTML = '<div class="verdict warn">لم نجد مراجع صالحة للفحص.</div>'; return; }
      out.innerHTML = `<div class="panel"><p id="pg">${loading('جارٍ الفحص… 0 / ' + refs.length)}</p><div class="progress"><i id="bar" style="width:0"></i></div></div>`;
      const res = new Array(refs.length); let done = 0;
      const one = async i => {
        const raw = refs[i], doi = cleanDOI(raw);
        try {
          let w, how = 'doi';
          if (doi) w = (await getJSON(`${CR}/works/${encodeURIComponent(doi)}`)).message;
          else {
            how = 'match';
            const cs = (await getJSON(`${CR}/works?query.bibliographic=${encodeURIComponent(raw.slice(0, 400))}&rows=5&select=DOI,title,author,issued,container-title,updated-by,is-referenced-by-count`)).message.items;
            const rs = new Set(normT(raw));
            const good = cs.filter(c => { const tt = normT(stripTags(c.title?.[0] || '')); return tt.length >= 3 && tt.filter(x => rs.has(x)).length / tt.length >= 0.75; });
            w = good.find(c => updates(c).retracted) || good[0];
          }
          res[i] = w ? { raw, w, how, u: updates(w) } : { raw, miss: true };
        } catch (er) { res[i] = er.notFound ? { raw, miss: true, badDoi: !!doi } : { raw, err: er.message }; }
        done++; $('#pg').innerHTML = loading(`جارٍ الفحص… ${done} / ${refs.length}`); $('#bar').style.width = (done / refs.length * 100) + '%';
      };
      let next = 0;
      await Promise.all(Array.from({ length: 4 }, async () => { while (next < refs.length) await one(next++); }));
      const n = { ret: res.filter(r => r.u?.retracted).length, warn: res.filter(r => r.u && !r.u.retracted && (r.u.concern || r.u.corrected)).length, miss: res.filter(r => r.miss).length, ok: res.filter(r => r.w).length, err: res.filter(r => r.err).length };
      const st = r => r.err ? '<span class="badge mute">تعذّر الفحص</span>' : r.miss ? `<span class="badge warn">${r.badDoi ? 'DOI غير مسجّل' : 'لم يُطابَق'}</span>` : statusBadge(r.u);
      out.innerHTML = `<div class="verdict ${n.ret ? 'bad' : n.warn || n.miss ? 'warn' : 'ok'}">${n.ret ? `وُجد ${n.ret} مرجع مسحوب في قائمتك — استبدله قبل الإرسال.` : 'لم يُعثر على مراجع مسحوبة ضمن المراجع المطابَقة.'}</div>
        <div class="big"><div><b>${refs.length}</b><span>مرجعاً فُحص</span></div><div><b>${n.ok}</b><span>طُوبق مع Crossref</span></div><div><b>${n.ret}</b><span>مسحوب</span></div><div><b>${n.warn}</b><span>تصحيح أو إبداء قلق</span></div><div><b>${n.miss}</b><span>لم يُطابَق</span></div></div>
        <div class="panel"><div class="tbl-wrap"><table><thead><tr><th>#</th><th>المرجع</th><th>الحالة</th><th>DOI</th></tr></thead><tbody>${res.map((r, i) => `<tr><td>${i + 1}</td>
          <td class="ltr">${esc(r.raw.slice(0, 220))}${r.how === 'match' ? `<div class="hint">المطابقة: ${esc(stripTags(r.w.title?.[0] || ''))} (${yearOf(r.w)})</div>` : ''}</td>
          <td>${st(r)}</td><td class="ltr">${r.w ? `<a href="https://doi.org/${esc(r.w.DOI)}" target="_blank" rel="noopener">${esc(r.w.DOI)}</a>${r.how === 'match' ? ' <span class="badge mute">مقترح</span>' : ''}` : '—'}</td></tr>`).join('')}</tbody></table></div>
          <p class="hint">«لم يُطابَق» لا تعني أن المرجع وهمي: الكتب والرسائل الجامعية والمصادر العربية والتقارير غالباً غير مسجّلة في Crossref. راجعها يدوياً.</p>
          <div class="btns noprint"><button class="btn ghost" data-print>طباعة التقرير</button><button class="btn ghost" id="csv">تنزيل CSV</button></div></div>`;
      $('#csv').onclick = () => download('references-report.csv', 'n,status,doi,reference\n' + res.map((r, i) => [i + 1, r.err ? 'error' : r.miss ? 'unmatched' : r.u.retracted ? 'RETRACTED' : r.u.concern ? 'concern' : r.u.corrected ? 'corrected' : 'ok', r.w?.DOI || '', '"' + r.raw.replace(/"/g, '""') + '"'].join(',')).join('\n'), 'text/csv');
    };
  }
});

/* ---------- 5. مولّد التوثيق ---------- */
const ini = (g, sep = ' ') => String(g || '').split(/[\s]+/).filter(Boolean).map(p => p.split('-').map(x => x[0].toUpperCase() + '.').join('-')).join(sep);
const joinA = (a, last = '&', oxford = true) => a.length < 2 ? a.join('') : a.length === 2 ? a.join(` ${last} `) : a.slice(0, -1).join(', ') + (oxford ? ',' : '') + ` ${last} ` + a[a.length - 1];
function citeStyles(m) {
  const A = m.authors, y = m.year || 'n.d.', T = m.title, C = m.container, V = m.volume, I = m.issue, P = m.pages, D = m.doi ? 'https://doi.org/' + m.doi : (m.url || ''), pub = m.publisher;
  const nm = a => a.family ? a : { family: a.name || '', given: '' };
  const au = A.map(nm), it = s => s ? `<i>${esc(s)}</i>` : '', e = esc;
  const isArt = !!C;
  const s = {};
  // APA 7
  let ap = au.map(a => a.given ? `${a.family}, ${ini(a.given)}` : a.family);
  if (ap.length > 20) ap = [...ap.slice(0, 19), '…', ap[ap.length - 1]];
  const apA = ap.includes('…') ? ap.slice(0, 19).join(', ') + ', … ' + ap[ap.length - 1] : joinA(ap, '&');
  s['APA 7'] = `${e(apA)}${apA ? ' ' : ''}(${y}). ` + (isArt ? `${e(T)}. ${it(C)}${V ? ', ' + it(V) : ''}${I ? `(${e(I)})` : ''}${P ? ', ' + e(P) : ''}.` : `${it(T)}.${pub ? ' ' + e(pub) + '.' : ''}`) + (D ? ' ' + e(D) : '');
  // IEEE
  let ie = au.map(a => a.given ? `${ini(a.given)} ${a.family}` : a.family);
  const ieA = ie.length > 6 ? ie[0] + ' <i>et al.</i>' : e(joinA(ie, 'and'));
  s['IEEE'] = `${ie.length > 6 ? e(ie[0]) + ' <i>et al.</i>' : ieA}, ` + (isArt ? `“${e(T)},” ${it(C)}${V ? ', vol. ' + e(V) : ''}${I ? ', no. ' + e(I) : ''}${P ? ', pp. ' + e(P) : ''}, ${y}` : `${it(T)}. ${pub ? e(pub) + ', ' : ''}${y}`) + (m.doi ? `, doi: ${e(m.doi)}` : '') + '.';
  // Harvard
  const hv = au.map(a => a.given ? `${a.family}, ${ini(a.given, '')}` : a.family);
  s['Harvard'] = `${e(joinA(hv, 'and', false))} (${y}) ` + (isArt ? `‘${e(T)}’, ${it(C)}${V ? ', ' + e(V) : ''}${I ? `(${e(I)})` : ''}${P ? ', pp. ' + e(P) : ''}.` : `${it(T)}.${pub ? ' ' + e(pub) + '.' : ''}`) + (m.doi ? ` doi:${e(m.doi)}.` : '');
  // MLA 9
  const f = au[0], mlA = !f ? '' : au.length === 1 ? `${f.family}${f.given ? ', ' + f.given : ''}` : au.length === 2 ? `${f.family}, ${f.given}, and ${au[1].given} ${au[1].family}` : `${f.family}, ${f.given}, et al`;
  s['MLA 9'] = `${e(mlA)}${mlA ? '. ' : ''}` + (isArt ? `“${e(T)}.” ${it(C)}${V ? ', vol. ' + e(V) : ''}${I ? ', no. ' + e(I) : ''}, ${y}${P ? ', pp. ' + e(P) : ''}.` : `${it(T)}. ${pub ? e(pub) + ', ' : ''}${y}.`) + (D ? ' ' + e(D) + '.' : '');
  // Vancouver
  let vn = au.map(a => a.given ? `${a.family} ${ini(a.given, '').replace(/\./g, '')}` : a.family);
  if (vn.length > 6) vn = [...vn.slice(0, 6), 'et al'];
  s['Vancouver'] = `${e(vn.join(', '))}${vn.length ? '. ' : ''}${e(T)}. ` + (isArt ? `${e(C)}. ${y}${V ? ';' + e(V) : ''}${I ? `(${e(I)})` : ''}${P ? ':' + e(P) : ''}.` : `${pub ? e(pub) + '; ' : ''}${y}.`) + (m.doi ? ` doi:${e(m.doi)}` : '');
  // Chicago author-date
  const ch = au.map((a, i) => !a.given ? a.family : i === 0 ? `${a.family}, ${a.given}` : `${a.given} ${a.family}`);
  s['Chicago'] = `${e(joinA(ch, 'and'))}${ch.length ? '. ' : ''}${y}. ` + (isArt ? `“${e(T)}.” ${it(C)}${V ? ' ' + e(V) : ''}${I ? ` (${e(I)})` : ''}${P ? ': ' + e(P) : ''}.` : `${it(T)}.${pub ? ' ' + e(pub) + '.' : ''}`) + (D ? ' ' + e(D) + '.' : '');
  // BibTeX
  const key = ((au[0]?.family || 'ref').replace(/[^A-Za-z]/g, '') || 'ref') + y + (T.split(/\s+/).find(w => w.length > 3) || '').replace(/[^A-Za-z]/g, '');
  const fields = [['author', au.map(a => a.given ? `${a.family}, ${a.given}` : a.family).join(' and ')], ['title', T], [isArt ? 'journal' : 'publisher', isArt ? C : pub], ['year', m.year], ['volume', V], ['number', I], ['pages', P && P.replace('-', '--')], ['doi', m.doi], ['isbn', m.isbn]].filter(x => x[1]);
  s.bibtex = `@${isArt ? 'article' : 'book'}{${key.toLowerCase()},\n${fields.map(([k, v]) => `  ${k} = {${v}}`).join(',\n')}\n}`;
  return s;
}
async function isbnLookup(isbn) {
  const d = (await getJSON(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`))['ISBN:' + isbn];
  if (!d) { const e = new Error('لم يُعثر على كتاب بهذا الرقم في Open Library.'); e.notFound = true; throw e; }
  return d;
}
tool({
  id: 'cite', cat: 'papers', net: true, title: 'مولّد التوثيق والمراجع',
  desc: 'حوّل DOI أو ISBN إلى توثيق جاهز بأنماط APA و IEEE و Harvard و MLA و Vancouver و Chicago مع BibTeX.',
  render(el, p) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="q">DOI أو ISBN <span class="hint">(يمكن إدخال عدة معرّفات، كل واحد في سطر)</span></label>
      <textarea id="q" class="ltr" style="min-height:90px" placeholder="10.1038/nature14539&#10;9780262035613" required>${esc(p.q || '')}</textarea></div>
      <div class="row"><div class="field"><label for="s">النمط</label><select id="s">${['APA 7', 'IEEE', 'Harvard', 'MLA 9', 'Vancouver', 'Chicago'].map(x => `<option>${x}</option>`).join('')}</select></div></div>
      <button class="btn">ولّد التوثيق</button></form><div id="out"></div>`;
    const out = $('#out', el); let metas = [];
    const draw = () => {
      if (!metas.length) return;
      const st = $('#s', el).value, all = metas.map(m => m.err ? null : citeStyles(m));
      const text = h => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const okc = all.filter(Boolean);
      out.innerHTML = `<div class="panel"><h2>${esc(st)}</h2>${metas.map((m, i) => m.err ? `<div class="verdict warn ltr">${esc(m.id)} — ${esc(m.err)}</div>` :
        `<div class="cite-out">${st === 'IEEE' ? `[${i + 1}] ` : ''}${all[i][st]}</div><div class="btns" style="margin-bottom:14px">${copyBtn(text(all[i][st]))}${m.retracted ? '<span class="badge bad">تنبيه: ورقة مسحوبة</span>' : ''}</div>`).join('')}
        ${okc.length > 1 ? `<div class="btns">${copyBtn(okc.map((c, i) => (st === 'IEEE' ? `[${i + 1}] ` : '') + text(c[st])).join('\n'), 'نسخ الكل')}</div>` : ''}</div>
        ${okc.length ? `<div class="panel"><h2>BibTeX</h2><pre class="cite-out">${esc(okc.map(c => c.bibtex).join('\n\n'))}</pre><div class="btns">${copyBtn(okc.map(c => c.bibtex).join('\n\n'))}<button class="btn ghost sm" id="bib">تنزيل ‎.bib</button></div></div>` : ''}`;
      if ($('#bib')) $('#bib').onclick = () => download('references.bib', okc.map(c => c.bibtex).join('\n\n'));
    };
    const run = async () => {
      const ids = $('#q', el).value.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 30);
      out.innerHTML = loading('جارٍ جلب بيانات المصادر…');
      metas = await Promise.all(ids.map(async id => {
        try {
          const doi = cleanDOI(id);
          if (doi) {
            const w = (await getJSON(`${CR}/works/${encodeURIComponent(doi)}`)).message;
            return { authors: w.author || w.editor || [], year: yearOf(w), title: stripTags(w.title?.[0] || ''), container: w['container-title']?.[0] || '', volume: w.volume, issue: w.issue, pages: w.page || w['article-number'], doi: w.DOI, publisher: w.publisher, retracted: updates(w).retracted };
          }
          const isbn = id.replace(/[^0-9Xx]/g, '');
          if (isbn.length === 10 || isbn.length === 13) {
            const b = await isbnLookup(isbn);
            return { authors: (b.authors || []).map(a => { const parts = a.name.trim().split(/\s+/); return parts.length > 1 ? { family: parts.pop(), given: parts.join(' ') } : { name: a.name }; }), year: (b.publish_date || '').match(/\d{4}/)?.[0], title: b.title + (b.subtitle ? ': ' + b.subtitle : ''), container: '', publisher: b.publishers?.[0]?.name, isbn, url: '' };
          }
          return { id, err: 'ليس DOI ولا ISBN صالحاً' };
        } catch (e) { return { id, err: e.notFound ? 'غير موجود في المصدر' : e.message }; }
      }));
      draw();
    };
    $('#f', el).onsubmit = e => { e.preventDefault(); run(); };
    $('#s', el).onchange = draw;
    if (p.q) run();
  }
});

/* ---------- 6. البحث في الأدبيات ---------- */
tool({
  id: 'lit-search', cat: 'papers', net: true, title: 'البحث في الدراسات السابقة',
  desc: 'ابحث في أكثر من 150 مليون سجل علمي، ورتّب النتائج بالأكثر استشهاداً أو الأحدث، مع توثيق فوري لكل نتيجة.',
  render(el, p) {
    const y = new Date().getFullYear();
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="q">كلمات البحث</label><input type="search" id="q" class="ltr" placeholder="self-compacting concrete machine learning" ${p.issn ? '' : 'required'}></div>
      <div class="row"><div class="field"><label for="from">من سنة</label><input type="number" id="from" min="1900" max="${y}" value="${y - 5}"></div>
      <div class="field"><label for="to">إلى سنة</label><input type="number" id="to" min="1900" max="${y}" value="${y}"></div>
      <div class="field"><label for="sort">الترتيب</label><select id="sort"><option value="relevance">الأكثر صلة</option><option value="is-referenced-by-count">الأكثر استشهاداً</option><option value="published">الأحدث</option></select></div>
      <div class="field"><label for="type">النوع</label><select id="type"><option value="journal-article">مقالات المجلات</option><option value="proceedings-article">بحوث المؤتمرات</option><option value="book-chapter">فصول الكتب</option><option value="">الكل</option></select></div></div>
      <div class="field"><label for="issn">حصر في مجلة (ISSN، اختياري)</label><input type="text" id="issn" class="ltr" value="${esc(p.issn || '')}" placeholder="2090-4479"></div>
      <button class="btn">ابحث</button></form><div id="out"></div>`;
    const out = $('#out', el); let offset = 0, acc = [];
    const run = async more => {
      if (!more) { offset = 0; acc = []; out.innerHTML = loading(); }
      const f = [`from-pub-date:${$('#from', el).value || 1900}`, `until-pub-date:${$('#to', el).value || y}`];
      if ($('#type', el).value) f.push('type:' + $('#type', el).value);
      const issn = cleanISSN($('#issn', el).value); if (issn) f.push('issn:' + issn);
      const q = $('#q', el).value.trim();
      const want = $('#sort', el).value, local = q && want !== 'relevance';
      const sort = local ? 'relevance' : (!q && want === 'relevance' ? 'published' : want), rows = local ? 100 : 20;
      const cnt = w => w['is-referenced-by-count'] || 0, dt = w => (w.issued?.['date-parts']?.[0] || []).map(x => String(x).padStart(4, '0')).join('');
      try {
        const m = (await getJSON(`${CR}/works?${q ? 'query.bibliographic=' + encodeURIComponent(q) + '&' : ''}filter=${f.join(',')}&sort=${sort}&order=desc&rows=${rows}&offset=${offset}&select=DOI,title,author,issued,container-title,is-referenced-by-count,updated-by`)).message;
        acc = acc.concat(m.items); offset += rows;
        if (local) acc.sort(want === 'published' ? (a, b) => dt(b).localeCompare(dt(a)) : (a, b) => cnt(b) - cnt(a));
        out.innerHTML = `<div class="panel"><p class="count">${fmt(m['total-results'])} نتيجة${local ? ` — معروض أوثق ${acc.length} نتيجة صلةً بموضوعك، مرتّبة ${want === 'published' ? 'بالأحدث' : 'بالأكثر استشهاداً'}` : ''}</p>${acc.map(workLine).join('') || '<p class="hint">لا نتائج. جرّب كلمات أعمّ بالإنجليزية.</p>'}
          <div class="btns" style="margin-top:14px">${offset < Math.min(m['total-results'], 300) ? '<button class="btn ghost" id="more">عرض المزيد</button>' : ''}
          ${acc.length ? '<button class="btn ghost" id="exp">تصدير النتائج CSV</button>' : ''}</div></div>`;
        if ($('#more')) $('#more').onclick = () => run(true);
        if ($('#exp')) $('#exp').onclick = () => download('search-results.csv', 'title,authors,year,journal,citations,doi\n' + acc.map(w => [stripTags(w.title?.[0] || ''), authorsShort(w), yearOf(w), w['container-title']?.[0] || '', w['is-referenced-by-count'] || 0, w.DOI].map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n'), 'text/csv');
      } catch (e) { out.innerHTML = errBox(e); }
    };
    $('#f', el).onsubmit = e => { e.preventDefault(); run(); };
    if (p.issn) run();
  }
});

/* ---------- 7. بحث كتاب ---------- */
tool({
  id: 'isbn', cat: 'papers', net: true, title: 'البحث عن كتاب برقم ISBN',
  desc: 'أدخل رقم ISBN للحصول على بيانات الكتاب الكاملة وتوثيقه الجاهز.',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="q">رقم ISBN (10 أو 13 رقماً)</label><input type="search" id="q" class="ltr" placeholder="978-0-262-03561-3" required></div><button class="btn">ابحث</button></form><div id="out"></div>`;
    $('#f', el).onsubmit = async e => {
      e.preventDefault();
      const isbn = $('#q', el).value.replace(/[^0-9Xx]/g, ''), out = $('#out', el);
      if (isbn.length !== 10 && isbn.length !== 13) { out.innerHTML = '<div class="verdict warn">رقم ISBN يتكوّن من 10 أو 13 رقماً.</div>'; return; }
      out.innerHTML = loading();
      try {
        const b = await isbnLookup(isbn);
        out.innerHTML = `<div class="panel"><h2 class="ltr">${esc(b.title)}${b.subtitle ? ': ' + esc(b.subtitle) : ''}</h2>
          <dl class="kv"><dt>المؤلفون</dt><dd class="ltr">${esc((b.authors || []).map(a => a.name).join(', ') || '—')}</dd>
          <dt>الناشر</dt><dd class="ltr">${esc((b.publishers || []).map(a => a.name).join(', ') || '—')}</dd>
          <dt>تاريخ النشر</dt><dd class="ltr">${esc(b.publish_date || '—')}</dd><dt>عدد الصفحات</dt><dd>${fmt(b.number_of_pages)}</dd>
          <dt>الموضوعات</dt><dd class="ltr">${esc((b.subjects || []).slice(0, 8).map(s => s.name).join(' · ') || '—')}</dd></dl>
          <div class="btns" style="margin-top:14px"><a class="btn" href="#/tool/cite?q=${isbn}">ولّد التوثيق</a><a class="btn ghost" href="${esc(b.url)}" target="_blank" rel="noopener">صفحة الكتاب ↗</a></div></div>`;
      } catch (er) { out.innerHTML = er.notFound ? `<div class="verdict warn">${esc(er.message)}</div>` : errBox(er); }
    };
  }
});

/* ---------- 8. ملف الباحث ---------- */
const hIndex = c => { const s = c.slice().sort((a, b) => b - a); let h = 0; while (h < s.length && s[h] >= h + 1) h++; return h; };
tool({
  id: 'researcher', cat: 'researcher', net: true, title: 'ملف الباحث ومؤشراته',
  desc: 'ابحث باسم الباحث أو رقم ORCID لعرض بحوثه المسجّلة، مجموع استشهاداته ومؤشر h و i10.',
  render(el, p) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="q">اسم الباحث بالإنجليزية أو رقم ORCID</label><input type="search" id="q" class="ltr" placeholder="0000-0002-1825-0097" value="${esc(p.q || '')}" required></div><button class="btn">ابحث</button></form><div id="out"></div>`;
    const out = $('#out', el);
    const profile = async id => {
      out.innerHTML = loading('جارٍ جمع بحوث الباحث…');
      try {
        const [person, works] = await Promise.all([
          getJSON(`https://pub.orcid.org/v3.0/${id}/person`).catch(() => null),
          getJSON(`${CR}/works?filter=orcid:${id}&rows=500&select=DOI,title,author,issued,container-title,is-referenced-by-count,updated-by`)
        ]);
        const items = works.message.items.sort((a, b) => (b['is-referenced-by-count'] || 0) - (a['is-referenced-by-count'] || 0));
        const c = items.map(w => w['is-referenced-by-count'] || 0), tot = c.reduce((a, b) => a + b, 0);
        const name = person?.name ? [person.name['given-names']?.value, person.name['family-name']?.value].filter(Boolean).join(' ') : id;
        const byY = {}; items.forEach(w => { const yy = yearOf(w); if (yy) byY[yy] = (byY[yy] || 0) + 1; });
        const ys = Object.keys(byY).sort(), mx = Math.max(1, ...Object.values(byY));
        out.innerHTML = `<div class="panel"><h2 class="ltr">${esc(name)}</h2><p class="ltr"><a href="https://orcid.org/${id}" target="_blank" rel="noopener">orcid.org/${id}</a></p>
          <div class="big"><div><b>${items.length}</b><span>بحثاً مسجّلاً</span></div><div><b>${fmt(tot)}</b><span>استشهاداً</span></div><div><b>${hIndex(c)}</b><span>مؤشر h</span></div><div><b>${c.filter(x => x >= 10).length}</b><span>مؤشر i10</span></div><div><b>${items.filter(w => updates(w).retracted).length}</b><span>بحوث مسحوبة</span></div></div>
          ${ys.length ? `<h3>النشر حسب السنة</h3><div class="bars">${ys.map(k => `<div style="height:${byY[k] / mx * 100}%" data-t="${k}: ${byY[k]}"></div>`).join('')}</div><div class="axis"><span>${ys[0]}</span><span>${ys[ys.length - 1]}</span></div>` : ''}
          <p class="note info">الأرقام محسوبة من البحوث المربوطة برقم ORCID في Crossref فقط، وقد تقلّ عن أرقام Scopus و Google Scholar. اربط كل بحوثك بحسابك في ORCID لتظهر كاملة.</p>
          <div class="btns noprint"><button class="btn ghost" data-print>طباعة</button></div></div>
          <div class="panel"><h2>البحوث</h2>${items.map(workLine).join('') || '<p class="hint">لا توجد بحوث مربوطة بهذا الرقم في Crossref.</p>'}</div>`;
      } catch (e) { out.innerHTML = errBox(e); }
    };
    const run = async q => {
      const m = q.match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/i);
      if (m) return profile(m[0].toUpperCase());
      out.innerHTML = loading();
      try {
        const r = (await getJSON(`https://pub.orcid.org/v3.0/expanded-search/?q=${encodeURIComponent(q)}&rows=20`))['expanded-result'] || [];
        out.innerHTML = r.length ? `<div class="panel"><p class="count">اختر الباحث</p>${r.map(x => `<div class="item"><h3 class="ltr">${esc([x['given-names'], x['family-names']].filter(Boolean).join(' '))}</h3>
          <div class="meta ltr">${esc((x['institution-name'] || []).slice(0, 3).join(' · '))}</div><button class="btn sm" style="margin-top:6px" data-id="${esc(x['orcid-id'])}">عرض الملف (${esc(x['orcid-id'])})</button></div>`).join('')}</div>` :
          '<div class="verdict warn">لا يوجد باحث بهذا الاسم في ORCID.</div>';
        $$('[data-id]', out).forEach(b => b.onclick = () => profile(b.dataset.id));
      } catch (e) { out.innerHTML = errBox(e); }
    };
    $('#f', el).onsubmit = e => { e.preventDefault(); run($('#q', el).value.trim()); };
    if (p.q) run(p.q);
  }
});
