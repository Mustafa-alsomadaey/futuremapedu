/* الأدوات المحلية: تعمل كلها داخل المتصفح دون إرسال أي بيانات */
const parseNums = s => String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).split(/[\s,;،]+/).filter(x => x !== '').map(Number).filter(x => !isNaN(x));
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const variance = a => { const m = mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1); };
const quant = (s, q) => { const p = (s.length - 1) * q, b = Math.floor(p); return s[b] + (s[Math.min(b + 1, s.length - 1)] - s[b]) * (p - b); };
const T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];
const normAr = s => String(s).toLowerCase().replace(/[ً-ْٰـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
const wordsOf = s => (normAr(s).match(/[a-z0-9؀-ۿ]+(?:['’-][a-z]+)*/g) || []);

/* ---------- قائمة التحقق قبل الإرسال ---------- */
const CHECK = {
  'المجلة': ['تحققت من فهرسة المجلة في المستوعب المطلوب من الموقع الرسمي للمستوعب نفسه', 'نطاق المجلة (Scope) يطابق موضوع بحثي', 'عرفت رسوم النشر ومدة التحكيم المتوقعة', 'قرأت دليل المؤلفين وطبّقت قالب المجلة', 'المجلة ليست في قوائم المجلات المفترسة أو المتوقفة'],
  'المخطوطة': ['العنوان دقيق ولا يتجاوز الحد المسموح', 'الملخص ضمن عدد الكلمات المطلوب ويذكر الهدف والمنهج والنتائج', 'الكلمات المفتاحية من 4 إلى 6 وغير مكررة من العنوان', 'الأشكال والجداول مرقمة ومشار إليها في المتن وبدقة كافية', 'قسم المنهجية يكفي لإعادة تنفيذ الدراسة', 'الاستنتاجات مبنية على النتائج لا على التوقعات'],
  'المراجع والنزاهة': ['كل مرجع في القائمة مستشهد به في المتن والعكس', 'فحصت المراجع ولا يوجد بينها بحث مسحوب', 'نسبة الاستلال ضمن حد المجلة', 'أفصحت عن استخدام أدوات الذكاء الاصطناعي إن وُجد وفق سياسة المجلة', 'حصلت على الموافقات الأخلاقية اللازمة وذكرتها'],
  'ملفات الإرسال': ['خطاب التقديم (Cover Letter) جاهز وموجّه لرئيس التحرير', 'بيانات كل المؤلفين وانتماءاتهم و ORCID مكتملة', 'بيان مساهمات المؤلفين وتضارب المصالح والتمويل', 'ملف بلا أسماء المؤلفين إن كان التحكيم مزدوج التعمية', 'وافق جميع المؤلفين على النسخة النهائية']
};
tool({
  id: 'publish-checklist', cat: 'journals', title: 'قائمة التحقق قبل إرسال البحث',
  desc: 'قائمة عملية من 21 بنداً تراجع بها المجلة والمخطوطة والمراجع وملفات الإرسال، وتُحفظ تلقائياً على جهازك.',
  render(el) {
    const st = store.get('check', {}), total = Object.values(CHECK).flat().length;
    const draw = () => {
      const done = Object.values(st).filter(Boolean).length;
      $('#pr', el).innerHTML = `<p><strong>${done}</strong> من ${total} بنداً مكتمل</p><div class="progress"><i style="width:${done / total * 100}%"></i></div>`;
    };
    el.innerHTML = `<div class="panel" id="pr"></div>${Object.entries(CHECK).map(([g, items], gi) => `<div class="panel"><h2>${g}</h2>${items.map((t, i) => { const k = gi + '-' + i; return `<div class="check"><input type="checkbox" id="k${k}" data-k="${k}" ${st[k] ? 'checked' : ''}><label for="k${k}">${t}</label></div>`; }).join('')}</div>`).join('')}
      <div class="btns noprint"><button class="btn ghost" data-print>طباعة القائمة</button><button class="btn ghost" id="rs">بدء بحث جديد (تصفير)</button></div>`;
    el.onchange = e => { if (e.target.dataset.k) { st[e.target.dataset.k] = e.target.checked; store.set('check', st); draw(); } };
    $('#rs', el).onclick = () => { Object.keys(st).forEach(k => delete st[k]); store.set('check', st); $$('input[type=checkbox]', el).forEach(c => c.checked = false); draw(); };
    draw();
  }
});

/* ---------- حاسبة مؤشرات الاستشهاد ---------- */
tool({
  id: 'hindex', cat: 'researcher', title: 'حاسبة مؤشر h و i10 و g',
  desc: 'الصق أعداد الاستشهادات لكل بحث من أي قاعدة بيانات لحساب مؤشرات h و i10 و g والمتوسط.',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="t">عدد استشهادات كل بحث <span class="hint">(مفصولة بفواصل أو مسافات أو أسطر)</span></label><textarea id="t" class="ltr" placeholder="45, 30, 22, 12, 9, 4, 1, 0" required></textarea></div><button class="btn">احسب</button></form><div id="out"></div>`;
    $('#f', el).onsubmit = e => {
      e.preventDefault();
      const c = parseNums($('#t', el).value).filter(x => x >= 0).sort((a, b) => b - a);
      if (!c.length) { $('#out', el).innerHTML = '<div class="verdict warn">أدخل أرقاماً صحيحة.</div>'; return; }
      let g = 0, sum = 0; c.forEach((x, i) => { sum += x; if (sum >= (i + 1) ** 2) g = i + 1; });
      $('#out', el).innerHTML = `<div class="panel"><div class="big"><div><b>${hIndex(c)}</b><span>مؤشر h</span></div><div><b>${c.filter(x => x >= 10).length}</b><span>مؤشر i10</span></div><div><b>${g}</b><span>مؤشر g</span></div><div><b>${c.length}</b><span>عدد البحوث</span></div><div><b>${fmt(sum)}</b><span>مجموع الاستشهادات</span></div><div><b>${fmt(sum / c.length)}</b><span>متوسط لكل بحث</span></div></div>
        <p class="hint">مؤشر h = أكبر عدد h من البحوث نال كلٌّ منها h استشهاداً على الأقل. مؤشر g = أكبر عدد g بحيث مجموع استشهادات أعلى g بحثاً ≥ g².</p></div>`;
    };
  }
});

/* ---------- حاسبة النقاط القابلة للتخصيص ---------- */
const PT_DEFAULT = ['بحث منشور في مجلة ضمن مستوعب عالمي', 'بحث منشور في مجلة محلية محكّمة', 'بحث في مؤتمر علمي', 'كتاب مؤلَّف أو مترجَم', 'إشراف على رسالة أو أطروحة', 'براءة اختراع', 'عضوية لجنة علمية أو مناقشة', 'كتاب شكر أو تكريم علمي'].map(n => ({ n, p: '', c: '' }));
tool({
  id: 'points', cat: 'promotion', title: 'حاسبة نقاط مخصّصة (لأي تعليمات)',
  desc: 'لمن يتبع تعليمات غير العراقية: أنشئ جدول نقاطك بقيم مؤسستك لتحصل على المجموع والمتبقي وتقرير للطباعة.',
  long: 'تختلف نقاط كل نشاط باختلاف التعليمات النافذة في بلدك ومؤسستك وتُحدَّث دورياً، لذلك لا تفرض هذه الحاسبة قيماً جاهزة: أدخل قيمة النقاط لكل نشاط من نص التعليمات الرسمي لديك، وتُحفظ بياناتك على جهازك فقط.',
  render(el) {
    let d = store.get('points', { target: '', rows: PT_DEFAULT });
    const save = () => store.set('points', d);
    const draw = () => {
      const tot = d.rows.reduce((s, r) => s + (parseFloat(r.p) || 0) * (parseFloat(r.c) || 0), 0), tg = parseFloat(d.target) || 0;
      el.innerHTML = `<div class="panel"><div class="row"><div class="field"><label for="tg">النقاط المطلوبة للترقية <span class="hint">(من التعليمات)</span></label><input type="number" id="tg" min="0" step="any" value="${esc(d.target)}"></div></div>
        <div class="tbl-wrap"><table><thead><tr><th>النشاط العلمي</th><th>نقاط الواحد</th><th>العدد</th><th class="num">المجموع</th><th></th></tr></thead><tbody>
        ${d.rows.map((r, i) => `<tr><td><input type="text" data-i="${i}" data-k="n" value="${esc(r.n)}" aria-label="النشاط"></td><td style="width:120px"><input type="number" min="0" step="any" data-i="${i}" data-k="p" value="${esc(r.p)}" aria-label="نقاط الواحد"></td><td style="width:100px"><input type="number" min="0" step="any" data-i="${i}" data-k="c" value="${esc(r.c)}" aria-label="العدد"></td><td class="num" data-sum="${i}">${fmt((parseFloat(r.p) || 0) * (parseFloat(r.c) || 0))}</td><td class="noprint"><button class="btn ghost sm" data-del="${i}" aria-label="حذف">✕</button></td></tr>`).join('')}
        </tbody></table></div>
        <div class="btns noprint" style="margin-top:12px"><button class="btn ghost" id="add">+ إضافة نشاط</button><button class="btn ghost" data-print>طباعة التقرير</button><button class="btn ghost" id="reset">إعادة ضبط</button></div></div>
        <div class="panel" id="res"></div>`;
      res();
    };
    const res = () => {
      const tot = d.rows.reduce((s, r) => s + (parseFloat(r.p) || 0) * (parseFloat(r.c) || 0), 0), tg = parseFloat(d.target) || 0;
      $('#res', el).innerHTML = `<div class="big"><div><b>${fmt(tot)}</b><span>مجموع نقاطك</span></div>${tg ? `<div><b>${fmt(tg)}</b><span>المطلوب</span></div><div><b>${fmt(Math.max(0, tg - tot))}</b><span>المتبقي</span></div>` : ''}</div>
        ${tg ? `<div class="progress"><i style="width:${Math.min(100, tot / tg * 100)}%"></i></div><p style="margin-top:10px">${tot >= tg ? '<span class="badge ok">استوفيت النقاط المطلوبة</span>' : `<span class="badge warn">أنجزت ${fmt(tot / tg * 100)}% من المطلوب</span>`}</p>` : '<p class="hint">أدخل النقاط المطلوبة لعرض نسبة الإنجاز.</p>'}`;
    };
    el.oninput = e => {
      const t = e.target;
      if (t.id === 'tg') d.target = t.value;
      else if (t.dataset.k) { d.rows[t.dataset.i][t.dataset.k] = t.value; const r = d.rows[t.dataset.i]; $(`[data-sum="${t.dataset.i}"]`, el).textContent = fmt((parseFloat(r.p) || 0) * (parseFloat(r.c) || 0)); }
      else return;
      save(); res();
    };
    el.onclick = e => {
      if (e.target.id === 'add') d.rows.push({ n: '', p: '', c: '' });
      else if (e.target.id === 'reset') d = { target: '', rows: PT_DEFAULT.map(r => ({ ...r })) };
      else if (e.target.dataset.del != null) d.rows.splice(+e.target.dataset.del, 1);
      else return;
      save(); draw();
    };
    draw();
  }
});

/* ---------- حجم العينة ---------- */
tool({
  id: 'sample', cat: 'grad', title: 'حاسبة حجم العينة',
  desc: 'احسب حجم العينة المناسب بمعادلة كوكران مع تصحيح المجتمع المحدود ومعادلة يامان (ثومبسون).',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="row">
      <div class="field"><label for="N">حجم المجتمع <span class="hint">(اتركه فارغاً إن كان غير معلوم)</span></label><input type="number" id="N" min="1"></div>
      <div class="field"><label for="cl">مستوى الثقة</label><select id="cl"><option value="1.645">90%</option><option value="1.96" selected>95%</option><option value="2.576">99%</option></select></div>
      <div class="field"><label for="e">هامش الخطأ %</label><input type="number" id="e" value="5" min="0.1" max="50" step="0.1" required></div>
      <div class="field"><label for="p">نسبة الخاصية المتوقعة % <span class="hint">(50 إن لم تُعرف)</span></label><input type="number" id="p" value="50" min="1" max="99" required></div>
      <div class="field"><label for="nr">نسبة عدم الاستجابة المتوقعة %</label><input type="number" id="nr" value="0" min="0" max="90"></div></div>
      <button class="btn">احسب</button></form><div id="out"></div>`;
    $('#f', el).onsubmit = e => {
      e.preventDefault();
      const N = +$('#N', el).value || 0, z = +$('#cl', el).value, er = +$('#e', el).value / 100, p = +$('#p', el).value / 100, nr = +$('#nr', el).value / 100;
      const n0 = z * z * p * (1 - p) / (er * er), n = N ? n0 / (1 + (n0 - 1) / N) : n0, ym = N ? N / (1 + N * er * er) : null;
      const fin = Math.ceil(n), adj = Math.ceil(fin / (1 - nr));
      $('#out', el).innerHTML = `<div class="panel"><div class="big"><div><b>${fmt(fin)}</b><span>حجم العينة (كوكران${N ? ' مع تصحيح المجتمع' : ''})</span></div>${nr ? `<div><b>${fmt(adj)}</b><span>بعد تعويض عدم الاستجابة</span></div>` : ''}${ym ? `<div><b>${fmt(Math.ceil(ym))}</b><span>معادلة يامان</span></div>` : ''}${N ? `<div><b>${fmt(fin / N * 100)}%</b><span>نسبة العينة من المجتمع</span></div>` : ''}</div>
        <h3>طريقة الحساب</h3><p class="ltr">n₀ = Z²·p·(1−p) / e² = ${z}² × ${p} × ${fmt(1 - p)} / ${er}² = ${fmt(n0)}</p>
        ${N ? `<p class="ltr">n = n₀ / (1 + (n₀ − 1)/N) = ${fmt(n0)} / (1 + ${fmt(n0 - 1)}/${N}) = ${fmt(n)}</p><p class="ltr">Yamane: n = N / (1 + N·e²) = ${fmt(ym)}</p>` : ''}
        <p class="hint">هذه المعادلات للعينات العشوائية البسيطة في الدراسات المسحية. التصاميم التجريبية واختبارات الفروق تحتاج إلى تحليل القوة الإحصائية (Power Analysis).</p>
        <div class="btns noprint"><button class="btn ghost" data-print>طباعة</button></div></div>`;
    };
  }
});

/* ---------- كرونباخ ألفا ---------- */
tool({
  id: 'alpha', cat: 'grad', title: 'معامل الثبات كرونباخ ألفا',
  desc: 'الصق بيانات الاستبانة (صف لكل مستجيب وعمود لكل فقرة) لحساب ألفا وقيمته عند حذف كل فقرة.',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="t">بيانات الاستبانة <span class="hint">(يمكن اللصق مباشرة من Excel: كل صف مستجيب، وكل عمود فقرة)</span></label>
      <textarea id="t" class="ltr" rows="9" placeholder="4 5 4 3 5&#10;3 4 4 3 4&#10;5 5 4 4 5&#10;2 3 2 2 3" required></textarea></div><button class="btn">احسب الثبات</button></form><div id="out"></div>`;
    const alpha = M => { const k = M[0].length; if (k < 2) return NaN; const iv = Array.from({ length: k }, (_, j) => variance(M.map(r => r[j]))); const tv = variance(M.map(r => r.reduce((a, b) => a + b, 0))); return k / (k - 1) * (1 - iv.reduce((a, b) => a + b, 0) / tv); };
    $('#f', el).onsubmit = e => {
      e.preventDefault();
      const M = $('#t', el).value.split(/\n+/).map(parseNums).filter(r => r.length), out = $('#out', el);
      const k = M[0]?.length;
      if (M.length < 3 || k < 2 || M.some(r => r.length !== k)) { out.innerHTML = '<div class="verdict warn">يلزم 3 مستجيبين وفقرتان على الأقل، وأن تتساوى أعداد القيم في كل الصفوف.</div>'; return; }
      const a = alpha(M), lv = a >= .9 ? 'ممتاز' : a >= .8 ? 'جيد' : a >= .7 ? 'مقبول' : a >= .6 ? 'مشكوك فيه' : 'ضعيف';
      out.innerHTML = `<div class="panel"><div class="big"><div><b>${fmt(a)}</b><span>كرونباخ ألفا — ${lv}</span></div><div><b>${k}</b><span>عدد الفقرات</span></div><div><b>${M.length}</b><span>عدد المستجيبين</span></div></div>
        <div class="tbl-wrap"><table><thead><tr><th>الفقرة</th><th class="num">المتوسط</th><th class="num">الانحراف المعياري</th><th class="num">ألفا عند حذف الفقرة</th><th></th></tr></thead><tbody>
        ${Array.from({ length: k }, (_, j) => { const col = M.map(r => r[j]), ad = k > 2 ? alpha(M.map(r => r.filter((_, x) => x !== j))) : NaN; return `<tr><td>الفقرة ${j + 1}</td><td class="num">${fmt(mean(col))}</td><td class="num">${fmt(Math.sqrt(variance(col)))}</td><td class="num">${fmt(ad)}</td><td>${ad > a + .005 ? '<span class="badge warn">حذفها يرفع الثبات</span>' : ''}</td></tr>`; }).join('')}</tbody></table></div>
        <p class="hint">التفسير الشائع: ≥ 0.90 ممتاز، ≥ 0.80 جيد، ≥ 0.70 مقبول. تأكد من عكس ترميز الفقرات السلبية قبل الحساب.</p>
        <div class="btns noprint"><button class="btn ghost" data-print>طباعة</button></div></div>`;
    };
  }
});

/* ---------- الإحصاء الوصفي ---------- */
tool({
  id: 'descriptive', cat: 'grad', title: 'الإحصاء الوصفي السريع',
  desc: 'الصق عموداً من الأرقام لتحصل على المتوسط والوسيط والانحراف المعياري والربيعيات وفترة الثقة 95%.',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="field"><label for="t">البيانات</label><textarea id="t" class="ltr" placeholder="12.5, 14, 11.8, 15.2, 13.9" required></textarea></div><button class="btn">حلّل</button></form><div id="out"></div>`;
    $('#f', el).onsubmit = e => {
      e.preventDefault();
      const a = parseNums($('#t', el).value), n = a.length, out = $('#out', el);
      if (n < 2) { out.innerHTML = '<div class="verdict warn">أدخل قيمتين على الأقل.</div>'; return; }
      const s = a.slice().sort((x, y) => x - y), m = mean(a), v = variance(a), sd = Math.sqrt(v), se = sd / Math.sqrt(n), t = n - 1 <= 30 ? T95[n - 2] : 1.96;
      const freq = {}; a.forEach(x => freq[x] = (freq[x] || 0) + 1); const mf = Math.max(...Object.values(freq));
      const mode = mf > 1 ? Object.keys(freq).filter(k => freq[k] === mf).join(', ') : 'لا يوجد';
      const skew = n > 2 && sd ? n / ((n - 1) * (n - 2)) * a.reduce((q, x) => q + ((x - m) / sd) ** 3, 0) : NaN;
      const rows = [['العدد (n)', n], ['المتوسط الحسابي', m], ['الوسيط', quant(s, .5)], ['المنوال', mode], ['الانحراف المعياري', sd], ['التباين', v], ['الخطأ المعياري', se], ['معامل الاختلاف %', m ? sd / m * 100 : NaN], ['أصغر قيمة', s[0]], ['الربيع الأول Q1', quant(s, .25)], ['الربيع الثالث Q3', quant(s, .75)], ['أكبر قيمة', s[n - 1]], ['المدى', s[n - 1] - s[0]], ['الالتواء', skew], ['فترة الثقة 95% للمتوسط', `${fmt(m - t * se)} — ${fmt(m + t * se)}`]];
      out.innerHTML = `<div class="panel"><div class="tbl-wrap"><table><tbody>${rows.map(r => `<tr><th>${r[0]}</th><td class="num ltr">${typeof r[1] === 'number' ? fmt(r[1]) : esc(r[1])}</td></tr>`).join('')}</tbody></table></div>
        <div class="btns noprint" style="margin-top:12px">${copyBtn(rows.map(r => r[0] + '\t' + (typeof r[1] === 'number' ? fmt(r[1]) : r[1])).join('\n'), 'نسخ الجدول')}<button class="btn ghost sm" data-print>طباعة</button></div></div>`;
    };
  }
});

/* ---------- المخطط الزمني للرسالة ---------- */
const PHASES = [['اختيار الموضوع وإعداد خطة البحث', 10], ['مراجعة الدراسات السابقة والإطار النظري', 20], ['المنهجية وتصميم الأدوات', 10], ['جمع البيانات أو تنفيذ التجارب', 25], ['التحليل ومناقشة النتائج', 15], ['كتابة الفصول وصياغتها النهائية', 12], ['المراجعة والتدقيق وفحص الاستلال', 5], ['التهيئة للمناقشة', 3]];
tool({
  id: 'timeline', cat: 'grad', title: 'مخطط زمني للرسالة أو الأطروحة',
  desc: 'حدّد تاريخ البدء والتسليم لتحصل على جدول زمني بمراحل البحث وتواريخها ومخطط غانت، مع إمكان تعديل نسب المراحل.',
  render(el) {
    const today = new Date(), iso = d => d.toISOString().slice(0, 10), end = new Date(today); end.setFullYear(end.getFullYear() + 1);
    el.innerHTML = `<form class="panel" id="f"><div class="row"><div class="field"><label for="s">تاريخ البدء</label><input type="date" id="s" value="${iso(today)}" required></div><div class="field"><label for="e">تاريخ التسليم</label><input type="date" id="e" value="${iso(end)}" required></div></div>
      <label>المراحل ونسبة كلٍّ منها من المدة %</label>${PHASES.map((p, i) => `<div class="row" style="grid-template-columns:1fr 90px;margin-bottom:6px"><input type="text" data-n="${i}" value="${p[0]}" aria-label="اسم المرحلة"><input type="number" data-w="${i}" value="${p[1]}" min="0" aria-label="النسبة"></div>`).join('')}
      <button class="btn" style="margin-top:10px">أنشئ المخطط</button></form><div id="out"></div>`;
    $('#f', el).onsubmit = e => {
      e.preventDefault();
      const s = new Date($('#s', el).value), en = new Date($('#e', el).value), out = $('#out', el), days = (en - s) / 864e5;
      if (!(days > 7)) { out.innerHTML = '<div class="verdict warn">تاريخ التسليم يجب أن يكون بعد تاريخ البدء بأسبوع على الأقل.</div>'; return; }
      const ph = PHASES.map((_, i) => [$(`[data-n="${i}"]`, el).value, +$(`[data-w="${i}"]`, el).value || 0]).filter(p => p[1] > 0), tw = ph.reduce((a, p) => a + p[1], 0);
      let acc = 0; const df = d => d.toLocaleDateString('ar-IQ-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' });
      const rows = ph.map(p => { const a = acc, b = acc + p[1] / tw * days; acc = b; return { n: p[0], a, b, from: new Date(+s + a * 864e5), to: new Date(+s + b * 864e5) }; });
      out.innerHTML = `<div class="panel"><p>المدة الكلية: <strong>${Math.round(days)}</strong> يوماً (${fmt(days / 30.44)} شهراً)</p>
        <div class="tbl-wrap"><table><thead><tr><th>المرحلة</th><th>من</th><th>إلى</th><th class="num">الأيام</th><th style="min-width:180px">المخطط</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.n)}</td><td>${df(r.from)}</td><td>${df(r.to)}</td><td class="num">${Math.round(r.b - r.a)}</td><td><div class="gantt"><div class="g"><i style="left:${r.a / days * 100}%;width:${(r.b - r.a) / days * 100}%"></i></div></div></td></tr>`).join('')}</tbody></table></div>
        <div class="btns noprint" style="margin-top:12px"><button class="btn ghost" data-print>طباعة</button><button class="btn ghost" id="csv">تنزيل CSV</button></div></div>`;
      $('#csv').onclick = () => download('thesis-timeline.csv', 'المرحلة,من,إلى,الأيام\n' + rows.map(r => `"${r.n}",${iso(r.from)},${iso(r.to)},${Math.round(r.b - r.a)}`).join('\n'), 'text/csv');
    };
  }
});

/* ---------- محلل النص ---------- */
const STOP = new Set('في من على الى عن مع هذا هذه ذلك التي الذي ان او ثم قد كان كانت لا ما لم لن هو هي بين كل بعد قبل حيث كما اذا عند حتى اي به بها له لها فيه فيها وهو وهي الا the of and to in a is that for on with as by an be are was were this it at from or which not have has but'.split(' '));
tool({
  id: 'text-stats', cat: 'writing', title: 'محلل النص والملخص',
  desc: 'عدّ الكلمات والجمل، تحقق من حد كلمات الملخص، واكشف الجمل الطويلة والكلمات المكررة — يدعم العربية والإنجليزية.',
  render(el) {
    el.innerHTML = `<div class="panel"><div class="field"><label for="t">النص</label><textarea id="t" rows="10" dir="auto" placeholder="الصق الملخص أو أي فقرة هنا…"></textarea></div>
      <div class="row"><div class="field"><label for="lim">الحد الأقصى للكلمات <span class="hint">(اختياري، مثلاً 250 للملخص)</span></label><input type="number" id="lim" min="1"></div></div></div><div id="out"></div>`;
    const run = () => {
      const t = $('#t', el).value, lim = +$('#lim', el).value, out = $('#out', el);
      if (!t.trim()) { out.innerHTML = ''; return; }
      const w = wordsOf(t), sent = t.split(/[.!?؟…]+(?:\s|$)|\n+/).map(s => s.trim()).filter(s => wordsOf(s).length), paras = t.split(/\n\s*\n|\n/).filter(s => s.trim()).length;
      const fr = {}; w.forEach(x => { if (x.length > 2 && !STOP.has(x) && !STOP.has(x.replace(/^(ال|وال|بال|لل|و)/, ''))) fr[x] = (fr[x] || 0) + 1; });
      const top = Object.entries(fr).filter(x => x[1] > 1).sort((a, b) => b[1] - a[1]).slice(0, 12), long = sent.filter(s => wordsOf(s).length > 30);
      out.innerHTML = `<div class="panel">${lim ? `<div class="verdict ${w.length > lim ? 'bad' : 'ok'}">${w.length > lim ? `تجاوزت الحد بـ ${w.length - lim} كلمة` : `ضمن الحد — بقي ${lim - w.length} كلمة`}</div>` : ''}
        <div class="big"><div><b>${fmt(w.length)}</b><span>كلمة</span></div><div><b>${fmt(t.length)}</b><span>حرفاً مع المسافات</span></div><div><b>${fmt(t.replace(/\s/g, '').length)}</b><span>حرفاً بلا مسافات</span></div><div><b>${sent.length}</b><span>جملة</span></div><div><b>${paras}</b><span>فقرة</span></div><div><b>${fmt(w.length / (sent.length || 1))}</b><span>متوسط كلمات الجملة</span></div><div><b>${Math.max(1, Math.round(w.length / 200))} د</b><span>زمن القراءة</span></div><div><b>${fmt(new Set(w).size / (w.length || 1) * 100)}%</b><span>تنوع المفردات</span></div></div>
        ${top.length ? `<h3>أكثر الكلمات تكراراً</h3><p>${top.map(x => `<span class="badge mute">${esc(x[0])} × ${x[1]}</span>`).join(' ')}</p>` : ''}
        ${long.length ? `<h3>جمل طويلة (أكثر من 30 كلمة) يُستحسن تقسيمها</h3>${long.map(s => `<p class="note" dir="auto">${esc(s)} <span class="hint">(${wordsOf(s).length} كلمة)</span></p>`).join('')}` : ''}</div>`;
    };
    $('#t', el).oninput = run; $('#lim', el).oninput = run;
  }
});

/* ---------- مقارنة نصين ---------- */
tool({
  id: 'compare', cat: 'writing', title: 'قياس التشابه بين نصين',
  desc: 'قارن فقرتك بالنص الأصلي لمعرفة نسبة العبارات المتطابقة وتظليلها — مفيد عند إعادة الصياغة.',
  long: 'تقارن الأداة النصين محلياً بتقسيمهما إلى عبارات من ثلاث كلمات متتالية. هي أداة مساعدة لإعادة الصياغة، وليست بديلاً عن برامج فحص الاستلال التي تقارن بقواعد بيانات منشورة.',
  render(el) {
    el.innerHTML = `<form class="panel" id="f"><div class="row" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))"><div class="field"><label for="a">النص الأصلي (المصدر)</label><textarea id="a" dir="auto" rows="9" required></textarea></div><div class="field"><label for="b">نصك (بعد إعادة الصياغة)</label><textarea id="b" dir="auto" rows="9" required></textarea></div></div><button class="btn">قارن</button></form><div id="out"></div>`;
    $('#f', el).onsubmit = e => {
      e.preventDefault();
      const A = wordsOf($('#a', el).value), raw = $('#b', el).value, out = $('#out', el);
      const tk = raw.match(/[A-Za-z0-9؀-ۿ]+(?:['’-][A-Za-z]+)*|[^A-Za-z0-9؀-ۿ]+/g) || [], wi = [], B = [];
      tk.forEach((x, i) => { if (/[A-Za-z0-9؀-ۿ]/.test(x)) { wi.push(i); B.push(normAr(x)); } });
      if (A.length < 3 || B.length < 3) { out.innerHTML = '<div class="verdict warn">كل نص يحتاج ثلاث كلمات على الأقل.</div>'; return; }
      const sh = a => a.slice(0, -2).map((_, i) => a.slice(i, i + 3).join(' ')), SA = new Set(sh(A)), sb = sh(B), SB = new Set(sb);
      const hit = new Array(B.length).fill(false); sb.forEach((s, i) => { if (SA.has(s)) hit[i] = hit[i + 1] = hit[i + 2] = true; });
      const inter = [...SB].filter(x => SA.has(x)).length, jac = inter / (SA.size + SB.size - inter) * 100, pct = hit.filter(Boolean).length / B.length * 100;
      const mk = new Set(wi.filter((_, i) => hit[i]));
      out.innerHTML = `<div class="verdict ${pct > 40 ? 'bad' : pct > 15 ? 'warn' : 'ok'}">${fmt(pct)}% من كلمات نصك تقع ضمن عبارات مطابقة للمصدر${pct > 40 ? ' — الصياغة ما زالت قريبة جداً من الأصل.' : pct > 15 ? ' — راجع المقاطع المظللة.' : '.'}</div>
        <div class="panel"><div class="big"><div><b>${fmt(pct)}%</b><span>كلمات ضمن عبارات مطابقة</span></div><div><b>${fmt(jac)}%</b><span>تشابه جاكارد للعبارات الثلاثية</span></div><div><b>${inter}</b><span>عبارة ثلاثية مشتركة</span></div></div>
        <h3>نصك مع تظليل المقاطع المطابقة</h3><p dir="auto" style="white-space:pre-wrap">${tk.map((x, i) => mk.has(i) ? `<mark>${esc(x)}</mark>` : esc(x)).join('')}</p></div>`;
    };
  }
});

/* ---------- باني عبارة البحث ---------- */
tool({
  id: 'boolean', cat: 'writing', title: 'باني عبارة البحث المتقدم (Boolean)',
  desc: 'أدخل مفاهيم بحثك ومرادفاتها لتحصل على عبارة بحث جاهزة بصيغ Scopus و Web of Science و PubMed و Google Scholar.',
  render(el) {
    let groups = 3;
    const draw = keep => {
      const old = keep ? $$('textarea', el).map(t => t.value) : [];
      el.innerHTML = `<form class="panel" id="f"><p class="hint">كل مربع يمثّل مفهوماً واحداً؛ اكتب مرادفاته بالإنجليزية، كل مرادف في سطر. تُربط المرادفات بـ OR والمفاهيم بـ AND.</p>
        <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${Array.from({ length: groups }, (_, i) => `<div class="field"><label for="g${i}">المفهوم ${i + 1}</label><textarea id="g${i}" class="ltr" style="min-height:110px" placeholder="${['concrete\ncementitious composite', 'machine learning\nneural network*\ndeep learning', 'compressive strength'][i] || ''}">${esc(old[i] || '')}</textarea></div>`).join('')}</div>
        <div class="btns"><button class="btn">ابنِ العبارة</button><button type="button" class="btn ghost" id="add">+ مفهوم آخر</button></div></form><div id="out"></div>`;
      $('#add', el).onclick = () => { groups++; draw(true); };
      $('#f', el).onsubmit = e => {
        e.preventDefault();
        const G = $$('textarea', el).map(t => t.value.split(/\n+/).map(s => s.trim()).filter(Boolean)).filter(g => g.length);
        if (!G.length) { $('#out', el).innerHTML = '<div class="verdict warn">أدخل مفهوماً واحداً على الأقل.</div>'; return; }
        const qt = s => /\s/.test(s) && !/^".*"$/.test(s) ? `"${s}"` : s, core = G.map(g => '(' + g.map(qt).join(' OR ') + ')').join(' AND ');
        const forms = { 'Scopus': `TITLE-ABS-KEY(${core})`, 'Web of Science': `TS=(${core})`, 'PubMed': G.map(g => '(' + g.map(s => qt(s) + '[tiab]').join(' OR ') + ')').join(' AND '), 'IEEE Xplore / عام': core, 'Google Scholar': G.map(g => g.length > 1 ? '(' + g.map(s => qt(s.replace(/\*/g, ''))).join(' OR ') + ')' : qt(g[0].replace(/\*/g, ''))).join(' ') };
        $('#out', el).innerHTML = `<div class="panel">${Object.entries(forms).map(([k, v]) => `<h3>${k}</h3><div class="cite-out">${esc(v)}</div><div class="btns" style="margin-bottom:12px">${copyBtn(v)}${k === 'Google Scholar' ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="https://scholar.google.com/scholar?q=${encodeURIComponent(v)}">افتح في Scholar ↗</a>` : ''}</div>`).join('')}
          <p class="hint">علامة النجمة * تلتقط كل تصريفات الكلمة (network* = network, networks). Google Scholar لا يدعمها فتُحذف تلقائياً.</p></div>`;
      };
    };
    draw();
  }
});
