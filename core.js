/* 904 캘린더 · 기본 데이터 · 상태 · 공통 도구 · 저장 · 계산 (다른 파일보다 먼저 불러옴) */
/* ---------- 기본 데이터 ---------- */
const COLORS = ["purple","blue","green","yellow","orange","coral","red","brown","black"];
const KINDS = [["prot","보양"],["demo","철거"],["plumb","설비"],["elec","전기"],["wp","방수"],["tile","타일"],["sani","도기 세팅"],["dome","돔천장"],["sil","실리콘"],["etc","기타"]];
const KIND_LABEL = Object.fromEntries(KINDS);
const GROUPS = ["gi","jun","kyung","jo"];
const DEFAULT_CFG = {groups:{gi:{label:"기공",wage:0},jun:{label:"준기공",wage:0},kyung:{label:"경력",wage:0},jo:{label:"조공",wage:0}}};
const WD = ["일","월","화","수","목","금","토"];
// 공휴일 (대체공휴일 포함)
const HOL = {
  "2026-01-01":"신정","2026-02-16":"설날","2026-02-17":"설날","2026-02-18":"설날","2026-03-01":"삼일절","2026-03-02":"대체공휴일",
  "2026-05-05":"어린이날","2026-05-24":"부처님오신날","2026-05-25":"대체공휴일","2026-06-03":"지방선거","2026-06-06":"현충일",
  "2026-08-15":"광복절","2026-08-17":"대체공휴일","2026-09-24":"추석","2026-09-25":"추석","2026-09-26":"추석",
  "2026-10-03":"개천절","2026-10-05":"대체공휴일","2026-10-09":"한글날","2026-12-25":"성탄절",
  "2027-01-01":"신정","2027-02-06":"설날","2027-02-07":"설날","2027-02-08":"설날","2027-02-09":"대체공휴일","2027-03-01":"삼일절",
  "2027-05-05":"어린이날","2027-05-13":"부처님오신날","2027-06-06":"현충일","2027-08-15":"광복절","2027-08-16":"대체공휴일",
  "2027-09-14":"추석","2027-09-15":"추석","2027-09-16":"추석","2027-10-03":"개천절","2027-10-04":"대체공휴일",
  "2027-10-09":"한글날","2027-10-11":"대체공휴일","2027-12-25":"성탄절"
};

/* ---------- 상태 ---------- */
const COLOR_KO = {purple:"보라",blue:"파랑",green:"초록",yellow:"노랑",orange:"주황",coral:"분홍",red:"빨강",brown:"갈색",black:"검정"};
const DEFAULT_COMP = {leaders:[{name:"동식",color:"black",ours:true},{name:"희태",color:"yellow",ours:true},{name:"904",color:"green",ours:true},{name:"만제",color:"purple",ours:false},{name:"태구",color:"brown",ours:false}], list:[], rooms:[]};
const DEFAULT_PRICES = [
  {id:"demo",name:"철거",unit:"칸",price:0},{id:"waste",name:"폐기물 처리",unit:"칸",price:0},
  {id:"plumb",name:"설비(배관)",unit:"칸",price:0},{id:"wp",name:"방수",unit:"칸",price:0},
  {id:"tlabor",name:"타일 시공 인건비",unit:"칸",price:0},
  {id:"t3060",name:"타일 자재 300×600",unit:"칸",price:0},{id:"t6060",name:"타일 자재 600×600",unit:"칸",price:0},{id:"t60120",name:"타일 자재 600×1200",unit:"칸",price:0},
  {id:"grout",name:"줄눈",unit:"칸",price:0},{id:"sani",name:"도기·수전 세팅",unit:"칸",price:0},
  {id:"dome",name:"돔천장",unit:"칸",price:0},{id:"sil",name:"실리콘",unit:"칸",price:0},{id:"clean",name:"청소",unit:"칸",price:0},
  {id:"etc",name:"기타",unit:"식",price:0}];
const S = {
  quotes: new Map(), prices: structuredClone(DEFAULT_PRICES), sample: null,
  comp: structuredClone(DEFAULT_COMP),
  events: new Map(), workers: new Map(), cfg: structuredClone(DEFAULT_CFG),
  y: 0, m: 0, sel: null, tab: "cal", q: "", db: null, assets: null, pendOnly: false, canWrite: true, loaded: {e:false,w:false}
};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const won = n => (Math.round(n)||0).toLocaleString("ko-KR") + "원";
const pad = n => String(n).padStart(2,"0");
const key = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parse = k => { const [y,m,d] = k.split("-").map(Number); return new Date(y, m-1, d); };
const addD = (k, n) => { const d = parse(k); d.setDate(d.getDate()+n); return key(d); };
const diff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const todayK = () => key(new Date());
const md = k => { const d = parse(k); return (d.getMonth()+1)+"."+d.getDate(); };
const wdOf = k => parse(k).getDay();
const range = (a, b) => { const out=[]; for(let k=a; k<=b && out.length<400; k=addD(k,1)) out.push(k); return out; };
const evEnd = e => e.end && e.end >= e.start ? e.end : e.start;
const oursColors = () => { const s = new Set(S.comp.leaders.filter(l => l.ours).map(l => l.color)); if (!s.size) s.add("black"); return s; };
const pr = e => oursColors().has(e.color) ? 0 : 1; // 우리 일 먼저
function splitHTML(list, k){
  const a = list.filter(e => pr(e) === 0).sort(byPr), b = list.filter(e => pr(e) !== 0).sort(byPr);
  let h = "";
  if (a.length && b.length) h += `<div class="sep">우리 일정</div>`;
  h += a.map(e => itemHTML(e, k)).join("");
  if (b.length) h += `<div class="sep">연합팀</div>` + b.map(e => itemHTML(e, k)).join("");
  return h;
}
const norm = s => String(s||"").replace(/\(.*?\)|（.*?）/g,"").replace(/[\s·.,/-]+/g,"").toLowerCase();
function companyOf(title){
  const t = norm(title); if (!t) return null; let best = null;
  for (const c of S.comp.list){ const k = norm(c.name); if (k && t.includes(k) && (!best || k.length > best.k.length)) best = {...c, k}; }
  return best;
}
const leaderOf = name => S.comp.leaders.find(l => l.name === name) || null;
const compColor = title => { const c = companyOf(title); if (c && (c.also||[]).length) return null; /* 여러 사장이 일 받는 업체는 색 자동으로 안 바꿈 */ const l = c && leaderOf(c.leader); return l ? l.color : null; };
function compHint(){
  if (!D) return ""; const c = companyOf(D.title); if (!c) return ""; const l = leaderOf(c.leader);
  return `<span class="chint c-${l?l.color:"purple"}"><i class="gdot"></i>${esc(c.name)} · ${l?esc(l.name)+" 현장 · "+COLOR_KO[l.color]:"담당 미지정"}${D._colorTouched?" (직접 고른 색 사용)":""}</span>`;
}
const byPr = (a,b) => pr(a)-pr(b) || (a.time||"").localeCompare(b.time||"") || a.start.localeCompare(b.start);
const groupOf = w => GROUPS.includes(w?.group) ? w.group : "jo";
const wageOf = w => (w && w.wage > 0) ? w.wage : (S.cfg.groups[groupOf(w)]?.wage || 0);
const glabel = g => S.cfg.groups[g]?.label || g;

