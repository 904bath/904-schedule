/* 904 캘린더 · 일정 편집 창 · 사진 */
/* ---------- 일정 편집 ---------- */
let D = null; // 편집 중 일정
function openEvent(id, dayK){
  closeSheet();
  const src = id ? S.events.get(id) : null;
  const base = dayK || S.sel || todayK();
  D = src ? structuredClone(src) : {id: null, title:"", start: base, end: base, time:"", color:"", kinds:[], memo:"", crew:{}, off:[], photos:[], pending:false, source:"", days:{}, photoInfo:{}};
  D.crew = D.crew || {}; D.ext = D.ext || {}; D.planRoom = D.planRoom || {}; D.doneDays = D.doneDays || {}; D.byDay = D.byDay || {}; D.half = D.half || {}; D.split = D.split || {}; D.planAck = Array.isArray(D.planAck) ? D.planAck : []; D.off = D.off || []; D.kinds = D.kinds || []; D.photos = D.photos || []; D.days = D.days || {}; D.photoInfo = D.photoInfo || {}; D.proc = procOf(D, true); D.plan = planOf(D, D.proc); D.client = clientOf(D); // 공정은 색과 상관없이 불러두고, 보여줄지는 주인으로 정함
  D._day = dayK && dayK >= D.start && dayK <= evEnd(D) ? dayK : D.start; D._arm = false; D._open = new Set(); D._orig = src ? {start: src.start, end: evEnd(src)} : null; D._addr0 = D.addr; // 기존 일정은 칸마다 접어서 요약만 · 수정 누르면 열림
  $("#dlg").innerHTML = ""; renderDlg(); $("#dlg").hidden = $("#dlgScrim").hidden = false; 
}
// 누른 버튼이 화면에서 제자리에 있게: 위 카드가 접히거나 펼쳐져도 화면이 확 밀리지 않음
let _dlgAnchor = null;
document.addEventListener("click", ev => { const t = ev.target.closest?.("#dlg .dl-b button"); if (!t){ _dlgAnchor = null; return; }
  const a = [...t.attributes].find(x => x.name.startsWith("data-")); if (!a){ _dlgAnchor = null; return; }
  const sel = `[${a.name}="${CSS.escape(a.value)}"]`, idx = [...document.querySelectorAll("#dlg .dl-b " + sel)].indexOf(t);
  _dlgAnchor = {sel, idx, top: t.getBoundingClientRect().top, at: Date.now()}; }, true);
function renderDlg(){ const b0 = $("#dlg .dl-b"); const sc = b0 ? b0.scrollTop : 0, an = _dlgAnchor && Date.now() - _dlgAnchor.at < 1500 ? _dlgAnchor : null; _dlgAnchor = null;
  renderDlg0(); const b1 = $("#dlg .dl-b"); if (b1 && sc) b1.scrollTop = sc;
  if (b1 && an){ const L = b1.querySelectorAll(an.sel), el = L[an.idx] || L[0]; if (el) b1.scrollTop += el.getBoundingClientRect().top - an.top; } }
function renderDlg0(){
  const ro = !S.canWrite; const dis = ro ? "disabled" : "";
  const days = range(D.start, evEnd(D)).slice(0,62);
  if (!days.includes(D._day)) D._day = days[0];
  const isOff = D.off.includes(D._day); const sel = new Set(D.crew[D._day]||[]);
  // 같은 날 다른 일정에 이미 배정된 사람: workerId -> 현장 이름
  const busy = new Map();
  for (const e of eventsOn(D._day)){
    if (D.id && e.id === D.id) continue;
    for (const id of crewOn(e, D._day)) if (!busy.has(id)) busy.set(id, e.title || "다른 일정");
  }
  // 우리팀은 위(등급별 줄), 연합원은 아래에 팀별로
  const pickBtn = w => { const g = groupOf(w), b = busy.get(w.id);
    return `<button type="button" class="wp g-${g}${b?" busy":""}" data-pick="${esc(w.id)}" aria-pressed="${sel.has(w.id)}" ${b?`title="${esc(md(D._day))} ${esc(b)} 배정됨"`:""} ${dis||(isOff?"disabled":"")}>${esc(w.name)}${b?`<small class="bz">${esc(b)}</small>`:""}</button>`; };
  const byBusyName = (a,b) => (busy.has(a.id)?1:0)-(busy.has(b.id)?1:0) || (a.name||"").localeCompare(b.name||"","ko");
  const allW = [...S.workers.values()];
  const oursW = allW.filter(w => !teamOf(w)), teamsW = [...new Set(allW.map(teamOf).filter(Boolean))];
  const oursRows = GROUPS.map(g => { const ws = oursW.filter(w => groupOf(w)===g).sort(byBusyName); return ws.length ? `<div class="grp">${ws.map(pickBtn).join("")}</div>` : ""; }).join("");
  const groupsHTML = (teamsW.length ? `<div class="wgrp"><span class="wt">우리팀</span>${oursRows || `<span class="hint">없음</span>`}</div>` : oursRows)
    + teamsW.map(t => { const ws = allW.filter(w => teamOf(w)===t).sort((a,b) => GROUPS.indexOf(groupOf(a)) - GROUPS.indexOf(groupOf(b)) || byBusyName(a,b));
      return `<div class="wgrp"><span class="wt">연합팀 · ${esc(t)}</span><div class="grp">${ws.map(pickBtn).join("")}</div></div>`; }).join("");
  const busyN = [...busy.keys()].filter(id => S.workers.has(id)).length;
  const noProcCrew = !!effColor() && !bathOwner(effColor());
  const is904d = !!effColor() && bathOwner(effColor()) && pr({color: effColor()}) === 0; // 904: 구역 → 공정 순서 (타일 크기·방법은 공정의 타일 단계에서) // 동식·희태 등 904 아닌 현장: 공정·날짜별 투입 인원 칸 안 보임 (달력에서 바로 보임)
  $("#dlg").innerHTML = `
  <div class="dl-h"><button class="lnk" id="dCancel">닫기</button><b>${D.id?(ro?"일정 보기":"일정 수정"):"새 일정"}</b>
    ${ro?`<span style="width:40px"></span>`:`<button class="btn" id="dSave" style="height:34px">저장</button>`}</div>
  <form class="dl-b" id="dForm">
    ${pr(D) === 0 || bathOwner(D.color) ? `<div class="seg s-tent"><button type="button" data-dtent="0" aria-pressed="${!D.tent}" ${dis}>확정</button><button type="button" data-dtent="1" aria-pressed="${!!D.tent}" ${dis}>예정 (아직 확정 아님)</button></div>` : ""}
    ${D.pending ? `<div class="srcbox"><b>카톡에서 가져온 일정이에요. 내용을 확인해 주세요.</b>${D.source?`<p>${esc(D.source)}</p>`:""}${ro?"":`<div class="row"><button type="button" class="btn" id="dApprove">확인하고 등록</button><span class="hint">틀린 내용은 고친 뒤 누르세요. 필요 없으면 아래 '일정 삭제'.</span></div>`}</div>` : ""}
    ${fold("own", "누구 현장", foldOwner(), () => ownerHTML(ro) + clientHTML(ro), !!(effColor() && String(D.client||"").trim()))}
    ${fold("area", "시공 구역", foldArea(), () => areaHTML(ro))}
    ${is904d && !noProcCrew ? fold("proc", "공정", foldProc(), () => procHTML(ro)) : ""}
    ${topWarnHTML()}
    ${missHTML()}
    ${fold("date", "기간", foldDate(), () => miniCalHTML(ro), !!D._dateSet)}
    ${fold("site", "현장 정보", foldSite(), () => siteHTML(ro), true)}
    ${noProcCrew || is904d ? "" : fold("proc", "공정", foldProc(), () => procHTML(ro))}
    ${noProcCrew || !D.id ? "" : fold("crew", "투입 인원", foldCrew(), () => `<div class="fld">날짜별 투입 인원
      <div class="crewbox">
        <div class="dt-row">${days.map(k=>{ const n=(D.off.includes(k)?0:(D.crew[k]||[]).length);
          const pl = (D.plan[k]||[]).filter(u => D.proc[UNIT[u].k]).map(u => UNIT[u].s).join("·");
          return `<button type="button" class="dt${k===D._day?" on":""}${D.off.includes(k)?" isoff":""}${isWknd(k)?" wknd":""}" data-dt="${k}">${md(k)}<small>${D.off.includes(k)?"쉼":WD[wdOf(k)]+" · "+n+"명"}</small>${pl?`<small class="dtp">${pl}</small>`:""}</button>`; }).join("")}</div>
        ${S.workers.size ? `<div class="grp"><button type="button" class="wp offb" id="offBtn" aria-pressed="${isOff}" ${dis}>쉬는 날</button></div>${busyN && !isOff ? `<div class="hint"><span class="bzkey"></span>흐린 이름은 ${md(D._day)} 다른 일정에 이미 배정된 사람이에요</div>`:""}${groupsHTML}${moveHTML(sel, busy, dis)}` : `<div class="hint">인원 탭에서 사람을 먼저 등록하면 여기서 고를 수 있어요.</div>`}
        ${!ro && S.workers.size && days.length>1 ? `<div class="row" style="justify-content:space-between"><span class="hint">${md(D._day)} ${isOff?"쉬는 날":sel.size+"명 선택"}</span><button type="button" class="lnk" id="copyAll">이 인원을 모든 날에 적용</button></div>`:""}
        <div class="two"><label class="fld">${md(D._day)} 집합 시간<input type="time" id="fDayTime" value="${esc(D.days[D._day]?.time||"")}" ${dis}></label>
          <label class="fld">${md(D._day)} 작업 내용<input id="fDayNote" value="${esc(D.days[D._day]?.note||"")}" placeholder="예: 1~3층 계단 타일" ${dis}></label></div>
        <label class="fld">${md(D._day)} 외부 지원 <span class="hint">명부에 없는 사람 · 쉼표로 구분</span><input id="fExt" value="${esc((D.ext[D._day]||[]).join(", "))}" placeholder="예: 진석, 상규" autocomplete="off" ${dis||(isOff?"disabled":"")}></label>
      </div></div>`)}
    ${fold("photo", "사진", D.photos.length ? D.photos.length + "장" : "없음", () => `<div class="fld">사진 ${D.photos.length?`<span class="hint">${D.photos.length}장 · 날짜·시간대별</span>`:""}
      ${photosHTML(ro)}<div class="phs">
        ${!ro && S.assets ? `<label class="phadd" style="position:relative">${D._up?"올리는 중…":"+ 사진 추가"}<input type="file" id="fPhotos" accept="image/*" multiple></label>` : ""}</div>
      ${!D.photos.length && (ro || !S.assets) ? `<span class="hint">사진이 없어요</span>` : ""}</div>`)}
    ${fold("memo", "메모", D.memo ? String(D.memo).replace(/\s+/g, " ").slice(0, 40) + (String(D.memo).length > 40 ? "…" : "") : "없음", () => `<label class="fld">메모<textarea id="fMemo" placeholder="주소, 연락처, 자재, 특이사항" ${dis}>${esc(D.memo||"")}</textarea></label>`)}
  </form>
  ${D.id && !ro ? `<div class="dl-f"><span class="hint">${days.length}일 일정</span><button class="lnk dg${D._arm?" arm":""}" id="dDel">${D._arm?"한 번 더 누르면 삭제":"일정 삭제"}</button></div>`:""}`;
}
/* 접기: 기존 일정은 칸마다 요약 한 줄 · [수정]을 눌러야 열림 */
function fold(name, label, summary, body, auto){ // auto: 새 일정이어도 다 고르면 접음 (예: 누구 현장 · 업체 고르면)
  const can = !!(D.id || auto);
  if (!can || D._open?.has(name)) return `<div class="fold-open">${can ? `<button type="button" class="fold-x" data-fold="${name}">${esc(label)} 접기 ▴</button>` : ""}${body()}</div>`;
  return `<button type="button" class="fold" data-fold="${name}"><span class="fk">${esc(label)}</span><span class="fv">${summary}</span><span class="fe">수정</span></button>`;
}
function foldOwner(){ const l = leaderByColor(effColor()); return `${l ? `<i class="gdot c-${l.color}"></i>${esc(l.name)}` : `<span class="ng">미정</span>`} · <b>${esc(autoTitle())}</b>`; }
/* 시공 구역: 누구 현장 다음에 고름 · 공정·날짜별 구역 표시(D.rooms)와 같은 목록 */
const ZONES_ALL = ["외욕실","내욕실","주방","현관","안방베란다","거실베란다","세탁실"];
const zonesFor = () => ZONES_ALL; // 타일 시공은 베란다·현관 등 전부 들어감 · 외주(철거·방수 등)는 욕실만 (core.js procRooms)
function foldArea(){ const R = D.rooms || []; return R.length ? esc(R.map(r => { const t = zsText(r); return t ? `${r} ${t}` : r; }).join(" · ")) : `<span class="mut">안 정함</span>`; }
/* 구역별 시공 내용 → D.zoneSpec {외욕실: {work, demo, size, method, opts:{젠다이:"조적 쌓기", 졸리컷:["젠다이"], ...}}} · 고르면 나머지는 숨김 (다시 누르면 다시 보임) */
const ZS_WORK = ["철거 후 시공", "덧방"];
const ZS_DEMO = ["올철거", "벽만 철거", "바닥만 철거", "욕조 자리만", "도기만 철거", "부분 철거"];
// 300각 = 바닥용, 300×600 = 벽용 · 욕실·주방은 벽 타일 + 모자이크, 베란다·현관·세탁실은 바닥 타일
const zsSizes = r => /주방/.test(r) ? ["300×600", "600각", "800각", "600×1200", "모자이크", "기타"] : isBathRoom(r) ? ["300×600", "600각", "600×1200", "모자이크", "기타"]
  : /베란다|현관|세탁실/.test(r) ? ["300각", "600각", "600×1200", "기타"] : ["300각", "300×600", "600각", "600×1200", "모자이크", "기타"];
