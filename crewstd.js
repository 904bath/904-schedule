/* 904 캘린더 · 예상 견적 탭 (관리 → 예상 견적) · 30평대 기준
   자주 하는 현장 조합(구역 여러 개 + 구역별 시공 내용)을 만들어 목록에 저장 → 시간 날 때 총 인원(기공·준기공·조공·일수) 채움
   같은 조합은 중복이라고 알려줌 · 안 적은 조합은 적어 둔 것들로 추정 (가장 비슷한 조합 + 항목별 영향 차이, ridge 회귀)
   저장: config/estcases {cases:[{id, name, zones:[{name, spec}], gi, jun, jo, days, note}]}
   (event.js의 ZONES_ALL · ZS_* · zsSizes · zsOptList · zsHeavy · zsFloor · zsOptTxt · ZS_JOLLY를 씀) */
const EC_COLS = [["gi", "기공"], ["jun", "준기공"], ["kyung", "경력"], ["jo", "조공"]]; // 일수는 안 따짐
// 사장님 기준: 기공(·준기공)은 욕실 칸마다 붙어서 칸 수만큼 늘고 (1칸 1.5공수 → 2칸 3공수)
//            조공(·경력)은 현장당 — 칸이 늘어도 1명이 같이 받침 (1칸 1공수 → 2칸도 1공수)
const EC_PERJOB = new Set(["jo", "kyung"]);
// 사장님이 알려준 현장 기준 → 적어 둔 조합에 아직 없는 항목일 때 추정에 더함 (욕실 1칸당)
// · 졸리컷이 들어가면 젠다이만 있어도 최소 경력조공 1명이 졸리를 쳐야 함 · 화장실 2칸이면 오후 1~2시까지
// · 일당은 하루 단위라 0.3품만 일하고 보낼 수 없음 → 현장에 경력 1명(하루)을 잡음 (1칸이든 2칸이든 1명 · 졸리 끝나면 다른 일)
const EC_PRIOR = {"bath:jolly:젠다이": {kyung: 1, perJob: true, why: "졸리컷(젠다이) · 경력조공 1명 하루 (2칸이면 오후 1~2시까지 졸리, 나머지는 다른 일)"}};
S.estRules = []; let erLast = "";
S.estCases = []; S.estBase = []; S.estFixed = new Map();
// 고정 인원은 따로 만든 저장 공간(estfixed 모음, 조합마다 문서 1개)에 저장 → 조합 목록(config/estcases)에 그 인원을 덮어 보여줌
function ecMerge(){ const ids = new Set(S.estBase.map(c => c.id));
  S.estCases = [...S.estBase.filter(c => !S.estFixed.get(c.id)?.deleted).map(c => { const f = S.estFixed.get(c.id); if (!f) return c; if (f.unfixed){ const r = {...c}; for (const [k] of EC_COLS) delete r[k]; delete r.src; return r; } const r = {...c, src: "user", updatedAt: f.updatedAt || c.updatedAt}; delete r.why; for (const [k] of EC_COLS){ if (f[k] != null) r[k] = f[k]; else delete r[k]; } return r; }),
    ...[...S.estFixed.values()].filter(f => !f.unfixed && !f.deleted && !ids.has(f.id) && (f.zones || []).length).map(f => ({...f, src: "user"}))];
  if (S.tab === "est" && !E.edit){ ecTapLock = Date.now(); renderEst(); } }
let ecTapLock = 0; // 목록이 다시 그려진 직후엔 카드 위치가 바뀌어서, 잠깐 저장·삭제·되돌리기 누름을 무시 (엉뚱한 카드 저장 방지)
async function ecFixSave(rec){
  if (!S.db){ toast("미리보기에서는 저장되지 않아요"); return false; }
  const doc = {id: rec.id, name: rec.name || "", note: rec.note || "", zones: rec.zones || [], updatedAt: new Date().toISOString()};
  for (const [k] of EC_COLS) if (rec[k] != null) doc[k] = rec[k];
  const ref = S.db.collection("estfixed").doc(rec.id), hm = new Date().toLocaleTimeString("ko-KR", {hour: "2-digit", minute: "2-digit"});
  try { await ref.set(doc); let back = null; try { const sn = await ref.get(); back = sn.exists ? sn.data() : null; } catch(_){}
    if (!back || back.updatedAt !== doc.updatedAt){ ecDiag = `${hm} 고정 저장 ✗ 서버 확인 안 됨`; toast("저장이 서버에 안 들어갔어요 · 회색 글씨를 알려 주세요"); ecMerge(); return false; }
    S.estFixed.set(rec.id, doc); ecDiag = `${hm} 고정 저장 ✓ 서버 확인`; ecMerge(); return true; }
  catch (err){ ecDiag = `${hm} 고정 저장 실패: ${String(err?.code || "")} ${String(err?.message || err || "").slice(0, 60)}`; toast("저장 못 했어요 · 회색 글씨를 알려 주세요"); ecMerge(); return false; }
}
let E = {edit: null}, ecLast = "", ecTimer = null, ecDiag = "";
const ecId = () => "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const ecNum = v => { const t = String(v ?? "").trim().replace(/[^\d.]/g, ""); if (t === "") return null; const n = Number(t); return isFinite(n) ? n : null; };
const ecR = n => Math.max(0, Math.round(n * 2) / 2);
const ecHas = c => EC_COLS.some(([k]) => c[k] != null);
function ecSave(){
  clearTimeout(ecTimer);
  return new Promise(res => { ecTimer = setTimeout(async () => { if (!S.db){ toast("미리보기에서는 저장되지 않아요"); return res(false); } if (!S.canWrite){ toast("수정 권한이 없어요"); return res(false); } const body = JSON.stringify(S.estCases); if (body === ecLast){ ecDiag = "저장할 변경이 없다고 판단 (화면 값 = 서버 값)"; if (S.tab === "est" && !E.edit) renderEst(); return res(); } ecLast = body;
    let ok = true; const ref = S.db.doc("config/estcases"), at = new Date().toISOString();
    try { await ref.set({cases: JSON.parse(body), updatedAt: at});
      // 서버에 정말 들어갔는지 다시 읽어서 확인
      let back = null; try { const sn = await ref.get(); back = sn.exists ? sn.data() : null; } catch(_){}
      const okSrv = back && back.updatedAt === at;
      ecDiag = `${new Date().toLocaleTimeString("ko-KR", {hour: "2-digit", minute: "2-digit"})} 저장 ${okSrv ? "✓ 서버 확인" : back ? "✗ 서버에 안 들어감 (" + String(back.updatedAt || "").slice(11, 19) + ")" : "? 다시 읽기 실패"} · db ${S.db ? "있음" : "없음"} · 쓰기권한 ${S.canWrite ? "O" : "X"}`;
      if (!okSrv){ ok = false; toast("저장했는데 서버에 안 들어갔어요 · 화면 맨 위 회색 글씨를 알려 주세요"); } }
    catch (err){ ok = false; ecLast = ""; ecDiag = `${new Date().toLocaleTimeString("ko-KR", {hour: "2-digit", minute: "2-digit"})} 저장 실패: ${String(err?.code || "")} ${String(err?.message || err || "").slice(0, 60)}`; const m = String(err?.code || err?.message || err || "").slice(0, 80); if (err?.code === "invalid_argument"){ S.canWrite = false; renderBanner(); }
      toast(`저장 못 했어요 (${m || "알 수 없는 오류"}) · 새로고침 후 다시 눌러 주세요`); }
    if (S.tab === "est" && !E.edit) renderEst(); res(ok); }, 200); });
}
(function erWait(){
  if (S.db){ S.db.doc("config/estrules").onSnapshot(snap => { const n = snap.exists && Array.isArray(snap.data()?.notes) ? snap.data().notes : []; const b = JSON.stringify(n); if (b === erLast) return; erLast = b; S.estRules = n; if (S.tab === "est" && !E.edit) renderEst(); }, () => {}); return; }
  erWait.n = (erWait.n || 0) + 1; if (erWait.n < 80) setTimeout(erWait, 400);
})();
async function erSave(){ if (!S.db || !S.canWrite) return; erLast = JSON.stringify(S.estRules); await write(() => S.db.doc("config/estrules").set({notes: S.estRules, updatedAt: new Date().toISOString()}), "기준 메모를 저장했어요"); }
(function ecWait(){
  if (S.db){ S.db.doc("config/estcases").onSnapshot(snap => { if (!snap.exists) return; const cs = Array.isArray(snap.data()?.cases) ? snap.data().cases : []; const body = JSON.stringify(cs);
    if (body === ecLast) return; ecLast = body; S.estBase = cs; ecMerge(); }, () => {});
    S.db.collection("estfixed").onSnapshot(snap => { S.estFixed = new Map(snap.docs.map(d => [d.id, d.data()])); ecMerge(); }, () => {}); return; }
  ecWait.n = (ecWait.n || 0) + 1; if (ecWait.n < 80) setTimeout(ecWait, 400);
})();

