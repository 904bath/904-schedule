/* 904 캘린더 · 공정 칸을 누르면 그 공정만 고치는 창 (방수 → 방수 금액·날짜·인원·특이사항·시공 위치)
   현장 제목 막대를 누르면 지금처럼 일정 전체 창 */
let U = null; // {id, d, ds, us, e(사본), P, on}
function openUnit(id, ds, us){
  const e0 = S.events.get(id); if (!e0) return;
  const e = structuredClone(e0); e.plan = {...(e.plan || {})}; e.planRoom = structuredClone(e.planRoom || {}); e.doneDays = structuredClone(e.doneDays || {}); e.byDay = structuredClone(e.byDay || {}); e.crew = structuredClone(e.crew || {}); e.off = [...(e.off || [])];
  U = {id, ds, d: ds[0], nd: ds[0], us, e, P: procOf(e, true), busy: false};
  renderUnit(); $("#dlg").hidden = $("#dlgScrim").hidden = false;
}
function renderUnit(){
  const x = U, e = x.e, P = x.P, ro = S.canWrite ? "" : "disabled", d = x.d, kinds = [...new Set(x.us.map(u => UNIT[u].k))];
  const title = x.us.map(u => UNIT[u].l).join(" + ").replace(/^보양 \+ /, "보양 + ");
  const multi = (e.rooms || []).length > 1, rt = roomTag(e, d, x.us[x.us.length - 1]) || "";
  const dayUs = e.plan[d] || [], done = x.us.every(u => unitDone(u, P) || (e.doneDays[d] || []).includes(u));
  const crew = new Set(crewOn(e, x.nd)), ws = [...S.workers.values()];
  const ours = ws.filter(w => !teamOf(w)).sort((a, b) => GROUPS.indexOf(groupOf(a)) - GROUPS.indexOf(groupOf(b)) || (a.name || "").localeCompare(b.name || "", "ko"));
  const teams = [...new Set(ws.map(teamOf).filter(Boolean))];
  const wb = w => `<button type="button" class="wp sm g-${groupOf(w)}" data-uw="${esc(w.id)}" aria-pressed="${crew.has(w.id)}" ${ro}>${esc(w.name)}</button>`;
  let h = `<div class="dl-h"><button class="lnk" id="uClose">닫기</button><b>${esc(title)}</b><span class="u-sv">${ro ? "" : x.saving ? "저장 중…" : x.saved ? "✓ 저장됨" : "누르면 바로 저장"}</span></div><div class="dl-b u-b">
    <div class="u-site"><span class="u-dot c-${COLORS.includes(e.color) ? e.color : "purple"}"></span><b>${esc(e.title || "")}</b><button type="button" class="lnk" id="uFull">일정 전체 ›</button></div>`;
  if (x.ds.length > 1) h += `<div class="fld">어느 날<div class="row">${x.ds.map(k => `<button type="button" class="opt" data-uday="${k}" aria-pressed="${k === d}">${md(k)}(${WD[wdOf(k)]})</button>`).join("")}</div></div>`;
  h += `<div class="fld">날짜<div class="row" style="align-items:center"><input type="date" id="uDate" value="${esc(x.nd)}" ${ro} style="width:auto"><span class="hint">${x.nd !== d ? `${md(d)} → ${md(x.nd)}로 옮겨요` : "바꾸면 그날로 옮겨요"}</span></div></div>`;
  h += `<div class="fld">진행<div class="row"><button type="button" class="opt" id="uDone" aria-pressed="${done}" ${ro}>${done ? "✓ 완료" : "완료로 표시"}</button></div></div>`;
  if (multi) h += `<div class="fld">시공 위치<div class="row">${[...e.rooms, ""].map(r => `<button type="button" class="opt" data-uroom="${esc(r)}" aria-pressed="${rt === r}" ${ro}>${r ? esc(r) : "전체"}</button>`).join("")}</div></div>`;
  for (const k of kinds){ const p = P[k] || newProc(k), q = P[k] ? ddOf(e, P, k, x.ds[0]) : p, ku = x.us.filter(u => UNIT[u].k === k), out = ku.every(u => unitOut(u, P, dayUs, e, d));
    const nv = multi && rt ? (p.rnotes?.[rt] || "") : (p.note || "");
    h += `<section class="u-kind wk-${k}"><div class="u-kh"><i></i><b>${esc(KIND_LABEL[k])}</b>${ku.length && k === "wp" ? `<small>${ku.map(u => UNIT[u].l.replace("방수 ", "")).join("·")}</small>` : ""}
      <span class="seg"><button type="button" data-uby="${k}" data-v="ours" aria-pressed="${!out}" ${ro}>우리</button><button type="button" data-uby="${k}" data-v="out" aria-pressed="${out}" ${ro}>외주</button></span></div>
      <div class="pout">${out ? `<input data-uv="${k}" value="${esc(q.vendor)}" placeholder="외주 업체" ${ro}>` : ""}<span class="wgi"><input data-ua="${k}" inputmode="numeric" value="${q.amount ? q.amount.toLocaleString("ko-KR") : ""}" placeholder="${esc(KIND_LABEL[k])} 금액" ${ro}><em>원</em></span></div>
      ${out && !ro ? vendorChips(k, "data-uvpick", q.vendor) : ""}${out ? `
        <div class="u-st"><span class="u-stl">외주 연락</span><span class="seg u-seg"><button type="button" data-ubk="${k}" data-v="0" aria-pressed="${!bkOn(p, d)}" ${ro}>☎ 연락 전</button><button type="button" class="ok" data-ubk="${k}" data-v="1" aria-pressed="${bkOn(p, d)}" ${ro}>✓ 통화 완료</button></span></div>
        <div class="u-st"><span class="u-stl">외주비</span><span class="seg u-seg"><button type="button" data-upaid="${k}" data-v="0" aria-pressed="${!q.paid}" ${ro}>아직 안 줌</button><button type="button" class="ok" data-upaid="${k}" data-v="1" aria-pressed="${!!q.paid}" ${ro}>✓ 돈 줌</button></span></div>` : ""}
      <label class="fld">특이사항${multi && rt ? ` <small class="hint">(${esc(rt)})</small>` : ""}<textarea data-un="${k}" rows="2" placeholder="예: ${k === "wp" ? "도막 2회, 욕조 쪽 꼼꼼히" : k === "tile" ? "벽 300×600 압착, 바닥 졸리" : "요청사항"}" ${ro}>${esc(nv)}</textarea></label></section>`; }
  h += `<div class="fld">${md(x.nd)} 이 현장 인원 <span class="hint">눌러서 넣고 빼기</span><div class="whos">${ours.map(wb).join("")}</div>
    ${teams.length ? `<details class="u-uni"><summary>연합 인원</summary>${teams.map(t => `<div class="whos"><span class="wt">${esc(t)}팀</span>${ws.filter(w => teamOf(w) === t).map(wb).join("")}</div>`).join("")}</details>` : ""}</div>`;
  h += `${ro ? "" : `<div class="row" style="justify-content:flex-end"><button type="button" class="lnk dg" id="uDel">이날에서 이 공정 빼기</button></div>`}</div>`;
  $("#dlg").innerHTML = h;
}
function readUnit(){ if (!U) return; const P = U.P;
  // 금액·업체는 이 작업 날짜(칸 첫날) 것만 바꿈 → 같은 공정 다른 날(예: 내욕실 철거)은 그대로
  const jd = U.ds[0], ch = (k, f, v) => { if (!P[k]) return; if (ddOf(U.e, P, k, jd)[f] !== v) setDD(U.e, P, k, jd, {[f]: v}); };
  document.querySelectorAll("#dlg [data-uv]").forEach(i => ch(i.dataset.uv, "vendor", i.value.trim()));
  document.querySelectorAll("#dlg [data-ua]").forEach(i => ch(i.dataset.ua, "amount", num(i.value)));
  document.querySelectorAll("#dlg [data-un]").forEach(i => { const p = P[i.dataset.un], e = U.e, rt = (e.rooms || []).length > 1 ? roomTag(e, U.d, U.us[U.us.length - 1]) : "";
    if (rt){ p.rnotes = {...(p.rnotes || {})}; if (i.value.trim()) p.rnotes[rt] = i.value.trim(); else delete p.rnotes[rt]; } else p.note = i.value.trim(); });
  const dt = $("#uDate"); if (dt && dt.value) U.nd = dt.value; }
