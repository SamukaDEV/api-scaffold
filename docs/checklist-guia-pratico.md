# Guia Prático & Checklist para Criação de Novas APIs

## 📌 Visão Geral

Antes de escrever a primeira linha de código de um novo serviço ou módulo de API, uma equipe de engenharia deve alinhar os padrões de contrato. Este guia sintetiza as perguntas fundamentais e oferece um checklist de conformidade arquitetural.

---

## 🧭 O que uma API de Alta Qualidade Efetivamente Faz

- ✅ **Nomes de Recursos Fazem Sentido:** Apenas substantivos no plural, em minúsculas e sem verbos embutidos.
- ✅ **Métodos Comportam-se de Forma Previsível:** `GET` nunca altera dados, `PUT` substitui, `PATCH` atualiza parcialmente, `DELETE` remove.
- ✅ **Status Codes Significam Algo:** Fim definitivo de respostas `200 OK` contendo mensagens de erro.
- ✅ **Erros Possuem Estrutura Uniforme:** O cliente exibe a mensagem, o código toma decisões pelo código da máquina (`code`), e o SRE investiga o status e o `trace_id`.
- ✅ **Filtros Funcionam da Mesma Forma:** Parâmetros de ordenação, paginação e filtros seguem a mesma sintaxe em todas as rotas.
- ✅ **Evolução Não Quebra Consumidores:** Mudanças incompatíveis são versionadas com clareza e com períodos generosos de depreciação.

---

## ❓ As 8 Perguntas Fundamentais no Início do Projeto

| # | Pergunta Arquitetural | Decisão e Convenção Recomendada |
| :-: | :--- | :--- |
| **1** | **Como você nomeará os recursos?** | Substantivos em inglês ou português neutro, no plural (`/products`, `/users`), usando `kebab-case` para palavras compostas (`/credit-cards`). |
| **2** | **Como representará coleções e subcoleções?** | No padrão `/{collection}/{id}/{sub-resource}`, limitando o aninhamento a no máximo 2 níveis. Identificadores com prefixo de tipo (`ord_7ft4`). |
| **3** | **Quais métodos HTTP serão utilizados?** | `GET` para leitura pura, `POST` para criação e ações complexas, `PUT` para substituição total, `PATCH` para atualização parcial e `DELETE` para exclusão. |
| **4** | **Como os Status Codes serão tratados?** | `200` para leitura/update com body, `201` com header `Location` para criação, `202` para assíncrono, `204` para exclusão sem body. `400` para sintaxe, `401` para auth, `403` para permissão, `404` para inexistente, `409` para conflito de estado, `422` para validação e `429` para rate limit. |
| **5** | **Como será o formato das respostas de erro?** | Estrutura inspirada na RFC 7807 (`application/problem+json`), contendo `status`, `code`, `title`, `detail`, `instance` e lista `invalid_params`. |
| **6** | **Como funcionarão os filtros, ordenação e paginação?** | Path identifica o recurso; Query parameters refinam o resultado (`?status=active&sort=-created_at&limit=20&page=1`). Paginação por cursor em tabelas de alto volume. |
| **7** | **Como a API irá evoluir e versionar?** | Versionamento no prefixo da URI (`/api/v1/`) complementado por cabeçalhos padrão IETF `Deprecation` e `Sunset` para rotas obsoletas. |
| **8** | **Quais convenções de segurança e resiliência cada endpoint seguirá?** | Rate limiting ativo por IP/Token, exigência de `Idempotency-Key` em rotas de mutação financeira/crítica, e CORS configurado restritivamente. |

---

## ✅ Checklist de Revisão de Pull Request (API PR Checklist)

Utilize este checklist antes de aprovar novas rotas ou alterações em endpoints:

### 1. Nomenclatura e Rotas
- [ ] O caminho utiliza apenas substantivos no plural (`/orders` em vez de `/order` ou `/createOrder`)?
- [ ] Não há verbos ou ações na URL (`/cancelOrder`, `/deleteUser`)?
- [ ] Palavras compostas estão em `kebab-case` (`/payment-intents`)?
- [ ] O aninhamento não ultrapassa 2 níveis de profundidade?

### 2. Métodos e Semântica HTTP
- [ ] Métodos `GET` são totalmente livres de efeitos colaterais (leitura pura)?
- [ ] `PUT` requer a representação completa e é estritamente idempotente?
- [ ] `PATCH` é utilizado para alterações parciais de campos?
- [ ] `DELETE` retorna `204 No Content` ou `200 OK` com payload de confirmação?

### 3. Status Codes e Headers
- [ ] O endpoint nunca retorna status `200 OK` contendo `{ "success": false }`?
- [ ] Requisições `POST` de criação retornam `201 Created` acompanhadas do cabeçalho `Location`?
- [ ] Tarefas demoradas retornam `202 Accepted` com URL de acompanhamento do job?
- [ ] Erros de validação retornam `422 Unprocessable Content` (e não `400 Bad Request` genérico)?
- [ ] Erros de conflito com estado de negócio (ex: pedido já pago) retornam `409 Conflict`?

### 4. Respostas e Tratamento de Erros
- [ ] O corpo de erro segue a especificação padronizada (RFC 7807) com `code` de máquina e `detail` humano?
- [ ] Múltiplos erros de validação são retornados agrupados no array `invalid_params`?
- [ ] Nenhum stack trace interno ou erro de SQL bruto é exposto em produção?
- [ ] Toda resposta de erro inclui um identificador de rastreabilidade (`trace_id`)?

### 5. Parâmetros de Consulta e Coleções
- [ ] Todos os endpoints de listagem são protegidos por paginação com valor de `limit` máximo padrão?
- [ ] Filtros, busca e ordenação estão alocados em query parameters (`?filter=`, `?sort=`, `?q=`)?
- [ ] Não há "verbos disfarçados de filtro" (`?action=delete`)?

### 6. Contrato e Retrocompatibilidade
- [ ] A alteração quebra algum consumidor existente em produção?
- [ ] Se houver alteração quebrante, uma nova versão (`/v2/`) foi criada preservando a anterior?
- [ ] A documentação OpenAPI / Swagger foi atualizada com os schemas de requisição e resposta?
