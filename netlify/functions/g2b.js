// 나라장터(G2B) 입찰공고 검색 — Netlify Function
// 기존 로컬 app.py의 로직을 그대로 포팅했습니다.
// 서비스키는 Netlify 환경변수(G2B_SERVICE_KEY)에서만 읽고, 클라이언트에는 절대 내려주지 않습니다.
// "확인함/킵" 상태와 검색 키워드 설정은 Netlify Blobs에 팀 공용으로 저장합니다.

const { getStore } = require("@netlify/blobs");

const BASE_URL = "http://apis.data.go.kr/1230000/ad/BidPublicInfoService";
const OPERATIONS = {
  servc: ["용역", "getBidPblancListInfoServcPPSSrch"],
  thng: ["물품", "getBidPblancListInfoThngPPSSrch"],
  cnstwk: ["공사", "getBidPblancListInfoCnstwkPPSSrch"],
  frgcpt: ["외자", "getBidPblancListInfoFrgcptPPSSrch"],
};

const SCSBID_BASE_URL = "http://apis.data.go.kr/1230000/as/ScsbidInfoService";
const SCSBID_OPERATIONS = {
  servc: ["용역", "getScsbidListSttusServcPPSSrch"],
  thng: ["물품", "getScsbidListSttusThngPPSSrch"],
  cnstwk: ["공사", "getScsbidListSttusCnstwkPPSSrch"],
  frgcpt: ["외자", "getScsbidListSttusFrgcptPPSSrch"],
};

const DEFAULT_CONFIG = {
  keywords: ["영상제작", "스케치영상", "인강제작", "컨텐츠제작", "다큐멘터리"],
  bid_types: ["servc", "thng"],
  lookback_days: 3,
};

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

