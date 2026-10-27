/**
 * 904 외주 회신 받기 (구글 앱스 스크립트)
 * 업체가 회신 페이지(904bath.github.io/904-schedule/r.html)에서 누른 답을 받아서
 *  1) 구글 시트 「904 외주 회신」에 한 줄씩 쌓고
 *  2) 904bath@gmail.com 으로 "[외주 회신] …" 메일을 보냄 → 904 캘린더가 이 메일을 읽어 칩으로 보여줌
 *
 * 배포: 배포 → 새 배포 → 유형 "웹 앱" → 실행: 나 / 액세스: 모든 사용자 → 나온 웹 앱 URL(…/exec)을 Claude에게 알려주기
 */
var TO = "904bath@gmail.com";
var SHEET_NAME = "904 외주 회신";
var ANS = {ok: "가능", alt: "다른 날 가능", no: "불가능"};

function doGet() {
  return ContentService.createTextOutput("904 외주 회신 받는 곳이에요").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var d;
  try { d = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (err) { return out({ok: false, error: "bad json"}); }
  if (!d || d.t !== "outreply" || !d.ev || !d.kk || !ANS[d.ans]) return out({ok: false, error: "bad data"});

  // 넘치는 값 자르기 (업체가 적는 칸이라)
  var clip = function (s, n) { return String(s == null ? "" : s).slice(0, n); };
  var dateOk = function (x) { return /^\d{4}-\d\d-\d\d$/.test(x); };
  var data = {
    v: 1, t: "outreply", ev: clip(d.ev, 40), kk: clip(d.kk, 10), c: clip(d.c, 20),
    ds: (d.ds || []).filter(dateOk).slice(0, 10), ans: d.ans, alt: (d.alt || []).filter(dateOk).slice(0, 5),
    amount: Math.max(0, Math.min(Number(d.amount) || 0, 100000000)), note: clip(d.note, 300), by: clip(d.by, 40),
    vendor: clip(d.vendor, 40), site: clip(d.site, 60), k: clip(d.k, 20), at: new Date().toISOString()
  };
  var label = ANS[data.ans];

  // 1) 시트에 기록
  try {
    var ss = sheet_();
    ss.appendRow([new Date(), label, data.by || data.vendor, data.site, data.k, data.ds.join(", "), data.alt.join(", "), data.amount || "", data.note, data.ev, data.kk]);
  } catch (err) {}

  // 2) 메일 (캘린더가 읽는 곳)
  var lines = [
    "[" + data.k + " 외주 회신] " + label,
    "현장: " + data.site,
    "업체: " + (data.by || data.vendor),
    "요청 일정: " + (data.ds.join(", ") || "협의"),
    data.alt.length ? "가능한 날: " + data.alt.join(", ") : "",
    data.amount ? "예상 견적: " + data.amount.toLocaleString() + "원" : "",
    data.note ? "메모: " + data.note : "",
    "",
    "904OUT" + JSON.stringify(data) + "904END"
  ].filter(function (x) { return x !== ""; });
  MailApp.sendEmail({
    to: TO,
    subject: "[외주 회신] " + label + " · " + (data.by || data.vendor || "업체") + " · " + data.site + " · " + data.k,
    body: lines.join("\n"),
    name: "904 외주 회신"
  });
  return out({ok: true});
}

function sheet_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty("SHEET_ID"), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (err) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    ss.getSheets()[0].appendRow(["받은 시각", "회신", "업체", "현장", "공정", "요청 일정", "가능한 날", "예상 견적", "메모", "일정 id", "공정 코드"]);
    props.setProperty("SHEET_ID", ss.getId());
  }
  return ss.getSheets()[0];
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** 처음 한 번 이걸 실행해서 권한(메일 보내기·시트 만들기)을 허용해 주세요 */
function setup() {
  sheet_();
  MailApp.sendEmail(TO, "[904] 외주 회신 받기 준비 완료", "이제 업체 회신이 이 메일함과 구글 시트 「" + SHEET_NAME + "」에 쌓여요.");
}