function toast(msg){ const t=$("#toast"); t.textContent=msg; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>t.hidden=true,2200); }

/* ---------- 저장소 ---------- */
async function write(fn, okMsg){
  if (!S.db) { toast("미리보기에서는 저장되지 않아요"); return false; }
  try { await fn(); if (okMsg) toast(okMsg); return true; }
  catch (e) {
    if (e && e.code === "invalid_argument") { S.canWrite = false; renderBanner(); toast("수정 권한이 없어요"); }
    else if (e && e.code === "quota_exceeded") toast("저장 공간이 가득 찼어요. 오래된 일정을 지워 주세요");
    else toast("저장하지 못했어요. 잠시 후 다시 시도해 주세요");
    return false;
  }
}
function saveEvent(id, data){ return write(() => S.db.collection("events").doc(id).set(data), "저장했어요"); }
function delEvent(id){ return write(() => S.db.collection("events").doc(id).delete(), "삭제했어요"); }
function saveWorker(id, data){ return write(() => S.db.collection("workers").doc(id).set(data), "저장했어요"); }
function delWorker(id){ return write(() => S.db.collection("workers").doc(id).delete(), "삭제했어요"); }
let cfgTimer;
function saveCfgSoon(){ clearTimeout(cfgTimer); cfgTimer = setTimeout(() => write(() => S.db.doc("config/main").set(S.cfg)), 700); }
function newId(col){ return S.db ? S.db.collection(col).doc().id : (col[0] + Date.now().toString(36) + Math.random().toString(36).slice(2,6)); }

/* ---------- 계산 ---------- */
function eventsOn(k){ return [...S.events.values()].filter(e => e.start <= k && evEnd(e) >= k); }
function crewOn(e, k){ return (e.off||[]).includes(k) ? [] : (e.crew?.[k] || []); }
// 공정: e.proc = {kind: {by:"ours"|"out", done, vendor, amount, date, booked, ...}} · 없는 공정은 '안 함'
//  방수: steps [1차,2차,3차] · 타일: stage ""(시공 전)|"doing"(시공 중)|"laid"(시공 완료)|"meji"(메지 완료), meji "normal"|"kera",
//        areas {bath|kitchen|entry|veranda: {size:[], method:[], jolly, base}} · 줄눈=타일 메지, 청소=메지에 포함
const PRESETS = [["full","전체 시공",["prot","demo","plumb","wp","tile","sani","dome"]],["tile","타일만",["tile"]]];
const AREAS = {bath:"화장실", kitchen:"주방", entry:"현관", veranda:"베란다"};
const SIZES = {s3030:"300각", s3060:"300×600", s6060:"600각", s1212:"1200각", mosaic:"모자이크", etc:"기타"}; // 숫자 이름은 순서가 바뀌어서 s를 붙임
const METHODS = {epoxy:"에폭시", bond:"본드", dry:"드라이", tteo:"떠발이"};
// 공간별로 쓰는 방법·추가 항목: 드라이·떠발이는 화장실만, 본드는 현관·베란다 안 씀, 졸리컷은 현관·베란다 안 씀
const AREA_RULE = {
  bath:    {method:["epoxy","bond","dry"], flags:[["jolly","졸리컷"],["gendai","젠다이"],["partition","파티션"]]},
  kitchen: {method:["epoxy","bond"],              flags:[["jolly","졸리컷"]]},
  entry:   {method:[],                            flags:[["base","걸레받이"]]},  // 현관·베란다는 방법 없음
  veranda: {method:[],                            flags:[["base","걸레받이"]]}};
const OLD_KIND = {tpre:"tile", tdone:"tile", tmeji:"tile", grout:"tile", set:"sani"}; // 예전 공정 코드 → 새 공정
const OUT_DEFAULT = ["demo","plumb","wp","sani","dome","elec"]; // 기본 외주: 철거·설비·방수·도기 세팅·돔천장
const newProc = k => { const p = {by: OUT_DEFAULT.includes(k) ? "out" : "ours", done:false, vendor:"", amount:0, date:"", booked:false, who:[], rooms:[], note:"", rnotes:{}};
  if (k === "wp"){ p.steps = [false,false,false]; p.coats = 3; } if (k === "tile"){ p.stage = ""; p.meji = "normal"; p.areas = {}; } return p; };
