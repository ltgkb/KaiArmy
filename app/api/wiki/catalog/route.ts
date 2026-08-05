import { apiJson, getRequestIdentity } from "../../../../lib/api-security";

const WIKI_CATALOG_URL = "https://wiki.kai.com/api/v1/public-chat/catalog";
const ALLOWED_KNOWLEDGE_BASE_NAMES = new Set(["KAI算期平台知识库"]);
const ALLOWED_FLOW_NAMES = new Set(["KAI期算平台快速问答API", "KAI期算平台快速问答2"]);

type CatalogResponse = {
  knowledge_bases?: Array<{
    id: string;
    name: string;
    description?: string | null;
    embedding_model?: string;
    document_count?: number;
    status?: string;
  }>;
  flows?: Array<{
    id: string;
    name: string;
    description?: string | null;
    node_count?: number;
    status?: string;
  }>;
};

export async function GET(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return apiJson({ error: "请先登录" }, { status: 401 });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(WIKI_CATALOG_URL, {
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      return apiJson({ error: "无法读取 KAI 知识目录" }, { status: 503 });
    }
    const data = await response.json() as CatalogResponse;
    return apiJson({
      knowledgeBases: (data.knowledge_bases ?? []).filter((item) => ALLOWED_KNOWLEDGE_BASE_NAMES.has(item.name)).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        embeddingModel: item.embedding_model ?? "BGE-M3",
        documentCount: item.document_count ?? 0,
        status: item.status ?? "unknown",
      })),
      flows: (data.flows ?? []).filter((item) => ALLOWED_FLOW_NAMES.has(item.name)).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        nodeCount: item.node_count ?? 0,
        status: item.status ?? "unknown",
      })),
      source: "wiki.kai.com",
    }, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
    });
  } catch {
    return apiJson({ error: "无法连接 KAI 知识目录" }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
