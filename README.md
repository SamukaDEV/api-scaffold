# API Scaffold: Guia de Arquitetura & Padrões RESTful

Este repositório é uma **plataforma completa de documentação e estudo prático sobre o desenvolvimento de APIs modernas**. 

O projeto foi estruturado a partir dos conceitos apresentados no vídeo [8 REST API Patterns](https://www.youtube.com/watch?v=-40xErgJIBg), expandindo cada tema com rigor técnico, especificações formais da IETF (RFCs), boas práticas de engenharia de software e um servidor demonstrativo funcional implementado em **TypeScript & Bun**.

---

## 📑 Sumário Executivo da Documentação

A documentação detalhada foi dividida em módulos temáticos dentro do diretório [`docs/`](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/):

| # | Padrão Arquitetural | Documento Detalhado | Descrição Resumida |
| :-: | :--- | :--- | :--- |
| **01** | **Design Orientado a Recursos** | [`01-resource-oriented-design.md`](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/01-resource-oriented-design.md) | Desenhe em torno de substantivos (`/orders`), nunca ações/verbos (`/createOrder`). O método HTTP dita a ação; a URL identifica o recurso. |
| **02** | **URLs Previsíveis e Hierarquia** | [`02-predictable-urls-hierarchy.md`](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/02-predictable-urls-hierarchy.md) | Estrutura consistente (`/{collection}/{id}/{sub}`), plural sempre, `kebab-case`, e aninhamento raso (*shallow nesting* $\le 2$ níveis). |
| **03** | **Semântica dos Métodos HTTP** | [`03-http-methods-semantics.md`](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/03-http-methods-semantics.md) | Uso real de `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. Matriz de Métodos Seguros (*Safe*) vs Idempotentes (*Idempotent*). |
| **04** | **Status Codes Significativos** | [`04-meaningful-status-codes.md`](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/04-meaningful-status-codes.md) | Eliminação definitiva do falso `200 OK com erro no body`. Catálogo de 2xx, 4xx e 5xx, e fluxograma de decisão. |
| **05** | **Padronização de Erros (RFC 7807)** | [`05-standardized-error-handling.md`](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/05-standardized-error-handling.md) | A tríade de erro (Usuário, Aplicação, SRE), especificação Problem Details, `code` para máquina e validação múltipla (422). |
| **06** | **Query Parameters, Filtros & Paginação** | [`06-query-params-filtering-pagination.md`](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/06-query-params-filtering-pagination.md) | Três responsabilidades claras (Path identifica, Query refina, Método opera). Filtros, busca, ordenação e paginação por cursor. |
| **07** | **Versionamento e Evolução Sem Quebras** | [`07-api-versioning-evolution.md`](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/07-api-versioning-evolution.md) | Estratégias de versionamento (`/v1/`, Headers), mudanças quebrantes (*breaking changes*) e cabeçalhos `Deprecation` e `Sunset`. |
| **08** | **Idempotência & Resiliência** | [`08-idempotency-and-resilience.md`](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/08-idempotency-and-resilience.md) | Chaves de idempotência (`Idempotency-Key`) contra cobranças duplicadas, tarefas assíncronas com `202 Accepted` e rate limiting. |
| **⭐** | **Guia Prático & Checklist** | [`checklist-guia-pratico.md`](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/checklist-guia-pratico.md) | As 8 perguntas essenciais para arquitetar qualquer API e checklist completo para aprovação de Pull Requests. |

---

## ⚡ Guia Rápido de Referência (Cheat Sheet)

### 1. As Três Responsabilidades
```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Paths (Caminhos) ───────> Identificam os RECURSOS        │
│ 2. Query Parameters ───────> REFINAM a consulta/resultado   │
│ 3. HTTP Methods ───────────> Descrevem as OPERAÇÕES         │
└─────────────────────────────────────────────────────────────┘
```

### 2. A Tríade da Resposta de Erro
```text
┌─────────────────────────────────────────────────────────────┐
│ • O Usuário Final      ───> Exibe "message" amigável        │
│ • A Aplicação/Frontend ───> Executa switch("code") lógico   │
│ • O Desenvolvedor/SRE  ───> Rastreia "status" e "trace_id"  │
└─────────────────────────────────────────────────────────────┘
```

### 3. Matriz de Métodos HTTP
| Método | Operação | Seguro? | Idempotente? | Sucesso Típico |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | Recuperar recurso | ✅ Sim | ✅ Sim | `200 OK` |
| `POST` | Criar recurso ou processar | ❌ Não | ❌ Não | `201 Created` (com `Location`) ou `202 Accepted` |
| `PUT` | Substituição integral | ❌ Não | ✅ Sim | `200 OK` ou `204 No Content` |
| `PATCH` | Atualização parcial | ❌ Não | ⚠️ Depende | `200 OK` ou `204 No Content` |
| `DELETE`| Remover recurso | ❌ Não | ✅ Sim | `204 No Content` |

---

## 🧪 Servidor de Demonstração em Código

O projeto conta com um servidor funcional em [`src/index.ts`](file:///Users/samukadev/Documents/GitHub/api-scaffold/src/index.ts) construído sobre o runtime nativo do **Bun**, exemplificando todos os padrões em tempo real.

### Executando Localmente

```bash
# Iniciar em modo de desenvolvimento (hot reload)
bun dev
```

O servidor iniciará em `http://localhost:3000`.

### Exemplos Práticos de Teste (cURL)

#### 1. Listagem com Filtros, Ordenação e Paginação (Padrão 06)
```bash
curl -X GET "http://localhost:3000/api/v1/products?category=keyboards&max_price=100&sort=-price&page=1&limit=10"
```

#### 2. Criação com Cabeçalho Location e Idempotency-Key (Padrões 04 e 08)
```bash
curl -i -X POST "http://localhost:3000/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" \
  -d '{"customer_id": "usr_192", "total_amount": 199.90}'
```

#### 3. Tentativa de Mutação com Conflito 409 (Padrões 04 e 05)
```bash
curl -i -X PATCH "http://localhost:3000/api/v1/orders/ord_7ft4" \
  -H "Content-Type: application/json" \
  -d '{"total_amount": 250.00}'
```
*Retorna HTTP `409 Conflict` com código `ORDER_ALREADY_PAID` seguindo o formato RFC 7807.*

#### 4. Tarefa Assíncrona com HTTP 202 Accepted (Padrão 08)
```bash
curl -i -X POST "http://localhost:3000/api/v1/reports" \
  -H "Content-Type: application/json" \
  -d '{"type": "sales_annual_summary"}'
```
*Retorna `202 Accepted` com cabeçalho `Location: /api/v1/jobs/{job_id}` para acompanhamento.*

---

## 📌 Conclusão e Filosofia de Design

Uma boa API deve ser:
- **Intuitiva:** O desenvolvedor infere novos endpoints sem ler o manual constantemente.
- **Resiliente:** Lida de forma graciosa com erros de rede, retentativas e concorrência.
- **Evolutiva:** Permite que novas funcionalidades sejam adicionadas sem quebrar clientes que já estão em produção.

Para aprofundar em cada conceito, consulte os documentos detalhados na pasta [`docs/`](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/).