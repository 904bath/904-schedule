/* 904 캘린더 · 달력에서 바로 고치기
   - 공정 밑 인원 줄: 날짜마다 들어간 사람 · 우리 할 공정인데 사람 없으면 빨간 점선 "👷 없음" · 누르면 사람 고르기 (904 4명 기본 · 연합 · 기타)
   - 꾹 눌러 끌기: 공정 칸 → 다른 날로 옮기기 · 사람 이름 → 다른 날/다른 현장으로 옮기기 (밖에 놓으면 빼기)
   - 맨 위 '오늘' 칸: 오늘 가는 현장 주소 · 비번 · 인원 · 할 일 */
// 일정 하나 고쳐서 통째로 저장 (부분 저장은 지운 게 되살아나서)
async function evMut(id, fn, msg){
  if (!S.canWrite){ toast("수정 권한이 없어요"); return false; }
  const e0 = S.events.get(id); if (!e0) return false; const e = structuredClone(e0); delete e.id;
  for (const f of ["crew", "ext", "half", "split", "plan", "planRoom", "doneDays", "byDay"]) e[f] = e[f] || {}; e.off = e.off || [];
  if (fn(e) === false) return false;
  for (const f of ["crew", "ext", "split", "plan", "doneDays"]) for (const k of Object.keys(e[f])) if (Array.isArray(e[f][k]) && !e[f][k].length) delete e[f][k];
  for (const f of ["half", "planRoom", "byDay"]) for (const k of Object.keys(e[f])) if (!Object.keys(e[f][k] || {}).length) delete e[f][k];
  e.updatedAt = new Date().toISOString(); S.events.set(id, {...e, id}); renderAll();
  if (!S.db) return true; return await write(() => S.db.collection("events").doc(id).set(e), msg);
}
const dropW = (e, k, w) => { e.crew[k] = (e.crew[k] || []).filter(x => x !== w); if (e.half[k]) delete e.half[k][w]; if (e.split[k]) e.split[k] = e.split[k].filter(x => x !== w); };
const dropX = (e, k, n) => { e.ext[k] = (e.ext[k] || []).filter(x => x !== n); };

/* ---------- 인원 줄 (cal.js에서 공정 줄 밑에 그림) ---------- */
function crewRowHTML(it, pos, row, k0){
  const e = it.e, P = procOf(e), plan = planOf(e, P); let h = "";
  for (let i = 0; i < it.span; i++){ const k = addD(k0, it.c + i);
    if (k > evEnd(e) || k < e.start || (e.off || []).includes(k)){ h += `<span class="pc-d off"></span>`; continue; }
    const ids = crewOn(e, k), ex = e.ext?.[k] || [], us = plan[k] || [], hf = e.half?.[k] || {};
    const need = us.some(u => !unitOut(u, P, us, e, k) && !unitDone(u, P) && !((e.doneDays || {})[k] || []).includes(u)) && !ids.length && !ex.length;
    const names = [...ids.map(id => `<i class="cw${teamOf(S.workers.get(id)) ? " uni" : ""}" data-cw="${esc(id)}">${esc(wname(id))}${hf[id] === "am" ? "<sup>전</sup>" : hf[id] === "pm" ? "<sup>후</sup>" : ""}</i>`),
      ...ex.map(n => `<i class="cw ext" data-cx="${esc(n)}">${esc(n)}</i>`)];
    h += `<span class="pc-d${need ? " need" : ""}${names.length ? "" : " empty"}" data-ck="${k}">${need ? `<em>👷 없음</em>` : names.join("") || `<em class="add">+</em>`}</span>`;
  }
  return `<div class="pcrew${it.cl ? " cl" : ""}${it.cr ? " cr" : ""}" data-cev="${esc(e.id)}" style="${pos};grid-row:${row};grid-template-columns:repeat(${it.span},minmax(0,1fr))">${h}</div>`;
}

