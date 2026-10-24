/* 904 캘린더 · 달력 · 목록 · 하루 보기 */
/* ---------- 달력 ---------- */
const stOf = p => p.done ? "done" : p.by === "out" ? (p.booked ? "out" : "call") : "ours";
const ST_LABEL = {ours:"할 일", out:"외주(일정 잡음)", call:"외주 연락 전", done:"완료"};
// 현장 막대 밑 공정 막대: 칸이 넓으면 공정마다, 좁으면 요약(연락 전 · 남은 · 완료)
const KICON = {prot:"🛡", demo:"🔨", plumb:"🔧", elec:"⚡", wp:"💧", tile:"🧱", meji:"🧽", sani:"🚽", dome:"💡", sil:"〰", etc:"•"};
function stripHTML(it, P, pk, pos, row, width, k0){
  const plan = planOf(it.e, P); const chk0 = issuesOf(it.e, P); const chk = {bad: new Set(), msgs: chk0.ok ? [] : chk0.msgs}; // 칸별 표시 대신 현장 전체 빨간 테두리
  if (Object.keys(plan).length){ // 날짜별 공정이 있으면 날짜 칸마다 그날 공정
    // 날짜마다 공정 묶음을 만들고, 같은 공정이 이어지는 날은 한 칸으로 합침 (예: 타일 26~27 → 한 칸) · 여러 공정은 위아래로
    const T = chk0.tent || {}, cells = [], fill = []; // cells: {c, key, g, s, t, bad} · fill: 공정 없는 날 칸
    for (let i=0; i<it.span; i++){ const d = addD(k0, it.c + i), us = [...(plan[d] || []), ...(T[d] || [])].sort((x,y) => UNIT[x].i - UNIT[y].i);
      const isT = u => (T[d] || []).includes(u) && !(plan[d] || []).includes(u), bad = chk.bad.has(d);
      if (d > evEnd(it.e)){ fill.push({c: i, h: `<span class="ps over">${esc(us.map(u => UNIT[u].s).join("·"))}${us.length?"?":""}</span>`}); continue; }
      if ((it.e.off||[]).includes(d)){ fill.push({c: i, h: `<span class="ps wknd${bad?" bad":""}">쉼</span>`}); continue; }
      if (!us.length){ fill.push({c: i, h: isWknd(d) ? `<span class="ps wknd">주말</span>` : `<span class="ps empty"></span>`}); continue; }
      const st1 = u => { const p = P[UNIT[u].k]; const dn = unitDone(u, P) || ((it.e.doneDays||{})[d]||[]).includes(u), call = p.by==="out" && !bkOn(p, d) && !p.done; return dn ? "done" : call ? "call" : unitOut(u, P, us, it.e, d) ? "out" : "ours"; };
      const GR = unitGroups(it.e, d, us).flatMap(g => g.us.includes("prot") && g.us.length > 1 ? [{us: ["prot"], s: "보양", l: "보양"}, {us: g.us.filter(u => u !== "prot"), s: g.s.replace(/^보양\+/, ""), l: g.l.replace(/^보양\+/, "")}] : [g]);
      for (const g of GR){ const st = g.us.map(st1), s = ["call","ours","out","done"].find(x => st.includes(x)), t = g.us.every(isT);
        const kk = g.us.map(u => u === "meji" ? "meji" : u).join(","); cells.push({c: i, d, key: kk + "|" + s + "|" + t, g, s, t, bad}); } }
    // 이어지는 같은 칸 합치기
    const runs = []; for (const x of cells){ const r = runs.find(r => r.key === x.key && r.c + r.n === x.c); if (r){ r.n++; r.bad = r.bad || x.bad; r.ls.push(x.g.l); r.ds.push(x.d); } else runs.push({...x, n: 1, ls: [x.g.l], ds: [x.d]}); }
    runs.sort((a, b) => a.c - b.c || UNIT[a.g.us[0]].i - UNIT[b.g.us[0]].i);
    const lanes = []; for (const r of runs){ let L = 0; while ((lanes[L] || []).slice(r.c, r.c + r.n).some(Boolean)) L++; lanes[L] = lanes[L] || []; for (let j = r.c; j < r.c + r.n; j++) lanes[L][j] = true; r.L = L; }
    const NL = Math.max(1, lanes.length), small = NL > 1;
    const item = r => { const u0 = r.g.us.find(u => u !== "prot") || r.g.us[0], mk = u0 === "meji" ? "meji" : UNIT[u0].k, lab = r.g.s.length > 5 ? r.g.s.replace(/[가-힣]+/g, w => w.slice(0, 2)) : r.g.s;
      return `<span class="ps ${r.s} k-${mk}${r.t?" tent":""}${r.bad?" bad":""}${small?" row":""}" style="grid-column:${r.c+1}/span ${r.n};grid-row:${r.L+1}" title="${esc(r.g.l)}" data-pu="${r.g.us.join(",")}" data-pds="${r.ds.join(",")}"><i class="pi">${r.s==="done"?"✓":r.s==="call"?"☎":KICON[mk]||""}</i><b${lab.length >= 4 ? ' class="lg4"' : ""}>${esc(lab)}${r.t?"?":""}</b></span>`; };
    const segs = [...runs.map(item), ...fill.map(f => f.h.replace('<span class="ps', `<span style="grid-column:${f.c+1};grid-row:1/span ${NL}" class="ps`))];
    const gstyle = `display:grid;grid-template-columns:repeat(${it.span},minmax(0,1fr));grid-template-rows:repeat(${NL},minmax(${small?24:42}px,auto));`;
    const tip = Object.keys(plan).sort().map(d => `${md(d)} ${plan[d].map(u => UNIT[u].l + (unitDone(u,P)?" ✓":"")).join(", ")}`).join("\n") + (chk.msgs.length ? "\n⚠ " + chk.msgs.join("\n⚠ ") : "");
    const tipT = Object.keys(T).sort().map(d => `${md(d)} ${T[d].map(u => UNIT[u].l).join(", ")} (임시)`).join("\n");
    return `<button class="pstrip${it.cl?" cl":""}${it.cr?" cr":""}" data-ev="${esc(it.e.id)}" style="${pos};grid-row:${row};${gstyle}" title="${esc(tip + (tipT ? "\n" + tipT : ""))}">${segs.join("")}</button>`;
  }
  const tip = pk.map(k => KIND_LABEL[k] + " " + ST_LABEL[stOf(P[k])] + (progOf(k,P[k]).txt ? " " + progOf(k,P[k]).txt : "")).join(", ") + (P.tile && tileSpec(P.tile) ? "\n타일: " + tileSpec(P.tile) : "");
  let inner;
  if (width / pk.length >= 24){
    inner = pk.map(k => { const s = stOf(P[k]), g = progOf(k, P[k]); return `<span class="ps ${s} k-${k}${g.half?" half":""}"><i class="pi">${s==="call"?"☎":s==="done"?"✓":KICON[k]||""}</i><b>${SHORT[k]}${g.txt?" "+g.txt:""}</b></span>`; }).join("");
  } else {
    const c = pk.filter(k => stOf(P[k])==="call").length, d = pk.filter(k => P[k].done).length, r = pk.length - c - d;
    inner = (c?`<span class="ps call" style="flex-grow:${c}">☎${c}</span>`:"") + (r?`<span class="ps ours" style="flex-grow:${r}">${width>=45 || !(c||d)?"남은 ":""}${r}</span>`:"") + (d?`<span class="ps done" style="flex-grow:${d}">✓${d}</span>`:"");
  }
  return `<button class="pstrip${it.cl?" cl":""}${it.cr?" cr":""}" data-ev="${esc(it.e.id)}" style="${pos};grid-row:${row}" title="${esc(tip)}">${inner}</button>`;
}
// 달력에서 연합 일정 열고 닫기 (기기마다 기억)
try { S.hideUnion = localStorage.getItem("hideUnion") !== "0"; } catch(_){ S.hideUnion = true; } // 기본은 닫힘
function syncUnionBtn(){ const b = document.getElementById("unionBtn"); if (!b) return; b.setAttribute("aria-pressed", String(!S.hideUnion)); b.textContent = S.hideUnion ? "연합 보기" : "연합 숨기기"; }
document.addEventListener("click", e => { if (!e.target.closest("#unionBtn")) return; S.hideUnion = !S.hideUnion; try { localStorage.setItem("hideUnion", S.hideUnion ? "1" : "0"); } catch(_){} syncUnionBtn(); renderCal(); });
const MAXL = () => window.innerHeight < 700 ? 2 : 3;
// 이어지는 달력: 앞뒤 달까지 주를 쭉 그려 두고, 내리면 다음 달이 자연스럽게 이어짐 (위 제목도 따라 바뀜)
const weekOf = k => addD(k, -wdOf(k));
function calRangeFor(y, m){ const a = weekOf(key(new Date(y, m-1, 1))), b = weekOf(key(new Date(y, m+2, 0))); return {from: a, n: diff(a, b)/7 + 1}; }
function renderCal(){
  const cal = $("#cal"); const key0 = S.y + "-" + S.m;
  if (!S.calR || S._calTop !== key0) S.calR = calRangeFor(S.y, S.m);
  const tk = todayK(); const evs = [...S.events.values()];
  const visEnd = new Map(); for (const e of evs){ if (pr(e) !== 0) continue; const o = issuesOf(e).over || []; if (o.length) visEnd.set(e.id, o.map(x => x.d).sort().pop()); } const need = new Set(outTodo().map(x => x.e.id));
  const maxl = MAXL(); let html = "";
  for (let w=0; w<S.calR.n; w++){
    const k0 = addD(S.calR.from, w*7); const k6 = addD(k0,6);
    let cols = "";
    for (let i=0;i<7;i++){
      const k = addD(k0,i); const d = parse(k); const hol = HOL[k];
      const cls = ["day", i===0?"sun":"", i===6?"sat":"", hol?"hol":"", d.getMonth()!==S.m?"oth":"", k===tk?"today":"", k===S.sel?"sel":""].join(" ");
      cols += `<button class="${cls}" data-day="${k}" aria-label="${d.getMonth()+1}월 ${d.getDate()}일${hol?" "+hol:""}"><span class="n${d.getDate()===1?" m1d":""}">${d.getDate()===1?`<b class="m1">${d.getMonth()+1}월</b>`:""}${d.getDate()}</span><span class="lu">${hol?esc(hol):""}</span></button>`;
    }
    // 막대 배치
    const VE = e => visEnd.get(e.id) || evEnd(e); // 임시 공정이 기간을 넘으면 거기까지 늘려서 보여줌
    const wk = evs.filter(e => e.start <= k6 && VE(e) >= k0)
      .map(e => { const s = e.start < k0 ? k0 : e.start; const en = VE(e) > k6 ? k6 : VE(e); return {e, c: diff(k0,s), span: diff(s,en)+1, cl: e.start < k0, cr: VE(e) > k6}; })
      .sort((a,b) => pr(a.e) - pr(b.e) || ownerRank(a.e) - ownerRank(b.e) || a.c - b.c || b.span - a.span || (a.e.time||"").localeCompare(b.e.time||""));
    const colW = Math.max(30, (($("#cal").clientWidth || 700) / 7));
    const place = (list, cap, strips) => {
      const lanes = []; const hidden = new Array(7).fill(0); let bars = "", base = 0, curRk = -1;
      const free = (L, it) => !lanes[L] || !lanes[L].slice(it.c, it.c+it.span).some(Boolean);
      for (const it of list){
        const P = strips ? procOf(it.e) : null; const pk = P ? procKeys(P) : []; const n = pk.length ? 3 : 1; // 현장 · 공정 · 인원
        const rk = ownerRank(it.e); if (rk !== curRk){ curRk = rk; base = lanes.length; } // 904·동식·희태는 줄을 따로 (같은 줄에 섞지 않음)
        let L = base; while (!(free(L, it) && (n === 1 || free(L+1, it)))) L++;
        for (let j=0; j<n; j++){ lanes[L+j] = lanes[L+j] || new Array(7).fill(false); for (let i=it.c;i<it.c+it.span;i++) lanes[L+j][i]=true; }
        if (L + n > cap){ for (let i=it.c;i<it.c+it.span;i++) hidden[i]++; continue; }
        const timed = it.e.time && it.e.start === evEnd(it.e);
        const warn = n >= 2 && (() => { const c = issuesOf(it.e, P); return c.msgs.length && !c.ok; })();
        const label = (it.e.tent ? "예정 · " : "") + (warn ? "⚠ " : "") + (need.has(it.e.id) && n === 1 ? "☎ " : "") + (timed ? it.e.time + " " : "") + (it.e.title || "제목 없음");
        const pos = `grid-column:${it.c+1}/span ${it.span}`;
        bars += `<button class="bar c-${COLORS.includes(it.e.color)?it.e.color:"purple"}${timed?" timed":""}${it.e.pending?" pend":""}${it.e.tent?" tent":""}${it.cl?" cl":""}${it.cr?" cr":""}${n>=2?" hasp":""}${warn?" warn":""}" data-ev="${esc(it.e.id)}" style="${pos};grid-row:${L+1}" title="${esc(label)}">${esc(label)}</button>`;
        if (n >= 2){ const sh = stripHTML(it, P, pk, pos, L+2, it.span * colW, k0).replace('class="pstrip', 'class="pstrip hasc'); bars += warn ? sh.replace('class="pstrip', 'class="pstrip warn') : sh; bars += crewRowHTML(it, pos, L+3, k0); }
      }
      hidden.forEach((n,i) => { if (n) bars += `<button class="more" data-day="${addD(k0,i)}" style="grid-column:${i+1};grid-row:${cap+1}">+${n}</button>`; });
      return bars;
    };
    const ours = wk.filter(it => pr(it.e) === 0), others = S.hideUnion ? [] : wk.filter(it => pr(it.e) !== 0); // 연합 일정 숨기기
    const wk0 = addD(tk, -wdOf(tk)), focus = k0 === wk0 || k0 === addD(wk0, 7); // 이번 주·다음 주는 크게
    html += `<div data-wk="${k0}" class="week${focus ? " focus" : ""}${k0 === wk0 ? " thisweek" : ""}"><div class="cols">${cols}</div><div class="bars ours">${place(ours, Infinity, true)}</div><div class="bars oth">${place(others, Infinity, false)}</div></div>`;
  }
  const anc = S._calAnc; S._calAnc = null;
  const st0 = cal.scrollTop; cal.innerHTML = html; cal.scrollTop = st0;
  if (anc){ const w = cal.querySelector(`.week[data-wk="${anc.k}"]`); if (w) cal.scrollTop += (w.getBoundingClientRect().top - cal.getBoundingClientRect().top) - anc.off; } cal.classList.toggle("nouni", !!S.hideUnion); syncUnionBtn(); // 다시 그려도 스크롤 위치 유지 · 연합 숨기면 점선 칸도 없앰
  if (!S._tdShown && S.loaded?.e && S.loaded?.w && S.tab === "cal"){ S._tdShown = true; setTimeout(showTodayPop, 400); } // 앱 열면 오늘 현장 창 먼저
  // 달력을 열면 이번 주가 맨 위로 (달을 바꾸거나 처음 열 때만)
  if (S._calTop !== key0 && (S.loaded?.e || !S.db)){ S._calTop = key0; S._calNavCancel = false;
    const tgt = cal.querySelector(".week.thisweek") && parse(tk).getMonth() === S.m && parse(tk).getFullYear() === S.y ? ".week.thisweek" : `.week[data-wk="${weekOf(key(new Date(S.y, S.m, 1)))}"]`;
    const go = () => { if (S._calNavCancel || S._calTop !== key0) return; const tw = cal.querySelector(tgt); if (tw){ S._calSkip = true; cal.scrollTop += tw.getBoundingClientRect().top - cal.getBoundingClientRect().top; } }; requestAnimationFrame(go); setTimeout(go, 350); setTimeout(go, 1000); }
}

