# Manual de Arquitetura de APIs RESTful

Este manual consolida os **8 Padrões Fundamentais de Design de APIs RESTful** necessários para projetar, construir e manter serviços web profissionais, fáceis de integrar e à prova de obsolescência.

---

## 📚 Mapa da Documentação Técnica

| Padrão | Documento de Estudo | Tema Central |
| :---: | :--- | :--- |
| **01** | [Design Orientado a Recursos](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/01-resource-oriented-design.md) | Por que desenhar URLs ao redor de substantivos e deixar os métodos HTTP expressarem as ações. |
| **02** | [URLs Previsíveis e Hierarquia](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/02-predictable-urls-hierarchy.md) | Estrutura uniforme, consistência de nomenclatura (`kebab-case`, plural) e a regra do aninhamento raso (*shallow nesting*). |
| **03** | [Semântica dos Métodos HTTP](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/03-http-methods-semantics.md) | Contratos de `GET`, `POST`, `PUT`, `PATCH`, `DELETE`; a diferença crucial entre métodos Seguros e Idempotentes. |
| **04** | [Status Codes Úteis e Significativos](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/04-meaningful-status-codes.md) | O fim do falso `200 OK com erro no body`; catálogo prático de 2xx, 4xx e 5xx e fluxograma de escolha. |
| **05** | [Tratamento Padronizado de Erros (RFC 7807)](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/05-standardized-error-handling.md) | A tríade da resposta de erro (Usuário, Aplicação, SRE), `Problem Details`, `code` de máquina e múltiplos erros de validação. |
| **06** | [Query Parameters, Filtros e Paginação](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/06-query-params-filtering-pagination.md) | A separação das 3 responsabilidades (Path identifica, Query refina, Método opera); ordenação, projeção e paginação por cursor. |
| **07** | [Versionamento e Evolução Sem Quebras](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/07-api-versioning-evolution.md) | Mudanças quebrantes vs retrocompatíveis; estratégias de versão (URI, Header) e cabeçalhos `Deprecation` e `Sunset`. |
| **08** | [Idempotência e Resiliência](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/08-idempotency-and-resilience.md) | O problema das redes distribuídas; chaves de idempotência (`Idempotency-Key`), processamento assíncrono com `202 Accepted` e rate limiting. |
| **Guia**| [Checklist & Guia Prático](file:///Users/samukadev/Documents/GitHub/api-scaffold/docs/checklist-guia-pratico.md) | As 8 perguntas essenciais ao iniciar uma API e checklist de aprovação de Pull Request. |

---

## 🛠️ Arquitetura do Exemplo Prático em Código

Este repositório inclui uma implementação executável em TypeScript rodando sobre o runtime **Bun**:

```text
api-scaffold/
├── docs/                     # Documentação técnica aprofundada
│   ├── 01-resource-oriented-design.md
│   ├── 02-predictable-urls-hierarchy.md
│   ├── 03-http-methods-semantics.md
│   ├── 04-meaningful-status-codes.md
│   ├── 05-standardized-error-handling.md
│   ├── 06-query-params-filtering-pagination.md
│   ├── 07-api-versioning-evolution.md
│   ├── 08-idempotency-and-resilience.md
│   ├── checklist-guia-pratico.md
│   └── api.md
├── src/                      # Código executável de demonstração
│   ├── index.ts              # Servidor HTTP nativo do Bun com roteamento
│   └── api/v1/
│       ├── index.ts          # Módulo da API v1
│       ├── products.ts       # Recursos de produtos (Filtros, Projeção, Paginação)
│       ├── orders.ts         # Recursos de pedidos (Idempotência, Conflito 409)
│       ├── reports.ts        # Tarefas assíncronas (HTTP 202 Accepted e Job Polling)
│       └── errors.ts         # Middleware RFC 7807 Problem Details
└── README.md                 # Sumário executivo e guia de início rápido
```

---

## 🚀 Como Executar o Servidor de Demonstração

Para inicializar a API de estudo com hot reload:

```bash
bun dev
```

E para testar os endpoints via terminal cURL ou clientes HTTP como Insomnia / Postman, consulte os exemplos documentados em cada capítulo da pasta `docs/`.
