/* 904 캘린더 · 정산 탭 = 장부 (월별 · 현장별 · 수입 · 지출 · 인건비) */
// 장부 기록: DB ledger/{id} = {type:"in"|"out", date, amount, site(일정 id), biz("904"|"동식"|"희태"), cat, vendor, memo, receipt(사진 id), at,
//   payer("" = 공금 · "성욱" 등 = 그 사람이 먼저 냄 → 공금에서 돌려줄 돈), back(돌려줌), backDate}
// 외주비(일정 공정의 금액)와 인건비(배정 인원 × 일당)는 일정에서 자동으로 계산 → 장부에 따로 적지 않음
const BIZ = ["904", "동식", "희태"];
const IN_CATS = ["계약금", "중도금", "잔금", "추가공사", "기타 입금"];
const OUT_CATS = ["자재", "폐기물", "장비·공구", "작업복·안전", "유류·톨비", "식대", "차량", "사무·통신", "기타 경비"];
S.ledger = new Map(); S.payView = "month";
try { const v = localStorage.getItem("payView"); if (["month","site","in","out","labor"].includes(v)) S.payView = v; } catch(_){}
const bizOfEv = e => { const n = evLeader(e)?.name || ""; return BIZ.includes(n) ? n : "904"; };
const monthRange = (y, m) => [key(new Date(y, m, 1)), key(new Date(y, m + 1, 0))];
// 금액은 오늘까지 실제로 한 것만 (앞으로 예정된 배정·외주는 안 넣음)
const doneRange = (y, m) => { const [a, b] = monthRange(y, m), t = todayK(); return [a, b < t ? b : t]; };
const oursEvents = () => [...S.events.values()].filter(e => pr(e) === 0);
const entries = () => [...S.ledger.values()];
const sumAmt = list => list.reduce((s, x) => s + (Number(x.amount) || 0), 0);
const outsOf = e => { const P = procOf(e); return procKeys(P).filter(k => P[k].by === "out").flatMap(k => hasDD(P[k]) ? Object.keys(P[k].dd).sort().map(d => ({k, d, dd: true, ...ddOf(e, P, k, d), e})).filter(o => o.amount || o.paid || !Object.entries(e.byDay?.[o.d] || {}).some(([u, v]) => UNIT[u]?.k === k && v === "ours")) /* 그날 우리가 한 건 빼고 */ : [{k, d: kindDays(planOf(e, P), k)[0] || P[k].date || e.start, amount: Number(P[k].amount) || 0, vendor: P[k].vendor || "", paid: !!P[k].paid, paidDate: P[k].paidDate || "", e}]); };
// 아직 안 준 외주비 (지출해야 할 목록)
const unpaidOuts = () => oursEvents().flatMap(e => outsOf(e).filter(o => !o.paid)).sort((a,b) => a.d.localeCompare(b.d));
function payOutRow(o, showSite){
  return `<div class="payrow lg-pay"><span class="pn">${esc(KIND_LABEL[o.k])} 외주${o.vendor?` · ${esc(o.vendor)}`:""}${showSite?` <small class="mut">${esc(o.e.title||"")}</small>`:""}</span>
    <span class="pt ${o.paid?"pos":"neg"}">${S.canWrite ? `<button type="button" class="lg-amt" data-lgoamt="${esc(o.e.id)}" data-k="${o.k}" data-d="${o.dd ? o.d : ""}">${o.amount ? won(o.amount) : "금액 넣기"}</button>` : o.amount ? won(o.amount) : "금액 없음"}</span>
    <span class="pd">${md(o.d)} 작업 · ${o.paid ? `✓ 지급 완료${o.paidDate?" "+md(o.paidDate):""}` : "아직 안 줌"}${S.canWrite ? ` <button type="button" class="lnk" data-lgpaid="${esc(o.e.id)}" data-k="${o.k}" data-d="${o.dd ? o.d : ""}">${o.paid?"지급 취소":"지급 완료로"}</button>` : ""}</span></div>`;
}