function normProc(k, v){
  const p = newProc(k); if (!v || typeof v !== "object") return p;
  p.by = v.by === "out" ? "out" : "ours"; p.done = !!v.done; p.vendor = String(v.vendor||""); p.amount = Number(v.amount)||0; p.date = String(v.date||""); p.booked = !!v.booked; p.bkd = {}; for (const [d, b] of Object.entries(v.bkd || {})) if (/^\d{4}-\d\d-\d\d$/.test(d)) p.bkd[d] = !!b; p.dd = {}; for (const [d, x] of Object.entries(v.dd || {})) if (/^\d{4}-\d\d-\d\d$/.test(d) && x && typeof x === "object") p.dd[d] = {amount: Number(x.amount) || 0, vendor: String(x.vendor || ""), paid: !!x.paid, paidDate: String(x.paidDate || "")}; p.paid = !!v.paid; p.paidDate = String(v.paidDate || ""); p.who = Array.isArray(v.who) ? v.who.filter(x => typeof x === "string") : [];
  p.rooms = Array.isArray(v.rooms) ? v.rooms.filter(x => typeof x === "string" && x) : []; p.note = String(v.note || "");  // rooms 비면 모든 욕실
  p.rnotes = {}; for (const [r, t] of Object.entries(v.rnotes || {})) if (t) p.rnotes[r] = String(t);
  if (v.opt && typeof v.opt === "object") p.opt = JSON.parse(JSON.stringify(v.opt)); // 공정별 세부 (순서대로 고르기)
  if (k === "wp"){ p.coats = [1,2,3].includes(v.coats) ? v.coats : 3; p.steps = [0,1,2].map(i => i < p.coats && !!(Array.isArray(v.steps) && v.steps[i])); if (p.done) p.steps = [0,1,2].map(i => i < p.coats); p.done = p.steps.slice(0, p.coats).every(Boolean); }
  if (k === "tile"){
    p.stage = ["doing","laid","meji"].includes(v.stage) ? v.stage : ""; p.meji = v.meji === "kera" ? "kera" : "normal"; p.mejiColor = String(v.mejiColor || "");
    for (const a of Object.keys(AREAS)){ const x = v.areas?.[a]; if (!x) continue;
      const R = AREA_RULE[a]; p.areas[a] = {size: (Array.isArray(x.size)?x.size:[]).filter(s => SIZES[s]), method: (Array.isArray(x.method)?x.method:[]).filter(m => R.method.includes(m))};
      for (const [f] of R.flags) p.areas[a][f] = !!x[f]; }
    if (p.done) p.stage = "meji"; p.done = p.stage === "meji";
  }
  return p;
}
// 기본 공정: 904는 바스(전체 공정), 다른 우리 사장(동식·희태)은 타일. 사장 정보에 bath 값이 있으면 그걸 따름
const bathOwner = c => { const l = S.comp.leaders.find(x => x.color === c); return !!l && (l.bath ?? l.name === "904"); };
function procOf(e, all){
  const p = {};
  if (!all && pr(e) !== 0) return p; // 연합 일: 타일 시공 지원만 → 공정 관리 안 함
  if (e.proc && typeof e.proc === "object"){
    const old = {};
    for (const [k,v] of Object.entries(e.proc)){
      if (KIND_LABEL[k]) p[k] = normProc(k, v);
      else if (OLD_KIND[k]) (old[OLD_KIND[k]] = old[OLD_KIND[k]] || []).push([k, v || {}]);
    }
    for (const [nk, list] of Object.entries(old)){ if (p[nk]) continue;
      const base = (list.find(([,v]) => v.by === "out") || list[0])[1]; const q = normProc(nk, {...base, done:false});
      if (nk === "tile"){ const d = c => list.some(([k,v]) => k === c && v.done); q.stage = (d("tmeji") || d("grout")) ? "meji" : d("tdone") ? "laid" : ""; q.done = q.stage === "meji"; }
      else q.done = list.every(([,v]) => v.done);
      p[nk] = q; }
  } else for (const k of (e.kinds||[])){ const nk = KIND_LABEL[k] ? k : OLD_KIND[k]; if (nk && !p[nk]) p[nk] = newProc(nk); }
  if (!all && !bathOwner(e.color)){ for (const k of Object.keys(p)) if (k !== "tile") delete p[k]; if (p.tile) p.tile.by = "ours"; } // 904 말고는 타일 시공만
  return p;
}
const procKeys = p => KINDS.map(([k])=>k).filter(k => p[k]);
function setDone(k, p, v){ p.done = v; if (k === "tile") p.stage = v ? "meji" : (p.stage === "meji" ? "laid" : p.stage); if (k === "wp" && v) p.steps = [0,1,2].map(i => i < p.coats); }
// 중간 단계 표시 (방수 2/3, 타일 메지 전)
function progOf(k, p){
  if (!p || p.done) return {half:false, txt:""};
  if (k === "wp"){ const n = p.steps.filter(Boolean).length; return n ? {half:true, txt:n+"/"+p.coats} : {half:false, txt:""}; }
  if (k === "tile" && p.stage === "doing") return {half:true, txt:"시공 중"};
  if (k === "tile" && p.stage === "laid") return {half:true, txt:"메지 전"};
  return {half:false, txt:""};
}
// 날짜별 공정: e.plan = {"YYYY-MM-DD": [단위...]} · 단위 = [코드, 이름, 공정, 짧은 이름]
const UNITS = [["prot","보양","prot","보양"],["demo","철거","demo","철거"],["plumb","설비","plumb","설비"],["elec","전기","elec","전기"],["wp1","액방","wp","액방"],["wp2","도막 1차","wp","도막1"],["wp3","도막 2차","wp","도막2"],
  ["tile","타일 시공","tile","타일"],["meji","메지","tile","메지"],["sani","도기 세팅","sani","도기"],["dome","돔천장","dome","돔"],["sil","실리콘","sil","실리콘"],["etc","기타","etc","기타"]];
const UNIT = Object.fromEntries(UNITS.map(([u,l,k,s], i) => [u, {l, k, s, i}]));
// 그날 외주가 하는 공정: 외주 공정 + 외주 철거와 같은 날 방수 1차(액방은 철거 팀이 같이 함)
// 그날만 따로 정한 게 있으면 그걸 따름: e.byDay = {날짜: {공정: "out"|"ours"}}
const unitOut = (u, P, dayUnits, e, k) => { const ov = e && k ? e.byDay?.[k]?.[u] : ""; if (ov) return ov === "out";
  return P[UNIT[u].k]?.by === "out" || (u === "wp1" && P.demo?.by === "out" && (dayUnits || []).includes("demo")); };
// 같은 날 같이 하는 공정은 하나로 묶어서 보여줌: 철거+방수1차 → "철거/방수", 보양은 1시간이라 그날 다른 공정에 붙임 → "보양+…"
function unitGroups(e, d, us){
  const tag = u => roomTag(e, d, u) || ""; let rest = [...us].sort((a, b) => UNIT[a].i - UNIT[b].i); const G = [];
  if (rest.includes("demo") && rest.includes("wp1") && tag("demo") === tag("wp1")){ G.push(["demo", "wp1"]); rest = rest.filter(x => x !== "demo" && x !== "wp1"); }
  const prot = rest.includes("prot"); rest = rest.filter(x => x !== "prot"); for (const u of rest) G.push([u]);
  G.sort((a, b) => UNIT[a[0]].i - UNIT[b[0]].i);
  if (prot){ const g = G.find(g => tag(g[0]) === tag("prot")) || G[0]; if (g) g.unshift("prot"); else G.push(["prot"]); }
  const lab = (g, f) => { const o = g.filter(u => u !== "prot").map(u => UNIT[u][f]).join("/");
    return g.includes("prot") ? (o ? "보양+" + o : UNIT.prot[f]) : o; };
  return G.map(g => ({us: g, s: lab(g, "s"), l: lab(g, "l")}));
}
const unitsOf = P => UNITS.filter(([u,,k]) => P[k] && !(k === "wp" && Number(u[2]) > P[k].coats)).map(([u]) => u); // 방수는 정한 차수까지만
function unitDone(u, P){ const p = P[UNIT[u].k]; if (!p) return false;
  if (u.startsWith("wp")) return !!p.steps[Number(u[2]) - 1];
  if (u === "tile") return p.stage === "laid" || p.stage === "meji";
  if (u === "meji") return p.stage === "meji";
  return p.done; }
