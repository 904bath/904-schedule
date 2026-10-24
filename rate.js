try { localStorage.removeItem("view"); } catch(_){} // 공정표·오늘내일·짜보기 화면은 뺌 → 항상 달력
/* 904 캘린더 · 견적 기준(업체가 · 실제 인건비·자재·외주) · 견적 계산기 (quote.js 다음, main.js 전에 불러옴) */
const ZA = {bath:"욕실", kitchen:"주방", entry:"현관", veranda:"베란다", living:"거실", artwall:"아트월", common:"공정·기타"};
const ZA_ADD = ["bath","kitchen","entry","veranda","living","artwall","common"];
const ZSEC = {base:"기본 시공 (하나만)", opt:"옵션", extra:"항목"};
const ZFLOOR = ["kitchen","entry","veranda","living","artwall"];
// [공간, 구분, 이름, 단위, 견적서 공정, 업체가, 기본금액, 최소수량, 기공품, 보조품]  (업체전용 단가표 기준)
const ZSEED = [
  ["bath","base","덧방 300×600 미만 (본드)","칸","tile",400000,0,0,1,1],
  ["bath","base","덧방 600각 (에폭시)","칸","tile",700000,0,0,1,1],
  ["bath","base","덧방 600×1200 (에폭시)","칸","tile",800000,0,0,1.5,1],
  ["bath","base","철거 후 시공 300×600 미만 (떠발이)","칸","tile",600000,0,0,2,1],
  ["bath","base","철거 후 시공 600각 (드라이)","칸","tile",900000,0,0,3,1],
  ["bath","base","철거 후 시공 600×1200 (드라이)","칸","tile",1000000,0,0,3.5,1.5],
  ["bath","opt","젠다이 (300×600 미만)","개","tile",100000,0,0,0.5,0],
  ["bath","opt","젠다이 조적 쌓기","개","tile",100000,0,0,0.5,0],
  ["bath","opt","젠다이 졸리컷","개","tile",150000,0,0,0.5,0],
  ["bath","opt","꺾인벽·비트벽 (졸리컷)","개","tile",150000,0,0,0.5,0],
  ["bath","opt","타일선반 (졸리컷)","개","tile",100000,0,0,0.3,0],
  ["bath","opt","하프 파티션 (조적+졸리컷)","개","tile",250000,0,0,1,0],
  ["bath","opt","풀 파티션 (조적+졸리컷)","개","tile",450000,0,0,1.5,0.5],
  ["bath","opt","욕조+앞치마 타일 마감 (벽돌 80장)","개","tile",200000,0,0,0.5,0],
  ["bath","opt","시다지","개","tile",100000,0,0,0.3,0],
  ["bath","opt","세면대 탑볼","개","tile",200000,0,0,0.5,0],
  ["bath","opt","세면대 언더볼","개","tile",250000,0,0,0.5,0],
  ["bath","opt","수제 세면대","개","tile",300000,0,0,1,0],
  ["bath","opt","수제 타일 욕조 (졸리컷)","개","tile",500000,0,0,1.5,0.5],
  ["kitchen","base","주방 300×600 미만","평","tile",60000,150000,3,0,0],
  ["kitchen","base","주방 600각","평","tile",80000,200000,3,0,0],
  ["kitchen","base","주방 600×1200","평","tile",110000,250000,3,0,0],
  ["entry","base","현관 300×600 미만","평","tile",60000,150000,3,0,0],
  ["entry","base","현관 600각","평","tile",80000,150000,3,0,0],
  ["entry","base","현관 600×1200","평","tile",110000,200000,3,0,0],
  ["entry","opt","시다지 (크기별 5~20만)","개","tile",100000,0,0,0,0],
  ["veranda","base","베란다 300×600 미만","평","tile",60000,150000,3,0,0],
  ["veranda","base","베란다 600각","평","tile",80000,200000,3,0,0],
  ["veranda","base","베란다 600×1200","평","tile",110000,250000,3,0,0],
  ["veranda","opt","시다지 (크기별 5~20만)","개","tile",100000,0,0,0,0],
  ["living","base","거실 바닥 300×600 미만","평","tile",80000,0,0,0,0],
  ["living","base","거실 바닥 600각","평","tile",90000,0,0,0,0],
  ["living","base","거실+방 300×600 미만","평","tile",100000,0,0,0,0],
  ["living","base","거실+방 600각","평","tile",110000,0,0,0,0],
  ["artwall","base","아트월 300×600 미만","평","tile",80000,400000,3,0,0],
  ["artwall","base","아트월 600각","평","tile",110000,500000,3,0,0],
  ["common","extra","욕실 철거 (외주)","칸","demo",0,0,0,0,0],
  ["common","extra","폐기물 처리","차","demo",0,0,0,0,0],
  ["common","extra","액체 방수","칸","water",0,0,0,0,0],
  ["common","extra","도막 방수","칸","water",0,0,0,0,0.5],
  ["common","extra","설비","칸","water",0,0,0,0,0],
  ["common","extra","도기 세팅","칸","fixture",0,0,0,0,0],
  ["common","extra","돔 천장","칸","ceiling",0,0,0,0,0],
  ["common","extra","휴젠트","개","ceiling",0,0,0,0,0]
];
const ZNUMF = ["price","base","min","gi","jo","mat","out"];
function zSeed(){ return {wages:{gi:250000, jo:140000}, perDay:2,
  items: ZSEED.map(([area,sec,name,unit,g,price,base,min,gi,jo],i)=>({id:"r"+i, area, sec, name, unit, g, price, base, min, gi, jo, mat:0, out:0}))}; }
