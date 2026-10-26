// 904 현장사진 업로드 — 구글 드라이브 「904 현장사진 / 현장명 / 날짜」 폴더로 자동 정리
// 현장 없이 올린 사진은 「904 현장사진 / 미분류」 → 매일 밤 sortInbox()가 904 캘린더 일정과 맞춰서 옮김
const ROOT_NAME = '904 현장사진';
const INBOX_NAME = '미분류';
const DATA_URL = 'https://904bath.github.io/904-schedule/data.json';
const TZ = 'Asia/Seoul';

function getRoot_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROOT_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) {}
  }
  const it = DriveApp.getFoldersByName(ROOT_NAME);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_NAME);
  props.setProperty('ROOT_ID', folder.getId());
  return folder;
}

function child_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function clean_(s) {
  return String(s || '').replace(/[\\/:*?"<>|#]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || INBOX_NAME;
}

function today_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

const isDay_ = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.view === 'photos') {
    const g = HtmlService.createTemplateFromFile('Gallery');
    g.site = p.site ? clean_(p.site) : '';
    let data = null, pre = {};
    try {
      data = g.site ? listPhotos(g.site) : listSites();
      const ids = g.site ? [].concat.apply([], data.map(d => d.files.map(f => f.id))) : data.sites.map(x => x.cover).filter(Boolean);
      pre = cachedThumbs_(ids.slice(0, 24));
    } catch (err) {}
    g.data = data; g.pre = pre;
    return g.evaluate()
      .setTitle('904 현장사진 보기')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  const t = HtmlService.createTemplateFromFile('Upload');
  t.site = p.site ? clean_(p.site) : '';
  t.date = isDay_(p.date) ? p.date : today_();
  return t.evaluate()
    .setTitle('904 사진 올리기')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// meta: {taken: ISO 문자열, lat, lng} — 사진에 남아 있던 찍은 시각·위치 (없을 수 있음)
function upload(site, date, who, name, mime, b64, meta) {
  if (!/^image\//.test(mime || '')) throw new Error('사진 파일만 올릴 수 있어요');
  meta = meta || {};
  const taken = meta.taken ? new Date(meta.taken) : null;
  const takenOk = taken && !isNaN(taken);
  const hasSite = String(site || '').trim() !== '';
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let folder;
  try {
    const root = getRoot_();
    if (hasSite) {
      folder = child_(child_(root, clean_(site)), isDay_(date) ? date : today_());
    } else {
      folder = child_(root, INBOX_NAME);
    }
  } finally {
    lock.releaseLock();
  }
  const when = takenOk ? taken : new Date();
  const stamp = Utilities.formatDate(when, TZ, hasSite ? 'HHmmss' : 'yyyy-MM-dd_HHmmss');
  const fileName = (who ? clean_(who) + '_' : '') + stamp + '_' + clean_(name);
  const f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, fileName));
  const info = {taken: takenOk ? taken.toISOString() : '', up: new Date().toISOString()};
  if (isFinite(meta.lat) && isFinite(meta.lng)) { info.lat = +meta.lat; info.lng = +meta.lng; }
  f.setDescription(JSON.stringify(info));
  if (meta.thumb && meta.thumb.length < 90000) { try { C_().put('th:' + f.getId(), JSON.stringify({type: 'image/jpeg', b64: meta.thumb}), 21600); } catch (e) {} }
  bump_();
  return { ok: true, inbox: !hasSite };
}

// ───────── 미분류 자동 정리 ─────────

function dayOf_(info, file) {
  const d = info.taken ? new Date(info.taken) : (info.up ? new Date(info.up) : file.getDateCreated());
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}

function evEnd_(e) { return e.end && e.end >= e.start ? e.end : e.start; }

function candidates_(data, day) {
  const leaders = (((data.config || {}).companies || {}).leaders) || [];
  const ours = new Set(leaders.filter(l => l.ours).map(l => l.color));
  const all = Object.values(data.events || {}).filter(e =>
    e && e.title && e.start && e.start <= day && day <= evEnd_(e) && !(e.off || []).includes(day));
  const mine = all.filter(e => ours.has(e.color));
  return mine.length ? mine : all;
}

function geocode_(addr) {
  const a = String(addr || '').replace(/\d+\s*[\/동호-]\s*\d+.*$/, '').trim();
  if (!a) return null;
  const cache = CacheService.getScriptCache(), k = 'geo:' + a;
  const hit = cache.get(k);
  if (hit) return hit === 'x' ? null : JSON.parse(hit);
  let p = null;
  try {
    const r = Maps.newGeocoder().setRegion('kr').setLanguage('ko').geocode(a);
    if (r.status === 'OK' && r.results.length) p = r.results[0].geometry.location;
  } catch (e) {}
  cache.put(k, p ? JSON.stringify(p) : 'x', 21600);
  return p;
}

function km_(a, b) {
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pick_(cands, info) {
  if (cands.length === 1) return cands[0];
  if (!cands.length || !isFinite(info.lat)) return null;
  const me = {lat: info.lat, lng: info.lng};
  const scored = cands.map(e => { const p = geocode_(e.addr); return p ? {e, d: km_(me, p)} : null; })
    .filter(Boolean).sort((a, b) => a.d - b.d);
  if (!scored.length || scored[0].d > 1.5) return null;
  if (scored[1] && scored[1].d - scored[0].d < 0.3) return null; // 둘 다 가까우면 애매
  return scored[0].e;
}

function sortInbox() {
  const root = getRoot_();
  const inbox = child_(root, INBOX_NAME);
  const files = [];
  const it = inbox.getFiles();
  while (it.hasNext()) files.push(it.next());
  if (!files.length) return 'empty';
  const data = JSON.parse(UrlFetchApp.fetch(DATA_URL + '?t=' + Date.now(), {muteHttpExceptions: false}).getContentText());
  const moved = {}, left = [];
  for (const f of files) {
    let info = {};
    try { info = JSON.parse(f.getDescription() || '{}'); } catch (e) {}
    const day = dayOf_(info, f);
    const e = pick_(candidates_(data, day), info);
    if (!e) { left.push(day + '  ' + f.getName()); continue; }
    f.moveTo(child_(child_(root, clean_(e.title)), day));
    const k = clean_(e.title) + ' (' + day + ')';
    moved[k] = (moved[k] || 0) + 1;
  }
  if (left.length) {
    const body = [
      '미분류에 남은 사진 ' + left.length + '장 — 어느 현장인지 못 정했어요.',
      '드라이브 「904 현장사진 › 미분류」에서 직접 옮기시거나, Claude에게 "미분류 사진 정리해줘"라고 해주세요.',
      '',
      left.join('\n'),
      '',
      Object.keys(moved).length ? '자동으로 옮긴 사진:\n' + Object.entries(moved).map(([k, n]) => '· ' + k + ' ' + n + '장').join('\n') : '',
      '',
      inbox.getUrl()
    ].join('\n');
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '[904] 미분류 현장사진 ' + left.length + '장', body);
  }
  if (Object.keys(moved).length) bump_();
  return JSON.stringify({moved, left: left.length});
}

// 한 번 실행: 매일 밤 10시쯤 sortInbox 자동 실행 + 권한 승인
function setupNightly() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sortInbox').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sortInbox').timeBased().atHour(22).nearMinute(10).everyDays(1).inTimezone(TZ).create();
  getRoot_(); child_(getRoot_(), INBOX_NAME);
  Logger.log('ok: ' + sortInbox());
}

