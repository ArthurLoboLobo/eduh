Webhooks (API v1)
Eventos e payloads de webhooks da API v1 da AbacatePay.

Estes webhooks são referentes à API v1. Para a versão atual (v2), selecione a opção v2 no seletor de versão no topo da documentação e use a página principal de Webhooks.
Pense nos webhooks como “mensagens enviadas pela AbacatePay para o seu sistema”, sem que você precise ficar consultando a API o tempo todo.
Na v1 eles seguem os mesmos princípios:
Você cadastra uma URL no dashboard
A AbacatePay dispara requisições POST para essa URL sempre que algo importante acontece
Seu backend processa o evento e responde com 200 OK quando tudo estiver certo
​
Estrutura geral do payload v1
Na v1, o formato geral do payload segue a mesma ideia da v2, mas sem o campo apiVersion:
{
  "event": "billing.paid",
  "devMode": false,
  "data": {
    "id": "bill_123456",
    "amount": 10000,
    "status": "PAID",
    "customer": {
      "id": "cust_123",
      "email": "customer@example.com"
    }
  }
}
Os campos mais importantes são:
event: nome do evento disparado
devMode: indica se o evento veio de ambiente de testes
data: objeto com os detalhes do recurso afetado (cobrança, pagamento, assinatura, etc.)
​
Segurança dos webhooks (v1)
Na v1 você pode (e deve) aplicar as mesmas recomendações da v2:
Usar um secret na URL do webhook
Validar uma assinatura HMAC no header (quando disponível)
Processar cada evento de forma idempotente
Um fluxo típico:
Sua URL de webhook é algo como
https://meusite.com/webhooks/abacatepay?webhookSecret=SEU_SECRET
No backend, você confere o webhookSecret da query string
Em seguida, valida a assinatura HMAC do corpo (caso esteja habilitada)
Só depois disso você processa o evento e responde com 200 OK
​
Eventos comuns na v1
A nomenclatura e a granularidade dos eventos na v1 podem ser um pouco diferentes. Os exemplos abaixo ilustram os tipos mais típicos que você vai encontrar:
Evento	Quando é disparado
billing.created	Quando uma cobrança/checkout é criada
billing.paid	Quando um pagamento é concluído com sucesso
billing.refunded	Quando um pagamento é totalmente reembolsado
billing.failed	Quando uma tentativa de pagamento falha
subscription.created	Quando uma assinatura é criada
subscription.canceled	Quando uma assinatura é cancelada
A lista exata de eventos pode variar conforme a época em que sua integração foi feita. Use estes nomes como referência e adapte para os eventos que você já recebe hoje no seu sistema.
​
Exemplo de webhook billing.paid (v1)
{
  "event": "billing.paid",
  "devMode": false,
  "data": {
    "id": "bill_abc123",
    "externalId": "pedido-123",
    "amount": 10000,
    "paidAmount": 10000,
    "status": "PAID",
    "customer": {
      "id": "cust_abc123",
      "email": "customer@example.com"
    },
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:05:00.000Z"
  }
}
​