/* ---------- 구역 규칙 (일정 창 구역 카드와 같음) ---------- */
const ecKind = r => isBathRoom(r) ? "bath" : /주방/.test(r) ? "kitchen" : /현관/.test(r) ? "entry" : /세탁실/.test(r) ? "laundry" : /베란다/.test(r) ? "veranda" : "etc";
const ecMethods = (r, x) => zsMethodsFor(r, x);
// 예상 견적에서 구역별로 따지는 것: 욕실 = 공사·철거·타일·방법·추가 · 베란다·세탁실 = 크기·철거 여부·타일·걸레받이 · 현관 = 크기·타일·걸레받이 · 주방 = 크기(타일 붙는 공간)·타일 · 주현베는 보통 욕실에 같이 들어감
const EC_PY = ["20", "30", "40", "50"];
const EC_ZONES = ["외욕실", "내욕실", "주방", "현관", "베란다"]; // 세탁실·안방베란다 구분 없이 베란다 개수로
const ecCnt = z => ecKind(z.name) === "veranda" ? Math.max(1, Number(z.spec?.count) || 1) : 1;
const ecHasPy = r => !isBathRoom(r) && ecKind(r) !== "etc";
const ecHasWork = r => isBathRoom(r) || /베란다|세탁실/.test(r);
const ecOnlySize = r => ecKind(r) === "kitchen";
function ecNorm(r, x){
  if (!ecHasPy(r)) delete x.pyeong; if (ecKind(r) !== "veranda") delete x.count;
  if (ecOnlySize(r)){ for (const k of Object.keys(x)) if (k !== "pyeong" && k !== "size") delete x[k]; return x; } // 주방: 크기 + 타일(600각·800각 등)만
  if (!ecHasWork(r)){ delete x.work; delete x.demo; } else if (x.work !== "철거 후 시공" || !isBathRoom(r)) delete x.demo;
  if (zsFloor(r)) delete x.method; else if (x.method && !ecMethods(r, x).includes(x.method)) delete x.method;
  const o = x.opts || {}, ok = new Set(zsOptList(r, x).map(([n]) => n));
  for (const k of Object.keys(o)) if (!ok.has(k)) delete o[k];
  if (Array.isArray(o.졸리컷)) o.졸리컷 = o.졸리컷.filter(j => o[j]);
  if (o.걸레받이 && o.걸레받이 !== true && x.size !== "300각") o.걸레받이 = true;
  if (Object.keys(o).length) x.opts = o; else delete x.opts;
  return x;
}
function ecZoneFeat(z){ const k = ecKind(z.name), x = z.spec || {}, f = [`${k}`]; if (x.big) f.push(`${k}:big`);
  for (const a of ["pyeong", "work", "demo", "size", "method"]) if (x[a]) f.push(`${k}:${a}:${x[a]}`);
  for (const [n, v] of Object.entries(x.opts || {})){ if (n === "졸리컷") (Array.isArray(v) ? v : []).forEach(j => f.push(`${k}:jolly:${j}`)); else f.push(`${k}:opt:${n}=${v === true ? "1" : v}`); }
  return f; }