function zNorm(d){
  const s = zSeed(); if (!d || !Array.isArray(d.items)) return s;
  return {wages:{gi:Number(d.wages?.gi)||0, jo:Number(d.wages?.jo)||0}, perDay:Number(d.perDay)||2,
    items: d.items.filter(i=>i && i.id).map(i=>{ const o = {id:String(i.id), area: ZA[i.area]?i.area:"common", sec: ZSEC[i.sec]?i.sec:"extra",
      name:String(i.name||""), unit:String(i.unit||"식"), g:String(i.g||"")}; for (const f of ZNUMF) o[f] = Number(i[f])||0; return o; })};
}
S.rates = zSeed();
const zid = () => "r" + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
const zNum = v => { const s = String(v ?? "").replace(/[^\d.]/g,""); return s ? Number(s) || 0 : 0; };
const z1 = v => Math.round((Number(v)||0)*10)/10;
let zLast = "", zTimer = null;
function zSaveRates(now){
  clearTimeout(zTimer);
  const run = async () => { if (!S.db || !S.canWrite) return; const body = JSON.stringify({wages:S.rates.wages, perDay:S.rates.perDay, items:S.rates.items});
    if (body === zLast) return; zLast = body; await write(()=>S.db.doc("config/rates").set({...JSON.parse(body), updatedAt:new Date().toISOString()})); };
  if (now) return run(); zTimer = setTimeout(run, 800);
}
const zEditing = () => { const a = document.activeElement; return !!(a && a.closest && a.closest("#dlg") && (a.dataset?.zr || a.dataset?.zw)); };
(function zWait(){
  if (S.db){ S.db.doc("config/rates").onSnapshot(snap => { if (!snap.exists) return; const d = zNorm(snap.data());
    const body = JSON.stringify({wages:d.wages, perDay:d.perDay, items:d.items}); if (body === zLast || zEditing()) return;
    zLast = body; S.rates = d; if (zOpenNow() && R.mode==="rates") zRender(); }, () => {}); return; }
  zWait.n = (zWait.n||0)+1; if (zWait.n < 80) setTimeout(zWait, 400);
})();

