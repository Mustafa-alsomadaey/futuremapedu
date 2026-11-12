/* الترقية العلمية (العراق): الحاسبتان، نص التعليمات، مسار المعاملة، وحاسبة درجة المناقشة.
   القيم منقولة من جدولَي التعليمات رقم (10) لسنة 2025 ورقم (167) لسنة 2017. */
const RANKS = { mudarris: 'مدرس', asst: 'أستاذ مساعد', prof: 'أستاذ' };
const REQ = { mudarris: { t1: 46, t2: 24, years: 3, papers: 2, centre: 4 }, asst: { t1: 52, t2: 28, years: 4, papers: 3, centre: 5 }, prof: { t1: 59, t2: 31, years: 6, papers: 3, centre: 5 } };
const POS6 = [['الباحث الأول', 1], ['الباحث الثاني', .8], ['الباحث الثالث', .7], ['الباحث الرابع', .5], ['الباحث الخامس', .4], ['ما بعد الخامس', .2]];
const PROMO = {
  2025: {
    name: 'تعليمات رقم (10) لسنة 2025', pos: POS6, admin: true, centre: true,
    t1: { sci: [['مجلة علمية ذات معامل تأثير (IF أو CiteScore)', { mudarris: 30, asst: 20, prof: 20 }], ['مجلة علمية عراقية معتمدة من الوزارة', { mudarris: 20, asst: 15, prof: 10 }]] },
    t2: [
      { t: 'كتاب مؤلف أو مترجم حاصل على ISBN', n: 'يُحسب لمرة واحدة، ونقاطه بين 3 و10 بحسب جهة النشر وعدد المؤلفين كما في الجدول الملحق بالتعليمات.', manual: [3, 10] },
      { t: 'فصل كتاب (Book Chapter)', p: 3, max: 2, cap: 6 },
      { t: 'بحث منشور في مؤتمر علمي (داخل العراق أو خارجه)', n: 'بحث واحد حصراً، منشور بأكمله في وقائع مؤتمر مفهرسة في Scopus أو Web of Science (المادة 7/ثالثاً).', p: 5, max: 1, cap: 5, ratio: 1 },
      { t: 'دراسة علمية تعالج مشكلة في المجتمع العراقي', n: 'دراسة واحدة مقدمة إلى جهة رسمية ومصادق عليها.', opts: [['في التخصص', 10], ['خارج التخصص', 5]], cap: 10, ratio: 1 },
      { t: 'الاستشهاد بالبحوث المنشورة في Scopus والمجلات المحلية', n: 'نقطة لكل 10 استشهادات.', per: 10, cap: 5, unit: 'عدد الاستشهادات' },
      { t: 'مقال مراجعة (Review) أو دراسة حالة (Case Study)', n: 'في مجلات ضمن الربع الأول أو الثاني أو الثالث ومستوفية للمادة (9).', p: 5, max: 2, cap: 10, ratio: 1 },
      { t: 'مقال علمي في مجلة أو منصة عامة (غير محكمة)', n: 'صادرة عن جهة معتمدة من دائرة البحث والتطوير.', p: 2, max: 2, cap: 5 },
      { t: 'براءة اختراع', n: 'واحدة فقط، مصادق عليها رسمياً.', opts: [['دولية', 25], ['محلية', 5]], cap: 25 },
      { t: 'أوسمة علمية أو ميداليات أولمبية', n: 'بأمر أو مرسوم من جهات رسمية، ولا تُعتمد الصادرة عن منظمات المجتمع المدني.', multi: [['دولية', 10], ['محلية', 3]], cap: 10 },
      { t: 'تقييم بحث أو مراجعة كتاب أو تقييم رسائل وأطاريح — داخل العراق', p: 1, max: 5, cap: 5 },
      { t: 'تقييم بحث أو مراجعة كتاب أو تقييم رسائل وأطاريح — خارج العراق', p: 2, max: 3, cap: 6 },
      { t: 'المشاركة في اللجان الامتحانية', n: 'لجنة واحدة لكل عام دراسي.', p: 1, max: 5, cap: 5 },
      { t: 'لجان مناقشة الدبلوم العالي والماجستير والدكتوراه والبورد العراقي', p: 1, max: 5, cap: 5 },
      { t: 'اللجان العلمية ولجان الترقيات العلمية', p: 1, max: 5, cap: 5 },
      { t: 'العضوية في نقابة الأكاديميين العراقيين', p: 3, max: 1, cap: 3 },
      { t: 'العضوية في النقابات الأكاديمية المهنية والجمعيات العلمية ضمن الاختصاص', p: 1, max: 6, cap: 6 },
      { t: 'المشاركة في لجان المؤتمرات (تحضيرية، علمية، استقبال)', p: 1, max: 5, cap: 5 },
      { t: 'عضوية لجان الندوات وورش العمل', p: 1, max: 5, cap: 5 },
      { t: 'المشاركة في اللجان الوزارية (داخل وخارج الوزارة)', p: 1, max: 5, cap: 5 },
      { t: 'المشاركة في استحداث الأقسام العلمية', p: 1, max: 5, cap: 5 },
      { t: 'محاضر في دورات تدريبية أو في التعليم المستمر', p: 1, max: 5, cap: 5 },
      { t: 'الإرشاد التربوي أو الإشراف التربوي', p: 1, max: 5, cap: 5 },
      { t: 'الإشراف على طلبة الدبلوم العالي والماجستير', opts: [['طالب واحد', 2], ['طالبان أو أكثر', 4]], cap: 4 },
      { t: 'الإشراف على طلبة الدكتوراه والبورد العراقي', opts: [['طالب واحد', 3], ['طالبان أو أكثر', 6]], cap: 6 },
      { t: 'النشاطات اللاصفية للطلبة', n: 'إشراف على ابتكار أو عمل تطوعي أو مهرجان.', p: 1, max: 5, cap: 5 },
      { t: 'الإشراف على الأقسام الداخلية', n: 'نقطتان عن كل عام تكليف.', p: 2, max: 3, cap: 6 },
      { t: 'تعاون تربوي مع جامعات ومنظمات عالمية', p: 2, max: 3, cap: 6 },
      { t: 'العمل في المستشفيات التعليمية', n: 'للمجموعة الطبية حصراً، لسنة تقويمية ولمرة واحدة.', p: 15, max: 1, cap: 15 },
      { t: 'رئيس أو مدير تحرير مجلة علمية معتمدة', p: 10, max: 1, cap: 10 },
      { t: 'عضو هيئة تحرير مجلة علمية معتمدة', p: 5, max: 1, cap: 5 },
      { t: 'مؤشر هيرتش (H-index)', n: 'نقطة لكل قيمة H من Scopus تزيد على القيمة المطلوبة للترقية.', p: 1, max: 10, cap: 10, unit: 'الزيادة على المطلوب' },
      { t: 'الإسهام في الأنشطة الرياضية للوزارة', p: 2, max: 1, cap: 2 },
      { t: 'نشاطات توظيف الخريجين وإيجاد فرص عمل لهم', p: 1, max: 5, cap: 5 },
      { t: 'المشاركة في لجان الجرد', p: 1, max: 3, cap: 3 },
      { t: 'معدل تقييم الأداء', opts: [['من 70 إلى 79', 4], ['من 80 إلى 89', 6], ['من 90 إلى 99', 8]], cap: 8 },
      { t: 'نشاطات إبداعية وأعمال مميزة أخرى', n: 'موثقة من القسم ومصادق عليها في مجلس الكلية.', p: 1, max: 2, cap: 2 }
    ]
  },
  2017: {
    name: 'تعليمات رقم (167) لسنة 2017', pos: POS6.slice(0, 3),
    t1: {
      sci: [['مجلة ضمن المستوعبات العالمية (Scopus أو Clarivate)', { mudarris: 30, asst: 20, prof: 20 }], ['مجلة عالمية', { mudarris: 20, asst: 15, prof: 10 }], ['مجلة عربية أو عراقية رصينة', { mudarris: 15, asst: 10, prof: 5 }]],
      hum: { mudarris: [20, 15, 10], asst: [15, 10, 5], prof: [15, 10, 5] }
    },
    t2: [
      { t: 'كتاب مؤلف أو مترجم حاصل على ISBN', n: 'نقاطه بين 5 و25 بحسب الحالات الواردة في الجدول الملحق بالتعليمات.', manual: [5, 25] },
      { t: 'بحث منشور في مؤتمر علمي داخل العراق', p: 5, max: 1, cap: 5, ratio: 1 },
      { t: 'بحث منشور في مؤتمر علمي خارج العراق', p: 10, max: 1, cap: 10, ratio: 1 },
      { t: 'دراسة علمية تعالج مشكلة في المجتمع العراقي', opts: [['ضمن الاختصاص', 15], ['خارج الاختصاص', 10]], cap: 15, ratio: 1 },
      { t: 'مقال مراجعة الموضوع (Subject Review)', p: 5, max: 2, cap: 10, ratio: 1 },
      { t: 'براءة اختراع دولية', p: 25, max: 1, cap: 25 },
      { t: 'براءة اختراع محلية', p: 10, max: 1, cap: 10 },
      { t: 'أوسمة علمية دولية', p: 10, max: 1, cap: 10 },
      { t: 'أوسمة علمية محلية', p: 5, max: 1, cap: 5 },
      { t: 'تقييم البحوث العلمية أو مراجعة كتاب — داخل العراق', p: 1, max: 5, cap: 5 },
      { t: 'تقييم البحوث العلمية أو مراجعة كتاب — خارج العراق', p: 2, max: 3, cap: 6 },
      { t: 'معدل تقييم الأداء', opts: [['70–79', 6], ['80–89', 8], ['90–99', 10]], cap: 10 },
      { t: 'المشاركة في اللجان الامتحانية', p: 2, max: 5, cap: 10 },
      { t: 'محاضر في دورات تدريبية أو في التعليم المستمر', p: 2, max: 5, cap: 10 },
      { t: 'العمل في المستشفيات التعليمية', p: 15, max: 1, cap: 15 },
      { t: 'رئيس (مدير) تحرير مجلة علمية', p: 10, max: 1, cap: 10 },
      { t: 'عضو في هيئة تحرير المجلة', p: 5, max: 1, cap: 5 },
      { t: 'مسؤول الوحدة الإدارية لضمان الجودة', p: 3, max: 1, cap: 3 },
      { t: 'المشاركة في استحداث الأقسام العلمية', p: 2, max: 5, cap: 10 },
      { t: 'المشاركة في الإشراف التربوي', p: 1, max: 10, cap: 10 },
      { t: 'الإشراف على طلبة الماجستير والدكتوراه خارج العراق', opts: [['طالب ماجستير واحد', 5], ['طالبا ماجستير فأكثر', 10], ['طالب دكتوراه واحد', 10], ['طالبا دكتوراه فأكثر', 20]], cap: 20 },
      { t: 'النشاطات اللاصفية للطلبة', p: 2, max: 5, cap: 10 },
      { t: 'لجان المؤتمرات (تحضيرية، علمية، استقبال)', p: 2, max: 5, cap: 10 },
      { t: 'الإشراف على الأقسام الداخلية', n: '5 نقاط لكل عام تكليف.', p: 5, max: 2, cap: 10 },
      { t: 'المشاركة في اللجان الوزارية', p: 5, max: 2, cap: 10 },
      { t: 'تعاون تربوي مع جامعات ومنظمات عالمية', opts: [['مشاركة واحدة', 5], ['مشاركتان فأكثر', 10]], cap: 10 },
      { t: 'مؤشر هيرتش (H-index)', n: 'نقطة لكل قيمة من قيم المؤشر في Scopus.', p: 1, max: 30, cap: 30, unit: 'قيمة المؤشر' }
    ]
  }
};