const ecZoneKey = z => ecZoneFeat(z).sort().join(",") + (ecCnt(z) > 1 ? `,x${ecCnt(z)}` : "");
const ecKey = c => (c.zones || []).map(ecZoneKey).sort().join(" / ");
function ecFeatCount(c){ const m = new Map(); for (const z of c.zones || []){ const n = ecCnt(z); for (const f of ecZoneFeat(z)) m.set(f, (m.get(f) || 0) + n); } return m; }
function ecZoneText(z){ const x = z.spec || {};
  const head = [x.pyeong ? `${x.pyeong}평대` : "", ecHasWork(z.name) ? (x.work === "철거 후 시공" ? (x.demo || "철거") : x.work) : "", x.size, zsFloor(z.name) ? "" : x.method].filter(Boolean).join("·");
  const op = Object.entries(x.opts || {}).map(([n, v]) => zsOptTxt(n, v)).join("·");
  return `${z.name}${x.big ? "(큰 욕실)" : ""}${ecCnt(z) > 1 ? ` ${ecCnt(z)}개` : ""}${head ? " " + head : ""}${op ? " +" + op : ""}`; }
const ecTitle = c => c.name || c.note || (c.zones || []).map(z => z.name + (ecCnt(z) > 1 ? ` ${ecCnt(z)}개` : "")).join(" · ") || "구역 없음";
const ecCrewTxt = c => { const p = EC_COLS.filter(([k]) => c[k] != null && (k === "days" || c[k] > 0)).map(([k, l]) => k === "days" ? `${c[k]}일` : `${l} ${c[k]}`); return p.length ? p.join(" · ") : "인원 안 적음"; };

/* ---------- 추정 ---------- */
function ecSolve(A, b){ const n = A.length, M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i++){ let p = i; for (let j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j; [M[i], M[p]] = [M[p], M[i]];
    const d = M[i][i]; if (Math.abs(d) < 1e-9) continue; for (let j = i; j <= n; j++) M[i][j] /= d;
    for (let k = 0; k < n; k++) if (k !== i){ const f = M[k][i]; if (f) for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]; } }
  return M.map(r => r[n]); }
// 사장님 기준 (욕실 1칸 기공 공수): 젠다이 기존이든 기공이 조적하든 1.5 (만들어도 1~1.5시간 차이)
//  · 젠다이 조적(또는 젠다이 없음) + 파티션 또는 욕조 → 2 · 기존 젠다이 + 파티션 또는 욕조 → 1.75
// 공수가 길어지는 경우 (사장님 기준 2~2.5): 평균보다 큰 욕실 · 샷시(창틀) 마감 · 파티션 샴푸다이(파티션 선반) → 기본 공수에 하나당 +0.25 (최대 2.5)
const EC_LONG = [["big", "평균보다 큰 욕실"], ["창틀", "샷시(창틀) 마감"], ["파티션 선반", "파티션 샴푸다이"]];
function ecLongN(z){ const x = z.spec || {}, o = x.opts || {}; return EC_LONG.filter(([k]) => k === "big" ? x.big : o[k]).length; }
function ecBathRuleGi(z){ if (!isBathRoom(z.name)) return null; const o = z.spec?.opts || {}, zen = o.젠다이, part = !!o.파티션, tub = !!o.욕조, n = ecLongN(z);
  if (!zen && !part && !tub && !n) return null; const ex = zen === "기존 젠다이";
  const base = (part || tub) ? (ex ? 1.75 : 2) : 1.5;
  return n ? Math.min(2.5, base + 0.25 * n) : base; }
const EC_RULE_WHY = "기공 기준: 젠다이 1.5 · 파티션·욕조 들어가면 2 · 기존 젠다이+파티션·욕조 1.75 · 큰 욕실·샷시 마감·샴푸다이는 하나당 +0.25 (칸마다)";
function ecEstimate(t){ const e = ecEstimate0(t); if (!(t.zones || []).length) return e;
  // 고정 조합 중 똑같은 1칸이 있으면 그 값, 없으면 사장님 기준으로 욕실 칸마다 기공을 계산
  const done = S.estCases.filter(c => c.id !== t.id && ecHas(c) && c.src !== "claude" && c.gi != null && (c.zones || []).length === 1 && ecCnt(c.zones[0]) === 1);
  let sum = 0, jun = 0, rule = false, maxOne = 0; const miss = []; const one = (g, z) => { if (isBathRoom(z.name)) maxOne = Math.max(maxOne, g); };
  for (const z of t.zones){ const k = ecZoneKey({...z, spec: {...(z.spec || {}), count: undefined}}), ex = done.find(c => ecZoneKey(c.zones[0]) === k);
    if (ex){ sum += ex.gi * ecCnt(z); one(ex.gi, z); continue; } const r = ecBathRuleGi(z);
    if (r != null){ sum += r * ecCnt(z); one(r, z); rule = true; continue; }
    if (isBathRoom(z.name)){ // 젠다이·파티션·욕조 없는 욕실: 가장 비슷한 욕실 1칸 고정값, 없으면 1.5
      const zf = new Set(ecZoneFeat(z)); let nb = null, nd = 1e9; for (const c of done){ if (!isBathRoom(c.zones[0].name)) continue; const cf = new Set(ecZoneFeat(c.zones[0])); let d = 0; for (const f of zf) if (!cf.has(f)) d++; for (const f of cf) if (!zf.has(f)) d++; if (d < nd){ nd = d; nb = c; } }
      sum += (nb ? nb.gi : 1.5) * ecCnt(z); one(nb ? nb.gi : 1.5, z); if (!nb) rule = true; continue; }
    const zr = ecZoneRule(z); if (zr){ sum += zr.gi * ecCnt(z); jun += zr.jun * ecCnt(z); rule = true; continue; }
    miss.push(z.name); }
  // 조공: 기본 1공수 · 욕실 한 칸 기공이 2공수 이상이면(이틀 걸리는 욕실) 조공 2공수
  const joRule = maxOne >= 2 ? 2 : null;
  if (!rule && !miss.length && e && joRule == null) return e;
  const out = e || {base: null, diff: 0, v: {gi: null, jun: null, kyung: null, jo: 1}, n: 0, used: []};
  out.v = {...out.v, gi: ecR4(sum)}; if (jun) out.v.jun = ecR4(jun); if (out.v.jo == null) out.v.jo = 1; if (joRule != null){ out.v.jo = Math.max(out.v.jo, joRule); out.used = [...out.used, "조공: 욕실 한 칸 기공이 2공수 이상이라 조공 2공수"]; } if (rule && !out.used.includes(EC_RULE_WHY)) out.used = [...out.used, EC_RULE_WHY]; if (miss.length) out.used = [...out.used, `${[...new Set(miss)].join("·")} 기공은 아직 기준이 없어 욕실만 셌어요 (고정해 주시면 반영)`];
  return out; }