const ZS_METHOD = ["에폭시", "본드", "드라이"]; // 떠발이는 시공 안 함
// 600각·600×1200은 벽(욕실·주방) 시공 때 무거워서 본드·떠발이 안 됨
const zsWall = r => isBathRoom(r) || /주방/.test(r);
const zsFloor = r => /베란다|현관|세탁실/.test(r); // 바닥: 공법 없음
const zsHasWork = r => isBathRoom(r) || /베란다|세탁실/.test(r); // 철거 후·덧방: 욕실 · 베란다·세탁실 (철거 범위는 욕실만)
const zsHeavy = (r, size) => zsWall(r) && (size === "600각" || size === "800각" || size === "600×1200");
const zsMethods = r => { const x = (D.zoneSpec || {})[r] || {}; return zsMethodsFor(r, x); };
// 600×1200은 드라이 안 함 · 600각 이상 벽은 본드·떠발이 안 됨
const zsMethodsFor = (r, x) => ZS_METHOD.filter(m => !(x.size === "600×1200" && m === "드라이") && !(zsHeavy(r, x.size) && (m === "본드" || m === "떠발이")));
const zsOf = r => (D.zoneSpec = D.zoneSpec || {})[r] || {};
// 추가 항목: [이름, 세부 선택(없으면 [])] · 졸리컷은 젠다이·파티션·비드벽·창틀 고르면 나옴 · 시다지는 바닥 철거할 때만
const ZS_OPT_BATH = [["젠다이", ["하프 조적", "풀 조적", "기존 젠다이"]], ["욕조", ["치마 타일", "플라스틱"]], ["파티션", ["하프 조적", "풀 조적", "하프 폼", "풀 폼"]], ["파티션 선반", []], ["시다지", []], ["비드벽", []], ["창틀", []], ["싯기", ["타일 싯기", "대리석 싯기"]], ["코너선반", []], ["졸리컷", null]]; // 파티션 선반은 파티션 있을 때 · 코너선반은 600각 이상일 때
const ZS_JOLLY = ["젠다이", "파티션", "비드벽", "창틀"];
const zsFloorDemo = x => x.work === "철거 후 시공" && (x.demo === "올철거" || x.demo === "바닥만 철거");
function zsOptList(r, x){
  if (isBathRoom(r)) return ZS_OPT_BATH.filter(([n]) => (n !== "시다지" || zsFloorDemo(x)) && (n !== "졸리컷" || (x.size !== "300×600" && x.size !== "모자이크" && ZS_JOLLY.some(j => x.opts?.[j]))) && (n !== "파티션 선반" || x.opts?.파티션) && (n !== "코너선반" || x.size === "600각" || x.size === "600×1200"));
  if (/베란다|세탁실/.test(r)) return [["걸레받이", x.size === "300각" ? ["300각", "300×600"] : []], ["단(시다지)", []], ["샷시 아래", []]];
  if (/현관/.test(r)) return [["걸레받이", []], ["단(시다지)", []]];
  return [];
}
// 고른 값 중 더는 안 맞는 것 정리 (덧방이면 철거 범위 빼기 · 바닥 철거 아니면 시다지 빼기 · 졸리컷은 고른 것만)
function zsNorm(r, x){
  if (!zsHasWork(r)){ delete x.work; delete x.demo; } else if (x.work !== "철거 후 시공" || !isBathRoom(r)) delete x.demo;
  if (zsFloor(r)) delete x.method; else if (x.method && !zsMethods(r).includes(x.method)) delete x.method;
  const o = x.opts || {}, ok = new Set(zsOptList(r, x).map(([n]) => n));
  for (const k of Object.keys(o)) if (!ok.has(k)) delete o[k];
  if (Array.isArray(o.졸리컷)){ o.졸리컷 = o.졸리컷.filter(j => o[j]); }
  if (o.걸레받이 && o.걸레받이 !== true && x.size !== "300각") o.걸레받이 = true;
  if (Object.keys(o).length) x.opts = o; else delete x.opts;
  return x;
}
function zsClean(r, x0){ const x = zsNorm(r, structuredClone(x0 || {})); for (const k of Object.keys(x)) if (x[k] === "" || x[k] == null) delete x[k]; return x; }
const zsOptTxt = (n, v) => v === true || (Array.isArray(v) && !v.length) ? n : `${n}(${Array.isArray(v) ? v.join("·") : String(v).replace(/ 쌓기| 타일| 젠다이| 싯기/g, "")})`;
/* 욕실 시공 범위: 기본 전체 · 바꾸기 누르면 욕조 자리·한 벽 등 여러 개 + 직접 입력 · zoneSpec[r].scope / scopeNote */
const SC_OPTS = ["욕조 자리", "한 벽", "두 벽", "바닥만", "벽만"];
const scText = x => [...(x.scope || []), x.scopeNote || ""].filter(Boolean).join("·");
function scopeHTML(ro){
  const dis = ro ? "disabled" : "", B = (D.rooms || []).filter(isBathRoom); if (!B.length) return "";
  D._scOpen = D._scOpen || {};
  const b = (attrs, sel, label) => `<button type="button" class="opt" ${attrs} aria-pressed="${sel}" ${dis}>${sel ? "✓ " : ""}${label}</button>`;
  return `<div class="fld" style="margin-top:6px">욕실 시공 범위 <span class="hint">기본은 전체 · 일부만 하면 바꾸기</span>` + B.map(r => { const x = (D.zoneSpec || {})[r] || {}, sc = x.scope || [], open = !ro && D._scOpen[r], all = !sc.length && !x.scopeNote;
    let h = `<div class="zsrow"><span class="zsl2" style="flex:0 0 46px;white-space:nowrap">${esc(r)}</span><span class="zsopts">`;
    if (!open) h += (all ? b(`data-zsc="${esc(r)}|전체"`, true, "전체") : sc.map(o => b(`data-zsc="${esc(r)}|${esc(o)}"`, true, esc(o))).join("") + (x.scopeNote ? `<span class="hint" style="align-self:center">${esc(x.scopeNote)}</span>` : ""))
      + (ro ? "" : `<button type="button" class="lnk" data-zscopen="${esc(r)}">바꾸기</button>`);
    else h += b(`data-zsc="${esc(r)}|전체"`, all, "전체") + SC_OPTS.map(o => b(`data-zsc="${esc(r)}|${esc(o)}"`, sc.includes(o), esc(o))).join("")
      + `<input data-zscnote="${esc(r)}" value="${esc(x.scopeNote || "")}" placeholder="직접 (예: 욕조 자리 + 수전 벽 한 면)" autocomplete="off" style="flex:1 1 100%;min-width:0">`
      + `<button type="button" class="lnk" data-zscopen="${esc(r)}">다 골랐어요</button>`;
    return h + `</span></div>`; }).join("") + `</div>`;
}
document.addEventListener("click", ev => { const t = ev.target.closest("[data-zsc],[data-zscopen]"); if (!t || !D || !$("#dlg").contains(t)) return; readForm();
  D._scOpen = D._scOpen || {};
  if (t.dataset.zscopen){ const r = t.dataset.zscopen; D._scOpen[r] = !D._scOpen[r]; renderDlg(); return; }
  const [r, o] = t.dataset.zsc.split("|"); D.zoneSpec = D.zoneSpec || {}; const x = D.zoneSpec[r] = {...(D.zoneSpec[r] || {})};
  if (o === "전체"){ if (!D._scOpen[r]){ D._scOpen[r] = true; renderDlg(); return; } delete x.scope; delete x.scopeNote; }
  else { const a = x.scope || []; x.scope = a.includes(o) ? a.filter(z => z !== o) : [...a, o]; if (!x.scope.length) delete x.scope; }
  renderDlg(); });
document.addEventListener("input", ev => { const t = ev.target.closest?.("[data-zscnote]"); if (!t || !D) return; const r = t.dataset.zscnote;
  D.zoneSpec = D.zoneSpec || {}; const x = D.zoneSpec[r] = {...(D.zoneSpec[r] || {})}; const v = t.value.trim(); if (v) x.scopeNote = v; else delete x.scopeNote; });
const zsText = r => { const x = (D.zoneSpec || {})[r] || {};
  const dm = x.dim && x.dim.w && x.dim.l ? `${x.dim.w}×${x.dim.l}` : "";
  const head = [scText(x) ? `범위 ${scText(x)}` : "", dm, x.qty || "", zsHasWork(r) ? (x.work === "철거 후 시공" ? (x.demo || "철거") : x.work) : "", x.size, zsFloor(r) ? "" : x.method].filter(Boolean).join("·");
  const op = Object.entries(x.opts || {}).map(([n, v]) => zsOptTxt(n, v)).join("·");
  return [head, op ? "+" + op : ""].filter(Boolean).join(" "); };
/* 크기 표준 (가로×세로 m, 천장 2.3m) · 20·30·40·50평대 고르거나 직접 입력 · 가로세로는 바로 고칠 수 있음 */
const ZDIM_STD = {
  outBath: {20: [1.5, 2.0], 30: [1.6, 2.3], 40: [1.8, 2.5], 50: [2.0, 2.6]},  // 외욕실(공용)
  inBath:  {20: [1.3, 1.8], 30: [1.5, 2.1], 40: [2.0, 2.8], 50: [2.3, 3.2]},  // 내욕실(안방)
  entry:   {20: [1.2, 1.0], 30: [1.5, 1.2], 40: [2.0, 1.5], 50: [2.4, 1.8]},
  laundry: {20: [1.3, 2.0], 30: [1.5, 2.5], 40: [1.8, 3.0], 50: [2.0, 3.2]},
  bedVer:  {20: [1.2, 3.0], 30: [1.3, 3.5], 40: [1.5, 4.0], 50: [1.6, 4.5]},  // 안방베란다
  livVer:  {20: [1.4, 4.5], 30: [1.5, 5.5], 40: [1.6, 6.5], 50: [1.7, 7.5]}}; // 거실베란다 (비확장)
const ZH = 2.3, PY = 3.3058;
const zdimKind = r => isBathRoom(r) ? (/내욕실|안방욕실/.test(r) ? "inBath" : "outBath") : /현관/.test(r) ? "entry" : /세탁실/.test(r) ? "laundry" : /거실베란다/.test(r) ? "livVer" : /베란다/.test(r) ? "bedVer" : "";
const z2 = n => Math.round(n * 10) / 10;
function zdimArea(r, d){ const w = Number(d?.w) || 0, l = Number(d?.l) || 0; if (!w || !l) return null;
  const floor = w * l, wall = isBathRoom(r) ? Math.max(0, 2 * (w + l) * ZH - 1.6) : 0; return {floor, wall, py: floor / PY}; } // 욕실 벽 = 둘레×2.3m − 문
function zdimTxt(r, d){ const a = zdimArea(r, d); if (!a) return ""; if (/주방/.test(r)) return `벽 ${z2(a.floor)}㎡(${z2(a.py)}평)`; return `바닥 ${z2(a.floor)}㎡(${z2(a.py)}평)${a.wall ? ` · 벽 ${z2(a.wall)}㎡` : ""}`; }
const ZQTY = ["600각 10장 이하", "600각 20장 이하"]; // 주방: 크기 대신 장수
function zdimHTML(r, ro){
  if (/주방/.test(r)){ const q = zsOf(r).qty, dis = ro ? "disabled" : "", er = esc(r);
    return `<div class="zsrow"><span class="zsl2">양</span><span class="zsopts">${(q ? [q] : ZQTY).map(v => `<button type="button" class="opt" data-zqty="${er}|${esc(v)}" aria-pressed="${q === v}" ${dis}>${q === v ? "✓ " : ""}${esc(v)}</button>`).join("")}</span></div>`; }
  const kind = zdimKind(r), std = ZDIM_STD[kind] || {}, d = zsOf(r).dim, dis = ro ? "disabled" : "", er = esc(r);
  if (!d){ return `<div class="zsrow"><span class="zsl2">크기</span><span class="zsopts">${Object.entries(std).map(([p, [w, l]]) => `<button type="button" class="opt" data-zdimp="${er}|${p}" ${dis}>${p}평대 <small>${w}×${l}</small></button>`).join("")}<button type="button" class="opt" data-zdimp="${er}|custom" ${dis}>직접 입력</button></span></div>`; }
  const lab = d.pk === "custom" ? "직접 입력" : `${d.pk}평대`;
  return `<div class="zsrow"><span class="zsl2">크기</span><span class="zsopts"><button type="button" class="opt" data-zdimp="${er}|${esc(d.pk)}" aria-pressed="true" ${dis}>✓ ${lab}</button>
    <span class="zdim"><input class="num" data-zdim="${er}|w" inputmode="decimal" value="${d.w || ""}" placeholder="가로" aria-label="${er} 가로(m)" ${dis}>×<input class="num" data-zdim="${er}|l" inputmode="decimal" value="${d.l || ""}" placeholder="${/주방/.test(r) ? "높이" : "세로"}" aria-label="${er} ${/주방/.test(r) ? "높이" : "세로"}(m)" ${dis}>m</span>
    <span class="hint zdima" data-zdima="${er}">${zdimTxt(r, d)}</span></span></div>`;
}
document.addEventListener("input", ev => { const t = ev.target; if (!D || !t.dataset?.zdim) return; const [r, f] = t.dataset.zdim.split("|");
  D.zoneSpec = D.zoneSpec || {}; const x = D.zoneSpec[r] = D.zoneSpec[r] || {}; x.dim = {...(x.dim || {pk: "custom"}), [f]: Number(String(t.value).replace(/[^\d.]/g, "")) || 0};
  const a = document.querySelector(`[data-zdima="${CSS.escape(r)}"]`); if (a) a.textContent = zdimTxt(r, x.dim); });
