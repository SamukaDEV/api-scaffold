import { handleV1Routes } from "./api/v1";
import { problemDetails } from "./api/v1/errors";

const PORT = Number(process.env.PORT) || 3000;

console.log(`\n🚀 API Scaffold Server inicializando na porta ${PORT}...`);
console.log(`📖 Documentação disponível em: /docs`);
console.log(`🌐 Endpoints disponíveis em: /api/v1/products, /api/v1/orders, /api/v1/reports\n`);

Bun.serve({
  port: PORT,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Suporte a preflight CORS
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key, X-API-Version"
        }
      });
    }

    // Raiz com índice amigável
    if (url.pathname === "/" || url.pathname === "/api") {
      return Response.json(
        {
          name: "API Scaffold - RESTful Architecture Study Platform",
          version: "1.0.0",
          description: "Servidor de demonstração prática dos 8 Padrões Fundamentais de Design de APIs RESTful.",
          documentation_path: "./docs",
          endpoints: {
            products: "/api/v1/products",
            product_reviews: "/api/v1/products/prod_2048/reviews",
            orders: "/api/v1/orders",
            reports_async: "/api/v1/reports",
            jobs_polling: "/api/v1/jobs"
          },
          patterns_demonstrated: [
            "1. Design around Resources, not Actions",
            "2. Predictable URLs & Shallow Hierarchy",
            "3. HTTP Methods Real Purpose (Safe vs Idempotent)",
            "4. Useful Status Codes (200, 201, 202, 204, 400, 404, 409, 422, 429)",
            "5. RFC 7807 Standardized Error Problem Details",
            "6. Query Parameters for Filtering, Sorting & Pagination",
            "7. API Versioning (/api/v1/)",
            "8. Idempotency-Key & Async Processing"
          ]
        },
        { headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // Roteamento para API v1
    if (url.pathname.startsWith("/api/v1")) {
      try {
        const response = await handleV1Routes(req, url);
        // Adiciona cabeçalho CORS na resposta
        response.headers.set("Access-Control-Allow-Origin", "*");
        return response;
      } catch (err: any) {
        console.error("Unhandled server exception:", err);
        return problemDetails(500, "INTERNAL_SERVER_ERROR", "Erro Interno Inesperado", {
          detail: "Ocorreu uma falha não tratada no servidor. Por favor, tente novamente.",
          instance: url.pathname
        });
      }
    }

    // Rota 404 para caminhos fora da API
    return problemDetails(404, "NOT_FOUND", "Endpoint Não Encontrado", {
      detail: `O recurso '${url.pathname}' não existe neste servidor. Consulte '/api' para rotas válidas.`,
      instance: url.pathname
    });
  }
});