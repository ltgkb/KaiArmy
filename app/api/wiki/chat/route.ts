const WIKI_CHAT_URL = "https://wiki.kai.com/api/v1/public-chat";
const MAX_MESSAGE_LENGTH = 8_000;

type WikiChatPayload = {
  message?: string;
  conversationId?: string | null;
  language?: "zh-CN" | "zh-TW" | "en";
};

type WikiChatResponse = {
  answer?: string;
  conversation_id?: string;
  execution_id?: string;
  created_at?: string;
};

export async function POST(request: Request) {
  let payload: WikiChatPayload;
  try {
    payload = await request.json() as WikiChatPayload;
  } catch {
    return Response.json({ error: "请求格式无效" }, { status: 400 });
  }

  const message = payload.message?.trim();
  if (!message) {
    return Response.json({ error: "请输入问题" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return Response.json({ error: "问题内容过长" }, { status: 413 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(WIKI_CHAT_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        conversation_id: payload.conversationId ?? null,
        language: payload.language ?? "zh-CN",
      }),
      signal: controller.signal,
    });

    const data = await response.json() as WikiChatResponse & { detail?: string };
    if (!response.ok || !data.answer) {
      return Response.json(
        { error: data.detail || "KAI 知识服务暂时不可用" },
        { status: response.ok ? 502 : response.status },
      );
    }

    return Response.json({
      answer: data.answer,
      conversationId: data.conversation_id ?? null,
      executionId: data.execution_id ?? null,
      createdAt: data.created_at ?? new Date().toISOString(),
      source: "wiki.kai.com",
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "KAI 知识服务响应超时"
      : "无法连接 KAI 知识服务";
    return Response.json({ error: message }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