// 처음 한 번 실행해서 권한 승인 + 루트 폴더 생성
function setup() {
  Logger.log(getRoot_().getUrl());
}

// ───────── 현장 사진 보기 (팀원용, 드라이브 공유 없이) ─────────

function siteFolder_(site) {
  const it = getRoot_().getFoldersByName(clean_(site));
  return it.hasNext() ? it.next() : null;
}

// 현장 목록 (최근에 사진 올라온 현장부터) — 미분류는 개수만
function listSites() { return cached_('ls', listSites_); }
function listSites_() {
  const root = getRoot_(), out = [];
  let inbox = 0;
  const it = root.getFolders();
  while (it.hasNext()) {
    const f = it.next(), name = f.getName();
    if (name === INBOX_NAME) { const fi = f.getFiles(); while (fi.hasNext()) { fi.next(); inbox++; } continue; }
    let n = 0, last = '', cover = '', coverV = false;
    const di = f.getFolders();
    while (di.hasNext()) {
      const d = di.next(), day = d.getName(), fi = d.getFiles();
      let first = null, c = 0;
      while (fi.hasNext()) { const x = fi.next(); if (/^(image|video)\//.test(x.getMimeType())) { c++; if (!first || /^image/.test(x.getMimeType()) && !/^image/.test(first.getMimeType())) first = x; } }
      n += c;
      if (c && day > last) { last = day; cover = first.getId(); coverV = /^video/.test(first.getMimeType()); }
    }
    if (n) out.push({site: name, n, last, cover, coverV});
  }
  out.sort((a, b) => a.last < b.last ? 1 : a.last > b.last ? -1 : a.site.localeCompare(b.site, 'ko'));
  allow_(out.map(x => x.cover).filter(Boolean));
  return {sites: out, inbox};
}

// 날짜 폴더별 사진 목록 (최근 날짜부터)
function listPhotos(site) { return cached_('lp:' + clean_(site), () => listPhotos_(site)); }
function listPhotos_(site) {
  const f = siteFolder_(site);
  if (!f || clean_(site) === INBOX_NAME) return [];
  const days = [];
  const it = f.getFolders();
  while (it.hasNext()) {
    const d = it.next(), files = [];
    const fi = d.getFiles();
    while (fi.hasNext()) {
      const x = fi.next();
      const mt = x.getMimeType();
      if (/^(image|video)\//.test(mt)) files.push({id: x.getId(), name: x.getName(), v: /^video\//.test(mt), t: x.getDateCreated().getTime()});
    }
    files.sort((a, b) => a.name < b.name ? -1 : 1);
    if (files.length) days.push({day: d.getName(), files});
  }
  days.sort((a, b) => a.day < b.day ? 1 : -1);
  allow_([].concat.apply([], days.map(d => d.files.map(x => x.id))));
  return days;
}

// 904 현장사진 폴더 안(현장/날짜)의 사진만 꺼내줌
function inSite_(f) {
  const root = getRoot_().getId();
  const p1 = f.getParents();
  while (p1.hasNext()) {
    const day = p1.next(), p2 = day.getParents();
    while (p2.hasNext()) {
      const site = p2.next(), p3 = site.getParents();
      while (p3.hasNext()) if (p3.next().getId() === root && site.getName() !== INBOX_NAME) return true;
    }
  }
  return false;
}
function checked_(id) {
  const f = DriveApp.getFileById(id);
  if (!C_().get('ok:' + id) && !inSite_(f)) throw new Error('볼 수 없는 사진이에요');
  return f;
}
function getPhoto(id, small) {
  const f = checked_(id);
  const isV = /^video\//.test(f.getMimeType());
  if (isV && !small && f.getSize() > 20 * 1024 * 1024) return {big: true};
  let b = null;
  if (small) { try { b = f.getThumbnail(); } catch (e) {} }
  if (!b && isV && small) return {none: true};
  if (!b) b = f.getBlob();
  return {type: b.getContentType() || 'image/jpeg', b64: Utilities.base64Encode(b.getBytes())};
}

// ───────── 동영상 (큰 파일) — 드라이브에 조각으로 이어 올림 ─────────
const UP_BASE = 'https://www.googleapis.com/upload/drive/v3/files';

function folderFor_(site, date) {
  const hasSite = String(site || '').trim() !== '';
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const root = getRoot_();
    return hasSite ? child_(child_(root, clean_(site)), isDay_(date) ? date : today_()) : child_(root, INBOX_NAME);
  } finally {
    lock.releaseLock();
  }
}

// 올리기 시작: 드라이브 이어올리기 주소를 만들어 돌려줌
function startVideo(site, date, name, mime, size, meta) {
  if (!/^video\//.test(mime || '')) throw new Error('동영상 파일만 올릴 수 있어요');
  size = Number(size);
  if (!(size > 0) || size > 2 * 1024 * 1024 * 1024) throw new Error('동영상이 너무 커요 (2GB까지)');
  meta = meta || {};
  const hasSite = String(site || '').trim() !== '';
  const folder = folderFor_(site, date);
  const taken = meta.taken ? new Date(meta.taken) : null;
  const when = taken && !isNaN(taken) ? taken : new Date();
  const stamp = Utilities.formatDate(when, TZ, hasSite ? 'HHmmss' : 'yyyy-MM-dd_HHmmss');
  const info = {taken: taken && !isNaN(taken) ? taken.toISOString() : '', up: new Date().toISOString()};
  if (isFinite(meta.lat) && isFinite(meta.lng)) { info.lat = +meta.lat; info.lng = +meta.lng; }
  const res = UrlFetchApp.fetch(UP_BASE + '?uploadType=resumable&fields=id', {
    method: 'post',
    contentType: 'application/json; charset=UTF-8',
    headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(size)},
    payload: JSON.stringify({name: stamp + '_' + clean_(name), parents: [folder.getId()], description: JSON.stringify(info), mimeType: mime}),
    muteHttpExceptions: true
  });
  const loc = res.getHeaders()['Location'] || res.getHeaders()['location'];
  if (res.getResponseCode() !== 200 || !loc) throw new Error('올리기를 시작하지 못했어요');
  return loc;
}

// 조각 하나 올리기 (start 바이트부터). 끝나면 done:true
function putVideo(url, b64, start, total) {
  if (String(url).indexOf(UP_BASE + '?') !== 0) throw new Error('잘못된 주소');
  const bytes = Utilities.base64Decode(b64);
  const end = start + bytes.length - 1;
  const res = UrlFetchApp.fetch(url, {
    method: 'put',
    contentType: 'application/octet-stream',
    headers: {'Content-Range': 'bytes ' + start + '-' + end + '/' + total},
    payload: bytes,
    muteHttpExceptions: true
  });
  const c = res.getResponseCode();
  if (c === 200 || c === 201) { bump_(); return {done: true}; }
  if (c === 308) { const r = res.getHeaders()['Range'] || res.getHeaders()['range'] || ''; const m = /-(\d+)$/.exec(r); return {done: false, next: m ? +m[1] + 1 : end + 1}; }
  throw new Error('조각 올리기 실패 (' + c + ')');
}

// ───────── 빠르게 보기: 목록·작은 사진 기억 (최대 6시간) ─────────
function C_() { return CacheService.getScriptCache(); }
function ver_() { return PropertiesService.getScriptProperties().getProperty('PV') || '1'; }
function bump_() {
  try { const p = PropertiesService.getScriptProperties(); p.setProperty('PV', String((+p.getProperty('PV') || 1) + 1)); } catch (e) {}
}
function cached_(key, fn) {
  const k = key + '@' + ver_(), c = C_();
  const hit = c.get(k);
  if (hit) return JSON.parse(hit);
  const v = fn(), s = JSON.stringify(v);
  if (s.length < 95000) c.put(k, s, 1800);
  return v;
}
function allow_(ids) {
  if (!ids.length) return;
  const m = {}; ids.forEach(i => m['ok:' + i] = '1');
  try { C_().putAll(m, 21600); } catch (e) {}
}
function cachedThumbs_(ids) {
  const out = {};
  if (!ids.length) return out;
  const hit = C_().getAll(ids.map(i => 'th:' + i));
  ids.forEach(i => { const h = hit['th:' + i]; if (h) out[i] = JSON.parse(h); });
  return out;
}

// 작은 사진 여러 장을 한 번에 (기억해둔 건 바로, 없는 것만 드라이브에서)
function getThumbs(ids) {
  ids = (ids || []).slice(0, 15).map(String);
  const out = cachedThumbs_(ids), put = {};
  for (const id of ids) {
    if (out[id]) continue;
    try {
      const f = checked_(id);
      let b = null; try { b = f.getThumbnail(); } catch (e) {}
      if (!b) { out[id] = null; continue; }
      const r = {type: b.getContentType() || 'image/jpeg', b64: Utilities.base64Encode(b.getBytes())}, s = JSON.stringify(r);
      out[id] = r;
      if (s.length < 95000) put['th:' + id] = s;
    } catch (e) { out[id] = null; }
  }
  if (Object.keys(put).length) { try { C_().putAll(put, 21600); } catch (e) {} }
  return out;
}

// 4시간마다: 최근 현장 목록·작은 사진을 미리 불러둠 (볼 때 바로 뜨게)
function warmCache() {
  const st = Date.now();
  const r = listSites();
  getThumbs(r.sites.map(x => x.cover).filter(Boolean));
  for (const x of r.sites.slice(0, 15)) {
    if (Date.now() - st > 4 * 60 * 1000) break;
    const ids = [].concat.apply([], listPhotos(x.site).map(d => d.files.map(f => f.id)));
    for (let i = 0; i < ids.length && Date.now() - st < 4 * 60 * 1000; i += 15) getThumbs(ids.slice(i, i + 15));
  }
}
function setupWarm() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'warmCache').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('warmCache').timeBased().everyHours(4).create();
  const t0 = Date.now(); warmCache(); Logger.log('warm ok ' + (Date.now() - t0) + 'ms');
}
