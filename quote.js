/* 904 캘린더 · 견적 탭 · 견적서 창 · 지금 확인 */
/* ---------- 견적: 공정별 항목 · 소비자/업체 단가 · PDF ---------- */
const QG = [
  {id:"demo", name:"철거 · 폐기물"},
  {id:"water", name:"방수 · 설비"},
  {id:"tile", name:"타일 시공 · 타일 · 부자재"},
  {id:"fixture", name:"도기 세팅 · 도기 · 악세사리 · 욕조"},
  {id:"ceiling", name:"돔 · 휴젠트"},
  {id:"etc", name:"기타"}
];
const CAT_DEFAULT = {company:{name:"904", ceo:"", biz:"", phone:"", addr:""}, items:[
  ["demo","화장실 벽·바닥 철거","식",600000,0],["demo","폐기물 처리","차",400000,0],
  ["water","방수","식",0,0],["water","설비","식",0,0],
  ["tile","타일 시공","식",0,0],["tile","타일","박스",0,0],["tile","타일 부자재","식",0,0],
  ["fixture","도기 세팅","식",0,0],["fixture","도기","세트",0,0],["fixture","악세사리","세트",0,0],["fixture","욕조","개",0,0],
  ["ceiling","돔 천장","식",0,0],["ceiling","휴젠트","개",0,0]
].map(([g,name,unit,c,v],i)=>({id:"k"+i, g, name, unit, c, v}))};
S.cat = structuredClone(CAT_DEFAULT);
const qid8 = () => "k" + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const qn = v => { const s = String(v ?? "").replace(/[^\d.]/g,""); return s ? Number(s) : 0; };
const qf = n => (Math.round(n)||0).toLocaleString("ko-KR");
const qAmt = (it,k) => (Number(it.qty)||0) * (Number(k==="v" ? it.v : it.c) || 0);
const qRows = q => (q.items||[]).filter(it => String(it.name||"").trim());
const qTotal = q => qRows(q).reduce((s,it)=>s+qAmt(normItem(it),"c"),0);
const qTotalV = q => qRows(q).reduce((s,it)=>s+qAmt(normItem(it),"v"),0);
const catFind = (g,name) => S.cat.items.find(i => i.g===g && i.name.trim()===String(name||"").trim());
const catByName = name => S.cat.items.find(i => i.name.trim()===String(name||"").trim());
function guessGroup(n){ n = String(n||"");
  if (/철거|폐기/.test(n)) return "demo"; if (/방수|설비|배관/.test(n)) return "water";
  if (/타일|줄눈|메지/.test(n)) return "tile"; if (/도기|수전|욕조|악세|세팅|변기|세면/.test(n)) return "fixture";
  if (/돔|휴젠트|천장|환풍/.test(n)) return "ceiling"; return "etc"; }
function normItem(it){
  const g = QG.some(x=>x.id===it.g) ? it.g : (catByName(it.name)?.g || guessGroup(it.name));
  return {g, name:String(it.name||""), memo:String(it.memo||""), unit:String(it.unit||""),
    qty: it.qty===""||it.qty==null ? "" : (Number(it.qty)||0),
    c: it.c==="" ? "" : (it.c!=null ? Number(it.c)||0 : Number(it.price)||0),
    v: it.v==="" ? "" : Number(it.v)||0};
}
const fmtRange = (a,b) => a ? `${md(a)}(${WD[wdOf(a)]})${b&&b!==a?` ~ ${md(b)}(${WD[wdOf(b)]})`:""}` : "날짜 미정";
const QSTAT = {req:["요청서 · 단가 미작성","req"], draft:["작성 중",""], sent:["보냄","sent"], ok:["확정","ok"]};
let QB = {busy:false, ctl:null, msg:""};
const NOW = {busy:false, msg:""};
const TASKS = [["trig_01E6MtSZgE8N9V9ZJcxBAQPk","통화 녹음"]];
async function runNow(){
  if (!S.mcp || NOW.busy) return; NOW.busy = true; NOW.msg = ""; renderAll();
  const ok = [], bad = [];
  for (const [id, name] of TASKS){
    try { await S.mcp.callTool("Claude Code Remote", "fire_trigger", {trigger_id: id, text: "사용자가 앱에서 '지금 확인'을 눌러 바로 실행했습니다. 평소대로 처리하세요."}, {cache: false}); ok.push(name); }
    catch(e){ bad.push(name); if (e?.code === "not_granted" || e?.code === "server_not_connected") { NOW.msg = "Claude Code Remote 연결을 허용해야 쓸 수 있어요."; } }
  }
  NOW.busy = false;
  if (!NOW.msg) NOW.msg = bad.length ? `${bad.join("·")} 확인 실패. 잠시 뒤 다시 눌러 주세요` : `확인 시작. 몇 분 뒤 '확인 필요'에 떠요`;
  toast(NOW.msg); renderAll();
}

