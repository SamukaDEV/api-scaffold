# 2. URLs Previsíveis, Nomenclatura e Hierarquia

## 📌 Visão Geral

Uma API de alto nível deve respeitar o **Princípio da Menor Surpresa** (Principle of Least Astonishment). Uma vez que um desenvolvedor compreende a estrutura de um endpoint da sua API, ele deve ser capaz de prever os demais endpoints sem precisar consultar a documentação a cada linha de código.

A previsibilidade de URLs depende diretamente de três pilares:
1. **Estrutura uniforme:** Padrão rígido de coleções e identificadores.
2. **Consistência de nomenclatura:** Pluralização, convenção de caracteres (*kebab-case*) e vocabulário semântico padronizado.
3. **Hierarquia controlada de relacionamentos:** Evitar aninhamentos profundos (*deep nesting*).

---

## 📐 A Fórmula da URL Previsível

A esmagadora maioria dos recursos em APIs REST segue a fórmula universal:

```text
/{collection}/{id}/{sub-resource}/{sub-id}
```

| Componente | Função | Exemplo |
| :--- | :--- | :--- |
| **`/collection`** | Agrupa um conjunto de recursos homogêneos (sempre no plural) | `/products` |
| **`/{id}`** | Especifica a instância única de um recurso dentro da coleção | `/products/2048` |
| **`/{sub-resource}`** | Identifica uma relação subordinada ou dependente do recurso pai | `/products/2048/reviews` |
| **`/{sub-id}`** | Seleciona a instância individual dentro do sub-recurso | `/products/2048/reviews/1024` |

### A Linha de Previsão
Ao ver `/products/2048` e saber que produtos têm avaliações, qualquer desenvolvedor infere de forma natural:
- Lista de avaliações: `GET /products/2048/reviews`
- Criação de avaliação: `POST /products/2048/reviews`
- Avaliação específica: `GET /products/2048/reviews/1024`

Se a sua API quebrar essa lógica criando algo como `GET /get_reviews_for_product?pId=2048` ou `GET /productReview/2048`, o cliente perde a confiança e o tempo de integração dispara.

---

## 🚫 Inconsistências Comuns que Destroem APIs

A inconsistência gera fricção cognitiva imediata no desenvolvedor integrador:

```http
GET /user/192           <-- Singular
GET /customers/192      <-- Mudou o vocabulário para 'customers'
GET /customerProfile/192 <-- Usou camelCase
GET /order_items/192    <-- Usou snake_case
```

### O Custo da Inconsistência:
- *"Nesse endpoint é `/user` ou `/users`?"*
- *"Usa traço (`user-profiles`) ou underline (`user_profiles`) ou maiúscula (`userProfiles`)?"*
- *"O cliente é chamado de `user`, `customer`, `account` ou `client`?"*

### Convenções Recomendadas pelo Mercado:
1. **Substantivos no Plural:**
   - ✅ `/users`, `/orders`, `/products`, `/invoices`
   - ❌ `/user`, `/order`, `/product`, `/invoice`
2. **Nomes Compostos em `kebab-case` (letras minúsculas separadas por hífen):**
   - ✅ `/payment-methods`, `/delivery-addresses`, `/access-tokens`
   - ❌ `/payment_methods` (snake_case), `/paymentMethods` (camelCase), `/PaymentMethods` (PascalCase)
3. **Vocabulário Unificado:**
   - Escolha um termo de negócio e mantenha em toda a API: se você usa `customers`, não chame de `users` ou `clients` em outros módulos.

---

## 🌲 Hierarquia de Sub-Recursos: A Regra do Aninhamento Raso (Shallow Nesting)

Sub-recursos são excelentes para representar dependência forte (onde o filho não faz sentido sem o pai). Porém, aninhar mais de 2 níveis é um anti-padrão grave conhecido como **Deep Nesting Hell**:

### ❌ Anti-Padrão: Aninhamento Excessivo
```http
GET /organizations/42/teams/12/projects/9/tasks/301/comments/77
```
**Problemas:**
- URL excessivamente longa e frágil.
- Força queries com múltiplos JOINs desnecessários no backend.
- Exige que o cliente conheça toda a árvore genealógica de IDs apenas para buscar um comentário que já possui ID próprio (`77`).

### ✅ Solução: Aplanar Endpoints Independentes (Shallow Nesting)

Se o recurso possui um identificador globalmente único (como UUID, Snowflake ou ID numérico primário), dê acesso direto a ele:

```http
# Para criar ou listar itens no contexto do pai:
GET  /tasks/301/comments
POST /tasks/301/comments

# Para manipular ou buscar o comentário diretamente:
GET    /comments/77
PATCH  /comments/77
DELETE /comments/77
```

> **Regra Prática:**  
> Use aninhamento apenas para **criação e listagem relacional** (`/pai/{id}/filhos`).  
> Use endpoints planos diretos para **operações por ID próprio** (`/filhos/{id}`).

---

## 🔑 Boas Práticas para Identificadores (`{id}`)

1. **Evite IDs sequenciais previsíveis em recursos públicos sensíveis:**
   - `GET /orders/1`, `GET /orders/2` permite que concorrentes descubram o volume diário de vendas (Insecure Direct Object Reference - IDOR).
2. **Prefira IDs com prefixo de tipo (Padrão Stripe/GitHub):**
   - `usr_9x8a7b` (Usuário)
   - `ord_7ft4` (Pedido)
   - `prod_m3n2` (Produto)
   *Vantagens:* Identificação visual imediata nos logs, facilita debugging e validação de tipo de entidade na aplicação.
3. **Trate o identificador como String opaca pelo cliente:**
   - O cliente não deve tentar parsear a estrutura interna do ID.

---

## 📋 Checklist de Previsibilidade

- [x] Todas as coleções utilizam substantivos no plural?
- [x] Todos os caminhos utilizam `kebab-case` para palavras compostas?
- [x] O aninhamento de sub-recursos tem no máximo 2 níveis?
- [x] Operações diretas em recursos secundários com ID único estão aplanadas?
- [x] O vocabulário de entidades é uniforme em toda a documentação e código?