/* ---------- 계산 ---------- */
let R = null;
const zBlank = () => ({mode:"calc", from:"calc", client:"", site:"", start:"", memo:"", perDay:S.rates.perDay||2, spaces:[], openArea:""});
function zLoad(){ try { const d = JSON.parse(localStorage.getItem("904.zdraft")||"null"); if (d && Array.isArray(d.spaces)) return {...zBlank(), ...d}; } catch(_){} return null; }
function zDraft(){ try { if (R) localStorage.setItem("904.zdraft", JSON.stringify({...R, mode:"calc"})); } catch(_){} }
const zOpenNow = () => !!(R && !$("#dlg").hidden && $("#dlg").querySelector("[data-zdlg]"));
const zUnder = l => l.min>0 && (Number(l.qty)||0) < l.min;
function zLine(l){
  const q = Number(l.qty)||0, W = S.rates.wages;
  const amt = zUnder(l) ? (Number(l.base)||0) : q*(Number(l.price)||0);
  const gi = q*(Number(l.gi)||0), jo = q*(Number(l.jo)||0);
  const labor = gi*(Number(W.gi)||0) + jo*(Number(W.jo)||0), mat = q*(Number(l.mat)||0), out = q*(Number(l.out)||0);
  return {amt, gi, jo, labor, mat, out, cost: labor+mat+out};
}
function zTot(){
  const t = {amt:0, gi:0, jo:0, labor:0, mat:0, out:0, cost:0, miss:0};
  for (const sp of R.spaces) for (const l of sp.lines){ const x = zLine(l); for (const k of ["amt","gi","jo","labor","mat","out","cost"]) t[k] += x[k];
    if (String(l.name).trim() && !x.cost) t.miss++; }
  t.margin = t.amt - t.cost; t.pct = t.amt ? Math.round(t.margin/t.amt*100) : 0;
  const pd = Math.max(1, Number(R.perDay)||1); t.days = Math.ceil((t.gi+t.jo)/pd*2)/2; return t;
}
const zSpAmt = sp => sp.lines.reduce((s,l)=>s+zLine(l).amt, 0);

