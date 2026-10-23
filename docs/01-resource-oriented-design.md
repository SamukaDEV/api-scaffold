# 1. Design Orientado a Recursos, Não a Ações (Resource-Oriented Architecture)

## 📌 Visão Geral

No desenvolvimento de APIs RESTful, um dos princípios mais fundamentais e frequentemente violados é: **a API deve ser desenhada ao redor de recursos (substantivos), e não de ações (verbos)**.

Em modelos legados ou no estilo RPC (Remote Procedure Call), os desenvolvedores tendiam a tratar URLs como nomes de funções de programação (`/getUser`, `/createOrder`, `/cancelSubscription`). O protocolo HTTP, contudo, foi concebido desde a sua especificação para que o **método HTTP represente o verbo da ação** e a **URI represente o substantivo (a entidade ou coleção de dados)**.

---

## ❌ O Anti-Padrão RPC (Ações na URL)

Observar verbos na URL indica uma API procedimental disfarçada de REST:

```http
POST /createOrder HTTP/1.1
GET /getUserById?id=123 HTTP/1.1
POST /updateProductPrice HTTP/1.1
POST /deleteItem HTTP/1.1
```

### Por que isso é problemático?
1. **Redundância Semântica:** O método HTTP `POST` já carrega a semântica de criação de recurso. Escrever `POST /createOrder` é dizer "Criar Criar Pedido".
2. **Explosão de Endpoints:** Cada nova variação de ação requer uma nova rota na aplicação (`/updateOrderStatus`, `/modifyOrderAddress`, `/cancelOrder`), tornando o roteamento inchado e caótico.
3. **Falta de Padronização:** Um desenvolvedor pode criar `/createOrder`, outro `/make_order` e outro `/newOrder`. O cliente da API não consegue inferir novos endpoints sem ler a documentação inteira linha por linha.

---

## ✅ O Padrão RESTful (Recursos como Substantivos)

Em uma API REST bem projetada, identificamos primeiro quais são as **entidades do domínio de negócio**:
- Usuários (`users`)
- Pedidos (`orders`)
- Produtos (`products`)
- Avaliações (`reviews`)

Cada entidade torna-se uma **coleção** identificada por um substantivo no plural. O protocolo HTTP cuida de especificar o que deve ser feito com esse recurso:

| Método HTTP | Endpoint URI | Intenção Semântica | Ação no Recurso |
| :--- | :--- | :--- | :--- |
| `GET` | `/orders` | Obter representação | Listar pedidos |
| `POST` | `/orders` | Criar subordinado | Criar um novo pedido |
| `GET` | `/orders/ord_1024` | Obter representação | Ler detalhes do pedido 1024 |
| `PUT` | `/orders/ord_1024` | Substituir representação | Substituir integralmente o pedido |
| `PATCH` | `/orders/ord_1024` | Modificar parcialmente | Atualizar campos específicos do pedido |
| `DELETE` | `/orders/ord_1024` | Remover representação | Excluir ou arquivar o pedido |

> **Regra de Ouro:**  
> **O Método HTTP descreve a OPERAÇÃO.**  
> **A URL identifica o RECURSO.**

---

## 🔄 Como Modelar Ações Complexas do Mundo Real?

Uma dúvida clássica de desenvolvedores é: *"Como modelo ações de negócio como 'aprovar', 'publicar', 'cancelar' ou 'redefinir senha' sem colocar verbos na URL?"*

Existem 3 abordagens recomendadas pela arquitetura REST:

### 1. Modelar a Ação como Mudança Parcial de Estado (`PATCH`)
Quando a ação apenas altera o estado de um campo do recurso existente:
```http
PATCH /orders/ord_1024 HTTP/1.1
Content-Type: application/json

{
  "status": "cancelled",
  "reason": "customer_requested"
}
```

### 2. Modelar a Ação como um Sub-Recurso de Negócio (`POST` ou `PUT`)
Quando a ação possui auditoria, metadados próprios ou gera um evento:
Em vez de `POST /cancelOrder`, pense no cancelamento como uma entidade:
```http
POST /orders/ord_1024/cancellation HTTP/1.1
Content-Type: application/json

{
  "reason": "Out of stock",
  "authorized_by": "admin_42"
}
```
Outros exemplos:
- `/articles/42/publication` (para publicar um artigo)
- `/users/192/password-reset-request` (para solicitar recuperação de senha)
- `/payments/pay_987/refunds` (para solicitar reembolso)

### 3. Padrão Controller/Processador de Intenções (Para cálculos ou processos sem persistência)
Quando uma operação não cria dados persistentes (como um conversor de moedas ou simulador de crédito), represente a operação como um recurso de cálculo:
```http
POST /currency-conversions HTTP/1.1
Content-Type: application/json

{
  "from": "USD",
  "to": "BRL",
  "amount": 100.00
}
```
Isso trata a conversão como um recurso virtual calculado, mantendo a consistência REST.

---

## 📊 Matriz Comparativa: Antes vs. Depois

| Cenário de Negócio | Anti-Padrão RPC / Verbo | Padrão RESTful |
| :--- | :--- | :--- |
| Criar um novo cliente | `POST /registerCustomer` | `POST /customers` |
| Consultar perfil do usuário | `GET /getUserProfile?userId=50` | `GET /users/50/profile` |
| Bloquear cartão de crédito | `POST /cards/blockCard?id=99` | `PATCH /cards/99` com `{ "is_blocked": true }` ou `POST /cards/99/block` |
| Buscar itens favoritos | `GET /getFavoritesByUser?u=12` | `GET /users/12/favorites` |
| Apagar comentário | `POST /comments/delete/88` | `DELETE /comments/88` |

---

## 💡 Resumo do Padrão
1. **Substantivos, nunca verbos:** O caminho da URL deve responder à pergunta *"Qual coisa?"*, e não *"O que fazer?"*.
2. **Separação de responsabilidades:** Deixe os métodos `GET`, `POST`, `PUT`, `PATCH` e `DELETE` dizerem o que fazer.
3. **Consistência:** Desenvolvedores e SDKs conseguem deduzir os endpoints intuitivamente se o modelo de recursos for respeitado.
