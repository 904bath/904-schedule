/* 904 캘린더 · 오늘·내일 할 일 (출근 배치, 비번, 휴무, 외주, 확인할 것) */
function dayBrief(k){
  const sites = [], assigned = new Map();
  for (const e of eventsOn(k)){
    if ((e.off || []).includes(k)) continue;
    const ours = pr(e) === 0, P = procOf(e), plan = planOf(e, P), pj = ours ? projectPlan(e, P, plan) : {tent:{}};
    const ids = crewOn(e, k); for (const id of ids) if (!assigned.has(id)) assigned.set(id, e.title || "");
    const us = plan[k] || [], ts = (pj.tent[k] || []).filter(u => !us.includes(u)), di = e.days?.[k] || {};
    if (!ours && !ids.length) continue;                                   // 연합 일은 우리 사람이 갈 때만
    const chk = [];
    if (ours){
      const working = ids.length || us.length;
      if (working && !String(e.addr||"").trim()) chk.push("주소 확인");
      if (working && !String(e.pw||"").trim() && !e.nopw) chk.push("비밀번호 확인");
      if (us.some(u => !unitOut(u, P, us, e, k) && !unitDone(u, P)) && !ids.length) chk.push("인원 미배정");
      for (const u of us){ const p = P[UNIT[u].k]; if (p && p.by === "out" && !bkOn(p, k) && !p.done) chk.push(`☎ ${UNIT[u].l} 외주 연락 전`); }
      const mt = matOf(e); if (mt.by === "ours" && !mt.ready) chk.push("우리 자재 준비");
      if (e.pending) chk.push("카톡에서 가져온 일정 · 확인 필요");
      const I = issuesOf(e, P); if (I.msgs.length && !I.ok) chk.push("⚠ 일정 경고 " + I.msgs.length + "개");
    }
    sites.push({e, ours, P, ids, us, ts, di, chk, k});
  }
  sites.sort((a,b) => (b.ours - a.ours) || ownerRank(a.e) - ownerRank(b.e) || (a.di.time||"99").localeCompare(b.di.time||"99") || (a.e.title||"").localeCompare(b.e.title||"", "ko"));
  const mine = [...S.workers.values()].filter(w => !teamOf(w)).sort((a,b) => GROUPS.indexOf(groupOf(a)) - GROUPS.indexOf(groupOf(b)) || (a.name||"").localeCompare(b.name||"", "ko"));
  const free = mine.filter(w => !assigned.has(w.id));
  return {k, sites, free};
}
const wname = id => S.workers.get(id)?.name || "?";
function unitLine(s){
  const G = unitGroups(s.e, s.k || "", s.us); if (G.some(g => g.us.length > 1)){ // 철거/방수 · 보양+… 묶음
    const parts = G.map(g => { const u = g.us[g.us.length - 1], p = s.P[UNIT[u].k]; let t = g.l; const rt = roomTag(s.e, s.k || "", u); if (rt) t += `(${rt})`; if (g.us.every(x => unitDone(x, s.P))) t += " ✓";
      if (g.us.every(x => unitOut(x, s.P, s.us, s.e, s.k))) t += ` (외주${p?.vendor ? " " + p.vendor : ""})`; return t; });
    if (s.ts.length) parts.push(...s.ts.map(u => UNIT[u].l + "(임시)")); return parts.join(" · "); }
  const parts = s.us.map(u => { const p = s.P[UNIT[u].k]; let t = UNIT[u].l; const rt = roomTag(s.e, s.k || "", u); if (rt) t += `(${rt})`; if (unitDone(u, s.P)) t += " ✓";
    if (p?.by === "out") t += ` (외주${p.vendor ? " " + p.vendor : ""}${bkOn(p, s.k) || p.done ? "" : " · 연락 전"})`; return t; });
  if (s.ts.length) parts.push(...s.ts.map(u => UNIT[u].l + "(임시)"));
  return parts.join(" · ");
}
function dayText(b){
  const d = parse(b.k), L = [`${d.getMonth()+1}/${d.getDate()}(${WD[d.getDay()]}) 출근`]; let n = 0;
  for (const s of b.sites){ if (!s.ids.length) continue; n++;
    L.push(`${n}. ${s.e.title || "현장"} / ${s.e.addr || "주소 확인"} / ${s.ids.map(wname).join(" ")}${s.di.time ? " / " + s.di.time + "까지" : ""}${s.us.length || s.di.note ? " / " + [s.us.map(u => UNIT[u].l).join("·"), s.di.note].filter(Boolean).join(" ") : ""}`);
    if (String(s.e.addr||"").trim()) L.push(`   🚗 네이버지도 ${naverSearch(placeQ(s.e.addr))}`);
    if (s.ours) L.push(`   비번: ${s.e.pw ? s.e.pw : s.e.nopw ? "필요 없음" : "확인 필요"}`); }
  if (!n) L.push("배정된 현장 없음");
  if (b.free.length) L.push(`휴무: ${b.free.map(w => w.name).join(" ")}`);
  return L.join("\n");
}
function dayCardHTML(b, label){
  const d = parse(b.k), wk = isWknd(b.k);
  let h = `<section class="tcard${wk ? " wkd" : ""}"><div class="th"><b>${label} <span>${d.getMonth()+1}.${d.getDate()} (${WD[d.getDay()]})${HOL[b.k] ? " · " + esc(HOL[b.k]) : ""}</span></b>
    <button type="button" class="btn ghost sm" data-tcopy="${b.k}">배치 문자 복사</button></div>`;
  if (!b.sites.length) h += `<div class="tempty">${wk ? "주말·공휴일 · 잡힌 현장 없음" : "잡힌 현장 없음"}</div>`;
  for (const s of b.sites){ const e = s.e;
    h += `<button type="button" class="tsite c-${COLORS.includes(e.color)?e.color:"purple"}${s.chk.length ? " need" : ""}" data-ev="${esc(e.id)}">
      <div class="tt"><b>${esc(e.title || "제목 없음")}</b>${s.ours ? "" : `<span class="tag">연합 지원</span>`}${s.di.time ? `<span class="tm">${esc(s.di.time)} 집합</span>` : ""}</div>
      <div class="tl">👷 ${s.ids.length ? `<b>${esc(s.ids.map(wname).join(" · "))}</b> · ${s.ids.length}명` : `<span class="mut">인원 없음</span>`}</div>
      ${s.ours ? `<div class="tl">📍 ${e.addr ? esc(e.addr) + ` <span class="maplink" role="link" data-map="${esc(naverSearch(placeQ(e.addr)))}">🚗 지도</span>` : `<span class="ng">주소 미입력</span>`}　🔑 ${e.pw ? `<b>${esc(e.pw)}</b>` : e.nopw ? "비번 필요 없음" : `<span class="ng">비번 미입력</span>`}</div>` : ""}
      ${s.us.length || s.ts.length ? `<div class="tl">🛠 ${esc(unitLine(s))}</div>` : ""}
      ${s.di.note ? `<div class="tl mut">📝 ${esc(s.di.note)}</div>` : ""}
      ${s.chk.length ? `<div class="tw">${s.chk.map(c => `<span>${esc(c)}</span>`).join("")}</div>` : ""}</button>`; }
  if (b.free.length) h += `<div class="toff"><b>${wk ? "주말 · 배정 없음" : "휴무 · 배정 없음"}</b> ${esc(b.free.map(w => w.name).join(", "))}</div>`;
  return h + `</section>`;
}
function renderToday(){
  const el = $("#today"), tk = todayK(), tm = addD(tk, 1);
  const ot = outTodo(), ur = ot.filter(x => x.level === "urgent"), wa = ot.filter(x => x.level === "warn");
  const wt = issueTodo(), qt = qreqTodo(), p7 = prepTodo().filter(x => x.left <= 7);
  const top = [];
  if (ur.length) top.push(`<button type="button" class="trow red" data-open="out">🚨 외주 일정 급함 <b>${ur.length}건</b> · ${esc(ur.slice(0,3).map(x => `${KIND_LABEL[x.k]} ${x.e.title||""}`).join(", "))}</button>`);
  if (wa.length) top.push(`<button type="button" class="trow org" data-open="out">⚠ 외주 7영업일 안 <b>${wa.length}건</b></button>`);
  if (wt.length) top.push(`<button type="button" class="trow red2" data-open="warn">⚠ 공정 확인 필요 <b>${wt.length}곳</b></button>`);
  if (p7.length) top.push(`<button type="button" class="trow blu" data-open="prep">📋 1주일 안 안 적은 정보 <b>${p7.length}곳</b> · ${esc(p7.slice(0,2).map(x => x.e.title||"").join(", "))}</button>`);
  if (qt.length) top.push(`<button type="button" class="trow pur" data-open="qr">💬 견적 보낼 것 <b>${qt.reduce((s,x) => s + x.q.length, 0)}건</b></button>`);
  let h = `<div class="tstack"><button type="button" class="btn ghost" data-sharelink="1" style="height:42px">🔗 배치 링크 새로고침</button>`; // '지금 챙길 것'은 빼고 인원별 카드만
  const people = (k, label) => { const d = parse(k);
    return `<section class="tcard"><div class="th"><b>${label} <span>${d.getMonth()+1}.${d.getDate()} (${WD[d.getDay()]})${HOL[k] ? " · " + esc(HOL[k]) : ""}</span></b>
      <button type="button" class="btn ghost sm" data-dtxt="${k}">공유</button></div><div class="pc-list">${dspData(k).people.map(personCardHTML).join("")}</div></section>`; };
  h += people(tk, "오늘") + people(tm, "내일");
  if (isWknd(tm)){ let n = addD(tm, 1), g = 0; while (isWknd(n) && g++ < 10) n = addD(n, 1); h += people(n, "다음 평일"); }
  el.innerHTML = h + `</div>`;
}
