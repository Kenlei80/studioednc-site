// 공지/블로그 기능 — Netlify Function
// 글 목록은 Netlify Blobs에 저장한다. 작성/삭제는 관리자 비밀번호(ADMIN_PASSWORD 환경변수)로 보호한다.

const { getStore, connectLambda } = require("@netlify/blobs");

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  // event로부터 Netlify Blobs 연결 정보를 자동으로 읽어온다.
  // 이렇게 하면 NETLIFY_SITE_ID / NETLIFY_AUTH_TOKEN을 수동으로 등록할 필요가 없다.
  connectLambda(event);

  const action = event.queryStringParameters && event.queryStringParameters.action;
  const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();

  function getNoticesStore() {
    return getStore("notices");
  }

  async function loadNotices() {
    const data = await getNoticesStore().get("list", { type: "json" });
    return Array.isArray(data) ? data : [];
  }
  async function saveNotices(list) {
    await getNoticesStore().setJSON("list", list);
  }

  try {
    if (event.httpMethod === "GET" && action === "list") {
      const notices = await loadNotices();
      notices.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      return json({ items: notices });
    }

    if (event.httpMethod === "POST" && action === "add") {
      const incoming = JSON.parse(event.body || "{}");
      if (!adminPassword) return json({ error: "관리자 비밀번호(ADMIN_PASSWORD)가 서버에 설정되어 있지 않습니다." }, 500);
      if ((incoming.password || "") !== adminPassword) return json({ error: "비밀번호가 올바르지 않습니다." }, 401);
      const title = (incoming.title || "").trim();
      if (!title) return json({ error: "제목을 입력해주세요." }, 400);
      const notices = await loadNotices();
      const item = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title,
        body: (incoming.body || "").trim(),
        url: (incoming.url || "").trim(),
        created_at: new Date().toISOString(),
      };
      notices.push(item);
      await saveNotices(notices);
      return json({ ok: true, item });
    }

    if (event.httpMethod === "POST" && action === "delete") {
      const incoming = JSON.parse(event.body || "{}");
      if (!adminPassword) return json({ error: "관리자 비밀번호(ADMIN_PASSWORD)가 서버에 설정되어 있지 않습니다." }, 500);
      if ((incoming.password || "") !== adminPassword) return json({ error: "비밀번호가 올바르지 않습니다." }, 401);
      if (!incoming.id) return json({ error: "id가 필요합니다." }, 400);
      let notices = await loadNotices();
      notices = notices.filter((n) => n.id !== incoming.id);
      await saveNotices(notices);
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: String(e && e.stack ? e.stack : e) }, 500);
  }
};