// 사장님 기준 · 욕실 외 구역 (구역 1개당): 베란다 300각 기공 0.25·준기공 0.5, 600각 기공 0.5·준기공 1 · 주방(300×600·600각·800각) 기공 0.25·준기공 0.5 · 현관 600각 기공 0.25·준기공 0.5, 600×1200 기공 0.5·준기공 0.5
function ecZoneRule(z){ const k = ecKind(z.name), sz = z.spec?.size;
  if (k === "veranda") return sz === "300각" ? {gi: 0.25, jun: 0.5} : sz === "600각" ? {gi: 0.5, jun: 1} : null;
  if (k === "kitchen") return ["300×600", "600각", "800각"].includes(sz) ? {gi: 0.25, jun: 0.5} : null;
  if (k === "entry") return sz === "600각" ? {gi: 0.25, jun: 0.5} : sz === "600×1200" ? {gi: 0.5, jun: 0.5} : null;
  return null; }
const ecR4 = n => Math.max(0, Math.round(n * 4) / 4);
function ecEstimate0(t){
  const done = S.estCases.filter(c => c.id !== t.id && ecHas(c) && c.src !== "claude"); if (!done.length || !(t.zones || []).length) return null;
  const tf = ecFeatCount(t); let base = null, bd = 1e9;
  for (const c of done){ const cf = ecFeatCount(c), keys = new Set([...tf.keys(), ...cf.keys()]); let d = 0; for (const k of keys) d += Math.abs((tf.get(k) || 0) - (cf.get(k) || 0)); if (d < bd){ bd = d; base = c; } }
  const feats = [...new Set([...done.flatMap(c => [...ecFeatCount(c).keys()]), ...tf.keys()])], idx = new Map(feats.map((f, i) => [f, i + 1])), m = feats.length + 1, lam = 0.3;
  const v = {};
  // 1) 구역마다 같은 구역 1칸짜리 고정 조합이 있으면: 칸별 인원(기공·준기공)은 더하고, 현장당 인원(조공·경력)은 가장 큰 값
  const singles = done.filter(c => (c.zones || []).length === 1 && ecCnt(c.zones[0]) === 1);
  const zd = (a, b) => { const A = new Set(ecZoneFeat(a)), B = new Set(ecZoneFeat(b)); let d = 0; for (const f of A) if (!B.has(f)) d++; for (const f of B) if (!A.has(f)) d++; return d; };
  const parts = []; let near = 0;
  if (singles.length) for (const z of t.zones){ let best = null, bdz = 1e9;
    for (const c of singles){ if (ecKind(c.zones[0].name) !== ecKind(z.name)) continue; const d = zd(z, c.zones[0]); if (d < bdz || (d === bdz && (c.updatedAt || "") > (best.updatedAt || ""))){ bdz = d; best = c; } }
    if (!best){ parts.length = 0; break; } near = Math.max(near, bdz); for (let i = 0; i < ecCnt(z); i++) parts.push(best); }
  if (parts.length){
    for (const [k] of EC_COLS){ const xs = parts.map(c => c[k]).filter(x => x != null); v[k] = !xs.length ? null : EC_PERJOB.has(k) ? Math.max(...xs) : ecR(xs.reduce((a, b) => a + b, 0)); }
    base = parts[0]; bd = near;
  }
  // 2) 아니면 비슷한 조합 + 항목별 차이 (조공·경력은 칸 수를 안 셈: 있음/없음만)
  const row = (c, k) => { const r = new Array(m).fill(0); r[0] = 1; for (const [f, n] of ecFeatCount(c)) r[idx.get(f)] = EC_PERJOB.has(k) ? Math.min(1, n) : n; return r; };
  if (!parts.length) for (const [k] of EC_COLS){ const pts = done.filter(c => c[k] != null); if (!pts.length){ v[k] = null; continue; }
    const A = Array.from({length: m}, (_, i) => new Array(m).fill(0).map((_, j) => i === j && i > 0 ? lam : 0)), b = new Array(m).fill(0);
    for (const c of pts){ const r = row(c, k); for (let i = 0; i < m; i++){ b[i] += r[i] * c[k]; for (let j = 0; j < m; j++) A[i][j] += r[i] * r[j]; } }
    const w = ecSolve(A, b), pred = c => row(c, k).reduce((s, x, i) => s + x * w[i], 0);
    v[k] = ecR((base[k] != null ? base[k] : pred(base)) + pred(t) - pred(base)); }
  const seen = new Set(done.flatMap(c => [...ecFeatCount(c).keys()])), used = parts.length ? [`구역마다 가장 비슷한 1칸 고정값으로 계산${near ? " (똑같은 1칸은 아직 없음)" : ""} · 기공·준기공은 칸마다 더하고, 조공·경력은 현장당 1번`] : [];
  for (const [f, n] of tf){ const pr = EC_PRIOR[f]; if (!pr || seen.has(f)) continue; used.push(pr.why);
    for (const [k] of EC_COLS) if (pr[k]) v[k] = pr.perJob ? Math.max(v[k] || 0, pr[k]) : ecR((v[k] || 0) + pr[k] * n); }
  return {base, diff: bd, v, n: done.length, used};
}