/* 계산 */
function siteMoney(e){
  const L = entries().filter(x => x.site === e.id);
  const got = sumAmt(L.filter(x => x.type === "in")), spent = sumAmt(L.filter(x => x.type === "out"));
  const out = outsOf(e), outT = out.reduce((s, x) => s + x.amount, 0), outPaid = out.filter(o => o.paid).reduce((s, x) => s + x.amount, 0), lab = siteLabor(e), labNow = siteLabor(e, null, todayK());
  const contract = Number(e.contract) || 0, cost = spent + outT + lab.total, costNow = spent + outPaid + labNow.total;
  const outDone = out.filter(o => o.d <= todayK()).reduce((s, x) => s + x.amount, 0), costDone = spent + outDone + labNow.total;
  return {contract, got, due: Math.max(0, contract - got), spent, out, outT, outDone, costDone, outPaid, outDue: outT - outPaid, lab, labNow, cost, costNow,
    profit: (contract || got) - cost, profitNow: got - costNow, ins: L.filter(x => x.type === "in"), outs: L.filter(x => x.type === "out")};
}
function monthMoney(y, m){
  const [a, b] = doneRange(y, m), inM = d => d >= a && d <= b;
  const per = Object.fromEntries(BIZ.map(z => [z, {inc: 0, exp: 0, out: 0, lab: 0}]));
  for (const x of entries()){ if (!inM(x.date || "")) continue; const z = BIZ.includes(x.biz) ? x.biz : "904";
    if (x.type === "in") per[z].inc += Number(x.amount) || 0; else per[z].exp += Number(x.amount) || 0; }
  for (const e of oursEvents()){ const z = bizOfEv(e);
    for (const o of outsOf(e)) if (inM(o.d)) per[z].out += o.amount;
    per[z].lab += siteLabor(e, a, b).total; }
  for (const z of BIZ){ const p = per[z]; p.cost = p.exp + p.out + p.lab; p.net = p.inc - p.cost; }
  return per;
}

