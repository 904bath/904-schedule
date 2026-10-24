/* 904 캘린더 · 하루 보기 '배치표' · 출발 권장 시간 · 이미지/글자 복사 */
const DSP_BASE = "07:30", DSP_SPARE = 10;
const TRAVEL = new Map();          // 저장된 이동시간 (DB travel)
const TRAVEL_BUSY = new Set();     // 계산 중인 쌍
let TRAVEL_FAIL = "";              // 마지막 실패 이유
const dAddr = s => String(s || "").trim();
function pairId(h, s){ const t = dAddr(h) + "|" + dAddr(s); let a = 5381, b = 52711;
  for (let i = 0; i < t.length; i++){ const c = t.charCodeAt(i); a = (a * 33) ^ c; b = (b * 31) ^ c; a |= 0; b |= 0; }
  return "t" + (a >>> 0).toString(36) + (b >>> 0).toString(36) + t.length; }
const toMin = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ""); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const fromMin = n => { n = ((n % 1440) + 1440) % 1440; return pad(Math.floor(n / 60)) + ":" + pad(n % 60); };
const okLL = p => p && isFinite(p.lat) && isFinite(p.lng) && p.lat > 33 && p.lat < 39 && p.lng > 124 && p.lng < 132;
// 플레이스 검색은 동·호수를 빼야 단지가 잘 나옴 (예: 범물우방미진아파트102/501 → 범물우방미진아파트)
const placeQ = a => dAddr(a).replace(/\s*\d+\s*동\s*\d+\s*호.*$/, "").replace(/\s*\d+\s*\/\s*\d+\s*호?\s*$/, "").trim() || dAddr(a);
function naverSearch(a){ return "https://map.naver.com/p/search/" + encodeURIComponent(dAddr(a)); }
function naverRoute(home, site, tv){
  if (!tv || !okLL(tv.h) || !okLL(tv.s)) return "";
  const pt = (p, n) => `${p.lng},${p.lat},${encodeURIComponent(n)},,ADDRESS_POI`;
  return `https://map.naver.com/p/directions/${pt(tv.h, home)}/${pt(tv.s, site)}/-/car`;
}

/* 하루 배치 정보 · 인원별 (동식 · 희태 · 성욱 · 지영) */
const DSP_PEOPLE = ["동식", "희태", "성욱", "지영"];
const DSP_CALLERS = ["동식", "희태"]; // 외주 일정 조율 담당
const NOT_TODO = ["인원 미배정"];
function dspData(k){
  const b = dayBrief(k), tk = todayK();
  const ws = DSP_PEOPLE.map(n => [...S.workers.values()].find(w => w.name === n && !teamOf(w))).filter(Boolean);
  // 외주 연락: 현장 색(담당 사장)이 동식/희태면 그 사람, 아니면 둘 다 (그날 이후 일정만)
  const calls = k === tk || k > tk ? outTodo() : [];
  const people = ws.map(w => {
    const home = dAddr(w.addr);
    const sites = b.sites.filter(s => s.ids.includes(w.id)).map((s, idx) => { const e = s.e, addr = dAddr(e.addr);
      const set = s.di.time || (e.time && e.start === evEnd(e) ? e.time : ""); const meet = set || DSP_BASE;
      const r = {e, title: e.title || "현장", addr, place: addr ? naverSearch(placeQ(addr)) : "", meet, base: !set, ours: s.ours,
        work: unitLine(s), tasks: [...s.us.filter(u => s.P[UNIT[u].k]?.by !== "out").map(u => UNIT[u].l + (roomTag(e, k, u) ? `(${roomTag(e, k, u)})` : "") + (unitDone(u, s.P) ? " ✓" : "")), ...s.ts.map(u => UNIT[u].l + "(임시)")],
        outs: s.us.filter(u => s.P[UNIT[u].k]?.by === "out").map(u => UNIT[u].l), note: s.di.note || "", pw: s.ours ? (e.pw ? e.pw : e.nopw ? "필요 없음" : "확인 필요") : "",
        moved: movedOn(k, w.id), mates: s.ids.filter(id => id !== w.id).map(wname), todo: s.chk.filter(c => !NOT_TODO.includes(c) && !c.startsWith("⚠") && !c.startsWith("☎")).map(c => c.startsWith("카톡에서") ? "일정 내용 확인" : c).filter(c => !(c === "비밀번호 확인")), state: "", dep: "", min: null, first: idx === 0};
      if (!r.first) r.state = "next";
      else if (!addr || !home) r.state = "noaddr";
      else { const tv = TRAVEL.get(pairId(home, addr));
        if (tv && tv.minutes > 0){ r.min = tv.minutes; r.dep = fromMin(toMin(meet) - tv.minutes - DSP_SPARE); r.state = "ok"; }
        else r.state = TRAVEL_BUSY.has(pairId(home, addr)) ? "busy" : "need"; }
      return r; });
    const out = DSP_CALLERS.includes(w.name) ? calls.filter(x => { const l = evLeader(x.e)?.name; return l === w.name || !DSP_CALLERS.includes(l); })
      .map(x => ({id: x.e.id, t: `${KIND_LABEL[x.k]} 외주 · ${x.e.title || ""}`, d: `${md(x.need)}(${WD[wdOf(x.need)]}) 작업${x.p.vendor ? " · " + x.p.vendor : ""}`, level: x.level, biz: x.biz, shared: !DSP_CALLERS.includes(evLeader(x.e)?.name)})) : [];
    return {w, home, sites, out, k};
  });
  return {k, people};
}
const depTxt = r => r.state === "ok" ? `${r.dep} 출발 (예상 · 차 ${r.min}분)` : r.state === "noaddr" ? "출발 시간: 주소 없음" : r.state === "busy" ? "출발 시간 계산 중…" : r.state === "next" ? "" : "출발 시간 계산 전";
const outTag = o => o.level === "urgent" ? "🚨" : o.level === "warn" ? "⚠" : "☎";