function fmtDate(d, endOfDay) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}${endOfDay ? "2359" : "0000"}`;
}

function buildQuery(serviceKey, params) {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  // data.go.kr 인증키는 이미 URL-인코딩되어 발급되는 경우가 많아, 이중 인코딩을 피한다.
  const keyPart = serviceKey.includes("%")
    ? `serviceKey=${serviceKey}`
    : `serviceKey=${encodeURIComponent(serviceKey)}`;
  return `${keyPart}&${qs}`;
}

async function callG2bApi(baseUrl, opPath, serviceKey, params) {
  const url = `${baseUrl}/${opPath}?${buildQuery(serviceKey, params)}`;
  const maskedUrl = url.replace(/serviceKey=[^&]+/, "serviceKey=***");
  let res, raw;
  try {
    res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    raw = await res.text();
  } catch (e) {
    return { error: String(e), url: maskedUrl };
  }
  if (!res.ok) {
    return { error: `HTTP ${res.status}`, raw: raw.slice(0, 500), url: maskedUrl };
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      error: "API가 JSON이 아닌 응답을 반환했습니다 (서비스키 오류일 가능성이 높습니다).",
      raw: raw.slice(0, 800),
      url: maskedUrl,
    };
  }
  let header = (data.response && data.response.header) || {};
  let resultCode = header.resultCode;
  if (resultCode !== "00" && resultCode !== "0") {
    if (resultCode === undefined) {
      for (const value of Object.values(data)) {
        if (value && typeof value === "object") {
          const candidate = value.header || value;
          if (candidate && (candidate.resultCode || candidate.returnReasonCode)) {
            header = candidate;
            resultCode = candidate.resultCode || candidate.returnReasonCode;
            break;
          }
        }
      }
    }
    const errMsg = header.resultMsg || header.returnAuthMsg || header.errMsg || "알 수 없는 오류";
    return { error: errMsg, resultCode, raw: raw.slice(0, 800), url: maskedUrl };
  }
  const body = (data.response && data.response.body) || {};
  let items = body.items || [];
  if (items && !Array.isArray(items)) items = items.item || [];
  if (items && !Array.isArray(items)) items = [items];
  return { items: items || [], totalCount: body.totalCount || 0 };
}

function toNumber(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return n > 0 ? n : null;
}

function estimateBidPrice(item) {
  const presmpt = toNumber(item.presmptPrce);
  const bdgt = toNumber(item.bdgtAmt) || toNumber(item.asignBdgtAmt);
  const rate = toNumber(item.sucsfbidLwltRate);
  const base = presmpt || bdgt;
  const baseKind = presmpt ? "예정가격" : bdgt ? "기초금액" : null;
  if (base && rate) {
    return { amount: Math.round((base * rate) / 100), base_kind: baseKind, base_amount: base, rate, reason: null };
  }
  const missing = [];
  if (!base) missing.push("예정가격/기초금액");
  if (!rate) missing.push("낙찰하한율");
  return { amount: null, reason: missing.join(" · ") + " 미공개" };
}

async function searchAll(serviceKey, keywords, bidTypes, lookbackDays) {
  if (!serviceKey) return { error: "서비스키가 설정되어 있지 않습니다. 관리자에게 Netlify 환경변수(G2B_SERVICE_KEY) 설정을 요청하세요." };
  const end = new Date();
  const begin = new Date(end.getTime() - lookbackDays * 86400000);
  const beginDt = fmtDate(begin, false);
  const endDt = fmtDate(end, true);

  const tasks = [];
  for (const bt of bidTypes) {
    if (!OPERATIONS[bt]) continue;
    const [typeLabel, opPath] = OPERATIONS[bt];
    for (const kwRaw of keywords) {
      const kw = kwRaw.trim();
      if (!kw) continue;
      tasks.push({ bt, typeLabel, opPath, kw });
    }
  }

  const results = [];
  const errors = [];
  const seen = new Set();

  await Promise.all(
    tasks.map(async (t) => {
      const res = await callG2bApi(BASE_URL, t.opPath, serviceKey, {
        numOfRows: 100,
        pageNo: 1,
        inqryDiv: 1,
        inqryBgnDt: beginDt,
        inqryEndDt: endDt,
        bidNtceNm: t.kw,
        type: "json",
      });
      if (res.error) {
        let msg = `[${t.typeLabel}/${t.kw}] ${res.error}`;
        if (res.raw) msg += ` — 상세: ${res.raw.slice(0, 300)}`;
        if (res.url) msg += ` — 요청 URL: ${res.url}`;
        errors.push(msg);
        return;
      }
      for (const item of res.items) {
        const key = `${item.bidNtceNo}_${item.bidNtceOrd}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const bidClseDt = item.bidClseDt || item.bidClseDate || "";
        let status = "정보없음";
        if (bidClseDt) {
          const parsed = new Date(bidClseDt.slice(0, 16).replace(" ", "T"));
          if (!isNaN(parsed)) status = parsed < new Date() ? "마감" : "진행중";
        }
        results.push({
          type: t.typeLabel,
          type_key: t.bt,
          matched_keyword: t.kw,
          bidNtceNo: item.bidNtceNo || "",
          bidNtceOrd: item.bidNtceOrd || "",
          bidNtceNm: item.bidNtceNm || "(제목 없음)",
          ntceInsttNm: item.ntceInsttNm || "",
          dminsttNm: item.dminsttNm || "",
          bidNtceDt: item.bidNtceDt || "",
          bidClseDt,
          status,
          presmptPrce: item.presmptPrce || item.asignBdgtAmt || "",
          bdgtAmt: item.bdgtAmt || "",
          sucsfbidLwltRate: item.sucsfbidLwltRate || "",
          estimate: estimateBidPrice(item),
          bidNtceUrl: item.bidNtceDtlUrl || "",
        });
      }
    })
  );

  results.sort((a, b) => (b.bidNtceDt || "").localeCompare(a.bidNtceDt || ""));
  return { items: results, errors, begin: beginDt, end: endDt };
}