// 이 달 904 현장 인건비에 들어간 사람: "지영 3공(아르켓디자인-우방)"
function labWho904(y, m){
  const [a, b] = doneRange(y, m), by = new Map();
  for (const e of oursEvents()){ if (bizOfEv(e) !== "904") continue;
    for (const [k, ids] of Object.entries(e.crew||{})){ if (k < a || k > b || k < e.start || k > evEnd(e) || (e.off||[]).includes(k)) continue;
      for (const id of ids){ const w = S.workers.get(id); if (!w || noWage(e, w)) continue; const n = w.name + (teamOf(w) ? `(연합 ${teamOf(w)})` : "");
        if (!by.has(n)) by.set(n, {d: 0, s: new Set()}); by.get(n).d += movedOn(k, id) ? 0.5 : 1; by.get(n).s.add(e.title || ""); } } }
  return [...by.entries()].map(([n, x]) => `${n} ${x.d}공 · ${[...x.s].join(", ")}`).join(" / ");
}
// 그 사장 현장(동식/희태)에 온 사람별 줄 일당
function bizLabor(y, m, biz){
  const [a, b] = doneRange(y, m), by = new Map();
  for (const e of oursEvents()){ if (bizOfEv(e) !== biz) continue;
    for (const [k, ids] of Object.entries(e.crew||{})){ if (k < a || k > b || k < e.start || k > evEnd(e) || (e.off||[]).includes(k)) continue;
      for (const id of ids){ const w = S.workers.get(id); if (!w || noWage(e, w)) continue; const h = movedOn(k, id) && eventsOn(k).filter(o => crewOn(o, k).includes(id)).length > 1 ? 0.5 : 1;
        if (!by.has(id)) by.set(id, {name: w.name, tag: teamOf(w) ? `연합 · ${teamOf(w)}` : OWNERS.includes(w.name) ? "사장" : glabel(groupOf(w)), wage: wageOf(w), days: 0, total: 0, list: []});
        const r = by.get(id); r.days += h; r.total += wageOf(w) * h; r.list.push([k, `${md(k)} ${e.title||""}${h < 1 ? "(이동)" : ""}`]); } } }
  for (const r of by.values()) r.list = r.list.sort((x, y) => x[0] < y[0] ? -1 : 1).map(x => x[1]);
  return [...by.values()].sort((x, y) => y.total - x.total);
}
// 사장이 먼저 낸 공금 지출 중 아직 안 돌려준 것 (모든 달)
const owedList = () => entries().filter(x => x.type === "out" && x.payer && !x.back).sort((a,b) => (a.date||"").localeCompare(b.date||""));
function owedHTML(){
  const L = owedList(); if (!L.length) return "";
  const by = new Map(); for (const x of L){ if (!by.has(x.payer)) by.set(x.payer, []); by.get(x.payer).push(x); }
  return foldBox("공금에서 돌려줄 돈", won(sumAmt(L)), `${[...by.entries()].map(([n, xs]) => `<details class="bzl"><summary><b>${esc(n)}</b><span>${xs.length}건</span><b>${won(sumAmt(xs))}</b></summary>
    <div>${xs.map(x => `<div class="owe"><span>${md(x.date)} ${esc(x.memo || x.cat || "")}</span><b>${won(x.amount)}</b>${S.canWrite ? `<button type="button" class="lnk" data-lgback="${esc(x.id)}">돌려줌</button>` : ""}</div>`).join("")}
    ${S.canWrite ? `<button type="button" class="btn sm" data-lgbackall="${esc(n)}">${esc(n)}한테 ${won(sumAmt(xs))} 다 돌려줌</button>` : ""}</div></details>`).join("")}`);
}
async function setBack(ids){
  const t = todayK(), data = {back: true, backDate: t};
  for (const id of ids){ const x = S.ledger.get(id); if (x) S.ledger.set(id, {...x, ...data}); } renderPay();
  if (S.db) for (const id of ids) await write(() => S.db.collection("ledger").doc(id).update(data), ids.length > 1 ? "다 돌려준 걸로 표시했어요" : "돌려준 걸로 표시했어요");
}
// 눌렀을 때만 펼치는 묶음: 제목 · 합계 · 상세보기
const foldBox = (title, right, body) => `<details class="bzw"><summary><b>${title}</b><span>${right}</span><em>상세보기</em></summary><div class="bzb">${body}</div></details>`;
/* 화면 */
const PV = [["month","월별"],["site","현장별"],["in","수입"],["out","지출"],["labor","인건비"]];
function renderPay(){
  const el = $("#pay"); const v = S.payView;
  let h = `<div class="stack"><div class="lg-seg seg">${PV.map(([k,l]) => `<button type="button" data-pv="${k}" aria-pressed="${v===k}">${l}</button>`).join("")}</div>`;
  if (v !== "labor") h += `<div class="lg-add">${S.canWrite ? `<button type="button" class="btn" data-lgnew="in">+ 입금</button><button type="button" class="btn ghost" data-lgnew="out">+ 지출·경비</button>` : ""}</div>`;
  if (v === "labor"){ el.innerHTML = h + `</div><div id="laborBox"></div>`; renderLabor($("#laborBox")); return; }
  if (v === "month") h += lgMonthHTML(); else if (v === "site") h += lgSiteHTML(); else h += lgListHTML(v);
  el.innerHTML = h + `</div>`;
}
function lgMonthHTML(){
  const P = monthMoney(S.y, S.m), p9 = P["904"];
  let h = `<div class="lg-hero"><small>${S.m+1}월 904 순이익</small><b class="${p9.net<0?"neg":""}">${won(p9.net)}</b>
    <p class="hint">904 현장만 · 입금 − (지출·경비 + 외주비 + 인건비) · 오늘까지 한 것만</p></div>`;
  const n0 = v => (Math.round(v)||0).toLocaleString("ko-KR");
  h += `<div class="lg-tbl"><div class="lg-tr th"><span>단위: 원</span><span>입금</span><span>지출</span><span>순이익</span></div>
    ${BIZ.map(z => { const p = P[z]; return `<div class="lg-tr"><span><b>${z === "904" ? "904" : z + " 현장"}</b></span><span>${n0(p.inc)}</span><span>${n0(p.cost)}</span><span class="${p.net<0?"neg":"pos"}">${n0(p.net)}</span></div>`; }).join("")}</div>`;
  for (const z of ["동식", "희태"]){ const L = bizLabor(S.y, S.m, z); if (!L.length) continue;
    h += foldBox(`${z} 현장 · 줄 일당`, won(L.reduce((s,x)=>s+x.total,0)), L.map(x => `<details class="bzl"><summary><b>${esc(x.name)}</b><span>${x.days}공</span><b>${won(x.total)}</b></summary><div class="mut">${x.days}공 × ${won(x.wage)}<br>${x.list.map(esc).join("<br>")}</div></details>`).join("")); }
  h += foldBox("904 지출 내역", won(p9.cost), `<div class="payrow"><span class="pn">지출·경비 (직접 적은 것)</span><span class="pt">${won(p9.exp)}</span></div>
    <div class="payrow"><span class="pn">외주비 <small class="mut">일정 공정 금액</small></span><span class="pt">${won(p9.out)}</span></div>
    <div class="payrow"><span class="pn">인건비 <small class="mut">${esc(labWho904(S.y, S.m) || "없음")}</small></span><span class="pt">${won(p9.lab)}</span></div>`);
  h += owedHTML();
  const up = unpaidOuts();
  if (up.length) h += foldBox(`지출해야 할 외주비 <small class="mut">${up.length}건</small>`, won(up.reduce((s,o)=>s+o.amount,0)), `${up.some(o=>!o.amount)?`<p class="hint">금액 없는 것 ${up.filter(o=>!o.amount).length}건 있어요</p>`:""}${up.map(o => payOutRow(o, true)).join("")}`);
  const dueAll = oursEvents().map(e => ({e, m: siteMoney(e)})).filter(x => x.m.due > 0).sort((a,b) => a.e.start.localeCompare(b.e.start));
  if (dueAll.length) h += foldBox(`받을 돈 (미수금) <small class="mut">${dueAll.length}곳</small>`, won(dueAll.reduce((s,x)=>s+x.m.due,0)), dueAll.map(x => `<button type="button" class="payrow" data-lgsite="${esc(x.e.id)}"><span class="pn">${esc(x.e.title||"")} <small class="mut">${bizOfEv(x.e)}</small></span><span class="pt neg">${won(x.m.due)}</span><span class="pd">공사금액 ${won(x.m.contract)} · 받은 돈 ${won(x.m.got)}</span></button>`).join(""));
  const [a, b] = monthRange(S.y, S.m); const L = entries().filter(x => x.date >= a && x.date <= b).sort((x,y) => y.date.localeCompare(x.date));
  h += foldBox(`${S.m+1}월 장부 <small class="mut">${L.length}건</small>`, "", L.length ? L.map(lgRowHTML).join("") : `<div class="wempty">아직 적은 게 없어요. 위 + 버튼으로 입금·지출을 적어 주세요</div>`);
  return h;
}
function lgRowHTML(x){
  const e = x.site ? S.events.get(x.site) : null;
  return `<button type="button" class="payrow lg-row" data-lg="${esc(x.id)}"><span class="pn">${x.type==="in"?"⬇":"⬆"} ${esc(x.cat||"")}${x.vendor?` · ${esc(x.vendor)}`:""} ${x.receipt?"🧾":""}</span>
    <span class="pt ${x.type==="in"?"pos":""}">${x.type==="in"?"+":"−"}${won(x.amount)}</span>
    <span class="pd">${md(x.date)} · ${e ? esc(e.title||"") : `${esc(x.biz||"904")} 공통`}${x.memo?` · ${esc(x.memo)}`:""}${x.payer ? ` · <b class="${x.back?"pos":"neg"}">${esc(x.payer)}가 냄${x.back ? " · 돌려줌" : " · 돌려줄 돈"}</b>` : ""}</span></button>`;
}
function lgListHTML(type){
  const [a, b] = monthRange(S.y, S.m); const L = entries().filter(x => x.type === type && x.date >= a && x.date <= b).sort((x,y) => y.date.localeCompare(x.date));
  const by = {}; L.forEach(x => by[x.cat||"기타"] = (by[x.cat||"기타"]||0) + (Number(x.amount)||0));
  let h = `<div class="sum"><div><small>${S.m+1}월 ${type==="in"?"입금":"지출·경비"}</small><b>${won(sumAmt(L))}</b></div><div><small>건수</small><b>${L.length}건</b></div></div>`;
  if (Object.keys(by).length) h += `<div class="lg-cats">${Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([c,v]) => `<span>${esc(c)} <b>${won(v)}</b></span>`).join("")}</div>`;
  if (type === "out"){ const up = unpaidOuts(); if (up.length) h += foldBox(`지출해야 할 외주비 <small class="mut">${up.length}건</small>`, won(up.reduce((s,o)=>s+o.amount,0)), up.map(o => payOutRow(o, true)).join("")); }
  if (type === "out") h += `<p class="hint">외주비와 인건비는 일정에서 자동으로 계산돼서 여기엔 안 적어도 돼요 (월별·현장별에 들어가요)</p>`;
  return h + (L.length ? L.map(lgRowHTML).join("") : `<div class="wempty">이 달에 적은 ${type==="in"?"입금":"지출"}이 없어요</div>`);
}
function lgSiteHTML(){
  const [a, b] = monthRange(S.y, S.m);
  const list = oursEvents().filter(e => (e.start <= b && evEnd(e) >= a) || siteMoney(e).due > 0).sort((x,y) => x.start.localeCompare(y.start));
  if (!list.length) return `<div class="wempty">${S.m+1}월 우리 현장이 없어요</div>`;
  const card = e => { const m = siteMoney(e);
    return `<details class="lg-sitef"><summary><b>${esc(e.title||"")}</b><small class="mut">${md(e.start)}${evEnd(e)!==e.start?"–"+md(evEnd(e)):""}</small><span>${m.due ? `<em class="neg">미수 ${won(m.due)}</em>` : `지출 ${won(m.costDone)}`}</span></summary><section class="lg-site c-${COLORS.includes(e.color)?e.color:"purple"}">
      <div class="lg-kv"><span>공사금액</span><button type="button" class="lg-amt" data-lgcon="${esc(e.id)}" ${S.canWrite?"":"disabled"}>${m.contract ? won(m.contract) : "입력하기"}</button></div>
      <div class="lg-kv"><span>받은 돈</span><b class="pos">${won(m.got)}</b>${m.due ? `<span class="neg lg-due">미수 ${won(m.due)}</span>` : m.contract ? `<span class="pos lg-due">다 받음</span>` : ""}</div>
      <div class="lg-kv"><span>지출</span><b>${won(m.costDone)}</b><span class="mut lg-due">오늘까지 · 경비 ${won(m.spent)} · 외주 ${won(m.outDone)} · 인건비 ${won(m.labNow.total)}${m.labNow.days?` (${m.labNow.days}공)`:""}</span></div>
      ${m.cost > m.costDone ? `<div class="lg-kv"><span>예정</span><b class="mut">${won(m.cost - m.costDone)}</b><span class="mut lg-due">앞으로 배정·외주 (아직 안 함 · 금액엔 안 들어감)</span></div>` : ""}
      ${m.outDue ? `<div class="lg-kv"><span>줄 외주비</span><b class="neg">${won(m.outDue)}</b><span class="mut lg-due">아직 안 준 돈</span></div>` : ""}
      <div class="lg-kv"><span>예상 수익</span><b class="${m.profit<0?"neg":"pos"}">${won(m.profit)}</b><span class="mut lg-due">${m.contract ? "공사금액 다 받고 다 줬을 때" : "공사금액을 넣으면 정확해져요"}</span></div>
      <div class="lg-kv"><span>지금까지</span><b class="${m.profitNow<0?"neg":"pos"}">${won(m.profitNow)}</b><span class="mut lg-due">받은 돈 − 실제로 나간 돈 (준 외주비·경비·오늘까지 인건비)</span></div>
      ${m.out.length ? `<details class="lg-outs"><summary>외주 ${m.out.length}건 · 줌 ${m.out.filter(o=>o.paid).length} · 안 줌 ${m.out.filter(o=>!o.paid).length}</summary>${m.out.map(o => payOutRow(o, false)).join("")}</details>` : ""}
      ${m.out.some(o => !o.amount) ? `<p class="hint">금액 없는 외주: ${esc(m.out.filter(o=>!o.amount).map(o=>KIND_LABEL[o.k]).join(", "))} · 일정에서 넣어 주세요</p>` : ""}
      ${[...m.ins, ...m.outs].sort((x,y)=>y.date.localeCompare(x.date)).map(lgRowHTML).join("")}
      ${S.canWrite ? `<div class="row"><button type="button" class="btn sm" data-lgnew="in" data-lgfor="${esc(e.id)}">+ 입금</button><button type="button" class="btn ghost sm" data-lgnew="out" data-lgfor="${esc(e.id)}">+ 지출</button><button type="button" class="lnk" data-ev="${esc(e.id)}">일정 열기</button></div>` : ""}
    </section></details>`; };
  return `<p class="hint">이 달 현장과 아직 덜 받은 현장 · 누르면 현장별 돈이 나와요</p>` + BIZ.map(z => { const L = list.filter(e => bizOfEv(e) === z); if (!L.length) return "";
    const cost = L.reduce((s, e) => s + siteMoney(e).costDone, 0);
    return foldBox(`${z === "904" ? "904 현장" : z + " 현장"} <small class="mut">${L.length}곳</small>`, `지출 ${won(cost)}`, L.map(card).join("")); }).join("");
}