/* ---------- 계산기 화면 ---------- */
function zLaHTML(l){
  const x = zLine(l); const crew = (x.gi||x.jo) ? `기공 ${z1(x.gi)}·보조 ${z1(x.jo)}품` : "인원 미입력";
  return `<b>${qf(x.amt)}</b><small>${crew} · 원가 ${qf(x.cost)}${zUnder(l)?` · ${l.min}${esc(l.unit)} 미만 기본`:""}</small>`;
}
function zLineHTML(l, i, j){
  return `<div class="zl"><input data-zl="${i}|${j}|name" value="${esc(l.name)}" placeholder="항목 이름" aria-label="항목">
    <button class="x" type="button" data-zx="${i}|${j}" aria-label="이 항목 빼기">×</button>
    <div class="zln2"><label><span>수량 (${esc(l.unit||"식")})</span><input class="num" data-zl="${i}|${j}|qty" inputmode="decimal" value="${esc(l.qty)}"></label>
      <label class="kv"><span>업체가</span><input class="num" data-zl="${i}|${j}|price" inputmode="numeric" value="${l.price?qf(l.price):""}" placeholder="0"></label>
      <div class="zla" data-zla="${i}|${j}">${zLaHTML(l)}</div></div></div>`;
}
function zSpaceHTML(sp, i){
  const items = S.rates.items.filter(r=>r.area===sp.area);
  const secs = ["base","opt","extra"].filter(s=>items.some(r=>r.sec===s));
  return `<section class="zsp"><div class="zsh"><input class="zsn" data-zsn="${i}" value="${esc(sp.name)}" aria-label="공간 이름"><span class="zss" data-zss="${i}">${qf(zSpAmt(sp))}</span>
      <button class="x" type="button" data-zsx="${i}" aria-label="공간 빼기">×</button></div>
    ${secs.map(s=>`<div class="zsec"><span class="zsl">${ZSEC[s]}</span><div class="qchips">${items.filter(r=>r.sec===s).map(r=>`<button type="button" class="qchip${sp.lines.some(l=>l.rid===r.id)?" on":""}" data-zpick="${i}|${esc(r.id)}">${esc(r.name)}</button>`).join("")}</div></div>`).join("")}
    ${!items.length?`<span class="hint">이 공간은 아직 기준 항목이 없어요. 기준 관리에서 추가하거나 아래에 직접 적어 주세요.</span>`:""}
    ${sp.lines.length?`<div class="zlines">${sp.lines.map((l,j)=>zLineHTML(l,i,j)).join("")}</div>`:""}
    <button class="lnk" type="button" data-zcustom="${i}" style="justify-self:start">+ 직접 입력</button></section>`;
}
function zTotHTML(){
  const t = zTot();
  return `<div class="ztot"><div class="kv"><span>업체 견적</span><b>${won(t.amt)}</b><small>부가세 별도</small></div>
    <div class="zc"><span>예상 원가</span><b>${won(t.cost)}</b><small>인건비 ${qf(t.labor)} · 자재 ${qf(t.mat)} · 외주 ${qf(t.out)}</small></div>
    <div class="km"><span>차익</span><b>${won(t.margin)}</b><small>견적 대비 ${t.pct}%</small></div>
    <div class="zc"><span>인원</span><b>${z1(t.gi+t.jo)}품</b><small>기공 ${z1(t.gi)} · 보조 ${z1(t.jo)} · 약 ${t.days}일</small></div></div>
    ${t.miss?`<p class="hint" style="margin:0">원가 안 넣은 항목 ${t.miss}개 (원가 0으로 계산)</p>`:""}`;
}
function zCalcHTML(){
  const comp = (S.comp?.list||[]).map(c=>`<option value="${esc(c.name)}"></option>`).join("");
  return `<div class="dl-h" data-zdlg="calc"><button class="lnk" id="zClose" type="button">닫기</button><b>견적 계산기</b><button class="lnk" id="zToRates" type="button">기준 관리</button></div>
  <div class="dl-b">
    <div class="two"><label class="fld">업체<input id="zClient" list="zComp" value="${esc(R.client)}" placeholder="예: 아르켓디자인"></label><label class="fld">시작일<input type="date" id="zStart" value="${esc(R.start)}"></label></div>
    <datalist id="zComp">${comp}</datalist>
    <label class="fld">현장<input id="zSite" value="${esc(R.site)}" placeholder="주소 또는 현장 이름"></label>
    <div class="zadd"><span class="zsl">공간 추가</span>${ZA_ADD.map(a=>`<button type="button" class="zab" data-zadd="${a}">+ ${ZA[a]}</button>`).join("")}</div>
    ${R.spaces.length ? R.spaces.map((sp,i)=>zSpaceHTML(sp,i)).join("") : `<div class="wempty">공간을 추가하고 버튼으로 시공 항목을 골라 주세요. 욕실을 두 번 누르면 욕실 2칸이에요.</div>`}
    <label class="fld">비고 (견적서에 표시)<textarea id="zMemo" placeholder="예) 타일·자재 업체 지급 / 도기 모델 확정 후 변동 가능">${esc(R.memo)}</textarea></label>
  </div>
  <div class="zfoot"><div id="zTotBox">${zTotHTML()}</div>
    <div class="zbar"><label class="zpd">하루<input class="num" id="zPerDay" inputmode="numeric" value="${esc(R.perDay)}" aria-label="하루 투입 인원">명 투입</label>
      <button class="btn ghost" id="zReset" type="button">비우기</button><button class="btn" id="zMake" type="button" ${R.spaces.some(s=>s.lines.some(l=>String(l.name).trim()))?"":"disabled"}>업체 견적서 만들기</button></div></div>`;
}

