import { problemDetails } from "./errors";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  in_stock: boolean;
  reviews_count: number;
  created_at: string;
}

// Banco de dados em memória para estudo
const productsDb: Product[] = [
  {
    id: "prod_2048",
    name: "Teclado Mecânico RGB Wireless",
    category: "keyboards",
    price: 45.0,
    in_stock: true,
    reviews_count: 128,
    created_at: "2026-01-15T10:00:00Z"
  },
  {
    id: "prod_2049",
    name: "Teclado Ergonômico Split",
    category: "keyboards",
    price: 120.0,
    in_stock: true,
    reviews_count: 42,
    created_at: "2026-02-10T14:30:00Z"
  },
  {
    id: "prod_2050",
    name: "Mouse Sem Fio Ultra-leve",
    category: "mice",
    price: 35.0,
    in_stock: false,
    reviews_count: 95,
    created_at: "2026-03-01T08:15:00Z"
  },
  {
    id: "prod_2051",
    name: "Monitor 4K 27 polegadas",
    category: "monitors",
    price: 350.0,
    in_stock: true,
    reviews_count: 64,
    created_at: "2026-03-12T11:20:00Z"
  }
];

export async function handleProducts(req: Request, url: URL): Promise<Response> {
  const method = req.method;
  const pathParts = url.pathname.replace(/^\/api\/v1\/products\/?/, "").split("/").filter(Boolean);
  const productId = pathParts[0];

  // GET /api/v1/products (Listagem com filtros, paginação e ordenação)
  if (!productId && method === "GET") {
    let result = [...productsDb];

    // Filtro: category
    const category = url.searchParams.get("category");
    if (category) {
      result = result.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    // Filtro: in_stock
    const inStock = url.searchParams.get("in_stock");
    if (inStock !== null) {
      const boolVal = inStock === "true";
      result = result.filter((p) => p.in_stock === boolVal);
    }

    // Filtro: max_price
    const maxPrice = url.searchParams.get("max_price");
    if (maxPrice) {
      const numMax = parseFloat(maxPrice);
      if (!isNaN(numMax)) {
        result = result.filter((p) => p.price <= numMax);
      }
    }

    // Ordenação: ?sort=price ou ?sort=-price
    const sortParam = url.searchParams.get("sort");
    if (sortParam) {
      const isDesc = sortParam.startsWith("-");
      const field = (isDesc ? sortParam.slice(1) : sortParam) as keyof Product;
      result.sort((a, b) => {
        if (a[field] < b[field]) return isDesc ? 1 : -1;
        if (a[field] > b[field]) return isDesc ? -1 : 1;
        return 0;
      });
    }

    // Paginação: page e limit
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get("limit") || "10", 10)));
    const totalItems = result.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginated = result.slice((page - 1) * limit, page * limit);

    return Response.json(
      {
        data: paginated,
        meta: {
          page,
          limit,
          total_items: totalItems,
          total_pages: totalPages
        }
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  // GET /api/v1/products/:id (Recurso individual)
  if (productId && method === "GET") {
    // Exemplo de sub-recurso: /api/v1/products/:id/reviews
    if (pathParts[1] === "reviews") {
      return Response.json({
        data: [
          {
            id: "rev_1024",
            product_id: productId,
            rating: 5,
            comment: "Excelente produto, resposta ultra-rápida das teclas!"
          }
        ]
      });
    }

    const product = productsDb.find((p) => p.id === productId);
    if (!product) {
      return problemDetails(404, "PRODUCT_NOT_FOUND", "Produto Não Encontrado", {
        detail: `Nenhum produto cadastrado com o identificador '${productId}'.`,
        instance: url.pathname
      });
    }

    return Response.json({ data: product });
  }

  // POST /api/v1/products (Criação de novo recurso)
  if (!productId && method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return problemDetails(400, "INVALID_JSON_BODY", "Corpo JSON Malformado", {
        detail: "A requisição enviada possui caracteres ou sintaxe inválida no JSON.",
        instance: url.pathname
      });
    }

    // Validação de campos obrigatórios (RFC 7807 422)
    const invalidParams = [];
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      invalidParams.push({ field: "name", reason: "O nome do produto é obrigatório." });
    }
    if (typeof body.price !== "number" || body.price <= 0) {
      invalidParams.push({ field: "price", reason: "O preço deve ser um número positivo maior que zero." });
    }
    if (!body.category || typeof body.category !== "string") {
      invalidParams.push({ field: "category", reason: "A categoria é obrigatória." });
    }

    if (invalidParams.length > 0) {
      return problemDetails(422, "VALIDATION_FAILED", "Falha de Validação dos Dados", {
        detail: "Um ou mais campos obrigatórios não foram preenchidos corretamente.",
        instance: url.pathname,
        invalidParams
      });
    }

    const newProduct: Product = {
      id: `prod_${Math.floor(1000 + Math.random() * 9000)}`,
      name: body.name.trim(),
      category: body.category.toLowerCase().trim(),
      price: body.price,
      in_stock: body.in_stock ?? true,
      reviews_count: 0,
      created_at: new Date().toISOString()
    };

    productsDb.push(newProduct);

    return new Response(JSON.stringify({ data: newProduct }, null, 2), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        Location: `/api/v1/products/${newProduct.id}`
      }
    });
  }

  // PATCH /api/v1/products/:id (Modificação parcial)
  if (productId && method === "PATCH") {
    const productIndex = productsDb.findIndex((p) => p.id === productId);
    if (productIndex === -1) {
      return problemDetails(404, "PRODUCT_NOT_FOUND", "Produto Não Encontrado", {
        detail: `Não foi possível atualizar: produto '${productId}' não existe.`,
        instance: url.pathname
      });
    }

    const body = await req.json();
    productsDb[productIndex] = {
      ...productsDb[productIndex],
      ...(body.name && { name: body.name }),
      ...(body.price && { price: body.price }),
      ...(body.in_stock !== undefined && { in_stock: Boolean(body.in_stock) })
    };

    // Padrão REST 204 No Content: atualização completada com sucesso sem corpo
    return new Response(null, { status: 204 });
  }

  // DELETE /api/v1/products/:id (Remoção do recurso)
  if (productId && method === "DELETE") {
    const index = productsDb.findIndex((p) => p.id === productId);
    if (index !== -1) {
      productsDb.splice(index, 1);
    }
    // Idempotente: quer o item já existisse ou não, no final ele não existe
    return new Response(null, { status: 204 });
  }

  return problemDetails(405, "METHOD_NOT_ALLOWED", "Método HTTP Não Permitido", {
    detail: `O método ${method} não é suportado pelo recurso ${url.pathname}.`,
    instance: url.pathname
  });
}
