# 4. Status Codes Úteis e Significativos

## 📌 Visão Geral

Os códigos de status HTTP (HTTP Status Codes) são a linguagem padrão que a camada de transporte e rede utiliza para comunicar o resultado de uma solicitação.

Eles não servem apenas para o usuário final que lê a tela: **são consumidos por navegadores, CDNs, proxies reversos (Nginx, Envoy), API Gateways, ferramentas de observabilidade (Datadog, New Relic) e bibliotecas de requisição (Axios, Fetch, cURL)**.

---

## ❌ O Pior Anti-Padrão: O Falso "200 OK" com Erro no Body

```ts
// GET /products/2048

// STATUS HTTP: 200 OK
app.get("/products/:id", (req, res) => {
    return res.status(200).json({
        "success": false,
        "reason": "product not found"
    });
});
```

### Por que esse padrão é destrutivo?
1. **Quebra o Cache de CDNs e Proxies:** Um intermediário que vê `200 OK` pode salvar em cache que o produto "não existe", servindo a resposta de erro para todos os próximos clientes.
2. **Cega as Ferramentas de Monitoramento:** Seu painel do Datadog/Grafana mostrará "100% de disponibilidade / 0% de taxa de erro", enquanto seus usuários estão enfrentando falhas catastróficas.
3. **Destrói o Tratamento de Erros no Frontend:** Bibliotecas modernas (como Axios ou React Query) disparam cláusulas `catch` automaticamente para status $\ge 400$. Com `200 OK`, todo componente precisa inspecionar manualmente `if (!data.success)`.

---

## 📚 Catálogo Essencial de Status Codes para APIs REST

### 🟢 2xx: Sucesso (Success)

| Código | Nome | Quando Utilizar | Detalhe Importante |
| :---: | :--- | :--- | :--- |
| **`200`** | **OK** | Sucesso padrão em leituras (`GET`) ou atualizações que retornam o recurso alterado (`PUT`/`PATCH`). | Sempre deve conter payload de resposta. |
| **`201`** | **Created** | Criação com sucesso de um novo recurso (`POST`). | **Obrigatório incluir o cabeçalho `Location: /collection/{id}`** indicando onde encontrar o novo recurso. |
| **`202`** | **Accepted** | A requisição foi aceita para processamento assíncrono, mas a execução ainda não terminou (filas, background jobs). | Deve retornar o status do job ou URL de acompanhamento no cabeçalho `Location`. |
| **`204`** | **No Content** | Ação completada com sucesso, mas **sem nada a retornar no corpo**. Comum em `DELETE` ou `PATCH` de confirmação rápida. | O corpo da resposta **deve ser estritamente vazio**. |

---

### 🟡 4xx: Erros do Cliente (Client Errors)
O cliente cometeu algum equívoco e **não deve repetir a requisição idêntica** sem antes corrigir os parâmetros.

| Código | Nome | Cenário Real | Exemplo Prático |
| :---: | :--- | :--- | :--- |
| **`400`** | **Bad Request** | Sintaxe malformada. O servidor não conseguiu parsear o JSON ou os cabeçalhos. | JSON quebrado com vírgula sobrando: `{"name": "Ana",}` |
| **`401`** | **Unauthorized** | Falta autenticação. O cliente não enviou token ou o token expirou. *(Nota: O nome oficial é infeliz; deveria ser Unauthenticated)*. | Ausência do cabeçalho `Authorization: Bearer <token>`. |
| **`403`** | **Forbidden** | O cliente **está autenticado**, mas **não tem permissão de acesso** ao recurso. | Um usuário comum tentando acessar `DELETE /admin/audit-logs`. |
| **`404`** | **Not Found** | O recurso solicitado na URL não existe no banco. | `GET /products/999999` (produto inexistente). |
| **`409`** | **Conflict** | Conflito com o estado atual do recurso no servidor. | Tentar pagar um pedido já liquidado (`ord_7ft4 was paid at 09:41`) ou duplicar e-mail único. |
| **`422`** | **Unprocessable Content** | O JSON é sintaticamente válido, mas falhou nas regras de validação de negócio. | Campo de e-mail com texto inválido ou data de nascimento no futuro. |
| **`429`** | **Too Many Requests** | Limite de taxa de requisições excedido (*Rate Limiting*). | Deve acompanhar o cabeçalho `Retry-After: 60` (segundos para esperar). |

---

### 🔴 5xx: Erros do Servidor (Server Errors)
O servidor falhou ao tentar processar uma requisição válida. O erro é de responsabilidade da infraestrutura ou do backend.

| Código | Nome | Cenário Real |
| :---: | :--- | :--- |
| **`500`** | **Internal Server Error** | Exceção não tratada no código (`NullPointerException`, crash de banco). Nunca exponha stack traces ao cliente! |
| **`502`** | **Bad Gateway** | O gateway/proxy reverso (ex: Nginx, Cloudflare) recebeu resposta inválida do processo da aplicação (Node, Bun, Go). |
| **`503`** | **Service Unavailable** | O servidor está sobrecarregado ou temporariamente em manutenção. |
| **`504`** | **Gateway Timeout** | O proxy reverso esgotou o tempo limite aguardando o backend responder. |

---

## 🧭 Fluxograma de Escolha do Status Code

```text
A requisição deu certo?
 ├── SIM:
 │    ├── Criou um recurso novo? -> 201 Created (com Location)
 │    ├── Entrou em processamento de fila/job? -> 202 Accepted
 │    ├── Não há dados a retornar (ex: exclusão)? -> 204 No Content
 │    └── Retornou dados de leitura ou atualização? -> 200 OK
 └── NÃO:
      ├── A culpa é do cliente (4xx)?
      │    ├── JSON sintaticamente quebrado? -> 400 Bad Request
      │    ├── Não tem token / token inválido? -> 401 Unauthorized
      │    ├── Tem token, mas não tem permissão de acesso? -> 403 Forbidden
      │    ├── O registro não existe no banco? -> 404 Not Found
      │    ├── Conflitou com estado de negócio (já pago, duplicado)? -> 409 Conflict
      │    ├── Erro de validação de formulário (campo inválido)? -> 422 Unprocessable Content
      │    └── Excedeu cota de requisições por minuto? -> 429 Too Many Requests
      └── A culpa é do servidor (5xx)?
           ├── Falha imprevista de código? -> 500 Internal Server Error
           └── Sistema fora do ar ou sob manutenção? -> 503 Service Unavailable
```

---

## 💻 Exemplo Prático em TypeScript/Bun

```typescript
app.patch("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const order = await db.orders.findById(id);

  if (!order) {
    return res.status(404).json({
      code: "ORDER_NOT_FOUND",
      message: `O pedido ${id} não foi localizado.`
    });
  }

  if (order.status === "paid") {
    return res.status(409).json({
      code: "ORDER_ALREADY_PAID",
      message: `O pedido ${id} já foi pago e não pode sofrer alterações.`
    });
  }

  await db.orders.update(id, req.body);
  return res.status(204).send(); // Sucesso sem conteúdo no corpo
});
```