/* ---------- 화면 ---------- */
// 카드 상태: pri(먼저 적어 주세요) · 안 적음 · 추정(Claude가 채움, src:"claude") · 확인(사장님이 적거나 확인)
const ecState = c => !ecHas(c) ? (c.pri ? 0 : 1) : c.src === "claude" ? 2 : 3;
function ecListHTML(){
  // 인원을 적어 저장한 조합(확인) → 고정 리스트 · 나머지 → 예상 리스트 (고정 리스트를 바탕으로 예상 인원을 보여줌)
  const ro = !S.canWrite, all = [...S.estCases];
  const fixed = all.filter(c => ecState(c) === 3).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  // 같은 조합(구역·시공 내용이 똑같은 것)은 한 번만 보여줌: 고정은 가장 최근 것, 예상은 처음 것
  { const seen = new Set(); for (let i = 0; i < fixed.length; i++){ const k = ecKey(fixed[i]); if (seen.has(k)){ fixed.splice(i--, 1); } else seen.add(k); } }
  const fk = new Set(fixed.map(ecKey)), fid = new Set(fixed.map(c => c.id));
  // 고정된 조합(같은 조합 포함)은 예상 리스트에서 뺌
  const todo = all.filter(c => ecState(c) !== 3 && !fid.has(c.id) && !fk.has(ecKey(c))).sort((a, b) => ecState(a) - ecState(b) || (a.pri || 99) - (b.pri || 99) || (a.ord || 0) - (b.ord || 0));
  { const seen = new Set(); for (let i = 0; i < todo.length; i++){ const k = ecKey(todo[i]); if (seen.has(k)) todo.splice(i--, 1); else seen.add(k); } }
  const tag = c => ({0: `<span class="ectag pri">먼저 적어 주세요</span>`, 1: `<span class="ectag">안 적음</span>`, 2: `<span class="ectag est">추정 · 확인해 주세요</span>`, 3: `<span class="ectag ok">고정</span>`})[ecState(c)];
  const guess = c => { if (ecHas(c)) return esc(ecCrewTxt(c)); const e = ecEstimate(c); const t = e ? EC_COLS.map(([k, l]) => e.v[k] ? `${l} ${e.v[k]}` : "").filter(Boolean).join(" · ") : ""; return t ? `예상 ${esc(t)}` : "인원 안 적음"; };
  const card = (c, isFixed) => `<div class="csitem${isFixed ? "" : " todo"}"><button type="button" class="ecopen" data-ecedit="${esc(c.id)}"><span class="cst">${tag(c)} ${esc(ecTitle(c))}</span>
      ${(c.zones || []).map(z => `<span class="hint">${esc(ecZoneText(z))}</span>`).join("")}</button>
      <div class="ecrow"><span class="csc">${isFixed ? esc(ecCrewTxt(c)) : guess(c)}</span>${ro ? "" : isFixed ? `<button type="button" class="lnk" data-ecunfix="${esc(c.id)}">고치기 (예상으로)</button><button type="button" class="lnk dg" data-ecdel="${esc(c.id)}">삭제</button>` : `<button type="button" class="lnk" data-ecedit="${esc(c.id)}">고치기</button><button type="button" class="btn sm" data-ecfix="${esc(c.id)}">저장</button>`}</div></div>`;
  return `<div class="stack"><div class="qcard"><h3 style="margin:0">예상 견적</h3><p class="cintro">30평대 기준이에요. 예상 리스트의 인원이 맞으면 <b>저장</b>, 다르면 <b>고치기</b>로 숫자를 바꿔 저장하세요. 저장한 것만 <b>고정 리스트</b>로 올라가고, 고정된 값으로 나머지 예상이 다시 계산돼요.</p>
    ${ro ? "" : `<button class="btn" id="ecNew" type="button" style="justify-self:start">+ 새 조합 만들기</button>`}</div>
    ${ecDiag ? `<p class="hint" style="margin:0">${esc(ecDiag)}</p>` : ""}
    <h3 style="margin:4px 0 0">고정 리스트 <small class="hint">${fixed.length}개 · 실제 인원</small></h3>
    ${fixed.length ? `<div class="eclist">${fixed.map(c => card(c, true)).join("")}</div>` : `<div class="wempty">아직 없어요. 아래 예상 리스트에서 조합을 눌러 인원을 적어 주세요.</div>`}
    <h3 style="margin:10px 0 0">예상 리스트 <small class="hint">${todo.length}개 · 인원 적으면 고정으로</small></h3>
    ${todo.length ? `<div class="eclist">${todo.map(c => card(c, false)).join("")}</div>` : `<div class="wempty">다 고정됐어요.</div>`}</div>`;
}
function ecRow(l, h, sub){ return `<div class="zsrow${sub ? " zssub" : ""}"><span class="zsl2">${l}</span><span class="zsopts">${h}</span></div>`; }
function ecChips(i, f, opts, cur){ const show = cur ? [cur] : opts;
  return show.map(o => `<button type="button" class="opt" data-ef="${i}|${f}|${esc(o)}" aria-pressed="${cur === o}">${cur === o ? "✓ " : ""}${esc(o)}</button>`).join(""); }
