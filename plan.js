/* 904 캘린더 · 짜보기판: 1주 달력에서 공정(보양·철거·방수·타일…)과 사람(동식·희태·성욱·지영)을 끌어 넣기
   달력(일정)에 있는 그대로 보여주고, 바꾼 건 초안으로 보관하다가 [달력에 저장]을 누르면 일정에 저장 (plan/start/end/off/proc/doneDays/byDay + crew/split/half) */
const PL = {who: "", mode: "crew", unit: "", wk: 0, draft: {}, base: {}, pe: {}, busy: false, hist: []};
// 한 단계 뒤로: 바꾸기 전 상태를 쌓아 둠 (최대 50번)
const plState0 = () => JSON.stringify({pe: PL.pe, draft: PL.draft});
// 공정 쪽은 바꾸기 전 일정 값을 같이 기억해 둠 (바로 저장된 뒤에도 뒤로 가면 그 값으로 다시 저장)
const plFields = e => ({plan: plClone(e.plan || {}), start: e.start, end: evEnd(e), off: [...(e.off || [])], proc: plClone(procOf(e, true)), planRoom: plClone(e.planRoom || {}), doneDays: plClone(e.doneDays || {}), byDay: plClone(e.byDay || {})});
function plAskRoom(){ const A = PL.askRoom; PL.askRoom = null; if (!A) return; const el = document.querySelector(`#plan [data-pcell="${CSS.escape(A.id)}"][data-k="${A.k}"] [data-dgu="${A.u}"]`); if (el){ plMenu(A.id, A.k, A.u, el); toast("어느 욕실인지 골라 주세요"); } }
function plTrack(fn){ const b = plState0(); fn(); if (plState0() !== b){ const o = JSON.parse(b);
    for (const id of Object.keys(PL.pe)) if (!o.pe[id] && S.events.get(id)) o.pe[id] = plFields(S.events.get(id));
    PL.hist.push(JSON.stringify(o)); if (PL.hist.length > 50) PL.hist.shift(); } plKeep(); renderPlan(); plAskRoom(); }
function plUndo(){ const b = PL.hist.pop(); if (!b) return; const o = JSON.parse(b); PL.pe = o.pe; PL.draft = o.draft; plKeep(); renderPlan(); }
// 짜보는 동안은 '초안'으로만 보관(DB config/planDraft · 앱을 다시 열어도, 다른 폰에서도 이어서) → [달력에 저장]을 눌러야 일정에 들어감
let PL_T = 0;
function plKeep(){ clearTimeout(PL_T); PL_T = setTimeout(plKeepNow, 400); }
function plKeepNow(){ if (!S.db || !S.canWrite) return; const ch = plChanges();
  const data = ch.n ? {on: true, pe: PL.pe, draft: PL.draft, base: PL.base, hist: PL.hist.slice(-15), at: new Date().toISOString()} : {on: false, at: new Date().toISOString()};
  S.db.doc("config/planDraft").set(data).catch(() => {}); }
function plLoadDraft(){ if (PL.loaded || !S.db) return; PL.loaded = true;
  let un = null; try { un = S.db.doc("config/planDraft").onSnapshot(s => { try { un && un(); } catch(_){}
    const o = s.exists ? s.data() : null; if (o && o.on && !plChanges().n){ PL.pe = o.pe || {}; PL.draft = o.draft || {}; PL.base = o.base || {}; PL.hist = o.hist || []; renderPlan(); } }, () => {}); } catch(_){} }
try { localStorage.removeItem("plDraft"); } catch(_){}
const PL_DAYS = 7;
const plDays = () => { const t = addD(todayK(), PL.wk * 7); return Array.from({length: PL_DAYS}, (_, i) => addD(t, i)); };
// 짜보기판에서 다루는 사람: 우리 4명 + 바쁠 때 끌어 쓰는 연합 인원까지 (아래 사람별 줄·경고는 우리 4명만)
const plAllIds = () => new Set([...S.workers.keys()]);
const plPeople = () => DSP_PEOPLE.map(n => [...S.workers.values()].find(w => w.name === n && !teamOf(w))).filter(Boolean);
const plOn = (e, k) => e.start <= k && evEnd(e) >= k && !(e.off || []).includes(k);
const plClone = o => JSON.parse(JSON.stringify(o));
// 공정 초안을 얹은 일정
const plEv = e => PL.pe[e.id] ? {...e, ...PL.pe[e.id]} : e;
const plEvents = () => [...S.events.values()].map(plEv);

