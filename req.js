/* 904 캘린더 · 받은 견적 요청 (업체 홈페이지 904bath.github.io/904-request → 메일 → 여기 붙여넣기)
   - 메일 내용을 통째로 붙여넣으면 data 칸을 읽어 저장 (data가 없으면 요청서 글만 저장)
   - 상태: 새 요청 → 견적 보냄 → 수주 / 안 됨 · 견적 금액·메모
   - 수주되면 [일정 만들기]: 새 일정 창에 업체·주소·구역·공정·기간을 채워서 엶 (저장은 직접) */
S.reqs = new Map();
const RQ_ST = [["new", "새 요청"], ["sent", "견적 보냄"], ["won", "수주"], ["lost", "안 됨"]];
const RQ_L = Object.fromEntries(RQ_ST);
const RQ = {f: "open", draft: "", open: new Set(), msg: ""};
const RQ_DEMO = {"전체 철거": "올철거", "벽 철거": "벽만 철거", "바닥 철거": "바닥만 철거", "욕조 철거": "욕조 자리만", "도기 철거": "도기만 철거"};

// 붙여넣은 메일에서 {"S":…,"v":…} 꺼내기 (중괄호 짝 맞춰서)
function rqJson(t){
  let i = t.indexOf('{"v":2'); if (i < 0) i = t.indexOf('{"S"'); if (i < 0) return null;
  let d = 0, q = false, e = false;
  for (let j = i; j < t.length; j++){ const c = t[j];
    if (q){ if (e) e = false; else if (c === "\\") e = true; else if (c === '"') q = false; continue; }
    if (c === '"') q = true; else if (c === "{") d++; else if (c === "}"){ d--; if (!d){ try { return JSON.parse(t.slice(i, j + 1)); } catch(_){ return null; } } } }
  return null;
}
function rqText(t){ const a = t.indexOf("[904 타일 견적 요청]"); if (a < 0) return t.trim(); let s = t.slice(a); const b = s.search(/\n\s*data\s*\n|\{"S"|\{"v":2/); if (b > 0) s = s.slice(0, b); return s.trim(); }
const rqLine = (txt, k) => (txt.match(new RegExp("^" + k + ":\\s*(.+)$", "m")) || [])[1] || "";
function rqParse(raw){
  const j = rqJson(raw), text = rqText(raw);
  if (j && j.v === 2) return {company: j.company || "", person: j.person || "", phone: j.phone || "", addr: j.addr || "", unit: "", pw: j.pw || "", nopw: !!j.nopw, start: j.start || "", end: j.end || "", memo: j.memo || "",
    py: "", tent: "", zones: j.rooms || [], rooms: j.rooms || [], zoneSpec: j.zoneSpec || {}, proc: j.proc || {}, mat: j.mat || null, v2: true, spec: {}, procs: Object.keys(j.proc || {}), popt: {}, text, hasData: true};
  const v = j?.v || {};
  const head = rqLine(text, "업체").split(" · "), site = rqLine(text, "현장").split(" · ");
  return {company: v.cName || head[0] || "", person: v.cPerson || "", phone: v.cPhone || head[head.length - 1] || "",
    addr: v.sAddr || site[0] || "", unit: v.sUnit || "", pw: v.sPw || "", start: v.dStart || "", end: v.dEnd || "", memo: v.memo || "",
    py: j?.S?.py || "", tent: j?.S?.tent || "", zones: j?.S?.zones || [], spec: j?.S?.spec || {}, procs: j?.S?.procs || [], popt: j?.S?.popt || {},
    text, hasData: !!j};
}
const rqWhen = s => { if (!s) return ""; const d = new Date(s); return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`; };
const rqDay = k => { if (!k) return ""; const d = new Date(k + "T00:00"); return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`; };
const rqWon = n => n ? Number(n).toLocaleString("ko-KR") : "";

let RQ_AUTO = 0;
function renderReq(){
  const el = $("#req"); if (!el) return;
  if (S.tab === "req" && S.db && !RQ_G.busy && Date.now() - RQ_AUTO > 600000){ RQ_AUTO = Date.now(); setTimeout(() => rqGmail(false), 50); } const ro = !S.canWrite, dis = ro ? "disabled" : "";
  const all = [...S.reqs.values()].sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  const cnt = k => all.filter(r => (r.status || "new") === k).length;
  const F = [["open", "진행 중", all.filter(r => ["new", "sent"].includes(r.status || "new")).length], ...RQ_ST.map(([k, l]) => [k, l, cnt(k)]), ["all", "전체", all.length]];
  const list = all.filter(r => { const s = r.status || "new"; return RQ.f === "all" || (RQ.f === "open" ? s === "new" || s === "sent" : s === RQ.f); });
  let h = `<div class="stack">`;
  if (!ro) h += `<div class="rq-g"><span>📨 업체 홈페이지 요청은 Gmail에서 자동으로 가져와요${RQ_G.at ? ` · ${new Date(RQ_G.at).getHours()}:${String(new Date(RQ_G.at).getMinutes()).padStart(2, "0")} 확인` : ""}${RQ_G.err ? ` · <b>${esc(RQ_G.err)}</b>` : ""}</span><button type="button" class="btn ghost sm" id="rqSync" ${RQ_G.busy ? "disabled" : ""}>${RQ_G.busy ? "확인 중…" : "메일 확인"}</button></div>`;
  if (!ro) h += `<details class="qcard rq-paste"${RQ.draft ? " open" : ""}><summary><h3 style="margin:0;display:inline">메일 붙여넣기로 넣기</h3></summary>
    <p class="cintro">메일함에 온 <b>[견적 요청]</b> 메일을 열어 내용을 전체 복사해서 붙여넣어 주세요.</p>
    <textarea id="rqPaste" placeholder="메일 내용 붙여넣기">${esc(RQ.draft)}</textarea>
    <div class="row" style="justify-content:space-between"><span class="hint">${esc(RQ.msg)}</span><button type="button" class="btn" id="rqAdd" ${dis}>요청 넣기</button></div></details>`;
  h += `<div class="rq-f">${F.map(([k, l, n]) => `<button type="button" class="opt" data-rqf="${k}" aria-pressed="${RQ.f === k}">${l} <b>${n}</b></button>`).join("")}</div>`;
  if (!list.length) h += `<div class="rq-empty">${all.length ? "이 상태인 요청이 없어요" : "아직 받은 요청이 없어요. 업체에 904bath.github.io/904-request 주소를 보내면 요청이 메일로 와요"}</div>`;
  h += list.map(r => { const s = r.status || "new", op = RQ.open.has(r.id), ev = r.eventId && S.events.get(r.eventId);
    const zs = (r.zones || []).join("·"), when = r.start ? rqDay(r.start) + (r.end && r.end !== r.start ? "~" + rqDay(r.end) : "") + (r.tent === "확정" ? " 확정" : r.tent ? " 협의" : "") : "날짜 미정";
    return `<article class="rq rq-${s}">
      <button type="button" class="rq-h" data-rqopen="${esc(r.id)}"><span class="stag rqs-${s}">${RQ_L[s]}</span><b>${esc(r.company || "업체 미정")}</b><small>${esc(rqWhen(r.at))} 받음</small><i>${op ? "▴" : "▾"}</i></button>
      <div class="rq-l">📍 ${esc([r.addr, r.unit, r.py].filter(Boolean).join(" · ") || "주소 없음")}</div>
      <div class="rq-l">🛠 ${esc(zs || "구역 없음")} · 📅 ${esc(when)}${r.amount ? ` · 💰 ${rqWon(r.amount)}원` : ""}</div>
      ${op ? `<div class="rq-b">
        <div class="seg rq-seg">${RQ_ST.map(([k, l]) => `<button type="button" data-rqst="${esc(r.id)}|${k}" aria-pressed="${s === k}" ${dis}>${l}</button>`).join("")}</div>
        <div class="rq-two"><label class="fld">견적 금액<span class="wgi"><input data-rqamt="${esc(r.id)}" inputmode="numeric" value="${rqWon(r.amount)}" placeholder="보낸 견적" ${dis}><em>원</em></span></label>
          <label class="fld">연락처<span class="rq-ph">${esc([r.person, r.phone].filter(Boolean).join(" · ") || "없음")}</span></label></div>
        <label class="fld">메모<input data-rqnote="${esc(r.id)}" value="${esc(r.note || "")}" placeholder="예: 11/3 견적 문자 보냄 · 자재 업체 준비" ${dis}></label>
        <pre class="rq-t">${esc(r.text || "")}</pre>
        <div class="row" style="justify-content:space-between">
          ${ro ? "<span></span>" : `<button type="button" class="lnk dg" data-rqdel="${esc(r.id)}">요청 지우기</button>`}
          ${r.quoteId && S.quotes.get(r.quoteId) ? `<button type="button" class="btn ghost" data-rqq="${esc(r.quoteId)}">견적서 ${esc((QSTAT[S.quotes.get(r.quoteId).status] || QSTAT.draft)[0])} ›</button>` : ""}
          ${ev ? `<button type="button" class="btn ghost" data-ev="${esc(ev.id)}">일정 보기 ›</button>` : ro ? "" : `<button type="button" class="btn${s === "won" ? "" : " ghost"}" data-rqev="${esc(r.id)}">일정 만들기</button>`}</div>
      </div>` : ""}</article>`; }).join("");
  el.innerHTML = h + `</div>`;
}

function rqSave(id, data, msg){ if (!S.db){ S.reqs.set(id, {...data, id}); renderReq(); return Promise.resolve(true); } return write(() => S.db.collection("requests").doc(id).set(data), msg); }
function rqPatch(id, patch, msg){ const r = S.reqs.get(id); if (!r) return; const d = {...r, ...patch, updatedAt: new Date().toISOString()}; delete d.id; S.reqs.set(id, {...d, id}); return rqSave(id, d, msg); }

// 메일 본문 하나 → 받은 요청 + 단가 미작성 견적서
async function rqIngest(raw, extra){
  const p = rqParse(raw); if (!p.company && !p.addr && !p.hasData) return null;
  if ([...S.reqs.values()].some(r => r.text === p.text || (extra?.gmailId && r.gmailId === extra.gmailId))) return null;
  const id = newId("requests"), now = new Date().toISOString();
  const data = {...p, status: "new", at: extra?.at || now, updatedAt: now, amount: 0, note: "", eventId: "", ...(extra || {})}; delete data.hasData;
  const qid = await rqQuote(id, data); if (qid) data.quoteId = qid;
  S.reqs.set(id, {...data, id}); await rqSave(id, data); return id;
}
// Gmail에서 [견적 요청] 메일 가져오기 (받은 요청 창을 열 때 · 버튼)
const RQ_G = {busy: false, at: "", err: ""};
async function rqGmail(manual){
  if (RQ_G.busy || !S.db || !S.canWrite) return; let mcp = null; try { mcp = await window.claude?.use?.("mcp"); } catch(_){}
  if (!mcp){ if (manual) toast("이 화면에서는 메일을 읽을 수 없어요"); return; }
  RQ_G.busy = true; RQ_G.err = ""; renderReq();
  try {
    let seen = []; try { const d = await S.db.doc("config/reqgmail").get(); seen = d.exists ? (d.data().ids || []) : []; } catch(_){}
    const have = new Set([...seen, ...[...S.reqs.values()].map(r => r.gmailId).filter(Boolean)]);
    const sr = await mcp.callTool("Gmail", "search_threads", {query: 'from:submissions@formsubmit.co subject:"견적 요청" newer_than:90d', pageSize: 30}, {cache: false});
    const ths = (sr.payload?.threads) || [], ids = [];
    for (const t of ths){ let ms = t.messages || [];
      if ((t.messageCount || ms.length) > ms.length){ try { const g = await mcp.callTool("Gmail", "get_thread", {threadId: t.id, messageFormat: "MINIMAL"}, {cache: false}); ms = g.payload?.messages || ms; } catch(_){} }
      for (const m of ms) if (m.id && !have.has(m.id)) ids.push({id: m.id, at: m.date}); }
    let n = 0;
    for (const m of ids.sort((a, b) => (a.at || "").localeCompare(b.at || ""))){
      try { const g = await mcp.callTool("Gmail", "get_message", {messageId: m.id, messageFormat: "PLAIN_TEXT"}, {cache: false});
        const body = g.payload?.plaintextBody || ""; if (await rqIngest(body, {gmailId: m.id, at: m.at ? new Date(m.at).toISOString() : ""})) n++; have.add(m.id); } catch(_){}
    }
    if (ids.length) try { await S.db.doc("config/reqgmail").set({ids: [...have].slice(-500), at: new Date().toISOString()}); } catch(_){}
    RQ_G.at = new Date().toISOString(); if (n){ RQ.f = "new"; toast(`메일에서 새 요청 ${n}건 가져왔어요 · 단가 미작성 견적서도 만들었어요`); } else if (manual) toast("새 요청 메일이 없어요");
  } catch(e){ RQ_G.err = e?.code === "not_granted" || e?.code === "permission_denied" ? "Gmail 읽기를 허용해 주세요" : "메일을 읽지 못했어요"; if (manual) toast(RQ_G.err); }
  RQ_G.busy = false; renderReq(); rqChip();
}
async function rqAdd(){
  const raw = ($("#rqPaste")?.value || "").trim(); if (!raw){ $("#rqPaste")?.focus(); return; }
  const p = rqParse(raw); if (!p.company && !p.addr && !p.hasData){ RQ.msg = "요청서를 찾지 못했어요. 메일 내용을 전체 복사해 주세요"; renderReq(); return; }
  const dup = [...S.reqs.values()].find(r => r.text === p.text); if (dup){ RQ.msg = "이미 넣은 요청이에요"; RQ.open = new Set([dup.id]); renderReq(); return; }
  const id = newId("requests"), now = new Date().toISOString();
  const data = {...p, status: "new", at: now, updatedAt: now, amount: 0, note: "", eventId: ""}; delete data.hasData;
  RQ.draft = ""; RQ.msg = p.hasData ? "" : "요청서 글만 넣었어요 (구역 정보 없이)"; RQ.f = "open"; RQ.open = new Set([id]);
  const qid = await rqQuote(id, data); if (qid) data.quoteId = qid;
  await rqSave(id, data, `${p.company || "요청"} 넣었어요 · 단가 미작성 견적서도 만들었어요`); renderReq();
}
// 요청 → 견적서 (단가표 미작성): 구역·공정마다 한 줄씩, 단가는 비워 둠
const rqZs = x => [x.work === "철거 후 시공" ? (x.demo || "철거 후 시공") : x.work, x.size, x.method, x.qty, ...Object.entries(x.opts || {}).map(([n, v]) => v === true || (Array.isArray(v) && !v.length) ? n : `${n}(${Array.isArray(v) ? v.join("·") : v})`)].filter(Boolean).join(" · ");
function rqItems(r){
  const it = [], R = r.rooms || r.zones || [], B = R.filter(isBathRoom), P = r.proc || {}, zs = z => (r.zoneSpec || r.spec || {})[z] || {}, row = (g, name, memo, unit, qty) => ({g, name, memo: memo || "", unit, qty, c: 0, v: 0, price: 0});
  const by = (k, z) => ((P[k]?.opt || {}).byRoom || {})[z] || [];
  if (P.prot) it.push(row("etc", "보양", P.prot.opt?.범위 || "", "식", 1));
  if (P.demo){ if (P.demo.opt?.업체철거) it.push(row("demo", "철거", "업체가 철거해 둠", "식", 0));
    else { for (const z of B){ const a = by("demo", z); if (a.includes("안 함")) continue; it.push(row("demo", `${z} 철거`, a.join("·"), "칸", 1)); }
      if (!B.length) it.push(row("demo", "철거", P.demo.note || "", "식", 1)); if (P.demo.opt?.폐기물 !== "따로") it.push(row("demo", "폐기물 처리", P.demo.opt?.폐기물 === "철거에 포함" ? "904 처리" : "", "차", 1)); } }
  if (P.plumb) for (const z of B.length ? B : [""]){ const a = by("plumb", z); if (a.includes("안 함")) continue; it.push(row("water", `${z ? z + " " : ""}설비`, [a.join("·"), P.plumb.note].filter(Boolean).join(" · "), "식", 1)); }
  if (P.wp) for (const z of B.length ? B : [""]){ const a = by("wp", z); if (a.includes("안 함")) continue; it.push(row("water", `${z ? z + " " : ""}방수`, a.join("·"), "칸", 1)); }
  if (P.tile || !Object.keys(P).length) for (const z of R) it.push(row("tile", `${z} 타일 시공`, rqZs(zs(z)), isBathRoom(z) ? "칸" : "식", 1));
  if (P.sani) it.push(row("fixture", "도기 세팅", (P.sani.opt?.항목 || []).join("·"), "칸", B.length || 1));
  if (P.dome) it.push(row("ceiling", "돔 천장", [P.dome.opt?.천장, P.dome.opt?.매립등 ? "매립등 " + P.dome.opt.매립등 : "", ...(P.dome.opt?.추가 || [])].filter(Boolean).join(" · "), "칸", B.length || 1));
  if (P.etc) it.push(row("etc", "기타", P.etc.note || "", "식", 1));
  return it;
}
async function rqQuote(reqId, r){
  const qid = newId("quotes"), R = r.rooms || r.zones || [];
  const q = {client: r.company || "", phone: r.phone || "", title: R.join("·") || "견적 요청", site: [r.addr, r.unit].filter(Boolean).join(" "), start: r.start || "", end: r.end || "",
    baths: R.filter(isBathRoom).length || 1, tileSize: "", items: rqItems(r), vat: false, memo: [r.memo, r.mat ? `자재: ${r.mat.by === "ours" ? "904가 준비" + (r.mat.note ? " (" + r.mat.note + ")" : "") : "업체가 준비"}` : ""].filter(Boolean).join("\n"),
    status: "req", source: (r.text || "").slice(0, 2000), eventId: "", reqId, createdAt: new Date().toISOString()};
  if (!S.db){ S.quotes.set(qid, {...q, id: qid}); return qid; }
  return (await write(() => S.db.collection("quotes").doc(qid).set(q))) ? qid : "";
}

// 수주 → 새 일정 창 채워서 열기 (누구 현장·확정은 직접 고르고 저장)
function rqToEvent(id){
  const r = S.reqs.get(id); if (!r) return;
  openEvent(null, r.start || todayK()); if (!D) return;
  if (r.start){ D.start = r.start; D.end = r.end && r.end >= r.start ? r.end : r.start; D._dateSet = true; }
  D.client = r.company || ""; D.addr = [r.addr, r.unit].filter(Boolean).join(" "); D.pw = r.pw || ""; D.tent = r.tent !== "확정";
  if (r.v2){ D.rooms = [...(r.rooms || [])]; D.zoneSpec = structuredClone(r.zoneSpec || {}); D.proc = {};
    for (const [k, x] of Object.entries(r.proc || {})){ if (!KIND_LABEL[k]) continue; const p = Object.assign(newProc(k), {opt: structuredClone(x.opt || {}), rooms: x.rooms || [], note: x.note || ""});
      if (x.coats) p.coats = x.coats; if (x.meji) p.meji = x.meji; if (p.opt.업체철거){ p.by = "ours"; p.done = true; } D.proc[k] = p; }
    D.nopw = !!r.nopw; if (r.mat) D.mat = {by: r.mat.by === "ours" ? "ours" : "client", ready: false, note: r.mat.note || ""};
    D.plan = planOf(D, D.proc); D.memo = [r.text, r.note ? "메모: " + r.note : ""].filter(Boolean).join("\n\n"); D._req = id; renderDlg(); return; }
  D.rooms = [...(r.zones || [])]; D.zoneSpec = {};
  for (const z of D.rooms){ const x = (r.spec || {})[z] || {}, o = {};
    if (x.work) o.work = x.work;
    if (x.work === "철거 후 시공" && Array.isArray(x.demo) && x.demo.length) o.demo = x.demo.length === 1 ? RQ_DEMO[x.demo[0]] || "부분 철거" : x.demo.includes("전체 철거") ? "올철거" : "부분 철거";
    for (const f of ["size", "method", "qty"]) if (x[f]) o[f] = x[f];
    if (x.opts && Object.keys(x.opts).length) o.opts = structuredClone(x.opts);
    D.zoneSpec[z] = o; }
  D.proc = {};
  for (const k of r.procs || []){ if (!KIND_LABEL[k]) continue; const p = newProc(k);
    if (k === "demo" && Object.values(r.spec || {}).some(x => x.demoBy === "철거 해 둔 상태")){ p.opt = {업체철거: true}; p.by = "ours"; p.done = true; }
    D.proc[k] = p; }
  D.plan = planOf(D, D.proc);
  D.memo = [r.text, r.note ? "메모: " + r.note : ""].filter(Boolean).join("\n\n");
  D._req = id; renderDlg();
}
// 새 일정이 저장되면 요청에 연결 (수주로)
{ const _sv = saveEvent; saveEvent = async function(id, data){ const rid = D?._req, ok = await _sv(id, data); if (ok && rid && S.reqs.has(rid)) rqPatch(rid, {eventId: id, status: "won"}); return ok; }; }

document.addEventListener("click", ev => {
  const t = ev.target.closest("#req button"); if (!t) return; const d = t.dataset;
  if (t.id === "rqAdd") return void rqAdd();
  if (t.id === "rqSync") return void rqGmail(true);
  if (d.rqf){ RQ.f = d.rqf; return renderReq(); }
  if (d.rqopen){ RQ.open.has(d.rqopen) ? RQ.open.delete(d.rqopen) : RQ.open.add(d.rqopen); return renderReq(); }
  if (d.rqst){ const [id, s] = d.rqst.split("|"); rqPatch(id, {status: s}, RQ_L[s] + "(으)로 바꿨어요"); return renderReq(); }
  if (d.rqev) return rqToEvent(d.rqev);
  if (d.rqq) return openQuote(d.rqq);
  if (d.rqdel){ if (!t.classList.contains("arm")){ t.classList.add("arm"); t.textContent = "한 번 더 누르면 지워요"; return; }
    const id = d.rqdel; S.reqs.delete(id); RQ.open.delete(id); renderReq(); if (S.db) write(() => S.db.collection("requests").doc(id).delete(), "지웠어요"); return; }
});
let RQ_T = {};
document.addEventListener("input", ev => { const t = ev.target;
  if (t.id === "rqPaste"){ RQ.draft = t.value; RQ.msg = ""; return; }
  const id = t.dataset?.rqamt || t.dataset?.rqnote; if (!id) return;
  if (t.dataset.rqamt){ const v = num(t.value); t.value = v ? v.toLocaleString("ko-KR") : ""; }
  clearTimeout(RQ_T[id]); RQ_T[id] = setTimeout(() => { const box = t.closest(".rq-b");
    rqPatch(id, {amount: num(box.querySelector("[data-rqamt]")?.value || ""), note: (box.querySelector("[data-rqnote]")?.value || "").trim()}, "저장했어요"); }, 800); });
// 맨 위 칩: 새 요청 n건
function rqChip(){ const c = $("#reqChip"); if (!c) return; const n = [...S.reqs.values()].filter(r => (r.status || "new") === "new").length;
  c.hidden = !n || (S.tab === "cal" && (S.view === "today" || S.view === "plan")); c.innerHTML = `📨 새 견적 요청 <b>${n}</b>`; }
$("#reqChip")?.addEventListener("click", () => { RQ.f = "new"; setTab("req"); });
// 요청 저장소 구독
(async () => { let db = null; try { db = await window.claude?.use?.("db"); } catch(_){} if (!db) return;
  db.collection("requests").onSnapshot(snap => { S.reqs = new Map(snap.docs.map(d => [d.id, {...d.data(), id: d.id}])); rqChip();
    const a = document.activeElement; if (S.tab === "req" && !(a && a.closest && a.closest("#req") && a.matches("input,textarea"))) renderReq(); }, () => {});
})();
