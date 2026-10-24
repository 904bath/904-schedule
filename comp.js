/* 904 캘린더 · 업체 탭 */
/* ---------- 업체 ---------- */
function renderComp(){
  const el = $("#comp"); const ro = !S.canWrite; const dis = ro ? "disabled" : "";
  const counts = new Map(), un = new Map();
  for (const e of S.events.values()){
    const c = companyOf(e.title);
    if (c) counts.set(c.k, (counts.get(c.k)||0) + 1);
    else { const nm = (e.title||"").trim(); const k = norm(nm); if (!k || nm === "제목 없음") continue; if (!un.has(k)) un.set(k, {name: nm, n: 0}); un.get(k).n++; }
  }
  const L = S.comp.leaders;
  const lopts = sel => L.map(l => `<option value="${esc(l.name)}"${l.name===sel?" selected":""}>${esc(l.name)}</option>`).join("");
  let h = `<div class="stack"><p class="cintro">업체마다 담당 사장을 정해 두면, 그 업체 일정은 담당 사장의 색으로 자동으로 바뀌어요. 카톡에서 가져오는 일정에도 같은 기준이 적용돼요.</p>`;
  // 담당 사장
  h += `<div><h3>담당 사장과 색</h3><div class="lrow">${L.map((l,i)=>`<span class="lchip c-${l.color}"><i></i>${esc(l.name)}
    <select data-lc="${i}" aria-label="${esc(l.name)} 색" ${dis}>${COLORS.map(c=>`<option value="${c}"${c===l.color?" selected":""}>${COLOR_KO[c]}</option>`).join("")}</select>
    <button class="otag${l.ours?" on":""}" data-lours="${i}" aria-pressed="${!!l.ours}" ${dis}>${l.ours?"우리 일":"연합"}</button>
    ${ro?"":`<button class="x" data-ldel="${i}" aria-label="${esc(l.name)} 빼기">×</button>`}</span>`).join("")}</div>
    <p class="cintro" style="margin-top:8px">'우리 일'로 표시된 사장의 색 일정은 달력 위 칸에, 나머지는 아래 연합 칸에 나와요. 누르면 바뀌어요.</p>
    ${ro?"":`<form class="cform" id="ladd" style="margin-top:10px"><input id="lName" placeholder="사장 이름 추가" autocomplete="off" aria-label="사장 이름"><select id="lColor" aria-label="색">${COLORS.map(c=>`<option value="${c}">${COLOR_KO[c]}</option>`).join("")}</select><button class="btn ghost" type="submit">추가</button></form>`}</div>`;
  // 카톡방
  const rooms = S.comp.rooms || [];
  h += `<div><h3>자동으로 보는 카톡방 <small>${rooms.length}개</small></h3>${rooms.length ? rooms.map((r,i)=>{ const l = leaderOf(r.leader); return `<div class="crow c-${l?l.color:"purple"}"><span class="cn">${esc(r.name)}<small>${r.kind==="dispatch"?"다음 날 배치표를 일정·인원으로 정리 · ":""}${l?`전부 ${esc(l.name)} 담당`:"업체·이름으로 담당 판단"}</small></span>
    <span style="display:grid;gap:4px"><select data-rk="${i}" aria-label="${esc(r.name)} 종류" ${dis}><option value=""${r.kind!=="dispatch"?" selected":""}>일반 방</option><option value="dispatch"${r.kind==="dispatch"?" selected":""}>출근 배치방</option></select><select data-rl="${i}" aria-label="${esc(r.name)} 담당" ${dis}><option value="">업체별로 판단</option>${lopts(r.leader)}</select></span>${ro?"":`<button class="x" data-rdel="${i}" aria-label="${esc(r.name)} 빼기">×</button>`}</div>`; }).join("") : `<div class="wempty">아직 없어요</div>`}
    ${ro?"":`<form class="cform" id="radd" style="margin-top:10px"><input id="rName" placeholder="카톡방 이름 (카톡에 보이는 그대로)" autocomplete="off" aria-label="카톡방 이름"><select id="rKind" aria-label="종류"><option value="">일반 방</option><option value="dispatch">출근 배치방</option></select><select id="rLeader" aria-label="담당"><option value="">업체별로 판단</option>${lopts("")}</select><button class="btn ghost" type="submit">추가</button></form>`}
    <p class="cintro" style="margin-top:8px">여기 있는 방만 자동으로 확인해요. 방을 추가하면 그때부터 올라오는 메시지를 읽어요.</p></div>`;
  const pst = S.comp.photoStages || {beforeUntil:"11:00", afterFrom:"16:00"};
  h += `<div><h3>현장 사진 시간대 <small>사진이 올라온 시각으로 나눠요</small></h3><div class="wg-grid">
    <label>시공 전 사진: 이 시각 전<input type="time" id="psB" value="${esc(pst.beforeUntil)}" ${dis} style="border:1px solid var(--line);border-radius:10px;padding:8px;background:var(--surface2);color:var(--fg);font:500 15px var(--font)"></label>
    <label>마무리 사진: 이 시각부터<input type="time" id="psA" value="${esc(pst.afterFrom)}" ${dis} style="border:1px solid var(--line);border-radius:10px;padding:8px;background:var(--surface2);color:var(--fg);font:500 15px var(--font)"></label></div>
    <p class="cintro" style="margin-top:6px">그 사이에 올라온 사진은 점심(중간) 사진이에요.</p></div>`;
  // 미지정
  const ul = [...un.values()].sort((a,b)=>b.n-a.n || a.name.localeCompare(b.name,"ko"));
  if (ul.length) h += `<div><h3>담당 없는 업체 <small>${ul.length}곳 · 누구 현장인지 눌러주세요</small></h3><div class="stack" style="gap:8px">${ul.map(u=>`<div class="ucard"><div class="un"><span>${esc(u.name)}</span><small>일정 ${u.n}개</small></div>
      <div class="lrow">${L.map(l=>`<button class="lpick c-${l.color}" data-assign="${esc(u.name)}" data-leader="${esc(l.name)}" ${dis}><i></i>${esc(l.name)}</button>`).join("")}</div></div>`).join("")}</div></div>`;
  // 등록된 업체
  if (!ro) h += `<div><h3>업체 직접 추가</h3><form class="cform" id="cadd"><input id="cName" placeholder="업체 이름" autocomplete="off" aria-label="업체 이름"><select id="cLeader" aria-label="담당 사장">${lopts("")}</select><button class="btn" type="submit">추가</button></form></div>`;
  const groups = [...L.map(l=>l.name), ""];
  for (const g of groups){
    const items = S.comp.list.filter(c => g ? (c.leader===g || (c.also||[]).includes(g)) : !leaderOf(c.leader)).sort((a,b)=>a.name.localeCompare(b.name,"ko"));
    if (!g && !items.length) continue;
    const l = leaderOf(g);
    h += `<div><h3>${l?`<i class="gdot c-${l.color}"></i>${esc(g)} 현장`:"담당 없음"} <small>${items.length}곳</small></h3>`;
    h += items.length ? items.map(c => { const lc = leaderOf(c.leader); return `<div class="crow c-${lc?lc.color:"purple"}"><span class="cn">${esc(c.name)}<small>일정 ${counts.get(norm(c.name))||0}개</small></span>
      <select data-cl="${esc(c.name)}" aria-label="담당 사장" ${dis}>${lopts(c.leader)}</select>${ro?"":`<button class="x" data-cdel="${esc(c.name)}" aria-label="${esc(c.name)} 지우기">×</button>`}</div>`; }).join("") : `<div class="wempty">아직 없어요</div>`;
    h += `</div>`;
  }
  if (!ro) h += `<div class="row"><button class="btn ghost" id="recolor">기존 일정 색 다시 맞추기</button></div>`;
  const gl = (S.glossary||[]);
  h += `<div><h3>받아쓰기 고침표 <small>통화 녹음에서 잘못 알아들은 말 · 제가 알아서 추가해요</small></h3>${gl.length ? gl.map((f,i)=>`<div class="payrow"><span class="pn">${esc(f.heard)} → <b>${esc(f.means)}</b></span>${ro?"":`<button class="lnk dg" data-gdel="${i}">빼기</button>`}</div>`).join("") : `<div class="wempty">아직 없어요</div>`}</div>`;
  el.innerHTML = h + `</div>`;
}
async function saveComp(msg){
  if (!S.db){ renderAll(); return true; }
  return write(() => S.db.doc("config/companies").set({leaders: S.comp.leaders, list: S.comp.list, rooms: S.comp.rooms || [], photoStages: S.comp.photoStages || {beforeUntil:"11:00", afterFrom:"16:00"}, updatedAt: new Date().toISOString()}), msg);
}
async function recolor(quiet){
  if (!S.db) return;
  let n = 0;
  for (const e of [...S.events.values()]){
    if (bathOwner(e.color)) continue; // 904 현장은 그대로
    const c = compColor(e.title);
    if (c && e.color !== c){ try { await S.db.collection("events").doc(e.id).update({color: c}); n++; } catch(_){} }
  }
  if (!quiet || n) toast(n ? `일정 ${n}개 색을 맞췄어요` : "바꿀 일정이 없어요");
}
// 일정 창에서 업체 추가: 이미 다른 사장 업체면 옮기지 않고 '같이 일 줌'에 넣음 (예: 이그니트 → 동식 + 904)
async function addClientFor(name, leader){
  const c = S.comp.list.find(x => norm(x.name) === norm(name));
  if (c && c.leader && leader && c.leader !== leader){ if (!(c.also||[]).includes(leader)){ c.also = [...(c.also||[]), leader]; renderAll(); await saveComp(`${c.name} → ${leader}도 같이 일 줘요`); } return; }
  if (c && c.leader === leader) return;
  await setCompany(name, leader);
}
async function setCompany(name, leader){
  const k = norm(name); const i = S.comp.list.findIndex(c => norm(c.name) === k);
  if (i >= 0) S.comp.list[i] = {...S.comp.list[i], leader, also: (S.comp.list[i].also||[]).filter(x => x !== leader)}; else S.comp.list.push({name: name.trim(), leader});
  renderAll();
  if (await saveComp(`${name.trim()} → ${leader} 현장`)) await recolor(true);
}

