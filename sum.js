/* 904 캘린더 · 현장 이름을 눌러 뜨는 '현장 정보' 창 맨 위에 현장 요약
   기간 · 위치별 사양 · 날짜별 공정(위치·완료·외주) · 외주 업체와 연락 상태 · 인원 · 메모 */
(function(){
  const dlg = document.getElementById("dlg"); if (!dlg) return;
  const H = s => esc(String(s == null ? "" : s));
  const dl = k => `${md(k)}(${WD[wdOf(k)]})`;
  function build(e){
    const P = procOf(e, true), plan = (typeof planOf === "function" ? planOf(e, P) : e.plan) || {}, tk = todayK();
    const days = Object.keys(plan).filter(d => (plan[d] || []).length).sort();
    const end = evEnd(e), left = days.filter(d => d >= tk).length;
    let h = `<div class="sum-top"><b>${dl(e.start)}${end !== e.start ? " – " + dl(end) : ""}</b>`;
    if (days.length) h += `<span>작업 ${days.length}일${tk <= end ? ` · 남은 ${left}일` : " · 끝남"}</span>`;
    h += `</div>`;
    const spec = typeof spacesSpec === "function" ? spacesSpec(e) : "";
    if (spec) h += `<div class="sum-row"><i>사양</i><span>${H(spec)}</span></div>`;
    // 날짜별 공정
    if (days.length){
      h += `<div class="sum-days">` + days.map(d => {
        const us = plan[d] || [], done = e.doneDays?.[d] || [];
        const parts = us.map(u => { const r = roomTag(e, d, u), ok = unitDone(u, P) || done.includes(u), out = unitOut(u, P, us, e, d);
          return `<span class="${ok ? "ok" : ""}">${H(UNIT[u]?.s || UNIT[u]?.l || u)}${r ? `<small>${H(r)}</small>` : ""}${out ? "<em>외주</em>" : ""}${ok ? " ✓" : ""}</span>`; });
        const n = crewOn(e, d).length;
        return `<div class="sd${d === tk ? " now" : d < tk ? " past" : ""}"><b>${dl(d)}</b><span class="sp">${parts.join("")}</span>${n ? `<small class="cr">${n}명</small>` : ""}</div>`;
      }).join("") + `</div>`;
    }
    // 외주
    const outs = [];
    for (const k of procKeys(P)){ const p = P[k]; if (p.by !== "out") continue;
      const kd = kindDays(plan, k), list = (kd.length ? kd : [""]).map(d => {
        const v = d ? (ddOf(e, P, k, d).vendor || "") : (p.vendor || ""), bk = bkOn(p, d), r = d ? roomTag(e, d, (plan[d] || []).find(u => UNIT[u].k === k)) : "";
        const c = (S.vendors || []).find(x => x.name && v && x.name.replace(/\s/g, "") === v.replace(/\s/g, ""));
        return `<span>${d ? dl(d) + " " : ""}${r ? H(r) + " " : ""}<b>${v ? H(v) : "업체 미정"}</b>${c && c.phone ? ` <a href="tel:${H(c.phone.replace(/[^\d+]/g, ""))}" target="_blank" rel="noopener">📞</a>` : ""} <small class="${bk ? "ok" : "no"}">${bk ? "✓ 연락" : "☎ 연락 전"}</small></span>`; });
      outs.push(`<div class="sum-row"><i>${H(KIND_LABEL[k] || k)}</i><span class="ol">${list.join("")}</span></div>`); }
    if (outs.length) h += `<div class="sum-sub">외주</div>` + outs.join("");
    const memo = String(e.memo || "").trim();
    if (memo) h += `<div class="sum-row"><i>메모</i><span>${H(memo.length > 140 ? memo.slice(0, 140) + "…" : memo)}</span></div>`;
    const box = document.createElement("div"); box.className = "sumbox"; box.innerHTML = `<div class="sum-h">현장 요약</div>` + h;
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
  st.textContent = `.sumbox{margin:8px 0 10px;padding:12px;border:1px solid var(--line,#e5e5e5);border-radius:14px;background:var(--surface2,#f7f6f3);font-size:13px;line-height:1.45}
  .sumbox .sum-h{font-weight:800;font-size:12px;letter-spacing:.04em;color:var(--muted,#777);margin-bottom:6px}
  .sumbox .sum-top{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px}.sumbox .sum-top span{color:var(--muted,#777)}
  .sumbox .sum-row{display:flex;gap:8px;margin:4px 0}.sumbox .sum-row>i{flex:none;width:58px;font-style:normal;font-weight:700;color:var(--muted,#777)}
  .sumbox .sum-sub{font-weight:800;margin:8px 0 2px}
  .sumbox .sum-days{display:grid;gap:3px;margin:6px 0}
  .sumbox .sd{display:flex;align-items:baseline;gap:8px;padding:3px 6px;border-radius:8px}.sumbox .sd>b{flex:none;width:64px}
  .sumbox .sd.now{background:rgba(31,78,95,.1)}.sumbox .sd.past{opacity:.6}
  .sumbox .sp{flex:1;display:flex;flex-wrap:wrap;gap:4px 8px}.sumbox .sp small{margin-left:3px;color:var(--muted,#777)}
  .sumbox .sp em{margin-left:3px;font-style:normal;font-size:11px;padding:0 5px;border-radius:6px;background:#fbe3c8;color:#8a4b00}
  .sumbox .sp .ok{color:#2f7d4f}.sumbox .cr{flex:none;color:var(--muted,#777)}
  .sumbox .ol{display:grid;gap:2px}.sumbox .ol a{text-decoration:none}.sumbox small.ok{color:#2f7d4f}.sumbox small.no{color:#b3412f}`;
  document.head.appendChild(st);
  new MutationObserver(add).observe(dlg, {childList: true, attributes: true, attributeFilter: ["hidden"]});
})();