function zsRowHTML(r, f, label, opts, ro){
  const v = zsOf(r)[f] || ""; const show = v ? [v] : opts;
  return `<div class="zsrow"><span class="zsl2">${label}</span><span class="zsopts">${show.map(o => `<button type="button" class="opt" data-zs="${esc(r)}|${f}|${esc(o)}" aria-pressed="${v === o}" ${ro ? "disabled" : ""}>${v === o ? "✓ " : ""}${esc(o)}</button>`).join("")}</span></div>`;
}
function zsOptsHTML(r, ro){
  const x = zsOf(r), list = zsOptList(r, x); if (!list.length) return ""; const o = x.opts || {}, dis = ro ? "disabled" : "";
  let h = `<div class="zsrow"><span class="zsl2">추가</span><span class="zsopts">${list.map(([n]) => `<button type="button" class="opt" data-zso="${esc(r)}|${esc(n)}" aria-pressed="${!!o[n]}" ${dis}>${o[n] ? "✓ " : "+ "}${esc(n)}</button>`).join("")}</span></div>`;
  for (const [n, subs] of list){ if (!o[n]) continue;
    const ch = n === "졸리컷" ? ZS_JOLLY.filter(j => o[j]) : subs; if (!ch || !ch.length) continue;
    if (n === "졸리컷"){ const a = Array.isArray(o.졸리컷) ? o.졸리컷 : [];
      h += `<div class="zsrow zssub"><span class="zsl2">${n}</span><span class="zsopts">${ch.map(s => `<button type="button" class="opt" data-zsv="${esc(r)}|${n}|${esc(s)}" aria-pressed="${a.includes(s)}" ${dis}>${a.includes(s) ? "✓ " : ""}${esc(s)}</button>`).join("")}</span></div>`; continue; }
    const v = typeof o[n] === "string" ? o[n] : ""; const show = v ? [v] : ch;
    h += `<div class="zsrow zssub"><span class="zsl2">${n}</span><span class="zsopts">${show.map(s => `<button type="button" class="opt" data-zsv="${esc(r)}|${n}|${esc(s)}" aria-pressed="${v === s}" ${dis}>${v === s ? "✓ " : ""}${esc(s)}</button>`).join("")}</span></div>`; }
  return h;
}
function zoneSpecHTML(ro, noWork){
  const R = D.rooms || []; if (!R.length) return "";
  return `<div class="zscards">${R.map(r => { const x = zsOf(r); return `<div class="zscard"><b>${esc(r)}</b>${zdimHTML(r, ro)}${zsHasWork(r) && !(noWork && isBathRoom(r)) ? zsRowHTML(r, "work", "공사", ZS_WORK, ro) : ""}${!noWork && isBathRoom(r) && x.work === "철거 후 시공" ? zsRowHTML(r, "demo", "철거", ZS_DEMO, ro).replace('class="zsrow"', 'class="zsrow zssub"') : ""}${zsRowHTML(r, "size", "타일", zsSizes(r), ro)}${zsFloor(r) ? "" : zsRowHTML(r, "method", "방법", zsMethods(r), ro)}${zsOptsHTML(r, ro)}</div>`; }).join("")}</div>`;
}
function areaHTML(ro){
  const dis = ro ? "disabled" : ""; const R = D.rooms || [];
  const Z = zonesFor(); const all = [...Z, ...R.filter(r => !Z.includes(r))];
  return `<div class="fld">시공 구역 <span class="hint">${R.length ? `${R.length}곳 · 누르면 빼거나 넣어요` : "시공할 곳을 모두 눌러 주세요"}</span>
    <div class="clirow">${all.map(z => { const on = R.includes(z); return `<button type="button" class="opt cli" data-zone="${esc(z)}" aria-pressed="${on}" ${dis}>${on ? "✓ " : ""}${esc(z)}</button>`; }).join("")}${ro || Z.every(z => R.includes(z)) ? "" : `<button type="button" class="opt cli addchip" data-zoneall="1">전체 시공</button>`}${ro || D._zoneAdd ? "" : `<button type="button" class="opt cli addchip" data-zoneopen="1">+ 추가</button>`}</div>
    ${scopeHTML(ro)}
    ${bathOwner(effColor()) ? "" : zoneSpecHTML(ro)}
    ${ro || !D._zoneAdd ? "" : `<span class="row" style="flex-wrap:nowrap"><input id="fZone" placeholder="다른 구역 (예: 드레스룸, 공용욕실)" autocomplete="off" style="flex:1;min-width:0"><button type="button" class="btn ghost sm" data-zoneadd="1">추가</button></span>`}</div>`;
}
/* 기간: 작은 달력에서 시작하는 날 → 끝나는 날 차례로 누름 (28 누르고 29 누르면 28~29 · 같은 날 두 번이면 하루) */
function miniCalHTML(ro){
  const m0 = D._cm || D.start.slice(0, 7); const [y, m] = m0.split("-").map(Number);
  const first = new Date(y, m - 1, 1), from = addD(key(first), -first.getDay()), last = key(new Date(y, m, 0));
  const s = D.start, e = evEnd(D), tk = todayK(); let cells = "";
  for (let i = 0; i < 42; i++){ const k = addD(from, i); if (i % 7 === 0 && k > last) break; const d = parse(k);
    const cls = ["mc", d.getMonth() !== m - 1 ? "oth" : "", d.getDay() === 0 || HOL[k] ? "sun" : "", d.getDay() === 6 ? "sat" : "", k === tk ? "tdy" : "",
      k >= s && k <= e ? "in" : "", k === s ? "s" : "", k === e ? "e" : "", (D.off || []).includes(k) && k >= s && k <= e ? "offd" : ""].join(" ");
    cells += `<button type="button" class="${cls}" data-mc="${k}" ${ro ? "disabled" : ""}>${d.getDate()}</button>`; }
  const n = diff(s, e) + 1;
  return `<div class="fld">기간 <span class="hint">${ro ? "" : D._pkEnd ? `<b style="color:var(--accent)">${md(s)} 시작 · 끝나는 날을 누르세요</b> (하루면 ${md(s)} 한 번 더)` : "시작하는 날 → 끝나는 날 차례로 누르세요"}</span>
    <div class="mcal"><div class="mch"><button type="button" class="ib" data-mcnav="-1" aria-label="이전 달">‹</button><b>${y}년 ${m}월</b><button type="button" class="ib" data-mcnav="1" aria-label="다음 달">›</button></div>
      <div class="mcw"><span class="sun">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span class="sat">토</span></div>
      <div class="mcg">${cells}</div>
      <div class="mcsum">${md(s)}(${WD[wdOf(s)]})${e !== s ? ` – ${md(e)}(${WD[wdOf(e)]})` : ""} · <b>${n}일</b></div></div></div>`;
}
document.addEventListener("click", ev => { const t = ev.target.closest("[data-mc],[data-mcnav]"); if (!t || !D || !$("#dlg").contains(t)) return;
  readForm();
  if (t.dataset.mcnav){ const [y, m] = (D._cm || D.start.slice(0, 7)).split("-").map(Number); const d = new Date(y, m - 1 + Number(t.dataset.mcnav), 1); D._cm = key(d).slice(0, 7); renderDlg(); return; }
  const k = t.dataset.mc;
  if (!D._pkEnd){ D.start = k; D.end = k; D._pkEnd = true; }
  else { if (k < D.start){ D.end = D.start; D.start = k; } else D.end = k; D._pkEnd = false; D._dateSet = true; D._open.delete("date"); } // 끝나는 날까지 고르면 달력 접힘
  D._cm = k.slice(0, 7); applyDefaultProc(); renderDlg(); });
function foldDate(){ const e = evEnd(D); return `${md(D.start)}(${WD[wdOf(D.start)]})${e !== D.start ? ` – ${md(e)}(${WD[wdOf(e)]}) · ${diff(D.start, e) + 1}일` : ""}${D.off.length ? ` · 쉼 ${D.off.length}일` : ""}`; }
function foldSite(){ const a = String(D.addr||"").trim(), p = String(D.pw||"").trim();
  return `📍 ${a ? esc(a) : `<span class="ng">주소 없음</span>`} · 🔑 ${p ? esc(p) : D.nopw ? "비번 없음" : `<span class="ng">비번 없음</span>`}`; }
function foldProc(){ const ks = procKeys(D.proc || {}); if (!ks.length) return `<span class="mut">공정 없음</span>`;
  const done = ks.filter(k => D.proc[k].done).length;
  return ks.map(k => `${KIND_LABEL[k]}${D.proc[k].by === "out" ? "(외주)" : ""}${D.proc[k].done ? " ✓" : ""}`).map(esc).join(" · ") + ` <span class="mut">· 완료 ${done}/${ks.length}</span>`; }
function foldCrew(){ const k = D._day, ids = D.off.includes(k) ? null : (D.crew[k] || []);
  const n = Object.entries(D.crew).filter(([d, v]) => v.length && !D.off.includes(d)).length;
  return `${md(k)} ${ids === null ? "쉬는 날" : ids.length ? esc(ids.map(id => S.workers.get(id)?.name || "?").join(", ")) : `<span class="mut">없음</span>`}${(D.ext?.[k]||[]).length ? ` · 외부 ${esc(D.ext[k].join(", "))}` : ""}${D.days[k]?.time ? ` · ${esc(D.days[k].time)} 집합` : ""} <span class="mut">· 인원 정한 날 ${n}일</span>`; }
document.addEventListener("click", ev => { const t = ev.target.closest("[data-fold]"); if (!t || !D) return;
  readForm(); const n = t.dataset.fold; if (D._open.has(n)) D._open.delete(n); else D._open.add(n); renderDlg(); });
// 같은 날 다른 현장에도 배정된 사람: [이동] 누르면 두 현장을 오간 것으로 (겹침 경고 없음 · 일당 반씩)
function moveHTML(sel, busy, dis){
  const ids = [...sel].filter(id => busy.has(id)); if (!ids.length) return "";
  const mv = new Set(D.split[D._day] || []);
  return `<div class="mvbox"><b>${md(D._day)} 두 현장</b>${ids.map(id => {
    const other = eventsOn(D._day).find(o => o.id !== D.id && crewOn(o, D._day).includes(id)), la = leaderByColor(effColor())?.name || "?", lb = other ? (evLeader(other)?.name || "?") : la;
    return `<div class="mvrow"><span><b>${esc(S.workers.get(id)?.name || "?")}</b> · ${esc(busy.get(id))}에도 있음${la !== lb ? ` <span class="ng">⚠ 고용주 다름 (${esc(la)} ↔ ${esc(lb)})</span>` : ""}</span><button type="button" class="opt" data-move="${esc(id)}" aria-pressed="${mv.has(id)}" ${dis}>${mv.has(id) ? "✓ 이동 (반반)" : "이동으로 표시"}</button></div>`; }).join("")}
    <span class="hint">이동으로 표시하면 겹침 경고가 없어지고 일당이 두 현장에 반씩 잡혀요</span></div>`;
}
document.addEventListener("click", ev => { const t = ev.target.closest("[data-move]"); if (!t || !D) return;
  readForm(); const id = t.dataset.move, a = new Set(D.split[D._day] || []); if (a.has(id)) a.delete(id); else a.add(id);
  if (a.size) D.split[D._day] = [...a]; else delete D.split[D._day]; renderDlg(); });
function autoTitle(){
  const l = leaderByColor(effColor()), rep = addrRep(D.addr), who = l ? l.name : "";
  const c = String(D.client||"").trim(), head = c && c !== "소비자" ? c : who; // 일 준 곳-현장 (소비자면 사장 이름)
  if (rep && D.title && D.title.startsWith(head + "-") && D.addr === D._addr0) return D.title; // 주소 안 바꾸면 기존 제목 유지
  if (rep) return `${head}-${rep}`;
  return D.title || `${head} 현장`.trim();
}
function dMiss(){ const c = effColor(); return c ? missingInfo({...D, color: c, end: evEnd(D)}, D.proc) : []; }
function topWarnHTML(){ const c = effColor(); if (!c || pr({color: c}) !== 0) return "";
  const I = issuesOf({...D, color: c, end: evEnd(D), crew: D.crew, off: D.off}, D.proc); if (!I.msgs.length) return I.acked.length ? `<div class="missbox ok">✓ 일정 경고 ${I.acked.length}개 확인하고 그대로 진행 중</div>` : "";
  if (!I.ok && D.id && !D._open?.has("warn")) return `<button type="button" class="fold warnfold" data-fold="warn"><span class="fk">⚠ 경고</span><span class="fv"><b>일정 문제 ${I.msgs.length}개</b> <span class="mut">· ${esc(I.msgs[0])}${I.msgs.length > 1 ? " 외" : ""}</span></span><span class="fe">보기</span></button>`;
  return `<div class="topwarn">${D.id ? `<button type="button" class="fold-x" data-fold="warn" style="float:right">접기 ▴</button>` : ""}<b>⚠ 일정 문제 ${I.msgs.length}개</b>${warnListHTML(I, !S.canWrite)}</div>`; }
