/* 904 일정 공유 · 읽기 전용 데이터 연결
   캘린더 앱 DB 대신 data.json(하루 몇 번 자동 갱신)을 읽어서 똑같이 보여줌. 저장은 전부 막음. */
(function(){
  try { localStorage.setItem("tab", "cal"); localStorage.setItem("view", "cal"); } catch(_){}
  const ro = () => Promise.reject({code: "invalid_argument", message: "보기 전용"});
  const P = fetch("data.json?t=" + Date.now(), {cache: "no-store"}).then(r => r.ok ? r.json() : null).catch(() => null);
  window.SHARE_DATA = P;
  const snapC = obj => ({docs: Object.entries(obj || {}).map(([id, v]) => ({id, data: () => structuredClone(v), exists: true})), empty: !obj || !Object.keys(obj).length});
  const docRef = path => ({
    onSnapshot(cb){ P.then(d => { const [c, id] = path.split("/"); const v = d?.[c]?.[id]; cb({exists: !!v, id, data: () => v ? structuredClone(v) : undefined}); }); return () => {}; },
    get(){ return P.then(d => { const [c, id] = path.split("/"); const v = d?.[c]?.[id]; return {exists: !!v, id, data: () => v}; }); },
    set: ro, update: ro, delete: ro
  });
  const coll = name => ({
    onSnapshot(cb){ P.then(d => cb(snapC(d?.[name]))); return () => {}; },
    get(){ return P.then(d => snapC(d?.[name])); },
    doc: id => docRef(name + "/" + id), add: ro, where(){ return this; }, orderBy(){ return this; }, limit(){ return this; }
  });
  const db = {collection: coll, doc: docRef};
  window.claude = {use: async cap => cap === "db" ? db : cap === "user" ? {can: async () => false} : null};
})();