// 실제 일정 → 그날 사람 초안 {eventId: {am:[ids], pm:[ids]}}
function plDayFromData(k){
  const ids = plAllIds(), out = {};
  const evs = [...S.events.values()].filter(e => plOn(e, k)).sort((a, b) => pr(a) - pr(b) || (a.title || "").localeCompare(b.title || "", "ko"));
  const seen = new Map();
  for (const e of evs){ const c = crewOn(e, k).filter(id => ids.has(id)); const r = {am: [], pm: []};
    for (const id of c){ const n = evs.filter(o => crewOn(o, k).includes(id)).length, moved = n > 1 && (e.split?.[k] || []).includes(id);
      const h = e.half?.[k]?.[id]; const i = seen.get(id) || 0; seen.set(id, i + 1);
      if (!moved && n < 2){ r.am.push(id); r.pm.push(id); }
      else if (h === "am" || h === "pm") r[h].push(id);
      else if (moved) r[i === 0 ? "am" : "pm"].push(id);
      else { r.am.push(id); r.pm.push(id); } }
    if (c.length) out[e.id] = r; }
  return out;
}
function plEnsure(){
  // 저장 안 된 게 없으면 늘 달력(일정)에 있는 그대로 다시 읽음
  plLoadDraft(); const idle = !PL.busy && !plChanges().n;
  for (const k of plDays()) if (!PL.base[k] || idle){ PL.base[k] = plDayFromData(k); PL.draft[k] = plClone(PL.base[k]); }
  if (idle) PL.pe = {};
}
const plSlot = (k, id) => (PL.draft[k] && PL.draft[k][id]) || {am: [], pm: []};
const plSame = (a, b) => [...(a || [])].sort().join() === [...(b || [])].sort().join();
const plJ = o => JSON.stringify(o ?? null);
// 바뀐 것: 사람 [k, id] 목록 + 공정 바뀐 일정 id
function plChanges(){
  const crew = [];
  for (const k of Object.keys(PL.draft)) for (const id of new Set([...Object.keys(PL.draft[k] || {}), ...Object.keys(PL.base[k] || {})])){
    const a = PL.draft[k][id] || {am: [], pm: []}, b = PL.base[k]?.[id] || {am: [], pm: []};
    if (!plSame(a.am, b.am) || !plSame(a.pm, b.pm)) crew.push([k, id]); }
  const proc = Object.keys(PL.pe).filter(id => { const e = S.events.get(id), p = PL.pe[id]; if (!e) return false;
    const o = {plan: e.plan || {}, start: e.start, end: evEnd(e), off: e.off || [], proc: procOf(e, true)};
    const pk = x => Object.fromEntries(Object.entries(x || {}).filter(([, v]) => Array.isArray(v) ? v.length : true).sort());
    return plJ(pk(p.plan)) !== plJ(pk(o.plan)) || p.start !== o.start || p.end !== o.end || plJ([...p.off].sort()) !== plJ([...o.off].sort()) || plJ(p.proc) !== plJ(o.proc) || plJ(pk(p.planRoom)) !== plJ(pk(e.planRoom || {})) || plJ(pk(p.doneDays)) !== plJ(pk(e.doneDays || {})) || plJ(pk(p.byDay)) !== plJ(pk(e.byDay || {})); });
  return {crew, proc, n: new Set([...crew.map(x => x[1]), ...proc]).size};
}
function plWhere(k, wid){
  const L = [];
  for (const [id, r] of Object.entries(PL.draft[k] || {})){ const e = S.events.get(id); if (!e) continue; const a = r.am.includes(wid), p = r.pm.includes(wid);
    if (a || p) L.push({e: plEv(e), half: a && p ? "종일" : a ? "오전" : "오후"}); }
  return L;
}
// 그날 그 공정이 끝났나: 공정 전체 완료 또는 그날 완료 표시(doneDays · 욕실 둘인 현장도 날짜별로)
const plDone = (e, k, u, P) => unitDone(u, P) || ((e.doneDays || {})[k] || []).includes(u);
function plToggleDone(id, k, u){ const p = plPe(id), a = p.doneDays[k] || [];
  p.doneDays[k] = a.includes(u) ? a.filter(x => x !== u) : [...a, u]; if (!p.doneDays[k].length) delete p.doneDays[k]; }