/* ---------- 기준 관리 화면 ---------- */
function zUnitCost(it){ const W = S.rates.wages; return (it.gi||0)*(W.gi||0) + (it.jo||0)*(W.jo||0) + (it.mat||0) + (it.out||0); }
const zrcTxt = it => { const c = zUnitCost(it); return `1${it.unit||"식"}당 원가 ${qf(c)} · 차익 ${qf((it.price||0)-c)}`; };
function zRateHTML(it){
  const showMin = ZFLOOR.includes(it.area) || it.base>0 || it.min>0; const id = esc(it.id);
  const f = (k, lbl, cls, dec) => `<label${cls?` class="${cls}"`:""}>${lbl}<input class="num" data-zr="${id}|${k}" inputmode="${dec?"decimal":"numeric"}" value="${it[k]?(dec?it[k]:qf(it[k])):""}" placeholder="0"></label>`;
  return `<div class="zri"><input data-zr="${id}|name" value="${esc(it.name)}" aria-label="항목 이름"><button class="x" type="button" data-zrdel="${id}" aria-label="항목 지우기">×</button>
    <div class="zrg"><label>단위<input data-zr="${id}|unit" value="${esc(it.unit)}"></label>${f("price","업체가","kv")}
      ${showMin?`${f("base","최소 금액")}${f("min","최소 수량","",1)}`:""}
      ${f("gi","기공 품","",1)}${f("jo","보조 품","",1)}${f("mat","자재비")}${f("out","외주비")}</div>
    <span class="hint zrc">${zrcTxt(it)}</span></div>`;
}
function zRatesHTML(){
  const W = S.rates.wages;
  return `<div class="dl-h" data-zdlg="rates"><button class="lnk" id="zBack" type="button">${R.from==="calc"?"← 계산기":"닫기"}</button><b>견적 기준</b><span style="width:52px"></span></div>
  <div class="dl-b">
    <p class="cintro">버튼 하나가 항목 하나예요. <b class="kv">업체가</b>는 업체에 보내는 금액이고, 기공·보조 품과 자재비·외주비는 실제로 들어가는 원가예요. 모두 단위(칸·평·개) 하나당 금액이에요. 최소 수량이 있는 항목은 그보다 적으면 최소 금액으로 잡혀요 (예: 3평 미만 기본 15만).</p>
    <div class="zwage"><label class="fld">기공 일당 (1품)<input class="num" data-zw="gi" inputmode="numeric" value="${W.gi?qf(W.gi):""}"></label><label class="fld">보조 일당 (1품)<input class="num" data-zw="jo" inputmode="numeric" value="${W.jo?qf(W.jo):""}"></label></div>
    ${ZA_ADD.map(a=>{ const items = S.rates.items.filter(i=>i.area===a); const secs = a==="common" ? ["extra"] : ["base","opt"];
      return `<details class="pricebox zre" data-zarea="${a}"${R.openArea===a?" open":""}><summary>${ZA[a]} <span class="hint">· ${items.length}개</span></summary>
        ${secs.map(s=>`<div class="kgh"><b>${ZSEC[s]}</b><button class="lnk" type="button" data-zradd="${a}|${s}">+ 항목</button></div>
          <div class="zrlist">${items.filter(i=>i.sec===s).map(zRateHTML).join("") || `<span class="hint">아직 없어요</span>`}</div>`).join("")}</details>`; }).join("")}
  </div>`;
}

/* ---------- 열기 · 그리기 ---------- */
function zRender(){
  const b = $("#dlg .dl-b"); const st = b && $("#dlg").querySelector("[data-zdlg]") ? b.scrollTop : 0;
  const d = $("#dlg"); d.innerHTML = R.mode==="rates" ? zRatesHTML() : zCalcHTML(); d.classList.add("qwide");
  const nb = $("#dlg .dl-b"); if (nb) nb.scrollTop = st;
}
function zOpen(mode){
  if (!R) R = zLoad() || zBlank();
  R.mode = mode; R.from = mode; if (typeof Q !== "undefined") Q = null;
  $("#dlg").innerHTML = ""; zRender(); $("#dlg").hidden = $("#dlgScrim").hidden = false;
}
function zUpdLine(i, j){
  const l = R.spaces[i]?.lines[j]; const a = document.querySelector(`[data-zla="${i}|${j}"]`); if (l && a) a.innerHTML = zLaHTML(l);
  const s = document.querySelector(`[data-zss="${i}"]`); if (s && R.spaces[i]) s.textContent = qf(zSpAmt(R.spaces[i]));
  const t = $("#zTotBox"); if (t) t.innerHTML = zTotHTML();
}
function zRead(){ if (!$("#zClient")) return; R.client = $("#zClient").value.trim(); R.site = $("#zSite").value.trim(); R.start = $("#zStart").value; R.memo = $("#zMemo").value; }
const zFromRate = r => ({rid:r.id, sec:r.sec, name:r.name, unit:r.unit, g:r.g, qty: r.unit==="평" ? (r.min||1) : 1,
  price:r.price, base:r.base, min:r.min, gi:r.gi, jo:r.jo, mat:r.mat, out:r.out});