// 사람 카드: 오늘 현장 · 주소 · 비번 · 할 일 · 외주 전화
const taskList = s => [...(s.tasks.length ? s.tasks : s.ours ? [] : ["타일 지원"]), ...s.todo];
function personCardHTML(p){
  let h = `<section class="pcard"><div class="pc-h"><b>${esc(p.w.name)}</b>${p.sites.length ? "" : `<span class="mut">휴무</span>`}</div>`;
  for (const s of p.sites){ const tl = taskList(s);
    h += `<div class="pc-site c-${COLORS.includes(s.e.color)?s.e.color:"purple"}" data-pcev="${esc(s.e.id)}" data-pck="${p.k}" role="button" tabindex="0" title="눌러서 일정 수정">
      <span class="pc-edit">수정 ›</span>
      <div class="pc-row"><span class="pc-k">현장</span><span><b>${esc(s.title)}</b>${s.moved && p.sites.length > 1 ? ` <span class="pc-task">이동</span>` : ""}</span></div>
      <div class="pc-row"><span class="pc-k">주소</span><span>${s.addr ? esc(s.addr) : `<span class="ng">주소 없음</span>`}${s.place ? `<br><a class="maplink" href="${esc(s.place)}" target="_blank" rel="noopener">🚗 네이버지도 열기</a>` : ""}</span></div>
      ${s.pw ? `<div class="pc-row"><span class="pc-k">비번</span><span${s.pw === "확인 필요" ? ` class="ng"` : ""}>${esc(s.pw)}</span></div>` : ""}
      <div class="pc-row"><span class="pc-k">시간</span><span>${esc(s.meet)} 집합${s.base ? ` <span class="mut">(기준)</span>` : ""}${s.state === "ok" ? ` · <b class="dsp-dep">${esc(s.dep)} 출발</b> <span class="mut">(예상 ${s.min}분)</span>` : ""}</span></div>
      <div class="pc-row"><span class="pc-k">할 일</span><span>${tl.length ? tl.map(t => `<span class="pc-task">${esc(t)}</span>`).join("") : `<span class="mut">공정 미정</span>`}${s.note ? ` <span class="mut">· ${esc(s.note)}</span>` : ""}</span></div>
      ${s.outs.length ? `<div class="pc-row"><span class="pc-k">외주</span><span class="mut">${esc(s.outs.join(", "))} 들어옴</span></div>` : ""}
    </div>`; }
  if (p.out.length) h += `<div class="pc-call"><b>☎ 외주 전화 ${p.out.length}건</b>${p.out.map(o => `<div class="pc-callrow" data-pcev="${esc(o.id)}" data-pck="${p.k}" role="button" tabindex="0">${outTag(o)} ${esc(o.t)} <span class="mut">· ${esc(o.d)}</span></div>`).join("")}</div>`;
  return h + `</section>`;
}
function dispatchHTML(k){
  const D0 = dspData(k);
  const need = D0.people.some(p => p.sites.some(r => r.state === "need"));
  let h = `<div class="dsp-acts"><button type="button" class="btn" data-dimg="${k}">이미지로 복사</button><button type="button" class="btn ghost" data-dtxt="${k}">글자로 공유 (링크)</button></div>`;
  if (need && S.sample) h += `<button type="button" class="btn ghost" data-dcalc="${k}" style="height:42px">출발 시간 계산하기</button>`;
  if (TRAVEL_FAIL) h += `<p class="hint" style="color:var(--sun)">${esc(TRAVEL_FAIL)}</p>`;
  if (!D0.people.length) return h + `<div class="empty" style="padding:24px">인원 탭에 동식·희태·성욱·지영이 없어요</div>`;
  return h + D0.people.map(personCardHTML).join("");
}