const shortT = e => (e.title || "현장").replace(/^[^-]{1,10}-/, "");
// 그날 현장 (우리 현장 + 우리 사람이 들어간 연합 현장)
function plSites(k){
  const mine = plAllIds(), ours4 = new Set(plPeople().map(w => w.id)), L = [];
  for (const e of plEvents()){ if (!plOn(e, k)) continue;
    const ours = pr(e) === 0, P = procOf(e), plan = planOf(e, P), pj = ours ? projectPlan(e, P, plan) : {tent: {}};
    const us = plan[k] || [], ts = ((pj.tent || {})[k] || []).filter(u => !us.includes(u)), r = plSlot(k, e.id);
    const other = crewOn(e, k).filter(id => !mine.has(id)), has = [...r.am, ...r.pm].some(id => ours4.has(id)) || (ours && (r.am.length || r.pm.length));
    L.push({e, ours, P, plan, us, ts, other, has}); }
  return L;
}
function plWarn(k){
  const W = [];
  for (const w of plPeople()){ const L = plWhere(k, w.id); if (!L.length) continue;
    const am = L.filter(x => x.half !== "오후"), pm = L.filter(x => x.half !== "오전");
    if (am.length > 1) W.push({t: `${w.name} 오전에 ${am.map(x => shortT(x.e)).join(" · ")} 두 곳`, lv: "bad"});
    if (pm.length > 1) W.push({t: `${w.name} 오후에 ${pm.map(x => shortT(x.e)).join(" · ")} 두 곳`, lv: "bad"});
    if (L.length > 1){ const ls = new Set(L.map(x => evLeader(x.e)?.name || "")); if (ls.size > 1) W.push({t: `${w.name} 이동 · 고용주가 달라요 (${[...ls].join(" ↔ ")})`, lv: "warn"}); } }
  for (const s of plSites(k)){ if (!s.ours) continue; const r = plSlot(k, s.e.id), mine = s.us.filter(u => !unitOut(u, s.P, s.us, s.e, k) && !plDone(s.e, k, u, s.P));
    if (mine.length && !r.am.length && !r.pm.length && !s.other.length) W.push({t: `${shortT(s.e)} ${mine.map(u => UNIT[u].l).join("·")} 할 사람이 없어요`, lv: "bad"}); }
  return W;
}
// 사람 아이콘: 동그란 아이콘 하나를 반으로 나눠 두 명씩
const plPairs = L => { let h = ""; for (let i = 0; i < L.length; i += 2) h += `<span class="ppair${L[i + 1] ? "" : " one"}">${L[i]}${L[i + 1] || ""}</span>`; return h; };
const plColor = e => COLORS.includes(e.color) ? e.color : "purple";
const ini = id => (wname(id) || "?").slice(0, 1);
const plState = (k, id, w) => { const r = plSlot(k, id), a = r.am.includes(w), p = r.pm.includes(w); return a && p ? "full" : a ? "am" : p ? "pm" : ""; };
// 1주 안 현장: 우리 현장(공정·기간이 이 주에 걸친 것) + 우리 사람이 들어간 연합 현장
function plWeekSites(){
  const days = plDays(), by = new Map();
  for (const k of days) for (const s of plSites(k)) if (s.ours || s.has){ if (!by.has(s.e.id)) by.set(s.e.id, {e: s.e, ours: s.ours, days: {}}); by.get(s.e.id).days[k] = s; }
  // 쉬는 날로 끊긴 것도 같은 줄에
  for (const x of by.values()) for (const k of days) if (!x.days[k] && x.e.start <= k && evEnd(x.e) >= k) x.days[k] = null;
  return [...by.values()].sort((a, b) => (b.ours - a.ours) || ownerRank(a.e) - ownerRank(b.e) || a.e.start.localeCompare(b.e.start) || (a.e.title || "").localeCompare(b.e.title || "", "ko"));
}
// 공정 칸 고르기 목록 (방수는 그 현장 차수까지만, 904 말고는 타일·메지만)
const PL_UNITS = ["prot","demo","plumb","elec","wp1","wp2","wp3","tile","meji","sani","dome","sil","etc"];
function renderPlan(){
  const el = $("#plan"); if (!el) return;
  if (!S.loaded.e){ el.innerHTML = `<div class="wempty">일정을 불러오는 중이에요</div>`; return; }
  plEnsure(); const days = plDays(), ch = plChanges(), ppl = plPeople(), W = Object.fromEntries(days.map(k => [k, plWarn(k)]));
  const sel = PL.who ? S.workers.get(PL.who) : null, pm = !!PL.unit;
  const tip = PL.unit ? `${UNIT[PL.unit].l}: 현장 칸을 누르면 넣고, 다시 누르면 빼요` : sel ? `${sel.name}: 칸을 누를 때마다 종일 → 오전 → 오후 → 빼기`
    : "꾹 눌러 칸으로 끌어 넣기 · 칸 밖으로 끌면 빼기";
  let h = `<div class="pl-top"><div class="pl-nav"><button type="button" class="ib" data-pwk="-1" aria-label="지난주">‹</button><b>${md(days[0])} – ${md(days[6])}</b><button type="button" class="ib" data-pwk="1" aria-label="다음 주">›</button>${PL.wk ? `<button type="button" class="lnk" data-pwk="0">오늘부터</button>` : ""}</div>
    <div class="row">${PL.hist.length ? `<button type="button" class="btn ghost sm" id="plUndo" title="방금 한 것 취소">↶ 뒤로</button>` : ""}${S.canWrite ? `<button type="button" class="btn ghost sm" id="plNew">+ 현장</button>` : ""}${ch.n && S.canWrite ? `<button type="button" class="btn ghost sm" id="plDrop">초안 버리기</button><button type="button" class="btn sm" id="plSave"${PL.busy ? " disabled" : ""}>${PL.busy ? "저장 중…" : `달력에 저장 ${ch.n}곳`}</button>` : ""}</div></div>
    ${ch.n ? `<div class="pl-draft">✎ 초안 · 아직 달력에 안 들어갔어요 (바꾼 현장 ${ch.n}곳)</div>` : ""}
    <div class="pl-mode"><small>${esc(tip)}</small></div>`;
  h += `<div class="pl-units"><div class="pu-row">${PL_UNITS.map(u => `<button type="button" class="pu-b" data-punit="${u}" aria-pressed="${PL.unit === u}">${esc(UNIT[u].s)}</button>`).join("")}${ppl.map(w => `<button type="button" class="pu-b pu-w" data-pwho="${esc(w.id)}" aria-pressed="${PL.who === w.id}">${esc(w.name)}</button>`).join("")}</div>
    ${(() => { const U = [...S.workers.values()].filter(w => teamOf(w)), T = [...new Set(U.map(teamOf))]; if (!U.length) return "";
      return `<details class="pu-uni"${PL.uniOpen ? " open" : ""}><summary>연합 인원 ${U.length}명 ${PL.uniOpen ? "▴" : "▾"}</summary>${T.map(t => `<div class="pu-row"><span class="pu-t">${esc(t)}팀</span>${U.filter(w => teamOf(w) === t).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko")).map(w => `<button type="button" class="pu-b pu-u" data-pwho="${esc(w.id)}" aria-pressed="${PL.who === w.id}">${esc(w.name)}</button>`).join("")}</div>`).join("")}</details>`; })()}</div>`;
  const head = `<div class="pg-row pg-head">${days.map(k => { const bad = W[k].filter(x => x.lv === "bad").length;
    return `<span class="${wdOf(k) === 0 || HOL[k] ? "sun" : wdOf(k) === 6 ? "sat" : ""}${k === todayK() ? " now" : ""}"><b>${k === todayK() ? "오늘" : WD[wdOf(k)]}</b>${md(k)}${bad ? `<i>${bad}</i>` : ""}</span>`; }).join("")}</div>`;
  let people = `<div class="pg-ppl">`;
  for (const w of ppl){ people += `<div class="pg-pr"><button type="button" class="pg-name" data-pwho="${esc(w.id)}" aria-pressed="${PL.who === w.id}">${esc(w.name)}</button><div class="pg-row">${days.map(k => { const L = plWhere(k, w.id);
      return `<span class="pg-pc${L.length ? "" : " empty"}${L.length > 1 ? " two" : ""}${L.filter(x => x.half !== "오후").length > 1 || L.filter(x => x.half !== "오전").length > 1 ? " bad" : ""}">${L.length ? [...L].sort((p, q) => (p.half === "오후") - (q.half === "오후")).map(x => `<em class="c-${plColor(x.e)}" title="${esc(x.e.title || "")} ${x.half}">${esc(shortT(x.e).slice(0, L.length > 1 ? 2 : 4))}</em>`).join("") : "빈"}</span>`; }).join("")}</div></div>`; }
  people += `</div>`;
  const sites = plWeekSites();
  let grid = sites.map(x => { const e = x.e, inR = k => k in x.days, a = days.findIndex(inR), b = days.length - 1 - [...days].reverse().findIndex(inR);
    const cl = e.start < days[a], cr = evEnd(e) > days[b], I = x.ours ? issuesOf(e, procOf(e)) : null, bad = I && !I.ok ? new Set(I.bad || []) : new Set();
    return `<div class="pg-site"><div class="pg-row"><button type="button" class="pg-bar c-${plColor(e)}${cl ? " cl" : ""}${cr ? " cr" : ""}" data-ev="${esc(e.id)}" style="grid-column:${a + 1}/-1;--w:${(b - a + 1) / (days.length - a) * 100}%"><span>${cl ? "← " : ""}${esc(e.title || "현장")}${cr ? " →" : ""}${ch.proc.includes(e.id) ? " ✎" : ""}</span></button></div>
      <div class="pg-row">${days.map(k => { const s = x.days[k];
        if (!s) return x.ours ? `<button type="button" class="pg-x add" data-pext="${esc(e.id)}" data-k="${k}">${s === null ? "쉼" : "+"}</button>` : `<span class="pg-x">${s === null ? "쉼" : ""}</span>`;
        const dn = u => plDone(e, k, u, s.P), allDone = s.us.length && s.us.every(dn);
        const isOut = u => unitOut(u, s.P, s.us, e, k), allOut = s.us.length && s.us.every(isOut);
        const us = [...unitGroups(e, k, s.us).map(g => { const u = g.us[g.us.length - 1], gd = g.us.every(dn), go = g.us.every(isOut);
          return `<b class="dg${g.us.includes(PL.unit) ? " hit" : ""}${gd ? " ok" : ""}${go ? " out" : ""}${g.us.length > 1 ? " grp" : ""}" data-dgu="${u}" data-dgg="${g.us.join(",")}" title="${esc(g.l)}">${gd ? "✓" : ""}${multiRoom(e) && roomTag(e, k, u) ? `<small class="rm">${esc(roomTag(e, k, u).slice(0, 1))}</small>` : ""}${esc(g.s)}</b>`; }), ...s.ts.map(u => `<b class="tent">${esc(UNIT[u].s)}?</b>`)];
        const r = plSlot(k, e.id), ids = [...new Set([...r.am, ...r.pm])], need = s.ours && s.us.some(u => !isOut(u) && !dn(u)) && !ids.length && !s.other.length;
        const st = PL.who ? plState(k, e.id, PL.who) : "";
        return `<button type="button" class="pg-cell c-${plColor(e)}${allDone ? " alldone" : ""}${need ? " need" : ""}${bad.has(k) ? " bad" : ""}${st ? " me" : ""}" data-pcell="${esc(e.id)}" data-k="${k}">
          <small>${us.join(" ") || (s.ours ? "" : "지원")}</small>
          ${need ? `<em class="nobody">👷 없음</em>` : ""}${plPairs([...ids.map(id => { const t = r.am.includes(id) && r.pm.includes(id) ? "" : r.am.includes(id) ? "전" : "후"; return `<i class="dg${id === PL.who ? " me" : ""}${teamOf(S.workers.get(id)) ? " uni" : ""}" data-dgw="${esc(id)}">${esc(wname(id))}${t ? `<sup>${t}</sup>` : ""}</i>`; }), ...(s.other.length ? [`<i class="ot">+${s.other.length}</i>`] : [])])}</button>`; }).join("")}</div></div>`; }).join("");
  if (!sites.length) grid = `<div class="wempty">이 주에 우리 현장이 없어요</div>`;
  const wl = days.flatMap(k => W[k].map(x => `<span class="${x.lv}">${md(k)} ${esc(x.t)}</span>`));
  for (const x of sites){ if (!x.ours) continue; const I = issuesOf(x.e, procOf(x.e)); if (!I.ok) for (const m of I.msgs) wl.push(`<span class="bad">${esc(shortT(x.e))} · ${esc(m)}</span>`); }
  el.innerHTML = h + `<div class="pg">${head}<details class="pg-sep"><summary>현장 · 표시 설명 ⓘ</summary><small><b class="lg-ok">✓완료</b> 공정 글자를 누르면 완료 표시 · <b class="lg-out">외주</b> 사람 안 넣어도 됨 · ? 임시 · <b class="lg-need">빨간 점선</b> 우리 할 공정인데 사람 없음 · <b class="lg-bad">빨간 테두리</b> 공정 순서 문제 · 이름 = 들어간 사람 (전/후 = 오전/오후)</small></details>${grid}${people}</div>`
    + (wl.length ? `<div class="pl-warn">${wl.join("")}</div>` : "")
    + `<p class="hint">짜 본 건 초안으로 보관돼요(앱을 다시 열어도 남아요) · [달력에 저장]을 눌러야 일정에 들어가요 · 막대를 누르면 일정이 열려요 · 새 현장은 위 [+ 현장]으로 만들어요</p>`;
}
function plCycle(id, k){
  const w = PL.who; if (!w){ toast("왼쪽 이름을 먼저 골라 주세요"); return; }
  const r = PL.draft[k][id] || (PL.draft[k][id] = {am: [], pm: []}), st = plState(k, id, w);
  const nx = {"": "full", full: "am", am: "pm", pm: ""}[st];
  r.am = r.am.filter(x => x !== w); r.pm = r.pm.filter(x => x !== w);
  if (nx === "full" || nx === "am") r.am.push(w); if (nx === "full" || nx === "pm") r.pm.push(w);
  renderPlan();
}
// 공정 초안 시작: 바꿀 일정의 plan/start/end/off/proc 복사
function plPe(id){ if (!PL.pe[id]) PL.pe[id] = plFields(S.events.get(id)); return PL.pe[id]; }
function plUnit(id, k, uu, want){ // want: true 넣기 · false 빼기 · 없으면 바꾸기
  const u = uu || PL.unit; if (!u){ toast("위에서 공정을 먼저 골라 주세요"); return false; }
  const e0 = S.events.get(id); if (!e0 || pr(e0) !== 0){ toast("연합 현장은 공정을 짜지 않아요"); return false; }
  const kind = UNIT[u].k;
  if (!bathOwner(e0.color) && kind !== "tile"){ toast("이 현장은 타일만 시공해요"); return false; }
  const p = plPe(id), P = procOf(plEv(e0));
  if (!P[kind]){ p.proc = {...p.proc, [kind]: newProc(kind)}; }
  if (kind === "wp"){ const n = Number(u[2]), cur = procOf({...plEv(e0), proc: p.proc}).wp; if (cur && n > cur.coats){ p.proc = {...p.proc, wp: {...cur, coats: n, steps: [0,1,2].map(i => !!cur.steps[i] && i < n)}}; } }
  const has = (p.plan[k] || []).includes(u), on = want === undefined ? !has : want;
  if (on && (k < p.start || k > p.end || p.off.includes(k))) plExtend(id, k, true);
  const a = Array.isArray(p.plan[k]) ? p.plan[k].filter(x => x !== u) : [];
  if (on) a.push(u);
  if (a.length) p.plan[k] = a; else delete p.plan[k];
  if (!on && p.planRoom[k]){ delete p.planRoom[k][u]; if (!Object.keys(p.planRoom[k]).length) delete p.planRoom[k]; }
  if (want === undefined) renderPlan(); return true;
}
function plExtend(id, k, quiet){
  const p = plPe(id);
  if (p.off.includes(k)) p.off = p.off.filter(d => d !== k);
  else { if (k < p.start){ for (let d = addD(k, 1); d < p.start; d = addD(d, 1)) if (!p.off.includes(d)) p.off.push(d); p.start = k; }  // 사이 날짜는 쉬는 날로
    if (k > p.end){ for (let d = addD(p.end, 1); d < k; d = addD(d, 1)) if (!p.off.includes(d)) p.off.push(d); p.end = k; } }
  p.off.sort(); if (quiet) return; if (PL.unit) return plUnit(id, k);
  renderPlan();
}
async function plSave(){
  if (PL.busy) return;
  const ch = plChanges(); if (!ch.n){ renderPlan(); return; } PL.busy = true; renderPlan();
  const mine = plAllIds(), byEv = new Map();
  for (const [k, id] of ch.crew){ if (!byEv.has(id)) byEv.set(id, []); byEv.get(id).push(k); }
  for (const id of ch.proc) if (!byEv.has(id)) byEv.set(id, []);
  let ok = 0;
  for (const [id, ks] of byEv){ const e = S.events.get(id); if (!e) continue; const data = {updatedAt: new Date().toISOString()};
    if (ks.length){ const crew = {...(e.crew || {})}, split = {...(e.split || {})}, half = {...(e.half || {})};
      for (const k of ks){ const r = PL.draft[k][id] || {am: [], pm: []}, both = [...new Set([...r.am, ...r.pm])];
        crew[k] = [...(crew[k] || []).filter(x => !mine.has(x)), ...both]; if (!crew[k].length) delete crew[k];
        const one = both.filter(x => !(r.am.includes(x) && r.pm.includes(x)));
        split[k] = [...(split[k] || []).filter(x => !mine.has(x)), ...one]; if (!split[k].length) delete split[k];
        const hh = {}; for (const x of one) hh[x] = r.am.includes(x) ? "am" : "pm"; if (Object.keys(hh).length) half[k] = hh; else delete half[k]; }
      Object.assign(data, {crew, split, half}); }
    if (ch.proc.includes(id)){ const p = PL.pe[id]; Object.assign(data, {plan: p.plan, start: p.start, end: p.end, off: p.off, proc: p.proc, planRoom: p.planRoom, doneDays: p.doneDays, byDay: p.byDay}); }
    // update는 안쪽 값을 합쳐서 '빼기'가 안 지워짐 → 일정 전체를 다시 씀(set)
    const full = {...e, ...data}; delete full.id; S.events.set(id, {...full, id});
    if (!S.db || await write(() => S.db.collection("events").doc(id).set(full))) ok++; }
  PL.busy = false;
  if (ok === byEv.size){ for (const k of Object.keys(PL.draft)) PL.base[k] = plClone(PL.draft[k]); PL.pe = {}; plKeepNow(); toast(`달력에 저장했어요 · ${byEv.size}곳`); }
  else toast("저장하지 못했어요. 인터넷을 확인해 주세요");
  if (typeof saveSnapSoon === "function") saveSnapSoon();
  renderPlan();
}
document.addEventListener("click", ev => {
  const t = ev.target.closest("button"); if (!t || !$("#plan") || !$("#plan").contains(t)) return;
  if (DG.eat){ DG.eat = false; return; }
  if (t.dataset.pwk !== undefined){ PL.wk = t.dataset.pwk === "0" ? 0 : PL.wk + Number(t.dataset.pwk); renderPlan(); return; }
  if (t.dataset.punit){ PL.unit = PL.unit === t.dataset.punit ? "" : t.dataset.punit; PL.who = ""; renderPlan(); return; }
  if (t.dataset.pwho){ PL.who = PL.who === t.dataset.pwho ? "" : t.dataset.pwho; PL.unit = ""; renderPlan(); return; }
  if (!S.canWrite && (t.dataset.pcell || t.dataset.pext)){ toast("수정 권한이 없어요"); return; }
  if (t.id === "plUndo"){ plUndo(); return; }
  if (t.id === "plSave"){ plSave(); return; }
  if (t.id === "plDrop"){ PL.hist.push(plState0()); PL.pe = {}; PL.draft = plClone(PL.base); plKeep(); renderPlan(); toast("초안을 버렸어요 · [↶ 뒤로]로 살릴 수 있어요"); return; }
  if (t.dataset.pext){ if (!PL.unit){ toast("공정을 골라서 누르면 그날까지 현장 기간이 늘어나요"); return; } plTrack(() => plExtend(t.dataset.pext, t.dataset.k, true) || plUnit(t.dataset.pext, t.dataset.k, PL.unit, true)); return; }
  if (t.dataset.pm){ plMenuAct(t.dataset.pm); return; }
  const wb = ev.target.closest("[data-dgw]");
  if (t.dataset.pcell && wb && !PL.unit && !PL.who){ if (!S.canWrite){ toast("수정 권한이 없어요"); return; } plWMenu(t.dataset.pcell, t.dataset.k, wb.dataset.dgw, wb); return; }
  const ub = ev.target.closest("[data-dgu]");
  if (t.dataset.pcell && ub && !PL.unit && !PL.who){ if (!S.canWrite){ toast("수정 권한이 없어요"); return; } plMenu(t.dataset.pcell, t.dataset.k, ub.dataset.dgu, ub); return; }
  if (t.dataset.pcell){ if (PL.unit) plTrack(() => plUnit(t.dataset.pcell, t.dataset.k, PL.unit, !(plEv(S.events.get(t.dataset.pcell)).plan?.[t.dataset.k] || []).includes(PL.unit))); else if (PL.who) plTrack(() => plCycle(t.dataset.pcell, t.dataset.k)); else toast("공정 글자를 누르면 완료 표시 · 넣으려면 공정이나 이름을 먼저 골라 주세요"); return; }
  if (t.id === "plNew"){ $("#fab").click(); return; }
});

