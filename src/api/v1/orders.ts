import { problemDetails } from "./errors";

export interface Order {
  id: string;
  customer_id: string;
  total_amount: number;
  status: "pending" | "paid" | "shipped" | "cancelled";
  paid_at?: string;
  created_at: string;
}

// Banco de dados simulado
const ordersDb: Order[] = [
  {
    id: "ord_7ft4",
    customer_id: "usr_192",
    total_amount: 199.9,
    status: "paid",
    paid_at: "09:41:00Z",
    created_at: "2026-10-23T09:30:00Z"
  },
  {
    id: "ord_8km9",
    customer_id: "usr_340",
    total_amount: 85.0,
    status: "pending",
    created_at: "2026-10-23T11:00:00Z"
  }
];

// Cache de Idempotência em memória: Idempotency-Key -> Response Snapshot
const idempotencyStore = new Map<string, { status: number; body: string; headers: Record<string, string> }>();

export async function handleOrders(req: Request, url: URL): Promise<Response> {
  const method = req.method;
  const pathParts = url.pathname.replace(/^\/api\/v1\/orders\/?/, "").split("/").filter(Boolean);
  const orderId = pathParts[0];

  // GET /api/v1/orders
  if (!orderId && method === "GET") {
    return Response.json({ data: ordersDb });
  }

  // GET /api/v1/orders/:id
  if (orderId && method === "GET") {
    const order = ordersDb.find((o) => o.id === orderId);
    if (!order) {
      return problemDetails(404, "ORDER_NOT_FOUND", "Pedido Não Encontrado", {
        detail: `O pedido '${orderId}' não foi localizado no sistema.`,
        instance: url.pathname
      });
    }
    return Response.json({ data: order });
  }

  // POST /api/v1/orders (Demonstração de Idempotency-Key e 201 Created)
  if (!orderId && method === "POST") {
    const idempotencyKey = req.headers.get("Idempotency-Key") || req.headers.get("X-Idempotency-Key");

    // Se já foi processada com essa chave, retorna o snapshot idêntico sem reprocessar!
    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      const cached = idempotencyStore.get(idempotencyKey)!;
      return new Response(cached.body, {
        status: cached.status,
        headers: {
          ...cached.headers,
          "X-Cache-Lookup": "HIT - Idempotent Replay"
        }
      });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return problemDetails(400, "INVALID_JSON_BODY", "Corpo JSON Inválido", { instance: url.pathname });
    }

    if (!body.customer_id || typeof body.total_amount !== "number") {
      return problemDetails(422, "VALIDATION_FAILED", "Dados de Pedido Inválidos", {
        detail: "Os campos 'customer_id' e 'total_amount' são obrigatórios.",
        instance: url.pathname,
        invalidParams: [
          ...(!body.customer_id ? [{ field: "customer_id", reason: "Identificador do cliente é obrigatório." }] : []),
          ...(typeof body.total_amount !== "number" ? [{ field: "total_amount", reason: "Valor numérico obrigatório." }] : [])
        ]
      });
    }

    const newOrder: Order = {
      id: `ord_${Math.random().toString(36).substring(2, 6)}`,
      customer_id: body.customer_id,
      total_amount: body.total_amount,
      status: "pending",
      created_at: new Date().toISOString()
    };

    ordersDb.push(newOrder);

    const responseBody = JSON.stringify({ data: newOrder }, null, 2);
    const responseHeaders = {
      "Content-Type": "application/json",
      Location: `/api/v1/orders/${newOrder.id}`
    };

    // Salva no cache se a chave foi fornecida
    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, {
        status: 201,
        body: responseBody,
        headers: responseHeaders
      });
    }

    return new Response(responseBody, {
      status: 201,
      headers: responseHeaders
    });
  }

  // PATCH /api/v1/orders/:id (Demonstração do 409 Conflict)
  if (orderId && method === "PATCH") {
    const order = ordersDb.find((o) => o.id === orderId);
    if (!order) {
      return problemDetails(404, "ORDER_NOT_FOUND", "Pedido Não Encontrado", { instance: url.pathname });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return problemDetails(400, "INVALID_JSON_BODY", "JSON Inválido", { instance: url.pathname });
    }

    // Regra de Negócio: Se o pedido já estiver pago, recusa modificações com 409 Conflict!
    if (order.status === "paid") {
      return problemDetails(409, "ORDER_ALREADY_PAID", "Conflito de Estado de Negócio", {
        detail: `O pedido ${order.id} foi liquidado às ${order.paid_at || "09:41"} e seu valor não pode mais ser alterado.`,
        instance: url.pathname
      });
    }

    if (body.status) order.status = body.status;
    if (body.total_amount) order.total_amount = body.total_amount;

    return new Response(null, { status: 204 });
  }

  return problemDetails(405, "METHOD_NOT_ALLOWED", "Método HTTP Não Suportado", { instance: url.pathname });
}
