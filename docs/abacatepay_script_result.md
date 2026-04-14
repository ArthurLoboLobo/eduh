Result of the script being ran:
🔵 STEP 1: Create PIX QR Code

============================================================
>>> POST https://api.abacatepay.com/v1/pixQrCode/create
>>> Body: {
  "amount": 100,
  "expiresIn": 600,
  "description": "Eduh Pro Test",
  "metadata": {
    "externalId": "test-payment-uuid-123",
    "userId": "test-user-uuid-456",
    "creditsToDebit": 0
  }
}
<<< Status: 200
<<< Headers: {
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'Content-Type, Authorization, x-pdv-token',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'access-control-allow-origin': '*',
  'access-control-expose-headers': '*',
  'alt-svc': 'h3=":443"; ma=86400',
  'cf-cache-status': 'DYNAMIC',
  'cf-ray': '9e921a8249ab066a-GRU',
  connection: 'keep-alive',
  'content-encoding': 'br',
  'content-type': 'application/json',
  date: 'Wed, 08 Apr 2026 14:53:49 GMT',
  nel: '{"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}',
  'ratelimit-limit': '100',
  'ratelimit-remaining': '100',
  'ratelimit-reset': '1',
  'report-to': '{"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=HaBritWShuJ0WuI6BBIxqiy5vmQfTgTZ%2FJvbH0ECuWWJkphRli8%2FNfjECA286d9vbiLRGdkYPm2cpeOU386f6NvIhLxyNl6AKnwfi4l1KRGg7aseLI%2FT2BQpvstr4HZws3%2FmF3EPla7uyIYEq4YUHpU%3D"}]}',
  server: 'cloudflare',
  'transfer-encoding': 'chunked',
  vary: '*',
  'x-cache': 'MISS',
  'x-cache-hits': '0',
  'x-railway-cdn-edge': 'fastly/cache-gru-sbsp2090035-GRU',
  'x-railway-edge': 'railway/us-west2',
  'x-railway-request-id': 'V_qlZB6DQsaxqI5H2prcFg',
  'x-served-by': 'cache-gru-sbsp2090035-GRU'
}
<<< Body: {
  "success": true,
  "data": {
    "id": "pix_char_wj3s3rUfgRLCQHXemeZwfWQ1",
    "amount": 100,
    "status": "PENDING",
    "devMode": true,
    "brCode": "00020101021126580014BR.GOV.BCB.PIX0136devmode-pix-pix_char_wj3s3rUfgRLCQHXemeZwfWQ152040000530398654061.005802BR5920AbacatePay DevMode6009Sao Paulo62070503***6304B14F",
    "brCodeBase64": "data:image/png;base64,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",
    "platformFee": 80,
    "createdAt": "2026-04-08T14:53:48.948Z",
    "updatedAt": "2026-04-08T14:53:48.948Z",
    "expiresAt": "2026-04-08T15:03:48.948Z",
    "metadata": {
      "externalId": "test-payment-uuid-123",
      "userId": "test-user-uuid-456",
      "creditsToDebit": 0
    }
  },
  "error": null
}

✅ Created PIX QR Code: pix_char_wj3s3rUfgRLCQHXemeZwfWQ1

🔵 STEP 2: Check status (expect PENDING)