async function zMake(){
  zRead(); const t = zTot(); const items = [];
  for (const sp of R.spaces) for (const l of sp.lines){
    if (!String(l.name).trim()) continue; const q = Number(l.qty)||0; const under = zUnder(l);
    const price = under ? (Number(l.base)||0) : (Number(l.price)||0);
    const memo = [sp.name, under ? `${q}${l.unit} (${l.min}${l.unit} 미만 기본)` : ""].filter(Boolean).join(" · ");
    items.push({g: l.g || guessGroup(l.name), name: String(l.name).trim(), memo, unit: under ? "식" : (l.unit||"식"), qty: under ? 1 : q, c: price, v: price, price});
  }
  const cnt = {}; for (const sp of R.spaces) if (sp.area!=="common" && sp.lines.length) cnt[sp.area] = (cnt[sp.area]||0)+1;
  const title = Object.entries(cnt).map(([a,n])=>a==="bath"?`욕실 ${n}칸`:(n>1?`${ZA[a]} ${n}곳`:ZA[a])).join(" · ") || "시공";
  const data = {client:R.client, title, site:R.site, phone:"", start:R.start, end:"", baths:cnt.bath||0, tileSize:"", items, vat:false, memo:R.memo,
    status:"draft", source:"", eventId:"", createdAt:new Date().toISOString(),
    calc:{amt:t.amt, labor:t.labor, mat:t.mat, out:t.out, cost:t.cost, margin:t.margin, gi:t.gi, jo:t.jo, perDay:Number(R.perDay)||2, days:t.days, wages:{...S.rates.wages},
      spaces: R.spaces.map(sp=>({name:sp.name, area:sp.area, lines:sp.lines.filter(l=>String(l.name).trim())}))}};
  if (!S.db){ toast("미리보기에서는 저장되지 않아요"); return; }
  const qid = newId("quotes");
  if (await write(()=>S.db.collection("quotes").doc(qid).set(data), "업체 견적서를 만들었어요")){
    R = zBlank(); zDraft(); openQuote(qid, {...data, id:qid});
  }
}

