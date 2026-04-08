const BASE_URL = 'https://api.abacatepay.com';

const headers = () => ({
  'Authorization': `Bearer ${process.env.ABACATEPAY_API_KEY}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

async function abacateRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`AbacatePay ${method} ${path} failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.data;
}

export async function createPixQrCode(params: {
  amount: number;
  expiresIn: number;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<{
  id: string;
  brCode: string;
  brCodeBase64: string;
  status: string;
  expiresAt: string;
}> {
  return abacateRequest('POST', '/v1/pixQrCode/create', params);
}

export async function checkPixQrCode(id: string): Promise<{
  status: string;
  expiresAt: string;
  id: string;
  amount: number;
}> {
  return abacateRequest('GET', `/v1/pixQrCode/check?id=${id}`);
}

export async function simulatePixPayment(id: string): Promise<void> {
  await abacateRequest('POST', `/v1/pixQrCode/simulate-payment?id=${id}`, {});
}