/* 끌어서 넣기 (폰 손가락·마우스 모두)
   · 위 공정 버튼 / 왼쪽 이름 → 현장 칸에 놓으면 넣기
   · 칸 안의 공정·사람 → 다른 칸으로 옮기기 · 표 밖에 놓으면 빼기 */
const DG = {on: false, eat: false};
function dgSrc(el){
  const cell = el.closest("[data-pcell]");
  if (el.dataset.dgu && cell){ const g = (el.dataset.dgg || el.dataset.dgu).split(","); return {t: "u", u: el.dataset.dgu, g, id: cell.dataset.pcell, k: cell.dataset.k, label: el.title || UNIT[el.dataset.dgu].l}; }
  if (el.dataset.dgw && cell) return {t: "w", w: el.dataset.dgw, id: cell.dataset.pcell, k: cell.dataset.k, label: wname(el.dataset.dgw)};
  if (el.dataset.punit) return {t: "u", u: el.dataset.punit, label: UNIT[el.dataset.punit].l};
  if (el.dataset.pwho) return {t: "w", w: el.dataset.pwho, label: wname(el.dataset.pwho)};
  return null;
}
function dgTarget(x, y){ const el = document.elementFromPoint(x, y); if (!el) return null;
  const c = el.closest("[data-pcell],[data-pext]"); if (c && $("#plan").contains(c)) return {id: c.dataset.pcell || c.dataset.pext, k: c.dataset.k, el: c};
  return {out: true}; } // 칸 밖 어디든 놓으면 빼기
