/* 904 캘린더 · 공정표 (현장 × 공정 한눈에) */
const SHORT = {prot:"보양",demo:"철거",plumb:"설비",wp:"방수",tile:"타일",sani:"도기",dome:"돔",elec:"전기",sil:"실리콘",etc:"기타"};
const BASECOLS = ["prot","demo","plumb","wp","tile","sani","dome"];
function boardRows(){
  const first = key(new Date(S.y,S.m,1)), last = key(new Date(S.y,S.m+1,0));
  return [...S.events.values()].filter(e => e.start <= last && evEnd(e) >= first && pr(e) === 0)
    .sort((a,b) => a.start.localeCompare(b.start) || (a.title||"").localeCompare(b.title||"","ko"));
}
function cellOf(k, p){
  if (!p) return {c:"none", t:""};
  if (p.done) return {c:"done", t:"✓"};
  const g = progOf(k, p);
  if (p.by === "out") return p.booked ? {c:"out"+(g.half?" half":""), t:g.txt||"외주"} : {c:"call", t:"☎"};
  return {c:"ours"+(g.half?" half":""), t:g.txt||"우리"};
}
function renderBoard(){
  const el = $("#board"); const rows = boardRows(); const tk = todayK();
  const used = new Set(); rows.forEach(e => procKeys(procOf(e)).forEach(k => used.add(k)));
  const cols = KINDS.map(([k]) => k).filter(k => BASECOLS.includes(k) || used.has(k));
  let h = `<div class="bd-top"><div class="bd-legend"><span><i class="bdl ours"></i>우리</span><span><i class="bdl out"></i>외주(잡음)</span><span><i class="bdl call">☎</i>외주 연락 전</span><span><i class="bdl done">✓</i>완료</span></div></div>`;
  if (!rows.length){ el.innerHTML = h + `<div class="empty"><b>${S.m+1}월 우리 현장이 없어요</b>연합 일은 타일 지원만 가서 공정표에 안 나와요.</div>`; return; }
  h += `<div class="bd-wrap"><table class="bd"><thead><tr><th class="bd-site">현장</th>${cols.map(k => `<th class="wk-${k}"><i></i>${SHORT[k]}</th>`).join("")}</tr></thead><tbody>`;
  for (const e of rows){
    const P = procOf(e); const ks = procKeys(P); const nd = ks.filter(k => P[k].done).length; const end = evEnd(e);
    const live = e.start <= tk && end >= tk;
    h += `<tr class="${end < tk ? "past" : ""}"><th class="bd-site c-${COLORS.includes(e.color)?e.color:"purple"}"><button data-ev="${esc(e.id)}"><b>${esc(e.title||"제목 없음")}</b><small>${md(e.start)}${end!==e.start?"–"+md(end):""}${live?" · 진행 중":""}${ks.length?` · 완료 ${nd}/${ks.length}`:" · 공정 미정"}</small></button></th>`;
    for (const k of cols){ const c = cellOf(k, P[k]); h += `<td><button class="bc ${c.c} wk-${k}" data-bc="${esc(e.id)}" data-k="${k}" aria-label="${esc(e.title||"")} ${KIND_LABEL[k]}">${c.t}</button></td>`; }
    h += `</tr>`;
  }
  h += `</tbody></table></div><p class="hint" style="margin-top:8px">칸을 누르면 안 함·우리·외주·완료를 바로 바꿀 수 있어요. 현장 이름을 누르면 일정이 열려요.</p>`;
  el.innerHTML = h;
}
let BC = null; // 공정표에서 누른 칸
function openCell(id, k){
  const e = S.events.get(id); if (!e) return; BC = {id, k}; S.sheetCell = true; S.sheetOut = false; S.sheetWarn = false; S.sheetPrep = false; S.sheetQr = false;
  const p = procOf(e)[k]; const dis = S.canWrite ? "" : "disabled"; const st = !p ? "none" : p.by;
  $("#sheet").innerHTML = `<div class="sh-h"><div><b>${KIND_LABEL[k]}</b><small style="color:var(--muted)">${esc(e.title||"")} · ${md(e.start)}${evEnd(e)!==e.start?"–"+md(evEnd(e)):""}</small></div>
    <button class="ib" id="shClose" aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="sh-b bc-sheet">
      <div class="seg big">${[["none","안 함"],["ours","우리"],["out","외주"]].map(([v,l]) => `<button type="button" data-cby="${v}" aria-pressed="${st===v}" ${dis}>${l}</button>`).join("")}</div>
      ${p ? `<button type="button" class="pdone big" data-cdone="1" aria-pressed="${p.done}" ${dis}>${p.done?"✓ 완료됨":k==="tile"?"메지 완료로 표시":"완료로 표시"}</button>${true?`<span class="hint">날짜${k==="wp"?"·액방·도막":k==="tile"?"·공간·크기·방법·메지 종류":""}는 '일정 전체 열기'에서 정해요</span>`:""}` : ""}
      ${p && p.by === "out" ? `<button type="button" class="pbk" data-cbk="1" aria-pressed="${p.booked}" ${dis}>${p.booked?"✓ 외주 일정 잡음":"☎ 아직 연락 전 · 통화로 잡았으면 누르세요"}</button>
        <div class="pout"><input id="cV" value="${esc(p.vendor)}" placeholder="외주 업체" aria-label="외주 업체" ${dis}><span class="wgi"><input id="cA" inputmode="numeric" value="${p.amount?p.amount.toLocaleString("ko-KR"):""}" placeholder="금액" aria-label="외주 금액" ${dis}><em>원</em></span></div>` : ""}
      <button type="button" class="lnk" data-ev="${esc(id)}" style="justify-self:start">일정 전체 열기</button>
    </div>`;
  $("#sheet").hidden = $("#sheetScrim").hidden = false;
}
async function saveCell(fn){
  if (!BC || !S.canWrite) return; const e = S.events.get(BC.id); if (!e) return;
  const P = procOf(e); fn(P, BC.k);
  const data = {proc: P, kinds: procKeys(P), updatedAt: new Date().toISOString()};
  S.events.set(e.id, {...e, ...data}); renderAll(); // 바로 반영
  if (S.db) await write(() => S.db.collection("events").doc(e.id).update(data));
}
