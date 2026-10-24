/* 904 캘린더 · 화면 전환 · 버튼/입력 처리 · 시작 (마지막에 불러옴) */
/* ---------- 공통 렌더 ---------- */
function renderBanner(){
  const b = $("#banner");
  if (!S.db){ b.textContent = "미리보기 모드예요. 여기서 바꾼 내용은 저장되지 않아요."; b.hidden = false; }
  else if (!S.canWrite){ b.textContent = "보기 전용이에요. 일정과 인원은 수정 권한이 있는 사람만 바꿀 수 있어요."; b.hidden = false; }
  else b.hidden = true;
  const pc = $("#pendChip"); const np = [...S.events.values()].filter(e => e.pending).length;
  if (S.pendOnly) { pc.innerHTML = `확인 필요만 보는 중 <b>${np}</b> · 전체`; pc.hidden = false; }
  else if (np) { pc.innerHTML = `카톡 확인 <b>${np}</b>`; pc.hidden = false; }
  else pc.hidden = true;
  const wc = $("#warnChip"); const wt = issueTodo();
  if (wt.length){ wc.innerHTML = `⚠ 공정 확인 <b>${wt.length}</b>`; wc.hidden = false; } else wc.hidden = true;
  const qc = $("#qrChip"), qt = qreqTodo();
  if (qt.length){ const n = qt.reduce((s, x) => s + x.q.length, 0); qc.innerHTML = `💬 견적 <b>${n}</b>`; qc.hidden = false; } else qc.hidden = true;
  const pc2 = $("#prepChip"); const pt = prepTodo();
  const p7 = pt.filter(x => x.left <= 7), p14 = pt.filter(x => x.left > 7), c7 = $("#prepChip7");
  if (p7.length){ c7.innerHTML = `📋 1주 안 빈 정보 <b>${p7.length}</b>`; c7.hidden = false; } else c7.hidden = true;
  if (p14.length){ pc2.innerHTML = `📋 2주 안 빈 정보 <b>${p14.length}</b>`; pc2.hidden = false; } else pc2.hidden = true;
  const oc = $("#outChip"); const ot = outTodo();
  if (ot.length){ const ur = ot.filter(x => x.level === "urgent").length, wa = ot.filter(x => x.level === "warn").length;
    oc.className = "pendchip outchip" + (ur ? " urgent" : wa ? " warn" : "");
    oc.innerHTML = ur ? `🚨 외주 급함 <b>${ur}</b>${ot.length>ur?` / ${ot.length}`:""}` : wa ? `⚠ 외주 7일 안 <b>${wa}</b>` : `☎ 외주 <b>${ot.length}</b>`;
    oc.hidden = false;
    // 급한 게 있으면 하루 한 번 자동으로 목록 띄우기 (새 급한 건이 생기면 또)
    if (ur && S.loaded.e && !S._urgShown && $("#dlg").hidden){ const key = todayK() + ":" + ot.filter(x => x.level === "urgent").map(x => x.e.id + x.k).join(",");
      let seen = ""; try { seen = localStorage.getItem("urgSeen") || ""; } catch(_){}
      if (seen !== key){ S._urgShown = true; try { localStorage.setItem("urgSeen", key); } catch(_){} setTimeout(() => openOutSheet(), 300); } } }
  else oc.hidden = true;
  if (S.tab === "cal" && (S.view === "today" || S.view === "plan")) ["#outChip","#warnChip","#qrChip","#prepChip7","#prepChip","#pendChip"].forEach(s => { const c = $(s); if (c) c.hidden = true; }); // 오늘·내일은 아래 '지금 챙길 것'에 다 있음
  $("#fab").hidden = !S.canWrite || (S.tab === "cal" && S.view === "plan") || S.tab === "pay" || S.tab === "crew" || S.tab === "comp" || S.tab === "quote" || S.tab === "est" || S.tab === "req";
  const fn = $("#fabNow"); fn.hidden = !S.canWrite || !S.mcp || !["cal","agenda","quote"].includes(S.tab); fn.classList.toggle("busy", NOW.busy);
  fn.style.bottom = $("#fab").hidden ? "76px" : "";
  if (typeof rqChip === "function") rqChip();
}
function renderAll(){
  $("#mtitle").textContent = `${S.y}년 ${S.m+1}월`;
  renderBanner();
  document.querySelectorAll("[data-view]").forEach(b => b.setAttribute("aria-pressed", b.dataset.view === (S.view||"cal")));
  if (S.tab==="cal") { if (S.view==="board") renderBoard(); else if (S.view==="today") renderToday(); else if (S.view==="plan") renderPlan(); else renderCal(); } else if (S.tab==="agenda") renderAgenda(); else if (S.tab==="crew") renderCrew(); else if (S.tab==="comp") renderComp(); else if (S.tab==="quote") renderQuotes(); else if (S.tab==="est") renderEst(); else if (S.tab==="req") renderReq(); else renderPay();
  if (!$("#sheet").hidden){ if (S.sheetCell && BC) openCell(BC.id, BC.k); else if (S.sheetWarn) openWarnSheet(); else if (S.sheetQr) openQrSheet(); else if (S.sheetPrep) openPrepSheet(S.sheetPrep); else if (S.sheetOut) openOutSheet(); else if (S.sel) openSheet(S.sel); }
}
function setTab(t){
  S.tab = t;
  // 아래 탭: 달력·공정표·오늘내일·짜보기 + 관리(목록·인원·정산·견적·업체)
  document.querySelectorAll(".tabs .tab[data-view]").forEach(b => b.setAttribute("aria-selected", t === "cal" && b.dataset.view === (S.view || "cal")));
  { const M = {agenda:"목록", crew:"인원", pay:"정산", quote:"견적", est:"예상 견적", comp:"업체", req:"받은 요청"}; const mt = $("#moreTab"); if (mt){ mt.setAttribute("aria-selected", t !== "cal"); $("#moreLbl").textContent = M[t] || "관리"; } }
  document.querySelectorAll("#moreMenu [data-tab]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tab === t)); $("#moreMenu").hidden = true;
  const V = S.view || "cal"; $("#calView").hidden = t!=="cal" || V!=="cal"; $("#board").hidden = t!=="cal" || V!=="board"; $("#today").hidden = t!=="cal" || V!=="today"; $("#plan").hidden = t!=="cal" || V!=="plan"; $("#vseg").hidden = t!=="cal"; $("#agenda").hidden = t!=="agenda"; $("#crew").hidden = t!=="crew"; $("#pay").hidden = t!=="pay"; $("#comp").hidden = t!=="comp"; $("#quote").hidden = t!=="quote"; $("#est").hidden = t!=="est"; $("#req").hidden = t!=="req";
  try { localStorage.setItem("tab", t); } catch(e){}
  renderAll();
}
function shiftMonth(n){ const d = new Date(S.y, S.m+n, 1); S.y = d.getFullYear(); S.m = d.getMonth(); S._calTop = null; renderAll(); }

/* ---------- 이벤트 ---------- */
$("#prev").onclick = () => shiftMonth(-1);
$("#next").onclick = () => shiftMonth(1);
$("#todayBtn").onclick = () => { S._calTop = null; const d = new Date(); S.y=d.getFullYear(); S.m=d.getMonth(); S.sel=todayK(); renderAll(); };
$("#searchBtn").onclick = () => { const sb=$("#searchBar"); sb.hidden=!sb.hidden; if(!sb.hidden){ $("#q").focus(); if(S.tab!=="agenda") setTab("agenda"); } else { S.q=""; $("#q").value=""; renderAll(); } };
$("#q").oninput = e => { S.q = e.target.value; if (S.tab!=="agenda") setTab("agenda"); else renderAgenda(); };
document.querySelectorAll("#moreMenu [data-tab]").forEach(b => b.onclick = () => setTab(b.dataset.tab));
$("#moreTab").onclick = e => { e.stopPropagation(); $("#moreMenu").hidden = !$("#moreMenu").hidden; };
document.addEventListener("pointerdown", e => { const m = $("#moreMenu"); if (m && !m.hidden && !e.target.closest("#moreMenu,#moreTab")) m.hidden = true; });
$("#fabNow").onclick = () => runNow();
$("#fab").onclick = () => openEvent(null, S.sel || (S.y===new Date().getFullYear()&&S.m===new Date().getMonth()?todayK():key(new Date(S.y,S.m,1))));
$("#sheetScrim").onclick = closeSheet;
$("#lb").onclick = () => { $("#lb").hidden = true; $("#lbImg").src = ""; };
$("#outChip").onclick = () => openOutSheet();
$("#warnChip").onclick = () => openWarnSheet();
$("#qrChip").onclick = () => openQrSheet();
$("#prepChip").onclick = () => openPrepSheet("t");
$("#prepChip7").onclick = () => openPrepSheet("w");
$("#pendChip").onclick = () => { S.pendOnly = !S.pendOnly; if (S.tab !== "agenda") setTab("agenda"); else renderAll(); };
$("#dlgScrim").onclick = () => closeDlg();
let sx=null; // 옆으로 밀어 달 넘기기는 없앰 · 위아래로 내리면 다음 달로 이어짐 (cal.js)
window.addEventListener("resize", () => { if (S.tab==="cal") renderCal(); });
document.addEventListener("keydown", e => { if (e.key==="Enter" && (e.target.id==="fRoom" || e.target.id==="fQr")){ e.preventDefault(); document.querySelector(e.target.id==="fRoom" ? "[data-roomadd]" : "[data-qradd]")?.click(); return; } if (e.key==="Enter" && e.target.id==="fZone"){ e.preventDefault(); document.querySelector("[data-zoneadd]")?.click(); return; } if (e.key==="Enter" && e.target.id==="fNewClient"){ e.preventDefault(); document.querySelector("[data-addclient]")?.click(); return; } if (e.key==="Escape"){ if(!$("#dlg").hidden) closeDlg(); else closeSheet(); } });

document.addEventListener("click", async e => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.ev){ openEvent(t.dataset.ev, S.tab==="cal"||!$("#sheet").hidden ? (S.sel && !$("#sheet").hidden ? S.sel : null) : null); return; }
  if (t.dataset.day){ openSheet(t.dataset.day); return; }
  if (t.dataset.open){ ({out: openOutSheet, warn: openWarnSheet, qr: openQrSheet, prep: () => openPrepSheet("w")})[t.dataset.open]?.(); return; }
  if (t.dataset.tcopy){ const txt = dayText(dayBrief(t.dataset.tcopy));
    if (await shareText(txt)) return;
    try { await navigator.clipboard.writeText(txt); toast("복사했어요. 배치방에 붙여넣으세요"); } catch(_) { const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:absolute;left:-9999px"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast("복사했어요"); } catch(__){ toast("복사하지 못했어요"); } ta.remove(); }
    return; }
  if (t.dataset.view){ if (t.dataset.view === "cal") S._calTop = null; S.view = t.dataset.view; try { localStorage.setItem("view", S.view); } catch(_){} setTab("cal"); return; }
  if (t.dataset.outlist){ openOutSheet(); return; }
  if ((t.dataset.ack || t.dataset.ackone) && S.canWrite){ const e = S.events.get(t.dataset.ack || t.dataset.ackone); if (!e) return; const I = issuesOf(e);
    const add = t.dataset.ack ? I.msgs : [I.msgs[Number(t.dataset.i)]].filter(Boolean); const planAck = [...new Set([...(Array.isArray(e.planAck) ? e.planAck : []), ...add])].slice(-200);
    S.events.set(e.id, {...e, planAck}); renderAll(); if (S.db) await write(() => S.db.collection("events").doc(e.id).update({planAck}), "그대로 진행할게요"); return; }
  if (t.dataset.bc){ openCell(t.dataset.bc, t.dataset.k); return; }
  if (t.dataset.cby && BC){ const v = t.dataset.cby; await saveCell((P,k) => { if (v === "none") delete P[k]; else { P[k] = P[k] || newProc(k); P[k].by = v; } }); return; }
  if (t.dataset.cdone && BC){ await saveCell((P,k) => { if (P[k]) setDone(k, P[k], !P[k].done); }); return; }
  if (t.dataset.cbk && BC){ await saveCell((P,k) => { if (P[k]){ P[k].booked = !P[k].booked; P[k].bkd = {}; } }); return; }
  if (t.id==="shClose"){ closeSheet(); return; }
  if (t.id==="shAdd"){ openEvent(null, S.sel); return; }
  if (t.dataset.w){ openWorker(t.dataset.w); return; }
  if (t.id==="copyPay"){
    const txt = payText();
    try { await navigator.clipboard.writeText(txt); toast("복사했어요"); }
    catch(_) { const ta=document.createElement("textarea"); ta.value=txt; ta.style.cssText="position:absolute;left:-9999px"; document.body.appendChild(ta); ta.select(); try{document.execCommand("copy"); toast("복사했어요");}catch(__){toast("복사하지 못했어요");} ta.remove(); }
    return;
  }
  if (t.dataset.calso && S.canWrite){ const c = S.comp.list.find(x => x.name === t.dataset.calso); if (!c) return; const L = t.dataset.leader, on = (c.also||[]).includes(L);
    c.also = on ? c.also.filter(x => x !== L) : [...(c.also||[]), L]; renderAll(); await saveComp(on ? `${c.name} · ${L} 뺐어요` : `${c.name} → ${L}도 같이 일 줘요`); return; }
  if (t.dataset.assign && S.canWrite){ await setCompany(t.dataset.assign, t.dataset.leader); return; }
  if (t.dataset.cdel && S.canWrite){ S.comp.list = S.comp.list.filter(c => c.name !== t.dataset.cdel); renderAll(); await saveComp("업체를 목록에서 뺏어요"); return; }
  if (t.dataset.ldel !== undefined && S.canWrite){ const l = S.comp.leaders[Number(t.dataset.ldel)]; if (S.comp.list.some(c=>c.leader===l.name)) { toast(`${l.name} 현장 업체를 먼저 다른 사장에게 옮겨 주세요`); return; } S.comp.leaders.splice(Number(t.dataset.ldel),1); renderAll(); await saveComp("뺐어요"); return; }
  if (t.id==="recolor"){ await recolor(false); return; }
  if (t.id==="qbGo"){ await quoteFromCall(); return; }
  if (t.id==="qbStop"){ QB.ctl?.abort(); return; }
  if (t.dataset.q){ openQuote(t.dataset.q); return; }
  if (t.id==="qNew"){ newQuote(); return; }
  if (Q){
    if (t.id==="qCancel"){ closeDlg(); return; }
    if (t.id==="qSave"){ await saveQ(); return; }
    if (t.id==="qCopy"){ readQ(); const txt = quoteText(Q);
      try { await navigator.clipboard.writeText(txt); toast("복사했어요. 카톡에 붙여넣으세요"); }
      catch(_) { const ta=document.createElement("textarea"); ta.value=txt; ta.style.cssText="position:absolute;left:-9999px"; document.body.appendChild(ta); ta.select(); try{document.execCommand("copy"); toast("복사했어요");}catch(__){toast("복사하지 못했어요");} ta.remove(); }
      return; }
    if (t.id==="qMkEvent"){ readQ(); if (!S.db) return; const eid = newId("events");
      if (await write(()=>S.db.collection("events").doc(eid).set({title:`${Q.client||"견적"} (${Q.title||""})`, start:Q.start, end:(Q.end&&Q.end>=Q.start)?Q.end:Q.start, time:"", color: compColor(Q.client)||"purple", kinds:[], memo:`[견적] ${Q.site||""}`.trim(), crew:{}, days:{}, off:[], photos:[], photoInfo:{}, pending:true, source:Q.source?`[전화] ${Q.source.slice(0,600)}`:"", quoteId:Q.id||"", updatedAt:new Date().toISOString()}), "일정을 만들었어요")){ Q.eventId = eid; renderQdlg(); }
      return; }
    if (t.id==="qOpenEvent"){ const eid = Q.eventId; closeDlg(); openEvent(eid); return; }
    if (t.id==="qDel"){ if(!Q._arm){ readQ(); Q._arm=true; renderQdlg(); return; } const id=Q.id; if (S.db && await write(()=>S.db.collection("quotes").doc(id).delete(),"견적을 지웠어요")) closeDlg(); return; }
  }
  if (t.dataset.rdel !== undefined && S.canWrite){ const i = Number(t.dataset.rdel); const r = S.comp.rooms[i]; if (!t.dataset.arm){ t.dataset.arm = "1"; t.textContent = "삭제?"; t.style.width = "auto"; t.style.padding = "0 8px"; t.style.color = "var(--sun)"; setTimeout(()=>{ if (t.isConnected){ delete t.dataset.arm; t.textContent = "×"; t.removeAttribute("style"); } }, 3000); return; } S.comp.rooms.splice(i,1); renderAll(); await saveComp(`${r.name} 방은 이제 확인하지 않아요`); return; }
  if (t.dataset.gdel !== undefined && S.canWrite && S.db){ const fixes = (S.glossary||[]).filter((_,i)=>i!==Number(t.dataset.gdel)); await write(()=>S.db.doc("config/glossary").set({...S.glossaryV, fixes, updatedAt:new Date().toISOString()}), "뺐어요"); return; }
  if (t.dataset.lours !== undefined && S.canWrite){ const l = S.comp.leaders[Number(t.dataset.lours)]; l.ours = !l.ours; renderAll(); await saveComp(l.ours ? `${l.name} → 우리 일` : `${l.name} → 연합`); return; }
  // 일정 창
  if (D){
    if (t.id==="dCancel"){ closeDlg(); return; }
    if (t.id==="dSave"){ e.preventDefault(); commitEvent(); return; }
    if (t.id==="dApprove"){ D._approve = true; commitEvent(); return; }
    if (t.dataset.ph){ $("#lbImg").src = "/_blob/" + t.dataset.ph; $("#lb").hidden = false; return; }
    if (t.dataset.phx){ readForm(); D.photos.splice(Number(t.dataset.phx),1); renderDlg(); return; }
    if (t.id==="dDel"){ if(!D._arm){ D._arm=true; readForm(); renderDlg(); setTimeout(()=>{ if(D&&D._arm){D._arm=false; readForm(); renderDlg();} },3000); return; }
      const id=D.id; if(!S.db){ S.events.delete(id); closeDlg(); renderAll(); return; } if (await delEvent(id)) closeDlg(); return; }
    if (t.dataset.col){ readForm(); D.color=t.dataset.col; D._colorTouched=true; renderDlg(); return; }
    if (t.dataset.kind){ readForm(); const k = t.dataset.kind, R = D.rooms || [], RM = D._room || "", p = D.proc[k];
      if (!RM || !R.length){ if (p) delete D.proc[k]; else D.proc[k] = newProc(k); }
      else if (!p){ D.proc[k] = newProc(k); D.proc[k].rooms = [RM]; }                       // 이 욕실에만 추가
      else { const cur = procRooms(D, p);
        if (cur.includes(RM)){ const nx = cur.filter(x => x !== RM); if (nx.length) p.rooms = nx; else delete D.proc[k]; }   // 이 욕실에서 빼기
        else p.rooms = [...cur, RM].length === R.length ? [] : [...cur, RM]; }
      renderDlg(); return; }
    if (t.dataset.room !== undefined){ readForm(); D._room = t.dataset.room; renderDlg(); return; }
    if (t.dataset.addroom){ readForm(); D._addRoom = true; renderDlg(); setTimeout(() => $("#fRoom")?.focus(), 30); return; }
    if (t.dataset.roomq || t.dataset.roomadd){ readForm(); const n = (t.dataset.roomq || $("#fRoom")?.value || "").trim(); if (!n) return;
      D.rooms = [...new Set([...(D.rooms || []), n])]; D._addRoom = false; D._room = n; renderDlg(); return; }
    if (t.dataset.zs){ readForm(); const [r, f, v] = t.dataset.zs.split("|"); D.zoneSpec = D.zoneSpec || {}; const x = D.zoneSpec[r] = {...(D.zoneSpec[r] || {})};
      if (x[f] === v) delete x[f]; else x[f] = v; zsNorm(r, x); renderDlg(); return; } // 방법은 직접 고름 (자동 선택 안 함)
    if (t.dataset.zqty){ readForm(); const [r, v] = t.dataset.zqty.split("|"); D.zoneSpec = D.zoneSpec || {}; const x = D.zoneSpec[r] = {...(D.zoneSpec[r] || {})}; if (x.qty === v) delete x.qty; else x.qty = v; renderDlg(); return; } // 주방 장수
    if (t.dataset.zdimp){ readForm(); const [r, p] = t.dataset.zdimp.split("|"); D.zoneSpec = D.zoneSpec || {}; const x = D.zoneSpec[r] = structuredClone(D.zoneSpec[r] || {});
      if (x.dim && x.dim.pk === p) delete x.dim; // 다시 누르면 크기 다시 고르기
      else { const s = ZDIM_STD[zdimKind(r)]?.[p]; x.dim = s ? {pk: p, w: s[0], l: s[1]} : {pk: "custom", w: 0, l: 0};
        if (s) for (const z of D.rooms || []){ if (z === r) continue; const s2 = ZDIM_STD[zdimKind(z)]?.[p], y = D.zoneSpec[z] || {}; // 평형 하나 고르면 다른 구역도 같은 평형 (직접 입력한 곳은 그대로)
          if (s2 && (!y.dim || y.dim.pk !== "custom")) D.zoneSpec[z] = {...y, dim: {pk: p, w: s2[0], l: s2[1]}}; } }
      renderDlg(); if (p === "custom" && x.dim) setTimeout(() => document.querySelector(`[data-zdim="${CSS.escape(r)}|w"]`)?.focus(), 30); return; }
    if (t.dataset.zso || t.dataset.zsv){ readForm(); const [r, n, v] = (t.dataset.zso || t.dataset.zsv).split("|"); D.zoneSpec = D.zoneSpec || {};
      const x = D.zoneSpec[r] = structuredClone(D.zoneSpec[r] || {}); const o = x.opts = x.opts || {};
      if (t.dataset.zso){ if (o[n]) delete o[n]; else { o[n] = n === "졸리컷" ? ZS_JOLLY.filter(j => o[j]) : true; if (ZS_JOLLY.includes(n) && Array.isArray(o.졸리컷) && !o.졸리컷.includes(n)) o.졸리컷.push(n); } } // 졸리컷은 켜면 고른 것 전부 선택 (보통 다 함) // 추가 항목 켜기·끄기
      else if (n === "졸리컷"){ const a = Array.isArray(o.졸리컷) ? o.졸리컷 : []; o.졸리컷 = a.includes(v) ? a.filter(s => s !== v) : [...a, v]; }
      else o[n] = o[n] === v ? true : v; // 세부 선택 (다시 누르면 풀림)
      zsNorm(r, x); renderDlg(); return; }
    if (t.dataset.zoneall){ readForm(); D.rooms = [...new Set([...(D.rooms || []), ...zonesFor()])]; renderDlg(); return; } // 기본 구역 전부 (직접 추가한 구역 제외)
    if (t.dataset.zoneopen){ readForm(); D._zoneAdd = true; renderDlg(); setTimeout(() => $("#fZone")?.focus(), 30); return; }
    if (t.dataset.cliopen){ readForm(); D._cliAdd = true; renderDlg(); setTimeout(() => $("#fNewClient")?.focus(), 30); return; }
    if (t.dataset.zone || t.dataset.zoneadd){ if (t.dataset.zoneadd) D._zoneAdd = false; readForm(); const n = (t.dataset.zone || $("#fZone")?.value || "").trim(); if (!n) { $("#fZone")?.focus(); return; }
      if (t.dataset.zone && (D.rooms || []).includes(n)){ D.rooms = D.rooms.filter(x => x !== n); // 빼면 공정·메모에서도 그 구역 정리
        for (const k of Object.keys(D.proc)){ const p = D.proc[k]; if (p.rooms?.length){ p.rooms = p.rooms.filter(x => x !== n); if (!p.rooms.length) delete D.proc[k]; } if (p.rnotes) delete p.rnotes[n]; }
        if (D._room === n) D._room = ""; if (D.zoneSpec) delete D.zoneSpec[n]; }
      else D.rooms = [...new Set([...(D.rooms || []), n])];
      renderDlg(); return; }
    if (t.dataset.roomdel){ readForm(); const n = t.dataset.roomdel; D.rooms = (D.rooms || []).filter(x => x !== n);
      for (const k of Object.keys(D.proc)){ const p = D.proc[k]; if (p.rooms?.length){ p.rooms = p.rooms.filter(x => x !== n); if (!p.rooms.length) delete D.proc[k]; } if (p.rnotes) delete p.rnotes[n]; }
      D._room = ""; renderDlg(); return; }
    if (t.dataset.pcopy){ readForm(); const k = t.dataset.pcopy, txt = handoffText({...D, title: autoTitle(), end: evEnd(D)}, k, D.proc[k], planOf({...D, end: evEnd(D)}, D.proc));
      try { await navigator.clipboard.writeText(txt); toast("복사했어요. 카톡에 붙여넣으세요"); } catch(_) { const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:absolute;left:-9999px"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast("복사했어요"); } catch(__){ toast("복사하지 못했어요"); } ta.remove(); }
      return; }
    if (t.dataset.qradd){ readForm(); const v = ($("#fQr")?.value || "").trim(); if (!v){ $("#fQr")?.focus(); return; } D.qreq = [...qreqOf(D), {t: v, done: false}]; renderDlg(); return; }
    if (t.dataset.qrdone !== undefined){ readForm(); const q = qreqOf(D), i = Number(t.dataset.qrdone); if (q[i]) q[i].done = !q[i].done; D.qreq = q; renderDlg(); return; }
    if (t.dataset.qrdel !== undefined){ readForm(); const q = qreqOf(D); q.splice(Number(t.dataset.qrdel), 1); D.qreq = q; renderDlg(); return; }
    if (t.dataset.preset){ readForm(); const ps = PRESETS.find(p=>p[0]===t.dataset.preset); const keep = D.proc; D.proc = {}; if (ps) for (const k of ps[2]) D.proc[k] = keep[k] || newProc(k); renderDlg(); return; }
    if (t.dataset.pby){ readForm(); const p = D.proc[t.dataset.pby]; if (p) p.by = t.dataset.v; renderDlg(); return; }
    if (t.dataset.pdone){ readForm(); const k = t.dataset.pdone, p = D.proc[k]; if (!p) return;
      const RM = (D.rooms||[]).length > 1 && D.rooms.includes(D._room) ? D._room : "";
      if (RM && !p.done){ // 욕실 탭: 그 욕실 날짜만 완료 (공정 전체 완료 아님)
        const L = Object.keys(D.plan).flatMap(d => (D.plan[d]||[]).filter(u => UNIT[u].k === k && (!roomTag(D, d, u) || roomTag(D, d, u) === RM)).map(u => [d, u]));
        const all = L.length && L.every(([d, u]) => (D.doneDays[d]||[]).includes(u));
        for (const [d, u] of L){ const a = (D.doneDays[d]||[]).filter(x => x !== u); D.doneDays[d] = all ? a : [...a, u]; }
        if (!L.length) toast("이 욕실에 잡힌 날짜가 없어요"); renderDlg(); return; }
      setDone(k, p, !p.done); renderDlg(); return; }
    if (t.dataset.vpick){ readForm(); const p = D.proc[t.dataset.vpick]; if (p) p.vendor = t.dataset.v; renderDlg(); return; }
    if (t.dataset.ddone){ readForm(); const u = t.dataset.ddone, d = t.dataset.d, a = D.doneDays[d] || [];
      if (unitDone(u, D.proc) && !a.includes(u)){ toast("공정 전체가 완료로 되어 있어요. 위 [✓ 완료]를 먼저 풀어 주세요"); return; }
      D.doneDays[d] = a.includes(u) ? a.filter(x => x !== u) : [...a, u]; renderDlg(); return; }
    if (t.dataset.dby){ readForm(); const u = t.dataset.dby, d = t.dataset.d, v = t.dataset.v; const base = unitOut(u, D.proc, D.plan[d], null, d) ? "out" : "ours";
      D.byDay[d] = {...(D.byDay[d] || {})}; if (v === base) delete D.byDay[d][u]; else D.byDay[d][u] = v; if (!Object.keys(D.byDay[d]).length) delete D.byDay[d]; renderDlg(); return; }
    if (t.dataset.droom){ readForm(); const u = t.dataset.droom, d = t.dataset.d, v = t.dataset.v; D.planRoom[d] = {...(D.planRoom[d] || {})};
      if (D.planRoom[d][u] === v) delete D.planRoom[d][u]; else D.planRoom[d][u] = v; if (!Object.keys(D.planRoom[d]).length) delete D.planRoom[d];
      const p = D.proc[UNIT[u].k]; if (p && (p.rooms||[]).length && D.planRoom[d]?.[u] && !p.rooms.includes(v)) p.rooms = [...p.rooms, v]; renderDlg(); return; }
    if (t.dataset.owner){ readForm(); const l = S.comp.leaders.find(x => x.name === t.dataset.owner); if (l && effColor() === l.color && !D._ownOpen){ D._ownOpen = true; renderDlg(); return; } D._ownOpen = false; if (l){ D.color = l.color; D._colorTouched = true; applyDefaultProc(); } renderDlg(); return; }
    if (t.dataset.client){ readForm(); const v = t.dataset.client; D.client = D.client === v ? "" : v; if (D.client) D._open.delete("own"); // 고르면 접힘
      if (D.client && !D._colorTouched){ const co = companyOf(v), l = co && !(co.also||[]).length && leaderOf(co.leader); if (l){ D.color = l.color; D._colorTouched = true; applyDefaultProc(); } }
      renderDlg(); return; }
    if (t.dataset.addclient){ readForm(); const name = ($("#fNewClient")?.value || "").trim(); if (!name){ $("#fNewClient")?.focus(); return; }
      const owner = leaderByColor(effColor()); D.client = name; D._open.delete("own"); D._cliAdd = false;
      if (S.canWrite) await addClientFor(name, owner ? owner.name : ""); if (D) renderDlg(); return; }
    if (t.dataset.nopw){ readForm(); D.nopw = !D.nopw; renderDlg(); return; }
    if (t.dataset.matby){ readForm(); D.mat = {...matOf(D), by: t.dataset.matby}; renderDlg(); return; }
    if (t.dataset.matok){ readForm(); const m = matOf(D); D.mat = {...m, ready: !m.ready}; renderDlg(); return; }
    if (t.dataset.alldone){ readForm(); const ks = procKeys(D.proc), all = ks.every(k => D.proc[k].done); for (const k of ks) setDone(k, D.proc[k], !all); renderDlg(); toast(all ? "전체 완료를 취소했어요" : "공정을 전부 완료로 했어요. 저장을 눌러 주세요"); return; }
    if (t.dataset.whotog){ readForm(); D._whoOpen = D._whoOpen || {}; D._whoOpen[t.dataset.whotog] = !D._whoOpen[t.dataset.whotog]; renderDlg(); return; }
    if (t.dataset.pwho){ readForm(); const k = t.dataset.pwho, id = t.dataset.wid, p = D.proc[k]; if (p){ p.who = p.who || []; const on = p.who.includes(id);
        p.who = on ? p.who.filter(x => x !== id) : [...p.who, id];
        for (const d of kindDays(D.plan, k)){ const a = new Set(D.crew[d] || []); if (on) a.delete(id); else a.add(id); D.crew[d] = [...a]; } } renderDlg(); return; }
    if (t.dataset.pu){ readForm(); const u = t.dataset.pu, day = t.dataset.pday || D._day, a = D.plan[day] || [];
      const RMx = (D.rooms||[]).length > 1 && (D.rooms||[]).includes(D._room) ? D._room : "", tg = roomTag(D, day, u); D.planRoom = D.planRoom || {};
      let i = a.indexOf(u);
      if (i >= 0 && RMx && tg && tg !== RMx){ delete D.planRoom[day][u]; i = -2; }          // 다른 욕실에 잡힌 걸 이 욕실도 → 두 욕실 공통
      else if (i >= 0) { a.splice(i,1); if (D.planRoom[day]) delete D.planRoom[day][u]; }
      else { a.push(u); if (RMx){ D.planRoom[day] = D.planRoom[day] || {}; D.planRoom[day][u] = RMx; } } a.sort((x,y) => UNIT[x].i - UNIT[y].i); if (a.length) D.plan[day] = a; else delete D.plan[day]; { const p = D.proc[UNIT[u].k]; if (i < 0 && p && p.by === "ours" && (p.who||[]).length) D.crew[day] = [...new Set([...(D.crew[day]||[]), ...p.who])]; } renderDlg(); return; }
    if (t.dataset.autoplan){ readForm(); const r = autoPlan(); renderDlg(); toast(r.n ? `${r.n}개 공정을 날짜에 넣었어요${r.left?` · ${r.left}개는 기간이 모자라요`:""}` : (r.left ? "기간이 모자라서 못 넣었어요" : "넣을 공정이 없어요")); return; }
    if (t.dataset.dack){ readForm(); D.planAck = [...new Set([...(D.planAck||[]), ...issuesOf({...D, color: effColor(), end: evEnd(D)}, D.proc).msgs])]; renderDlg(); toast("저장하면 이대로 진행해요"); return; }
    if (t.dataset.unack){ readForm(); D.planOk = ""; D.planAck = []; renderDlg(); return; }
    if (t.dataset.clearplan){ readForm(); D.plan = {}; renderDlg(); return; }
    if (t.dataset.wpc){ readForm(); const p = D.proc.wp; if (p){ p.coats = Number(t.dataset.wpc); p.steps = p.steps.map((s,i) => i < p.coats && s); p.done = p.steps.slice(0, p.coats).every(Boolean);
      for (const d of Object.keys(D.plan)){ D.plan[d] = D.plan[d].filter(u => !(u.startsWith("wp") && Number(u[2]) > p.coats)); if (!D.plan[d].length) delete D.plan[d]; } } renderDlg(); return; }
    if (t.dataset.pstep !== undefined){ readForm(); const p = D.proc.wp; if (p){ const i = Number(t.dataset.pstep); p.steps[i] = !p.steps[i]; p.done = p.steps.slice(0, p.coats).every(Boolean); } renderDlg(); return; }
    if (t.dataset.tstage){ readForm(); const p = D.proc.tile; if (p){ p.stage = t.dataset.tstage === "none" ? "" : t.dataset.tstage; p.done = p.stage === "meji"; } renderDlg(); return; }
    if (t.dataset.tmeji){ readForm(); const p = D.proc.tile; if (p) p.meji = t.dataset.tmeji; renderDlg(); return; }
    if (t.dataset.tarea){ readForm(); const p = D.proc.tile, a = t.dataset.tarea; if (p){ if (p.areas[a]) delete p.areas[a]; else { p.areas[a] = {size:[], method:[]}; for (const [f] of AREA_RULE[a].flags) p.areas[a][f] = false; } } renderDlg(); return; }
    if (t.dataset.topt){ readForm(); const x = D.proc.tile?.areas[t.dataset.topt]; if (x){ const arr = x[t.dataset.f], v = t.dataset.v, i = arr.indexOf(v); if (i >= 0) arr.splice(i,1); else arr.push(v); } renderDlg(); return; }
    if (t.dataset.tflag){ readForm(); const x = D.proc.tile?.areas[t.dataset.tflag]; if (x) x[t.dataset.f] = !x[t.dataset.f]; renderDlg(); return; }
    if (t.dataset.pbk){ readForm(); const p = D.proc[t.dataset.pbk]; if (p){ p.booked = !p.booked; p.bkd = {}; } renderDlg(); return; }
    if (t.dataset.dt){ readForm(); D._day=t.dataset.dt; renderDlg(); return; }
    if (t.id==="offBtn"){ readForm(); D.off = D.off.includes(D._day)?D.off.filter(x=>x!==D._day):[...D.off,D._day]; renderDlg(); return; }
    if (t.dataset.pick){ readForm(); const cur=new Set(D.crew[D._day]||[]); cur.has(t.dataset.pick)?cur.delete(t.dataset.pick):cur.add(t.dataset.pick); D.crew[D._day]=[...cur]; renderDlg(); return; }
    if (t.id==="copyAll"){ readForm(); const src=[...(D.crew[D._day]||[])]; for(const k of range(D.start,evEnd(D))) if(!D.off.includes(k)) D.crew[k]=[...src]; renderDlg(); toast("모든 날에 적용했어요"); return; }
  }
  // 인원 창
  if (W){
    if (t.id==="wCancel"){ closeDlg(); W=null; return; }
    if (t.id==="wSave"){
      const data = {name:$("#wName").value.trim()||"이름 없음", group:$("#wGroup").value, wage:num($("#wWage").value), phone:$("#wPhone").value.trim(), addr:($("#wAddr")?.value||"").trim(), team:$("#wTeam").value};
      if(!S.db){ S.workers.set(W.id,{...data,id:W.id}); closeDlg(); W=null; renderAll(); return; }
      if (await saveWorker(W.id, data)){ closeDlg(); W=null; } return;
    }
    if (t.id==="wDel"){ if(!W._arm){ W._arm=true; renderWdlg(); return; }
      if(!S.db){ S.workers.delete(W.id); closeDlg(); W=null; renderAll(); return; } if (await delWorker(W.id)){ closeDlg(); W=null; } return; }
  }
});
document.addEventListener("change", async e => {
  if (BC && S.sheetCell && ["cV","cA","cD"].includes(e.target.id)){ const id = e.target.id, v = e.target.value;
    await saveCell((P,k) => { if (!P[k]) return; if (id==="cV") P[k].vendor = v.trim(); else if (id==="cA") P[k].amount = num(v); else P[k].date = v; }); return; }
  if (D && e.target.id==="fPhotos" && S.assets){
    const files = [...e.target.files]; if (!files.length) return;
    readForm(); D._up = true; renderDlg(); let fail = 0;
    for (const f of files){
      try { const r = await S.assets.upload(f, f.type ? undefined : {type:"image/jpeg"}); if (D){ D.photos.push(r.id); const nw=new Date(); const tm=pad(nw.getHours())+":"+pad(nw.getMinutes()); D.photoInfo[r.id] = {date: D._day || D.start, by: "", time: tm, stage: stageOf(tm)}; } }
      catch(err){ fail++; if (err && err.code === "too_large") toast("20MB보다 큰 사진은 올릴 수 없어요"); else if (err && err.code === "quota_or_state") toast("사진 저장 공간이 가득 찼어요"); }
    }
    if (D){ D._up = false; renderDlg(); toast(fail ? `${files.length-fail}장 올리고 ${fail}장은 실패했어요` : "사진을 붙였어요. 저장을 눌러 주세요"); }
    return;
  }
  if (D && (e.target.id==="fStart" || e.target.id==="fEnd" || e.target.id==="fAddr")){ readForm(); applyDefaultProc(); const cc = !D._colorTouched && compColor(D.title); if (cc) D.color = cc; renderDlg(); }
  if (e.target.dataset?.lc !== undefined && S.canWrite){ const i = Number(e.target.dataset.lc); S.comp.leaders[i].color = e.target.value; renderAll(); if (await saveComp("색을 바꿨어요")) await recolor(true); }
  if (e.target.dataset?.cl !== undefined && S.canWrite){ await setCompany(e.target.dataset.cl, e.target.value); }
  if (Q && e.target.id==="qStart"){ readQ(); renderQdlg(); return; }
  if ((e.target.id==="psB" || e.target.id==="psA") && S.canWrite){ S.comp.photoStages = {beforeUntil: $("#psB").value || "11:00", afterFrom: $("#psA").value || "16:00"}; await saveComp("사진 시간대를 저장했어요"); }
  if (e.target.dataset?.rk !== undefined && S.canWrite){ S.comp.rooms[Number(e.target.dataset.rk)].kind = e.target.value; renderAll(); await saveComp("저장했어요"); }
  if (e.target.dataset?.rl !== undefined && S.canWrite){ S.comp.rooms[Number(e.target.dataset.rl)].leader = e.target.value; renderAll(); await saveComp("저장했어요"); }
});
document.addEventListener("submit", async e => {
  e.preventDefault();
  if (e.target.id==="cadd"){
    const name = $("#cName").value.trim(); if (!name){ $("#cName").focus(); return; }
    await setCompany(name, $("#cLeader").value); setTimeout(()=>$("#cName")?.focus(), 50); return;
  }
  if (e.target.id==="radd"){
    const name = $("#rName").value.trim(); if (!name){ $("#rName").focus(); return; }
    if ((S.comp.rooms||[]).some(r=>r.name===name)){ toast("이미 있는 방이에요"); return; }
    const d = new Date(); const at = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    S.comp.rooms = [...(S.comp.rooms||[]), {name, leader: $("#rLeader").value, kind: $("#rKind").value, addedAt: at}]; renderAll(); await saveComp(`${name} 방을 추가했어요`); return;
  }
  if (e.target.id==="ladd"){
    const name = $("#lName").value.trim(); if (!name){ $("#lName").focus(); return; }
    if (S.comp.leaders.some(l=>l.name===name)){ toast("이미 있는 이름이에요"); return; }
    S.comp.leaders.push({name, color: $("#lColor").value, ours: false}); renderAll(); await saveComp("추가했어요"); return;
  }
  if (e.target.id==="qadd"){
    const name = $("#qName").value.trim(); if (!name){ $("#qName").focus(); return; }
    const id = newId("workers"); const data = {name, group:$("#qGroup").value, wage:0, phone:"", addr:"", team:$("#qTeam")?.value||""};
    if(!S.db){ S.workers.set(id,{...data,id}); renderAll(); return; }
    if (await saveWorker(id, data)){ setTimeout(()=>$("#qName")?.focus(), 50); }
  } else if (e.target.id==="dForm") commitEvent();
});
document.addEventListener("input", e => {
  const g = e.target.dataset?.gw, gl = e.target.dataset?.gl;
  if (g){ const v = num(e.target.value); e.target.value = v ? v.toLocaleString("ko-KR") : ""; S.cfg.groups[g].wage = v; saveCfgSoon(); }
  if (gl){ S.cfg.groups[gl].label = e.target.value.trim() || DEFAULT_CFG.groups[gl].label; saveCfgSoon(); }
  if (e.target.id==="callText"){ QB.draft = e.target.value; }
  if (e.target.dataset?.pa || e.target.id==="cA"){ const v=num(e.target.value); e.target.value = v ? v.toLocaleString("ko-KR") : ""; }
  if (e.target.id==="wWage"){ const v=num(e.target.value); e.target.value = v ? v.toLocaleString("ko-KR") : ""; }
});
// 인원 탭 입력 중에는 다시 그리지 않음 (포커스 유지)
function safeRender(){ const a = document.activeElement; if (S.tab==="req" && a && a.closest && a.closest("#req") && a.matches("input,textarea")) return; if (S.tab==="est" && (E.edit || (a && a.closest && a.closest("#est")))) return; /* 예상 견적 만드는 중엔 다시 그리지 않음 */ if (a && ["cV","cA","cD"].includes(a.id)) return; if (S.tab==="comp" && a && (a.id==="cName" || a.id==="lName" || a.id==="rName")) return; if (S.tab==="quote" && a && (a.id==="callText" || a.dataset?.kf || a.dataset?.kco)) return; if (S.tab==="crew" && a && (a.dataset?.gw || a.dataset?.gl || a.id==="qName")) return; renderAll(); }

/* ---------- 시작 ---------- */
const now = new Date(); S.y = now.getFullYear(); S.m = now.getMonth(); S.sel = null;
try { const t = localStorage.getItem("tab"); if (["cal","agenda","crew","pay","comp","quote","est","req"].includes(t)) S.tab = t; } catch(e){}
try { const v0 = localStorage.getItem("view"); if (v0 === "board" || v0 === "today" || v0 === "plan") S.view = v0; } catch(e){}
setTab(S.tab);

(async () => {
  let db = null;
  try { db = await window.claude?.use?.("db"); } catch(e){ db = null; }
  S.db = db || null;
  try { S.assets = (await window.claude?.use?.("assets")) || null; } catch(e){ S.assets = null; }
  try { S.sample = (await window.claude?.use?.("sample")) || null; } catch(e){ S.sample = null; }
  try { S.mcp = (await window.claude?.use?.("mcp")) || null; } catch(e){ S.mcp = null; } safeRender();
  if (S.db){
    try { const u = await window.claude.use("user"); const c = u ? await u.can("data.write") : null; if (c === false) S.canWrite = false; } catch(e){}
    S.db.collection("events").onSnapshot(snap => {
      S.events = new Map(snap.docs.map(d => [d.id, {...d.data(), id: d.id}])); S.loaded.e = true;
      if (D && D.id && !S.events.has(D.id)) closeDlg();
      safeRender();
    }, () => toast("일정을 불러오지 못했어요. 새로고침해 주세요"));
    S.db.collection("workers").onSnapshot(snap => {
      S.workers = new Map(snap.docs.map(d => [d.id, {...d.data(), id: d.id}])); S.loaded.w = true;
      if (D) { readForm(); renderDlg(); } safeRender();
    }, () => toast("인원을 불러오지 못했어요. 새로고침해 주세요"));
    S.db.doc("config/main").onSnapshot(snap => {
      if (snap.exists){ const d = snap.data(); const g = {}; for (const k of GROUPS) g[k] = {label: d.groups?.[k]?.label || DEFAULT_CFG.groups[k].label, wage: Number(d.groups?.[k]?.wage)||0}; S.cfg = {groups:g}; }
      safeRender();
    }, () => {});
    S.db.collection("quotes").onSnapshot(snap => { S.quotes = new Map(snap.docs.map(d => [d.id, {...d.data(), id: d.id}])); safeRender(); }, () => {});
    S.db.doc("config/glossary").onSnapshot(snap => { S.glossaryV = snap.exists ? snap.data() : {}; S.glossary = Array.isArray(S.glossaryV.fixes) ? S.glossaryV.fixes : []; safeRender(); }, () => {});
    S.db.doc("config/catalog").onSnapshot(snap => { if (snap.exists) setCatalogFromDb(snap.data()); safeRender(); }, () => {});
    S.db.doc("config/companies").onSnapshot(snap => {
      if (snap.exists){ const d = snap.data();
        S.comp = {leaders: Array.isArray(d.leaders) && d.leaders.length ? d.leaders.map(l=>({name:String(l.name||""), color: COLORS.includes(l.color)?l.color:"purple", ours: !!l.ours})) : structuredClone(DEFAULT_COMP.leaders),
          list: Array.isArray(d.list) ? d.list.filter(c=>c && c.name).map(c=>({name:String(c.name), leader:String(c.leader||""), also: Array.isArray(c.also) ? c.also.map(String).filter(Boolean) : []})) : [],
          rooms: Array.isArray(d.rooms) ? d.rooms.filter(r=>r && r.name).map(r=>({name:String(r.name), leader:String(r.leader||""), kind: r.kind==="dispatch"?"dispatch":"", addedAt:String(r.addedAt||"")})) : [],
          photoStages: d.photoStages && d.photoStages.beforeUntil ? {beforeUntil:String(d.photoStages.beforeUntil), afterFrom:String(d.photoStages.afterFrom||"16:00")} : {beforeUntil:"11:00", afterFrom:"16:00"}}; }
      safeRender();
    }, () => {});
  }
  renderAll();
})();

// 전체 화면: 브라우저가 허락하는 곳(PC·안드로이드)에서만 버튼이 보임 · 아이폰 사파리는 웹페이지 전체 화면을 막아서 안 보임
(function(){ const b = $("#fsBtn"), el = document.documentElement; const req = el.requestFullscreen || el.webkitRequestFullscreen;
  let ok = false; try { ok = !!req && (document.fullscreenEnabled || document.webkitFullscreenEnabled); } catch(_){}
  if (!b || !ok) return; b.hidden = false;
  b.addEventListener("click", async () => { try { if (document.fullscreenElement || document.webkitFullscreenElement) await (document.exitFullscreen || document.webkitExitFullscreen).call(document); else await req.call(el); } catch(_){ toast("이 화면에서는 전체 화면을 쓸 수 없어요"); } });
})();

// 맨 위 칩 줄(외주 급함·공정 확인·빈 정보·카톡 확인)은 🔔 버튼 안으로: 누르면 펼쳐짐 · 숫자 = 챙길 게 있는 칩 개수
(function(){ const row = $("#chipRow"), b = $("#alertBtn"), n = $("#alertN"); if (!row || !b) return;
  const sync = () => { const vis = [...row.children].filter(c => !c.hidden); b.hidden = !vis.length; n.textContent = vis.length || ""; b.classList.toggle("urg", vis.some(c => c.id === "outChip" && /급함/.test(c.textContent))); if (!vis.length) row.classList.remove("open"); };
  new MutationObserver(sync).observe(row, {subtree: true, attributes: true, attributeFilter: ["hidden"], childList: true, characterData: true}); sync();
  b.addEventListener("click", e => { e.stopPropagation(); row.classList.toggle("open"); });
  row.addEventListener("click", () => setTimeout(() => row.classList.remove("open"), 50));
  document.addEventListener("pointerdown", e => { if (row.classList.contains("open") && !e.target.closest("#chipRow,#alertBtn")) row.classList.remove("open"); });
})();