/* ---------- 사람 고르기 (아래에서 올라오는 작은 창) ---------- */
let CW = null; // {id, k, uni}
function openCrewPick(id, k){ CW = {id, k, uni: CW?.uni || false}; renderCrewPick(); }
function renderCrewPick(){
  const x = CW; if (!x) return; const e = S.events.get(x.id); if (!e){ closeCrewPick(); return; }
  const ids = crewOn(e, x.k), ex = e.ext?.[x.k] || [], d = parse(x.k);
  const busy = id => eventsOn(x.k).filter(o => o.id !== x.id && crewOn(o, x.k).includes(id)).map(o => shortT(o));
  const btn = w => { const on = ids.includes(w.id), b = busy(w.id); return `<button type="button" class="cp-b${on ? " on" : ""}" data-cpw="${esc(w.id)}">${on ? "✓ " : ""}${esc(w.name)}${b.length ? `<small>${esc(b[0])}</small>` : ""}</button>`; };
  const U = [...S.workers.values()].filter(w => teamOf(w)), T = [...new Set(U.map(teamOf))];
  let h = `<div class="cp-h"><b>${esc(shortT(e))}</b> · ${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]}) 인원<button type="button" class="lnk" data-cpclose>닫기</button></div>
    <div class="cp-row">${plPeople().map(btn).join("")}</div>
    <button type="button" class="cp-more" data-cpuni>연합 인원 ${U.length}명 ${x.uni ? "▴" : "▾"}</button>
    ${x.uni ? T.map(t => `<div class="cp-row"><span class="cp-t">${esc(t)}팀</span>${U.filter(w => teamOf(w) === t).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko")).map(btn).join("")}</div>`).join("") : ""}
    <div class="cp-row cp-ext"><span class="cp-t">기타</span>${ex.map(n => `<button type="button" class="cp-b on" data-cpx="${esc(n)}">${esc(n)} ✕</button>`).join("")}<input id="cpExt" placeholder="다른 팀 지원 · 이름" autocomplete="off"><button type="button" class="btn sm" data-cpadd>넣기</button></div>
    <small class="hint">누르면 바로 저장 · 이름을 꾹 눌러 끌면 다른 날·현장으로 옮겨요</small>`;
  let el = $("#cwPop"); if (!el){ el = document.createElement("div"); el.id = "cwPop"; document.body.appendChild(el); }
  el.innerHTML = h;
}
function closeCrewPick(){ $("#cwPop")?.remove(); CW = null; }
document.addEventListener("click", ev => {
  const pop = $("#cwPop");
  if (pop && pop.contains(ev.target)){ const t = ev.target.closest("button"); if (!t || !CW) return; const {id, k} = CW;
    if (t.hasAttribute("data-cpclose")) return closeCrewPick();
    if (t.hasAttribute("data-cpuni")){ CW.uni = !CW.uni; return renderCrewPick(); }
    if (t.dataset.cpw){ const w = t.dataset.cpw; evMut(id, e => { if ((e.crew[k] || []).includes(w)) dropW(e, k, w); else e.crew[k] = [...(e.crew[k] || []), w]; }).then(renderCrewPick); renderCrewPick(); return; }
    if (t.dataset.cpx){ const n = t.dataset.cpx; evMut(id, e => dropX(e, k, n)).then(renderCrewPick); return; }
    if (t.hasAttribute("data-cpadd")){ const n = ($("#cpExt")?.value || "").trim(); if (!n) return; evMut(id, e => { if (!(e.ext[k] || []).includes(n)) e.ext[k] = [...(e.ext[k] || []), n]; }).then(renderCrewPick); return; }
    return; }
  if (CD.eat){ return; }
  const c = ev.target.closest("#cal .pcrew .pc-d[data-ck]");
  if (c){ ev.preventDefault(); ev.stopPropagation(); openCrewPick(c.closest(".pcrew").dataset.cev, c.dataset.ck); return; }
  if (pop && !ev.target.closest("#cwPop")) closeCrewPick();
}, true);
document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target.id === "cpExt") $("#cwPop [data-cpadd]")?.click(); });

/* ---------- 꾹 눌러 끌기 ---------- */
const CD = {on: false, eat: false};
window.addEventListener("click", ev => { if (CD.eat){ CD.eat = false; ev.stopImmediatePropagation(); ev.preventDefault(); } }, true); // 끌고 난 뒤 클릭은 먹음
// 손가락 위치 → 달력의 날짜
function calDayAt(x, y){
  const el = document.elementFromPoint(x, y); const wk = el?.closest("#cal .week"); if (!wk) return null;
  const r = wk.getBoundingClientRect(), i = Math.max(0, Math.min(6, Math.floor((x - r.left) / (r.width / 7))));
  return {k: wk.querySelectorAll(".cols .day")[i]?.dataset.day, el};
}
function cdSrc(el, x, y){
  const strip = el.closest(".pstrip[data-ev]");
  if (el.dataset.pu && strip){ const g = calDayAt(x, y); const ds = el.dataset.pds.split(","); return {t: "u", id: strip.dataset.ev, us: el.dataset.pu.split(","), ds, k: ds.includes(g?.k) ? g.k : ds[0], label: el.title || "공정"}; }
  const row = el.closest(".pcrew[data-cev]"), cell = el.closest(".pc-d[data-ck]"); if (!row || !cell) return null;
  if (el.dataset.cw) return {t: "w", id: row.dataset.cev, k: cell.dataset.ck, w: el.dataset.cw, label: wname(el.dataset.cw)};
  if (el.dataset.cx) return {t: "x", id: row.dataset.cev, k: cell.dataset.ck, n: el.dataset.cx, label: el.dataset.cx};
  return null;
}
function cdTarget(src, x, y){
  const el = document.elementFromPoint(x, y); if (!el) return null;
  if (src.t === "u"){ const g = calDayAt(x, y); return g?.k ? {k: g.k, el: g.el.closest(".pstrip,.pcrew,.bar,.day") || g.el} : {out: true}; }
  // 사람: 그 현장 묶음(제목·공정·인원 줄) 어디에 놓아도 그날 인원 칸으로 · 살짝 빗나가도 가장 가까운 현장으로
  const g = calDayAt(x, y); if (!g?.k) return {out: true}; const wk = g.el.closest(".week");
  const top = r => { const b = wk.querySelector(`.bar[data-ev="${CSS.escape(r.dataset.cev)}"]`); return (b || r).getBoundingClientRect().top; };
  let row = null; const hit = el.closest("[data-ev],[data-cev]");
  if (hit && wk.contains(hit)) row = wk.querySelector(`.pcrew[data-cev="${CSS.escape(hit.dataset.cev || hit.dataset.ev)}"]`);
  if (!row){ let bd = 1e9; for (const r of wk.querySelectorAll(".pcrew")){ if (!r.querySelector(`.pc-d[data-ck="${g.k}"]`)) continue;
      const t = top(r), bt = r.getBoundingClientRect().bottom, dd = y < t ? t - y : y > bt ? y - bt : 0; if (dd < bd){ bd = dd; row = r; } }
    if (bd > 36) row = null; }
  if (!row) return {out: true};
  const c = row.querySelector(`.pc-d[data-ck="${g.k}"]`); if (!c) return {bad: true, el: row};
  return {id: row.dataset.cev, k: g.k, el: c};
}
async function cdDrop(src, tg){
  if (!tg || tg.bad){ if (tg?.bad) toast("쉬는 날 · 기간 밖에는 못 넣어요"); return; }
  if (src.t === "u"){
    if (tg.out){ toast("공정 옮기기 취소"); return; }
    const dlt = diff(src.k, tg.k); if (!dlt) return;
    const moves = src.ds.map(d => [d, addD(d, dlt)]);
    await evMut(src.id, e => {
      const P = procOf(e); const base = planOf(e, P); if (!Object.keys(e.plan).length) e.plan = structuredClone(base);
      const tmp = {plan: {}, planRoom: {}, doneDays: {}, byDay: {}};
      for (const [d] of moves){ // 먼저 다 꺼내고
        for (const f of ["plan", "doneDays"]){ const a = e[f][d] || []; const m = a.filter(u => src.us.includes(u)); e[f][d] = a.filter(u => !src.us.includes(u)); if (m.length) tmp[f][d] = m; }
        for (const f of ["planRoom", "byDay"]){ const a = e[f][d]; if (!a) continue; const m = {}; for (const u of src.us) if (u in a){ m[u] = a[u]; delete a[u]; } if (Object.keys(m).length) tmp[f][d] = m; } }
      for (const [d, nd] of moves){ // 새 날짜에 넣기
        for (const f of ["plan", "doneDays"]) if (tmp[f][d]) e[f][nd] = [...new Set([...(e[f][nd] || []), ...tmp[f][d]])];
        for (const f of ["planRoom", "byDay"]) if (tmp[f][d]) e[f][nd] = {...(e[f][nd] || {}), ...tmp[f][d]};
        for (const k of new Set(src.us.map(u => UNIT[u].k))){ for (const f of ["bkd", "dd"]){ const b = e.proc?.[k]?.[f]; if (b && d in b){ tmp.bk = tmp.bk || {}; (tmp.bk[k + "|" + f] = tmp.bk[k + "|" + f] || {})[nd] = b[d]; delete b[d]; } } }
        if (nd < e.start) e.start = nd; if (nd > evEnd(e)) e.end = nd; e.off = e.off.filter(k => k !== nd); }
      for (const [kf, m] of Object.entries(tmp.bk || {})){ const [k, f] = kf.split("|"); Object.assign(e.proc[k][f], m); }
    }, `${src.label} ${md(src.k)} → ${md(tg.k)} 옮겼어요`);
    return; }
  // 사람
  const name = src.label;
  if (tg.out){ await evMut(src.id, e => src.t === "w" ? dropW(e, src.k, src.w) : dropX(e, src.k, src.n), `${name} 뺐어요`); return; }
  if (tg.id === src.id && tg.k === src.k) return;
  const add = e => { if (src.t === "w"){ if (!(e.crew[tg.k] || []).includes(src.w)) e.crew[tg.k] = [...(e.crew[tg.k] || []), src.w]; } else if (!(e.ext[tg.k] || []).includes(src.n)) e.ext[tg.k] = [...(e.ext[tg.k] || []), src.n]; };
  const rm = e => src.t === "w" ? dropW(e, src.k, src.w) : dropX(e, src.k, src.n);
  const msg = `${name} ${md(src.k)} → ${md(tg.k)}${tg.id !== src.id ? " " + shortT(S.events.get(tg.id)) : ""}`;
  if (tg.id === src.id) await evMut(src.id, e => { rm(e); add(e); }, msg);
  else { if (await evMut(tg.id, add)) await evMut(src.id, rm, msg); }
}
function cdStart(el, src, x0, y0){
  const box = $("#cal"); let ghost = document.createElement("div"), last = null, raf = 0, vy = 0;
  const scroll = () => { if (vy) box.scrollTop += vy; raf = requestAnimationFrame(scroll); };
  CD.on = true; try { sx = null; } catch(_){} ghost.className = "pdrag " + (src.t === "u" ? "u" : "w"); ghost.textContent = src.label; document.body.appendChild(ghost);
  el.classList.add("lift"); raf = requestAnimationFrame(scroll); closeCrewPick();
  const at = (x, y) => { ghost.style.transform = `translate(${x - 20}px, ${y - 40}px)`;
    const tg = cdTarget(src, x, y); if (last?.el && last.el !== tg?.el) last.el.classList.remove("drop"); if (tg?.el) tg.el.classList.add("drop");
    ghost.classList.toggle("del", !!(tg?.out && src.t !== "u")); if (tg?.k) ghost.textContent = `${src.label} → ${md(tg.k)}${src.t !== "u" && tg.id ? " " + shortT(S.events.get(tg.id)) : ""}`; else ghost.textContent = src.label; last = tg;
    const r = box.getBoundingClientRect(); vy = y < r.top + 60 ? -10 : y > r.bottom - 60 ? 10 : 0; };
  at(x0, y0);
  return {at, drop(x, y, ok){ cancelAnimationFrame(raf); el.classList.remove("lift"); ghost.remove(); last?.el?.classList.remove("drop"); CD.on = false; CD.eat = true; setTimeout(() => { CD.eat = false; }, 400);
    if (ok) cdDrop(src, cdTarget(src, x, y)); }};
}
const CD_SEL = "#cal .pstrip [data-pu],#cal .pcrew [data-cw],#cal .pcrew [data-cx]";
document.addEventListener("contextmenu", e => { if (e.target.closest("#cal")) e.preventDefault(); });
document.addEventListener("touchstart", ev => {
  const el = ev.target.closest(CD_SEL); if (!el || ev.touches.length > 1) return;
  const t0 = ev.touches[0], x0 = t0.clientX, y0 = t0.clientY; let x = x0, y = y0, d = null;
  const src = cdSrc(el, x0, y0); if (!src || !S.canWrite) return;
  const timer = setTimeout(() => { try { navigator.vibrate?.(15); } catch(_){} d = cdStart(el, src, x, y); }, 350);
  const move = e => { const t = e.touches[0]; x = t.clientX; y = t.clientY; if (!d){ if (Math.hypot(x - x0, y - y0) > 10) stop(); return; } e.preventDefault(); d.at(x, y); };
  const end = e => { const ok = e.type === "touchend"; stop(); if (d){ e.preventDefault?.(); d.drop(x, y, ok); } };
  const stop = () => { clearTimeout(timer); document.removeEventListener("touchmove", move); document.removeEventListener("touchend", end); document.removeEventListener("touchcancel", end); };
  document.addEventListener("touchmove", move, {passive: false}); document.addEventListener("touchend", end); document.addEventListener("touchcancel", end);
}, {passive: true});
document.addEventListener("pointerdown", ev => {
  if (ev.pointerType !== "mouse" || ev.button > 0) return;
  const el = ev.target.closest(CD_SEL); if (!el || !S.canWrite) return; const src = cdSrc(el, ev.clientX, ev.clientY); if (!src) return;
  const x0 = ev.clientX, y0 = ev.clientY; let d = null;
  const move = e => { if (!d){ if (Math.hypot(e.clientX - x0, e.clientY - y0) < 7) return; d = cdStart(el, src, e.clientX, e.clientY); } e.preventDefault(); d.at(e.clientX, e.clientY); };
  const up = e => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up); if (d) d.drop(e.clientX, e.clientY, e.type === "pointerup"); };
  document.addEventListener("pointermove", move); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
});
// 달력 좌우 밀기(달 넘기기)는 끌기 중엔 안 되게
// (끌기 시작하면 sx를 비워서 달 넘기기 안 되게 · cdStart)

/* ---------- 맨 위 '오늘' 칸 ---------- */
function todayBoxHTML(){
  const k = todayK(), b = dayBrief(k), d = parse(k);
  const sites = b.sites.filter(s => s.ours || s.ids.length);
  if (!sites.length) return `<div class="todaybox"><div class="tb-h">오늘 ${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]}) · 잡힌 현장 없음</div></div>`;
  return `<div class="todaybox"><div class="tb-h">오늘 ${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]}) 가는 현장 ${sites.length}곳</div>${sites.map(s => { const e = s.e, names = [...s.ids.map(wname), ...(e.ext?.[k] || [])], todo = unitLine(s);
    return `<div class="tb-s c-${COLORS.includes(e.color) ? e.color : "purple"}"><button type="button" class="tb-t" data-tbev="${esc(e.id)}">${e.tent ? "예정 · " : ""}${esc(e.title || "현장")}${s.di.time ? ` <small>${esc(s.di.time)} 집합</small>` : ""}</button>
      <div class="tb-l">📍 ${e.addr ? `${esc(e.addr)} <span class="maplink" role="link" data-map="${esc(naverSearch(placeQ(e.addr)))}">🚗 지도</span>` : `<span class="ng">주소 없음</span>`}</div>
      <div class="tb-l">🔑 ${e.pw ? `<b class="tb-pw">${esc(e.pw)}</b>` : e.nopw ? "비번 필요 없음" : `<span class="ng">비번 없음</span>`}</div>
      <div class="tb-l">👷 ${names.length ? esc(names.join(" · ")) : `<span class="ng">인원 없음</span>`}</div>
      ${todo ? `<div class="tb-l tb-do">🛠 ${esc(todo)}</div>` : ""}${s.di.note ? `<div class="tb-l tb-do">📝 ${esc(s.di.note)}</div>` : ""}
      ${s.chk.filter(c => !/주소|비밀번호|인원/.test(c)).map(c => `<div class="tb-l ng">${esc(c)}</div>`).join("")}</div>`; }).join("")}</div>`;
}
// 앱을 열 때(그리고 '오늘' 버튼) 팝업으로 먼저 띄우고, 닫으면 달력
function showTodayPop(){ closeTodayPop(); const w = document.createElement("div"); w.id = "tdPop";
  w.innerHTML = `<div class="td-scrim" data-tdclose></div><div class="td-card">${todayBoxHTML().replace('<div class="tb-h">', '<div class="tb-h"><button type="button" class="td-x" data-tdclose aria-label="닫기">✕</button>')}<button type="button" class="btn td-ok" data-tdclose>닫고 달력 보기</button>${S.canWrite && S.mcp ? `<button type="button" class="btn ghost td-share" data-sharecal style="margin:6px 12px 0;height:40px;flex:none">📅 일정 공유 홈페이지 지금 갱신</button>` : ""}</div>`;
  document.body.appendChild(w); }
function closeTodayPop(){ $("#tdPop")?.remove(); }
document.addEventListener("click", ev => {
  if (ev.target.closest("[data-tdclose]")){ ev.preventDefault(); ev.stopPropagation(); closeTodayPop(); return; }
  const t = ev.target.closest("[data-tbev]"); if (!t) return; ev.preventDefault(); ev.stopPropagation(); closeTodayPop(); openSite(t.dataset.tbev); }, true);
document.addEventListener("keydown", ev => { if (ev.key === "Escape") closeTodayPop(); });
$("#todayBtn")?.addEventListener("click", () => setTimeout(showTodayPop, 50));
// 일정 공유 홈페이지(904bath.github.io/904-schedule) 지금 갱신 · 평소엔 저녁 8시·새벽 5시쯤 자동
const SHARECAL_TRIGGER = "trig_01A3qaoDkRmm98o3RrWFcr2W";
document.addEventListener("click", async ev => { const b = ev.target.closest("[data-sharecal]"); if (!b) return; ev.preventDefault(); ev.stopPropagation();
  if (!S.mcp){ toast("이 화면에서는 갱신할 수 없어요"); return; } b.disabled = true;
  try { await S.mcp.callTool("Claude Code Remote", "fire_trigger", {trigger_id: SHARECAL_TRIGGER, text: "앱에서 '일정 공유 홈페이지 지금 갱신'을 눌렀어요. 평소대로 갱신하세요."}, {cache: false}); toast("일정 공유 갱신 시작 · 몇 분 뒤 홈페이지에 반영돼요"); }
  catch(e){ toast(e?.code === "not_granted" || e?.code === "server_not_connected" ? "Claude Code Remote 연결을 허용해야 쓸 수 있어요" : "갱신하지 못했어요. 잠시 뒤 다시 눌러 주세요"); }
  finally { b.disabled = false; } }, true);
