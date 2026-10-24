/* 904 캘린더 · 정산 탭 */
/* ---------- 정산 ---------- */
function payRowHTML(r){
  const tag = r.team ? `연합 · ${r.team}` : glabel(groupOf(r.w));
  const dd = r.team ? r.days.map(k => `${md(k)} ${r.sites.get(k)||""}`.trim()).join(", ") : r.days.map(md).join(", ");
  return `<div class="payrow g-${groupOf(r.w)}"><span class="pn">${esc(r.w?.name||"삭제된 인원")} <small style="color:var(--muted);font-weight:400">${esc(tag)}</small></span>
    <span class="pt">${won(r.total)}</span><span class="pd">${r.days.length}공 × ${won(r.wage)} · ${esc(dd)}</span></div>`;
}
function monthOut(y, m){
  const first = key(new Date(y,m,1)), last = [key(new Date(y,m+1,0)), todayK()].sort()[0]; const list = [];
  for (const e of S.events.values()){ if (!is904(e)) continue; const P = procOf(e);
    for (const k of procKeys(P)){ const p = P[k]; if (p.by !== "out") continue; const d = kindDays(planOf(e, P), k)[0] || p.date || e.start; if (d < first || d > last) continue;
      list.push({d, kind:k, vendor:p.vendor, amount:p.amount, done:p.done, title:e.title||"", id:e.id}); } }
  list.sort((a,b)=>a.d.localeCompare(b.d)); return {list, total: list.reduce((s,x)=>s+x.amount,0)};
}
// 외부 지원: 명부에 없는 사람 (일정의 ext) · 사람별 날짜·현장
function monthExt(y, m){
  const first = key(new Date(y,m,1)), last = [key(new Date(y,m+1,0)), todayK()].sort()[0], by = new Map();
  for (const e of S.events.values()) if (is904(e)) for (const [k, names] of Object.entries(e.ext||{})){
    if (k < first || k > last || k < e.start || k > evEnd(e) || (e.off||[]).includes(k)) continue;
    for (const n of names||[]){ if (!by.has(n)) by.set(n, []); by.get(n).push({d: k, title: e.title||"", id: e.id, ours: pr(e) === 0}); } }
  return [...by.entries()].map(([name, list]) => ({name, list: list.sort((a,b)=>a.d.localeCompare(b.d)), days: new Set(list.map(x=>x.d)).size, oursDays: new Set(list.filter(x=>x.ours).map(x=>x.d)).size}))
    .sort((a,b) => b.days - a.days || a.name.localeCompare(b.name,"ko"));
}
function renderLabor(el){ // 인건비·외주비 (정산 탭 안 '인건비')
  const p = monthPay(S.y,S.m); const o = monthOut(S.y,S.m);
  if (!p.rows.length && !o.list.length && !monthExt(S.y,S.m).length){ el.innerHTML = `<div class="empty"><b>${S.m+1}월 904 현장 정산할 내역이 없어요</b>일정을 열고 날짜별로 투입 인원을 고르면 여기에 공수와 인건비가 쌓여요.</div>`; return; }
  const noWage = p.rows.some(r => !r.wage);
  let html = `<div class="stack">
    <p class="hint">904 현장에 온 사람만 정산해요 · 희태·동식·성욱은 일당 없음</p>
    <div class="sum"><div><small>${S.m+1}월 줄 일당 합계</small><b>${won(p.total)}</b></div><div><small>총 공수</small><b>${p.mandays}공 · ${p.rows.length}명</b></div></div>
    ${noWage?`<div class="hint">일당이 0원인 사람이 있어요. 인원 탭에서 일당을 입력해 주세요.</div>`:""}`;
  if (p.own.length) html += `<div><h3>우리 팀 <small>${p.own.length}명</small></h3>${p.own.map(payRowHTML).join("")}<div class="paytot"><span>우리 팀 소계</span><b>${won(p.ownTotal)}</b></div></div>`;
  if (p.uni.length) html += `<div><h3>연합원 일당 <small>우리 현장에 온 날만 · ${p.uni.length}명</small></h3>${p.uni.map(payRowHTML).join("")}<div class="paytot"><span>연합원 소계</span><b>${won(p.uniTotal)}</b></div></div>`;
  if (p.rows.length) html += `<div class="paytot"><span>줄 일당 합계</span><b>${won(p.total)}</b></div>`;
  if (o.list.length){ html += `<div><h3>외주비 <small>${o.list.length}건 · 작업 날짜 기준 (날짜 없으면 현장 시작일)</small></h3>${o.list.map(x=>`<button class="payrow" data-ev="${esc(x.id)}"><span class="pn">${esc(x.vendor||"업체 미정")} <small style="color:var(--muted);font-weight:400">${KIND_LABEL[x.kind]}${x.done?" · 완료":""}</small></span><span class="pt">${won(x.amount)}</span><span class="pd">${md(x.d)} · ${esc(x.title)}</span></button>`).join("")}<div class="paytot"><span>외주비 합계</span><b>${won(o.total)}</b></div></div>`;
    if (o.list.some(x=>!x.amount)) html += `<div class="hint">금액이 비어 있는 외주가 있어요. 눌러서 현장 일정에서 넣어 주세요.</div>`;
    if (p.rows.length) html += `<div class="paytot"><span>인건비 + 외주비</span><b>${won(p.total + o.total)}</b></div>`; }
  const ex = monthExt(S.y,S.m);
  if (ex.length) html += `<div><h3>외부 지원 <small>명부에 없는 사람 · ${ex.length}명 · ${ex.reduce((s,x)=>s+x.days,0)}공</small></h3>${ex.map(x => `<div class="payrow"><span class="pn">${esc(x.name)} <small style="color:var(--muted);font-weight:400">외부 지원${x.oursDays ? ` · 우리 현장 ${x.oursDays}일` : ""}</small></span><span class="pt">${x.days}공</span><span class="pd">${esc(x.list.map(i => `${md(i.d)} ${i.title}`).join(", "))}</span></div>`).join("")}<p class="hint">일당은 계산에 안 들어가요. 일정 창 '투입 인원'에서 날짜마다 고칠 수 있어요</p></div>`;
  if (false && p.earnRows.length) html += `<div><h3>우리 팀이 연합 일 나간 날 <small>사장별로 받을 일당 확인용</small></h3>${p.earnRows.map(er => `<div class="payrow"><span class="pn">${esc(er.leader)} 현장</span><span class="pt">${er.days}공</span>
      <span class="pd">${esc(er.list.map(x => `${md(x.date)} ${S.workers.get(x.id)?.name||"?"}`).join(", "))}</span></div>`).join("")}</div>`;
  html += `<div class="row"><button class="btn ghost" id="copyPay">정산 내용 복사</button></div></div>`;
  el.innerHTML = html;
}
function payText(){
  const p = monthPay(S.y,S.m); const L = [`${S.y}년 ${S.m+1}월 인건비 정산`];
  const line = r => `${r.w?.name||"삭제된 인원"}(${r.team?"연합·"+r.team:glabel(groupOf(r.w))}) ${r.days.length}공 × ${won(r.wage)} = ${won(r.total)}`;
  if (p.own.length){ L.push("", "[우리 팀]"); p.own.forEach(r=>L.push(line(r))); L.push(`소계 ${won(p.ownTotal)}`); }
  if (p.uni.length){ L.push("", "[연합원 일당]"); p.uni.forEach(r=>{ L.push(line(r)); L.push("  " + r.days.map(k=>`${md(k)} ${r.sites.get(k)||""}`.trim()).join(", ")); }); L.push(`소계 ${won(p.uniTotal)}`); }
  L.push("", `줄 일당 합계 ${p.mandays}공 ${won(p.total)}`);
  const o = monthOut(S.y,S.m);
  if (o.list.length){ L.push("", "[외주비]"); o.list.forEach(x=>L.push(`${md(x.d)} ${x.vendor||"업체 미정"} ${KIND_LABEL[x.kind]} ${won(x.amount)} (${x.title})`)); L.push(`외주비 합계 ${won(o.total)}`); }
  const ex = monthExt(S.y,S.m); if (ex.length){ L.push("", "[외부 지원]"); ex.forEach(x => L.push(`${x.name} ${x.days}공: ${x.list.map(i=>`${md(i.d)} ${i.title}`).join(", ")}`)); }
  if (false && p.earnRows.length){ L.push("", "[연합 일 나간 날]"); p.earnRows.forEach(er => L.push(`${er.leader} ${er.days}공: ${er.list.map(x=>`${md(x.date)} ${S.workers.get(x.id)?.name||"?"}`).join(", ")}`)); }
  return L.join("\n");
}