function ecZoneHTML(z, i){
  const r = z.name, x = z.spec; let h = `<b>${esc(r)}</b>`;
  if (ecKind(r) === "veranda") h += ecRow("개수", [1, 2, 3].map(n => { const on = ecCnt(z) === n; return `<button type="button" class="opt" data-ef="${i}|count|${n}" aria-pressed="${on}">${on ? "✓ " : ""}${n}개</button>`; }).join(""));
  if (ecHasPy(r)) h += ecRow("크기", EC_PY.map(p => { const on = x.pyeong === p; return (x.pyeong && !on) ? "" : `<button type="button" class="opt" data-ef="${i}|pyeong|${p}" aria-pressed="${on}">${on ? "✓ " : ""}${p}평대${ZDIM_STD[zdimKind(r)]?.[p] ? ` <small>${ZDIM_STD[zdimKind(r)][p].join("×")}</small>` : ""}</button>`; }).join(""));
  if (ecOnlySize(r)) return `<div class="zscard">${h}${ecRow("타일", ecChips(i, "size", zsSizes(r), x.size))}<span class="hint">주방은 타일 붙는 공간 크기와 타일만 따져요</span></div>`;
  if (ecHasWork(r)){ h += ecRow(isBathRoom(r) ? "공사" : "철거", ecChips(i, "work", ZS_WORK, x.work)); if (isBathRoom(r) && x.work === "철거 후 시공") h += ecRow("철거", ecChips(i, "demo", ZS_DEMO, x.demo), true); }
  h += ecRow("타일", ecChips(i, "size", zsSizes(r), x.size));
  if (!zsFloor(r)) h += ecRow("방법", ecChips(i, "method", ecMethods(r, x), x.method));
  const ol = zsOptList(r, x), o = x.opts || {};
  if (ol.length){ h += ecRow("추가", ol.map(([n]) => `<button type="button" class="opt" data-eso="${i}|${esc(n)}" aria-pressed="${!!o[n]}">${o[n] ? "✓ " : "+ "}${esc(n)}</button>`).join(""));
    for (const [n, subs] of ol){ if (!o[n]) continue;
      if (n === "졸리컷"){ const ch = ZS_JOLLY.filter(j => o[j]); if (ch.length) h += ecRow(n, ch.map(s => { const a = Array.isArray(o.졸리컷) && o.졸리컷.includes(s); return `<button type="button" class="opt" data-esv="${i}|${n}|${esc(s)}" aria-pressed="${a}">${a ? "✓ " : ""}${esc(s)}</button>`; }).join(""), true); continue; }
      if (subs && subs.length){ const v = typeof o[n] === "string" ? o[n] : ""; h += ecRow(n, (v ? [v] : subs).map(s => `<button type="button" class="opt" data-esv="${i}|${n}|${esc(s)}" aria-pressed="${v === s}">${v === s ? "✓ " : ""}${esc(s)}</button>`).join(""), true); } } }
  if (isBathRoom(r)) h += ecRow("크기", `<button type="button" class="opt" data-ebig="${i}" aria-pressed="${!!x.big}">${x.big ? "✓ " : "+ "}평균보다 큰 욕실</button>`);
  return `<div class="zscard">${h}</div>`;
}
function ecEstHTML(){
  const c = E.edit, e = E.est;
  const dup = (c.zones || []).length ? S.estCases.find(z => z.id !== c.id && ecKey(z) === ecKey(c)) : null;
  let h = dup ? `<div class="ecdup"><b>같은 조합이 이미 있어요</b><span>${esc(ecTitle(dup))} · ${esc(ecCrewTxt(dup))}</span><button type="button" class="lnk" data-ecedit="${esc(dup.id)}">그 조합 열기</button></div>` : "";
  if (!e) return h + `<p class="hint" style="margin:0">${(c.zones || []).length ? "인원을 적어 둔 조합이 아직 없어서 추정할 수 없어요." : "구역을 고르면 시작해요."}</p>`;
  return h + `<div class="csest"><span><b>추정</b> ${EC_COLS.map(([k, l]) => e.v[k] == null ? "" : k === "days" ? `${e.v[k]}일` : `${l} ${e.v[k]}`).filter(Boolean).join(" · ") || "-"}</span>
    ${e.base ? `<span class="hint">가장 비슷한 조합: ${esc(ecTitle(e.base))} ${e.diff ? `(${e.diff}가지 다름)` : ""} · 적어 둔 ${e.n}개 기준</span>` : ""}${(e.used || []).map(w => `<span class="hint">+ 참고: ${esc(w)}</span>`).join("")}<button type="button" class="lnk" id="ecUseEst" style="justify-self:start">추정값 넣기</button></div>`;
}
function ecEditHTML(){
  const c = E.edit, names = (c.zones || []).map(z => z.name), all = [...EC_ZONES, ...names.filter(n => !EC_ZONES.includes(n))];
  return `<div class="stack"><div class="row" style="justify-content:space-between"><button class="lnk" id="ecBack" type="button">← 목록</button><b>${E.isNew ? "새 조합" : "조합 수정"}</b><button class="btn" id="ecSave" type="button" style="height:34px">목록에 저장</button></div>
    <label class="fld">이름 (안 적어도 돼요)<input id="ecName" value="${esc(c.name || "")}" placeholder="예: 30평 욕실 2칸 올수리"></label>
    <div class="fld">구역 <span class="hint">이 현장에서 시공하는 곳을 모두 눌러 주세요</span>
      <div class="clirow">${all.map(n => { const on = names.includes(n); return `<button type="button" class="opt cli" data-ezone="${esc(n)}" aria-pressed="${on}">${on ? "✓ " : ""}${esc(n)}</button>`; }).join("")}${E.addZone ? "" : `<button type="button" class="opt cli addchip" id="ecZoneOpen">+ 추가</button>`}</div>
      ${E.addZone ? `<span class="row" style="flex-wrap:nowrap"><input id="ecZoneIn" placeholder="다른 구역 (예: 공용욕실)" style="flex:1;min-width:0"><button type="button" class="btn ghost sm" id="ecZoneAdd">추가</button></span>` : ""}</div>
    ${(c.zones || []).length ? `<div class="zscards">${c.zones.map(ecZoneHTML).join("")}</div>` : ""}
    <div class="cscrew"><b>총 인원</b>${EC_COLS.map(([k, l]) => `<label>${l}<input class="num" data-ec="${k}" inputmode="decimal" value="${c[k] ?? ""}" placeholder="${E.est && E.est.v[k] != null ? E.est.v[k] : "–"}"></label>`).join("")}</div>
    <div id="ecEst">${ecEstHTML()}</div>
    <label class="fld">메모<input id="ecNote" value="${esc(c.note || "")}" placeholder="예: 젠다이 당일 시공이면 하루 더"></label>
    <button class="btn" type="button" data-ecsave="1" style="width:100%">목록에 저장</button>
    ${E.isNew ? "" : `<div class="row" style="justify-content:flex-end"><button class="lnk dg${E.arm ? " arm" : ""}" id="ecDel" type="button">${E.arm ? "한 번 더 누르면 삭제" : "이 조합 삭제"}</button></div>`}</div>`;
}
// 저장된 카드를 누르면: 조합은 보기만 · 인원만 적기 (조합 고치기는 아래 링크로)
function ecCrewHTML(){
  const c = E.edit;
  return `<div class="stack"><div class="row" style="justify-content:space-between"><button class="lnk" id="ecBack" type="button">← 목록</button><b>인원 적기</b><span style="width:52px"></span></div>
    <div class="ecview"><b>${esc(ecTitle(c))}</b>${(c.zones || []).map(z => `<span>${esc(ecZoneText(z))}</span>`).join("")}</div>
    <div class="cscrew"><b>총 인원</b>${EC_COLS.map(([k, l]) => `<label>${l}<input class="num" data-ec="${k}" inputmode="decimal" value="${c[k] ?? ""}" placeholder="${E.est && E.est.v[k] != null ? E.est.v[k] : "–"}"></label>`).join("")}</div>
    ${E.pre ? `<p class="hint" style="margin:0">예상 인원을 넣어 뒀어요. 숫자를 눌러 고친 뒤 저장하면 고정돼요.</p>` : ""}<div id="ecEst">${E.est ? ecEstHTML() : ""}</div>
    <button class="btn" type="button" id="ecCrewSave" style="width:100%">${c.src === "claude" && ecHas(c) ? "맞아요 · 확인으로 저장" : "인원 저장"}</button>${c.why ? `<p class="hint" style="margin:0">추정 근거: ${esc(c.why)}</p>` : ""}
    <div class="row" style="justify-content:space-between"><button class="lnk" id="ecFull" type="button">조합 고치기</button><button class="lnk dg${E.arm ? " arm" : ""}" id="ecDel" type="button">${E.arm ? "한 번 더 누르면 삭제" : "이 조합 삭제"}</button></div></div>`;
}
function renderEst(){ const el = $("#est"); if (!el) return; const st = el.scrollTop;
  if (E.edit) E.est = ecEstimate(E.edit); el.innerHTML = E.edit ? (E.crewOnly ? ecCrewHTML() : ecEditHTML()) : ecListHTML(); el.scrollTop = E._top ? 0 : st; E._top = false; }