function dgDrop(src, tg){
  if (!tg || tg.none) return;
  if (!S.canWrite){ toast("수정 권한이 없어요"); return; }
  if (tg.out){ if (!src.id) return; // 칸에서 꺼내 표 밖에 놓음 → 빼기
    if (src.t === "u") plUnit(src.id, src.k, src.u, false); else { const r = PL.draft[src.k][src.id]; r.am = r.am.filter(x => x !== src.w); r.pm = r.pm.filter(x => x !== src.w); }
    toast(`${src.label} 뺐어요`); return; }
  if (src.id === tg.id && src.k === tg.k) return;
  if (src.t === "u"){
    if (src.id && src.id !== tg.id){ toast("공정은 같은 현장 안에서만 옮겨요"); return; }
    if (src.g && src.g.length > 1){ // 묶음(철거/방수 등)은 같이 옮김
      const pr0 = plEv(S.events.get(src.id)).planRoom?.[src.k] || {};
      for (const u of src.g){ const rm = pr0[u] || ""; if (!plUnit(tg.id, tg.k, u, true)) return; plUnit(src.id, src.k, u, false); if (rm){ const p = PL.pe[tg.id]; p.planRoom[tg.k] = {...(p.planRoom[tg.k] || {}), [u]: rm}; } }
      return; }
    const room = src.id ? (plEv(S.events.get(src.id)).planRoom?.[src.k]?.[src.u] || "") : "";
    if (!plUnit(tg.id, tg.k, src.u, true)) return;
    const te = S.events.get(tg.id); if (!src.id && te && multiRoom(te)){ // 그날 다른 공정이 한 욕실이면 그 욕실로 먼저 잡고, 메뉴로 확인
      const rs = new Set(Object.entries(PL.pe[tg.id].planRoom[tg.k] || {}).filter(([x]) => x !== src.u).map(([, v]) => v)); if (rs.size === 1) plSetRoom(tg.id, tg.k, src.u, [...rs][0]);
      PL.askRoom = {id: tg.id, k: tg.k, u: src.u}; }
    if (src.id) plUnit(src.id, src.k, src.u, false);
    if (room){ const p = PL.pe[tg.id]; p.planRoom[tg.k] = {...(p.planRoom[tg.k] || {}), [src.u]: room}; } // 욕실 표시도 같이 옮김
  } else {
    if (!PL.draft[tg.k] || tg.el.dataset.pext){ toast("현장 일하는 날에만 사람을 넣어요"); return; } let st = src.id ? plState(src.k, src.id, src.w) || "full" : "full";
    if (src.id){ const r = PL.draft[src.k][src.id]; r.am = r.am.filter(x => x !== src.w); r.pm = r.pm.filter(x => x !== src.w); }
    // 그날 이미 다른 현장에 있으면 → 이동: 먼저 있던 곳 오전, 새로 넣은 곳 오후 (반대도)
    const w = src.w, others = Object.entries(PL.draft[tg.k]).filter(([id, x]) => id !== tg.id && (x.am.includes(w) || x.pm.includes(w)));
    if (others.length === 1 && !(src.id && src.k === tg.k)){ const [oid, o] = others[0], os = plState(tg.k, oid, w);
      if (os === "full"){ o.pm = o.pm.filter(x => x !== w); st = "pm"; } else st = os === "am" ? "pm" : "am";
      const oe = S.events.get(oid), ne = S.events.get(tg.id);
      toast(`${wname(w)} 이동: ${shortT(oe)}(${st === "pm" ? "오전" : "오후"}) → ${shortT(ne)}(${st === "pm" ? "오후" : "오전"}) · 이름을 누르면 바꿀 수 있어요`); }
    const r = PL.draft[tg.k][tg.id] || (PL.draft[tg.k][tg.id] = {am: [], pm: []});
    r.am = r.am.filter(x => x !== src.w); r.pm = r.pm.filter(x => x !== src.w);
    if (st !== "pm") r.am.push(src.w); if (st !== "am") r.pm.push(src.w);
  }
}
document.addEventListener("pointerdown", () => { DG.eat = false; }, true); // 새로 누르면 끌기 뒤 클릭 막기 해제
// 끌기 공통: 시작 → 따라다니기 → 놓기
function dgStart(el, src, x0, y0){
  const box = $("#plan"); let ghost = null, last = null, raf = 0, vy = 0;
  const scroll = () => { if (vy) box.scrollTop += vy; raf = requestAnimationFrame(scroll); };
  DG.on = true; ghost = document.createElement("div"); ghost.className = "pdrag " + (src.t === "u" ? "u" : "w"); ghost.textContent = src.label; document.body.appendChild(ghost);
  el.classList.add("lift"); raf = requestAnimationFrame(scroll);
  const at = (x, y) => { ghost.style.transform = `translate(${x - 20}px, ${y - 40}px)`;
    const tg = dgTarget(x, y); if (last?.el && last.el !== tg?.el) last.el.classList.remove("drop"); if (tg?.el) tg.el.classList.add("drop");
    ghost.classList.toggle("del", !!(tg?.out && src.id)); last = tg;
    const r = box.getBoundingClientRect(), pb = $("#plan .pg-ppl")?.getBoundingClientRect(), bot = pb ? Math.min(r.bottom, pb.top) : r.bottom;
    vy = y < r.top + 70 ? -10 : y > bot - 50 && y < bot ? 10 : 0; };
  at(x0, y0);
  return {at, drop(x, y, ok){ cancelAnimationFrame(raf); el.classList.remove("lift"); ghost.remove(); last?.el?.classList.remove("drop"); DG.on = false; DG.eat = true;
    const tg = ok && last ? dgTarget(x, y) : null; plTrack(() => { if (tg) dgDrop(src, tg); }); }};
}
const DG_SEL = "#plan [data-dgu],#plan [data-dgw],#plan [data-punit],#plan [data-pwho]";
// 손가락: 꾹 누르고(0.3초, 진동) 끌기 · 그냥 밀면 스크롤만 · 길게 누를 때 뜨는 복사/메뉴 막기
document.addEventListener("contextmenu", e => { if (e.target.closest("#plan")) e.preventDefault(); });
document.addEventListener("touchstart", ev => {
  const el = ev.target.closest(DG_SEL); if (!el || ev.touches.length > 1) return;
  const src = dgSrc(el); if (!src) return;
  const t0 = ev.touches[0], x0 = t0.clientX, y0 = t0.clientY; let x = x0, y = y0, d = null;
  const timer = setTimeout(() => { try { navigator.vibrate?.(15); } catch(_){} d = dgStart(el, src, x, y); }, 300);
  const move = e => { const t = e.touches[0]; x = t.clientX; y = t.clientY;
    if (!d){ if (Math.hypot(x - x0, y - y0) > 10) stop(); return; } // 꾹 누르기 전에 움직이면 그냥 스크롤
    e.preventDefault(); d.at(x, y); };
  const end = e => { const ok = e.type === "touchend"; stop(); if (d) d.drop(x, y, ok); };
  const stop = () => { clearTimeout(timer); document.removeEventListener("touchmove", move); document.removeEventListener("touchend", end); document.removeEventListener("touchcancel", end); };
  document.addEventListener("touchmove", move, {passive: false}); document.addEventListener("touchend", end); document.addEventListener("touchcancel", end);
}, {passive: true});
// 마우스: 바로 끌기
document.addEventListener("pointerdown", ev => {
  if (ev.pointerType !== "mouse" || ev.button > 0) return;
  const el = ev.target.closest(DG_SEL); if (!el) return; const src = dgSrc(el); if (!src) return;
  const x0 = ev.clientX, y0 = ev.clientY; let d = null;
  const move = e => { if (!d){ if (Math.hypot(e.clientX - x0, e.clientY - y0) < 7) return; d = dgStart(el, src, e.clientX, e.clientY); } e.preventDefault(); d.at(e.clientX, e.clientY); };
  const up = e => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up); if (d) d.drop(e.clientX, e.clientY, e.type === "pointerup"); };
  document.addEventListener("pointermove", move); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
});

