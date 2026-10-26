/* 904 캘린더 · 외주 업체 연락처
   공정 칸(도기·철거·방수…)을 눌러 뜨는 창에서, 적힌 외주 업체의 연락처와 [📞 전화] 버튼을 보여줌
   연락처가 없으면 그 자리에서 적어 저장 (config/vendors {list:[{name, person, phone, kinds, note}]}) */
(function(){
  const dlg = document.getElementById("dlg"); if (!dlg || typeof S === "undefined") return;
  S.vendors = S.vendors || [];
  const nk = s => String(s || "").replace(/\s+/g, "").toLowerCase();
  const find = name => { const n = nk(name); if (!n) return null;
    return S.vendors.find(v => nk(v.name) === n) || S.vendors.find(v => nk(v.name) && (n.includes(nk(v.name)) || nk(v.name).includes(n))) || null; };
  const telOf = p => String(p || "").replace(/[^\d+]/g, "");
  const H = s => (typeof esc === "function" ? esc(s) : String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])));
  function card(v, name, k){
    const d = document.createElement("div"); d.className = "vcard";
    d.style.cssText = "display:flex;align-items:center;gap:8px;margin:8px 0 4px;padding:10px 12px;border-radius:12px;background:var(--surface2,#f4f4f4);border:1px solid var(--line,#e5e5e5)";
    if (v && v.phone){
      d.innerHTML = `<span style="flex:1;min-width:0;line-height:1.35"><b style="display:block">${H(v.name)}${v.person ? " " + H(v.person) : ""}</b><small style="color:var(--muted,#777)">${H(v.phone)}</small></span>
        <a href="tel:${telOf(v.phone)}" target="_blank" rel="noopener" style="flex:none;display:inline-flex;align-items:center;gap:4px;padding:10px 16px;border-radius:999px;background:#2f7d4f;color:#fff;font-weight:700;text-decoration:none">📞 전화</a>`;
      return d;
    }
    if (S.canWrite && name){
      d.innerHTML = `<span style="flex:1;min-width:0;font-size:13px">${H(name)} 연락처</span><input data-vtel="${H(name)}" inputmode="tel" placeholder="010-0000-0000" style="width:130px"><button type="button" class="btn sm" data-vsave="${H(name)}" data-vk="${H(k)}">저장</button>`;
      return d;
    }
    return null;
  }
  function add(){
    if (dlg.hidden) return;
    dlg.querySelectorAll(".vcard").forEach(x => x.remove());
    dlg.querySelectorAll(".pout").forEach(row => {
      const inp = row.querySelector("[data-uv]"); if (!inp) return;
      const name = inp.value.trim(); if (!name) return;
      const c = card(find(name), name, inp.dataset.uv); if (c) row.after(c);
    });
  }
  // 창을 새로 그릴 때마다 붙임 (dlg 바로 아래만 지켜봄 → 내가 붙인 건 다시 안 걸림)
  new MutationObserver(add).observe(dlg, {childList: true, attributes: true, attributeFilter: ["hidden"]});
  let T = 0;
  document.addEventListener("input", ev => { if (ev.target.matches && ev.target.matches("#dlg [data-uv]")){ clearTimeout(T); T = setTimeout(add, 500); } });
  document.addEventListener("click", async ev => {
    const b = ev.target.closest && ev.target.closest("[data-vsave]"); if (!b || !dlg.contains(b) || !S.canWrite) return;
    const name = b.dataset.vsave, i = [...dlg.querySelectorAll("[data-vtel]")].find(x => x.dataset.vtel === name), ph = (i && i.value || "").trim();
    if (!ph){ if (typeof toast === "function") toast("연락처를 적어주세요"); return; }
    const old = find(name), list = S.vendors.filter(v => v !== old);
    list.push({...(old || {}), name: old ? old.name : name, phone: ph, kinds: [...new Set([...((old && old.kinds) || []), b.dataset.vk].filter(Boolean))]});
    S.vendors = list; add();
    if (S.db && typeof write === "function") await write(() => S.db.doc("config/vendors").set({list, updatedAt: new Date().toISOString()}), "업체 연락처를 저장했어요");
  });
  // DB가 연결되면 업체 연락처를 불러와서 계속 따라감
  const iv = setInterval(() => { if (!S.db) return; clearInterval(iv);
    try { S.db.doc("config/vendors").onSnapshot(s => { const d = s.exists ? s.data() : null; S.vendors = (d && Array.isArray(d.list)) ? d.list : []; add(); }, () => {}); } catch(_){}
  }, 300);
  setTimeout(() => clearInterval(iv), 30000);
})();