function ecRead(){ if (!E.edit) return; const n = $("#ecName"), m = $("#ecNote"); if (n) E.edit.name = n.value.trim(); if (m) E.edit.note = m.value.trim(); }
function ecUpdEst(){ E.est = ecEstimate(E.edit); const b = $("#ecEst"); if (b) b.innerHTML = ecEstHTML(); }

document.addEventListener("click", async ev => {
  const t = ev.target.closest("button"); if (!t || S.tab !== "est" || !t.closest("#est")) return;
  if (t.dataset.ecedit){ ecRead(); const c = S.estCases.find(z => z.id === t.dataset.ecedit); if (c){ E = {edit: structuredClone(c), isNew: false, crewOnly: true, _top: true};
    // 안 적은 조합: 예상 인원을 입력칸에 미리 넣어 둠 → 바로 고쳐서 저장 (저장 눌러야만 고정)
    if (!ecHas(c)){ const es = ecEstimate(c); if (es) for (const [k] of EC_COLS) if (es.v[k]) E.edit[k] = es.v[k]; E.pre = ecHas(E.edit); }
    renderEst(); } return; }
  if (t.id === "ecBack"){ ecRead(); const o = E.edit && S.estCases.find(z => z.id === E.edit.id);
    const dirty = E.edit && !(E.pre && !E.touched) && (o ? EC_COLS.some(([k]) => (E.edit[k] ?? null) !== (o[k] ?? null)) || (!E.crewOnly && JSON.stringify(E.edit) !== JSON.stringify(o)) : (E.edit.zones || []).length || ecHas(E.edit));
    if (dirty && !E.backArm){ E.backArm = true; t.textContent = "저장 안 했어요 · 한 번 더 누르면 버려요"; toast("아직 저장 안 했어요. 아래 저장 버튼을 눌러 주세요"); return; }
    E = {edit: null}; renderEst(); return; }
  if (t.id === "erAdd" && S.canWrite){ const v = ($("#erIn")?.value || "").trim(); if (!v) return; S.estRules = [...S.estRules, {t: v, at: new Date().toISOString()}]; E.rulesOpen = true; renderEst(); await erSave(); return; }
  if (t.dataset.erdel !== undefined && S.canWrite){ S.estRules = S.estRules.filter((_, i) => i !== Number(t.dataset.erdel)); E.rulesOpen = true; renderEst(); await erSave(); return; }
  if (!S.canWrite){ if (t.id === "ecNew" || t.id === "ecSave" || t.dataset.ecsave || t.id === "ecCrewSave") toast("수정 권한이 없어요 · 새로고침해 보세요"); return; }
  if ((t.dataset.ecfix || t.dataset.ecdel || t.dataset.ecunfix) && Date.now() - ecTapLock < 600) return;
  if (t.dataset.ecdel){ const id = t.dataset.ecdel, c0 = S.estCases.find(z => z.id === id); if (!c0 || !S.db) return;
    if (!t.classList.contains("arm")){ t.classList.add("arm"); t.textContent = "한 번 더 누르면 삭제"; return; }
    t.disabled = true; t.textContent = "삭제 중…"; const hm = new Date().toLocaleTimeString("ko-KR", {hour: "2-digit", minute: "2-digit"}), doc = {id, deleted: true, zones: c0.zones || [], updatedAt: new Date().toISOString()};
    try { await S.db.collection("estfixed").doc(id).set(doc); S.estFixed.set(id, doc); ecDiag = `${hm} 삭제 ✓`; ecMerge(); toast(`${ecTitle(c0)} 삭제했어요`); }
    catch (err){ ecDiag = `${hm} 삭제 실패: ${String(err?.code || "")} ${String(err?.message || err || "").slice(0, 60)}`; ecMerge(); toast("삭제하지 못했어요 · 회색 글씨를 알려 주세요"); }
    return; }
  if (t.dataset.ecunfix){ const c0 = S.estCases.find(z => z.id === t.dataset.ecunfix); if (!c0 || !S.db) return; t.disabled = true; t.textContent = "옮기는 중…";
    const hm = new Date().toLocaleTimeString("ko-KR", {hour: "2-digit", minute: "2-digit"}), doc = {id: c0.id, unfixed: true, zones: c0.zones || [], updatedAt: new Date().toISOString()};
    try { await S.db.collection("estfixed").doc(c0.id).set(doc); S.estFixed.set(c0.id, doc); ecDiag = `${hm} 예상 리스트로 되돌림 ✓`; ecMerge(); toast("예상 리스트로 되돌렸어요 · 거기서 숫자 고치고 저장하세요"); }
    catch (err){ ecDiag = `${hm} 되돌리기 실패: ${String(err?.code || "")} ${String(err?.message || err || "").slice(0, 60)}`; ecMerge(); toast("되돌리지 못했어요 · 회색 글씨를 알려 주세요"); }
    return; }
  if (t.dataset.ecfix){ const i = S.estCases.findIndex(z => z.id === t.dataset.ecfix); if (i < 0) return; const c0 = S.estCases[i], es = ecEstimate(c0);
    if (!es || !EC_COLS.some(([k]) => es.v[k])){ toast("예상 인원이 없어요 · 고치기로 직접 적어 주세요"); return; }
    const rec = {...c0, updatedAt: new Date().toISOString(), src: "user"}; delete rec.why; for (const [k] of EC_COLS){ if (es.v[k]) rec[k] = es.v[k]; else delete rec[k]; }
    t.disabled = true; t.textContent = "저장 중…"; if (await ecFixSave(rec)) toast(`고정 리스트로 옮겼어요 · ${ecCrewTxt(rec)}`); return; }
  if (t.id === "ecNew"){ E = {edit: {id: ecId(), zones: []}, isNew: true, _top: true}; renderEst(); return; }
  const c = E.edit; if (!c) return; ecRead();
  if (t.id === "ecFull"){ E.crewOnly = false; E.arm = false; renderEst(); return; }
  if (t.id === "ecCrewSave"){ const i = S.estCases.findIndex(z => z.id === c.id); const rec = {...(i >= 0 ? S.estCases[i] : c), updatedAt: new Date().toISOString()};
    for (const [k] of EC_COLS){ if (c[k] != null) rec[k] = c[k]; else delete rec[k]; } rec.src = "user"; delete rec.why;
    E = {edit: null}; renderEst(); if (await ecFixSave(rec)) toast("고정 리스트로 옮겼어요"); return; }
  if (t.dataset.ezone){ const n = t.dataset.ezone, i = c.zones.findIndex(z => z.name === n); if (i >= 0) c.zones.splice(i, 1); else c.zones.push({name: n, spec: {}}); renderEst(); return; }
  if (t.id === "ecZoneOpen"){ E.addZone = true; renderEst(); setTimeout(() => $("#ecZoneIn")?.focus(), 30); return; }
  if (t.id === "ecZoneAdd"){ const n = ($("#ecZoneIn")?.value || "").trim(); if (!n) return; if (!c.zones.some(z => z.name === n)) c.zones.push({name: n, spec: {}}); E.addZone = false; renderEst(); return; }
  if (t.dataset.ef){ const [i, f, v] = t.dataset.ef.split("|"), z = c.zones[+i]; if (!z) return; if (f === "count") z.spec.count = Number(v) > 1 ? Number(v) : undefined, z.spec.count === undefined && delete z.spec.count; else if (z.spec[f] === v) delete z.spec[f]; else z.spec[f] = v; ecNorm(z.name, z.spec); renderEst(); return; }
  if (t.dataset.eso){ const [i, n] = t.dataset.eso.split("|"), z = c.zones[+i]; if (!z) return; const o = z.spec.opts = z.spec.opts || {};
    if (o[n]) delete o[n]; else { o[n] = n === "졸리컷" ? ZS_JOLLY.filter(j => o[j]) : true; if (ZS_JOLLY.includes(n) && Array.isArray(o.졸리컷) && !o.졸리컷.includes(n)) o.졸리컷.push(n); }
    ecNorm(z.name, z.spec); renderEst(); return; }
  if (t.dataset.esv){ const [i, n, v] = t.dataset.esv.split("|"), z = c.zones[+i]; if (!z) return; const o = z.spec.opts = z.spec.opts || {};
    if (n === "졸리컷"){ const a = Array.isArray(o.졸리컷) ? o.졸리컷 : []; o.졸리컷 = a.includes(v) ? a.filter(s => s !== v) : [...a, v]; } else o[n] = o[n] === v ? true : v;
    ecNorm(z.name, z.spec); renderEst(); return; }
  if (t.dataset.ebig !== undefined){ const z = c.zones[+t.dataset.ebig]; if (!z) return; if (z.spec.big) delete z.spec.big; else z.spec.big = true; renderEst(); return; }
  if (t.id === "ecUseEst" && E.est){ for (const [k] of EC_COLS) if (E.est.v[k] != null) c[k] = E.est.v[k]; renderEst(); return; }
  if (t.id === "ecSave" || t.dataset.ecsave){
    if (!c.zones.length){ toast("구역을 하나 이상 골라 주세요"); return; }
    const dup = S.estCases.find(z => z.id !== c.id && ecKey(z) === ecKey(c));
    if (dup){ // 같은 조합이 이미 있으면 막지 않고 그 조합에 인원·메모를 합쳐서 저장
      const rec = {...dup, updatedAt: new Date().toISOString()};
      if (ecHas(c)){ for (const [k] of EC_COLS){ if (c[k] != null) rec[k] = c[k]; else delete rec[k]; } rec.src = "user"; delete rec.why; }
      if (c.name) rec.name = c.name; if (c.note && c.note !== dup.note) rec.note = dup.note ? `${dup.note} · ${c.note}` : c.note;
      S.estCases = S.estCases.filter(z => z.id !== c.id && z.id !== dup.id); S.estCases.push(rec);
      E = {edit: null}; renderEst(); const ok = await ecSave(); if (ok !== false) toast(`같은 조합(${ecTitle(dup)})이 있어서 거기에 저장했어요`); return; }
    S.estCases = S.estCases.filter(z => z.id !== c.id); S.estCases.push({...c, ...(ecHas(c) ? {src: "user"} : {}), updatedAt: new Date().toISOString()});
    E = {edit: null}; renderEst(); if (ecHas(c)) await ecFixSave(c); if (await ecSave() !== false) toast(ecHas(c) ? "저장했어요" : "목록에 저장했어요 · 인원은 시간 날 때 채워 주세요"); return; }
  if (t.id === "ecDel"){ if (!E.arm){ E.arm = true; renderEst(); return; } S.estCases = S.estCases.filter(z => z.id !== c.id); E = {edit: null}; renderEst(); await ecSave(); toast("지웠어요"); return; }
});
document.addEventListener("input", ev => { const t = ev.target; if (!t.dataset?.ec || !E.edit) return; E.touched = true; const v = ecNum(t.value); if (v == null) delete E.edit[t.dataset.ec]; else E.edit[t.dataset.ec] = v; });
document.addEventListener("keydown", ev => { const t = ev.target; if (ev.key !== "Enter" || ev.isComposing || !t.closest?.("#est")) return;
  if (t.id === "ecZoneIn"){ ev.preventDefault(); $("#ecZoneAdd")?.click(); return; }
  if (t.id === "erIn"){ ev.preventDefault(); $("#erAdd")?.click(); return; }
  if (t.dataset?.ec){ ev.preventDefault(); const all = [...document.querySelectorAll("#est [data-ec]")]; const i = all.indexOf(t); if (all[i + 1]) all[i + 1].focus(); else $("#ecNote")?.focus(); } });
