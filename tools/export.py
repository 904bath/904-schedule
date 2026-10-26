"""904 일정 공유용 data.json 만들기 (돈·통화 원문·집 주소 등은 뺌)
사용: python3 export.py <ArtifactData out_dir> <data.json 저장 경로>
out_dir 구조: events/*.json, workers/*.json, config/*.json (ArtifactData list ... out_dir 결과)
"""
import json, sys, glob, os, datetime

src, out = sys.argv[1], sys.argv[2]

def load(coll):
    r = {}
    for f in sorted(glob.glob(os.path.join(src, coll, "*.json"))):
        try:
            d = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        if isinstance(d, dict) and "data" in d and isinstance(d["data"], dict) and set(d) <= {"id", "data", "version"}:
            d = d["data"]
        r[os.path.splitext(os.path.basename(f))[0]] = d
    return r

EV_DROP = {"contract", "contractMemo", "source", "auto", "quoteId", "qreq", "photos", "photoInfo",
           "learned", "pay", "paid", "money", "price", "amount", "lock"}
PROC_DROP = {"amount", "paid", "paidDate", "price", "pay", "rnotes", "memoMoney"}

def clean_event(e):
    e = {k: v for k, v in e.items() if k not in EV_DROP}
    p = e.get("proc")
    if isinstance(p, dict):
        e["proc"] = {k: ({a: b for a, b in v.items() if a not in PROC_DROP} if isinstance(v, dict) else v) for k, v in p.items()}
        for v in e["proc"].values():  # 날짜별 외주 기록(dd)도 업체 이름만 남김
            if isinstance(v, dict) and isinstance(v.get("dd"), dict):
                v["dd"] = {d: ({"vendor": x.get("vendor", "")} if isinstance(x, dict) else {}) for d, x in v["dd"].items()}
    if isinstance(e.get("mat"), dict):
        e["mat"] = {a: b for a, b in e["mat"].items() if a not in PROC_DROP}
    e["photos"], e["photoInfo"] = [], {}
    return e

def clean_worker(w):
    return {k: w.get(k) for k in ("name", "group", "team", "phone", "auto") if k in w} | {"wage": 0}

events = {k: clean_event(v) for k, v in load("events").items()}
workers = {k: clean_worker(v) for k, v in load("workers").items()}
cfg = load("config")
config = {}
if "companies" in cfg:
    c = cfg["companies"]
    config["companies"] = {"leaders": c.get("leaders", []), "list": [{"name": x.get("name"), "leader": x.get("leader"), "also": x.get("also", [])} for x in c.get("list", [])]}
if "vendors" in cfg:  # 외주 업체 연락처 (이름·담당·전화만)
    config["vendors"] = {"list": [{k: x.get(k, "") for k in ("name", "person", "phone")} for x in cfg["vendors"].get("list", []) if isinstance(x, dict)]}
if "main" in cfg:  # 등급 이름만 (일당 뺌)
    g = cfg["main"].get("groups", {})
    config["main"] = {"groups": {k: {"label": (v or {}).get("label", ""), "wage": 0} for k, v in g.items()}}

at = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat(timespec="minutes")
data = {"at": at, "events": events, "workers": workers, "config": config}
json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"events {len(events)} · workers {len(workers)} · {at}")