const isWknd = k => { const w = wdOf(k); return w === 0 || w === 6 || !!HOL[k]; };
function planOf(e, P){
  P = P || procOf(e); const ok = new Set(unitsOf(P)), out = {}, end = evEnd(e);
  for (const [d, arr] of Object.entries(e.plan || {})){ if (d < e.start || d > end) continue;
    const a = (Array.isArray(arr) ? arr : []).filter(u => ok.has(u)).sort((x,y) => UNIT[x].i - UNIT[y].i); if (a.length) out[d] = a; }
  return out;
}
// 그 공정이 잡힌 날들 (방수 1~3차, 타일 시공·메지 포함)
const kindDays = (plan, k) => Object.keys(plan).filter(d => plan[d].some(u => UNIT[u].k === k)).sort();
// 순서가 뒤바뀐 곳: 앞 공정의 마지막 날보다 뒤 공정의 첫날이 빠르면
// 같은 날 하면 안 되는 조합 (마르는 시간·먼지 등)
function sameDayClash(x, y){
  const K = u => UNIT[u].k, has = (a, b) => (K(x)===a && K(y)===b) || (K(x)===b && K(y)===a);
  const L = `${UNIT[x].l}·${UNIT[y].l} 같은 날`;
  if (K(x)==="wp" && K(y)==="wp") return `${L}: 방수는 말린 뒤 다음 차수`;
  if (K(x)==="wp" || K(y)==="wp"){ const o = K(x)==="wp" ? y : x; if (K(o)==="demo" && (x === "wp1" || y === "wp1")) return ""; /* 철거+액방(방수 1차)은 같이 하는 경우가 많음 */ if (K(o)==="demo") return `${L}: 철거한 날 방수는 무리`; if (["tile","sani","dome"].includes(K(o))) return `${L}: 방수한 날 ${UNIT[o].l}는 무리`; }
  if (has("demo","tile")) return `${L}: 철거한 날 타일은 무리`;
  if (has("plumb","wp")) return `${L}: 설비는 방수 전에 끝나야 해요 (방수 뒤 설비면 방수층 손상)`;
  if ((x==="tile" && K(y)==="sani") || (y==="tile" && K(x)==="sani")) return `${L}: 타일 시공 날 도기 세팅은 무리`;
  return "";
}
function planCheck(plan, off){
  const first = {}, last = {}, bad = new Set(), msgs = [];
  for (const d of Object.keys(plan).sort()) for (const u of plan[d]){ if (!first[u]) first[u] = d; last[u] = d; }
  const us = Object.keys(first).sort((a,b) => UNIT[a].i - UNIT[b].i);
  for (let i=0; i<us.length; i++) for (let j=i+1; j<us.length; j++){ const a = us[i], b = us[j];
    if (UNIT[a].k === "prot" || UNIT[b].k === "prot") continue;                       // 보양은 순서 상관없음
    if (UNIT[a].k === UNIT[b].k && !a.startsWith("wp") && !(a === "tile" && b === "meji")) continue;
    if (first[b] < last[a]){ bad.add(first[b]); msgs.push(`${UNIT[b].l}(${md(first[b])})이 ${UNIT[a].l}(${md(last[a])})보다 먼저예요`); } }
  for (const d of Object.keys(plan).sort()){
    if ((off||[]).includes(d)){ bad.add(d); msgs.push(`${md(d)}은 쉬는 날인데 공정이 잡혀 있어요`); }
    const a = plan[d].filter(u => u !== "prot"); // 보양은 빼고 셈
    if (a.length > 2){ bad.add(d); msgs.push(`${md(d)} 하루에 공정이 ${a.length}개예요`); }
    for (let i=0; i<a.length; i++) for (let j=i+1; j<a.length; j++){ const why = sameDayClash(a[i], a[j]); if (why){ bad.add(d); msgs.push(`${md(d)} ${why}`); } }
  }
  return {bad, msgs};
}
const planWarn = (plan, off) => planCheck(plan, off).msgs;
const issueKey = msgs => msgs.join("|");
const APT_WORD = /(써밋|우미린|해링턴|하이빌|스타씨티|코아루|홈타운|e그린|하늘채|아파트|빌라|맨션|타운|캐슬|자이|푸르지오|래미안|힐스테이트|아이파크|편한세상|더샵|센트럴|하이츠|팰리스|오피스텔|스위첸|데시앙|서밋|리버뷰|파크|빌|하우스)/;
// 주소에서 현장 대표 이름: "범물동 우방아파트 101동 1203호" → "범물 우방"
const APT_BRAND = ["호반써밋","써밋","우미린","해링턴","하이빌","스타씨티","코아루","부영","금호","e편한세상","힐스테이트","아이파크","푸르지오","래미안","롯데캐슬","더샵","자이","우방","화성","태왕","서한","청구","코오롱","월드메르디앙","SK뷰","센트레빌","데시앙","스위첸","하늘채","에일린의뜰","유림","보성","동서","궁전","한신","삼정","영남","협성","경남","대림","쌍용","한라","두산","현대","삼성","대우","포스코"];
function aptShort(w, dong){
  const b = APT_BRAND.find(x => w.includes(x)); if (b) return b;
  let t = w.replace(/(아파트|APT|apt)$/,"");
  for (let i=0; i<3; i++) t = t.replace(/(드림시티|시티|타운|맨션|빌라|하이츠|팰리스|파크|단지|빌|하우스|그린|센트럴|리버뷰|1차|2차|3차|\d+차)$/,"");
  const d = dong.replace(/\d*(동|가|리)$/,""); if (d && t.startsWith(d) && t.length > d.length) t = t.slice(d.length);
  return (t || w).slice(0, 6);
}
function addrRep(a){
  const t = String(a||"").replace(/[(),·]/g, " ").split(/\s+/).filter(Boolean); let dong = "", apt = "";
  for (const w of t){
    if (!dong && /^[가-힣]+[0-9]*(동|가|리|읍|면)$/.test(w)) { dong = w; continue; }       // 범물동, 범어1동 (101동은 숫자로 시작해서 제외)
    if (!apt && /^[가-힣A-Za-z]/.test(w) && (APT_WORD.test(w) || APT_BRAND.some(x => w.includes(x))) && !/(로|길|동|호|층)$/.test(w)) apt = w;
  }
  if (!apt && dong){ const n = t[t.indexOf(dong)+1]; if (n && /^[가-힣A-Za-z]/.test(n) && !/(로|길|동|호|층|번지)$/.test(n)) apt = n; }
  let d = dong.replace(/\d*(동|읍|면)$/,"").replace(/(가|리)$/, m => m);                 // "범물동" → "범물", "석적읍" → "석적"
  if (dong && d.length < 2) d = dong;                                                    // "인동" → 그대로 "인동"
  if (d || apt) return [d, apt ? aptShort(apt, dong) : ""].filter(Boolean).join(" ");
  const i = t.findIndex(w => /(시|구|군)$/.test(w)); const r = t[i + 1] || t[0] || "";      // 도로명만: "동성로 12" → "동성로"
  return r.replace(/(로|길)\d*$/, m => m);
}
// 일정 제목: 업체-주소대표 (소비자면 사장 이름-주소). 이미 '업체-' 꼴이면 그대로 둠
function titleOf(e){
  if (e.titleKeep) return e.title;
  const rep = addrRep(e.addr); if (!rep) return e.title;
  const l = leaderByColor(e.color), c = String(clientOf(e) || "").trim(), head = c && c !== "소비자" ? c : (l ? l.name : "");
  if (!head || String(e.title || "").startsWith(head + "-") || head.includes(rep)) return e.title;
  return `${head}-${rep}`;
}
const defaultKinds = c => bathOwner(c) ? PRESETS[0][2] : ["tile"];
// 일 준 곳: 직접 넣은 값, 없으면 제목(타임트리에서 가져온 일정은 제목 = 업체, 색 = 누구 현장). 괄호 안 설명은 뺌
function clientOf(e){
  if (String(e.client||"").trim()) return String(e.client).trim();
  const t = String(e.title||"").replace(/\(.*?\)|（.*?）/g, "").trim();
  if (!t || t === "제목 없음" || S.comp.leaders.some(l => t === l.name || t.startsWith(l.name + " "))) return "";
  if (/^소비자/.test(t)) return "소비자";
  if (t.includes("-")) return t.split("-")[0].trim();
  return t;
}
const isBathRoom = r => /욕실/.test(r);
// 외주 공정(철거·방수·설비·도기·돔 등)은 욕실만 나눔 (외욕실·내욕실) · 우리 타일 시공은 베란다·현관 등 전체 구역
const roomsFor = (e, p) => { const R0 = e.rooms || []; if (!p || p.by !== "out") return R0; const B = R0.filter(isBathRoom); return B.length ? B : R0; };
const procRooms = (e, p) => { const R = roomsFor(e, p); return !R.length ? [] : (p.rooms && p.rooms.length ? p.rooms.filter(r => R.includes(r)) : R); };
// 외주 업체에 보낼 전달 문구
function handoffText(e, k, p, plan){
  const L = [`[${e.title || "현장"}] ${KIND_LABEL[k]}`]; if (e.addr) L.push(`주소: ${e.addr}`);
  const ds = kindDays(plan, k); if (ds.length) L.push(`날짜: ${ds.map(d => `${md(d)}(${WD[wdOf(d)]})`).join(", ")}`);
  const rs = procRooms(e, p); if (rs.length) L.push(`공간: ${rs.join(", ")}`);
  if (p.note) L.push(p.note);
  for (const r of rs) if (p.rnotes?.[r]) L.push(`- ${r}: ${p.rnotes[r]}`);
  for (const r of rs){ const x = e.zoneSpec?.[r]; const sc = [...(x?.scope || []), x?.scopeNote || ""].filter(Boolean); if (sc.length) L.push(`- ${r} 범위: ${sc.join(", ")}`); } // 욕실 시공 범위 (없으면 전체)
  for (const r of rs){ const a = p.opt?.byRoom?.[r]; if (a && a.length && !a.includes("안 함")) L.push(`- ${r}: ${a.join(", ")}`); } // 욕실별 설비 항목
  if (k === "demo") for (const r of rs){ const x = e.zoneSpec?.[r]; if (!p.opt?.byRoom?.[r] && x?.work === "철거 후 시공") L.push(`- ${r}: ${x.demo === "올철거" ? "전체 철거" : (x.demo || "철거")}`); }
  for (const [f, v] of Object.entries(p.opt || {})) if (f !== "byRoom" && f !== "업체철거" && f !== "auto" && v && (!Array.isArray(v) || v.length)) L.push(`${f}: ${Array.isArray(v) ? v.join(", ") : v}`);
  if (k === "tile" && tileSpec(p)) L.push(`타일: ${tileSpec(p)}`);
  return L.join("\n");
}
// 견적 보낼 것
const qreqOf = e => (Array.isArray(e.qreq) ? e.qreq : []).filter(x => x && x.t).map(x => ({t: String(x.t), done: !!x.done}));
function qreqTodo(){ const list = []; for (const e of S.events.values()){ if (pr(e) !== 0) continue; const q = qreqOf(e).filter(x => !x.done); if (q.length) list.push({e, q}); } return list.sort((a,b) => a.e.start.localeCompare(b.e.start)); }
const leaderByColor = c => S.comp.leaders.find(l => l.color === c) || null;
const matOf = e => ({by: e.mat?.by === "ours" ? "ours" : "client", ready: !!e.mat?.ready, note: String(e.mat?.note || "")});
// 우리 현장에서 아직 안 적은 정보 (연합 일은 확인 안 함)
function missingInfo(e, P){
  const m = []; if (pr(e) !== 0) return m;
  P = P || procOf(e); const ks = procKeys(P), plan = planOf(e, P);
  if (!clientOf(e)) m.push({k:"client", l:"일 준 곳"});
  if (!String(e.addr||"").trim()) m.push({k:"addr", l:"주소"});
  if (!String(e.pw||"").trim() && !e.nopw) m.push({k:"pw", l:"비밀번호"});
  const mt = matOf(e); if (mt.by === "ours" && !mt.ready) m.push({k:"mat", l:"우리 자재 준비"});
  const tileSite = !bathOwner(e.color) && ks.every(k => k === "tile"); // 동식·희태는 보통 타일만 → 공정·타일 날짜는 안 적어도 됨
  if (!ks.length){ if (!tileSite) m.push({k:"proc", l:"공정"}); }
  else if (!tileSite) { const nd = unitsOf(P).filter(u => !Object.values(plan).some(a => a.includes(u)) && !unitDone(u, P));
    if (nd.length) m.push({k:"plan", l:`공정 날짜 ${nd.length}개`});
    const nv = ks.filter(k => P[k].by === "out" && !P[k].vendor && !P[k].done);
    if (nv.length) m.push({k:"vendor", l:`외주 업체 ${nv.map(k => KIND_LABEL[k]).join("·")}`}); }
  return m;
}
const prepIssues = e => missingInfo(e).map(x => x.l + " 미입력");
function prepTodo(){
  const tk = todayK(), lim = addD(tk, 14), list = [];
  for (const e of S.events.values()){ if (evEnd(e) < tk || e.start > lim) continue; const m = prepIssues(e); if (m.length) list.push({e, m, left: diff(tk, e.start)}); }
  return list.sort((a,b) => a.e.start.localeCompare(b.e.start));
}
// 이 현장의 공정 경고, 확인하고 '그대로 진행'한 경고면 ok:true (경고 내용이 바뀌면 다시 뜸)
// 날짜 없는 공정 임시 배치: 공정 순서대로 앞 공정 다음 평일(메지는 주말 가능), 빈 날에. 날짜가 하나라도 잡힌 현장만.
function projectPlan(e, P, plan){
  const tent = {}, over = [], end = evEnd(e), off = e.off || [];
  if (!Object.keys(plan).length) return {tent, over};
  const busy = d => (plan[d]||[]).length || (tent[d]||[]).length;
  let cur = e.start, used = false;
  for (const u of unitsOf(P)){
    const days = Object.keys(plan).filter(d => plan[d].includes(u)).sort();
    if (days.length){ const l = days[days.length-1]; if (!used || l > cur) cur = l; used = true; continue; }
    if (unitDone(u, P)) continue;
    let d = used ? addD(cur, 1) : cur, n = 0;
    if (u === "prot"){ (tent[cur] = tent[cur] || []).push(u); continue; }   // 보양은 다음 공정과 같은 날
    const sameCrew = P.sani && P.dome && (P.sani.by !== "out" && P.dome.by !== "out" || (P.sani.by === "out" && P.dome.by === "out" && P.sani.vendor && norm(P.sani.vendor) === norm(P.dome.vendor)));
    if (u === "dome" && used && sameCrew && [...(plan[cur]||[]), ...(tent[cur]||[])].includes("sani")){ (tent[cur] = tent[cur] || []).push(u); if (cur > end) over.push({u, d: cur}); continue; } // 돔은 도기 세팅과 같은 업체(또는 둘 다 우리)일 때만 같은 날 · 업체가 다르면 따로
    while (n++ < 90 && ((isWknd(d) && u !== "meji") || off.includes(d) || busy(d))) d = addD(d, 1);
    (tent[d] = tent[d] || []).push(u); cur = d; used = true;
    if (d > end) over.push({u, d});
  }
  return {tent, over};
}
const mergePlan = (a, b) => { const m = {}; for (const src of [a, b]) for (const [d, us] of Object.entries(src)) m[d] = [...(m[d]||[]), ...us].sort((x,y) => UNIT[x].i - UNIT[y].i); return m; };
// 다른 현장과 겹치는 것 + 날짜 지난 공정
function crossIssues(e, P, plan){
  const m = [], tk = todayK(), end = evEnd(e), nm = s => norm(s);
  for (const k of range(e.start, end)){                         // 같은 사람 두 현장
    const ids = crewOn(e, k); if (!ids.length) continue;
    for (const o of eventsOn(k)){ if (o.id === e.id) continue;
      const mvd = crewOn(o, k).filter(id => ids.includes(id) && ((e.split?.[k] || []).includes(id) || (o.split?.[k] || []).includes(id)));
      const la = evLeader(e)?.name || "?", lb = evLeader(o)?.name || "?";
      if (mvd.length && la !== lb) m.push(`${md(k)} ${mvd.map(id => S.workers.get(id)?.name || "?").join("·")} 이동 · 고용주가 달라요 (${la} ↔ ${lb} · ${o.title||"다른 현장"})`); // 같은 고용주면 이동 OK
      const both = crewOn(o, k).filter(id => ids.includes(id) && !(e.split?.[k] || []).includes(id) && !(o.split?.[k] || []).includes(id)); // 이동 표시한 사람은 빼고
      if (both.length) m.push(`${md(k)} ${both.map(id => S.workers.get(id)?.name || "?").join("·")} ${o.title||"다른 현장"}에도 배정돼 있어요`); } }
  for (const k of procKeys(P)){ const p = P[k]; if (p.by !== "out" || !p.vendor || p.done) continue;   // 같은 외주 업체 같은 날
    for (const d of kindDays(plan, k)) for (const o of eventsOn(d)){ if (o.id === e.id || pr(o) !== 0) continue; const OP = procOf(o), opl = planOf(o, OP);
      const hit = procKeys(OP).filter(x => OP[x].by === "out" && nm(OP[x].vendor) === nm(p.vendor) && kindDays(opl, x).includes(d));
      if (hit.length) m.push(`${md(d)} 외주 ${p.vendor} ${o.title||"다른 현장"} ${hit.map(x => KIND_LABEL[x]).join("·")} 일정과 겹쳐요`); } }
  for (const u of unitsOf(P)){ if (unitDone(u, P)) continue;     // 날짜 지났는데 완료 안 됨
    const ds = Object.keys(plan).filter(d => plan[d].includes(u) && !((e.doneDays || {})[d] || []).includes(u)).sort(); const last = ds[ds.length-1]; // 짜보기판에서 그날 완료 표시한 건 뺌
    if (last && last < tk) m.push(`${UNIT[u].l}(${md(last)}) 날짜가 지났는데 완료 체크가 안 됐어요`); }
  return [...new Set(m)];
}
// 욕실 구분: e.planRoom = {날짜: {공정: "내욕실"}} · 태그 없으면 모든 욕실 공통
const roomTag = (e, d, u) => (e.planRoom && e.planRoom[d] && e.planRoom[d][u]) || "";
const multiRoom = e => (e.rooms || []).length > 1;
function roomSub(e, plan, room){ const o = {}; for (const [d, us] of Object.entries(plan)){ const a = us.filter(u => { const t = roomTag(e, d, u); return !t || t === room; }); if (a.length) o[d] = a; } return o; }
function issuesOf(e, P){
  P = P || procOf(e); const plan = planOf(e, P), pj = projectPlan(e, P, plan);
  // 날짜가 하나도 없는 공정은 임시 날짜로 순서 검사하지 않고 '○○ 날짜가 없어요' 한 줄로
  const noDate = Object.keys(plan).length ? procKeys(P).filter(k => !P[k].done && !kindDays(plan, k).length && unitsOf(P).some(u => UNIT[u].k === k && !unitDone(u, P))) : [];
  const tentChk = {}; for (const [d, us] of Object.entries(pj.tent)){ const a = us.filter(u => !noDate.includes(UNIT[u].k)); if (a.length) tentChk[d] = a; }
  const all = mergePlan(plan, tentChk);
  let c;
  if (multiRoom(e) && e.planRoom){ const bad = new Set(), msgs = []; // 욕실마다 따로 순서 검사
    for (const r of e.rooms){ const x = planCheck(roomSub(e, all, r), e.off); x.bad.forEach(d => bad.add(d)); x.msgs.forEach(m => msgs.push(`${r} · ${m}`)); }
    const seen = new Set(); c = {bad, msgs: msgs.filter(m => { const k = m.replace(/^[^·]+ · /, ""); if (seen.has(k)) return false; seen.add(k); return true; }).map(m => e.rooms.every(r => msgs.includes(`${r} · ${m.replace(/^[^·]+ · /, "")}`)) ? m.replace(/^[^·]+ · /, "") : m)}; }
  else c = planCheck(all, e.off);
  if (noDate.length) c.msgs.unshift(`${noDate.map(k => KIND_LABEL[k]).join("·")} 날짜가 없어요${noDate.every(k => P[k].by === "out") ? " (외주)" : ""}`);
  for (const o of pj.over) if (!noDate.includes(UNIT[o.u].k)) c.msgs.push(`${UNIT[o.u].l}이 현장 기간(${md(evEnd(e))}) 안에 안 들어가요 · 임시 ${md(o.d)}`);
  c.msgs.push(...crossIssues(e, P, plan));
  // 경고마다 따로 '그대로 진행' (e.planAck = 확인한 경고 글) · 예전 방식(planOk = 전부 한 번에)도 그대로 인정
  const allM = c.msgs, ack = new Set([...(Array.isArray(e.planAck) ? e.planAck : []), ...(e.planOk && e.planOk === issueKey(allM) ? allM : [])]);
  const open = allM.filter(m => !ack.has(m)), acked = allM.filter(m => ack.has(m));
  return {...c, msgs: open, acked, all: allM, tent: pj.tent, over: pj.over, ok: !open.length && !!acked.length};
}
function issueTodo(){
  const tk = todayK(), list = [];
  for (const e of S.events.values()){ if (pr(e) !== 0 || evEnd(e) < tk) continue; const c = issuesOf(e); if (c.msgs.length && !c.ok) list.push({e, c}); }
  return list.sort((a,b) => a.e.start.localeCompare(b.e.start));
}
function tileSpec(p){
  if (!p) return "";
  const parts = Object.keys(AREAS).filter(a => p.areas[a]).map(a => { const x = p.areas[a];
    return [AREAS[a], ...x.size.map(s => SIZES[s]), ...x.method.map(m => METHODS[m]), ...AREA_RULE[a].flags.filter(([f]) => x[f]).map(([,l]) => l)].join(" "); });
  if (p.meji === "kera") parts.push("케라폭시");
  if (p.mejiColor) parts.push("줄눈 " + p.mejiColor);
  return parts.join(" · ");
}
// 오늘 다음 날부터 작업일 전날까지의 영업일 수 (주말·공휴일 제외) = 외주 일정 잡을 수 있는 여유
// 외주 연락은 날짜마다 따로 (예: 도기 23일 외욕실 · 28일 내욕실): p.bkd = {날짜: true/false} · 없으면 p.booked
const bkOn = (p, d) => !!p && (d && p.bkd && d in p.bkd ? !!p.bkd[d] : !!p.booked);
function setBooked(e, P, k, ds, v){ const p = P[k]; if (!p) return; const all = kindDays(planOf(e, P), k); p.bkd = p.bkd || {};
  for (const d of all) if (!(d in p.bkd)) p.bkd[d] = !!p.booked; // 지금 상태를 날짜별로 풀어 두고
  for (const d of ds) p.bkd[d] = v; p.booked = all.length ? all.every(d => p.bkd[d]) : v; }