/* ---------- 목록 ---------- */
function itemHTML(e, k){
  const end = evEnd(e); const multi = end !== e.start;
  let sub = multi ? `${md(e.start)}(${WD[wdOf(e.start)]}) – ${md(end)}(${WD[wdOf(end)]}) · ${diff(e.start,end)+1}일` : `${md(e.start)}(${WD[wdOf(e.start)]})`;
  if (e.time) sub += " · " + e.time;
  const P = procOf(e), pk = procKeys(P);
  const kinds = pr(e) !== 0 ? `<span class="wkp wk-tdone"><i></i>타일 시공 지원</span>` : pk.map(x => `<span class="wkp wk-${x}${P[x].by==="out"?" out":""}${P[x].by==="out"&&!P[x].booked&&!P[x].done?" needcall":""}${P[x].done?" done":""}"><i></i>${P[x].done?"✓ ":""}${KIND_LABEL[x]}${progOf(x,P[x]).txt?" "+progOf(x,P[x]).txt:""}${P[x].by==="out"?(P[x].booked||P[x].done?" · 외주":" · 외주 ☎ 연락 전"):""}</span>`).join("")
    + (pk.length ? `<span class="wkcnt">완료 ${pk.filter(x=>P[x].done).length}/${pk.length}</span>` : "");
  let crew = "";
  if (k){
    if ((e.off||[]).includes(k)) crew = `<div class="crewline"><span class="off">쉬는 날</span></div>`;
    else { const names = crewOn(e,k).map(id => S.workers.get(id)?.name).filter(Boolean); const di = e.days?.[k] || {};
      if (names.length || di.time) crew = `<div class="crewline">${di.time?`<b>${esc(di.time)} 집합</b> · `:""}${names.length?esc(names.join(", "))+" · "+names.length+"명":""}</div>`;
      const ex = e.ext?.[k] || []; if (ex.length) crew += `<div class="crewline" style="color:var(--muted)">외부 지원 · ${esc(ex.join(", "))} · ${ex.length}명</div>`;
      if (di.note) crew += `<div class="crewline" style="color:var(--muted)">${esc(di.note)}</div>`;
      const phs = (e.photos||[]).filter(id => e.photoInfo?.[id]?.date === k); if (phs.length){ const cnt = st => phs.filter(id => (e.photoInfo[id].stage||"")===st).length; crew += `<div class="crewline" style="color:var(--muted)">사진 ${phs.length}장 · 시공 전 ${cnt("before")} · 점심 ${cnt("mid")} · 마무리 ${cnt("after")}</div>`; } }
    if (e.addr) crew += `<div class="crewline" style="color:var(--muted)">📍 ${esc(e.addr)}</div><div class="crewline"><span class="maplink" role="link" data-map="${esc(naverSearch(placeQ(e.addr)))}">🚗 네이버지도 열기</span></div>`;
    const pu = planOf(e, P)[k]; if (pu) crew = `<div class="crewline"><b>공정</b> ${esc(pu.map(u => UNIT[u].l + (roomTag(e, k, u) ? `(${roomTag(e, k, u)})` : "") + (unitDone(u,P)?" ✓":"")).join(", "))}</div>` + crew;
    const pl = planOf(e, P); const outs = pk.filter(x => P[x].by==="out" && (kindDays(pl, x).includes(k) || (!kindDays(pl, x).length && P[x].date===k)));
    if (outs.length) crew += `<div class="crewline" style="color:var(--muted)">외주 · ${esc(outs.map(x=>KIND_LABEL[x]+(P[x].vendor?" "+P[x].vendor:"")).join(", "))}</div>`;
  }
  return `<button class="item c-${COLORS.includes(e.color)?e.color:"purple"}" data-ev="${esc(e.id)}"><span class="stripe"></span><span class="tx">
    <div class="t">${e.pending?'<span class="ptag">확인 필요</span> ':""}${esc(e.title||"제목 없음")}</div><div class="s">${clientOf(e)?esc(clientOf(e))+" · ":""}${sub}${(e.photos||[]).length?" · 사진 "+e.photos.length+"장":""}</div>
    ${kinds?`<div class="wkrow">${kinds}</div>`:""}${P.tile && tileSpec(P.tile) ? `<div class="crewline" style="color:var(--muted)">타일 · ${esc(tileSpec(P.tile))}</div>` : ""}${(e.spaces||[]).length ? `<div class="crewline" style="color:var(--muted)">시공 · ${esc(spacesSpec(e))}</div>` : ""}${e.tent ? `<div class="crewline"><span class="ptag">예정</span> 아직 확정 아님</div>` : ""}${crew}${e.memo?`<div class="m">${esc(e.memo)}</div>`:""}</span></button>`;
}
function renderAgenda(){
  const el = $("#agenda"); const q = S.q.trim().toLowerCase();
  let list;
  if (S.pendOnly){
    list = [...S.events.values()].filter(e => e.pending).map(e => ({e, k: e.start}));
  } else if (q){
    list = [...S.events.values()].filter(e => {
      const hay = [e.title, e.memo, e.addr, clientOf(e), ...(e.kinds||[]).map(x=>KIND_LABEL[x]||""), ...Object.values(procOf(e)).map(p=>p.areas ? tileSpec(p) : ""), ...Object.values(e.proc||{}).map(p=>p?.vendor||""),
        ...Object.values(e.crew||{}).flat().map(id=>S.workers.get(id)?.name)].join(" ").toLowerCase();
      return hay.includes(q);
    }).map(e => ({e, k: e.start}));
  } else {
    const first = key(new Date(S.y,S.m,1)), last = key(new Date(S.y,S.m+1,0));
    list = [...S.events.values()].filter(e => e.start <= last && evEnd(e) >= first).map(e => ({e, k: e.start < first ? first : e.start}));
  }
  if (!list.length){
    el.innerHTML = q ? `<div class="empty"><b>찾는 일정이 없어요</b>다른 단어로 검색해 보세요.</div>`
      : `<div class="empty"><b>이 달에 잡힌 일정이 없어요</b>오른쪽 아래 + 버튼으로 현장 일정을 추가하세요.</div>`;
    return;
  }
  const by = new Map(); for (const it of list){ if(!by.has(it.k)) by.set(it.k,[]); by.get(it.k).push(it.e); }
  const tk = todayK(); let html = "";
  for (const k of [...by.keys()].sort()){
    const d = parse(k); const w = d.getDay();
    html += `<div class="ag-day"><div class="ag-date${k===tk?" today":""}${w===0||HOL[k]?" sun":w===6?" sat":""}"><b>${d.getDate()}</b><span>${q?(d.getFullYear()%100)+"."+(d.getMonth()+1)+" ":""}${WD[w]}</span></div><div class="ag-items">${splitHTML(by.get(k), null)}</div></div>`;
  }
  el.innerHTML = html;
}

