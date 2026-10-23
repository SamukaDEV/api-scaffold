# 6. Query Parameters: Filtros, Busca, Ordenação e Paginação

## 📌 Visão Geral

Um dos erros mais comuns no design de APIs é sobrecarregar a estrutura de caminhos da URL (*URL Path*) com critérios de filtro, ordenação e busca, ou cometer o erro oposto: utilizar parâmetros de consulta para definir ações.

A arquitetura REST estabelece uma separação límpida de **três responsabilidades fundamentais**:

```text
┌─────────────────────────────────────────────────────────────┐
│                 AS TRÊS RESPONSABILIDADES                   │
├───────────────────┬─────────────────────────────────────────┤
│ 1. Paths (Rotas)  │ Identificam os RECURSOS                 │
│ 2. Query Params   │ REFINAM a consulta aos recursos         │
│ 3. HTTP Methods   │ Descrevem as OPERAÇÕES a realizar       │
└───────────────────┴─────────────────────────────────────────┘
```

---

## 🚫 O Anti-Padrão da Explosão Combinatória no Path

Considere o seguinte cenário: você precisa consultar produtos da categoria "teclados", que estejam em estoque, com preço menor que 50 e ordenados por preço.

### ❌ Péssimo: Embutir Filtros no Caminho da URL
```http
GET /products/keyboards/in-stock/under-50/sort-by-price
```

### Por que isso é inviável?
- **6 segmentos na URL:** O cliente é forçado a memorizar uma ordem arbitrária.
- **Explosão Combinatória:** 6 segmentos possuem $6! = 720$ ordens matemáticas possíveis de digitação.
- **Inflexibilidade:** Se o usuário quiser filtrar apenas por "under-50" sem especificar categoria, a rota quebra ou exige caminhos coringa absurdos como `/products/all/all/under-50`.

### ✅ Correto: O Caminho Identifica a Coleção; Parâmetros Refinam o Resultado
```http
GET /products?category=keyboards&in_stock=true&max_price=50&sort=price&order=asc
```
O recurso permanece sendo puramente `/products`. Os parâmetros tornam-se opcionais, independentes de ordem e combináveis dinamicamente.

---

## 🚫 O Anti-Padrão: "O Verbo Disfarçado de Filtro"

Outro erro frequente de desenvolvedores que migram de frameworks antigos:

```http
# ❌ UM VERBO DISFARÇADO DE FILTRO:
POST /products?action=delete&id=2048
GET  /users?do=sendEmail
```

Parâmetros de query **nunca devem ditar comandos de ação**. Para deletar um produto, use o verbo HTTP correto na rota do recurso:
```http
# ✅ RESTful e Semântico:
DELETE /products/2048
```

---

## 🔍 Guia de Boas Práticas para Query Parameters

### 1. Filtragem Simples e Múltipla
- **Filtro exato:**  
  `GET /orders?status=shipped`
- **Filtro com múltiplos valores (separados por vírgula):**  
  `GET /orders?status=pending,paid,processing`
- **Filtro de intervalo (datas ou valores numéricos):**  
  `GET /orders?created_after=2026-01-01&created_before=2026-01-31`  
  *Alternativa estruturada:* `GET /orders?created_at[gte]=2026-01-01&created_at[lte]=2026-01-31`

### 2. Ordenação (*Sorting*)
Prefira um formato simples e conciso. Uma convenção popularizada pelo ecossistema REST moderno utiliza o prefixo de hífen `-` para indicar ordem descendente:
- Crescente: `GET /products?sort=price` (do mais barato para o mais caro)
- Decrescente: `GET /products?sort=-price` (do mais caro para o mais barato)
- Múltiplos critérios: `GET /products?sort=-created_at,price`

### 3. Seleção de Campos / Projeção (*Sparse Fieldsets*)
Para economizar banda de rede (essencial em clientes mobile), permita que o cliente solicite apenas os campos que vai renderizar na tela:
```http
GET /users?fields=id,name,avatar_url
```
Em vez de retornar 40 propriedades de endereço e auditoria, o payload retorna apenas o que foi solicitado.

### 4. Busca Textual Global (*Full-text Search*)
Utilize o parâmetro universal `q` para buscas de texto livre:
```http
GET /products?q=mecanico+sem+fio
```

---

## 📑 Modelos de Paginação: Offset vs. Cursor

Retornar milhões de registros em um único endpoint sobrecarrega a memória do backend e trava o cliente. Toda coleção deve ser paginada.

### 🔹 1. Paginação Baseada em Offset (`page` e `limit`)
O modelo mais simples e conhecido:
```http
GET /products?page=2&limit=20
```

**Resposta Padronizada:**
```json
{
  "data": [ ... ],
  "meta": {
    "page": 2,
    "limit": 20,
    "total_items": 1540,
    "total_pages": 77
  }
}
```

*Vantagens:* Fácil de implementar no SQL (`LIMIT 20 OFFSET 20`) e permite pular direto para a página 50.  
*Desvantagens:* Ineficiente em tabelas gigantescas (o banco precisa escanear milhares de linhas descartadas) e suscetível ao problema do "item duplicado" quando novos dados são inseridos em tempo real.

---

### 🔹 2. Paginação Baseada em Cursor / Keyset (`after` e `limit`)
O modelo de alto desempenho utilizado pelo Stripe, GitHub e redes sociais:
```http
GET /orders?limit=10&starting_after=ord_7ft4
```

**Resposta com Cursores de Navegação:**
```json
{
  "data": [ ... ],
  "meta": {
    "has_more": true,
    "next_cursor": "ord_8km9"
  }
}
```

*Vantagens:* Altíssima performance no banco de dados indexado (`WHERE id > 'ord_7ft4' LIMIT 10`), estável contra alterações simultâneas e ideal para *infinite scroll*.  
*Desvantagens:* Não permite pular para páginas aleatórias (ex: "ir para página 4").