/* ---------- 입력 ---------- */
document.addEventListener("input", e => {
  const t = e.target; if (!zOpenNow() || !S.canWrite) return;
  if (t.dataset.zr){ const [id,f] = t.dataset.zr.split("|"); const it = S.rates.items.find(x=>x.id===id); if (!it) return;
    it[f] = (f==="name"||f==="unit") ? t.value : zNum(t.value); zSaveRates();
    const c = t.closest(".zri")?.querySelector(".zrc"); if (c) c.textContent = zrcTxt(it); return; }
  if (t.dataset.zw){ S.rates.wages[t.dataset.zw] = zNum(t.value); zSaveRates();
    document.querySelectorAll("#dlg .zri").forEach(row=>{ const id = row.querySelector("[data-zr]")?.dataset.zr.split("|")[0]; const it = S.rates.items.find(x=>x.id===id); const c = row.querySelector(".zrc"); if (it && c) c.textContent = zrcTxt(it); }); return; }
  if (t.dataset.zl){ const [i,j,f] = t.dataset.zl.split("|"); const l = R.spaces[+i]?.lines[+j]; if (!l) return;
    l[f] = f==="name" ? t.value : (t.value.trim()==="" ? "" : zNum(t.value)); zUpdLine(+i, +j); zDraft();
    const mk = $("#zMake"); if (mk) mk.disabled = !R.spaces.some(s=>s.lines.some(x=>String(x.name).trim())); return; }
  if (t.dataset.zsn !== undefined){ const sp = R.spaces[+t.dataset.zsn]; if (sp){ sp.name = t.value; zDraft(); } return; }
  if (t.id==="zPerDay"){ R.perDay = zNum(t.value) || 1; const b = $("#zTotBox"); if (b) b.innerHTML = zTotHTML(); zDraft(); return; }
  if (["zClient","zSite","zStart","zMemo"].includes(t.id)){ zRead(); zDraft(); }
});
document.addEventListener("focusout", e => {
  const t = e.target; if (!zOpenNow()) return;
  const k = t.dataset?.zr ? t.dataset.zr.split("|")[1] : t.dataset?.zl ? t.dataset.zl.split("|")[2] : t.dataset?.zw ? "w" : "";
  if (["price","base","mat","out","w"].includes(k) && t.value.trim()) t.value = qf(zNum(t.value));
});
document.addEventListener("toggle", e => { const d = e.target; if (d.dataset?.zarea && R){ if (d.open) R.openArea = d.dataset.zarea; else if (R.openArea===d.dataset.zarea) R.openArea = ""; } }, true);
function zArm(t, label){ if (t.dataset.arm) return true; t.dataset.arm = "1"; const old = t.textContent; t.textContent = label; t.classList.add("zarm");
  setTimeout(()=>{ if (t.isConnected){ delete t.dataset.arm; t.textContent = old; t.classList.remove("zarm"); } }, 3000); return false; }
document.addEventListener("click", async e => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.id==="zcOpen"){ zOpen("calc"); return; }
  if (t.id==="zrOpen"){ zOpen("rates"); return; }
  if (!zOpenNow() || !$("#dlg").contains(t)) return;
  if (t.id==="zClose"){ zRead(); zDraft(); closeDlg(); return; }
  if (t.id==="zToRates"){ zRead(); zDraft(); R.mode = "rates"; R.from = "calc"; zRender(); return; }
  if (t.id==="zBack"){ zSaveRates(true); if (R.from==="calc"){ R.mode = "calc"; zRender(); } else closeDlg(); return; }
  if (!S.canWrite) return;
  if (t.dataset.zadd){ zRead(); const a = t.dataset.zadd; const n = R.spaces.filter(s=>s.area===a).length;
    R.spaces.push({id:zid(), area:a, name: a==="bath" ? `욕실 ${n+1}` : (n ? `${ZA[a]} ${n+1}` : ZA[a]), lines:[]}); zDraft(); zRender();
    const secs = document.querySelectorAll("#dlg .zsp"); secs[secs.length-1]?.scrollIntoView({block:"nearest"}); return; }
  if (t.dataset.zpick){ zRead(); const [i, rid] = t.dataset.zpick.split("|"); const sp = R.spaces[+i]; const r = S.rates.items.find(x=>x.id===rid); if (!sp || !r) return;
    const have = sp.lines.find(l=>l.rid===rid);
    if (r.sec==="base"){ if (have){ sp.lines = sp.lines.filter(l=>l!==have); } else { sp.lines = sp.lines.filter(l=>l.sec!=="base"); sp.lines.unshift(zFromRate(r)); } }
    else if (have) have.qty = (Number(have.qty)||0) + 1; else sp.lines.push(zFromRate(r));
    zDraft(); zRender(); return; }
  if (t.dataset.zx){ zRead(); const [i,j] = t.dataset.zx.split("|").map(Number); R.spaces[i]?.lines.splice(j,1); zDraft(); zRender(); return; }
  if (t.dataset.zsx !== undefined){ if (!zArm(t, "빼기?")) return; zRead(); R.spaces.splice(+t.dataset.zsx, 1); zDraft(); zRender(); return; }
  if (t.dataset.zcustom !== undefined){ zRead(); const sp = R.spaces[+t.dataset.zcustom]; if (!sp) return;
    sp.lines.push({rid:null, sec:"extra", name:"", unit:"식", g:"", qty:1, price:0, base:0, min:0, gi:0, jo:0, mat:0, out:0}); zDraft(); zRender();
    const ins = document.querySelectorAll(`#dlg [data-zl^="${t.dataset.zcustom}|"][data-zl$="|name"]`); ins[ins.length-1]?.focus(); return; }
  if (t.id==="zReset"){ if (!zArm(t, "한 번 더 누르면 비워져요")) return; R = zBlank(); zDraft(); zRender(); return; }
  if (t.id==="zMake"){ t.disabled = true; await zMake(); if (t.isConnected) t.disabled = false; return; }
  if (t.dataset.zradd){ const [a,s] = t.dataset.zradd.split("|"); const it = {id:zid(), area:a, sec:s, name:"새 항목", unit: ZFLOOR.includes(a) ? "평" : (a==="bath" ? (s==="base"?"칸":"개") : "칸"),
      g: a==="common" ? "" : "tile", price:0, base:0, min:0, gi:0, jo:0, mat:0, out:0};
    S.rates.items.push(it); R.openArea = a; zRender(); zSaveRates(true);
    const inp = document.querySelector(`#dlg [data-zr="${it.id}|name"]`); if (inp){ inp.focus(); inp.select(); } return; }
  if (t.dataset.zrdel){ if (!zArm(t, "삭제?")) return; S.rates.items = S.rates.items.filter(x=>x.id!==t.dataset.zrdel); zRender(); zSaveRates(true); return; }
});