/* 이동시간 추정 (Claude) · 쌍마다 DB에 저장 */
async function calcTravel(k, quiet){
  if (!S.sample) return;
  const D0 = dspData(k), pairs = new Map();
  for (const p of D0.people) for (const s of p.sites) if (s.state === "need") pairs.set(pairId(p.home, s.addr), {home: p.home, site: s.addr});
  if (!pairs.size) return;
  const list = [...pairs.entries()]; list.forEach(([id]) => TRAVEL_BUSY.add(id)); TRAVEL_FAIL = ""; refreshDsp();
  const prompt = `한국(대부분 대구·경북) 출근 시간대(평일 오전 6:30~8:00) 자동차 이동시간을 네이버지도 자동차 길찾기 결과와 최대한 비슷하게 추정해 주세요.
각 쌍의 출발지(집)와 도착지(현장)의 대략 좌표(WGS84 위도·경도)도 함께 주세요. 아파트 이름은 그 단지, 동 이름은 그 동 중심, 역 이름은 그 역 위치로 잡으세요.
출근 시간 정체를 반영하고, 확실하지 않으면 조금 넉넉하게 잡으세요. 분은 정수.
JSON만 답하세요: {"pairs":[{"i":0,"minutes":35,"home":{"lat":35.9,"lng":128.5},"site":{"lat":35.8,"lng":128.6}}]}
쌍 목록:
${list.map(([, p], i) => `${i}. 집: ${p.home} → 현장: ${p.site}`).join("\n")}`;
  try {
    const r = await S.sample.json(prompt, {modelTier: "default"});
    const arr = Array.isArray(r?.pairs) ? r.pairs : [];
    const writes = [];
    for (const x of arr){ const it = list[Number(x?.i)]; const m = Math.round(Number(x?.minutes)); if (!it || !(m > 0 && m < 600)) continue;
      const [id, p] = it; const doc = {home: p.home, site: p.site, minutes: m, by: "claude", at: new Date().toISOString(),
        h: okLL(x.home) ? {lat: +x.home.lat, lng: +x.home.lng} : null, s: okLL(x.site) ? {lat: +x.site.lat, lng: +x.site.lng} : null};
      TRAVEL.set(id, doc); writes.push([id, doc]); }
    if (!writes.length){ TRAVEL_FAIL = "이동시간을 계산하지 못했어요. 다시 눌러 주세요.";
      if (S.db) try { await S.db.doc("config/travelLog").set({code: "empty", msg: JSON.stringify(r).slice(0, 300), at: new Date().toISOString(), pairs: list.length}); } catch(_){} }
    if (S.db && S.canWrite) for (const [id, doc] of writes){ try { await S.db.collection("travel").doc(id).set(doc); } catch(_){} }
  } catch(e){
    if (S.db) try { await S.db.doc("config/travelLog").set({code: String(e?.code || "error"), msg: String(e?.message || e || "").slice(0, 300), at: new Date().toISOString(), pairs: list.length}); } catch(_){}
    TRAVEL_FAIL = e?.code === "not_granted" ? "Claude 사용을 허용해야 출발 시간을 계산할 수 있어요." : e?.code === "rate_limited" ? "잠시 후 다시 계산해 주세요." : "이동시간을 계산하지 못했어요. 다시 눌러 주세요.";
  } finally { list.forEach(([id]) => TRAVEL_BUSY.delete(id)); refreshDsp(); }
}
function refreshDsp(){ if (!$("#sheet").hidden && S.dayMode === "dsp" && S.sel && !S.sheetOut && !S.sheetCell && !S.sheetWarn && !S.sheetPrep && !S.sheetQr) openSheet(S.sel); }