// 경고 하나하나 [그대로 진행] · 확인한 것은 아래에 흐리게 + [다시 경고]
function warnListHTML(I, ro){
  let h = I.msgs.length ? `<ul class="wlist">${I.msgs.map(m => `<li><span>${esc(m)}</span>${ro ? "" : `<button type="button" class="lnk" data-dackone="${esc(m)}">그대로 진행</button>`}</li>`).join("")}</ul>` : "";
  if (I.msgs.length > 1 && !ro) h += `<button type="button" class="btn sm" data-dack="1">전부 그대로 진행</button>`;
  if (I.acked.length) h += `<details class="wacked"><summary>✓ 확인하고 진행 중 ${I.acked.length}개</summary><ul class="wlist">${I.acked.map(m => `<li><span>${esc(m)}</span>${ro ? "" : `<button type="button" class="lnk" data-unackone="${esc(m)}">다시 경고</button>`}</li>`).join("")}</ul></details>`;
  return h;
}
function missHTML(){ if (!D.id) return ""; const m = dMiss(); // 새 일정 등록 중엔 안 보여줌 · 등록 후 달력 위 알림으로 확인 if (!m.length) return effColor() && pr({color: effColor()}) === 0 ? `<div class="missbox ok">✓ 적어야 할 정보 다 들어갔어요</div>` : "";
  return `<div class="missbox"><b>아직 안 적은 것</b>${m.map(x => `<span>${esc(x.l)}</span>`).join("")}</div>`; }
function saveProc(){ return D.proc; }
function effColor(){ return (!D._colorTouched && !bathOwner(D.color) && (compColor(D.client) || compColor(D.title))) || D.color; } // 904(전체 공정) 현장은 업체 담당 색으로 안 바꿈
function ownerHTML(ro){
  const dis = ro ? "disabled" : ""; const cur = effColor(); const L = S.comp.leaders;
  const btn = (l, big) => `<button type="button" class="own${big?" big":""} c-${l.color}" data-owner="${esc(l.name)}" aria-pressed="${cur===l.color}" ${dis}><i></i>${esc(l.name)}${big?"":""}</button>`;
  return `<div class="fld">누구 현장${!cur?` <span class="hint" style="color:var(--sun)">골라 주세요</span>`:""}${cur?` <span class="tname">${esc(autoTitle())}</span>`:""}${cur && (bathOwner(cur) || D.lock) ? ` <span class="lockt" title="타임트리 등에서 다시 가져와도 이 일정은 바뀌거나 지워지지 않아요">🔒 가져오기 보호</span>` : ""}
    ${cur && !D._ownOpen && leaderByColor(cur) ? `<div class="ownrow">${btn(leaderByColor(cur), true)}<span class="hint">다시 누르면 바꿀 수 있어요</span></div>` : `<div class="ownrow">${L.filter(l=>l.ours).sort((a,b) => (b.name==="904") - (a.name==="904")).map(l => btn(l, true)).join("")}</div>
    ${L.some(l=>!l.ours)?`<div class="ownrow sm"><span class="hint">연합</span>${L.filter(l=>!l.ours).map(l => btn(l, false)).join("")}</div>`:""}`}</div>`;
}
// 새 일정: 공정이 비었거나 아직 기본값 그대로면, 주인에 맞는 기본 공정으로 (904 전체, 동식·희태 타일)
function applyDefaultProc(){
  if (D.id || pr({color: effColor()}) !== 0) return;
  const cur = procKeys(D.proc).join(); if (cur && cur !== D._autoKeys) return;
  D.proc = {}; for (const k of (bathOwner(effColor()) ? [] : defaultKinds(effColor()))) D.proc[k] = newProc(k); // 904는 공정을 직접 고름 D._autoKeys = procKeys(D.proc).join();
}
function clientHTML(ro){
  const dis = ro ? "disabled" : ""; const c = String(D.client||"").trim(); const owner = leaderByColor(effColor());
  // 고른 사장의 업체만: 업체 탭에서 그 사장 담당으로 등록한 곳 + 그 사장 색 일정에 나온 곳 (예: 904 → 904 현장 업체만) · 사장 고르기 전엔 목록 안 보여줌
  const reg = owner ? S.comp.list.filter(x => x.leader === owner.name || (x.also||[]).includes(owner.name)) : [];
  const seen = new Set(reg.map(x => norm(x.name)));
  const fromEv = []; if (owner) for (const e of S.events.values()){ if (e.color !== owner.color) continue; const n = clientOf(e); if (n && n !== "소비자" && !seen.has(norm(n))){ seen.add(norm(n)); fromEv.push({name: n, leader: owner.name}); } }
  const list = [...reg, ...fromEv].sort((a,b) => a.name.localeCompare(b.name, "ko"));
  const btn = name => `<button type="button" class="opt cli" data-client="${esc(name)}" aria-pressed="${c===name}" ${dis}>${c===name?"✓ ":""}${esc(name)}</button>`;
  const extra = c && c !== "소비자" && !list.some(x => x.name === c) ? btn(c) : ""; // 목록에 없는 기존 값
  return `<div class="fld">일 준 곳 ${!c && pr({color: effColor()}) === 0 ? `<span class="ngt">미입력</span>` : ""}<span class="hint">${owner ? `· ${esc(owner.name)} 업체` : "· 위에서 누구 현장인지 고르면 그 사장 업체만 나와요"}</span>
    ${owner ? `<div class="clirow">${list.map(x => btn(x.name)).join("")}${extra}${btn("소비자")}${ro || D._cliAdd ? "" : `<button type="button" class="opt cli addchip" data-cliopen="1">+ 추가</button>`}</div>` : (extra ? `<div class="clirow">${extra}</div>` : "")}
    ${ro || !D._cliAdd ? "" : `<span class="row" style="flex-wrap:nowrap"><input id="fNewClient" placeholder="${owner ? esc(owner.name) + " 업체 추가 (예: 엘리코리아)" : "업체 추가"}" autocomplete="off" style="flex:1;min-width:0"><button type="button" class="btn ghost sm" data-addclient="1">추가</button></span>`}</div>`;
}
function siteHTML(ro){
  const dis = ro ? "disabled" : ""; const mt = matOf(D); const ours = pr({color: effColor()}) === 0;
  const addr = String(D.addr||"").trim(), pw = String(D.pw||"").trim();
  let h = `<div class="fld">현장 정보
    <div class="sitebox">
      <label class="sl"><span class="slh">주소 ${!ours?"":addr?`<span class="okt">공유됨</span>`:`<span class="ngt">미공유</span>`}</span><input id="fAddr" class="${ours && !addr ? "miss" : ""}" value="${esc(D.addr||"")}" placeholder="예: 수성구 범어동 래미안 101동 1203호 · 현장 이름이 이걸로 정해져요" autocomplete="off" ${dis}></label>${addr ? `<a class="maplink" href="${esc(naverSearch(placeQ(addr)))}" target="_blank" rel="noopener">🚗 네이버지도 열기</a>` : ""}
      <label class="sl"><span class="slh">비밀번호 ${!ours?"":pw?`<span class="okt">공유됨</span>`:D.nopw?`<span class="okt">비번 없음</span>`:`<span class="ngt">미공유</span>`}</span><span class="row" style="flex-wrap:nowrap"><input id="fPw" class="${ours && !pw && !D.nopw ? "miss" : ""}" value="${esc(D.pw||"")}" placeholder="현관·세대 비밀번호" autocomplete="off" ${dis||(D.nopw?"disabled":"")} style="flex:1;min-width:0"><button type="button" class="opt" data-nopw="1" aria-pressed="${!!D.nopw}" ${dis}>${D.nopw?"✓ ":""}비번 없음</button></span></label>`;
  if (ours) h += `<div class="sl"><span class="slh">자재 ${mt.by==="ours" ? (mt.ready?`<span class="okt">준비 완료</span>`:`<span class="ngt">준비 전</span>`) : ""}</span>
      <span class="row"><span class="seg">${[["client","업체가 준비"],["ours","우리가 준비"]].map(([v,l]) => `<button type="button" data-matby="${v}" aria-pressed="${mt.by===v}" ${dis}>${l}</button>`).join("")}</span>
      ${mt.by==="ours"?`<button type="button" class="pdone" data-matok="1" aria-pressed="${mt.ready}" ${dis}>${mt.ready?"✓ 준비 완료":"준비 완료"}</button>`:""}</span>
      ${mt.by==="ours"?`<input id="fMatNote" value="${esc(mt.note)}" placeholder="챙길 자재 (예: 300×600 20박스, 본드, 메지)" ${dis}>`:""}</div>`;
  if (ours){ const q = qreqOf(D);
    h += `<div class="sl"><span class="slh">견적 보낼 것 ${q.some(x => !x.done) ? `<span class="ngt">${q.filter(x => !x.done).length}건 남음</span>` : q.length ? `<span class="okt">다 보냄</span>` : ""}</span>
      ${q.map((x, i) => `<span class="row qrrow"><button type="button" class="opt" data-qrdone="${i}" aria-pressed="${x.done}" ${dis}>${x.done ? "✓ 보냄" : "안 보냄"}</button><span class="${x.done ? "qrdone" : ""}" style="flex:1;min-width:0">${esc(x.t)}</span>${ro ? "" : `<button type="button" class="lnk dg" data-qrdel="${i}">빼기</button>`}</span>`).join("")}
      ${ro ? "" : `<span class="row" style="flex-wrap:nowrap"><input id="fQr" placeholder="예: 내욕실 줄눈 교체 (상태 보고)" autocomplete="off" style="flex:1;min-width:0"><button type="button" class="btn ghost sm" data-qradd="1">추가</button></span>`}</div>`; }
  return h + `</div></div>`;
}
/* ---------- 904 전체 공정: 순서대로 하나씩 고르기 (보양 → 철거 → 설비 → 방수 → 타일 → 도기 → 돔) ----------
   공정마다: 할지 → 우리/외주(업체) → 구역(외주는 욕실만) → 공정별 세부 → 다음 · 고른 공정은 한 줄로 접힘 · 세부는 p.opt에 저장 */
const SQ_STEPS = ["prot", "demo", "plumb", "wp", "tile", "sani", "dome"];
const SQ_EXTRA = ["etc"];
// [이름, 하나만/여러 개, 선택지] · 특수: 방수 차수 → p.coats, 타일 메지 → p.meji
// 욕실마다 따로 고르는 공정: {공정: 항목들} → p.opt.byRoom = {외욕실: [항목…] | ["안 함"]} · 하는 욕실 = 외주 구역
const SQ_ROOMOPT = {plumb: ["배관 설치", "배관 이동", "벽배관 이동", "수전 위치 변경", "니플 연장"]};
// 철거: 욕실마다 여러 개 · 안 함 = 덧방 · 액방 포함이면 방수 1차는 철거 쪽 · 시공 구역 공사/철거 값도 같이 맞춤
const DM_ITEMS = ["벽 철거", "바닥 철거", "욕조 철거", "도기 철거"], DM_LIQ = "액방 포함", DM_WP = ["벽 철거", "바닥 철거", "욕조 철거"];
const DM_ALL = "전체 철거", dmIt = a => a.includes(DM_ALL) ? [...DM_ITEMS] : a.filter(x => DM_ITEMS.includes(x)); // 전체 철거 = 벽·바닥·욕조·도기 다
const DM_OLD = {"올철거": [DM_ALL], "벽만 철거": ["벽 철거"], "바닥만 철거": ["바닥 철거"], "욕조 자리만": ["욕조 철거"], "도기만 철거": ["도기 철거"]};
function dmOf(r){ const p = D.proc.demo, a = p?.opt?.byRoom?.[r]; if (a) return a;
  const x = (D.zoneSpec || {})[r] || {}; if (x.work === "덧방") return ["안 함"]; if (x.work !== "철거 후 시공") return [];
  const o = [...(DM_OLD[x.demo] || [])]; if (p?.opt?.["액방(방수 1차)"] === "포함") o.push(DM_LIQ); return o; }
function dmText(a){ if (a.includes("안 함")) return "안 함(덧방)"; if (a.includes(DM_ALL)) return DM_ALL + (a.includes(DM_LIQ) ? " + 액방" : ""); const it = a.filter(x => DM_ITEMS.includes(x)).map(x => x.replace(" 철거", ""));
  return (it.length ? it.join("·") + " 철거" : "") + (a.includes(DM_LIQ) ? (it.length ? " + 액방" : "액방") : ""); }