/* 입력 창 */
let LG = null;
function siteOptions(sel){
  const tk = todayK(); const list = oursEvents().filter(e => e.id === sel || (evEnd(e) >= addD(tk, -120) && e.start <= addD(tk, 60))).sort((a,b) => b.start.localeCompare(a.start));
  return `<option value="">현장 없음 (공통 경비)</option>` + list.map(e => `<option value="${esc(e.id)}"${e.id===sel?" selected":""}>${esc(e.title||"")} · ${md(e.start)}</option>`).join("");
}
function openLedger(x){
  LG = {id: x.id || "", type: x.type || "out", date: x.date || todayK(), amount: Number(x.amount) || 0, site: x.site || "", biz: x.biz || "", cat: x.cat || "", vendor: x.vendor || "", memo: x.memo || "", receipt: x.receipt || "", payer: x.payer || "", back: !!x.back, backDate: x.backDate || "", busy: false, msg: "", arm: false};
  if (!LG.cat) LG.cat = LG.type === "in" ? "잔금" : "자재";
  renderLg(); $("#dlg").hidden = $("#dlgScrim").hidden = false;
}
function renderLg(){
  const x = LG, cats = x.type === "in" ? IN_CATS : OUT_CATS, ro = !S.canWrite ? "disabled" : "";
  const e = x.site ? S.events.get(x.site) : null;
  $("#dlg").innerHTML = `<div class="dl-h"><button class="lnk" id="lgCancel">닫기</button><b>${x.id ? "장부 고치기" : x.type === "in" ? "입금 적기" : "지출·경비 적기"}</b>${ro ? `<span style="width:40px"></span>` : `<button class="btn" id="lgSave" style="height:34px">저장</button>`}</div>
  <div class="dl-b">
    <div class="seg big lg-type"><button type="button" data-lgtype="in" aria-pressed="${x.type==="in"}" ${ro}>입금</button><button type="button" data-lgtype="out" aria-pressed="${x.type==="out"}" ${ro}>지출·경비</button></div>
    ${x.type === "out" ? `<div class="lg-rc">${x.receipt ? `<img src="/_blob/${esc(x.receipt)}" alt="영수증">` : ""}
      <label class="btn ghost lg-file${S.assets ? "" : " off"}">🧾 영수증 사진${x.receipt ? " 바꾸기" : " 올리기"}<input type="file" id="lgFile" accept="image/*" ${S.assets && !ro ? "" : "disabled"} hidden></label>
      <span class="hint" id="lgMsg">${esc(x.msg || (S.assets ? "사진을 올리면 날짜·금액·가게를 채워요. 꼭 확인해 주세요" : "이 화면에서는 사진을 올릴 수 없어요"))}</span></div>` : ""}
    <label class="fld">금액<span class="wgi"><input id="lgAmt" inputmode="numeric" value="${x.amount ? x.amount.toLocaleString("ko-KR") : ""}" placeholder="0" ${ro}><em>원</em></span></label>
    <label class="fld">날짜<input type="date" id="lgDate" value="${esc(x.date)}" ${ro}></label>
    <div class="fld">항목<div class="row">${cats.map(c => `<button type="button" class="opt" data-lgcat="${esc(c)}" aria-pressed="${x.cat===c}" ${ro}>${esc(c)}</button>`).join("")}</div></div>
    <label class="fld">현장<select id="lgSite" ${ro}>${siteOptions(x.site)}</select></label>
    ${!e ? `<div class="fld">어느 쪽 돈인가요<div class="row">${BIZ.map(z => `<button type="button" class="opt" data-lgbiz="${z}" aria-pressed="${(x.biz||"904")===z}" ${ro}>${z === "904" ? "904 (공동)" : z}</button>`).join("")}</div></div>` : `<p class="hint">${esc(bizOfEv(e))} 현장 돈으로 들어가요</p>`}
    ${x.type === "out" ? `<div class="fld">누가 냈나요<div class="row">${["", ...OWNERS].map(n => `<button type="button" class="opt" data-lgpayer="${n}" aria-pressed="${x.payer===n}" ${ro}>${n || "공금"}</button>`).join("")}</div>
      ${x.payer ? `<button type="button" class="opt" id="lgBack" aria-pressed="${x.back}" ${ro}>${x.back ? `✓ ${esc(x.payer)}한테 돌려줌` : `아직 안 돌려줌 · 누르면 돌려준 걸로`}</button>` : `<span class="hint">사장 중 한 명이 먼저 냈으면 이름을 골라 주세요. 공금에서 돌려줄 돈으로 잡혀요</span>`}</div>` : ""}
    <label class="fld">${x.type === "in" ? "보낸 사람·업체" : "가게·업체"}<input id="lgVendor" value="${esc(x.vendor)}" autocomplete="off" ${ro}></label>
    <label class="fld">메모<input id="lgMemo" value="${esc(x.memo)}" autocomplete="off" placeholder="${x.type === "in" ? "예: 계좌이체" : "예: 타일 본드 10포"}" ${ro}></label>
  </div>
  ${x.id && !ro ? `<div class="dl-f"><span></span><button class="lnk dg${x.arm?" arm":""}" id="lgDel">${x.arm ? "한 번 더 누르면 삭제" : "장부에서 삭제"}</button></div>` : ""}`;
}
function readLg(){ if (!LG || !$("#lgAmt")) return; LG.amount = num($("#lgAmt").value); LG.date = $("#lgDate").value || LG.date; LG.site = $("#lgSite").value; LG.vendor = $("#lgVendor").value.trim(); LG.memo = $("#lgMemo").value.trim(); }
function closeLg(){ LG = null; $("#dlg").hidden = $("#dlgScrim").hidden = true; }
async function saveLg(){
  readLg(); const x = LG; if (!x.amount){ toast("금액을 넣어 주세요"); return; }
  const e = x.site ? S.events.get(x.site) : null;
  const data = {type: x.type, date: x.date, amount: x.amount, site: x.site, biz: e ? bizOfEv(e) : (x.biz || "904"), cat: x.cat, vendor: x.vendor, memo: x.memo, receipt: x.receipt, at: new Date().toISOString()};
  if (x.type === "out" && x.payer){ data.payer = x.payer; data.back = x.back; data.backDate = x.back ? (x.backDate || todayK()) : ""; } else { data.payer = ""; data.back = false; data.backDate = ""; }
  const id = x.id || newId("ledger");
  const prev = S.ledger.get(id); S.ledger.set(id, {...data, id}); // 바로 반영
  if (!S.db){ closeLg(); renderAll(); return; }
  if (await write(() => S.db.collection("ledger").doc(id).set(data), "장부에 적었어요")){ closeLg(); renderAll(); }
  else { if (prev) S.ledger.set(id, prev); else S.ledger.delete(id); }
}
async function editContract(id){
  const e = S.events.get(id); if (!e || !S.canWrite) return;
  $("#dlg").innerHTML = `<div class="dl-h"><button class="lnk" id="lgCancel">닫기</button><b>공사금액</b><button class="btn" id="conSave" data-id="${esc(id)}" style="height:34px">저장</button></div>
    <div class="dl-b"><p class="hint">${esc(e.title||"")} · 이 현장에서 받기로 한 전체 금액 (부가세 포함 여부는 메모로)</p>
    <label class="fld">공사금액<span class="wgi"><input id="conAmt" inputmode="numeric" value="${e.contract ? Number(e.contract).toLocaleString("ko-KR") : ""}" placeholder="0"><em>원</em></span></label>
    <label class="fld">메모<input id="conMemo" value="${esc(e.contractMemo||"")}" placeholder="예: 부가세 별도" autocomplete="off"></label></div>`;
  LG = {contract: id}; $("#dlg").hidden = $("#dlgScrim").hidden = false; setTimeout(() => $("#conAmt")?.focus(), 50);
}

