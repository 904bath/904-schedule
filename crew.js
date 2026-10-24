/* 904 캘린더 · 인원 탭 · 인원 편집 창 */
/* ---------- 인원 ---------- */
function renderCrew(){
  const el = $("#crew"); const p = monthPay(S.y,S.m); const ro = !S.canWrite;
  let html = `<div class="stack">
    <div class="sum"><div><small>등록 인원</small><b>${S.workers.size}명</b></div><div><small>${S.m+1}월 904 현장 공수</small><b>${p.mandays}공</b></div></div>
    <div><h3>기본 일당 <small>개인 일당을 비워 두면 이 금액으로 계산해요</small></h3><div class="wg-grid">`;
  for (const g of GROUPS){
    const c = S.cfg.groups[g];
    html += `<label class="g-${g}"><span class="lab"><span class="gd"></span><input id="gl-${g}" data-gl="${g}" value="${esc(c.label)}" aria-label="등급 이름" ${ro?"disabled":""}></span>
      <span class="wgi"><input id="gw-${g}" data-gw="${g}" inputmode="numeric" value="${c.wage?c.wage.toLocaleString("ko-KR"):""}" placeholder="0" ${ro?"disabled":""}><em>원</em></span></label>`;
  }
  html += `</div></div>`;
  if (!ro) html += `<form class="qadd" id="qadd"><input id="qName" placeholder="이름" autocomplete="off" aria-label="이름">
      <select id="qGroup" aria-label="등급">${GROUPS.map(g=>`<option value="${g}">${esc(glabel(g))}</option>`).join("")}</select>
      ${unionLeaders().length?`<select id="qTeam" aria-label="소속"><option value="">우리 팀</option>${unionLeaders().map(l=>`<option value="${esc(l.name)}">연합·${esc(l.name)}</option>`).join("")}</select>`:""}
      <button class="btn" type="submit">추가</button></form>`;
  for (const g of GROUPS){
    const ws = [...S.workers.values()].filter(w => groupOf(w)===g).sort((a,b)=>(a.name||"").localeCompare(b.name||"","ko"));
    html += `<div class="g-${g}"><h3><span class="gd"></span>${esc(glabel(g))} <small>${ws.length}명</small></h3>`;
    html += ws.length ? ws.map(w => {
      const days = p.rows.find(r=>r.id===w.id)?.days.length || 0;
      return `<button class="wrow g-${g}" data-w="${esc(w.id)}"><span class="wn">${esc(w.name||"이름 없음")}</span>
        <span class="ws">${teamOf(w)?`<b style="color:var(--muted)">연합 · ${esc(teamOf(w))}</b> · `:""}${w.auto?'<b style="color:var(--sun)">카톡에서 자동 추가 · 등급 확인</b> · ':""}${OWNERS.includes(w.name) && !teamOf(w) ? "<b>공동사장 · 일당 없음</b>" : w.wage>0?"개인 일당 "+won(w.wage):"기본 일당"}${w.phone?" · "+esc(w.phone):""}${w.addr?" · 🏠 "+esc(w.addr):""}</span>
        <span class="wm">904 ${days}공</span></button>`; }).join("")
      : `<div class="wempty">아직 없어요</div>`;
    html += `</div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
}

/* ---------- 인원 편집 ---------- */
let W = null;
function openWorker(id){
  const w = S.workers.get(id); if (!w) return; W = {...w, _arm:false}; renderWdlg(); $("#dlg").hidden = $("#dlgScrim").hidden = false;
}
function renderWdlg(){
  const ro = !S.canWrite; const dis = ro?"disabled":"";
  const p = monthPay(S.y,S.m).rows.find(r=>r.id===W.id);
  $("#dlg").innerHTML = `<div class="dl-h"><button class="lnk" id="wCancel">닫기</button><b>인원 정보</b>${ro?`<span style="width:40px"></span>`:`<button class="btn" id="wSave" style="height:34px">저장</button>`}</div>
  <div class="dl-b">
    <label class="fld">이름<input id="wName" value="${esc(W.name||"")}" ${dis}></label>
    <label class="fld">등급<select id="wGroup" ${dis}>${GROUPS.map(g=>`<option value="${g}"${groupOf(W)===g?" selected":""}>${esc(glabel(g))} (기본 ${won(S.cfg.groups[g].wage)})</option>`).join("")}</select></label>
    <label class="fld">소속<select id="wTeam" ${dis}><option value="">우리 팀</option>${unionLeaders().map(l=>`<option value="${esc(l.name)}"${teamOf(W)===l.name?" selected":""}>연합 · ${esc(l.name)} 팀</option>`).join("")}</select></label>
    <label class="fld">개인 일당 <span class="hint">비워 두면 등급 기본 일당으로 계산해요</span><span class="wgi"><input id="wWage" inputmode="numeric" value="${W.wage>0?W.wage.toLocaleString("ko-KR"):""}" placeholder="기본 일당" ${dis}><em>원</em></span></label>
    <label class="fld">연락처<input id="wPhone" value="${esc(W.phone||"")}" inputmode="tel" placeholder="010-0000-0000" ${dis}></label>
    <label class="fld">집 주소<input id="wAddr" value="${esc(W.addr||"")}" placeholder="예: 대구 북구 태전동" autocomplete="off" ${dis}></label>
    <div class="hint">${S.m+1}월 904 현장 투입: ${p?p.days.length+"공 ("+p.days.map(md).join(", ")+")":"없음"}</div>
  </div>
  ${ro?"":`<div class="dl-f"><span></span><button class="lnk dg${W._arm?" arm":""}" id="wDel">${W._arm?"한 번 더 누르면 삭제":"명부에서 삭제"}</button></div>`}`;
}
const num = s => Number(String(s).replace(/[^\d]/g,"")) || 0;