============================================================
>>> GET https://api.abacatepay.com/v1/pixQrCode/check?id=pix_char_wj3s3rUfgRLCQHXemeZwfWQ1
<<< Status: 200
<<< Headers: {
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'Content-Type, Authorization, x-pdv-token',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'access-control-allow-origin': '*',
  'access-control-expose-headers': '*',
  'alt-svc': 'h3=":443"; ma=86400',
  'cf-cache-status': 'DYNAMIC',
  'cf-ray': '9e921a939d3b066a-GRU',
  connection: 'keep-alive',
  'content-encoding': 'br',
  'content-type': 'application/json',
  date: 'Wed, 08 Apr 2026 14:53:51 GMT',
  nel: '{"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}',
  'ratelimit-limit': '100',
  'ratelimit-remaining': '99',
  'ratelimit-reset': '1',
  'report-to': '{"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=OWLiNPGuVjbQJ%2FRHkNcEHswTjIK9ZIPAAmmxQQNKB0w2WPlb6SVG31VkixUOvjgMVbDbAH%2FaHwfv8FxM3KCbflJHGtwaZnYyd8bGJl4Rqf5rJY5QG4ZSjgQP5GO9jyXyuymHn3L9y2gvBANgoOcZzZI%3D"}]}',
  server: 'cloudflare',
  'transfer-encoding': 'chunked',
  vary: '*',
  'x-cache': 'MISS',
  'x-cache-hits': '0',
  'x-railway-cdn-edge': 'fastly/cache-gru-sbsp2090059-GRU',
  'x-railway-edge': 'railway/us-west2',
  'x-railway-request-id': 'd24nt3sZS6iSS2iUn6XIxQ',
  'x-served-by': 'cache-gru-sbsp2090059-GRU'
}
<<< Body: {
  "success": true,
  "data": {
    "id": "pix_char_wj3s3rUfgRLCQHXemeZwfWQ1",
    "amount": 100,
    "status": "PENDING",
    "devMode": true,
    "brCode": "00020101021126580014BR.GOV.BCB.PIX0136devmode-pix-pix_char_wj3s3rUfgRLCQHXemeZwfWQ152040000530398654061.005802BR5920AbacatePay DevMode6009Sao Paulo62070503***6304B14F",
    "brCodeBase64": "data:image/png;base64,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",
    "platformFee": 80,
    "createdAt": "2026-04-08T14:53:48.948Z",
    "updatedAt": "2026-04-08T14:53:48.948Z",
    "expiresAt": "2026-04-08T15:03:48.948Z",
    "metadata": {
      "externalId": "test-payment-uuid-123",
      "userId": "test-user-uuid-456",
      "creditsToDebit": 0
    }
  },
  "error": null
}

🔵 STEP 3: Simulate payment

============================================================
>>> POST https://api.abacatepay.com/v1/pixQrCode/simulate-payment?id=pix_char_wj3s3rUfgRLCQHXemeZwfWQ1
>>> Body: {
  "metadata": {}
}
<<< Status: 200
<<< Headers: {
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'Content-Type, Authorization, x-pdv-token',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'access-control-allow-origin': '*',
  'access-control-expose-headers': '*',
  'alt-svc': 'h3=":443"; ma=86400',
  'cf-cache-status': 'DYNAMIC',
  'cf-ray': '9e921a9caba8066a-GRU',
  connection: 'keep-alive',
  'content-encoding': 'br',
  'content-type': 'application/json',
  date: 'Wed, 08 Apr 2026 14:53:53 GMT',
  nel: '{"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}',
  'ratelimit-limit': '100',
  'ratelimit-remaining': '99',
  'ratelimit-reset': '1',
  'report-to': '{"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=kPR9yIXbAHq8lcQntVBR9sQChDvsSYog%2FjCR%2FRiRmNrUJRMLdrzDrdvUl%2FUEgBjPUOOerzcaKir4vfHVL5cqcAh43LsubyZDsvqs74DAzmKJQoxh%2F6nImBStsomkJ%2F%2Fj5bQScKQqi4G1LH5ps2xa81A%3D"}]}',
  server: 'cloudflare',
  'transfer-encoding': 'chunked',
  vary: '*',
  'x-cache': 'MISS',
  'x-cache-hits': '0',
  'x-railway-cdn-edge': 'fastly/cache-gru-sbsp2090069-GRU',
  'x-railway-edge': 'railway/us-west2',
  'x-railway-request-id': '0BmgUodlTMy_6YFkn6XIxQ',
  'x-served-by': 'cache-gru-sbsp2090069-GRU'
}
<<< Body: {
  "success": true,
  "data": {
    "id": "pix_char_wj3s3rUfgRLCQHXemeZwfWQ1",
    "amount": 100,
    "status": "PAID",
    "devMode": true,
    "brCode": "00020101021126580014BR.GOV.BCB.PIX0136devmode-pix-pix_char_wj3s3rUfgRLCQHXemeZwfWQ152040000530398654061.005802BR5920AbacatePay DevMode6009Sao Paulo62070503***6304B14F",
    "brCodeBase64": "data:image/png;base64,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",
    "platformFee": 80,
    "createdAt": "2026-04-08T14:53:48.948Z",
    "updatedAt": "2026-04-08T14:53:48.948Z",
    "expiresAt": "2026-04-08T15:03:48.948Z",
    "metadata": {
      "externalId": "test-payment-uuid-123",
      "userId": "test-user-uuid-456",
      "creditsToDebit": 0
    }
  },
  "error": null
}