/* ---------- 항목(단가) 저장 ---------- */
let catTimer = null, catLast = "";
function saveCat(now, msg){
  clearTimeout(catTimer);
  const run = async () => { if (!S.db || !S.canWrite) return; const body = JSON.stringify({items:S.cat.items, company:S.cat.company});
    if (body === catLast) return; catLast = body;
    await write(()=>S.db.doc("config/catalog").set({...JSON.parse(body), updatedAt:new Date().toISOString()}), msg); };
  if (now) return run(); catTimer = setTimeout(run, 900);
}
function setCatalogFromDb(d){
  if (!d || !Array.isArray(d.items)) return;
  S.cat = {items: d.items.filter(i=>i && i.name).map(i=>({id:String(i.id||qid8()), g: QG.some(x=>x.id===i.g)?i.g:"etc", name:String(i.name), unit:String(i.unit||"식"), c:Number(i.c)||0, v:Number(i.v)||0})),
    company: {name:"904", ceo:"", biz:"", phone:"", addr:"", ...(d.company||{})}};
  catLast = JSON.stringify({items:S.cat.items, company:S.cat.company});
}
/* 목록에 없는 항목을 해당 공정에 추가 */
function syncNewItems(q){
  const added = [];
  for (const raw of qRows(q)){ const it = normItem(raw);
    if (!catFind(it.g, it.name)){ S.cat.items.push({id:qid8(), g:it.g, name:it.name.trim(), unit:it.unit||"식", c:Number(it.c)||0, v:Number(it.v)||0}); added.push(it.name.trim()); } }
  return added;
}

/* ---------- 견적 탭 ---------- */
function renderQuotes(){
  const el = $("#quote"); const ro = !S.canWrite; const dis = ro?"disabled":"";
  const list = [...S.quotes.values()].sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
  let h = `<div class="stack">`;
  if (!ro) h += `<div class="qcard"><h3 style="margin:0">통화 내용으로 견적·일정 만들기</h3>
    <p class="cintro">통화 내용을 붙여넣거나 직접 적어 주세요. 우리 일(동식·희태·904)이면 견적서와 '확인 필요' 일정을 같이 만들고, 연합 일이면 일정만 넣어요.</p>
    <textarea id="callText" placeholder="예: 준디자인에서 전화. 11월 20일부터 25일까지 욕실 2칸 300×600 시공, 철거부터 방수 폐기물까지 다 해달라고 함">${esc(QB.draft||"")}</textarea>
    <div class="row" style="justify-content:space-between"><span class="hint" id="qbMsg">${esc(QB.msg||"")}</span>
      <span class="row">${QB.busy?`<button class="btn ghost" id="qbStop">멈추기</button>`:""}<button class="btn" id="qbGo" ${QB.busy||!S.sample?"disabled":""}>${QB.busy?"읽는 중…":"견적·일정 만들기"}</button></span></div>
    ${!S.sample?`<span class="hint">이 화면에서는 자동 읽기를 쓸 수 없어요. 아래 '새 견적'으로 직접 만들 수 있어요.</span>`:""}</div>`;
  h += `<div><div class="row" style="justify-content:space-between"><h3 style="margin:0">견적서 <small>${list.length}건</small></h3>${ro?"":`<button class="btn ghost" id="qNew">+ 새 견적</button>`}</div>`;
  h += list.length ? list.map(q=>{ const c = compColor(q.client) || "purple"; const st = QSTAT[q.status]||QSTAT.draft; const tot = qTotal(q);
    return `<button class="qrow c-${c}" data-q="${esc(q.id)}"><span class="qt"><span class="stag ${st[1]}">${st[0]}</span>${esc(q.client||"업체 미정")} · ${esc(q.title||"")}</span><span class="qs">${won(q.vat?tot*1.1:tot)}</span>
      <span class="qm">${fmtRange(q.start,q.end)}${q.eventId&&S.events.has(q.eventId)?" · 일정 연결됨":""}</span></button>`; }).join("")
    : `<div class="wempty">아직 없어요. 통화 내용을 붙여넣거나 '새 견적'을 눌러 시작하세요.</div>`;
  h += `</div>`;
  /* 항목 관리 */
  const openK = (() => { try { return localStorage.getItem("catOpen")==="1"; } catch(_){ return false; } })();
  h += `<details class="pricebox" id="catBox"${openK?" open":""}><summary>항목 · 기본 단가 <span class="hint">· 공정별 ${S.cat.items.length}개</span></summary>
    <p class="cintro">견적 칸에 항목을 고르면 이 단가가 채워져요. <b class="kc">소비자 단가</b>와 <b class="kv">업체 단가</b>를 따로 넣어 주세요. 목록에 없는 항목은 견적을 저장할 때 자동으로 여기에 추가돼요.</p>`;
  for (const g of QG){ const items = S.cat.items.filter(i=>i.g===g.id);
    h += `<div class="kgrp"><div class="kgh"><b>${esc(g.name)}</b>${ro?"":`<button class="lnk" type="button" data-kadd="${g.id}">+ 항목</button>`}</div>`;
    h += items.length ? items.map(i=>`<div class="krow"><input data-kf="name" data-ki="${esc(i.id)}" value="${esc(i.name)}" aria-label="항목" ${dis}><input data-kf="unit" data-ki="${esc(i.id)}" value="${esc(i.unit)}" aria-label="단위" placeholder="단위" ${dis}>
      <input class="num kc" data-kf="c" data-ki="${esc(i.id)}" inputmode="numeric" value="${i.c?qf(i.c):""}" placeholder="소비자" aria-label="소비자 단가" ${dis}><input class="num kv" data-kf="v" data-ki="${esc(i.id)}" inputmode="numeric" value="${i.v?qf(i.v):""}" placeholder="업체" aria-label="업체 단가" ${dis}>
      ${ro?"":`<button class="x" type="button" data-kdel="${esc(i.id)}" aria-label="항목 빼기">×</button>`}</div>`).join("") : `<span class="hint">아직 없어요</span>`;
    h += `</div>`; }
  const co = S.cat.company||{};
  h += `<div class="kgrp"><div class="kgh"><b>공급자 정보 (견적서에 표시)</b></div><div class="kco">
    <label class="fld">상호<input data-kco="name" value="${esc(co.name||"")}" ${dis}></label><label class="fld">대표자<input data-kco="ceo" value="${esc(co.ceo||"")}" ${dis}></label>
    <label class="fld">사업자번호<input data-kco="biz" value="${esc(co.biz||"")}" ${dis}></label><label class="fld">연락처<input data-kco="phone" inputmode="tel" value="${esc(co.phone||"")}" ${dis}></label>
    <label class="fld" style="grid-column:1/-1">주소<input data-kco="addr" value="${esc(co.addr||"")}" ${dis}></label></div></div>`;
  h += `</details></div>`;
  el.innerHTML = h;
}
document.addEventListener("toggle", e => { if (e.target.id==="catBox") { try { localStorage.setItem("catOpen", e.target.open?"1":"0"); } catch(_){} } }, true);
document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset?.kf && S.canWrite){ const it = S.cat.items.find(i=>i.id===t.dataset.ki); if (!it) return; const f = t.dataset.kf;
    if (f==="c"||f==="v"){ it[f] = qn(t.value); } else it[f] = t.value; saveCat(false, "단가를 저장했어요"); }
  if (t.dataset?.kco && S.canWrite){ S.cat.company = S.cat.company||{}; S.cat.company[t.dataset.kco] = t.value; saveCat(false, "저장했어요"); }
});
document.addEventListener("focusout", e => { const t = e.target; if (t.dataset && (t.dataset.kf==="c"||t.dataset.kf==="v") && t.value.trim()) t.value = qf(qn(t.value)); });
document.addEventListener("click", async e => {
  const t = e.target.closest("button"); if (!t || !S.canWrite) return;
  if (t.dataset.kadd){ S.cat.items.push({id:qid8(), g:t.dataset.kadd, name:"새 항목", unit:"식", c:0, v:0}); renderQuotes(); await saveCat(true);
    const ins = document.querySelectorAll(`[data-kf="name"]`); const last = [...ins].find(x=>x.value==="새 항목"); last?.select(); return; }
  if (t.dataset.kdel){ S.cat.items = S.cat.items.filter(i=>i.id!==t.dataset.kdel); renderQuotes(); await saveCat(true, "항목을 뺐어요"); return; }
});