/* 글자 */
function dspText(k){
  const D0 = dspData(k), d = parse(k), L = [`${d.getMonth()+1}/${d.getDate()}(${WD[d.getDay()]}) 인원별`];
  for (const p of D0.people){
    L.push("", `■ ${p.w.name}${p.sites.length ? "" : " · 휴무"}`);
    p.sites.forEach((s, i) => { const tl = taskList(s); if (i) L.push("");
      L.push(`현장: ${s.title}${s.moved && p.sites.length > 1 ? " (이동)" : ""}`, `주소: ${s.addr || "주소 없음"}`); if (s.place) L.push(`🚗 ${s.place}`);
      if (s.pw) L.push(`비번: ${s.pw}`);
      L.push(`시간: ${s.meet} 집합${s.state === "ok" ? ` / ${s.dep} 출발(예상)` : ""}`);
      L.push(`할 일: ${tl.length ? tl.join(", ") : "공정 미정"}${s.note ? " · " + s.note : ""}`);
      if (s.outs.length) L.push(`외주: ${s.outs.join(", ")} 들어옴`); });
    if (p.out.length){ L.push(`☎ 외주 전화`); p.out.forEach(o => L.push(`  ${outTag(o)} ${o.t} · ${o.d}`)); }
  }
  return L.join("\n");
}