// 누르는 대로 바로 저장 (글자 칸은 잠깐 쉬었다가)
let U_T = 0;
function uSaveSoon(ms){ clearTimeout(U_T); U_T = setTimeout(uSaveNow, ms ?? 200); }
async function uSaveNow(){
  clearTimeout(U_T); if (!U || !S.canWrite) return; readUnit(); const x = U, e = x.e, d = x.d, nd = x.nd;
  if (nd !== d){ // 날짜 옮기기: 공정·위치·완료·외주표시 같이 옮김 (인원은 날짜별이라 그대로)
    const mv = o => { const a = o[d]; if (!a) return; if (Array.isArray(a)){ const m = a.filter(u => x.us.includes(u)); o[d] = a.filter(u => !x.us.includes(u)); if (!o[d].length) delete o[d]; if (m.length) o[nd] = [...new Set([...(o[nd] || []), ...m])]; }
      else { const m = {}; for (const u of x.us) if (u in a){ m[u] = a[u]; delete a[u]; } if (!Object.keys(a).length) delete o[d]; if (Object.keys(m).length) o[nd] = {...(o[nd] || {}), ...m}; } };
    mv(e.plan); mv(e.planRoom); mv(e.doneDays); mv(e.byDay); for (const k of new Set(x.us.map(u => UNIT[u].k))){ for (const b of [x.P[k]?.bkd, x.P[k]?.dd]) if (b && d in b){ b[nd] = b[d]; delete b[d]; } }
    if (nd < e.start) e.start = nd; if (nd > evEnd(e)) e.end = nd; e.off = e.off.filter(k => k !== nd); x.d = nd; x.ds = [nd]; }
  const full = {...e, proc: x.P, kinds: procKeys(x.P), updatedAt: new Date().toISOString()}; delete full.id;
  S.events.set(x.id, {...full, id: x.id}); x.saving = true; const sv = $("#dlg .u-sv"); if (sv) sv.textContent = "저장 중…"; renderAll();
  const ok = !S.db || await write(() => S.db.collection("events").doc(x.id).set(full));
  if (U === x){ x.saving = false; x.saved = ok; const s2 = $("#dlg .u-sv"); if (s2) s2.textContent = ok ? "✓ 저장됨" : "저장 못 했어요"; }
}
function uClose(){ if (U_T){ uSaveNow(); } closeDlg(); U = null; }
document.addEventListener("click", ev => { // 달력 공정 칸 → 공정 창 (제목 막대는 그대로 일정 전체 창)
  const c = ev.target.closest(".pstrip [data-pu]"); if (!c) return; const strip = c.closest(".pstrip");
  ev.stopImmediatePropagation(); ev.preventDefault(); openUnit(strip.dataset.ev, c.dataset.pds.split(","), c.dataset.pu.split(","));
}, true);
document.addEventListener("click", ev => {
  if (!U || !$("#dlg").contains(ev.target)) return; const t = ev.target.closest("button"); if (!t) return; const x = U, e = x.e, P = x.P, d = x.d;
  if (t.id === "uClose"){ uClose(); return; }
  if (t.id === "uFull"){ const id = x.id; uClose(); openSite(id); return; }
  readUnit();
  if (t.dataset.uday){ x.d = x.nd = t.dataset.uday; return renderUnit(); }
  if (t.id === "uDone"){ const all = x.us.every(u => unitDone(u, P) || (e.doneDays[d] || []).includes(u));
    if (all && x.us.some(u => unitDone(u, P))){ toast("공정 전체가 완료로 되어 있어요. [일정 전체]에서 풀어 주세요"); return; }
    const a = (e.doneDays[d] || []).filter(u => !x.us.includes(u)); e.doneDays[d] = all ? a : [...a, ...x.us]; if (!e.doneDays[d].length) delete e.doneDays[d]; return (renderUnit(), uSaveSoon()); }
  if (t.dataset.uroom !== undefined){ const r = t.dataset.uroom; e.planRoom[d] = {...(e.planRoom[d] || {})}; for (const u of x.us){ if (r) e.planRoom[d][u] = r; else delete e.planRoom[d][u]; const p = P[UNIT[u].k]; if (r && p && (p.rooms || []).length && !p.rooms.includes(r)) p.rooms = [...p.rooms, r]; }
    if (!Object.keys(e.planRoom[d]).length) delete e.planRoom[d]; return (renderUnit(), uSaveSoon()); }
  if (t.dataset.uby){ const k = t.dataset.uby, v = t.dataset.v, dayUs = e.plan[d] || [];
    for (const u of x.us.filter(u => UNIT[u].k === k)){ const base = unitOut(u, P, dayUs, null, d) ? "out" : "ours"; e.byDay[d] = {...(e.byDay[d] || {})}; if (v === base) delete e.byDay[d][u]; else e.byDay[d][u] = v; if (!Object.keys(e.byDay[d]).length) delete e.byDay[d]; }
    return (renderUnit(), uSaveSoon()); }
  if (t.dataset.uvpick){ if (P[t.dataset.uvpick]) setDD(e, P, t.dataset.uvpick, x.ds[0], {vendor: t.dataset.v}); return (renderUnit(), uSaveSoon()); }
  if (t.dataset.ubk){ const p = P[t.dataset.ubk]; setBooked(e, P, t.dataset.ubk, x.ds, t.dataset.v ? t.dataset.v === "1" : !bkOn(p, d)); /* 이 칸 날짜만 */ return (renderUnit(), uSaveSoon()); }
  if (t.dataset.upaid){ const k = t.dataset.upaid, cur = ddOf(e, P, k, x.ds[0]).paid, nv = t.dataset.v ? t.dataset.v === "1" : !cur; if (nv !== cur) setDD(e, P, k, x.ds[0], {paid: nv, paidDate: nv ? todayK() : ""}); return (renderUnit(), uSaveSoon()); }
  if (t.dataset.uw){ const k = x.nd, a = e.crew[k] || [], id = t.dataset.uw; e.crew[k] = a.includes(id) ? a.filter(i => i !== id) : [...a, id]; if (!e.crew[k].length) delete e.crew[k]; return (renderUnit(), uSaveSoon()); }
  if (t.id === "uDel"){ if (!t.classList.contains("arm")){ t.classList.add("arm"); t.textContent = "한 번 더 누르면 빼요"; return; }
    e.plan[d] = (e.plan[d] || []).filter(u => !x.us.includes(u)); if (!e.plan[d].length) delete e.plan[d]; uSaveNow().then(() => { closeDlg(); U = null; }); return; }
});
document.addEventListener("input", ev => { if (!U || !$("#dlg").contains(ev.target)) return; if (ev.target.dataset?.ua !== undefined){ const v = num(ev.target.value); ev.target.value = v ? v.toLocaleString("ko-KR") : ""; }
  if (ev.target.matches("[data-ua],[data-uv],[data-un]")) uSaveSoon(800); });
document.addEventListener("change", ev => { if (U && ev.target.id === "uDate"){ readUnit(); uSaveNow().then(() => U && renderUnit()); } });
$("#dlgScrim").addEventListener("click", () => { if (U && U_T) uSaveNow(); U = null; });