/* ---------- 통화 → 견적 ---------- */
function itemsFrom(arr, baths){
  return arr.map(x => { const p = S.cat.items.find(pp=>pp.id===x.id) || null;
    const g = p ? p.g : (QG.some(q=>q.id===x.g) ? x.g : guessGroup(x.name));
    return {g, name: p?p.name:String(x.name||"기타"), memo:String(x.memo||""), unit: p?p.unit:String(x.unit||"식"), qty: Number(x.qty)||1, c: p?Number(p.c)||0:0, v: p?Number(p.v)||0:0}; });
}
async function quoteFromCall(){
  const txt = ($("#callText")?.value||"").trim(); QB.draft = txt;
  if (!txt){ toast("통화 내용을 먼저 붙여넣어 주세요"); return; }
  if (!S.sample) return;
  QB.busy = true; QB.msg = "통화 내용을 읽는 중이에요 (30초쯤 걸려요)"; QB.ctl = new AbortController(); renderQuotes();
  const today = todayK();
  const prompt = `너는 욕실 타일 시공 업체의 사무 보조야. 아래 통화 내용을 읽고 견적 요청을 정리해.
오늘 날짜: ${today}. 연도가 없으면 오늘 이후 가장 가까운 날짜로 정해.
등록된 업체 이름: ${S.comp.list.map(c=>c.name).join(", ")||"없음"}
공정 코드: ${QG.map(g=>`${g.id}=${g.name}`).join(", ")}
등록된 항목(id: 공정 / 이름 / 단위): ${S.cat.items.map(p=>`${p.id}: ${p.g} / ${p.name} / ${p.unit}`).join("; ")}
규칙:
- "철거부터 다", "전부", "올수리" 같은 말이면 철거·폐기물·방수·타일 시공·타일·타일 부자재·도기 세팅을 넣고, 빼달라는 것은 뺀다. 말하지 않은 설비·돔·휴젠트는 넣지 않는다.
- 등록된 항목이면 그 id를 쓴다. 없는 요청은 id를 null로 하고 g(공정 코드)·name·unit을 적는다. 타일 크기 같은 규격은 memo에 적는다.
- 욕실 칸 수가 여러 개면 칸 단위 항목의 qty를 칸 수로 한다.
- 통화에 나온 것만 쓰고, 모르는 값은 빈 문자열이나 0.
JSON 하나로만 답해:
{"client":"업체나 고객 이름","site":"현장 주소/이름","start":"YYYY-MM-DD","end":"YYYY-MM-DD","baths":2,"tileSize":"300×600","items":[{"id":"k0","g":"demo","name":"","unit":"","qty":1,"memo":""}],"kinds":["demo","wp","tile"],"notes":"요청사항 한두 줄","title":"욕실 2칸 300×600 전체 시공"}
kinds 코드: prot 보양, demo 철거, plumb 설비, wp 방수, tile 타일(줄눈·메지 포함), sani 도기 세팅, dome 돔천장, sil 실리콘, etc 기타.

통화 내용:
${txt.slice(0, 12000)}`;
  try {
    const r = await S.sample.json(prompt, {signal: QB.ctl.signal, cache: false});
    if (!r || typeof r !== "object") throw {code:"invalid_json"};
    const baths = Math.max(1, Number(r.baths)||1);
    const ok = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d||"")) ? String(d) : "";
    const start = ok(r.start), end = ok(r.end) || start;
    const items = itemsFrom(Array.isArray(r.items)?r.items:[], baths);
    const client = String(r.client||"").trim(); const title = String(r.title||`욕실 ${baths}칸`).trim();
    const cm = companyOf(client); const cl = cm && leaderOf(cm.leader); const isUnion = !!(cl && !cl.ours);
    const qid = newId("quotes"); const now = new Date().toISOString();
    let eventId = "";
    if (start && S.db){
      eventId = newId("events");
      const kinds = (Array.isArray(r.kinds)?r.kinds:[]).filter(k=>KIND_LABEL[k]);
      await S.db.collection("events").doc(eventId).set({title: `${client||"견적"} (${title})`, start, end: end<start?start:end, time:"", color: compColor(client)||"purple",
        kinds, memo: `[견적] ${String(r.site||"")} ${String(r.notes||"")}`.trim(), crew:{}, days:{}, off:[], photos:[], photoInfo:{}, pending:true,
        source: `[전화] ${txt.slice(0,600)}`, quoteId: qid, updatedAt: now});
    }
    const q = {client, title, site: String(r.site||""), start, end, baths, tileSize: String(r.tileSize||""), items: items.map(it=>({...it, price:it.c})), vat:false,
      memo: String(r.notes||""), status:"draft", source: txt.slice(0,2000), eventId, createdAt: now};
    if (isUnion){ QB.draft = ""; QB.busy = false; QB.msg = eventId ? `${client}은 연합 일(${cl.name})이라 견적 없이 일정만 넣었어요` : `${client}은 연합 일이라 견적을 만들지 않았어요 (날짜가 없어 일정도 없음)`; renderQuotes(); return; }
    if (S.db) await S.db.collection("quotes").doc(qid).set(q); else S.quotes.set(qid, {...q, id:qid});
    QB.draft = ""; QB.msg = eventId ? "견적서와 '확인 필요' 일정을 만들었어요" : "견적서를 만들었어요 (날짜가 없어 일정은 안 만들었어요)";
    QB.busy = false; renderQuotes(); openQuote(qid, {...q, id:qid});
  } catch(e){
    QB.busy = false;
    QB.msg = e?.code==="cancelled" ? "멈췄어요" : e?.code==="not_granted" ? "Claude 사용을 허용해야 자동으로 읽을 수 있어요" : e?.code==="rate_limited" ? "잠시 후 다시 눌러 주세요" : e?.code==="invalid_json" ? "내용을 정리하지 못했어요. 업체·날짜·칸 수가 들어가게 조금 더 적어 주세요" : "만들지 못했어요. 다시 눌러 주세요";
    renderQuotes();
  }
}