/* 이미지 (세로, 글씨 크게) · 사람 카드 */
async function dspCanvas(k){
  try { await document.fonts.load("700 50px 'Noto Sans KR'"); await document.fonts.load("400 40px 'Noto Sans KR'"); } catch(_){}
  const D0 = dspData(k), d = parse(k), W = 1080, P = 56, F = "'Noto Sans KR', -apple-system, sans-serif";
  const cv = document.createElement("canvas"), x = cv.getContext("2d");
  const wrap = (t, font, maxW) => { x.font = font; const out = []; let line = "";
    for (const ch of String(t)){ if (x.measureText(line + ch).width > maxW && line){ out.push(line); line = ch.trim() ? ch : ""; } else line += ch; }
    if (line) out.push(line); return out.length ? out : [""]; };
  const ops = []; let y = 0; const KX = P + 28, VX = P + 210;
  const row = (k, v, font, color, lh) => { const ls = wrap(v, font, W - VX - P - 28); ops.push({t: k, font: `500 40px ${F}`, color: "#6b7280", x: KX, y: y + lh * 0.78});
    for (const ln of ls){ ops.push({t: ln, font, color, x: VX, y: y + lh * 0.78}); y += lh; } };
  const text = (t, font, color, lh, x0 = KX) => { for (const ln of wrap(t, font, W - x0 - P - 28)){ ops.push({t: ln, font, color, x: x0, y: y + lh * 0.78}); y += lh; } };
  ops.push({rect: [0, 0, W, 170], color: "#1f2937"});
  ops.push({t: `${d.getMonth()+1}/${d.getDate()} (${WD[d.getDay()]}) 인원별`, font: `800 68px ${F}`, color: "#fff", x: P, y: 112});
  y = 210;
  for (const p of D0.people){
    const top = y; y += 24;
    text(`${p.w.name}${p.sites.length ? "" : "  ·  휴무"}`, `800 66px ${F}`, "#111", 86);
    p.sites.forEach(s => { const tl = taskList(s);
      y += 8; ops.push({line: [KX, y, W - P - 28], color: "#d1d5db"}); y += 18;
      row("현장", s.title, `800 50px ${F}`, "#111", 66);
      row("주소", s.addr || "주소 없음", `500 44px ${F}`, s.addr ? "#222" : "#c2410c", 60);
      if (s.pw) row("비번", s.pw, `700 46px ${F}`, s.pw === "확인 필요" ? "#c2410c" : "#111", 62);
      row("시간", `${s.meet} 집합${s.state === "ok" ? ` · ${s.dep} 출발` : ""}`, `700 46px ${F}`, s.state === "ok" ? "#1d4ed8" : "#111", 62);
      row("할 일", (tl.length ? tl.join(", ") : "공정 미정") + (s.note ? " · " + s.note : ""), `700 46px ${F}`, "#111", 62);
      if (s.outs.length) row("외주", s.outs.join(", ") + " 들어옴", `500 42px ${F}`, "#555", 58); });
    if (p.out.length){ y += 8; ops.push({line: [KX, y, W - P - 28], color: "#d1d5db"}); y += 18;
      text(`☎ 외주 전화 ${p.out.length}건`, `800 46px ${F}`, "#b45309", 64);
      p.out.forEach(o => text(`${outTag(o)} ${o.t} · ${o.d}`, `500 40px ${F}`, "#333", 56)); }
    y += 24; ops.push({box: [P - 16, top, W - P*2 + 32, y - top], color: "#f3f4f6"}); y += 26;
  }
  y += 10;
  cv.width = W; cv.height = Math.max(y, 600);
  x.fillStyle = "#fff"; x.fillRect(0, 0, W, cv.height);
  for (const o of ops){ if (o.rect){ x.fillStyle = o.color; x.fillRect(...o.rect); }
    else if (o.box){ const [bx, by, bw, bh] = o.box; x.fillStyle = o.color; x.beginPath(); x.roundRect ? x.roundRect(bx, by, bw, bh, 28) : x.rect(bx, by, bw, bh); x.fill(); } }
  for (const o of ops) if (o.line){ x.fillStyle = o.color; x.fillRect(o.line[0], o.line[1], o.line[2] - o.line[0], 3); }
  for (const o of ops) if (o.t !== undefined){ x.font = o.font; x.fillStyle = o.color; x.fillText(o.t, o.x, o.y); }
  return cv;
}
async function copyDspImage(k){
  const cv = await dspCanvas(k), fname = `배치표_${k}.png`;
  const blobP = new Promise(res => cv.toBlob(res, "image/png"));
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw 0;
    await navigator.clipboard.write([new ClipboardItem({"image/png": blobP})]);
    toast("이미지를 복사했어요. 카톡에 붙여넣으세요"); return;
  } catch(_){}
  const blob = await blobP;
  try { const dl = await window.claude?.use?.("downloads");
    if (dl){ await dl.save({filename: fname, data: blob}); toast("이미지를 저장했어요"); return; } } catch(e){ if (e?.code === "declined") return; }
  // 마지막: 크게 띄워서 길게 눌러 저장
  $("#lbImg").src = cv.toDataURL("image/png"); $("#lb").hidden = false; toast("복사가 안 돼요. 이미지를 길게 눌러 저장하세요");
}
async function shareText(txt){ // 휴대폰 공유창(카톡 등)으로 보내기 · 안 되면 false
  if (!navigator.share) return false;
  try { await navigator.share({text: txt}); return true; } catch(e){ return e?.name === "AbortError"; }
}
async function copyDspText(k){
  const txt = dspText(k);
  if (await shareText(txt)) return;
  try { await navigator.clipboard.writeText(txt); toast("복사했어요. 카톡에 붙여넣으면 지도 링크를 바로 누를 수 있어요"); }
  catch(_) { const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:absolute;left:-9999px"; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("글자로 복사했어요"); } catch(__) { toast("복사하지 못했어요"); } ta.remove(); }
}

document.addEventListener("click", async e => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.dmode){ S.dayMode = t.dataset.dmode; if (S.sel) openSheet(S.sel);
    if (S.dayMode === "dsp" && S.sel) calcTravel(S.sel, true); return; }
  if (t.dataset.day && S.dayMode === "dsp"){ setTimeout(() => calcTravel(t.dataset.day, true), 50); return; }
  if (t.dataset.dcalc){ calcTravel(t.dataset.dcalc); return; }
  if (t.dataset.dimg){ t.disabled = true; try { await copyDspImage(t.dataset.dimg); } finally { t.disabled = false; } return; }
  if (t.dataset.dtxt){ await copyDspText(t.dataset.dtxt); return; }
});
// 저장된 이동시간 불러오기
(async () => { let db = null; try { db = await window.claude?.use?.("db"); } catch(_){}
  if (!db) return;
  db.collection("travel").onSnapshot(snap => { for (const d of snap.docs){ const v = d.data(); if (v && v.minutes > 0) TRAVEL.set(d.id, v); } refreshDsp(); }, () => {});
})();

