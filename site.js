/* 904 캘린더 · 현장 제목 막대를 누르면 여는 '현장 정보' 창 (짧게)
   날짜·인원은 달력에서 바로 하니까 여기선: 예정/확정 · 주소·비번 · 공정 내용(보양·철거·설비…) · 시공 위치(외욕실·내욕실·주방·안방베란다…)와 위치별 타일·시공방법·구조물
   누르는 대로 바로 저장. 자세한 건 [전체 수정 ›] */
let SI = null; // {id, e, P, open:Set}
const SP_PRESET = ["외욕실", "내욕실", "공용욕실", "안방욕실", "주방", "현관", "거실", "안방베란다", "거실베란다", "세탁실", "다용도실"];
const spType = n => /욕실|화장실/.test(n) ? "bath" : /주방/.test(n) ? "kitchen" : /현관/.test(n) ? "entry" : /베란다|세탁|다용도|발코니/.test(n) ? "veranda" : "floor";
const SP_SIZE = ["300각", "300×600", "400×800", "600각", "600×1200", "1200각", "기타"];
const SP_METHOD = {bath: ["압착", "드라이", "에폭시", "본드"], kitchen: ["압착", "에폭시", "본드"], entry: ["압착"], veranda: ["압착"], floor: ["압착"]}; // 떠발이는 시공 안 함
const SP_BASE = ["덧방", "철거 후 시공"];
const SP_PART = {bath: ["젠다이", "조적 파티션", "폼세라믹 파티션", "유리 파티션", "욕조", "샤워부스"], kitchen: [], entry: [], veranda: [], floor: []};
const SP_EXTRA = {bath: ["졸리컷"], kitchen: ["졸리컷"], entry: ["걸레받이"], veranda: ["걸레받이"], floor: ["걸레받이"]};
// 현장사진 업로드 (구글 드라이브 「904 현장사진 / 현장명 / 날짜」로 자동 정리)
const PHOTO_APP = "https://script.google.com/macros/s/AKfycbzVtr4vfcxwIGGOvoTbra4KuxkfQoHkoJrgDClQit4E_iqRiNy59-X6bSN0ovCG4jkQ/exec";
function photoUrl(e){ const d = new Date(), p = n => String(n).padStart(2, "0"), t = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return `${PHOTO_APP}?site=${encodeURIComponent((e.title || "").trim())}&date=${t}`; }
function openSite(id){
  const e0 = S.events.get(id); if (!e0) return;
  const e = structuredClone(e0); e.spaces = Array.isArray(e.spaces) ? e.spaces : [];
  // 예전 욕실 목록(rooms)에 있던 이름도 위치로 가져옴
  for (const r of (e.rooms || [])) if (!e.spaces.some(s => s.name === r)) e.spaces.push({name: r, type: spType(r), size: [], method: [], base: [], parts: [], extra: [], note: ""});
  SI = {id, e, P: procOf(e, true), open: new Set(), add: false};
  renderSite(); $("#dlg").hidden = $("#dlgScrim").hidden = false;
}
function renderSite(){
  const x = SI, e = x.e, P = x.P, ro = S.canWrite ? "" : "disabled", full = bathOwner(e.color);
  const opt = (attr, on, l) => `<button type="button" class="opt sm" ${attr} aria-pressed="${on}" ${ro}>${on ? "✓ " : ""}${esc(l)}</button>`;
  let h = `<div class="dl-h"><button class="lnk" id="sClose">닫기</button><b>현장 정보</b><button type="button" class="lnk" id="sFull">전체 수정 ›</button></div><div class="dl-b s-b">
    <div class="u-site"><span class="u-dot c-${COLORS.includes(e.color) ? e.color : "purple"}"></span><b>${esc(e.title || "")}</b><small class="hint">${md(e.start)}${evEnd(e) !== e.start ? "–" + md(evEnd(e)) : ""}</small></div>
    <a class="pill reqlink s-photo" href="${photoUrl(e)}" target="_blank" rel="noopener" style="display:flex;justify-content:center;gap:6px;margin:8px 0 10px;padding:11px 12px;font-weight:700;text-decoration:none">📷 현장사진 올리기 ↗</a>
    <div class="seg s-tent"><button type="button" data-stent="0" aria-pressed="${!e.tent}" ${ro}>확정</button><button type="button" data-stent="1" aria-pressed="${!!e.tent}" ${ro}>예정 (아직 확정 아님)</button></div>
    <div class="s-row"><label>주소<input id="sAddr" value="${esc(e.addr || "")}" placeholder="주소" ${ro}></label><label>비번<input id="sPw" value="${esc(e.pw || "")}" placeholder="공동현관 · 세대" ${ro}></label></div>`;
  // 공정 내용
  const kinds = (full ? KINDS : KINDS.filter(([k]) => k === "tile")).filter(([k]) => !["elec", "sil"].includes(k) || P[k]); // 전기·실리콘은 공정에서 뺌
  h += `<div class="fld">공정 내용<div class="row">${kinds.map(([k, l]) => `<button type="button" class="opt sm wkc wk-${k}" data-skind="${k}" aria-pressed="${!!P[k]}" ${ro}><i></i>${esc(l)}</button>`).join("")}</div>
    ${P.wp && full ? `<div class="row s-out"><small class="hint">방수 어디까지 <span style="opacity:.7">(액방 → 도막 1차 → 도막 2차)</span></small>${[1, 2, 3].map(n => opt(`data-swc="${n}"`, (P.wp.coats || 3) === n, WP_COAT[n - 1])).join("")}</div>` : ""}
    ${procKeys(P).length && full ? `<div class="row s-out"><small class="hint">외주로 맡기는 것</small>${procKeys(P).map(k => opt(`data-sout="${k}"`, P[k].by === "out", KIND_LABEL[k])).join("")}</div>` : ""}</div>`;
  // 시공 위치
  const names = e.spaces.map(s => s.name);
  h += `<div class="fld">시공 위치 <span class="hint">누르면 넣고, 넣은 곳을 누르면 타일·방법·구조물</span><div class="row">${SP_PRESET.filter(n => !names.includes(n)).map(n => `<button type="button" class="opt sm" data-sadd="${esc(n)}" ${ro}>+ ${esc(n)}</button>`).join("")}
    ${x.add ? `<span class="row" style="flex-wrap:nowrap"><input id="sNew" placeholder="예: 작은방 베란다" style="width:140px"><button type="button" class="btn sm" id="sNewOk">넣기</button></span>` : `<button type="button" class="lnk" id="sNewBtn" ${ro}>+ 직접 쓰기</button>`}</div></div>`;
  h += e.spaces.map((s, i) => { const op = x.open.has(i), t = s.type || spType(s.name), sum = [...s.size, ...(s.base || []), ...s.method, ...s.parts, ...(s.extra || [])].join(" · ");
    let c = `<section class="s-sp${op ? " open" : ""}"><button type="button" class="s-sph" data-sopen="${i}"><b>${esc(s.name)}</b><small>${esc(sum || "눌러서 타일·방법 고르기")}</small><span>${op ? "▴" : "▾"}</span></button>`;
    if (op) c += `<div class="s-spb">
      <div class="s-l"><span>타일</span><div class="row">${SP_SIZE.map(v => opt(`data-sv="${i}" data-f="size" data-v="${esc(v)}"`, s.size.includes(v), v)).join("")}</div></div>
      <div class="s-l"><span>바탕</span><div class="row">${SP_BASE.map(v => opt(`data-sv="${i}" data-f="base" data-v="${esc(v)}"`, (s.base || []).includes(v), v)).join("")}</div></div>
      <div class="s-l"><span>시공 방법</span><div class="row">${(SP_METHOD[t] || []).map(v => opt(`data-sv="${i}" data-f="method" data-v="${esc(v)}"`, s.method.includes(v), v)).join("")}</div></div>
      ${(SP_PART[t] || []).length ? `<div class="s-l"><span>구조물</span><div class="row">${SP_PART[t].map(v => opt(`data-sv="${i}" data-f="parts" data-v="${esc(v)}"`, s.parts.includes(v), v)).join("")}</div></div>` : ""}
      ${(SP_EXTRA[t] || []).length ? `<div class="s-l"><span>추가</span><div class="row">${SP_EXTRA[t].map(v => opt(`data-sv="${i}" data-f="extra" data-v="${esc(v)}"`, (s.extra || []).includes(v), v)).join("")}</div></div>` : ""}
      <label class="s-l"><span>메모</span><input data-snote="${i}" value="${esc(s.note || "")}" placeholder="예: 바닥 구배 다시, 줄눈 연회색" ${ro}></label>
      ${ro ? "" : `<button type="button" class="lnk dg" data-sdel="${i}">${esc(s.name)} 빼기</button>`}</div>`;
    return c + `</section>`; }).join("");
  h += `<p class="hint">누르는 대로 바로 저장돼요 · 날짜와 인원은 달력에서 바로 고쳐요 <span class="u-sv">${x.saving ? "저장 중…" : x.saved ? "✓ 저장됨" : ""}</span></p></div>`;
  $("#dlg").innerHTML = h;
}
let SI_T = 0;
function siSaveSoon(ms){ clearTimeout(SI_T); SI_T = setTimeout(siSaveNow, ms ?? 150); }
async function siSaveNow(){
  clearTimeout(SI_T); SI_T = 0; if (!SI || !S.canWrite) return; const x = SI, e = x.e;
  const a = $("#sAddr"), p = $("#sPw"); if (a) e.addr = a.value.trim(); if (p) e.pw = p.value.trim();
  document.querySelectorAll("#dlg [data-snote]").forEach(i => { const s = e.spaces[+i.dataset.snote]; if (s) s.note = i.value.trim(); });
  // 욕실이 둘 이상이면 욕실 이름을 공정 욕실 구분(rooms)으로도 씀
  const baths = e.spaces.filter(s => (s.type || spType(s.name)) === "bath").map(s => s.name); e.rooms = baths.length > 1 ? baths : (e.rooms || []).filter(r => baths.includes(r));
  const full = {...e, proc: x.P, kinds: procKeys(x.P), tent: !!e.tent, updatedAt: new Date().toISOString()}; delete full.id;
  S.events.set(x.id, {...full, id: x.id}); x.saving = true; const sv = $("#dlg .u-sv"); if (sv) sv.textContent = "저장 중…"; renderAll();
  const ok = !S.db || await write(() => S.db.collection("events").doc(x.id).set(full));
  if (SI === x){ x.saving = false; x.saved = ok; const s2 = $("#dlg .u-sv"); if (s2) s2.textContent = ok ? "✓ 저장됨" : "저장 못 했어요"; }
}
function siClose(){ if (SI_T) siSaveNow(); closeDlg(); SI = null; }
// 달력 현장 제목 막대 → 현장 정보 창
document.addEventListener("click", ev => { const b = ev.target.closest("#cal .bar[data-ev]"); if (!b) return; ev.stopImmediatePropagation(); ev.preventDefault(); openSite(b.dataset.ev); }, true);
document.addEventListener("click", ev => {
  if (!SI || !$("#dlg").contains(ev.target)) return; const t = ev.target.closest("button"); if (!t) return; const x = SI, e = x.e, P = x.P;
  if (t.id === "sClose"){ siClose(); return; }
  if (t.id === "sFull"){ const id = x.id; siClose(); openEvent(id); return; }
  const ch = () => { renderSite(); siSaveSoon(); };
  if (t.dataset.stent !== undefined){ e.tent = t.dataset.stent === "1"; return ch(); }
  if (t.dataset.skind){ const k = t.dataset.skind; if (P[k]) delete P[k]; else P[k] = newProc(k); return ch(); }
  if (t.dataset.swc && P.wp){ const n = +t.dataset.swc, p = P.wp; p.coats = n; p.steps = (p.steps || [false, false, false]).map((z, i) => i < n && z); p.done = p.steps.slice(0, n).every(Boolean); // 방수 차수 바로: 넘는 날은 일정에서 뺌
    for (const d of Object.keys(e.plan || {})){ e.plan[d] = e.plan[d].filter(u => !(u.startsWith("wp") && Number(u[2]) > n)); if (!e.plan[d].length) delete e.plan[d]; } return ch(); }
  if (t.dataset.sout){ const p = P[t.dataset.sout]; p.by = p.by === "out" ? "ours" : "out"; return ch(); }
  if (t.dataset.sadd){ e.spaces.push({name: t.dataset.sadd, type: spType(t.dataset.sadd), size: [], method: [], base: [], parts: [], extra: [], note: ""}); x.open = new Set([e.spaces.length - 1]); return ch(); }
  if (t.id === "sNewBtn"){ x.add = true; renderSite(); setTimeout(() => $("#sNew")?.focus(), 30); return; }
  if (t.id === "sNewOk"){ const n = ($("#sNew")?.value || "").trim(); x.add = false; if (n && !e.spaces.some(s => s.name === n)){ e.spaces.push({name: n, type: spType(n), size: [], method: [], base: [], parts: [], extra: [], note: ""}); x.open = new Set([e.spaces.length - 1]); return ch(); } return renderSite(); }
  if (t.dataset.sopen !== undefined){ const i = +t.dataset.sopen; x.open.has(i) ? x.open.delete(i) : x.open.add(i); return renderSite(); }
  if (t.dataset.sv !== undefined){ const s = e.spaces[+t.dataset.sv], f = t.dataset.f, v = t.dataset.v; s[f] = s[f] || []; s[f] = s[f].includes(v) ? s[f].filter(z => z !== v) : [...s[f], v]; return ch(); }
  if (t.dataset.sdel !== undefined){ if (!t.classList.contains("arm")){ t.classList.add("arm"); t.textContent = "한 번 더 누르면 빼요"; return; } e.spaces.splice(+t.dataset.sdel, 1); x.open = new Set(); return ch(); }
});
document.addEventListener("input", ev => { if (SI && ev.target.matches("#sAddr,#sPw,[data-snote]")) siSaveSoon(800); });
$("#dlgScrim").addEventListener("click", () => { if (SI && SI_T) siSaveNow(); SI = null; });
// 위치별 타일 요약 (달력 목록·배치에 씀): "외욕실 600각 압착 젠다이 · 주방 300×600"
const spacesSpec = e => (e.spaces || []).map(s => [s.name, ...s.size, ...(s.base || []), ...s.method, ...s.parts, ...(s.extra || [])].join(" ")).join(" · ");
