# 5. Tratamento e Padronização de Erros (RFC 7807)

## 📌 Visão Geral

Quando algo dá errado em uma requisição, o formato da resposta de erro define a experiência do desenvolvedor integrador e a estabilidade da aplicação cliente.

Uma API sem padrão de erros obriga os desenvolvedores frontend e mobile a implementarem checagens frágeis e improvisadas (como inspecionar substrings: `if (err.message.includes("paid"))`), que quebram assim que alguém altera uma vírgula no texto de erro do backend.

---

## 🎯 A Tríade da Resposta de Erro

Para que uma resposta de erro seja verdadeiramente profissional, ela precisa atender com precisão a três públicos distintos:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    A TRÍADE DA RESPOSTA DE ERRO                 │
├───────────────────┬─────────────────────────────────────────────┤
│ 1. O Usuário      │ Exibe "message" amigável na interface       │
│ 2. A Aplicação    │ Executa 'switch(code)' para fluxo de tela   │
│ 3. O Desenvolvedor│ Rastreia 'status' e 'trace_id' nos logs     │
└───────────────────┴─────────────────────────────────────────────┘
```

1. **O Usuário Final (Cliente):** Precisa de uma `message` compreensível em linguagem humana explicando o que aconteceu.
2. **A Aplicação (Código do Frontend/SDK):** Precisa de um identificador estável de máquina (`code` em formato `SNAKE_CASE_UPPERCASE`) para ramificar decisões na lógica de negócio (ex: abrir modal de recarga se for `INSUFFICIENT_FUNDS`, ou redirecionar se for `ORDER_ALREADY_PAID`).
3. **O Desenvolvedor / SRE:** Precisa do código de status HTTP correto e de um identificador de correlação (`trace_id` ou `instance`) para encontrar o registro exato no log do servidor.

---

## 📄 O Padrão Oficial: RFC 7807 / RFC 9457 (Problem Details)

A IETF padronizou a estrutura de erros para APIs HTTP por meio da **RFC 7807** (atualizada pela **RFC 9457**), sob o content-type `application/problem+json`.

### Estrutura Oficial Recomendada:

```json
{
  "type": "https://api.exemplo.com/errors/order-already-paid",
  "title": "Conflito de Estado de Pedido",
  "status": 409,
  "code": "ORDER_ALREADY_PAID",
  "detail": "O pedido ord_7ft4 já foi liquidado às 09:41 e não permite novas cobranças.",
  "instance": "/orders/ord_7ft4/payments",
  "trace_id": "req_88f9a0c1"
}
```

### Significado de Cada Campo:
- **`type` (URI):** Link para a documentação técnica descrevendo o tipo de erro.
- **`title` (String):** Resumo curto e legível do tipo do problema.
- **`status` (Number):** O mesmo código HTTP retornado no cabeçalho da resposta (ex: 409).
- **`code` (String):** Código estável da regra de negócio para a aplicação alternar (`switch/case`).
- **`detail` (String):** Explicação detalhada da ocorrência específica.
- **`instance` (URI):** O endpoint ou recurso onde a falha ocorreu.
- **`trace_id` (String):** Identificador único da requisição para cruzamento nos logs de observabilidade (ex: Datadog, CloudWatch).

---

## 📝 Tratando Erros de Validação com Múltiplos Campos (422)

Quando um formulário complexo é submetido com múltiplos erros, a API **nunca deve falhar no primeiro campo e parar**. Ela deve coletar e retornar todos os campos inválidos em uma única resposta estruturada:

```http
HTTP/1.1 422 Unprocessable Content
Content-Type: application/problem+json

{
  "type": "https://api.exemplo.com/errors/validation-failed",
  "title": "Falha na Validação dos Dados",
  "status": 422,
  "code": "VALIDATION_ERROR",
  "detail": "Um ou mais campos do formulário contêm dados inválidos.",
  "invalid_params": [
    {
      "field": "email",
      "reason": "Formato de e-mail inválido.",
      "value_received": "ana.com"
    },
    {
      "field": "age",
      "reason": "A idade mínima para cadastro é 18 anos.",
      "value_received": 15
    }
  ]
}
```

Isso permite que o frontend pinte de vermelho todos os inputs incorretos simultaneamente, proporcionando uma experiência de usuário (UX) excelente.

---

## 🚫 Erros Críticos que Devem Ser Evitados

### 1. Formatos Heterogêneos
Um endpoint retorna:
```json
{ "error": "Not found" }
```
Outro endpoint retorna:
```json
{ "msg": "Algo deu errado", "success": false }
```
Outro retorna apenas uma string:
```text
"Internal server error"
```
Isso força o consumidor a implementar interceptores cheios de `try/catch` para descobrir como cada rota formata falhas.

### 2. Vazamento de Detalhes Internos (*Data Leaks*)
Em ambientes de produção, **jamais retorne stack traces ou erros diretos do banco de dados**:
```json
// ❌ VULNERABILIDADE GRAVE DE SEGURANÇA:
{
  "error": "syntax error at or near 'SELECT' in /var/app/db/users.ts:84",
  "stack": "Error: query failed\n at Client.query (/node_modules/pg/...)"
}
```
Isso revela a atacantes detalhes sobre seu banco de dados, nomes de tabelas, versões de drivers e estrutura interna de pastas.  
Em produção, logue o stack trace internamente associado a um `trace_id` e devolva ao usuário uma mensagem genérica e segura:
```json
// ✅ RESPOSTA SEGURA EM PRODUÇÃO:
{
  "status": 500,
  "code": "INTERNAL_SERVER_ERROR",
  "detail": "Ocorreu um erro interno inesperado. Por favor, forneça o trace_id ao suporte.",
  "trace_id": "err_99a8b7c6"
}
```

---

## 💻 Implementação de Middleware Padronizado em TypeScript

```typescript
export interface ApiProblemError {
  status: number;
  code: string;
  message: string;
  detail?: string;
  invalidParams?: Array<{ field: string; reason: string }>;
}

export function createErrorResponse(
  status: number,
  code: string,
  message: string,
  options?: { detail?: string; invalidParams?: any[]; traceId?: string }
) {
  return Response.json(
    {
      type: `https://api.docs.dev/errors/${code.toLowerCase().replace(/_/g, "-")}`,
      title: message,
      status,
      code,
      detail: options?.detail || message,
      trace_id: options?.traceId || crypto.randomUUID(),
      invalid_params: options?.invalidParams
    },
    {
      status,
      headers: { "Content-Type": "application/problem+json" }
    }
  );
}
```