const liqIn = r => !!D.proc.demo && dmOf(r).includes(DM_LIQ);
// 방수: 욕실마다 액방 · 도막 1차 · 도막 2차 직접 고름 · 기본으로 골라 둠(auto): 바닥 철거 → 전부 · 욕조 자리 → 도막만(방수층은 남아 있음) · 덧방 → 안 함 · 액방이 철거에 포함이면 액방은 철거 쪽
const WP_ITEMS = ["액방", "도막 1차", "도막 2차"], WP_COAT = ["액방까지", "도막 1차까지", "도막 2차까지"], WP_OLD = {"1차 액방": "액방", "2차 도막": "도막 1차", "3차 도막": "도막 2차"};
function wpDefault(r){ const x = (D.zoneSpec || {})[r] || {}, dm = D.proc.demo ? dmOf(r) : [];
  const di = dmIt(dm), floor = di.includes("바닥 철거") || (!dm.length && x.work === "철거 후 시공" && (x.demo === "올철거" || x.demo === "바닥만 철거"));
  if (floor) return {v: liqIn(r) ? ["도막 1차", "도막 2차"] : [...WP_ITEMS], why: "바닥 철거라 기본으로 골라 둠"};
  const tub = di.includes("욕조 철거") || (!dm.length && x.demo === "욕조 자리만") || (x.scope || []).includes("욕조 자리");
  if (tub) return {v: ["도막 1차", "도막 2차"], why: "욕조 자리는 방수층이 남아 있어 액방 없이 도막만"};
  return dm.includes("안 함") || x.work === "덧방" ? {v: ["안 함"], why: "덧방이라 기본 안 함"} : null; }
function sqSyncWp(){ const p = D.proc.wp; if (!p) return; p.opt = p.opt || {}; const by = p.opt.byRoom = {...(p.opt.byRoom || {})}, auto = new Set(p.opt.auto || []), all = (D.rooms || []).filter(isBathRoom);
  for (const r of Object.keys(by)) by[r] = by[r].map(v => WP_OLD[v] || v); // 예전 이름(1차 액방·2차·3차 도막) → 새 이름
  for (const r of all){ if (by[r] && !auto.has(r)){ if (liqIn(r)) by[r] = by[r].filter(v => v !== "액방"); continue; } // 직접 고른 건(빈 것도) 그대로
    const d = wpDefault(r); if (d){ by[r] = d.v; auto.add(r); } else { delete by[r]; auto.delete(r); } }
  p.opt.auto = [...auto].filter(r => by[r]); if (!p.opt.auto.length) delete p.opt.auto;
  const on = all.filter(r => (by[r] || []).some(v => v !== "안 함")); p.rooms = on.length && on.length < all.length ? on : []; }
function newSq(k){ const p = newProc(k); if (k === "dome") p.opt = {매립등: "2인치"}; return p; } // 돔 매립등 기본 2인치
const SQ_NOTE = {demo: ["철거 상세 내용", "예: 외욕실 욕조 철거 후 샤워부스 자리 · 내욕실 세면대만"], plumb: ["설비 상세 내용", "예: 외욕실 변기 문쪽으로 30cm · 내욕실 수전 높이 올리기"], etc: ["기타 내용", "예: 욕실 문틀 교체, 실리콘 전체 재시공"]};
const SQ_OPT = {
  prot:  [["범위", "one", ["욕실만", "복도·엘리베이터까지"]]],
  demo:  [["폐기물", "one", ["철거에 포함", "따로"]]],
  plumb: [],
  wp:    [], // 액방 · 도막 1차 · 도막 2차 → 욕실별 상태만 표시
  tile:  [["메지", "one", ["일반 메지", "케라폭시"]]],
  sani:  [["항목", "multi", ["양변기", "세면대", "수전", "샤워기", "악세사리", "욕조", "거울장·수납장", "간접등"]]], // 도기 지급 뺌 · 간접등은 돔에서 옮김
  dome:  [["천장", "one", ["SMC 돔", "일반 천장재"]], ["매립등", "one", ["2인치", "6인치", "없음"]], ["추가", "multi", ["환풍기(휴젠트)"]]],
  elec: [], sil: [], etc: []
};
function sqVal(k, p, f){
  if (k === "wp" && f === "차수") return `${p.coats || 3}차`;
  if (k === "tile" && f === "메지") return p.meji === "kera" ? "케라폭시" : "일반 메지";
  return (p.opt || {})[f];
}
function sqSet(k, p, f, v, mode){
  if (k === "wp" && f === "차수"){ p.coats = Number(String(v)[0]) || 3; p.steps = (p.steps || [false, false, false]).map((s, i) => i < p.coats && s); return; }
  if (k === "tile" && f === "메지"){ p.meji = v === "케라폭시" ? "kera" : "normal"; return; }
  p.opt = p.opt || {};
  if (mode === "multi"){ const a = Array.isArray(p.opt[f]) ? p.opt[f] : []; p.opt[f] = a.includes(v) ? a.filter(x => x !== v) : [...a, v]; if (!p.opt[f].length) delete p.opt[f]; }
  else if (p.opt[f] === v) delete p.opt[f]; else p.opt[f] = v;
}
function sqSummary(k){
  const p = D.proc[k]; if (!p) return `<span class="mut">안 함</span>`;
  const bits = [k === "demo" && p.opt?.업체철거 ? "업체가 해놓음" : p.by === "out" ? `외주${p.vendor ? " " + esc(p.vendor) : ""}` : "우리"];
  if (p.by === "out" && k !== "demo" && k !== "wp" && !SQ_ROOMOPT[k]){ const rs = procRooms(D, p); if (rs.length) bits.push(esc(rs.join("·"))); }
  if (k === "demo"){ const t = (D.rooms || []).filter(isBathRoom).map(r => { const a = dmOf(r); return a.length ? `${r} ${dmText(a)}` : ""; }).filter(Boolean); if (t.length) bits.splice(1, 0, esc(t.join(" / "))); }
  if (k === "wp"){ bits.push(WP_COAT[(p.coats || 3) - 1]); const by = p.opt?.byRoom || {}; const t = (D.rooms || []).filter(isBathRoom).map(r => { const a = by[r] || [], liq = liqIn(r);
    if (!a.length) return liq ? `${r} 액방(철거)` : ""; if (a.includes("안 함")) return `${r} 방수 안 함`; return `${r} ${liq ? "액방(철거)·" : ""}${a.join("·")}`; }).filter(Boolean); if (t.length) bits.push(esc(t.join(" / "))); }
  if (k === "tile") for (const r of D.rooms || []){ const t = zsText(r); if (t) bits.push(esc(`${r} ${t}`)); } // 타일은 구역별 크기·방법도 같이
  for (const [f] of SQ_OPT[k] || []){ const v = sqVal(k, p, f); if (v && (!Array.isArray(v) || v.length)) bits.push(esc(Array.isArray(v) ? v.join("·") : (/포함/.test(v) && f !== "폐기물") || f === "매립등" ? `${f.replace(/\(.*\)/, "")} ${v}` : v)); }
  if (SQ_ROOMOPT[k]){ const by = (p.opt || {}).byRoom || {}; const t = Object.entries(by).filter(([r]) => (D.rooms || []).includes(r)).map(([r, a]) => `${r} ${a.join("·")}`); if (t.length) bits.push(esc(t.join(" / "))); }
  if (p.note && SQ_NOTE[k]) bits.push("메모 있음");
  return bits.join(" · ");
}
function sqTileHint(){ const R = D.rooms || []; const t = R.map(r => { const s = zsText(r); return s ? `${r} ${s}` : ""; }).filter(Boolean);
  return t.length ? `<span class="hint">시공 구역에서 고른 내용: ${esc(t.join(" / "))}</span>` : `<span class="hint">타일 크기·방법은 위 '시공 구역'에서 골라요</span>`; }
function sqStepHTML(k, i, ro){
  const dis = ro ? "disabled" : "", p = D.proc[k], on = !!p, row = (l, h) => `<div class="zsrow"><span class="zsl2">${l}</span><span class="zsopts">${h}</span></div>`;
  const b = (attrs, sel, label) => `<button type="button" class="opt" ${attrs} aria-pressed="${sel}" ${dis}>${sel ? "✓ " : ""}${label}</button>`;
  let h = `<div class="sqcard"><div class="sqh"><b>${i + 1}. ${KIND_LABEL[k]}</b>${ro ? "" : `<button type="button" class="lnk dg" data-sqpick="${k}">이 공정 빼기</button>`}</div>`;
  if (on){
    const outFirst = OUT_DEFAULT.includes(k), bO = b(`data-sqby="${k}|out"`, p.by === "out", "외주"), bU = b(`data-sqby="${k}|ours"`, p.by === "ours", "우리");
    if (k === "demo"){ const cl = !!p.opt?.업체철거, bO2 = b(`data-sqby="${k}|out"`, p.by === "out" && !cl, "외주"), bU2 = b(`data-sqby="${k}|ours"`, p.by === "ours" && !cl, "우리"), bC = b(`data-sqby="${k}|client"`, cl, "업체가 해놓음");
      h += row("누가", bO2 + bU2 + bC); }
    else if (k !== "tile") h += row("누가", outFirst ? bO + bU : bU + bO);
    if (k === "demo"){ // 욕실마다 철거 범위 (안 함 = 덧방) · 시공 구역의 공사·철거와 같은 값
      const RB = (D.rooms || []).filter(isBathRoom);
      if (!RB.length) h += `<span class="hint">위 시공 구역에서 욕실을 먼저 골라 주세요</span>`;
      for (const r of RB){ const a = dmOf(r), show = a.includes("안 함") ? ["안 함"] : [DM_ALL, "안 함", ...DM_ITEMS, DM_LIQ]; // 전체 철거 맨 앞 // 여러 개 고르기 · 안 함은 단독
        h += row(esc(r), show.map(o => b(`data-sqdemo="${esc(r)}|${esc(o)}"`, a.includes(o), esc(o))).join("")); }
    } else if (k === "wp"){ // 방수: 액방 · 도막 1차 · 도막 2차 · 욕실별로 철거 내용 따라 자동
      h += row("어디까지", [1, 2, 3].map(n => b(`data-wpc="${n}"`, (p.coats || 3) === n, WP_COAT[n - 1])).join("")); // 차수(달력에 잡히는 날) 바로 고침
      const RB = (D.rooms || []).filter(isBathRoom);
      if (!RB.length) h += `<span class="hint">위 시공 구역에서 욕실을 먼저 골라 주세요</span>`;
      const by = p.opt?.byRoom || {}, auto = p.opt?.auto || [];
      for (const r of RB){ const cur = by[r] || [], liq = liqIn(r);
        h += row(esc(r), (liq ? `<button type="button" class="opt" aria-pressed="true" disabled>✓ 액방 · 철거에 포함</button>` : "")
          + ["안 함", ...WP_ITEMS.filter(o => !(liq && o === "액방"))].map(o => b(`data-sqro="wp|${esc(r)}|${esc(o)}"`, cur.includes(o), esc(o))).join("")
          + (auto.includes(r) ? `<span class="hint">${esc(wpDefault(r)?.why || "")}</span>` : "")); }
    } else if (SQ_ROOMOPT[k]){
      const RB = (D.rooms || []).filter(isBathRoom), by = (p.opt || {}).byRoom || {};
      if (!RB.length) h += `<span class="hint">위 시공 구역에서 욕실을 먼저 골라 주세요</span>`;
      for (const r of RB){ const cur = by[r] || []; h += row(esc(r), ["안 함", ...SQ_ROOMOPT[k]].map(o => b(`data-sqro="${k}|${esc(r)}|${esc(o)}"`, cur.includes(o), esc(o))).join("")); }
    } else if (p.by === "out"){
      const RB = roomsFor(D, p); if (RB.length > 1){ const cur = p.rooms || [];
        h += row("구역", RB.map(r => b(`data-sqroom="${k}|${esc(r)}"`, !cur.length || cur.includes(r), esc(r))).join("") + `<span class="hint">${cur.length ? "" : "전체"}</span>`); }
    }
    if (k === "tile") h += (D.rooms || []).length ? zoneSpecHTML(ro, !!D.proc.demo) : `<span class="hint">위 시공 구역에서 시공할 곳을 먼저 골라 주세요</span>`;
    for (const [f, mode, opts] of SQ_OPT[k] || []){ const v = sqVal(k, p, f), sel = o => mode === "multi" ? (Array.isArray(v) && v.includes(o)) : v === o;
      const show = mode === "one" && v && k !== "wp" && k !== "tile" && f !== "매립등" ? [v] : opts; // 하나만 고르는 건 고르면 접힘
      h += row(esc(f), show.map(o => b(`data-sqo="${k}|${esc(f)}|${esc(o)}|${mode}"`, sel(o), esc(o))).join("")); }
    if (SQ_NOTE[k]) h += `<label class="fld" style="margin-top:2px">${SQ_NOTE[k][0]}<textarea data-pnote="${k}" placeholder="${SQ_NOTE[k][1]}" ${dis}>${esc(p.note || "")}</textarea></label>`; // 맨 아래 상세 내용
  }
  const sel = sqSel(), j = sel.indexOf(k), last = j === sel.length - 1;
  if (!ro) h += `<div class="row" style="justify-content:space-between">${j > 0 ? `<button type="button" class="lnk" data-sqprev="${k}">← 이전</button>` : "<span></span>"}<button type="button" class="btn sm" data-sqnext="${k}">${last ? "다 골랐어요" : `다음 · ${KIND_LABEL[sel[j + 1]]} →`}</button></div>`;
  return h + `</div>`;
}
const SQ_ALL = [...SQ_STEPS, ...SQ_EXTRA, "elec", "sil"]; // 전기·실리콘은 고르는 칩에서 뺌 · 예전 일정에 있으면 보임
const sqSel = () => SQ_ALL.filter(k => D.proc[k]);
function seqHTML(ro){
  D._sqDone = D._sqDone || new Set(D.id ? SQ_ALL : []); sqSyncWp(); // 방수 구역 = 방수 필요한 욕실
  const sel = sqSel(), cur = D._sqCur || null, dis = ro ? "disabled" : "";
  let h = `<div class="fld">공정 <span class="hint">${sel.length ? `할 공정 ${sel.length}개 · 눌러서 자세히` : "할 공정을 눌러 주세요"}</span>
    <div class="clirow">${SQ_ALL.filter(k => !["elec", "sil"].includes(k) || D.proc[k]).map(k => { const on = !!D.proc[k]; return `<button type="button" class="opt cli" data-sqpick="${k}" aria-pressed="${on}" ${dis}>${on ? "✓ " : ""}${KIND_LABEL[k]}</button>`; }).join("")}
      ${ro || sel.length === SQ_STEPS.length ? "" : `<button type="button" class="opt cli addchip" data-sqall="1">전체 시공</button>`}</div>`;
  if (sel.length) h += `<div class="sqlist">${sel.map((k, i) => k === cur ? sqStepHTML(k, i, ro)
    : `<button type="button" class="sqdone" data-sqgo="${k}"><span class="sqn">${i + 1}</span><b>${KIND_LABEL[k]}</b><span class="sqs">${D._sqDone.has(k) ? sqSummary(k) : `<span class="mut">아직 안 정함</span>`}</span><span class="fe">${D._sqDone.has(k) ? "수정" : "정하기"}</span></button>`).join("")}</div>`;
  return h + `</div>`;
}
document.addEventListener("click", ev => { const t = ev.target.closest("[data-sqnote]"); if (!t || !D || !$("#dlg").contains(t)) return; readForm(); // 철거 상세 내용에 눌러 넣기
  const p = D.proc.demo; if (!p) return; const v = t.dataset.sqnote; p.note = p.note ? `${p.note} · ${v}` : v; D._sqCur = "demo"; renderDlg();
  const ta = document.querySelector('#dlg [data-pnote="demo"]'); if (ta){ ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } });
