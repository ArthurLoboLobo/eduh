API Reference

Criar QRCode PIX
Permite que você crie um código copia-e-cola e um QRCode Pix para seu cliente fazer o pagamento.

POST /pixQrCode/create

Criar QRCode PIX

curl --request POST \
  --url https://api.abacatepay.com/v1/pixQrCode/create \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "amount": 123,
  "expiresIn": 123,
  "description": "<string>",
  "metadata": {
    "externalId": "123"
  }
}
'

200
{
  "data": {
    "id": "pix_char_123456",
    "amount": 100,
    "status": "PENDING",
    "devMode": true,
    "brCode": "00020101021226950014br.gov.bcb.pix",
    "brCodeBase64": "data:image/png;base64,iVBORw0KGgoAAA",
    "platformFee": 80,
    "createdAt": "2025-03-24T21:50:20.772Z",
    "updatedAt": "2025-03-24T21:50:20.772Z",
    "expiresAt": "2025-03-25T21:50:20.772Z"
  },
  "error": null
}

401
{
  "error": "Token de autenticação inválido ou ausente."
}

Authorizations
​
Authorization
string header required
Cabeçalho de autenticação Bearer no formato Bearer <abacatepay-api-key> onde <abacatepay-api-key> é a sua chave de API.

Body
application/json
​
amount
number required
Valor da cobrança em centavos.

​
expiresIn
number
Tempo de expiração da cobrança em segundos.

​
description
string
Mensagem que aparecerá na hora do pagamento do PIX. Caracteres além de 37 serão ignorados no registro.

Maximum string length: 37
​
customer
object
Os dados do seu cliente para criá-lo.
O objeto de customer não é obrigatório, mas ao informar qualquer informação do customer todos os campos name, cellphone, email e taxId são obrigatórios.

metadata
object
Metadados opcionais para a cobrança


Response

200
data
object
Child attributes

​
data.id
string
Identificador único do QRCode Pix.

Example:
"pix_char_123456"

​
data.amount
number
Valor a ser pago.

Example:
100

​
data.status
enum<string>
Informação sobre o andamento do QRCode Pix.

Available options: PENDING, EXPIRED, CANCELLED, PAID, REFUNDED 
Example:
"PENDING"

​
data.devMode
boolean
Ambiente no qual o QRCode Pix foi criado.

Example:
true

​
data.brCode
string
Código copia-e-cola do QRCode Pix.

Example:
"00020101021226950014br.gov.bcb.pix"

​
data.brCodeBase64
string
Imagem em Base64 do QRCode Pix.

Example:
"data:image/png;base64,iVBORw0KGgoAAA"

​
data.platformFee
number
Taxas da plataforma

Example:
80

​
data.createdAt
string
Data de criação do QRCode Pix.

Example:
"2025-03-24T21:50:20.772Z"

​
data.updatedAt
string
Data de atualização do QRCode Pix.

Example:
"2025-03-24T21:50:20.772Z"

​
data.expiresAt
string
Data de expiração do QRCode Pix

Example:
"2025-03-25T21:50:20.772Z"



401
error
string
Mensagem de erro descrevendo o motivo da falha na autenticação.

Example:
"Token de autenticação inválido ou ausente."














API Reference
Checar Status
Checar status do pagamento do QRCode Pix.

GET /pixQrCode/check

Checar Status

curl --request GET \
  --url https://api.abacatepay.com/v1/pixQrCode/check \
  --header 'Authorization: Bearer <token>'

200
{
  "data": {
    "status": "PENDING",
    "expiresAt": "2025-03-25T21:50:20.772Z"
  },
  "error": null
}

401
{
  "error": "Token de autenticação inválido ou ausente."
}


Authorizations
​
Authorization
string header required
Cabeçalho de autenticação Bearer no formato Bearer <abacatepay-api-key> onde <abacatepay-api-key> é a sua chave de API.

Query Parameters
​
id
string required
ID do QRCode Pix

Response

200

application/json
Status retornado

​
data
object
Child attributes

data.status
enum<string>
Informação sobre o andamento do QRCode Pix.

Available options: PENDING, EXPIRED, CANCELLED, PAID, REFUNDED 
Example:
"PENDING"

​
data.expiresAt
string
Data de expiração do QRCode Pix

Example:
"2025-03-25T21:50:20.772Z"

401

Não autorizado. Falha na autenticação.

​
error
string
Mensagem de erro descrevendo o motivo da falha na autenticação.

Example:
"Token de autenticação inválido ou ausente."






API Reference
Simular Pagamento
Simula o pagamento de um QRCode Pix criado no modo de desenvolvimento.

POST /pixQrCode/simulate-payment

Simular Pagamento

curl --request POST \
  --url https://api.abacatepay.com/v1/pixQrCode/simulate-payment \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
  "metadata": {}
}'


200
{
  "data": {
    "id": "pix_char_123456",
    "amount": 100,
    "status": "PENDING",
    "devMode": true,
    "brCode": "00020101021226950014br.gov.bcb.pix",
    "brCodeBase64": "data:image/png;base64,iVBORw0KGgoAAA",
    "platformFee": 80,
    "createdAt": "2025-03-24T21:50:20.772Z",
    "updatedAt": "2025-03-24T21:50:20.772Z",
    "expiresAt": "2025-03-25T21:50:20.772Z"
  },
  "error": null
}

401
{
  "error": "Token de autenticação inválido ou ausente."
}


Authorizations
​
Authorization
string header required
Cabeçalho de autenticação Bearer no formato Bearer <abacatepay-api-key> onde <abacatepay-api-key> é a sua chave de API.

Query Parameters
​
id
string required
ID do QRCode Pix

Body
application/json
​
metadata
object
Metadados opcionais para a requisição

Response

200

application/json
Pagamento ralizado com sucesso

​
data
object
Child attributes

data.id
string
Identificador único do QRCode Pix.

Example:
"pix_char_123456"

​
data.amount
number
Valor a ser pago.

Example:
100

​
data.status
enum<string>
Informação sobre o andamento do QRCode Pix.

Available options: PENDING, EXPIRED, CANCELLED, PAID, REFUNDED 
Example:
"PENDING"

​
data.devMode
boolean
Ambiente no qual o QRCode Pix foi criado.

Example:
true

​
data.brCode
string
Código copia-e-cola do QRCode Pix.

Example:
"00020101021226950014br.gov.bcb.pix"

​
data.brCodeBase64
string
Imagem em Base64 do QRCode Pix.

Example:
"data:image/png;base64,iVBORw0KGgoAAA"

​
data.platformFee
number
Taxas da plataforma

Example:
80

​
data.createdAt
string
Data de criação do QRCode Pix.

Example:
"2025-03-24T21:50:20.772Z"

​
data.updatedAt
string
Data de atualização do QRCode Pix.

Example:
"2025-03-24T21:50:20.772Z"

​
data.expiresAt
string
Data de expiração do QRCode Pix

Example:
"2025-03-25T21:50:20.772Z"



401
error
string
Mensagem de erro descrevendo o motivo da falha na autenticação.

Example:
"Token de autenticação inválido ou ausente."

