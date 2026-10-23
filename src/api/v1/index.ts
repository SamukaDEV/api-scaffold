import { handleProducts } from "./products";
import { handleOrders } from "./orders";
import { handleReports, handleJobs } from "./reports";
import { problemDetails } from "./errors";

export async function handleV1Routes(req: Request, url: URL): Promise<Response> {
  const path = url.pathname;

  // Coleção de Produtos: /api/v1/products
  if (path.startsWith("/api/v1/products")) {
    return handleProducts(req, url);
  }

  // Coleção de Pedidos: /api/v1/orders
  if (path.startsWith("/api/v1/orders")) {
    return handleOrders(req, url);
  }

  // Solicitação Assíncrona de Relatórios: /api/v1/reports
  if (path.startsWith("/api/v1/reports")) {
    return handleReports(req, url);
  }

  // Acompanhamento de Tarefas / Jobs: /api/v1/jobs
  if (path.startsWith("/api/v1/jobs")) {
    return handleJobs(req, url);
  }

  // Rota não encontrada dentro da v1
  return problemDetails(404, "RESOURCE_NOT_FOUND", "Recurso Inexistente", {
    detail: `O caminho '${path}' não corresponde a nenhum recurso conhecido na v1 da API.`,
    instance: path
  });
}