🔵 STEP 4: Check status (expect PAID)

============================================================
>>> GET https://api.abacatepay.com/v1/pixQrCode/check?id=pix_char_wj3s3rUfgRLCQHXemeZwfWQ1
<<< Status: 200
<<< Headers: {
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'Content-Type, Authorization, x-pdv-token',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'access-control-allow-origin': '*',
  'access-control-expose-headers': '*',
  'alt-svc': 'h3=":443"; ma=86400',
  'cf-cache-status': 'DYNAMIC',
  'cf-ray': '9e921aa9ee13066a-GRU',
  connection: 'keep-alive',
  'content-encoding': 'br',
  'content-type': 'application/json',
  date: 'Wed, 08 Apr 2026 14:53:55 GMT',
  nel: '{"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}',
  'ratelimit-limit': '100',
  'ratelimit-remaining': '99',
  'ratelimit-reset': '1',
  'report-to': '{"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=iDH4W78Hwp3XgsOR4WZwcCmek%2Fbf0syeTuQUgZzest90NgfUFW36RezBT0754JI%2BXg4y9VZXPy4Hvx3ZnP32ewtZe7rbiNdFMuN8E8M4j2oW7nef17EShBM7rGYBVNl1pn7CmZAbl2f1qZLcSclFF9I%3D"}]}',
  server: 'cloudflare',
  'transfer-encoding': 'chunked',
  vary: '*',
  'x-cache': 'MISS',
  'x-cache-hits': '0',
  'x-railway-cdn-edge': 'fastly/cache-gru-sbsp2090041-GRU',
  'x-railway-edge': 'railway/us-west2',
  'x-railway-request-id': 'YxFRXWcGQcusImdg2prcFg',
  'x-served-by': 'cache-gru-sbsp2090041-GRU'
}
<<< Body: {
  "success": true,
  "data": {
    "id": "pix_char_wj3s3rUfgRLCQHXemeZwfWQ1",
    "amount": 100,
    "status": "PAID",
    "devMode": true,
    "brCode": "00020101021126580014BR.GOV.BCB.PIX0136devmode-pix-pix_char_wj3s3rUfgRLCQHXemeZwfWQ152040000530398654061.005802BR5920AbacatePay DevMode6009Sao Paulo62070503***6304B14F",
    "brCodeBase64": "data:image/png;base64,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",
    "platformFee": 80,
    "createdAt": "2026-04-08T14:53:48.948Z",
    "updatedAt": "2026-04-08T14:53:48.948Z",
    "expiresAt": "2026-04-08T15:03:48.948Z",
    "metadata": {
      "externalId": "test-payment-uuid-123",
      "userId": "test-user-uuid-456",
      "creditsToDebit": 0
    }
  },
  "error": null
}

============================================================
Done! Now check your webhook.site URL for the webhook payload.
============================================================


---------

Result of the webhook:

{
  "id": "log_hzYP4haJXuhMt0sQrc0Rwy5T",
  "event": "billing.paid",
  "data": {
    "pixQrCode": {
      "id": "pix_char_yAmqdcd1qNzBdfDX5EJfZTPX",
      "amount": 100,
      "kind": "PIX",
      "status": "PAID",
      "metadata": {
        "externalId": "test-payment-uuid-123",
        "userId": "test-user-uuid-456",
        "creditsToDebit": 0
      }
    },
    "payment": {
      "amount": 100,
      "fee": 80,
      "method": "PIX"
    }
  },
  "devMode": true
}