/* ---------- 견적서 창 ---------- */
let Q = null;
const blankRow = g => ({g, name:"", memo:"", unit:"", qty:"", c:"", v:""});
function ensureTrail(){ for (const g of QG){ const rs = Q.items.filter(it=>it.g===g.id); const last = rs[rs.length-1]; if (!last || String(last.name).trim()) Q.items.push(blankRow(g.id)); } }
function openQuote(id, given){
  const src = given || S.quotes.get(id); if (!src) return;
  Q = structuredClone(src); Q.id = id; Q.items = (Q.items||[]).map(normItem); Q._arm = false; ensureTrail();
  renderQdlg(); $("#dlg").hidden = $("#dlgScrim").hidden = false; $("#dlg").classList.add("qwide");
}
function newQuote(){ Q = {id:null, client:"", phone:"", title:"욕실", site:"", start:"", end:"", baths:1, tileSize:"", items:[], vat:false, memo:"", status:"draft", source:"", eventId:"", createdAt:new Date().toISOString()};
  ensureTrail(); renderQdlg(); $("#dlg").hidden = $("#dlgScrim").hidden = false; $("#dlg").classList.add("qwide"); }
new MutationObserver(() => { const d = $("#dlg"); if (d && d.hidden) d.classList.remove("qwide"); }).observe(document.getElementById("dlg"), {attributes:true, attributeFilter:["hidden"]});
function qRowHTML(it, i, ro){
  const dis = ro?"disabled":""; const has = String(it.name).trim(); const isNew = has && !catFind(it.g, it.name);
  return `<div class="qir${has?"":" empty"}" data-qr="${i}">
    <div class="qi-name"><input data-qk="name" data-qri="${i}" list="qdl-${it.g}" placeholder="항목 입력" value="${esc(it.name)}" ${dis} aria-label="항목">${isNew?`<span class="qnew">새 항목</span>`:""}</div>
    ${ro?"":`<button class="x" type="button" data-qrdel="${i}" aria-label="이 줄 지우기">×</button>`}
    <input class="qi-memo" data-qk="memo" data-qri="${i}" placeholder="규격 · 메모" value="${esc(it.memo)}" ${dis} aria-label="규격 메모">
    <div class="qi-nums">
      <label><span>단위</span><input data-qk="unit" data-qri="${i}" placeholder="식" value="${esc(it.unit)}" ${dis}></label>
      <label><span>수량</span><input class="num" data-qk="qty" data-qri="${i}" inputmode="decimal" placeholder="1" value="${esc(it.qty)}" ${dis}></label>
      <label class="kc"><span>소비자 단가</span><input class="num" data-qk="c" data-qri="${i}" inputmode="numeric" placeholder="0" value="${it.c===""?"":qf(it.c)}" ${dis}></label>
      <label class="kv"><span>업체 단가</span><input class="num" data-qk="v" data-qri="${i}" inputmode="numeric" placeholder="0" value="${it.v===""?"":qf(it.v)}" ${dis}></label>
    </div>
    <div class="qi-amt" data-qamt="${i}">${has?`<span class="kc">${qf(qAmt(it,"c"))}</span><span class="kv">${qf(qAmt(it,"v"))}</span>`:""}</div>
  </div>`;
}
function qGroupHTML(g, ro){
  const rows = Q.items.map((it,i)=>[it,i]).filter(([it])=>it.g===g.id);
  const cat = S.cat.items.filter(i=>i.g===g.id);
  let sc=0, sv=0; rows.forEach(([it])=>{ if (String(it.name).trim()){ sc+=qAmt(it,"c"); sv+=qAmt(it,"v"); } });
  return `<section class="qgrp" data-qg="${g.id}"><div class="qgh"><b>${esc(g.name)}</b><span class="qgs"><span class="kc" data-qgs="c">${qf(sc)}</span><span class="kv" data-qgs="v">${qf(sv)}</span></span></div>
    <datalist id="qdl-${g.id}">${cat.map(c=>`<option value="${esc(c.name)}"></option>`).join("")}</datalist>
    ${!ro&&cat.length?`<div class="qchips">${cat.map(c=>`<button type="button" class="qchip" data-qchip="${esc(c.id)}">+ ${esc(c.name)}</button>`).join("")}</div>`:""}
    <div class="qrows">${rows.map(([it,i])=>qRowHTML(it,i,ro)).join("")}</div></section>`;
}
function qCalc(kind){
  const sub = qRows(Q).reduce((s,it)=>s+qAmt(it,kind),0);
  return Q.vat ? {sub, vat:Math.round(sub*0.1), total:sub+Math.round(sub*0.1)} : {sub, vat:0, total:sub};
}
function qTotHTML(){
  const c = qCalc("c"), v = qCalc("v"), m = c.sub - v.sub;
  return `<div class="qtot2"><div class="kc"><span>소비자 견적</span><b>${won(c.total)}</b>${Q.vat?`<small>공급가 ${qf(c.sub)} · 부가세 ${qf(c.vat)}</small>`:""}</div>
    <div class="kv"><span>업체 견적</span><b>${won(v.total)}</b>${Q.vat?`<small>공급가 ${qf(v.sub)} · 부가세 ${qf(v.vat)}</small>`:""}</div>
    <div class="km"><span>차액 (공급가)</span><b>${won(m)}</b><small>${c.sub?Math.round(m/c.sub*100):0}%</small></div></div>`;
}
function renderQdlg(){
  const ro = !S.canWrite; const dis = ro?"disabled":"";
  $("#dlg").innerHTML = `<div class="dl-h"><button class="lnk" id="qCancel">닫기</button><b>견적서</b>${ro?`<span style="width:40px"></span>`:`<button class="btn" id="qSave" style="height:34px">작성 완료</button>`}</div>
  <div class="dl-b">
    <div class="two"><label class="fld">업체 / 고객<input id="qClient" value="${esc(Q.client)}" ${dis}></label><label class="fld">상태<select id="qStatus" ${dis}>${Object.entries(QSTAT).map(([k,v])=>`<option value="${k}"${Q.status===k?" selected":""}>${v[0]}</option>`).join("")}</select></label></div>
    <div class="two"><label class="fld">공사 내용<input id="qTitle" value="${esc(Q.title)}" ${dis}></label><label class="fld">고객 연락처<input id="qPhone" inputmode="tel" value="${esc(Q.phone||"")}" ${dis}></label></div>
    <label class="fld">현장<input id="qSite" value="${esc(Q.site)}" placeholder="주소 또는 현장 이름" ${dis}></label>
    <div class="two"><label class="fld">시작<input type="date" id="qStart" value="${esc(Q.start)}" ${dis}></label><label class="fld">끝<input type="date" id="qEnd" value="${esc(Q.end)}" ${dis}></label></div>
    <p class="hint" style="margin:0">한 칸을 채우면 아래에 다음 칸이 생겨요. Enter로 다음 칸으로 넘어가요. 목록에 없는 항목은 작성 완료 때 항목에 추가돼요.</p>
    <div class="qgroups">${QG.map(g=>qGroupHTML(g, ro)).join("")}</div>
    <label class="row" style="gap:6px;font:500 13px var(--font)"><input type="checkbox" id="qVat" ${Q.vat?"checked":""} ${dis}> 부가세 10% 별도 (합계에 더함)</label>
    <div id="qTot">${qTotHTML()}</div>
    <label class="fld">비고 (견적서에 표시)<textarea id="qMemo" ${dis}>${esc(Q.memo||"")}</textarea></label>
    ${Q.source?`<div class="srcbox"><b>통화 내용</b><p>${esc(Q.source)}</p></div>`:""}
    <div class="row qpdf"><button class="btn" id="qPdfC" type="button">소비자 PDF</button><button class="btn kvbtn" id="qPdfV" type="button">업체 PDF</button><button class="btn ghost" id="qPrev" type="button">미리보기</button></div>
    <div class="row"><button class="btn ghost" id="qCopy" type="button">견적서 텍스트 복사</button>${!ro&&Q.start&&!(Q.eventId&&S.events.has(Q.eventId))?`<button class="btn ghost" id="qMkEvent" type="button">이 견적으로 일정 만들기</button>`:""}${Q.eventId&&S.events.has(Q.eventId)?`<button class="lnk" id="qOpenEvent" type="button">연결된 일정 열기</button>`:""}</div>
  </div>
  ${Q.id&&!ro?`<div class="dl-f"><span></span><button class="lnk dg${Q._arm?" arm":""}" id="qDel">${Q._arm?"한 번 더 누르면 삭제":"견적 삭제"}</button></div>`:""}`;
}
function qRefreshSums(){
  if (!Q) return;
  for (const g of QG){ const sec = document.querySelector(`.qgrp[data-qg="${g.id}"]`); if (!sec) continue; let sc=0, sv=0;
    Q.items.forEach(it=>{ if (it.g===g.id && String(it.name).trim()){ sc+=qAmt(it,"c"); sv+=qAmt(it,"v"); } });
    sec.querySelector('[data-qgs="c"]').textContent = qf(sc); sec.querySelector('[data-qgs="v"]').textContent = qf(sv); }
  const t = $("#qTot"); if (t) t.innerHTML = qTotHTML();
}
function qRerenderGroup(g){
  const sec = document.querySelector(`.qgrp[data-qg="${g}"]`); if (!sec) return;
  const tmp = document.createElement("div"); tmp.innerHTML = qGroupHTML(QG.find(x=>x.id===g), !S.canWrite); sec.replaceWith(tmp.firstElementChild); qRefreshSums();
}
document.addEventListener("input", e => {
  const t = e.target; if (!Q || t.dataset?.qk === undefined) return;
  const i = Number(t.dataset.qri), it = Q.items[i]; if (!it) return; const k = t.dataset.qk;
  if (k==="c"||k==="v") it[k] = t.value.trim() ? qn(t.value) : ""; else if (k==="qty") it.qty = t.value.trim() ? (Number(String(t.value).replace(/[^\d.]/g,""))||0) : ""; else it[k] = t.value;
  const row = t.closest(".qir");
  if (k==="name"){ row.classList.toggle("empty", !String(it.name).trim());
    const same = Q.items.filter(x=>x.g===it.g); if (String(it.name).trim() && same[same.length-1]===it){ const nr = blankRow(it.g); Q.items.push(nr);
      const tmp = document.createElement("div"); tmp.innerHTML = qRowHTML(nr, Q.items.length-1, !S.canWrite); row.parentElement.appendChild(tmp.firstElementChild); } }
  const a = row.querySelector("[data-qamt]"); a.innerHTML = String(it.name).trim() ? `<span class="kc">${qf(qAmt(it,"c"))}</span><span class="kv">${qf(qAmt(it,"v"))}</span>` : "";
  qRefreshSums();
});
document.addEventListener("change", e => {
  const t = e.target; if (!Q) return;
  if (t.dataset?.qk==="name"){ const it = Q.items[Number(t.dataset.qri)]; const c = it && catFind(it.g, it.name); if (!c) return;
    const row = t.closest(".qir"); const set = (k,v,txt) => { it[k]=v; const inp=row.querySelector(`[data-qk="${k}"]`); if (inp) inp.value = txt; };
    if (!it.unit) set("unit", c.unit, c.unit); if (it.qty==="") set("qty", 1, "1");
    if (it.c===""||!Number(it.c)) set("c", c.c||"", c.c?qf(c.c):""); if (it.v===""||!Number(it.v)) set("v", c.v||"", c.v?qf(c.v):"");
    row.querySelector("[data-qamt]").innerHTML = `<span class="kc">${qf(qAmt(it,"c"))}</span><span class="kv">${qf(qAmt(it,"v"))}</span>`; qRefreshSums(); }
  if (t.id==="qVat"){ Q.vat = t.checked; qRefreshSums(); }
});
document.addEventListener("focusout", e => { const t = e.target; if (Q && (t.dataset?.qk==="c"||t.dataset?.qk==="v") && t.value.trim()) t.value = qf(qn(t.value)); });
document.addEventListener("keydown", e => {
  const t = e.target; if (!Q || e.key!=="Enter" || e.isComposing || t.dataset?.qk===undefined) return; e.preventDefault();
  const all = [...document.querySelectorAll("#dlg [data-qk]")]; const i = all.indexOf(t); if (all[i+1]) all[i+1].focus();
});
document.addEventListener("click", async e => {
  const t = e.target.closest("button"); if (!t || !Q) return;
  if (t.dataset.qchip && S.canWrite){ const c = S.cat.items.find(x=>x.id===t.dataset.qchip); if (!c) return; readQ();
    const blank = Q.items.findIndex(x=>x.g===c.g && !String(x.name).trim()); const nr = {g:c.g, name:c.name, memo:"", unit:c.unit, qty:1, c:c.c||"", v:c.v||""};
    if (blank>-1) Q.items.splice(blank, 0, nr); else Q.items.push(nr); ensureTrail(); QG.forEach(x=>qRerenderGroup(x.id)); return; }
  if (t.dataset.qrdel !== undefined && S.canWrite){ readQ(); const it = Q.items[Number(t.dataset.qrdel)]; if (!it) return; const g = it.g; Q.items.splice(Number(t.dataset.qrdel),1); ensureTrail();
    QG.forEach(x=>qRerenderGroup(x.id)); return; }
  if (t.id==="qPdfC"){ readQ(); await qPdf("c"); return; }
  if (t.id==="qPdfV"){ readQ(); await qPdf("v"); return; }
  if (t.id==="qPrev"){ readQ(); openQPreview("c"); return; }
});
function readQ(){
  if (!Q || !$("#qClient")) return;
  Q.client=$("#qClient").value.trim(); Q.title=$("#qTitle").value.trim(); Q.site=$("#qSite").value.trim(); Q.phone=$("#qPhone").value.trim(); Q.start=$("#qStart").value; Q.end=$("#qEnd").value||Q.start;
  Q.status=$("#qStatus").value; Q.memo=$("#qMemo").value; Q.vat=$("#qVat").checked;
}
function quoteText(q){
  const rows = qRows(q).map(normItem); const tot = rows.reduce((s,it)=>s+qAmt(it,"c"),0); const L = [`[견적서] ${q.client||""} · ${q.title||""}`];
  if (q.site) L.push(`현장: ${q.site}`); L.push(`공사기간: ${fmtRange(q.start,q.end)}`);
  for (const g of QG){ const rs = rows.filter(it=>it.g===g.id); if (!rs.length) continue; L.push("────────", `■ ${g.name}`);
    for (const it of rs) L.push(`${it.name}${it.memo?` (${it.memo})`:""} ${it.qty||0}${it.unit} × ${won(it.c)} = ${won(qAmt(it,"c"))}`); }
  L.push("────────"); if (q.vat){ L.push(`공급가 ${won(tot)}`); L.push(`부가세 ${won(tot*0.1)}`); L.push(`합계 ${won(tot*1.1)} (부가세 포함)`); } else L.push(`합계 ${won(tot)} (부가세 별도)`);
  if (q.memo) L.push("", q.memo); return L.join("\n");
}
function qForSave(){ const {id, _arm, ...data} = Q; data.items = qRows(Q).map(it=>({g:it.g, name:String(it.name).trim(), memo:it.memo, unit:it.unit, qty:Number(it.qty)||0, c:Number(it.c)||0, v:Number(it.v)||0, price:Number(it.c)||0})); return data; }
async function commitNewItems(){
  const added = syncNewItems(Q);
  if (added.length){ await saveCat(true); document.querySelectorAll(".qgrp").forEach(s=>qRerenderGroup(s.dataset.qg)); }
  return added;
}
async function saveQ(){
  readQ(); const data = qForSave(); const qid = Q.id || newId("quotes");
  const added = await commitNewItems();
  const msg = added.length ? `저장했어요. 새 항목 ${added.length}개 추가: ${added.join(", ")}` : "견적을 저장했어요";
  if (!S.db){ S.quotes.set(qid,{...data,id:qid}); closeDlg(); Q=null; renderAll(); toast(msg); return; }
  if (await write(()=>S.db.collection("quotes").doc(qid).set(data), msg)){
    if (data.eventId && S.events.has(data.eventId)) { try { await S.db.collection("events").doc(data.eventId).update({quoteId: qid}); } catch(_){} }
    closeDlg(); Q=null;
  }
}

