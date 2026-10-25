/* 904 캘린더 · 현장 창마다 '현장사진 올리기' · '사진 보기' 버튼
   현장 제목(현장 정보) · 공정 칸(타일·액방·도막…) · 일정 전체 창 — 어디를 눌러 열든 그 현장으로
   (photoUrl·PHOTO_APP 은 site.js) */
(function(){
  const dlg = document.getElementById("dlg"); if (!dlg) return;
  const cur = () => {
    try { if (typeof SI !== "undefined" && SI && SI.e) return SI.e; } catch(_){}
    try { if (typeof U !== "undefined" && U && U.e) return U.e; } catch(_){}
    try { if (typeof D !== "undefined" && D && D.id) return D; } catch(_){}
    return null;
  };
  const link = (cls, href, text, solid) => {
    const a = document.createElement("a");
    a.className = "pill reqlink " + cls; a.href = href; a.target = "_blank"; a.rel = "noopener"; a.textContent = text;
    a.style.cssText = "flex:1;display:flex;justify-content:center;gap:6px;margin:0;padding:11px 8px;font-weight:700;text-decoration:none" + (solid ? "" : ";opacity:.85");
    return a;
  };
  const add = () => {
    if (dlg.hidden || typeof photoUrl !== "function") return;
    if (dlg.querySelector(".s-photo") && dlg.querySelector(".s-view")) return;
    const e = cur(); if (!e || !String(e.title || "").trim()) return;
    const b = dlg.querySelector(".dl-b"); if (!b) return;
    const view = `${PHOTO_APP}?view=photos&site=${encodeURIComponent(String(e.title).trim())}`;
    let up = dlg.querySelector(".s-photo");
    const row = document.createElement("div");
    row.className = "s-photorow"; row.style.cssText = "display:flex;gap:8px;margin:8px 0 10px";
    if (up){ up.replaceWith(row); up.style.margin = "0"; up.style.flex = "1"; up.style.padding = "11px 8px"; up.textContent = "📷 사진 올리기"; }
    else up = link("s-photo", photoUrl(e), "📷 사진 올리기", true);
    row.append(up, link("s-view", view, "📁 사진 보기"));
    if (!row.parentNode){ const site = b.querySelector(":scope > .u-site"); if (site) site.after(row); else b.prepend(row); }
  };
  new MutationObserver(add).observe(dlg, {childList: true, attributes: true, attributeFilter: ["hidden"]});
})();