// 외주 금액·업체·지급도 날짜(작업)마다 따로: p.dd = {날짜: {amount, vendor, paid, paidDate}}
// 아직 날짜별로 안 나눈 예전 값은 그 공정 첫날 것으로 봄 (다른 날엔 금액 없음)
const hasDD = p => !!p?.dd && Object.keys(p.dd).length > 0;
function ddOf(e, P, k, d){ const p = P[k] || {}; if (hasDD(p)){ const x = p.dd[d]; return x ? {...x} : {amount: 0, vendor: p.vendor || "", paid: false, paidDate: ""}; }
  const f = kindDays(planOf(e, P), k)[0]; return !f || !d || d === f ? {amount: Number(p.amount) || 0, vendor: p.vendor || "", paid: !!p.paid, paidDate: p.paidDate || ""} : {amount: 0, vendor: p.vendor || "", paid: false, paidDate: ""}; }
function setDD(e, P, k, d, patch){ const p = P[k]; if (!p) return; const days = kindDays(planOf(e, P), k);
  if (!hasDD(p) && (days.length <= 1 || !d)){ Object.assign(p, patch); return; } // 하루짜리는 그냥 공정 값
  if (!hasDD(p)){ p.dd = {}; const f = days[0] || d; p.dd[f] = {amount: Number(p.amount) || 0, vendor: p.vendor || "", paid: !!p.paid, paidDate: p.paidDate || ""}; }
  p.dd[d] = {...(p.dd[d] || {amount: 0, vendor: p.vendor || "", paid: false, paidDate: ""}), ...patch};
  const L = Object.values(p.dd); p.amount = L.reduce((s, x) => s + (Number(x.amount) || 0), 0); p.paid = L.every(x => x.paid); p.paidDate = p.paid ? L.map(x => x.paidDate).sort().pop() || "" : "";
  const vs = [...new Set(L.map(x => x.vendor).filter(Boolean))]; if (vs.length) p.vendor = vs.includes(p.vendor) ? p.vendor : vs[0]; }