/* ---------- 견적서 시트 · PDF ---------- */
function hangulWon(n){
  n = Math.round(n); if (!n) return "영";
  const d=["","일","이","삼","사","오","육","칠","팔","구"], u=["","십","백","천"], big=["","만","억","조"];
  let s="", i=0; while (n>0){ const ch=n%10000; n=Math.floor(n/10000);
    if (ch){ let c="", k=0, x=ch; while (x>0){ const dd=x%10; if (dd) c=d[dd]+u[k]+c; x=Math.floor(x/10); k++; } s=c+big[i]+s; } i++; }
  return s;
}
function buildQSheet(q, kind){
  const rows = qRows(q).map(normItem); const co = S.cat.company||{}; const isC = kind==="c";
  const sub = rows.reduce((s,it)=>s+qAmt(it,kind),0); const vat = q.vat ? Math.round(sub*0.1) : 0; const total = sub+vat;
  let body = "", no = 0;
  for (const g of QG){ const rs = rows.filter(it=>it.g===g.id); if (!rs.length) continue; let gs = 0;
    body += `<tr class="gh"><td colspan="7">${esc(g.name)}</td></tr>`;
    for (const it of rs){ no++; const a = qAmt(it,kind); gs += a;
      body += `<tr><td class="ct">${no}</td><td>${esc(it.name)}</td><td>${esc(it.memo)}</td><td class="ct">${esc(it.unit)}</td><td class="r">${esc(it.qty)}</td><td class="r">${qf(it[kind])}</td><td class="r">${qf(a)}</td></tr>`; }
    body += `<tr class="gs"><td colspan="6" class="rt">${esc(g.name)} 소계</td><td class="r">${qf(gs)}</td></tr>`; }
  if (!body) body = `<tr><td colspan="7" class="ct" style="padding:20px">작성된 항목이 없습니다</td></tr>`;
  const s = document.createElement("div"); s.className = "qsheet";
  s.innerHTML = `<div class="qs-t"><div><span class="qs-tag" style="background:${isC?"#2F66F5":"#A3601A"}">${isC?"소비자용":"업체용"}</span><h1>견적서</h1></div>
    <div class="qs-meta">견적일 ${esc(todayK())}${q.start?`<br>공사기간 ${esc(fmtRange(q.start,q.end))}`:""}</div></div>
    <div class="qs-parties"><div class="qs-p"><div class="qs-ph">수신</div><table>
      <tr><td>고객</td><td><b>${esc(q.client||"")}</b> 귀하</td></tr><tr><td>연락처</td><td>${esc(q.phone||"")}</td></tr>
      <tr><td>현장</td><td>${esc(q.site||"")}</td></tr><tr><td>공사</td><td>${esc(q.title||"")}</td></tr></table></div>
    <div class="qs-p"><div class="qs-ph">공급자</div><table>
      <tr><td>상호</td><td><b>${esc(co.name||"904")}</b>${co.ceo?` · 대표 ${esc(co.ceo)}`:""}</td></tr>${co.biz?`<tr><td>사업자번호</td><td>${esc(co.biz)}</td></tr>`:""}
      <tr><td>연락처</td><td>${esc(co.phone||"")}</td></tr><tr><td>주소</td><td>${esc(co.addr||"")}</td></tr></table></div></div>
    <div class="qs-sum"><span>견적금액 ${q.vat?"(부가세 포함)":"(부가세 별도)"}</span><b>일금 ${hangulWon(total)}원정</b><span class="qs-n">₩ ${qf(total)}</span></div>
    <table class="qs-items"><thead><tr><th style="width:32px">No</th><th>항목</th><th>규격 · 메모</th><th style="width:44px">단위</th><th style="width:46px">수량</th><th style="width:92px">단가</th><th style="width:104px">금액</th></tr></thead><tbody>${body}</tbody></table>
    <div class="qs-foot"><div><b>비고</b><div class="qs-note">${esc(q.memo||"")}</div></div>
      <table class="qs-tt">${q.vat?`<tr><td>공급가액</td><td class="r">${qf(sub)}</td></tr><tr><td>부가세 (10%)</td><td class="r">${qf(vat)}</td></tr>`:""}<tr class="fin"><td>총 견적금액</td><td class="r">${qf(total)}</td></tr></table></div>
    <div class="qs-sign">위와 같이 견적합니다. &nbsp; ${esc(co.name||"904")}</div>`;
  return s;
}
let QDL = undefined, qBusy = false;
async function qPdf(kind){
  if (qBusy) return;
  if (QDL === undefined){ try { QDL = (await window.claude?.use?.("downloads")) || null; } catch(_){ QDL = null; } }
  if (!QDL){ toast("이 화면에서는 파일 저장을 쓸 수 없어요"); return; }
  if (!window.html2canvas || !window.jspdf){ toast("PDF 도구를 불러오지 못했어요. 새로고침해 주세요"); return; }
  qBusy = true; const added = S.canWrite ? await commitNewItems() : [];
  toast("PDF 만드는 중…");
  const stage = document.createElement("div"); stage.style.cssText = "position:fixed;left:-12000px;top:0"; document.body.appendChild(stage);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const sheet = buildQSheet(Q, kind); stage.appendChild(sheet);
    const W = sheet.offsetWidth, H = sheet.offsetHeight, sc = 2;
    const canvas = await html2canvas(sheet, {scale:sc, backgroundColor:"#FFFFFF", logging:false});
    const pageH = Math.floor(W*297/210), topPad = 40, top0 = sheet.getBoundingClientRect().top;
    const cuts = [...sheet.querySelectorAll("tr,.qs-foot,.qs-sign,.qs-sum,.qs-parties")].map(el=>Math.round(el.getBoundingClientRect().bottom-top0)).sort((a,b)=>a-b);
    const pdf = new window.jspdf.jsPDF({unit:"mm", format:"a4"}); let start = 0, page = 0;
    while (start < H-2){
      let end = start + (page===0 ? pageH : pageH-topPad);
      if (end < H){ const c = cuts.filter(y=>y>start+50 && y<=end); if (c.length) end = c[c.length-1]; } else end = H;
      const h = end-start, pc = document.createElement("canvas"); pc.width = W*sc; pc.height = h*sc;
      const ctx = pc.getContext("2d"); ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0,0,pc.width,pc.height);
      ctx.drawImage(canvas, 0, start*sc, W*sc, h*sc, 0, 0, W*sc, h*sc);
      if (page>0) pdf.addPage(); pdf.addImage(pc.toDataURL("image/jpeg",0.92), "JPEG", 0, page===0?0:topPad*210/W, 210, h*210/W);
      start = end; page++;
    }
    const nm = (Q.client||"고객").replace(/[\\/:*?"<>|]/g,"");
    await QDL.save({filename:`견적서_${nm}_${todayK()}_${kind==="c"?"소비자":"업체"}.pdf`, data: pdf.output("blob")});
    toast(`PDF를 저장했어요${added.length?` · 새 항목 ${added.length}개 추가`:""}`);
  } catch(e){
    toast(e?.code==="declined" ? "저장을 취소했어요" : e?.code==="rate_limited" ? "저장 창이 이미 열려 있어요" : "PDF를 만들지 못했어요. 다시 눌러 주세요");
  } finally { stage.remove(); qBusy = false; }
}
function openQPreview(kind){
  let m = $("#qpv"); if (!m){ m = document.createElement("div"); m.id = "qpv"; document.body.appendChild(m); }
  m.innerHTML = `<div class="qpv-bar"><div class="qpv-seg"><button type="button" data-qpv="c" aria-pressed="${kind==="c"}">소비자</button><button type="button" data-qpv="v" aria-pressed="${kind==="v"}">업체</button></div>
    <span class="row"><button class="btn${kind==="v"?" kvbtn":""}" type="button" data-qpvpdf="${kind}">PDF 저장</button><button class="btn ghost" type="button" data-qpvx="1">닫기</button></span></div><div class="qpv-sc"><div class="qpv-in"></div></div>`;
  m.hidden = false; const box = m.querySelector(".qpv-in"); const sh = buildQSheet(Q, kind); box.appendChild(sh);
  const k = Math.min(1, (m.querySelector(".qpv-sc").clientWidth-8)/794); box.style.transform = `scale(${k})`;
  requestAnimationFrame(()=>{ box.style.height = sh.offsetHeight*k + "px"; box.style.marginBottom = (sh.offsetHeight*(k-1)) + "px"; });
}
document.addEventListener("click", async e => { const t = e.target.closest("#qpv button"); if (!t) return;
  if (t.dataset.qpv) openQPreview(t.dataset.qpv); else if (t.dataset.qpvx) $("#qpv").hidden = true; else if (t.dataset.qpvpdf) await qPdf(t.dataset.qpvpdf); });