document.addEventListener("click", ev => { const t = ev.target.closest("[data-sqro]"); if (!t || !D || !$("#dlg").contains(t)) return; readForm();
  const [k, r, o] = t.dataset.sqro.split("|"), p = D.proc[k]; if (!p) return; p.opt = p.opt || {}; const by = p.opt.byRoom = {...(p.opt.byRoom || {})};
  let a = by[r] || []; if (o === "안 함") a = a.includes(o) ? [] : [o]; else { a = a.filter(x => x !== "안 함"); a = a.includes(o) ? a.filter(x => x !== o) : [...a, o]; }
  if (a.length || k === "wp") by[r] = a; else delete by[r];
  if (p.opt.auto){ p.opt.auto = p.opt.auto.filter(z => z !== r); if (!p.opt.auto.length) delete p.opt.auto; } // 직접 고르면 자동 해제
  if (k === "wp"){ const n = Math.max(0, ...Object.values(by).flat().map(v => WP_ITEMS.indexOf(v) + 1)); // 욕실에서 고른 데까지 = 어디까지
    if (n && n !== p.coats){ p.coats = n; p.steps = p.steps.map((s, i) => i < n && s); p.done = p.steps.slice(0, n).every(Boolean);
      for (const d of Object.keys(D.plan || {})){ D.plan[d] = D.plan[d].filter(u => !(u.startsWith("wp") && Number(u[2]) > n)); if (!D.plan[d].length) delete D.plan[d]; } } }
  const all = (D.rooms || []).filter(isBathRoom), on = all.filter(z => (by[z] || []).some(x => x !== "안 함")); p.rooms = on.length && on.length < all.length ? on : []; // 하는 욕실만 외주 구역
  D._sqCur = k; renderDlg(); });
document.addEventListener("click", ev => { const t = ev.target.closest("[data-sqdemo]"); if (!t || !D || !$("#dlg").contains(t)) return; readForm();
  const [r, o] = t.dataset.sqdemo.split("|"), p = D.proc.demo; if (!p) return; D.zoneSpec = D.zoneSpec || {}; const x = D.zoneSpec[r] = {...(D.zoneSpec[r] || {})};
  let a = [...dmOf(r)]; if (o === "안 함") a = a.includes(o) ? [] : [o];
  else if (o === DM_ALL) a = a.includes(o) ? a.filter(z => z === DM_LIQ) : [o, ...a.filter(z => z === DM_LIQ)]; // 전체 철거는 다른 철거 항목 대신
  else { a = a.filter(z => z !== "안 함"); if (a.includes(DM_ALL) && DM_ITEMS.includes(o)) a = [...DM_ITEMS.filter(z => z !== o), ...a.filter(z => z === DM_LIQ)]; // 전체에서 하나 빼기
    else a = a.includes(o) ? a.filter(z => z !== o) : [...a, o]; }
  p.opt = {...(p.opt || {})}; delete p.opt["액방(방수 1차)"]; const by = p.opt.byRoom = {...(p.opt.byRoom || {})}; if (a.length) by[r] = a; else delete by[r];
  const it = dmIt(a); // 시공 구역 공사/철거 값 맞추기 (예상 견적·타일 옵션이 씀)
  if (a.includes("안 함")){ x.work = "덧방"; delete x.demo; }
  else if (it.length){ x.work = "철거 후 시공"; const w = it.includes("벽 철거"), f = it.includes("바닥 철거");
    x.demo = w && f ? "올철거" : f ? "바닥만 철거" : w ? "벽만 철거" : it.includes("욕조 철거") ? "욕조 자리만" : "도기만 철거"; }
  else { delete x.work; delete x.demo; }
  zsNorm(r, x); { const all = (D.rooms || []).filter(isBathRoom), on = all.filter(z => dmIt(by[z] || []).length); p.rooms = on.length && on.length < all.length ? on : []; }
  D._sqCur = "demo"; renderDlg(); });
document.addEventListener("click", ev => { const t = ev.target.closest("[data-sqpick],[data-sqall]"); if (!t || !D || !$("#dlg").contains(t)) return; readForm();
  if (t.dataset.sqall){ for (const k of SQ_STEPS) if (!D.proc[k]) D.proc[k] = newSq(k); }
  else { const k = t.dataset.sqpick; if (D.proc[k]){ delete D.proc[k]; if (D._sqCur === k) D._sqCur = null; } else { D.proc[k] = newSq(k); D._sqCur = k; } } // 누르면 그 공정 카드가 바로 열림
  renderDlg(); });
