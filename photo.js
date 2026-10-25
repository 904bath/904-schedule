/* 904 캘린더 · 현장 창마다 '현장사진 올리기' 버튼
   현장 제목(현장 정보) · 공정 칸(타일·액방·도막…) · 일정 전체 창 — 어디를 눌러 열든 그 현장으로 올림
   (photoUrl 은 site.js) */
(function(){
  const dlg = document.getElementById("dlg"); if (!dlg) return;
  const cur = () => {
    try { if (typeof SI !== "undefined" && SI && SI.e) return SI.e; } catch(_){}
    try { if (typeof U !== "undefined" && U && U.e) return U.e; } catch(_){}
    try { if (typeof D !== "undefined" && D && D.id) return D; } catch(_){}
    return null;
  };
  const add = () => {
    if (dlg.hidden || dlg.querySelector(".s-photo") || typeof photoUrl !== "function") return;
    const e = cur(); if (!e || !String(e.title || "").trim()) return;
    const b = dlg.querySelector(".dl-b"); if (!b) return;
    const a = document.createElement("a");
    a.className = "pill reqlink s-photo"; a.href = photoUrl(e); a.target = "_blank"; a.rel = "noopener";
    a.textContent = "📷 현장사진 올리기 ↗";
    a.style.cssText = "display:flex;justify-content:center;gap:6px;margin:8px 0 10px;padding:11px 12px;font-weight:700;text-decoration:none";
    const site = b.querySelector(":scope > .u-site");
    if (site) site.after(a); else b.prepend(a);
  };
  new MutationObserver(add).observe(dlg, {childList: true, attributes: true, attributeFilter: ["hidden"]});
})();
