const WIKI_CATALOG_URL = "https://wiki.kai.com/api/v1/public-chat/catalog";

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

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(WIKI_CATALOG_URL, {
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      return Response.json({ error: "无法读取 KAI 知识目录" }, { status: response.status });
    }
    const data = await response.json() as CatalogResponse;
    return Response.json({
      knowledgeBases: (data.knowledge_bases ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        embeddingModel: item.embedding_model ?? "BGE-M3",
        documentCount: item.document_count ?? 0,
        status: item.status ?? "unknown",
      })),
      flows: (data.flows ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        nodeCount: item.node_count ?? 0,
        status: item.status ?? "unknown",
      })),
      source: "wiki.kai.com",
    }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch {
    return Response.json({ error: "无法连接 KAI 知识目录" }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
