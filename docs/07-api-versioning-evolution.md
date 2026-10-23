# 7. Versionamento e Evolução Segura de APIs

## 📌 Visão Geral

Uma API em produção é um **contrato público inviolável** firmado entre o servidor e seus consumidores. Diferente de um site onde você pode atualizar o layout sem avisar o visitante, qualquer modificação estrutural em uma API pode paralisar sistemas externos de parceiros, aplicativos mobile e integrações críticas.

Por essa razão, o princípio de ouro da evolução de APIs é: **nunca introduza alterações que quebrem os clientes existentes sem fornecer um caminho claro de migração e versionamento**.

```http
# ✅ Seguro: O cliente sabe exatamente qual contrato está consumindo
GET /v1/products/192

# ❌ Frágil: Sem versão explícita, qualquer alteração quebra quem já consome
GET /products/192
```

---

## 🔍 O que Constitui uma Mudança Quebrante (*Breaking Change*)?

Para evoluir sua API sem incidentes, é indispensável saber diferenciar uma alteração segura de uma alteração que exige nova versão:

### 🔴 Mudanças Quebrantes (Exigem Nova Versão Major ou Tratamento Especial):
1. **Remover ou renomear** um endpoint existente (ex: mudar `/users` para `/accounts`).
2. **Remover ou renomear** propriedades no JSON de resposta (ex: `user_name` renomeado para `username`).
3. **Mudar o tipo de dado** de um campo (ex: `id: 1024` numérico transformado para `"usr_1024"` string).
4. **Tornar obrigatório** um campo que antes era opcional na requisição.
5. **Alterar a semântica ou o status code** de uma rota (ex: uma rota que retornava `200` agora retorna `204`).
6. **Modificar os códigos de erro** em que a aplicação cliente dependia para regras lógicas (`switch(code)`).

### 🟢 Mudanças Retrocompatíveis (*Non-Breaking Changes*):
1. **Adicionar novos endpoints** independentes.
2. **Adicionar novos campos opcionais** em payloads de requisição.
3. **Adicionar novos campos** no JSON de resposta (clientes bem desenvolvidos devem ignorar campos desconhecidos).
4. **Adicionar novos parâmetros opcionais** na query string (`?sort=`, `?filter=`).

---

## 🏛️ As Três Estratégias de Versionamento de APIs

### 1. Versionamento no Caminho da URI (*URI Path Versioning*)
O modelo mais popular e adotado por gigantes como Google, Twitter/X e Facebook.

```http
GET /v1/orders/1024
GET /v2/orders/1024
```

* **Vantagens:** Extremamente simples de inspecionar nos logs, fácil de rotear em proxies reversos (Nginx/Traefik) e permite testar versões diferentes diretamente pelo navegador ou cURL.
* **Desvantagens:** Viola tecnicamente o purismo estrito da arquitetura REST (onde a URI deveria representar o conceito do recurso, e não a versão do schema).

---

### 2. Versionamento por Cabeçalho Customizado (*Header Versioning*)
Abordagem refinada adotada pelo Stripe, AWS e GitHub.

```http
GET /orders/1024 HTTP/1.1
Host: api.exemplo.com
X-API-Version: 2026-10-01
```

* **Vantagens:** Mantém as URLs limpas e imutáveis. Permite versionamento baseado em datas de lançamento (*date-based versioning*), facilitando atualizações graduais por funcionalidade.
* **Desvantagens:** Mais difícil de testar no navegador sem extensões de injeção de headers e requer cuidados na configuração de cache em proxies (`Vary: X-API-Version`).

---

### 3. Versionamento por Negociação de Conteúdo (*Content Negotiation / Accept Header*)
O padrão acadêmico original do REST formal.

```http
GET /orders/1024 HTTP/1.1
Host: api.exemplo.com
Accept: application/vnd.minhaempresa.v2+json
```

* **Vantagens:** 100% aderente à especificação REST; o recurso permanece com a mesma URI e o cliente apenas solicita representações de formatos diferentes.
* **Desvantagens:** Alta complexidade de documentação e teste; muitos desenvolvedores acham a sintaxe pouco intuitiva.

---

## ⏳ Política de Depreciação e os Cabeçalhos Padrão da IETF

Quando uma versão antiga da API precisa ser descontinuada, **nunca a desligue de surpresa**. Utilize os padrões da IETF (RFC 8594) para alertar os consumidores através dos cabeçalhos HTTP:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Deprecation: true
Sunset: Wed, 11 Nov 2026 00:00:00 GMT
Link: <https://api.exemplo.com/docs/migracao-v2>; rel="deprecation"; type="text/html"

{
  "data": { ... }
}
```

### Cabeçalhos Explicados:
- **`Deprecation`:** Sinaliza formalmente aos gateways e crawlers que o endpoint está obsoleto.
- **`Sunset`:** Data e hora exatas (em formato HTTP-date UTC) em que o endpoint será **permanentemente desativado**.
- **`Link`:** Link direto para o guia de migração técnica.

Isso permite que sistemas de observabilidade dos clientes alertem os times de desenvolvimento meses antes de qualquer impacto em produção.
