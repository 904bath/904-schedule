/* 904 일정 공유 · 보기 전용 마무리 (main.js 다음에 불러옴)
   - 관리 메뉴·일정 추가·수정 버튼 없음
   - 일정을 누르면 '현장 정보'만 (고칠 수 없음)
   - 맨 위 줄에 마지막 갱신 시각 */
S.canWrite = false;
const _vBanner = renderBanner;
renderBanner = function(){
  _vBanner();
  for (const s of ["#pendChip", "#qrChip", "#reqChip", "#fab", "#fabNow"]){ const c = $(s); if (c) c.hidden = true; }
  const b = $("#banner"), at = window.SHARE_AT;
  b.textContent = at ? `보기 전용 · ${fmtAt(at)} 기준 일정이에요` : "일정을 불러오는 중이에요…";
  b.hidden = false; b.classList.add("vbanner");
};
function fmtAt(iso){ const d = new Date(iso); if (isNaN(d)) return ""; return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
// 일정 전체 수정 창 대신 현장 정보(읽기 전용)
openEvent = function(id){ closeSheet(); openSite(id); };
// 관리 탭으로는 못 감
const _vSetTab = setTab;
setTab = function(t){ _vSetTab(t === "agenda" ? "agenda" : "cal"); };
window.SHARE_DATA.then(d => { window.SHARE_AT = d?.at || ""; if (!d) toast("일정을 불러오지 못했어요. 새로고침해 주세요"); renderAll(); });
// 다시 열거나 화면으로 돌아오면 새 데이터 확인
document.addEventListener("visibilitychange", () => { if (document.visibilityState !== "visible") return;
  fetch("data.json?t=" + Date.now(), {cache: "no-store"}).then(r => r.json()).then(d => { if (d?.at && d.at !== window.SHARE_AT) location.reload(); }).catch(() => {}); });
// 인원 칸을 눌러도 사람 고르기 창은 안 뜸 (보기 전용)
window.addEventListener("click", ev => { if (ev.target.closest("#cal .pcrew .pc-d[data-ck]")){ ev.stopPropagation(); ev.preventDefault(); } }, true);