/* ---------- 하루 보기 ---------- */
function openSheet(k){
  S.sheetOut = false; S.sheetCell = false; S.sheetWarn = false; S.sheetPrep = false; S.sheetQr = false; S.sel = k; if (S.view !== "board") renderCal(); const d = parse(k); const evs = eventsOn(k);
  $("#sheet").innerHTML = `<div class="sh-h"><div><b>${d.getMonth()+1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일</b>${HOL[k]?`<small>${esc(HOL[k])}</small>`:""}</div>
    <div class="row">${S.canWrite?`<button class="btn" id="shAdd">추가</button>`:""}<button class="ib" id="shClose" aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div></div>
    <div class="dsp-seg seg"><button type="button" data-dmode="list" aria-pressed="${S.dayMode!=="dsp"}">일정</button><button type="button" data-dmode="dsp" aria-pressed="${S.dayMode==="dsp"}">배치표</button></div>
    <div class="sh-b">${S.dayMode === "dsp" ? dispatchHTML(k) : evs.length ? splitHTML(evs, k) : `<div class="empty" style="padding:24px">이날은 일정이 없어요</div>`}</div>`;
  $("#sheet").hidden = $("#sheetScrim").hidden = false;
}
function closeSheet(){ $("#sheet").hidden = $("#sheetScrim").hidden = true; S.sheetOut = false; S.sheetCell = false; S.sheetWarn = false; S.sheetPrep = false; S.sheetQr = false; }
function openPrepSheet(mode){
  mode = mode || "t"; S.sheetPrep = mode; S.sheetQr = false; S.sheetWarn = false; S.sheetOut = false; S.sheetCell = false; const list = prepTodo().filter(x => mode === "w" ? x.left <= 7 : x.left > 7);
  $("#sheet").innerHTML = `<div class="sh-h"><div><b>안 적은 정보 · ${mode === "w" ? "1주일 안 시작" : "8~14일 뒤 시작"}</b><small style="color:var(--muted)">우리 현장 · 눌러서 채워 주세요</small></div>
    <button class="ib" id="shClose" aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="sh-b">${list.length ? list.map(({e, m, left}) => `<button class="item c-${COLORS.includes(e.color)?e.color:"purple"}" data-ev="${esc(e.id)}"><span class="stripe"></span><span class="tx">
      <div class="t">${left<=3?`<span class="ptag">${left<=0?"시작함":left+"일 남음"}</span>`:`<span class="ptag dim">${left}일 남음</span>`} ${esc(e.title||"제목 없음")}</div>
      <div class="s">${md(e.start)}(${WD[wdOf(e.start)]}) 시작 · <b style="color:var(--sun)">${esc(m.join(" · "))}</b></div></span></button>`).join("")
      : `<div class="empty" style="padding:24px">준비 안 된 현장이 없어요</div>`}</div>`;
  $("#sheet").hidden = $("#sheetScrim").hidden = false;
}
function openQrSheet(){
  S.sheetQr = true; S.sheetPrep = false; S.sheetWarn = false; S.sheetOut = false; S.sheetCell = false; const list = qreqTodo();
  $("#sheet").innerHTML = `<div class="sh-h"><div><b>견적 보낼 것</b><small style="color:var(--muted)">보내면 일정에서 '보냄'을 눌러 주세요</small></div>
    <button class="ib" id="shClose" aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="sh-b">${list.length ? list.map(({e, q}) => `<button class="item c-${COLORS.includes(e.color)?e.color:"purple"}" data-ev="${esc(e.id)}"><span class="stripe"></span><span class="tx">
      <div class="t">${esc(e.title||"제목 없음")} <small style="color:var(--muted);font-weight:400">${md(e.start)} 시작</small></div>
      <div class="s">${q.map(x => esc(x.t)).join(" · ")}</div></span></button>`).join("") : `<div class="empty" style="padding:24px">보낼 견적이 없어요</div>`}</div>`;
  $("#sheet").hidden = $("#sheetScrim").hidden = false;
}
function openWarnSheet(){
  S.sheetWarn = true; S.sheetOut = false; S.sheetCell = false; S.sheetPrep = false; S.sheetQr = false; const list = issueTodo();
  $("#sheet").innerHTML = `<div class="sh-h"><div><b>공정 확인 필요</b><small style="color:var(--muted)">문제없다고 판단되면 '그대로 진행'을 누르세요</small></div>
    <button class="ib" id="shClose" aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="sh-b">${list.length ? list.map(({e, c}) => `<div class="wcard c-${COLORS.includes(e.color)?e.color:"purple"}">
      <div class="t">${esc(e.title||"제목 없음")} <small>${md(e.start)}${evEnd(e)!==e.start?"–"+md(evEnd(e)):""}</small></div>
      <ul class="wlist">${c.msgs.map((m, i) => `<li><span>${esc(m)}</span>${S.canWrite ? `<button type="button" class="lnk" data-ackone="${esc(e.id)}" data-i="${i}">그대로 진행</button>` : ""}</li>`).join("")}</ul>
      <div class="row"><button class="btn ghost sm" data-ev="${esc(e.id)}">일정 열어서 고치기</button>${S.canWrite && c.msgs.length > 1 ?`<button class="btn sm" data-ack="${esc(e.id)}">전부 그대로 진행</button>`:""}</div></div>`).join("")
      : `<div class="empty" style="padding:24px">확인할 공정이 없어요</div>`}</div>`;
  $("#sheet").hidden = $("#sheetScrim").hidden = false;
}
function openOutSheet(){
  S.sheetOut = true; S.sheetCell = false; S.sheetWarn = false; S.sheetPrep = false; S.sheetQr = false; const ot = outTodo();
  const tag = x => x.level === "urgent" ? `<span class="ptag">🚨 영업일 ${x.biz}일</span>` : x.level === "warn" ? `<span class="ptag soft">영업일 ${x.biz}일</span>` : `<span class="ptag dim">영업일 ${x.biz}일</span>`;
  $("#sheet").innerHTML = `<div class="sh-h"><div><b>외주 일정 잡기</b><small style="color:var(--muted)">🚨 영업일 4일 안 · 주황 7일 안 · 통화로 날짜를 잡으면 일정에서 '외주 일정 잡음'을 눌러 주세요</small></div>
    <button class="ib" id="shClose" aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="sh-b">${ot.length ? ot.map(x => `<button class="item c-${COLORS.includes(x.e.color)?x.e.color:"purple"}" data-ev="${esc(x.e.id)}"><span class="stripe"></span><span class="tx">
      <div class="t">${tag(x)} ${KIND_LABEL[x.k]} 외주 · ${esc(x.e.title||"제목 없음")}</div>
      <div class="s">작업일 ${md(x.need)}(${WD[wdOf(x.need)]}) · ${x.p.vendor?esc(x.p.vendor):"업체 미정"}</div></span></button>`).join("")
      : `<div class="empty" style="padding:24px">연락할 외주가 없어요</div>`}</div>`;
  $("#sheet").hidden = $("#sheetScrim").hidden = false;
}


