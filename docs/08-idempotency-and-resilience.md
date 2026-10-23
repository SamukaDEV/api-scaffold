# 8. Idempotência, Chaves de Idempotência e Resiliência em Operações Críticas

## 📌 Visão Geral

Redes de computadores são intrinsecamente não confiáveis: pacotes se perdem, conexões caem por timeout e clientes disparam retentativas automáticas.

Em operações de leitura (`GET`), uma retentativa é inofensiva. Mas o que acontece quando um cliente tenta processar um pagamento de R$ 1.000,00 via `POST /orders`, o servidor processa a cobrança com sucesso no banco, mas a conexão cai **antes da resposta HTTP chegar ao cliente**?

```text
Cliente                        Servidor                   Gateway de Pagamento
   │                              │                                │
   │─── POST /orders ────────────>│── Processa cobrança ──────────>│ (Cobrança R$ 1.000)
   │                              │<── Confirmação recebida ───────│
   │                              │
   │      ❌ Conexão caiu!        │
   │   (Timeout de rede no cliente)
   │
   │─── Retentativa automática! ─>│── Processa de novo? ──────────>│ (Cobrança DUPLICADA!)
```

O cliente, achando que a operação falhou, tenta novamente e cobra o usuário duas vezes. Este é um dos maiores pesadelos em sistemas de produção.

Para resolver isso, APIs profissionais adotam o padrão de **Chaves de Idempotência** e **Padrões de Execução Assíncrona**.

---

## 🔑 O Padrão de Chave de Idempotência (`Idempotency-Key`)

Popularizado pelo Stripe e formalizado como rascunho de especificação na IETF, o padrão de Chave de Idempotência permite que o cliente torne requisições `POST` e `PATCH` seguras contra repetições acidentais.

### Como Funciona:
1. Antes de disparar a requisição, o cliente gera um identificador único universal (UUID v4) e o envia no cabeçalho:
   ```http
   POST /orders HTTP/1.1
   Host: api.exemplo.com
   Content-Type: application/json
   Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d

   {
     "customer_id": "usr_192",
     "amount": 1000.00
   }
   ```
2. O servidor consulta uma camada rápida de cache distribuído (como Redis):
   - **Cenário A (Chave Nova):** O servidor grava a chave com estado `PROCESSING` e adquire um lock atômico. Processa a transação, salva a resposta final no cache (com TTL de 24h a 72h) e responde ao cliente.
   - **Cenário B (Chave já Existente e Concluída):** O servidor **não reexecuta** a regra de negócio. Ele apenas recupera o status HTTP e o JSON idêntico salvos no cache da primeira execução e os retorna imediatamente.
   - **Cenário C (Mesma Chave com Payload Diferente):** Se o cliente reenviar a mesma chave com valores diferentes, o servidor rejeita com `422 Unprocessable Content` (`code: "IDEMPOTENCY_KEY_MISMATCH"`).

---

## ⏳ Padrão Assíncrono com `202 Accepted` e Job Polling

Nem toda requisição pode ser resolvida em menos de 200ms. Tarefas pesadas (geração de relatórios analíticos, exportação de grandes volumes em PDF/CSV, processamento de vídeo ou envio de e-mails em massa) **nunca devem segurar a conexão HTTP do usuário**.

Se uma operação demorar mais de alguns segundos, ela deve ser enfileirada:

### Passo 1: O Cliente Solicita a Tarefa
```http
POST /reports HTTP/1.1
Host: api.exemplo.com
Content-Type: application/json

{
  "type": "annual_sales",
  "year": 2026
}
```

### Passo 2: O Servidor Responde Imediatamente com `202 Accepted`
```http
HTTP/1.1 202 Accepted
Location: /jobs/job_998
Content-Type: application/json

{
  "job_id": "job_998",
  "status": "queued",
  "message": "O relatório está na fila de processamento.",
  "estimated_completion_seconds": 45
}
```
O cabeçalho `Location` aponta para a URL onde o cliente pode checar o progresso.

### Passo 3: O Cliente Consulta o Status (`Polling`)
```http
GET /jobs/job_998 HTTP/1.1
```
Enquanto estiver processando:
```http
HTTP/1.1 200 OK
{
  "job_id": "job_998",
  "status": "processing",
  "progress_percentage": 65
}
```
Quando finalizar:
```http
HTTP/1.1 200 OK
{
  "job_id": "job_998",
  "status": "completed",
  "completed_at": "2026-10-23T16:45:00Z",
  "result_url": "https://storage.exemplo.com/reports/sales-2026.pdf"
}
```

> **Alternativa Moderna (Event-Driven):**  
> Em vez de o cliente ficar consultando (*polling*), forneça suporte a **Webhooks**, notificando o sistema do cliente por meio de um `POST` no endpoint dele assim que o relatório estiver pronto.

---

## 🛡️ Resiliência com Rate Limiting e Cabeçalhos de Proteção

Para proteger o servidor contra ataques de negação de serviço (DoS) ou clientes com bugs em loops infinitos, implemente limitação de taxa (*Rate Limiting*):

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1792784597

{
  "type": "https://api.exemplo.com/errors/rate-limit-exceeded",
  "title": "Limite de Requisições Excedido",
  "status": 429,
  "code": "RATE_LIMIT_EXCEEDED",
  "detail": "Você atingiu o limite de 100 requisições por minuto. Tente novamente em 60 segundos."
}
```

---

## 📋 Resumo das Práticas de Resiliência
1. Exija `Idempotency-Key` em todos os endpoints de cobrança, transferência ou mutações críticas.
2. Nunca trave requisições com processamentos demorados: utilize `202 Accepted` com filas assíncronas.
3. Forneça sempre o cabeçalho `Retry-After` em respostas `429` ou `503`.