function promoCalc(year) {
  const C = PROMO[year];
  return function (el) {
    const key = 'promo' + year;
    let s = Object.assign({ rank: 'mudarris', spec: 'sci', admin: false, centre: false, date: '', papers: [], t2: {} }, store.get(key, {}));
    const save = () => store.set(key, s);
    const paperPts = p => year === 2017 && s.spec === 'hum' ? C.t1.hum[s.rank][p.co || 0] : (C.t1.sci[p.j || 0] || C.t1.sci[0])[1][s.rank] * C.pos[Math.min(p.pos || 0, C.pos.length - 1)][1];
    const itemPts = (it, v = {}) => {
      let x = 0;
      if (it.manual) x = +v.c || 0;
      else if (it.per) x = Math.floor((+v.c || 0) / it.per);
      else if (it.opts) x = v.o ? it.opts[v.o - 1][1] : 0;
      else if (it.multi) x = it.multi.reduce((a, o, i) => a + (+(v['m' + i]) || 0) * o[1], 0);
      else x = Math.min(+v.c || 0, it.max) * it.p;
      if (it.ratio) x *= C.pos[Math.min(+v.pos || 0, C.pos.length - 1)][1];
      return Math.min(x, it.cap || (it.manual ? it.manual[1] : x));
    };
    const posSel = (v, attr) => `<select ${attr} aria-label="تسلسل الباحث">${C.pos.map((p, i) => `<option value="${i}" ${+v === i ? 'selected' : ''}>${p[0]}</option>`).join('')}</select>`;
    const hum = () => year === 2017 && s.spec === 'hum';
    const draw = () => {
      el.innerHTML = `
      <div class="note info">الحاسبة مبنية على جدولَي ${C.name}. نتيجتها استرشادية، والقرار النهائي للجنة الترقيات في كليتك. <a href="#/tool/instructions?y=${year}">نص التعليمات</a></div>
      <div class="panel"><h2>1. المرتبة المطلوبة</h2><div class="row">
        <div class="field"><label for="rank">الترقية إلى مرتبة</label><select id="rank">${Object.entries(RANKS).map(([k, v]) => `<option value="${k}" ${s.rank === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label for="spec">نوع التخصص</label><select id="spec"><option value="sci" ${s.spec === 'sci' ? 'selected' : ''}>علمي</option><option value="hum" ${s.spec === 'hum' ? 'selected' : ''}>إنساني</option></select></div>
        <div class="field"><label for="date">تاريخ الحصول على المرتبة الحالية</label><input type="date" id="date" value="${esc(s.date)}"></div></div>
        ${C.admin ? `<div class="check"><input type="checkbox" id="admin" ${s.admin ? 'checked' : ''}><label for="admin">أشغل منصباً إدارياً مشمولاً بالمادة (10) وأمضيت نصف المدة الأصغرية — تُضاف 5% إلى مجموع كل جدول</label></div>` : ''}
        ${C.centre ? `<div class="check"><input type="checkbox" id="centre" ${s.centre ? 'checked' : ''}><label for="centre">أعمل في مركز بحثي أو وحدة بحثية (المادة 27)</label></div>` : ''}
        <div id="elig"></div></div>
      <div class="panel"><h2>2. البحوث — الجدول (1)</h2>
        ${hum() ? '<p class="hint">في التخصصات الإنسانية (الجدول 1-ب) قيمة البحث ثابتة بحسب عدد المشاركين فيه، ولا تُطبَّق نسبة التسلسل.</p>' : '<p class="hint">نقاط البحث بحسب نوع المجلة وتسلسل اسمك بين المؤلفين (المادة 6).</p>'}
        <div class="tbl-wrap"><table><thead><tr><th>#</th><th>${hum() ? 'نوع المجلة' : 'نوع المجلة'}</th><th>${hum() ? 'عدد المشاركين' : 'تسلسلك'}</th><th class="num">النقاط</th><th></th></tr></thead><tbody>
        ${s.papers.map((p, i) => `<tr><td>${i + 1}</td>
          <td>${hum() ? 'مجلة رصينة عربية أو عراقية' : `<select data-p="${i}" data-k="j" aria-label="نوع المجلة">${C.t1.sci.map((j, x) => `<option value="${x}" ${+p.j === x ? 'selected' : ''}>${j[0]}</option>`).join('')}</select>`}</td>
          <td>${hum() ? `<select data-p="${i}" data-k="co" aria-label="عدد المشاركين">${['منفرد', 'مشترك مع باحث واحد', 'مشترك مع باحثين اثنين'].map((t, x) => `<option value="${x}" ${+p.co === x ? 'selected' : ''}>${t}</option>`).join('')}</select>` : posSel(p.pos, `data-p="${i}" data-k="pos"`)}</td>
          <td class="num" data-pp="${i}">${fmt(paperPts(p))}</td><td><button class="btn ghost sm" data-delp="${i}" aria-label="حذف البحث">✕</button></td></tr>`).join('') || '<tr><td colspan="5" class="hint">لم تُضف بحوثاً بعد.</td></tr>'}
        </tbody></table></div><button class="btn ghost" id="addp" style="margin-top:10px">+ إضافة بحث</button></div>
      <div class="panel"><h2>3. النشاطات وخدمة المجتمع — الجدول (2)</h2><p class="hint">أدخل عدد كل نشاط؛ الحدود القصوى تُطبَّق تلقائياً.</p>
        <div class="tbl-wrap"><table class="t2"><thead><tr><th>ت</th><th>النشاط</th><th>الإدخال</th><th class="num">النقاط</th><th class="num">الحد الأعلى</th></tr></thead><tbody>
        ${C.t2.map((it, i) => {
          const v = s.t2[i] || {};
          const inp = it.opts ? `<select data-i="${i}" data-k="o" aria-label="${esc(it.t)}"><option value="0">—</option>${it.opts.map((o, x) => `<option value="${x + 1}" ${+v.o === x + 1 ? 'selected' : ''}>${o[0]} (${o[1]})</option>`).join('')}</select>` :
            it.multi ? it.multi.map((o, x) => `<label class="hint" style="display:flex;gap:6px;align-items:center;margin:0 0 4px">${o[0]} (${o[1]}) <input type="number" min="0" style="width:74px" data-i="${i}" data-k="m${x}" value="${esc(v['m' + x] || '')}"></label>`).join('') :
            `<input type="number" min="0" ${it.manual ? `max="${it.manual[1]}" step="any" placeholder="${it.manual[0]}–${it.manual[1]}"` : it.per ? '' : `max="${it.max}"`} style="width:96px" data-i="${i}" data-k="c" value="${esc(v.c || '')}" aria-label="${esc(it.unit || it.t)}">${it.unit ? ` <span class="hint">${it.unit}</span>` : it.manual ? ' <span class="hint">نقاط</span>' : it.max > 1 ? ` <span class="hint">× ${it.p}</span>` : ''}`;
          return `<tr><td>${i + 1}</td><td>${esc(it.t)}${it.n ? `<div class="hint">${esc(it.n)}</div>` : ''}</td><td>${inp}${it.ratio ? `<div style="margin-top:4px">${posSel(v.pos, `data-i="${i}" data-k="pos"`)}</div>` : ''}</td><td class="num" data-ip="${i}">${fmt(itemPts(it, v))}</td><td class="num">${it.cap || it.manual[1]}</td></tr>`;
        }).join('')}</tbody></table></div></div>
      <div class="panel" id="res"></div>
      <div class="btns noprint"><button class="btn" data-print>طباعة التقرير / حفظ PDF</button><button class="btn ghost" id="reset">تصفير الحاسبة</button></div>`;
      res();
    };
    const res = () => {
      const R = REQ[s.rank], k = C.admin && s.admin ? 1.05 : 1;
      const t1 = s.papers.reduce((a, p) => a + paperPts(p), 0) * k, t2 = C.t2.reduce((a, it, i) => a + itemPts(it, s.t2[i]), 0) * k, tot = t1 + t2, need = R.t1 + R.t2;
      const np = C.centre && s.centre ? R.centre : R.papers;
      const ok = t1 >= R.t1 && t2 >= R.t2 && s.papers.length >= np;
      const bar = (v, m) => `<div class="progress"><i style="width:${Math.min(100, v / m * 100)}%"></i></div>`;
      const row = (l, v, m) => `<div><b>${fmt(v)} <small>/ ${m}</small></b><span>${l}</span>${bar(v, m)}<span class="badge ${v >= m ? 'ok' : 'warn'}" style="margin-top:6px">${v >= m ? 'مستوفٍ' : 'المتبقي ' + fmt(m - v)}</span></div>`;
      $('#res', el).innerHTML = `<h2>4. النتيجة — الترقية إلى ${RANKS[s.rank]}</h2>
        <div class="verdict ${ok ? 'ok' : 'warn'}">${ok ? 'استوفيت متطلبات النقاط وعدد البحوث وفق الجدولين.' : 'لم تُستوفَ المتطلبات بعد — راجع البنود غير المستوفية أدناه.'}</div>
        <div class="big">${row('الجدول (1) — البحوث', t1, R.t1)}${row('الجدول (2) — النشاطات', t2, R.t2)}${row('المجموع', tot, need)}
        <div><b>${s.papers.length} <small>/ ${np}</small></b><span>عدد البحوث</span><span class="badge ${s.papers.length >= np ? 'ok' : 'warn'}" style="margin-top:6px">${s.papers.length >= np ? 'مستوفٍ' : 'ينقص ' + (np - s.papers.length)}</span></div></div>
        ${k > 1 ? '<p class="hint">أُضيفت نسبة 5% إلى مجموع كل جدول (المادة 10).</p>' : ''}
        <h3>شروط أخرى تتحقق منها اللجنة</h3><ul>
          <li>مدة لا تقل عن ${R.years} سنوات في المرتبة الحالية${s.rank !== 'mudarris' ? '، ويجوز التقديم قبل سنة من استيفائها (المادة 4)' : ''}.</li>
          <li>${np === 2 ? 'بحثان' : np + ' بحوث'} على الأقل ${year === 2025 ? 'منشورة في مجلات علمية محكمة رصينة' : 'ضمن شروط التعليمات'}${s.rank === 'prof' ? '، أصيلة بأغلبية التقييمات' : '، قيّمة'}.</li>
          ${year === 2025 ? '<li>استيفاء متطلب مؤشر هيرتش ضمن Scopus أو Web of Science للتخصصات العلمية فقط؛ قيمته تحددها هيأة الرأي.</li><li>البحوث غير مستلّة من رسالتك أو أطروحتك وغير مقدَّمة في ترقية سابقة ومنجزة خلال مرتبتك الحالية (المادة 5).</li>' : ''}</ul>`;
      const e = $('#elig', el);
      if (s.date) {
        const d = new Date(s.date); d.setFullYear(d.getFullYear() + R.years);
        const early = new Date(d); early.setFullYear(early.getFullYear() - 1);
        const f = x => x.toLocaleDateString('ar-IQ-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
        e.innerHTML = `<p class="note info">تكتمل المدة المطلوبة (${R.years} سنوات) في <strong>${f(d)}</strong>${s.rank !== 'mudarris' ? `، ويحق لك التقديم ابتداءً من <strong>${f(early)}</strong>` : ''}.</p>`;
      } else e.innerHTML = '';
    };
    el.addEventListener('input', e => {
      const t = e.target, d = t.dataset;
      if (t.id === 'rank' || t.id === 'spec') { s[t.id] = t.value; save(); return draw(); }
      if (t.id === 'admin' || t.id === 'centre') s[t.id] = t.checked;
      else if (t.id === 'date') s.date = t.value;
      else if (d.p != null) { s.papers[d.p][d.k] = +t.value; $(`[data-pp="${d.p}"]`, el).textContent = fmt(paperPts(s.papers[d.p])); }
      else if (d.i != null) { (s.t2[d.i] = s.t2[d.i] || {})[d.k] = t.value; $(`[data-ip="${d.i}"]`, el).textContent = fmt(itemPts(C.t2[d.i], s.t2[d.i])); }
      else return;
      save(); res();
    });
    el.addEventListener('click', e => {
      const t = e.target;
      if (t.id === 'addp') s.papers.push({ j: 0, pos: 0, co: 0 });
      else if (t.dataset.delp != null) s.papers.splice(+t.dataset.delp, 1);
      else if (t.id === 'reset') s = { rank: s.rank, spec: s.spec, admin: false, centre: false, date: '', papers: [], t2: {} };
      else return;
      save(); draw();
    });
    draw();
  };
}
tool({ id: 'promo-2025', cat: 'promotion', star: true, title: 'حاسبة الترقية — تعليمات (10) لسنة 2025', desc: 'احسب نقاط الجدولين (1) و(2) وفق التعليمات الجديدة، مع الحدود القصوى ونسبة التسلسل والمنصب الإداري وتاريخ الاستحقاق.', render: promoCalc(2025) });
tool({ id: 'promo-2017', cat: 'promotion', title: 'حاسبة الترقية — تعليمات (167) لسنة 2017', desc: 'الاحتساب وفق تعليمات 2017 للتخصصات العلمية والإنسانية، للمعاملات المروَّجة عليها.', render: promoCalc(2017) });

/* ---------- نص التعليمات وجداولها ---------- */
tool({
  id: 'instructions', cat: 'promotion', title: 'تعليمات الترقيات العلمية وجداول النقاط',
  desc: 'النص الكامل لتعليمات 2025 و2017 مع بحث داخل المواد، وجدولا النقاط، وملف PDF الأصلي.',
  render(el, p) {
    let y = p.y === '2017' ? 2017 : 2025, tab = 'text', q = '';
    const cache = {};
    const tables = () => {
      const C = PROMO[y];
      return `<h3>الجدول (1) — البحوث</h3><div class="tbl-wrap"><table><thead><tr><th>المرتبة / نوع المجلة</th>${C.pos.map(x => `<th class="num">${x[0]}</th>`).join('')}</tr></thead><tbody>
        ${Object.entries(RANKS).map(([k, n]) => `<tr><th colspan="${C.pos.length + 1}">${n} — الحد الأدنى من الجدول (1): ${REQ[k].t1} · المدة: ${REQ[k].years} سنوات · أقل عدد بحوث: ${REQ[k].papers}</th></tr>` + C.t1.sci.map(j => `<tr><td>${j[0]}</td>${C.pos.map(x => `<td class="num">${fmt(j[1][k] * x[1])}</td>`).join('')}</tr>`).join('')).join('')}</tbody></table></div>
        ${C.t1.hum ? `<h3>الجدول (1-ب) — التخصصات الإنسانية</h3><div class="tbl-wrap"><table><thead><tr><th>المرتبة</th><th class="num">منفرد</th><th class="num">مع باحث واحد</th><th class="num">مع باحثين اثنين</th></tr></thead><tbody>${Object.entries(RANKS).map(([k, n]) => `<tr><td>${n}</td>${C.t1.hum[k].map(v => `<td class="num">${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
        <h3>الجدول (2) — النشاطات وخدمة المجتمع</h3><div class="tbl-wrap"><table><thead><tr><th>ت</th><th>النشاط</th><th class="num">النقاط</th><th class="num">أعلى عدد</th><th class="num">الحد الأعلى</th></tr></thead><tbody>
        ${C.t2.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.t)}${it.n ? `<div class="hint">${esc(it.n)}</div>` : ''}</td><td class="num">${it.manual ? it.manual.join('–') : it.per ? `1 لكل ${it.per}` : (it.opts || it.multi) ? (it.opts || it.multi).map(o => `${o[0]}: ${o[1]}`).join('<br>') : it.p}</td><td class="num">${it.max || '—'}</td><td class="num">${it.cap || it.manual[1]}</td></tr>`).join('')}</tbody></table></div>
        <p class="hint">النقاط المطلوبة من الجدول (2): مدرس 24 · أستاذ مساعد 28 · أستاذ 31.</p>`;
    };
    const text = t => {
      const arts = []; let cur = null;
      t.split('\n').forEach(l => { if (/^المادة \(\d+\)$/.test(l)) arts.push(cur = { h: l, b: [] }); else if (cur) cur.b.push(l); });
      const nq = normAr(q), hl = s => { if (!q) return esc(s); const i = normAr(s).indexOf(nq); return i < 0 || normAr(s).length !== s.length ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length)); };
      const list = arts.filter(a => !q || normAr(a.h + ' ' + a.b.join(' ')).includes(nq));
      return `<p class="count">${list.length} مادة${q ? ' مطابقة' : ''}</p>` + (list.map(a => `<div class="item"><h3>${a.h}</h3>${a.b.map(l => `<p style="margin:.3em 0">${hl(l)}</p>`).join('')}</div>`).join('') || '<p class="hint">لا توجد مادة تحتوي هذه العبارة.</p>');
    };
    const draw = async () => {
      el.innerHTML = `<div class="filters"><button class="pill ${y === 2025 ? 'on' : ''}" data-y="2025">تعليمات (10) لسنة 2025</button><button class="pill ${y === 2017 ? 'on' : ''}" data-y="2017">تعليمات (167) لسنة 2017</button></div>
        <div class="filters"><button class="pill ${tab === 'text' ? 'on' : ''}" data-tab="text">نص المواد</button><button class="pill ${tab === 'tables' ? 'on' : ''}" data-tab="tables">جدولا النقاط</button>
        <a class="btn ghost sm" href="data/instructions-${y}.pdf" target="_blank" rel="noopener">النص الأصلي PDF ↗</a><a class="btn sm" href="#/tool/promo-${y}">احسب نقاطك</a></div>
        <div class="panel">${tab === 'text' ? `<div class="field"><input type="search" id="lq" placeholder="ابحث داخل المواد (مثال: الاعتراض، الاقتباس، مؤشر)…" value="${esc(q)}" aria-label="بحث داخل المواد"></div><div id="law">${loading('جارٍ تحميل النص…')}</div>` : tables()}</div>`;
      if (tab !== 'text') return;
      try {
        cache[y] = cache[y] || await (await fetch(`data/law-${y}.txt`)).text();
        $('#law', el).innerHTML = text(cache[y]);
        $('#lq', el).oninput = e => { q = e.target.value.trim(); $('#law', el).innerHTML = text(cache[y]); };
      } catch { $('#law', el).innerHTML = errBox(new Error('تعذّر تحميل نص التعليمات.')); }
    };
    el.onclick = e => { const d = e.target.dataset; if (d.y) { y = +d.y; draw(); } else if (d.tab) { tab = d.tab; draw(); } };
    draw();
  }
});

/* ---------- مسار المعاملة ---------- */
const PATHS = {
  2025: [
    ['تقديم الطلب', 'عضو الهيئة التدريسية', 'طلب تحريري إلى رئيس القسم (أو رئيس الفرع) من تاريخ إكمال المدة المطلوبة، مرفقاً به نسخة من كل بحث أو مؤلَّف وقرص يضم البحوث بصيغة PDF مع روابطها الإلكترونية. للترقية إلى أستاذ مساعد أو أستاذ يجوز التقديم قبل سنة من استيفاء المدة.', '', 'المادة (12/أولاً) · المادة (4/أولاً)'],
    ['رئاسة القسم وفحص الاقتباس', 'رئيس القسم أو الفرع', 'يحيل الطلب مع البحوث وإقرار اللجنة العلمية بشأن الاقتباس والتخصص العام والدقيق إلى لجنة الترقيات في الكلية. فحص الاقتباس يشمل اقتباسات الذكاء الاصطناعي، ولك الاعتراض على نسبته لدى العمادة خلال 10 أيام عمل من تبليغك.', '10 أيام عمل من تقديم الطلب', 'المادة (12/ثانياً وثالثاً)'],
    ['لجنة الترقيات في الكلية', 'لجنة الترقيات العلمية', 'تدقق الطلب؛ فإن لم يكن مستوفياً أبلغت رئيس القسم خلال المدة نفسها، وإن كان مستوفياً أحالت البحوث بكتب سرية إلى ثلاثة خبراء باختصاصك من خارج جامعتك.', '10 أيام عمل من إحالة الطلب', 'المادة (12/خامساً)'],
    ['تقييم الخبراء', 'ثلاثة خبراء', 'إذا انقضت المدة دون إجابة يؤكَّد على الخبراء مرة واحدة، ثم تُرسل البحوث بعد 10 أيام عمل إلى خبراء آخرين بالمواصفات والمدة نفسها. البحوث المنشورة في مجلات Scopus أو Web of Science ذات معامل تأثير والمستوفية لشروط المادة (25) تُعد أصيلة ولا تخضع للتقييم.', '30 يوماً من وصول البحوث', 'المادة (12/سادساً) · المادة (25)'],
    ['التوصية ومجلس الكلية', 'لجنة الترقيات ثم مجلس الكلية', 'تحيل اللجنة المعاملة إلى مجلس الكلية مشفوعة بتوصياتها، ثم يرفع المجلس التوصية إلى لجنة الترقيات المركزية في الجامعة.', 'اللجنة: 10 أيام عمل · المجلس: 15 يوم عمل', 'المادة (12/ثامناً)'],
    ['اللجنة المركزية والمصادقة', 'اللجنة المركزية ثم رئيس الجامعة أو مجلسها', 'تدقق اللجنة المركزية الإجراءات وتُعد خلاصة برأيها تُرفع إلى رئيس الجامعة في ترقية المدرس والأستاذ المساعد، وإلى مجلس الجامعة في ترقية الأستاذية، للإقرار والمصادقة.', '', 'المادة (13/رابعاً)'],
    ['تاريخ منح الترقية', '', 'تُمنح من تاريخ تقديم الطلب المستوفي للمتطلبات أو من تاريخ استكمالها، دون تبعات مالية قبل صدور الأمر الوزاري أو الجامعي.', '', 'المادة (16)'],
    ['إذا رُفضت الترقية أو أُجِّلت', 'لجان الاعتراض', 'يُبلَّغ طالب الترقية بالقرار وأسبابه خلال 10 أيام عمل. له الاعتراض خلال 30 يوماً من تبلّغه: لدى لجنة الاعتراضات المركزية في الجامعة لمرتبتي المدرس والأستاذ المساعد، ولدى لجنة الاعتراضات الوزارية للأستاذية. وتبت اللجنة خلال 30 يوماً من تسلّم الطلب.', '30 يوماً للاعتراض · 30 يوماً للبت', 'المواد (17) و(18) و(19) و(23)']
  ],
  2017: [
    ['تقديم الطلب', 'عضو الهيئة التدريسية', 'طلب تحريري إلى رئيس القسم (أو رئيس الفرع) من تاريخ إكمال المدة، مع نسخة من كل بحث أو مؤلَّف وقرص بالبحوث بصيغة PDF ونسخة من النشاطات مصادق عليها. للترقية إلى أستاذ مساعد أو أستاذ يجوز التقديم قبل سنة من استيفاء المدة.', '', 'المادة (12/أولاً) · المادة (4)'],
    ['رئاسة القسم', 'رئيس القسم أو الفرع', 'يحيل الطلب مع البحوث وإقرار اللجنة العلمية بشأن الاقتباس والتخصص إلى لجنة الترقيات في الكلية. لا تزيد نسبة الاقتباس في البحث على 20%.', '7 أيام من تقديم الطلب', 'المادة (12/ثانياً) · المادة (29)'],
    ['لجنة الترقيات في الكلية', 'لجنة الترقيات العلمية', 'تدقق الطلب؛ وإن كان مستوفياً أحالت البحوث بكتب سرية إلى ثلاثة خبراء باختصاصك وبمرتبة أعلى من مرتبتك وليس بينهم من أشرف عليك.', '7 أيام من إحالة الطلب', 'المادة (13/أولاً)'],
    ['تقييم الخبراء', 'ثلاثة خبراء', 'يؤشّر كل خبير تقديراً واحداً: أصيل، أو قيّم، أو غير صالح للترقية. وإذا انقضت المدة دون إجابة تُرسل البحوث إلى خبراء آخرين.', '30 يوماً من وصول البحوث', 'المادة (13/ثانياً) · المادة (25)'],
    ['التوصية ومجلس الكلية', 'لجنة الترقيات ثم مجلس الكلية', 'تحيل اللجنة المعاملة إلى مجلس الكلية مشفوعة بتوصياتها، ويرفع المجلس التوصية إلى لجنة الترقيات المركزية في الجامعة.', 'اللجنة: 7 أيام · المجلس: 15 يوماً', 'المادة (13/رابعاً)'],
    ['اللجنة المركزية والمصادقة', 'اللجنة المركزية ثم رئيس الجامعة', 'تدقق الإجراءات وتُعد خلاصة برأيها تُرفع إلى رئيس الجامعة للإقرار والمصادقة.', '', 'المادة (15)'],
    ['تاريخ منح الترقية', '', 'من تاريخ تقديم الطلب أو من تاريخ استكمال متطلباتها، دون تبعات مالية.', '', 'المادة (17)'],
    ['إذا رُفضت الترقية أو أُجِّلت', 'لجان الاعتراض', 'يبلّغك العميد بالقرار وأسبابه خلال 7 أيام. لك الاعتراض خلال 30 يوماً: لدى لجنة الاعتراضات المركزية في الجامعة للمدرس والأستاذ المساعد، ولدى لجنة الاعتراضات الوزارية للأستاذية.', '30 يوماً للاعتراض', 'المواد (18) و(19) و(21) و(23)']
  ]
};
tool({
  id: 'promo-path', cat: 'promotion', title: 'مسار معاملة الترقية العلمية',
  desc: 'أين تذهب معاملتك بعد تقديمها: كل محطة، ومن يتولاها، ومدتها، وحقك في الاعتراض — مع رقم المادة.',
  render(el) {
    let y = 2025;
    const draw = () => {
      el.innerHTML = `<div class="filters"><button class="pill ${y === 2025 ? 'on' : ''}" data-y="2025">تعليمات 2025</button><button class="pill ${y === 2017 ? 'on' : ''}" data-y="2017">تعليمات 2017</button></div>
      <div class="timeline">${PATHS[y].map((s, i) => `<div class="step"><span class="dot">${i + 1}</span><div class="panel"><h3>${s[0]}</h3>${s[1] ? `<span class="badge mute">${s[1]}</span>` : ''}${s[3] ? ` <span class="badge warn">${s[3]}</span>` : ''}<p style="margin:.6em 0 .3em">${s[2]}</p><span class="hint">المصدر: ${s[4]}</span></div></div>`).join('')}</div>
      <p class="hint">ملخّص مبسّط للمواد الإجرائية. النص الملزم هو <a href="#/tool/instructions?y=${y}">نص التعليمات</a> نفسه.</p>
      <div class="btns noprint"><button class="btn ghost" data-print>طباعة</button></div>`;
    };
    el.onclick = e => { if (e.target.dataset.y) { y = +e.target.dataset.y; draw(); } };
    draw();
  }
});

/* ---------- حاسبة درجة المناقشة (استمارة الماجستير) ---------- */
const DEF = [
  ['المساهمات في حقل الاختصاص', 15, [['تطوير كلي', 15], ['تطوير جزئي', 11], ['إضافة نوعية للمعرفة', 9]]],
  ['المنهجية والإجراءات', 15, [['ممتاز', 15], ['جيد جداً', 13], ['جيد', 10], ['متوسط', 7], ['مقبول', 5], ['ضعيف', 3]]],
  ['أسلوب عرض محتويات الرسالة وإخراجها', 10, [['ممتاز', 10], ['جيد جداً', 8], ['جيد', 7], ['متوسط', 6], ['مقبول', 5], ['ضعيف', 3]]],
  ['الجدوى والغاية المتوخاة', 15, [['تطبيقي يعالج مشكلة مجتمعية', 15], ['بحث نظري عام', 10]]],
  ['دفاع الطالب', 20, [['ممتاز', 20], ['جيد جداً', 17], ['جيد', 15], ['متوسط', 13], ['مقبول', 11], ['ضعيف', 7]]]
];
tool({
  id: 'defense', cat: 'grad', title: 'حاسبة درجة مناقشة الماجستير',
  desc: 'قدّر درجة مناقشتك على استمارة الوزارة المحدّثة: اختر تقدير كل فقرة وعدد بحوثك لتظهر الدرجة من 100.',
  long: 'وفق استمارة المناقشة المحدّثة المعتمدة بكتاب جهاز الإشراف والتقويم العلمي (ج م ع ع/ 3738) في 2025/5/11، للطلبة المقبولين من العام الدراسي 2025–2026. هذه الحاسبة لاستمارة الماجستير فقط.',
  render(el) {
    const s = { v: {}, hum: false, a: 0, b: 0, c: 0 };
    const draw = () => {
      const lim = s.hum ? 2 : 1, research = Math.min(25, (s.a > 1 ? 25 : s.a * 15) + Math.min(s.b, lim) * 12 + Math.min(s.c, lim) * 9);
      const done = DEF.filter((_, i) => s.v[i] != null).length, total = DEF.reduce((a, d, i) => a + (s.v[i] != null ? d[2][s.v[i]][1] : 0), 0) + research;
      el.innerHTML = `<div class="filters"><button class="pill ${!s.hum ? 'on' : ''}" data-h="0">تخصص علمي</button><button class="pill ${s.hum ? 'on' : ''}" data-h="1">تخصص إنساني</button></div>
        ${DEF.map((d, i) => `<div class="panel"><h3>${d[0]} <span class="hint">(${s.v[i] != null ? d[2][s.v[i]][1] : '–'} / ${d[1]})</span></h3><div class="filters" style="margin:0">${d[2].map((o, x) => `<button class="pill ${s.v[i] === x ? 'on' : ''}" data-i="${i}" data-x="${x}">${o[0]} · ${o[1]}</button>`).join('')}</div></div>`).join('')}
        <div class="panel"><h3>البحوث العلمية <span class="hint">(${research} / 25)</span></h3><div class="row">
          <div class="field"><label for="ra">بحوث في مجلة ضمن المستوعبات <span class="hint">(15 لكل بحث، وأكثر من بحث = 25)</span></label><input type="number" id="ra" min="0" value="${s.a}"></div>
          <div class="field"><label for="rb">بحوث في مجلة محلية محكّمة أو وقائع مؤتمر <span class="hint">(12، بحد ${lim})</span></label><input type="number" id="rb" min="0" value="${s.b}"></div>
          <div class="field"><label for="rc">بحوث في وقائع مؤتمر مفهرس <span class="hint">(9، بحد ${lim})</span></label><input type="number" id="rc" min="0" value="${s.c}"></div></div></div>
        <div class="panel"><div class="big"><div><b>${total} <small>/ 100</small></b><span>درجتك التقديرية</span></div><div><b>${DEF.length - done}</b><span>فقرات لم تُقدَّر بعد</span></div></div>
        <p class="hint">تقدير شخصي للاسترشاد؛ الدرجة الفعلية تضعها لجنة المناقشة.</p></div>`;
    };
    el.onclick = e => { const d = e.target.dataset; if (d.h != null) s.hum = d.h === '1'; else if (d.i != null) s.v[d.i] = +d.x; else return; draw(); };
    el.onchange = e => { const m = { ra: 'a', rb: 'b', rc: 'c' }[e.target.id]; if (m) { s[m] = Math.max(0, +e.target.value || 0); draw(); } };
    draw();
  }
});