/* 스크롤 따라 위 제목 달 바꾸고, 끝에 가까워지면 앞뒤 주를 더 붙임 */
let calRaf = 0;
$("#cal").addEventListener("scroll", () => { if (calRaf) return; calRaf = requestAnimationFrame(() => { calRaf = 0; calOnScroll(); }); }, {passive: true});
$("#cal").addEventListener("touchstart", () => { S._calNavCancel = true; }, {passive: true});
$("#cal").addEventListener("wheel", () => { S._calNavCancel = true; }, {passive: true});
function calOnScroll(){
  const cal = $("#cal"); if (!S.calR || cal.offsetParent === null) return;
  const cr = cal.getBoundingClientRect(); let top = null, off = 0;
  for (const w of cal.querySelectorAll(".week")){ const r = w.getBoundingClientRect(); if (r.bottom > cr.top + 60){ top = w; off = r.top - cr.top; break; } }
  if (!top) return;
  const d = parse(addD(top.dataset.wk, 6));
  if (d.getFullYear() !== S.y || d.getMonth() !== S.m){
    S.y = d.getFullYear(); S.m = d.getMonth(); S._calTop = S.y + "-" + S.m;
    $("#mtitle").textContent = `${S.y}년 ${S.m+1}월`;
    cal.querySelectorAll(".day[data-day]").forEach(b => b.classList.toggle("oth", parse(b.dataset.day).getMonth() !== S.m));
  }
  if (typeof CD !== "undefined" && CD.on) return; // 끌어 옮기는 중엔 다시 그리지 않음
  const h = cal.clientHeight, nearEnd = cal.scrollTop + h > cal.scrollHeight - 420 - h, nearTop = cal.scrollTop < h * 0.6;
  if (!nearEnd && !nearTop) return;
  const MAXW = 30, R = S.calR;
  if (nearEnd){ R.n += 6; if (R.n > MAXW){ R.from = addD(R.from, 7 * (R.n - MAXW)); R.n = MAXW; } }
  else { R.from = addD(R.from, -42); R.n += 6; if (R.n > MAXW) R.n = MAXW; }
  S._calAnc = {k: top.dataset.wk, off}; renderCal();
}
