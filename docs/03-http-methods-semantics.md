# 3. Semântica dos Métodos HTTP, Segurança e Idempotência

## 📌 Visão Geral

O protocolo HTTP (especificado pelas RFCs 7231 e 9110) define um conjunto de métodos com contratos estritos de **comportamento**, **segurança** e **idempotência**.

Utilizar o método correto não é apenas questão de "estilo"; é o que permite que a infraestrutura da internet (proxies reversos, navegadores, CDNs como Cloudflare e clientes HTTP automatizados) funcione com eficiência por meio de cacheamento inteligente e retentativas seguras de conexões com falha.

---

## 🧭 Os Principais Métodos e Seus Contratos

| Método HTTP | Propósito Semântico | Exemplo de Uso | Corpo na Requisição? | Corpo na Resposta? |
| :--- | :--- | :--- | :---: | :---: |
| **`GET`** | Recuperar uma representação do recurso sem causar efeito colateral. | `GET /users/192` | ❌ Não recomendado | ✅ Sim |
| **`POST`** | Criar um novo recurso subordinado ou submeter um processamento. | `POST /users` | ✅ Sim | ✅ Sim |
| **`PUT`** | Substituir integralmente a representação do recurso especificado. | `PUT /users/192` | ✅ Sim | ✅ Sim |
| **`PATCH`** | Aplicar modificações parciais a um recurso existente. | `PATCH /users/192` | ✅ Sim | ✅ Sim |
| **`DELETE`** | Remover ou arquivar o recurso identificado. | `DELETE /users/192` | ❌ Opcional / Raro | ⚠️ Pode ser vazio |
| **`HEAD`** | Idêntico ao `GET`, mas retorna apenas os cabeçalhos (sem o corpo). | `HEAD /files/report.pdf` | ❌ Não | ❌ Não |
| **`OPTIONS`**| Descrever os métodos e opções de comunicação suportados (CORS). | `OPTIONS /products` | ❌ Não | ⚠️ Vazio ou docs |

---

## 🛡️ Os Dois Conceitos Vitais: Segurança e Idempotência

### 1. Métodos Seguros (*Safe Methods*)
Um método é considerado **seguro** se a sua execução **NÃO altera o estado do servidor**. Ele é puramente de leitura.
- **Métodos Seguros:** `GET`, `HEAD`, `OPTIONS`.
- **Implicação Arquitetural:** Clientes e spiders de busca (como o Googlebot) podem chamar requisições seguras à vontade sem perigo de apagar ou alterar dados no banco. Proxies podem pré-carregar (*prefetch*) dados com segurança.

> ⚠️ **Anti-Padrão Fatal:**  
> Usar `GET /users/192/delete` ou `GET /newsletter/unsubscribe?email=...`.  
> Sistemas de antivírus e indexadores que abrem links de e-mails podem acionar essas rotas e apagar registros silenciosamente!

---

### 2. Métodos Idempotentes (*Idempotent Methods*)
Um método é **idempotente** se o efeito colateral no servidor ao executar a requisição **uma única vez é exatamente o mesmo de executá-la múltiplas vezes seguidas com os mesmos parâmetros**.

Matematicamente:
$$f(f(x)) = f(x)$$

- **Métodos Idempotentes:** `GET`, `HEAD`, `OPTIONS`, `PUT`, `DELETE`.
- **Métodos Não-Idempotentes:** `POST`, `PATCH` (por padrão).

### Tabela da Verdade: Segurança vs. Idempotência

| Método HTTP | Seguro (*Safe*)? | Idempotente (*Idempotent*)? | Permite Cache Nativo? |
| :--- | :---: | :---: | :---: |
| **`GET`** | ✅ Sim | ✅ Sim | ✅ Sim |
| **`HEAD`** | ✅ Sim | ✅ Sim | ✅ Sim |
| **`OPTIONS`**| ✅ Sim | ✅ Sim | ❌ Geralmente não |
| **`PUT`** | ❌ Não | ✅ Sim | ❌ Não |
| **`DELETE`** | ❌ Não | ✅ Sim | ❌ Não |
| **`POST`** | ❌ Não | ❌ Não | ⚠️ Apenas com headers explícitos |
| **`PATCH`** | ❌ Não | ❌ Não (por padrão) | ❌ Não |

---

## 🥊 PUT vs. PATCH: O Grande Duelo de Atualizações

Uma das maiores confusões na construção de APIs ocorre entre `PUT` e `PATCH`.

### 🔹 O Comportamento do `PUT` (Substituição Completa)
O `PUT` substitui o recurso por inteiro pela representação enviada no payload. Se um campo não for enviado no payload do `PUT`, ele **deve ser sobrescrito como `null` ou com o valor padrão**:

```http
# Estado inicial do recurso /users/192:
{ "name": "Ana Silva", "email": "ana@empresa.com", "role": "admin" }

# Requisição PUT /users/192:
{ "name": "Ana Clara" }

# Estado final no banco (campos omitidos foram perdidos/zerados):
{ "name": "Ana Clara", "email": null, "role": "user" }
```
*Por que o PUT é idempotente?*  
Se você enviar essa mesma requisição 10 vezes consecutivas, o recurso continuará com os mesmos valores exatos.

---

### 🔹 O Comportamento do `PATCH` (Modificação Parcial)
O `PATCH` altera apenas os campos informados, preservando os demais inalterados:

```http
# Estado inicial do recurso /users/192:
{ "name": "Ana Silva", "email": "ana@empresa.com", "role": "admin" }

# Requisição PATCH /users/192:
{ "name": "Ana Clara" }

# Estado final no banco:
{ "name": "Ana Clara", "email": "ana@empresa.com", "role": "admin" }
```

### Padrões Formais de PATCH no Ecossistema REST:
1. **JSON Merge Patch (RFC 7396):**
   - O payload é um JSON simples contendo os campos alterados. Enviar `{ "role": null }` remove a propriedade.
   - Cabeçalho: `Content-Type: application/merge-patch+json`.
2. **JSON Patch (RFC 6902):**
   - Uma sequência de operações atômicas (`add`, `remove`, `replace`, `move`, `copy`, `test`).
   ```json
   [
     { "op": "replace", "path": "/email", "value": "ana.novo@email.com" }
   ]
   ```
   - Cabeçalho: `Content-Type: application/json-patch+json`.

---

## 🗑️ DELETE e Idempotência: 200 vs 204 vs 404

Quando chamamos `DELETE /orders/192`:
- **1ª execução:** O recurso existe e é apagado com sucesso -> Resposta: `204 No Content` (ou `200 OK` se retornar a confirmação).
- **2ª execução:** O recurso não existe mais. Deve retornar `404 Not Found` ou `204 No Content`?

*Pela especificação HTTP:*  
Ambas as abordagens são aceitas, pois **idempotência diz respeito ao estado do servidor**, e não necessariamente ao status code retornado. No servidor, após a primeira ou a décima chamada, o recurso continua inexistente.  
No entanto, retornar `204 No Content` ou `404 Not Found` com código estruturado `RESOURCE_NOT_FOUND` no segundo envio ajuda o cliente a saber que o item já havia sido removido.

---

## 🚫 Principais Erros Semânticos a Evitar

1. **"Tudo é POST":** Utilizar `POST` para consultas (`POST /searchUsers`) ou para exclusões (`POST /deleteOrder`).
2. **GET com Efeito Colateral:** Modificar saldo bancário, incrementar visualizações ou apagar dados em rotas `GET`.
3. **Ignorar HEAD em Downloads Grandes:** Obriga o cliente a baixar gigabytes quando ele só precisava checar `Content-Length` ou `Last-Modified`.