async function fetchScsbidBatch(serviceKey, tasks, beginDt, endDt) {
  const results = [];
  const errors = [];
  const seen = new Set();
  let rangeError = false;

  await Promise.all(
    tasks.map(async (t) => {
      const res = await callG2bApi(SCSBID_BASE_URL, t.opPath, serviceKey, {
        numOfRows: 100,
        pageNo: 1,
        inqryDiv: 1,
        inqryBgnDt: beginDt,
        inqryEndDt: endDt,
        bidNtceNm: t.kw,
        type: "json",
      });
      if (res.error) {
        if (res.resultCode === "07") rangeError = true;
        let msg = `[${t.typeLabel}/${t.kw}] ${res.error}`;
        if (res.raw) msg += ` — 상세: ${res.raw.slice(0, 300)}`;
        if (res.url) msg += ` — 요청 URL: ${res.url}`;
        errors.push(msg);
        return;
      }
      for (const item of res.items) {
        const key = `${item.bidNtceNo}_${item.bidNtceOrd}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const rate = toNumber(item.sucsfbidRate);
        results.push({
          type: t.typeLabel,
          type_key: t.bt,
          matched_keyword: t.kw,
          bidNtceNo: item.bidNtceNo || "",
          bidNtceNm: item.bidNtceNm || "(제목 없음)",
          dminsttNm: item.dminsttNm || "",
          bidwinnrNm: item.bidwinnrNm || "",
          sucsfbidAmt: item.sucsfbidAmt || "",
          sucsfbidRate: item.sucsfbidRate || "",
          prtcptCnum: item.prtcptCnum || "",
          rlOpengDt: item.rlOpengDt || "",
          _rate_num: rate,
        });
      }
    })
  );
  return { results, errors, rangeError };
}

async function searchScsbidAll(serviceKey, keywords, bidTypes, lookbackDays) {
  if (!serviceKey) return { error: "서비스키가 설정되어 있지 않습니다. 관리자에게 Netlify 환경변수(G2B_SERVICE_KEY) 설정을 요청하세요." };

  const tasks = [];
  for (const bt of bidTypes) {
    if (!SCSBID_OPERATIONS[bt]) continue;
    const [typeLabel, opPath] = SCSBID_OPERATIONS[bt];
    for (const kwRaw of keywords) {
      const kw = kwRaw.trim();
      if (!kw) continue;
      tasks.push({ bt, typeLabel, opPath, kw });
    }
  }

  let candidateDays = [lookbackDays, 30, 14, 7].filter((d) => d <= lookbackDays);
  if (!candidateDays.length || candidateDays[0] !== lookbackDays) candidateDays.unshift(lookbackDays);
  candidateDays = [...new Set(candidateDays)];

  const end = new Date();
  let usedDays = lookbackDays;
  let beginDt = "", endDt = "";
  let results = [], errors = [], rangeError = false;

  for (const days of candidateDays) {
    const begin = new Date(end.getTime() - days * 86400000);
    beginDt = fmtDate(begin, false);
    endDt = fmtDate(end, true);
    ({ results, errors, rangeError } = await fetchScsbidBatch(serviceKey, tasks, beginDt, endDt));
    usedDays = days;
    if (!rangeError) break;
  }

  results.sort((a, b) => (b.rlOpengDt || "").localeCompare(a.rlOpengDt || ""));

  const rates = results.map((r) => r._rate_num).filter((v) => v);
  const overallAvg = rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100 : null;

  const byTypeRates = {};
  for (const r of results) {
    if (r._rate_num == null) continue;
    (byTypeRates[r.type_key] ||= []).push(r._rate_num);
  }
  const byTypeStats = {};
  for (const [bt, v] of Object.entries(byTypeRates)) {
    byTypeStats[bt] = {
      label: SCSBID_OPERATIONS[bt][0],
      avg_rate: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100,
      count: v.length,
    };
  }
  results.forEach((r) => delete r._rate_num);

  let note = null;
  if (usedDays !== lookbackDays) {
    note = `요청하신 ${lookbackDays}일치 조회는 낙찰정보서비스 API가 허용하는 기간을 초과해서 거부되어(입력범위값 초과), 자동으로 최근 ${usedDays}일로 줄여서 다시 조회했습니다.`;
  }

  return {
    items: results,
    errors,
    begin: beginDt,
    end: endDt,
    used_days: usedDays,
    requested_days: lookbackDays,
    note,
    stats: { overall_avg_rate: overallAvg, overall_count: rates.length, by_type: byTypeStats },
  };
}

function itemKey(no, ord) {
  return `${(no || "").trim()}_${(ord || "0").trim() || "0"}`;
}

exports.handler = async (event) => {
  const action = event.queryStringParameters && event.queryStringParameters.action;
  const serviceKey = (process.env.G2B_SERVICE_KEY || "").trim();

  // Blobs 스토어는 실제로 필요할 때만(설정/상태 관련 액션에서만) 만든다.
  // getStore()가 배포 환경에 따라 예외를 던질 수 있어서, try 블록 밖에서 즉시 호출하면
  // 검색(search/scsbid) 액션까지 전부 죽어버리는 문제가 있었음 — 그래서 지연 생성으로 변경.
  // Netlify Blobs 자동 연결(암묵적 context)이 배포 환경에 따라 안 될 때가 있어서,
  // NETLIFY_SITE_ID / NETLIFY_AUTH_TOKEN 환경변수가 있으면 수동 연결로 대체한다.
  const manualBlobsOpts =
    process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN
      ? { siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_AUTH_TOKEN }
      : null;
  function getConfigStore() {
    return manualBlobsOpts ? getStore({ name: "g2b-config", ...manualBlobsOpts }) : getStore("g2b-config");
  }
  function getStateStore() {
    return manualBlobsOpts ? getStore({ name: "g2b-state", ...manualBlobsOpts }) : getStore("g2b-state");
  }

  async function loadConfig() {
    const cfg = (await getConfigStore().get("config", { type: "json" })) || {};
    return { ...DEFAULT_CONFIG, ...cfg };
  }
  async function loadState() {
    const st = (await getStateStore().get("state", { type: "json" })) || {};
    return { seen: st.seen || {}, kept: st.kept || {} };
  }

  try {
    if (event.httpMethod === "GET" && action === "config") {
      const cfg = await loadConfig();
      return json({ ...cfg, has_service_key: !!serviceKey });
    }

    if (event.httpMethod === "POST" && action === "config") {
      const incoming = JSON.parse(event.body || "{}");
      const cfg = await loadConfig();
      if (incoming.keywords && incoming.keywords.length) cfg.keywords = incoming.keywords;
      if (incoming.bid_types && incoming.bid_types.length) cfg.bid_types = incoming.bid_types;
      if (incoming.lookback_days) cfg.lookback_days = incoming.lookback_days;
      await getConfigStore().setJSON("config", cfg);
      return json({ ok: true });
    }

    if (event.httpMethod === "GET" && action === "search") {
      const qs = event.queryStringParameters || {};
      const keywords = (qs.keywords || "").split(",").map((s) => s.trim()).filter(Boolean);
      const types = (qs.types || "servc,thng").split(",").filter(Boolean);
      const days = parseInt(qs.days || "3", 10);
      if (!keywords.length) return json({ error: "검색 키워드를 1개 이상 입력해주세요." });
      return json(await searchAll(serviceKey, keywords, types, days));
    }

    if (event.httpMethod === "GET" && action === "scsbid") {
      const qs = event.queryStringParameters || {};
      const keywords = (qs.keywords || "").split(",").map((s) => s.trim()).filter(Boolean);
      const types = (qs.types || "servc,thng").split(",").filter(Boolean);
      const days = parseInt(qs.days || "90", 10);
      if (!keywords.length) return json({ error: "검색 키워드를 1개 이상 입력해주세요." });
      return json(await searchScsbidAll(serviceKey, keywords, types, days));
    }

    if (event.httpMethod === "GET" && action === "state") {
      return json(await loadState());
    }

    if (event.httpMethod === "POST" && action === "mark_seen") {
      const incoming = JSON.parse(event.body || "{}");
      if (!incoming.bidNtceNo) return json({ error: "bidNtceNo가 필요합니다." }, 400);
      const state = await loadState();
      const key = itemKey(incoming.bidNtceNo, incoming.bidNtceOrd);
      if (incoming.seen) state.seen[key] = true;
      else delete state.seen[key];
      await getStateStore().setJSON("state", state);
      return json({ ok: true });
    }

    if (event.httpMethod === "POST" && action === "keep") {
      const incoming = JSON.parse(event.body || "{}");
      const item = incoming.item || {};
      if (!item.bidNtceNo) return json({ error: "item.bidNtceNo가 필요합니다." }, 400);
      const state = await loadState();
      const key = itemKey(item.bidNtceNo, item.bidNtceOrd);
      if (incoming.keep) {
        item.kept_at = new Date().toISOString().slice(0, 19).replace("T", " ");
        state.kept[key] = item;
      } else {
        delete state.kept[key];
      }
      await getStateStore().setJSON("state", state);
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: String(e && e.stack ? e.stack : e) }, 500);
  }
};