document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-sqgo],[data-sqon],[data-sqby],[data-sqo],[data-sqroom],[data-sqnext],[data-sqprev],[data-sqx]"); if (!t || !D || !$("#dlg").contains(t)) return;
  readForm(); D._sqDone = D._sqDone || new Set(); const steps = sqSel();
  const go = k => { D._sqCur = k; };
  if (t.dataset.sqgo){ go(t.dataset.sqgo); }
  else if (t.dataset.sqon){ const [k, v] = t.dataset.sqon.split("|"); if (v === "1"){ if (!D.proc[k]) D.proc[k] = newProc(k); } else delete D.proc[k]; go(k); }
  else if (t.dataset.sqby){ const [k, v] = t.dataset.sqby.split("|"), p = D.proc[k]; // 철거: 업체가 해놓음 = 완료로
    if (p){ if (v === "client"){ p.opt = {...(p.opt || {}), 업체철거: true}; p.by = "ours"; p.done = true; } else { if (p.opt?.업체철거){ delete p.opt.업체철거; p.done = false; } p.by = v; } } go(k); }
  else if (t.dataset.sqo){ const [k, f, v, mode] = t.dataset.sqo.split("|"); if (D.proc[k]) sqSet(k, D.proc[k], f, v, mode); go(k); }
  else if (t.dataset.sqroom){ const [k, r] = t.dataset.sqroom.split("|"); const p = D.proc[k]; if (p){ const all = roomsFor(D, p); let cur = p.rooms && p.rooms.length ? [...p.rooms] : [...all];
      cur = cur.includes(r) ? cur.filter(x => x !== r) : [...cur, r]; p.rooms = cur.length === all.length || !cur.length ? [] : cur; } go(k); }
  else if (t.dataset.sqnext){ const k = t.dataset.sqnext; D._sqDone.add(k); const i = steps.indexOf(k); D._sqCur = steps[i + 1] ?? null; }
  else if (t.dataset.sqprev){ const i = steps.indexOf(t.dataset.sqprev); if (i > 0) D._sqCur = steps[i - 1]; }
  else if (t.dataset.sqx){ const k = t.dataset.sqx; D.proc[k] = newProc(k); D._sqDone.delete(k); D._sqCur = k; }
  renderDlg();
});
function procHTML(ro){
  if (effColor() && pr({color: effColor()}) === 0 && bathOwner(effColor())){ // 904: 순서대로 고르기 · 저장된 일정은 아래에 날짜·진행 자세히
    const sq = seqHTML(ro); if (!D.id) return sq;
    return sq + (D._pdOpen ? `<div class="pdwrap"><button type="button" class="fold-x" data-pdtog="1">날짜·진행 자세히 접기 ▴</button>${procDetailHTML(ro)}</div>` : `<button type="button" class="fold" data-pdtog="1"><span class="fk">날짜·진행</span><span class="fv">공정별 날짜, 완료, 투입할 사람</span><span class="fe">열기</span></button>`);
  }
  return procDetailHTML(ro);
}
document.addEventListener("click", ev => { const t = ev.target.closest("[data-pdtog]"); if (!t || !D) return; readForm(); D._pdOpen = !D._pdOpen; renderDlg(); });
function procDetailHTML(ro){
  if (!effColor()) return `<div class="fld">공정<span class="hint">위에서 누구 현장인지 먼저 골라 주세요</span></div>`;
  if (pr({color: effColor()}) !== 0) return `<div class="fld">공정<span class="unote"><span class="wkp wk-tdone"><i></i>타일 시공 지원</span> 연합 일은 타일 시공만 들어가요</span></div>`;
  const full = bathOwner(effColor()); // 904만 전체 공정 · 나머지는 타일 시공만
  if (!full){ const t = D.proc.tile || newProc("tile"); t.by = "ours"; D.proc = {tile: t}; for (const d of Object.keys(D.plan)){ D.plan[d] = D.plan[d].filter(u => UNIT[u].k === "tile"); if (!D.plan[d].length) delete D.plan[d]; } }
  const dis = ro ? "disabled" : ""; const P = D.proc; const ks = procKeys(P);
  const nDone = ks.filter(k=>P[k].done).length, nOut = ks.filter(k=>P[k].by==="out").length;
  const days = range(D.start, evEnd(D)).slice(0, 62); const C0 = issuesOf({...D, color: effColor(), end: evEnd(D)}, P); const BAD = C0.ok ? new Set() : C0.bad; const TT = C0.tent || {};
  // 방수 차수는 하루씩만: 다른 날에 이미 잡혔거나, 그날 다른 차수가 있으면 못 고름 (예: 철거+액방 한 날 → 도막 날엔 1차 안 됨)
  const RM0 = (D.rooms||[]).length > 1 ? (D.rooms.includes(D._room) ? D._room : "") : "", inRm = (d, u) => { const t = roomTag(D, d, u); return !RM0 || !t || t === RM0; };
  const wpBlock = (u, d) => u.startsWith("wp") && (Object.entries(D.plan).some(([d2, a]) => d2 !== d && a.includes(u) && inRm(d2, u)) || (D.plan[d]||[]).some(x => x !== u && x.startsWith("wp") && inRm(d, x)));
  const dayChips = u => `<span class="dchips">${days.map(d => { const on = (D.plan[d]||[]).includes(u) && inRm(d, u), blk = !on && wpBlock(u, d);
    return `<button type="button" class="dc${isWknd(d)?" dwk":""}${D.off.includes(d)?" off":""}${on && BAD.has(d)?" bad":""}${!on && (TT[d]||[]).includes(u)?" tent":""}${blk?" blk":""}" data-pu="${u}" data-pday="${d}" aria-pressed="${on}" title="${md(d)} ${WD[wdOf(d)]}${blk?" · 다른 날에 잡혀 있거나 그날 다른 차수가 있어요":""}" ${dis||(blk?"disabled":"")}>${parse(d).getDate()}<small>${WD[wdOf(d)]}</small></button>`; }).join("")}</span>`;
  // 날짜마다: 어느 욕실 · 그날 우리/외주 · 그날 완료 (예: 방수 1차는 철거 외주가, 2차는 우리 · 19일은 외욕실만 완료)
  const dayRows = u => { const ds = Object.keys(D.plan).filter(d => (D.plan[d]||[]).includes(u) && inRm(d, u)).sort(); if (!ds.length || !((D.rooms||[]).length > 1 || u.startsWith("wp") || ds.length > 1)) return "";
    return `<div class="drows">${ds.map(d => { const out = unitOut(u, P, D.plan[d], D, d), dn = unitDone(u, P) || (D.doneDays[d]||[]).includes(u), rt = roomTag(D, d, u);
      return `<div class="drow"><b>${md(d)}<small>${WD[wdOf(d)]}</small></b>${roomsFor(D, out ? {by:"out"} : null).length > 1 ? `<span class="seg mini">${roomsFor(D, out ? {by:"out"} : null).map(r => `<button type="button" data-droom="${u}" data-d="${d}" data-v="${esc(r)}" aria-pressed="${rt===r}" ${dis}>${esc(r.replace("욕실",""))}</button>`).join("")}</span>` : ""}
        <span class="seg mini"><button type="button" data-dby="${u}" data-d="${d}" data-v="ours" aria-pressed="${!out}" ${dis}>우리</button><button type="button" data-dby="${u}" data-d="${d}" data-v="out" aria-pressed="${out}" ${dis}>외주</button></span>
        <button type="button" class="opt ck mini" data-ddone="${u}" data-d="${d}" aria-pressed="${dn}" ${dis}>${dn ? "✓ 완료" : "완료"}</button></div>`; }).join("")}</div>`; };
  const whoHTML = (k, p) => { const ds = kindDays(D.plan, k), who = new Set(p.who || []), busy = new Map();
    for (const d of ds) for (const o of eventsOn(d)) if (o.id !== D.id) for (const id of crewOn(o, d)) if (!busy.has(id)) busy.set(id, `${md(d)} ${o.title||""}`);
    const names = [...who].map(id => S.workers.get(id)?.name).filter(Boolean);
    const open = !!(D._whoOpen && D._whoOpen[k]);
    let h = `<div class="pdet"><span class="dl">누가</span><button type="button" class="whosum" data-whotog="${k}" aria-expanded="${open}">${names.length ? `<b>${esc(names.join(", "))}</b> · ${names.length}명` : `<span style="color:var(--muted)">아직 안 정함</span>`}<span class="car">${open ? "접기 ▴" : "고르기 ▾"}</span></button></div>`;
    if (!open) return h;
    const sortW = a => a.sort((x,y) => GROUPS.indexOf(groupOf(x)) - GROUPS.indexOf(groupOf(y)) || (x.name||"").localeCompare(y.name||"", "ko"));
    const btn = w => { const b = busy.get(w.id); return `<button type="button" class="wp sm g-${groupOf(w)}${b && !who.has(w.id) ? " busy" : ""}" data-pwho="${k}" data-wid="${esc(w.id)}" aria-pressed="${who.has(w.id)}" ${b?`title="${esc(b)} 배정됨"`:""} ${dis}>${esc(w.name)}</button>`; };
    const all = [...S.workers.values()], ours = sortW(all.filter(w => !teamOf(w))), teams = [...new Set(all.map(teamOf).filter(Boolean))];
    h += `<div class="whobox"><div class="wgrp"><span class="wt">우리팀</span><span class="whos">${ours.map(btn).join("") || `<span class="hint">없음</span>`}</span></div>`;
    for (const t of teams) h += `<div class="wgrp"><span class="wt">연합팀 · ${esc(t)}</span><span class="whos">${sortW(all.filter(w => teamOf(w) === t)).map(btn).join("")}</span></div>`;
    h += `${who.size ? `<span class="hint">${ds.length ? `${ds.map(md).join(", ")} 투입 인원에 들어가요` : "날짜를 찍으면 그날 투입 인원으로 들어가요"}</span>` : ""}</div>`;
    return h; };
  const opt = (attrs, on, label) => `<button type="button" class="opt" ${attrs} aria-pressed="${on}" ${dis}>${on?"✓ ":""}${label}</button>`;
  let h = `<div class="fld">공정 ${ks.length?`<span class="hint">완료 ${nDone}/${ks.length}${nOut?` · 외주 ${nOut}`:""}</span>`:""}`;
  if (!full) h += `<span class="hint">904 현장이 아니라 타일 시공만 있어요</span>`;
  if (!ro && full) h += `<div class="row">${PRESETS.map(([id,l])=>`<button type="button" class="btn ghost sm" data-preset="${id}">${l}</button>`).join("")}${ks.length?`<button type="button" class="lnk" data-preset="none">전부 빼기</button><button type="button" class="btn sm alldone${nDone===ks.length?" on":""}" data-alldone="1" style="margin-left:auto">${nDone===ks.length?"✓ 전체 완료됨 · 취소":"전체 완료"}</button>`:""}</div>`;
  const R = D.rooms || [], RM = R.includes(D._room) ? D._room : ""; D._room = RM;
  const inR = p => !!p && (!RM || procRooms(D, p).includes(RM));
  h += `<div class="roombar"><span class="dl">구역</span>${R.length ? ["", ...R].map(r => `<button type="button" class="rtab" data-room="${esc(r)}" aria-pressed="${RM===r}">${r ? esc(r) : "전체"}</button>`).join("") : `<span class="hint">한 곳이면 안 넣어도 돼요</span>`}
    ${ro ? "" : D._addRoom ? `<span class="row" style="flex-wrap:nowrap"><input id="fRoom" placeholder="예: 외욕실" autocomplete="off" style="width:110px">${zonesFor().filter(x => !R.includes(x)).map(x => `<button type="button" class="opt" data-roomq="${x}">${x}</button>`).join("")}<button type="button" class="btn ghost sm" data-roomadd="1">추가</button></span>` : `<button type="button" class="lnk" data-addroom="1">+ 구역 추가</button>`}
    ${!ro && RM ? `<button type="button" class="lnk dg" data-roomdel="${esc(RM)}">${esc(RM)} 빼기</button>` : ""}</div>`;
  if (full) h += `<div class="wklist">${KINDS.map(([k,l])=>`<button type="button" class="wkc wk-${k}${P[k]?.by==="out"?" out":""}" data-kind="${k}" aria-pressed="${inR(P[k])}" ${dis}><i></i>${l}</button>`).join("")}</div>`;
  const ksR = ks.filter(k => inR(P[k]));
  const rmDays = k => Object.keys(D.plan).flatMap(d => (D.plan[d]||[]).filter(u => UNIT[u].k === k && inRm(d, u)).map(u => [d, u]));
  const rmDone = k => { const L = rmDays(k); return L.length && L.every(([d, u]) => (D.doneDays[d]||[]).includes(u)); };
  if (ksR.length) h += `<div class="plist">${ksR.map(k => { const p = P[k]; const g = progOf(k, p); const pr0 = procRooms(D, p);
    let r = `<div class="prow wk-${k}${p.done?" done":""}${p.by==="out"&&!p.booked&&!p.done?" needcall":""}"><span class="pn"><i></i>${KIND_LABEL[k]}${g.txt?` <small>${g.txt}</small>`:""}${R.length && !RM ? `<small class="rtag">${esc(pr0.join("·"))}</small>` : ""}</span>
      <span class="seg"><button type="button" data-pby="${k}" data-v="ours" aria-pressed="${p.by==="ours"}" ${dis}>우리</button><button type="button" data-pby="${k}" data-v="out" aria-pressed="${p.by==="out"}" ${dis}>외주</button></span>
      ${k==="tile" ? "" : (() => { const dn = p.done || (RM && rmDone(k)); return `<button type="button" class="pdone" data-pdone="${k}" aria-pressed="${dn}" ${dis}>${dn?"✓ 완료":"완료"}${RM ? ` <small>${esc(RM)}</small>` : ""}</button>`; })()}`;
    if (p.by === "out") r += `<div class="pout"><input data-pv="${k}" value="${esc(p.vendor)}" placeholder="외주 업체" aria-label="${KIND_LABEL[k]} 외주 업체" ${dis}><span class="wgi"><input data-pa="${k}" inputmode="numeric" value="${p.amount?p.amount.toLocaleString("ko-KR"):""}" placeholder="금액" aria-label="${KIND_LABEL[k]} 외주 금액" ${hasDD(p) ? `disabled title="날짜별 합계 · 달력 공정 칸에서 날짜마다 고쳐요"` : dis}><em>원</em></span><button type="button" class="pbk" data-pbk="${k}" aria-pressed="${p.booked}" ${dis}>${p.booked?"✓ 외주 일정 잡음":"☎ 아직 연락 전 · 통화로 잡았으면 누르세요"}</button></div>`;
    if (p.by === "out" && !ro) r += vendorChips(k, "data-vpick", p.vendor);
    if (k === "wp") r += `<div class="pdet"><span class="dl">어디까지</span><span class="seg">${[1,2,3].map(n => `<button type="button" data-wpc="${n}" aria-pressed="${p.coats===n}" ${dis}>${WP_COAT[n - 1]}</button>`).join("")}</span></div>` + WP_ITEMS.slice(0, p.coats).map((l,i) => `<div class="pdet"><span class="dl">${l}</span>${dayChips("wp"+(i+1))}<button type="button" class="opt ck" data-pstep="${i}" aria-pressed="${p.steps[i]}" ${dis}>${p.steps[i]?"✓ 완료":"완료"}</button></div>${dayRows("wp"+(i+1))}`).join("");
    else if (k === "tile") r += `<div class="pdet"><span class="dl">시공일</span>${dayChips("tile")}</div>${dayRows("tile")}<div class="pdet"><span class="dl">메지일</span>${dayChips("meji")}</div>${dayRows("meji")}`;
    else r += `<div class="pdet"><span class="dl">날짜</span>${dayChips(k)}</div>${dayRows(k)}`;
    if (p.by === "ours" && S.workers.size) r += whoHTML(k, p);
    if (k === "tile"){
      r += `<div class="pdet"><span class="dl">진행</span><span class="seg">${[["","시공 전"],["doing","시공 중"],["laid","시공 완료"],["meji","메지 완료"]].map(([v,l]) => `<button type="button" data-tstage="${v||"none"}" aria-pressed="${p.stage===v}" ${dis}>${l}</button>`).join("")}</span></div>
        <div class="pdet"><span class="dl">메지</span><span class="seg">${[["normal","일반 메지"],["kera","케라폭시"]].map(([v,l]) => `<button type="button" data-tmeji="${v}" aria-pressed="${p.meji===v}" ${dis}>${l}</button>`).join("")}</span><input id="fMejiColor" value="${esc(p.mejiColor||"")}" placeholder="줄눈 색 (예: 연회색)" autocomplete="off" ${dis} style="width:130px;min-width:0"></div>
        <div class="pdet"><span class="dl">공간</span>${Object.entries(AREAS).map(([a,l]) => opt(`data-tarea="${a}"`, !!p.areas[a], l)).join("")}</div>`;
      r += Object.keys(AREAS).filter(a => p.areas[a]).map(a => { const x = p.areas[a];
        return `<div class="parea"><b>${AREAS[a]}</b>
          <div class="pdet"><span class="dl">크기</span>${Object.entries(SIZES).filter(([s]) => x.size.includes(s) || !((a === "bath" || a === "kitchen") ? s === "s3030" : s === "s3060" || s === "mosaic")).filter(([s]) => !x.size.length || x.size.includes(s)).map(([s,l]) => opt(`data-topt="${a}" data-f="size" data-v="${s}"`, x.size.includes(s), l)).join("")}${x.size.length ? `<span class="hint">다시 누르면 바꿀 수 있어요</span>` : ""}</div>
          ${AREA_RULE[a].method.length ? `<div class="pdet"><span class="dl">방법</span>${AREA_RULE[a].method.filter(m => !((a === "bath" || a === "kitchen") && (x.size.includes("s6060") || x.size.includes("s1212")) && (m === "bond" || m === "tteo")) && !(x.size.includes("s1212") && m === "dry") || x.method.includes(m)).filter(m => !x.method.length || x.method.includes(m)).map(m => opt(`data-topt="${a}" data-f="method" data-v="${m}"`, x.method.includes(m), METHODS[m])).join("")}</div>` : ""}
          <div class="pdet"><span class="dl">추가</span>${AREA_RULE[a].flags.map(([f,l]) => opt(`data-tflag="${a}" data-f="${f}"`, !!x[f], l)).join("")}</div></div>`; }).join("");
    }
    // 참고사항 (욕실 탭이면 그 욕실 것) + 외주는 전달 문구 복사
    const nv = RM ? (p.rnotes?.[RM] || "") : (p.note || "");
    r += `<div class="pdet pnote"><span class="dl">참고</span><textarea data-pnote="${k}" placeholder="${RM ? esc(RM) + " " : ""}참고사항 (예: ${k==="plumb"?"변기 위치 문쪽으로, 수전 높이 올리기":k==="dome"?"2인치 매립등 3개(업체 택배), 환풍기 1개":k==="sani"?"코너선반 1개 신설":k==="elec"?"벽등 교체 (업체 택배)":"요청사항"})" ${dis}>${esc(nv)}</textarea></div>`;
    if (!RM && R.length){ const others = pr0.filter(x => p.rnotes?.[x]); if (others.length) r += `<div class="pdet"><span class="dl"></span><span class="hint">${others.map(x => `${esc(x)}: ${esc(p.rnotes[x])}`).join(" · ")}</span></div>`; }
    if (p.by === "out" && !ro) r += `<div class="pdet"><span class="dl"></span><button type="button" class="lnk" data-pcopy="${k}">📋 ${esc(p.vendor || "외주 업체")}에 보낼 전달 문구 복사</button></div>`;
    return r + `</div>`; }).join("")}</div>`;
  if (ks.length){
    if (!ro) h += `<div class="row"><button type="button" class="lnk" data-autoplan="1">임시 날짜로 확정</button>${Object.keys(D.plan).length?`<button type="button" class="lnk" data-clearplan="1">날짜 전부 비우기</button>`:""}<span class="hint">점선 칸이 임시 날짜예요 (앞 공정 다음 평일 · 주말엔 메지만)</span></div>`;
    const I = issuesOf({...D, color: effColor(), end: evEnd(D)}, saveProc());
    if (I.msgs.length || I.acked.length) h += warnListHTML(I, ro);
  }
  else h += `<span class="hint">이 현장에서 하는 공정을 고르세요. 안 고른 공정은 '안 함'이에요.</span>`;
  return h + `</div>`;
}
// 아직 날짜 없는 공정을 고른 날부터 순서대로: 평일 하루 하나, 메지는 주말도 가능, 쉬는 날·이미 공정 있는 날은 건너뜀
function autoPlan(){ // 임시 날짜를 그대로 확정 (현장 기간 안만)
  const SP = saveProc(); let plan = planOf(D, SP);
  if (!Object.keys(plan).length){ const first = unitsOf(SP).find(u => !unitDone(u, SP) && u !== "prot"); if (!first) return {n:0, left:0}; let d = D.start, n = 0; while (n++ < 30 && (isWknd(d) || D.off.includes(d))) d = addD(d, 1); plan = {[d]: unitsOf(SP).includes("prot") && first !== "prot" ? ["prot", first] : [first]}; }
  const pj = projectPlan({...D, end: evEnd(D)}, SP, plan); let n = 0;
  D.plan = {...plan}; for (const [d, us] of Object.entries(pj.tent)) if (d <= evEnd(D)){ D.plan[d] = [...(D.plan[d]||[]), ...us]; n += us.length; }
  return {n: n + (Object.keys(planOf(D, SP)).length && !Object.keys(planOf({...D, plan: {}}, SP)).length ? 0 : 0), left: pj.over.length};
}
const STAGES = [["before","시공 전"],["mid","점심(중간)"],["after","마무리"],["","기타"]];
function stageOf(t){ const c = S.comp.photoStages || {beforeUntil:"11:00", afterFrom:"16:00"}; if (!t) return ""; return t < c.beforeUntil ? "before" : (t >= c.afterFrom ? "after" : "mid"); }
function photosHTML(ro){
  if (!D.photos.length) return "";
  const items = D.photos.map((id,i)=>({id,i,inf:D.photoInfo[id]||{}}));
  const dates = [...new Set(items.map(x=>x.inf.date||""))].sort();
  return dates.map(dk => {
    const inDay = items.filter(x=>(x.inf.date||"")===dk);
    const secs = STAGES.map(([st,label]) => {
      const list = inDay.filter(x => (x.inf.stage||"") === st).sort((a,b)=>(a.inf.time||"").localeCompare(b.inf.time||""));
      if (!list.length) return "";
      return `<div class="psec"><span class="pst">${label} <small>${list.length}장</small></span><div class="phs">${list.map(({id,i,inf})=>`<div class="ph"><button type="button" class="ph" data-ph="${esc(id)}" aria-label="사진 크게 보기" style="width:100%"><img src="/_blob/${esc(id)}" alt="" loading="lazy"></button>${inf.time||inf.by?`<span class="phc">${esc(inf.time||"")}${inf.by?" "+esc(inf.by):""}</span>`:""}${!ro&&S.assets?`<button type="button" class="phx" data-phx="${i}" aria-label="사진 빼기">×</button>`:""}</div>`).join("")}</div></div>`;
    }).join("");
    return `<div class="pday"><b>${dk?md(dk)+" ("+WD[wdOf(dk)]+")":"날짜 없음"}</b>${secs}</div>`;
  }).join("");
}
function readForm(){
  const dt = $("#fDayTime"), dn = $("#fDayNote");
  const fx = $("#fExt"); if (fx && D._day){ const names = fx.value.split(/[,\s·]+/).map(s => s.trim()).filter(Boolean); D.ext = D.ext || {}; if (names.length) D.ext[D._day] = [...new Set(names)]; else delete D.ext[D._day]; }
  if (dt && dn && D._day){ const v = {time: dt.value, note: dn.value.trim()}; if (v.time || v.note) D.days[D._day] = v; else delete D.days[D._day]; }
  if (D.proc){
    document.querySelectorAll("#dlg [data-pv]").forEach(i => { const p = D.proc[i.dataset.pv]; if (p) p.vendor = i.value.trim(); });
    document.querySelectorAll("#dlg [data-pa]").forEach(i => { const p = D.proc[i.dataset.pa]; if (p) p.amount = num(i.value); });
    document.querySelectorAll("#dlg [data-pd]").forEach(i => { const p = D.proc[i.dataset.pd]; if (p) p.date = i.value; });
    document.querySelectorAll("#dlg [data-pnote]").forEach(i => { const p = D.proc[i.dataset.pnote]; if (!p) return; const v = i.value.trim();
      if (D._room){ p.rnotes = p.rnotes || {}; if (v) p.rnotes[D._room] = v; else delete p.rnotes[D._room]; } else p.note = v; });
    const mc = $("#fMejiColor"); if (mc && D.proc.tile) D.proc.tile.mejiColor = mc.value.trim();
  }
  if ($("#fAddr")) D.addr = $("#fAddr").value.trim();
  if ($("#fPw")) D.pw = $("#fPw").value.trim();
  if ($("#fMatNote")) D.mat = {...matOf(D), note: $("#fMatNote").value.trim()};
  if ($("#fMemo")) D.memo = $("#fMemo").value; // 시간·색은 창에서 안 바꿈 (기존 값 유지)
  if ($("#fStart")){ let s = $("#fStart").value || D.start, e = $("#fEnd").value || s; if (e < s) e = s; D.start = s; D.end = e; }
}
function closeDlg(){ $("#dlg").hidden = $("#dlgScrim").hidden = true; D = null; Q = null; }
async function commitEvent(){
  readForm();
  // 날짜만 통째로 옮긴 경우(기간 길이 같음): 날짜별 공정·인원·메모·완료 등도 같은 만큼 옮김 (예: 23일 → 26일)
  if (D._orig && D.start !== D._orig.start){ const len0 = diff(D._orig.start, D._orig.end), len1 = diff(D.start, evEnd(D)), sh = diff(D._orig.start, D.start);
    if (len0 === len1 && sh){ const mv = o => o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k >= D._orig.start && k <= D._orig.end ? addD(k, sh) : k, v])) : o;
      for (const f of ["plan","planRoom","crew","days","split","half","doneDays","byDay","ext"]) D[f] = mv(D[f]);
      D.off = (D.off || []).map(k => k >= D._orig.start && k <= D._orig.end ? addD(k, sh) : k); D._orig = {start: D.start, end: evEnd(D)}; } }
  const end = evEnd(D);
  { const pl = planOf({...D, end}, D.proc); for (const k of procKeys(D.proc)){ const p = D.proc[k]; if (p.by !== "ours" || !(p.who||[]).length) continue;
      for (const d of kindDays(pl, k)) if (!D.off.includes(d)) D.crew[d] = [...new Set([...(D.crew[d]||[]), ...p.who])]; } }
  const crew = {}; for (const [k,v] of Object.entries(D.crew)) if (k>=D.start && k<=end && v.length && !D.off.includes(k)) crew[k] = v;
  if (!effColor()){ toast("누구 현장인지 골라 주세요"); return; }
  D.color = effColor();
  { const t = autoTitle(); if (addrRep(D.addr) && D.title && D.title !== t && !D.client && !/^(904|동식|희태|만제|태구)\s/.test(D.title)) D.client = D.title; D.title = t; } // 예전 제목(업체 이름)은 client로 보관
  const data = {title: D.title || "제목 없음", start: D.start, end, time: D.time || "", color: (!D._colorTouched && !bathOwner(D.color) && compColor(D.title)) || D.color, kinds: pr(D) !== 0 ? ["tdone"] : procKeys(saveProc()), proc: pr(D) !== 0 ? {} : saveProc(), memo: D.memo || "",
    crew, off: D.off.filter(k=>k>=D.start && k<=end), photos: D.photos || [], photoInfo: D.photoInfo || {},
    lock: bathOwner(D.color) ? (leaderByColor(D.color)?.name || "904") : (D.lock || ""), // 904 일정은 가져오기에서 보호 (config/import 규칙)
    rooms: D.rooms || [], zoneSpec: Object.fromEntries(Object.entries(D.zoneSpec || {}).filter(([r, x]) => (D.rooms || []).includes(r) && x).map(([r, x]) => [r, zsClean(r, x)]).filter(([, x]) => Object.keys(x).length)), qreq: qreqOf(D),
    client: D.client || "", planOk: D.planOk || "", planAck: (D.planAck || []).slice(-200), addr: D.addr || "", pw: D.pw || "", nopw: !!D.nopw, mat: matOf(D),
    plan: Object.fromEntries(Object.entries(planOf({...D, end}, saveProc()))),
    days: Object.fromEntries(Object.entries(D.days||{}).filter(([k])=>k>=D.start && k<=end)),
    split: Object.fromEntries(Object.entries(D.split||{}).map(([k,v]) => [k, (v||[]).filter(id => (crew[k]||[]).includes(id))]).filter(([k,v]) => v.length)),
    planRoom: Object.fromEntries(Object.entries(D.planRoom||{}).filter(([k,v])=>k>=D.start && k<=end && D.plan[k] && Object.keys(v).length).map(([k,v])=>[k, Object.fromEntries(Object.entries(v).filter(([u,r])=>(D.plan[k]||[]).includes(u) && (D.rooms||[]).includes(r)))]).filter(([,v])=>Object.keys(v).length)),
    doneDays: Object.fromEntries(Object.entries(D.doneDays||{}).filter(([k,v])=>k>=D.start && k<=end && (v||[]).length).map(([k,v])=>[k, v.filter(u => (D.plan[k]||[]).includes(u))]).filter(([,v])=>v.length)),
    byDay: Object.fromEntries(Object.entries(D.byDay||{}).filter(([k,v])=>k>=D.start && k<=end && D.plan[k] && Object.keys(v||{}).length)),
    half: Object.fromEntries(Object.entries(D.half||{}).filter(([k])=>(crew[k]||[]).length).map(([k,v])=>[k, Object.fromEntries(Object.entries(v||{}).filter(([id])=>(crew[k]||[]).includes(id)))]).filter(([,v])=>Object.keys(v).length)),
    ext: Object.fromEntries(Object.entries(D.ext||{}).filter(([k,v])=>k>=D.start && k<=end && !D.off.includes(k) && (v||[]).length)), // 외부 지원 (명부에 없는 사람)
    spaces: D.spaces || [], tent: !!D.tent, pending: D._approve ? false : !!D.pending, source: D.source || "", updatedAt: new Date().toISOString()};
  const id = D.id || newId("events");
  if (!S.db){ S.events.set(id, {...data, id}); closeDlg(); renderAll(); toast("미리보기에서는 저장되지 않아요"); return; }
  if (await saveEvent(id, data)) closeDlg();
}