// 일정 카드 안의 지도 링크: 카드(버튼)가 열리지 않고 지도만 열리게
document.addEventListener("click", e => {
  const m = e.target.closest("[data-map]"); if (!m) return;
  e.preventDefault(); e.stopPropagation();
  const a = document.createElement("a"); a.href = m.dataset.map; a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
}, true);

// 인원 카드의 현장·외주 줄을 누르면 그 일정 수정 창 (지도 링크는 지도만)
document.addEventListener("click", e => {
  if (e.target.closest("a, [data-map]")) return;
  const c = e.target.closest("[data-pcev]"); if (!c) return;
  if (!S.events.has(c.dataset.pcev)) return;
  openEvent(c.dataset.pcev, c.dataset.pck || null);
});

/* 배치 링크용 스냅샷: 오늘부터 7일치 인원 카드를 DB(config/shareCards)에 저장 → 예약 작업이 배치 페이지에 올림 */
const SHARE_TRIGGER = "trig_01684hXfXUQDV3FZ7uQSP7ek"; // 배치 링크 새로고침 예약 작업
function shareSnap(){
  const tk = todayK(), days = {};
  for (let i = 0; i < 7; i++){ const k = addD(tk, i);
    days[k] = dspData(k).people.map(p => ({name: p.w.name,
      sites: p.sites.map(s => ({title: s.title, addr: s.addr, place: s.place, pw: s.pw, meet: s.meet, base: s.base, dep: s.state === "ok" ? s.dep : "", min: s.min,
        tasks: taskList(s), outs: s.outs, note: s.note})),
      out: p.out.map(o => ({t: o.t, d: o.d, tag: outTag(o)}))})); }
  return {from: tk, days};
}
let SNAP_LAST = "", SNAP_T = null;
function saveSnapSoon(){ clearTimeout(SNAP_T); SNAP_T = setTimeout(async () => {
  if (!S.db || !S.canWrite || !S.loaded.e || !S.loaded.w) return;
  const s = shareSnap(), j = JSON.stringify(s); if (j === SNAP_LAST) return;
  try { await S.db.doc("config/shareCards").set({...s, at: new Date().toISOString()}); SNAP_LAST = j; } catch(_){}
}, 4000); }
(async () => { let db = null; try { db = await window.claude?.use?.("db"); } catch(_){}
  if (!db) return;
  for (const c of ["events", "workers", "travel"]) db.collection(c).onSnapshot(() => saveSnapSoon(), () => {});
})();
async function refreshShareLink(btn){
  if (btn) btn.disabled = true;
  try {
    if (S.db && S.canWrite){ const s = shareSnap(); await S.db.doc("config/shareCards").set({...s, at: new Date().toISOString()}); SNAP_LAST = JSON.stringify(s); }
    if (!S.mcp || !SHARE_TRIGGER){ toast("저장했어요. 배치 링크는 밤 10시·아침 6시에 바뀌어요"); return; }
    await S.mcp.callTool("Claude Code Remote", "fire_trigger", {trigger_id: SHARE_TRIGGER, text: "앱에서 '배치 링크 새로고침'을 눌렀어요. 평소대로 배치 페이지를 새로 올리세요."}, {cache: false});
    toast("배치 링크 새로고침 시작. 몇 분 뒤 바뀌어요");
  } catch(e){ toast(e?.code === "not_granted" || e?.code === "server_not_connected" ? "Claude Code Remote 연결을 허용해야 쓸 수 있어요" : "새로고침하지 못했어요. 잠시 뒤 다시 눌러 주세요"); }
  finally { if (btn) btn.disabled = false; }
}
document.addEventListener("click", e => { const b = e.target.closest("[data-sharelink]"); if (b) refreshShareLink(b); });