function bizDays(from, to){ let n = 0, d = addD(from, 1), g = 0; while (d < to && g++ < 400){ if (!isWknd(d)) n++; d = addD(d, 1); } return n; }
// 외주 연락 필요: 외주인데 아직 '일정 잡음'도 '완료'도 아닌 것 (끝난 현장 제외), 급한 순
function outTodo(){
  const tk = todayK(), list = [];
  for (const e of S.events.values()){ if (evEnd(e) < tk) continue; const P = procOf(e);
    for (const k of procKeys(P)){ const p = P[k]; if (p.by !== "out" || p.done) continue;
      const kd = kindDays(planOf(e, P), k); let need;
      if (kd.length){ need = kd.find(d => !bkOn(p, d)); if (!need) continue; } else { if (p.booked) continue; need = p.date || e.start; } const biz = bizDays(tk, need); list.push({e, k, p, need, left: diff(tk, need), biz, level: biz < 4 ? "urgent" : biz < 7 ? "warn" : ""}); } }
  return list.sort((a,b) => a.need.localeCompare(b.need));
}
const unionLeaders = () => S.comp.leaders.filter(l => !l.ours);
const teamOf = w => { const t = w?.team || ""; return t && unionLeaders().some(l => l.name === t) ? t : ""; };
// 현장 순서: 904 → 동식(준디자인 등) → 희태 → 그 밖(연합)
const ownerRank = e => { const n = (S.comp?.leaders || []).find(l => l.color === e.color)?.name || ""; const i = ["904", "동식", "희태"].indexOf(n); return i < 0 ? 3 : i; };
// 전에 쓴 외주 업체 이름: 그 공정에 쓴 업체 먼저(많이 쓴 순), 그다음 다른 공정 업체
// 같이 맡길 수 있는 공정끼리만 업체를 보여줌: 철거 업체는 방수·설비까지 · 도기·돔·전기·타일은 따로
const VENDOR_GROUP = {demo:["demo","wp","plumb"], wp:["wp","demo"], plumb:["plumb","demo"], elec:["elec"], sani:["sani"], dome:["dome"], tile:["tile"], prot:["prot","demo"], sil:["sil"], etc:["etc"]};
function vendorsOf(k){ const ok = new Set(VENDOR_GROUP[k] || [k]), by = new Map(), near = new Map();
  for (const e of S.events.values()) for (const [kk, p] of Object.entries(e.proc || {})){ const v = String(p?.vendor || "").trim(); if (!ok.has(kk)) continue; for (const x of Object.values(p?.dd || {})) if (x?.vendor && x.vendor !== v) (kk === k ? by : near).set(x.vendor, ((kk === k ? by : near).get(x.vendor) || 0) + 1); if (!v) continue;
    if (kk === k) by.set(v, (by.get(v) || 0) + 1); else near.set(v, (near.get(v) || 0) + 1); }
  const s = m => [...m.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  return [...new Set([...s(by), ...s(near)])].slice(0, 12); }
const vendorChips = (k, attr, cur) => { const L = vendorsOf(k).filter(v => v !== cur); return L.length ? `<div class="vchips"><small>전에 쓴 업체</small>${L.map(v => `<button type="button" class="vchip" ${attr}="${k}" data-v="${esc(v)}">${esc(v)}</button>`).join("")}</div>` : ""; };
const evLeader = e => S.comp.leaders.find(l => l.color === e.color) || null;
// 희태·동식·성욱은 공동사장 → 어느 현장이든 일당 없음 (순익을 나눔), 지영·연합원만 인건비
const OWNERS = ["희태", "동식", "성욱"];
const is904 = e => (evLeader(e)?.name || "") === "904";
// 일당 없음: 904 현장의 공동사장 3명 · 동식·희태 현장은 그 현장 사장 본인만 (다른 사장이 가면 일당 줌)
const noWage = (e, w) => { const n = w?.name || ""; if (teamOf(w)) return false; return is904(e) ? OWNERS.includes(n) : (evLeader(e)?.name || "") === n; };
// 이동: 같은 날 두 현장을 오가는 사람 (어느 한쪽 일정에 표시하면 둘 다 적용)
function movedOn(k, id){ for (const o of eventsOn(k)) if ((o.split?.[k] || []).includes(id) && crewOn(o, k).includes(id)) return true; return false; }
function siteLabor(e, first, last){ // 이 현장 인건비 (기간 지정 가능) · 이동한 날은 반씩
  let total = 0, days = 0;
  for (const [k, ids] of Object.entries(e.crew||{})){
    if (k < e.start || k > evEnd(e) || (e.off||[]).includes(k) || (first && k < first) || (last && k > last)) continue;
    for (const id of ids){ const w = S.workers.get(id); if (!w || noWage(e, w)) continue; const h = movedOn(k, id) && eventsOn(k).filter(o => crewOn(o, k).includes(id)).length > 1 ? 0.5 : 1; total += wageOf(w) * h; days += h; }
  }
  return {total, days};
}
function monthPay(y, m){ // 오늘까지 실제로 일한 날만 (앞으로 예정된 배정은 금액에 안 넣음)
  const first = key(new Date(y,m,1)), last = [key(new Date(y,m+1,0)), todayK()].sort()[0];
  const byW = new Map();  // 우리가 일당 주는 날: workerId -> Map(date -> 현장)
  const earn = new Map(); // 우리 팀이 연합 일 나간 날: leader -> [{id,date,title}]
  for (const e of S.events.values()){
    if (!is904(e)) continue; // 인건비 정산은 904 현장에 온 사람만 (동식·희태·연합 현장은 따로)
    const ours = pr(e) === 0;
    for (const [k, ids] of Object.entries(e.crew||{})){
      if (k < first || k > last || k < e.start || k > evEnd(e) || (e.off||[]).includes(k)) continue;
      for (const id of ids){
        const w = S.workers.get(id); const union = !!teamOf(w);
        if ((ours || !union) && !noWage(e, w)){ if(!byW.has(id)) byW.set(id,new Map()); byW.get(id).set(k, e.title||""); }
        if (!ours && !union){ const ln = evLeader(e)?.name || "연합"; if(!earn.has(ln)) earn.set(ln,[]); earn.get(ln).push({id, date:k, title:e.title||""}); }
      }
    }
  }
  const rows = [...byW.entries()].map(([id, mp]) => {
    const w = S.workers.get(id); const days=[...mp.keys()].sort();
    return {id, w, days, sites: mp, team: teamOf(w), wage: wageOf(w), total: days.length * wageOf(w)};
  }).sort((a,b) => (a.team?1:0)-(b.team?1:0) || a.team.localeCompare(b.team,"ko") || GROUPS.indexOf(groupOf(a.w)) - GROUPS.indexOf(groupOf(b.w)) || (a.w?.name||"").localeCompare(b.w?.name||"","ko"));
  const sum = rs => rs.reduce((s,r)=>s+r.total,0);
  const own = rows.filter(r=>!r.team), uni = rows.filter(r=>r.team);
  const earnRows = [...earn.entries()].map(([leader, list]) => ({leader, list: list.sort((a,b)=>a.date.localeCompare(b.date)), days: list.length}));
  return {rows, own, uni, ownTotal: sum(own), uniTotal: sum(uni), earnRows, total: sum(rows), mandays: rows.reduce((s,r)=>s+r.days.length,0)};
}