/* 영수증 읽기 */
async function shrink(file){
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const sc = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
  c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src); return await new Promise(r => c.toBlob(r, "image/jpeg", 0.85));
}
async function onReceipt(file){
  if (!file || !LG) return; readLg(); LG.busy = true; LG.msg = "사진 올리는 중…"; renderLg();
  try {
    const blob = await shrink(file);
    if (S.assets){ const a = await S.assets.upload(blob); LG.receipt = a.id; }
    let canRead = false; try { canRead = !!S.sample && !!(await S.sample.limits?.())?.images; } catch(_){}
    if (canRead){
      LG.msg = "영수증 읽는 중…"; renderLg();
      const r = await S.sample.json(`이 영수증 사진에서 아래를 읽어 JSON만 답하세요. 모르면 빈 값.
{"date":"YYYY-MM-DD","amount":합계금액(숫자, 원),"vendor":"가게 이름","cat":"${OUT_CATS.join("|")} 중 하나","memo":"산 물건 짧게(20자 안)"}
인테리어·타일 시공 회사 경비예요. 주유소·톨게이트=유류·톨비, 식당·편의점 식사=식대, 철물·타일·본드·시멘트=자재, 공구·장비 대여=장비·공구.`, {images: [blob], modelTier: "default"});
      if (LG){ const a = Math.round(Number(String(r?.amount ?? "").replace(/[^\d.]/g, ""))); if (a > 0) LG.amount = a;
        if (/^\d{4}-\d{2}-\d{2}$/.test(r?.date || "")) LG.date = r.date; if (r?.vendor) LG.vendor = String(r.vendor).slice(0, 40);
        if (OUT_CATS.includes(r?.cat)) LG.cat = r.cat; if (r?.memo && !LG.memo) LG.memo = String(r.memo).slice(0, 40);
        LG.msg = "읽은 내용을 확인하고 저장해 주세요"; }
    } else if (LG) LG.msg = "사진은 붙였어요. 금액은 직접 넣어 주세요";
  } catch(e){ if (LG) LG.msg = e?.code === "not_granted" ? "Claude 사용을 허용하면 영수증을 자동으로 읽어요" : "영수증을 읽지 못했어요. 직접 넣어 주세요"; }
  if (LG){ LG.busy = false; renderLg(); }
}