/* 공정 글자를 누르면 작은 메뉴: 완료 · 외주/우리가 함(그날만) · 빼기 */
function plMenu(id, k, u, el){
  plMenuClose(); const g = (el.dataset.dgg || u).split(","), e = plEv(S.events.get(id)), P = procOf(e), us = planOf(e, P)[k] || [], dn = g.every(x => plDone(e, k, x, P)), out = g.every(x => unitOut(x, P, us, e, k));
  const m = document.createElement("div"); m.id = "plMenu"; m.className = "pmenu"; PL.menu = {id, k, u, g};
  m.innerHTML = `<b>${md(k)} ${esc(el.title || UNIT[u].l)}</b><small>${esc(shortT(e))}</small>
    <button type="button" data-pm="done">${dn ? "완료 취소" : "✓ 완료"}</button>
    <button type="button" data-pm="${out ? "ours" : "out"}">${out ? "👷 우리가 함" : "외주로"}</button>
    ${multiRoom(e) ? `<div class="pm-rooms">${[...e.rooms, ""].map(rm => `<button type="button" data-pm="room-${esc(rm)}"${(roomTag(e, k, u) || "") === rm ? ' class="on"' : ""}>${rm ? esc(rm) : "전체"}</button>`).join("")}</div>` : ""}
    <button type="button" data-pm="del" class="dg">이날에서 빼기</button>
    <button type="button" data-pm="close" class="cl">닫기</button>`;
  $("#plan").appendChild(m); const r = el.getBoundingClientRect(), W = 170;
  m.style.left = Math.max(8, Math.min(window.innerWidth - W - 8, r.left + r.width / 2 - W / 2)) + "px";
  m.style.top = (r.bottom + 6 + 210 > window.innerHeight ? r.top - 216 : r.bottom + 6) + "px";
}
function plWMenu(id, k, w, el){
  plMenuClose(); const st = plState(k, id, w), m = document.createElement("div"); m.id = "plMenu"; m.className = "pmenu"; PL.menu = {id, k, w};
  m.innerHTML = `<b>${md(k)} ${esc(wname(w))}</b><small>${esc(shortT(S.events.get(id)))}</small>
    ${[["full","종일"],["am","오전만 (오후엔 다른 현장)"],["pm","오후만 (오전엔 다른 현장)"]].map(([v, l]) => `<button type="button" data-pm="w-${v}"${st === v ? ' class="on"' : ""}>${st === v ? "✓ " : ""}${l}</button>`).join("")}
    <button type="button" data-pm="w-del" class="dg">이 현장에서 빼기</button><button type="button" data-pm="close" class="cl">닫기</button>`;
  $("#plan").appendChild(m); const r = el.getBoundingClientRect(), W = 190; m.style.width = W + "px";
  m.style.left = Math.max(8, Math.min(window.innerWidth - W - 8, r.left + r.width / 2 - W / 2)) + "px";
  m.style.top = (r.bottom + 6 + 250 > window.innerHeight ? r.top - 256 : r.bottom + 6) + "px";
}
// 욕실 둘인 현장: 그날 그 공정이 어느 욕실인지 (빈 값 = 전체) · 공정의 욕실 목록에도 넣어 줌
function plSetRoom(id, k, u, rm){
  const p = plPe(id); p.planRoom[k] = {...(p.planRoom[k] || {})};
  if (rm) p.planRoom[k][u] = rm; else delete p.planRoom[k][u]; if (!Object.keys(p.planRoom[k]).length) delete p.planRoom[k];
  const kd = UNIT[u].k, pr0 = p.proc[kd]; if (rm && pr0 && (pr0.rooms || []).length && !pr0.rooms.includes(rm)) p.proc = {...p.proc, [kd]: {...pr0, rooms: [...pr0.rooms, rm]}};
}
function plMenuClose(){ $("#plMenu")?.remove(); PL.menu = null; }
function plMenuAct(a){
  const M = PL.menu; plMenuClose(); if (!M || a === "close") return; const {id, k, u} = M;
  if (a.startsWith("w-")){ const v = a.slice(2); plTrack(() => { const r = PL.draft[k][id] || (PL.draft[k][id] = {am: [], pm: []}); r.am = r.am.filter(x => x !== M.w); r.pm = r.pm.filter(x => x !== M.w);
      if (v === "full" || v === "am") r.am.push(M.w); if (v === "full" || v === "pm") r.pm.push(M.w); }); return; }
  const G = M.g || [u];
  if (a === "done"){ const e = plEv(S.events.get(id)), P = procOf(e), all = G.every(x => plDone(e, k, x, P));
    if (all && G.some(x => unitDone(x, P))){ toast("일정에서 공정 전체가 완료로 되어 있어요. 일정을 열어 바꿔 주세요"); return; }
    plTrack(() => { for (const x of G) if (plDone(plEv(S.events.get(id)), k, x, P) === all) plToggleDone(id, k, x); }); return; }
  if (a === "out" || a === "ours"){ plTrack(() => { for (const x of G){ const p = plPe(id), e = S.events.get(id), P = procOf(plEv(e)), us = planOf(plEv(e), P)[k] || [];
      const base = unitOut(x, P, us, {byDay: {}}, k); p.byDay[k] = {...(p.byDay[k] || {})};
      if ((a === "out") === base) delete p.byDay[k][x]; else p.byDay[k][x] = a; if (!Object.keys(p.byDay[k]).length) delete p.byDay[k]; } });
    toast(a === "out" ? "그날은 외주로 했어요" : "그날은 우리가 하는 걸로 했어요"); return; }
  if (a === "del"){ plTrack(() => { for (const x of G) plUnit(id, k, x, false); }); return; }
  if (a.startsWith("room-")){ plTrack(() => { for (const x of G) plSetRoom(id, k, x, a.slice(5)); }); return; }
}
document.addEventListener("pointerdown", e => { if ($("#plMenu") && !e.target.closest("#plMenu")) plMenuClose(); }, true);

document.addEventListener("toggle", e => { if (e.target.classList?.contains("pu-uni")){ PL.uniOpen = e.target.open; const s = e.target.querySelector("summary"); if (s) s.textContent = s.textContent.replace(/[▴▾]/, PL.uniOpen ? "▴" : "▾"); } }, true);
