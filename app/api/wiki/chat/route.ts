import { consumeRateLimit } from "../../../../db/workspace";
import { apiJson, getRequestIdentity, isSameOriginMutation, readJsonBody, RequestBodyError, stableIdentityKey } from "../../../../lib/api-security";

const WIKI_CHAT_URL = "https://wiki.kai.com/api/v1/public-chat";
const MAX_MESSAGE_LENGTH = 8_000;
const MAX_REQUEST_BYTES = 16_000;
const MAX_UPSTREAM_BYTES = 200_000;

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
  const identity = await getRequestIdentity(request);
  if (!identity) return apiJson({ error: "请先登录" }, { status: 401 });
  if (!isSameOriginMutation(request, identity)) return apiJson({ error: "请求来源无效" }, { status: 403 });
  let payload: WikiChatPayload;
  try {
    payload = await readJsonBody<WikiChatPayload>(request, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyError) return apiJson({ error: error.message }, { status: error.status });
    return apiJson({ error: "请求格式无效" }, { status: 400 });
  }

  const message = payload.message?.trim();
  if (!message) {
    return apiJson({ error: "请输入问题" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return apiJson({ error: "问题内容过长" }, { status: 413 });
  }
  if (payload.conversationId && (!/^[a-zA-Z0-9_-]{1,128}$/.test(payload.conversationId))) {
    return apiJson({ error: "会话标识无效" }, { status: 400 });
  }
  if (payload.language && !["zh-CN", "zh-TW", "en"].includes(payload.language)) {
    return apiJson({ error: "语言参数无效" }, { status: 400 });
  }

  const identityKey = await stableIdentityKey(identity);
  const rate = await consumeRateLimit(`wiki-chat:${identityKey}`, 30, 60);
  if (!rate.allowed) {
    return apiJson({ error: "请求过于频繁，请稍后再试" }, {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, rate.resetAt - Math.floor(Date.now() / 1000))), "X-RateLimit-Remaining": "0" },
    });
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

    const responseText = await response.text();
    if (new TextEncoder().encode(responseText).byteLength > MAX_UPSTREAM_BYTES) {
      return apiJson({ error: "KAI 知识服务响应异常" }, { status: 502 });
    }
    let data: WikiChatResponse & { detail?: string };
    try {
      data = JSON.parse(responseText) as WikiChatResponse & { detail?: string };
    } catch {
      return apiJson({ error: "KAI 知识服务响应异常" }, { status: 502 });
    }
    if (!response.ok || !data.answer) {
      return apiJson(
        { error: "KAI 知识服务暂时不可用" },
        { status: response.status >= 400 && response.status < 500 ? 502 : 503 },
      );
    }

    return apiJson({
      answer: data.answer.slice(0, 50_000),
      conversationId: data.conversation_id ?? null,
      executionId: data.execution_id ?? null,
      createdAt: data.created_at ?? new Date().toISOString(),
      source: "wiki.kai.com",
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "KAI 知识服务响应超时"
      : "无法连接 KAI 知识服务";
    return apiJson({ error: message }, { status: error instanceof Error && error.name === "AbortError" ? 504 : 502 });
  } finally {
    clearTimeout(timeout);
  }
}