/* ---------- 견적 탭에 붙이기 ---------- */
const _zRQ = renderQuotes;
renderQuotes = function(){
  _zRQ(); if (!S.canWrite) return; const st = $("#quote .stack"); if (!st) return;
  const c = document.createElement("div"); c.className = "qcard zcard";
  c.innerHTML = `<h3 style="margin:0">견적 계산기</h3><p class="cintro">공간을 추가하고 버튼으로 시공 항목을 고르면 업체 견적가, 예상 인건비·자재·외주비, 차익, 들어갈 인원이 바로 계산돼요. 다 고르면 업체에 보낼 견적서로 만들어져요.</p>
    <div class="row" style="flex-wrap:wrap"><button class="btn" id="zcOpen" type="button">견적 계산하기</button><button class="btn ghost" id="zrOpen" type="button">견적 기준 관리 (업체가·인건비)</button><button class="btn ghost" type="button" onclick="setTab('est')">예상 견적 (인원)</button></div>`;
  st.prepend(c);
};
const _zRQD = renderQdlg;
renderQdlg = function(){
  _zRQD(); if (!Q || !Q.calc) return; const c = Q.calc; const tot = qRows(Q).reduce((s,it)=>s+qAmt(it,"c"),0); const m = tot - (c.cost||0);
  const box = document.createElement("div"); box.className = "zcalc";
  box.innerHTML = `<b>내부용 · 계산기 기준 (견적서에는 안 나가요)</b>
    <span>예상 원가 ${won(c.cost)} · 인건비 ${qf(c.labor)} · 자재 ${qf(c.mat)} · 외주 ${qf(c.out)}</span>
    <span>인원 ${z1((c.gi||0)+(c.jo||0))}품 (기공 ${z1(c.gi)} · 보조 ${z1(c.jo)}) · 하루 ${c.perDay||2}명이면 약 ${c.days}일</span>
    <span class="zcm">차익 ${won(m)} · ${tot?Math.round(m/tot*100):0}% <small>(지금 견적 합계 ${won(tot)} 기준)</small></span>`;
  const t = $("#qTot"); if (t) t.after(box);
};