/* 이벤트 */
document.addEventListener("click", async ev => {
  const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.pv){ S.payView = t.dataset.pv; try { localStorage.setItem("payView", S.payView); } catch(_){} renderPay(); return; }
  if (t.dataset.lgnew){ openLedger({type: t.dataset.lgnew, site: t.dataset.lgfor || ""}); return; }
  if (t.dataset.lg){ const x = S.ledger.get(t.dataset.lg); if (x) openLedger(x); return; }
  if (t.dataset.lgback){ await setBack([t.dataset.lgback]); return; }
  if (t.dataset.lgbackall){ await setBack(owedList().filter(x => x.payer === t.dataset.lgbackall).map(x => x.id)); return; }
  if (t.dataset.lgsite){ S.payView = "site"; renderPay(); return; }
  if (t.dataset.lgcon){ editContract(t.dataset.lgcon); return; }
  if (t.dataset.lgoamt){ const e = S.events.get(t.dataset.lgoamt), k = t.dataset.k, d = t.dataset.d || "", P0 = e && procOf(e); if (!P0?.[k]) return; const p = d ? ddOf(e, P0, k, d) : P0[k];
    $("#dlg").innerHTML = `<div class="dl-h"><button class="lnk" id="lgCancel">닫기</button><b>외주비</b><button class="btn" id="oaSave" data-id="${esc(e.id)}" data-k="${k}" data-d="${d}" style="height:34px">저장</button></div>
      <div class="dl-b"><p class="hint">${esc(e.title||"")} · ${esc(KIND_LABEL[k])} 외주${d ? " · " + md(d) + " 작업" : ""}</p>
      <label class="fld">외주 업체<input id="oaV" value="${esc(p.vendor)}" autocomplete="off"></label>
      <label class="fld">금액<span class="wgi"><input id="conAmt" inputmode="numeric" value="${p.amount ? p.amount.toLocaleString("ko-KR") : ""}" placeholder="0"><em>원</em></span></label>
      <button type="button" class="opt" id="oaPaid" aria-pressed="${p.paid}">${p.paid ? "✓ 지급 완료" : "지급 완료로 표시"}</button></div>`;
    LG = {oa: true, paid: p.paid}; $("#dlg").hidden = $("#dlgScrim").hidden = false; return; }
  if (t.dataset.lgpaid && S.canWrite){ const e = S.events.get(t.dataset.lgpaid); if (!e) return; const P = procOf(e), p = P[t.dataset.k]; if (!p) return;
    const d = t.dataset.d || "", cur = d ? ddOf(e, P, t.dataset.k, d).paid : p.paid; if (d) setDD(e, P, t.dataset.k, d, {paid: !cur, paidDate: !cur ? todayK() : ""}); else { p.paid = !p.paid; p.paidDate = p.paid ? todayK() : ""; } const data = {proc: P, updatedAt: new Date().toISOString()};
    S.events.set(e.id, {...e, ...data}); renderPay();
    if (S.db) await write(() => S.db.collection("events").doc(e.id).update(data), (d ? !cur : p.paid) ? "지급 완료로 표시했어요" : "지급을 취소했어요"); return; }
  if (!LG) return;
  if (t.id === "lgCancel"){ closeLg(); return; }
  if (t.id === "oaPaid"){ LG.paid = !LG.paid; t.setAttribute("aria-pressed", LG.paid); t.textContent = LG.paid ? "✓ 지급 완료" : "지급 완료로 표시"; return; }
  if (t.id === "oaSave"){ const e = S.events.get(t.dataset.id); if (!e) return; const P = procOf(e), p = P[t.dataset.k]; if (!p) return;
    const d = t.dataset.d || "", cur = d ? ddOf(e, P, t.dataset.k, d) : p, patch = {amount: num($("#conAmt").value), vendor: $("#oaV").value.trim()}; if (!!cur.paid !== LG.paid){ patch.paid = LG.paid; patch.paidDate = LG.paid ? todayK() : ""; }
    if (d) setDD(e, P, t.dataset.k, d, patch); else Object.assign(p, patch);
    const data = {proc: P, updatedAt: new Date().toISOString()}; S.events.set(e.id, {...e, ...data}); closeLg(); renderAll();
    if (S.db) await write(() => S.db.collection("events").doc(e.id).update(data), "외주비를 넣었어요"); return; }
  if (t.id === "conSave"){ const id = t.dataset.id, v = num($("#conAmt").value), memo = $("#conMemo").value.trim();
    const e = S.events.get(id); if (e) S.events.set(id, {...e, contract: v, contractMemo: memo}); closeLg(); renderAll();
    if (S.db) await write(() => S.db.collection("events").doc(id).update({contract: v, contractMemo: memo}), "공사금액을 넣었어요"); return; }
  if (t.dataset.lgtype){ readLg(); LG.type = t.dataset.lgtype; LG.cat = LG.type === "in" ? "잔금" : "자재"; renderLg(); return; }
  if (t.dataset.lgcat){ readLg(); LG.cat = t.dataset.lgcat; renderLg(); return; }
  if (t.dataset.lgpayer !== undefined){ readLg(); LG.payer = t.dataset.lgpayer; if (!LG.payer) LG.back = false; renderLg(); return; }
  if (t.id === "lgBack"){ readLg(); LG.back = !LG.back; LG.backDate = LG.back ? todayK() : ""; renderLg(); return; }
  if (t.dataset.lgbiz){ readLg(); LG.biz = t.dataset.lgbiz; renderLg(); return; }
  if (t.id === "lgSave"){ await saveLg(); return; }
  if (t.id === "lgDel"){ if (!LG.arm){ LG.arm = true; readLg(); renderLg(); return; }
    const id = LG.id; closeLg(); S.ledger.delete(id); renderAll(); if (S.db) await write(() => S.db.collection("ledger").doc(id).delete(), "삭제했어요"); return; }
});
document.addEventListener("change", ev => {
  if (ev.target.id === "lgFile" && ev.target.files?.[0]) onReceipt(ev.target.files[0]);
  if (ev.target.id === "lgSite" && LG){ readLg(); renderLg(); }
});
document.addEventListener("input", ev => { if (ev.target.id === "lgAmt" || ev.target.id === "conAmt"){ const v = num(ev.target.value); ev.target.value = v ? v.toLocaleString("ko-KR") : ""; } });
$("#dlgScrim").addEventListener("click", () => { LG = null; });
(async () => { let db = null; try { db = await window.claude?.use?.("db"); } catch(_){}
  if (!db) return;
  db.collection("ledger").onSnapshot(snap => { S.ledger = new Map(snap.docs.map(d => [d.id, {...d.data(), id: d.id}])); if (S.tab === "pay") renderPay(); }, () => {});
})();