// 카톡·외부에서 들어온 일정도 제목을 '업체-주소대표'로 맞춤 (주소가 있는 일정만, 한 번씩)
const TITLE_DONE = new Set(); let TITLE_T = null;
function fixTitlesSoon(){ clearTimeout(TITLE_T); TITLE_T = setTimeout(async () => {
  if (!S.db || !S.canWrite || !S.loaded.e) return;
  for (const e of [...S.events.values()]){
    if (TITLE_DONE.has(e.id) || (D && D.id === e.id)) continue; TITLE_DONE.add(e.id);
    const t = titleOf(e); if (!t || t === e.title) continue;
    const data = {title: t, client: e.client || clientOf(e)}; S.events.set(e.id, {...e, ...data});
    try { await S.db.collection("events").doc(e.id).update(data); } catch(_){}
  }
  renderAll();
}, 2500); }
(async () => { let db = null; try { db = await window.claude?.use?.("db"); } catch(_){} if (db) db.collection("events").onSnapshot(() => fixTitlesSoon(), () => {}); })();

document.addEventListener("click", ev => { const t = ev.target.closest("[data-dackone],[data-unackone]"); if (!t || !D) return;
  readForm(); const m = t.dataset.dackone || t.dataset.unackone; const a = new Set(D.planAck || []);
  if (t.dataset.dackone) a.add(m); else { a.delete(m); D.planOk = ""; } D.planAck = [...a]; renderDlg(); });

// 예정 / 확정 (업체가 "이날 가능할까요?" 하고 임시로 잡아 둔 일정)
document.addEventListener("click", ev => { const t = ev.target.closest("#dlg [data-dtent]"); if (!t || !D) return; D.tent = t.dataset.dtent === "1";
  t.parentElement.querySelectorAll("[data-dtent]").forEach(b => b.setAttribute("aria-pressed", String(b === t))); });
