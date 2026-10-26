/* 904 캘린더 · 현장 이름을 눌러 뜨는 '현장 정보' 창 맨 위에 현장 요약
   몇 줄짜리 글로: 기간·남은 날 / 위치별 진행 / 외주 업체 / 챙길 것 / 메모 */
(function(){
  const dlg = document.getElementById("dlg"); if (!dlg) return;
  const H = s => esc(String(s == null ? "" : s));
  const dl = k => `${md(k)}(${WD[wdOf(k)]})`;
  // 공정 이름을 짧게: 도기 세팅 → 도기, 타일 시공 → 타일, 돔 → 돔천장
  const nm = u => { const x = UNIT[u]; if (!x) return u; return x.l.replace(/ (세팅|시공)$/, ""); };
  const sd = k => { const d = parse(k); return (d.getMonth() + 1) + "/" + d.getDate(); };
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 ? a : b; }; // 받침 있으면 a
  function build(e){
    const P = procOf(e, true), plan = (typeof planOf === "function" ? planOf(e, P) : e.plan) || {}, tk = todayK();
    const days = Object.keys(plan).filter(d => (plan[d] || []).length).sort(), end = evEnd(e);
    const lines = [];
    // 1) 기간·남은 날
    const left = days.filter(d => d >= tk).length;
    let first = `${sd(e.start)}${end !== e.start ? "~" + sd(end) : ""}`;
    if (!days.length) first += tk > end ? ", 끝난 현장이에요." : ".";
    else if (tk > end || !left) first += `, 작업 ${days.length}일 다 끝났어요.`;
    else if (tk < days[0]) first += `, 작업 ${days.length}일 · ${diff(tk, days[0])}일 뒤 시작해요.`;
    else first += `, 작업 ${days.length}일 중 ${left}일 남았어요.`;
    lines.push(first);
    // 2) 위치별(외욕실·내욕실…) 흐름을 한 문장씩
    const rooms = (e.rooms || []).length > 1 ? e.rooms : [];
    const groups = new Map(); // 위치 → [[날짜, [공정…]]]
    for (const d of days) for (const u of plan[d]){ if (UNIT[u]?.k === "prot" || UNIT[u]?.k === "sil") continue;
      let r = rooms.length ? roomTag(e, d, u) : "";
      if (rooms.length && !r){ const rs = [...new Set(plan[d].map(x => roomTag(e, d, x)).filter(Boolean))]; r = rs.length === 1 ? rs[0] : "공통"; }
      if (!groups.has(r)) groups.set(r, new Map());
      const g = groups.get(r); if (!g.has(d)) g.set(d, []); if (!g.get(d).includes(nm(u))) g.get(d).push(nm(u)); }
    const order = [...rooms, "공통", ""].filter(r => groups.has(r));
    for (const r of order){
      const steps = [...groups.get(r).entries()], who = r ? r + josa(r, "은 ", "는 ") : "";
      const txt = ([d, a]) => `${d === tk ? "오늘" : sd(d)} ${a.join("·")}`;
      const past = steps.filter(([d]) => d < tk), now = steps.filter(([d]) => d >= tk);
      if (r === "공통"){ if (now.length) lines.push(`그 밖에 ${now.map(txt).join(", ")}도 있어요.`); continue; } // 위치 안 정한 것은 남은 것만
      if (!now.length) lines.push(`${who}${sd(steps[0][0])} ${steps[0][1].join("·")}부터 ${sd(steps.at(-1)[0])} ${steps.at(-1)[1].join("·")}까지 다 끝났어요.`);
      else if (!past.length) lines.push(`${who}${now.map(txt).join(", ")}${now.length > 1 ? "로 진행해요." : " 해요."}`);
      else lines.push(`${who}${sd(past.at(-1)[0])}까지 했고, ${now.map(txt).join(", ")}${now.length > 1 ? "이면 끝나요." : " 남았어요."}`);
    }
    // 3) 외주 업체 (정해진 것만, 공정별로 한 줄)
    const vend = new Map(), todo = [];
    for (const k of procKeys(P)){ const p = P[k]; if (p.by !== "out") continue;
      const kd = kindDays(plan, k);
      for (const d of (kd.length ? kd : [""])){
        if (d && (plan[d] || []).every(u => UNIT[u].k !== k || !unitOut(u, P, plan[d], e, d))) continue; // 그날은 우리가 함
        const v = d ? (ddOf(e, P, k, d).vendor || "") : (p.vendor || ""), lab = KIND_LABEL[k].replace(/ (세팅|시공)$/, "");
        if (v){ if (!vend.has(v)) vend.set(v, []); if (!vend.get(v).includes(lab)) vend.get(v).push(lab); }
        if (d && d < tk) continue;
        const r = d ? roomTag(e, d, (plan[d] || []).find(u => UNIT[u].k === k)) : "", where = `${r ? r + " " : ""}${lab}${d ? `(${sd(d)})` : ""}`;
        if (!v && !bkOn(p, d)) todo.push(`${where} 업체 아직 안 정했고 연락 전이에요.`);
        else if (!bkOn(p, d)) todo.push(`${where} ${v}에 아직 연락 전이에요.`);
      } }
    if (vend.size){ const call = v => { const c = (S.vendors || []).find(x => x.name && x.name.replace(/\s/g, "") === v.replace(/\s/g, "")); return c && c.phone ? ` <a href="tel:${H(c.phone.replace(/[^\d+]/g, ""))}" target="_blank" rel="noopener">📞</a>` : ""; };
      lines.push(`외주는 ${[...vend.entries()].map(([v, ks]) => `${H(ks.join("·"))} <b>${H(v)}</b>${call(v)}`).join(", ")}.`); }
    // 4) 메모
    const memo = String(e.memo || "").trim().replace(/\s*\n\s*/g, " · ");
    if (memo) lines.push(`메모: ${H(memo.length > 120 ? memo.slice(0, 120) + "…" : memo)}`);
    const box = document.createElement("div"); box.className = "sumbox";
    box.innerHTML = `<div class="sum-h">현장 요약</div>` + lines.map((t, i) => `<p${i === 0 ? ' class="s1"' : ""}>${i < lines.length - (vend.size ? 1 : 0) - (memo ? 1 : 0) && !/^외주는|^메모:/.test(t) ? H(t) : t}</p>`).join("")
      + todo.map(t => `<p class="warn">⚠ ${H(t)}</p>`).join("");
    return box;
  }
  function add(){
    if (dlg.hidden || typeof SI === "undefined" || !SI || !SI.e) return;
    const b = dlg.querySelector(".s-b"); if (!b || b.querySelector(".sumbox")) return;
    const e = S.events.get(SI.id) || SI.e;
    let box; try { box = build({...e, ...SI.e, proc: SI.P || e.proc}); } catch (err) { return; }
    const site = b.querySelector(":scope > .u-site"); if (site) site.after(box); else b.prepend(box);
  }
  const st = document.createElement("style");
  st.textContent = `.sumbox{margin:8px 0 10px;padding:12px 14px;border:1px solid var(--line,#e5e5e5);border-radius:14px;background:var(--surface2,#f7f6f3);font-size:14px;line-height:1.6}
  .sumbox .sum-h{font-weight:800;font-size:12px;letter-spacing:.04em;color:var(--muted,#777);margin-bottom:4px}
  .sumbox p{margin:0 0 4px}.sumbox p.s1{font-weight:700}.sumbox p.warn{color:#b3412f;font-weight:600}
  .sumbox a{text-decoration:none}`;
  document.head.appendChild(st);
  new MutationObserver(add).observe(dlg, {childList: true, attributes: true, attributeFilter: ["hidden"]});
})();
