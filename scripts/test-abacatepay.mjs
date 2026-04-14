/**
 * Test script for AbacatePay PIX QR Code API (dev mode).
 *
 * Usage:
 *   node scripts/test-abacatepay.mjs
 *
 * Requires ABACATEPAY_API_KEY in .env.local
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const API_KEY = process.env.ABACATEPAY_API_KEY;
if (!API_KEY) {
  console.error('Missing ABACATEPAY_API_KEY in .env.local');
  process.exit(1);
}

const BASE_URL = 'https://api.abacatepay.com';
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

async function request(method, path, body) {
  const url = `${BASE_URL}${path}`;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`>>> ${method} ${url}`);
  if (body) console.log('>>> Body:', JSON.stringify(body, null, 2));

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  console.log(`<<< Status: ${res.status}`);
  console.log('<<< Headers:', Object.fromEntries(res.headers.entries()));
  console.log('<<< Body:', JSON.stringify(data, null, 2));
  return { status: res.status, data };
}

async function main() {
  // Step 1: Create PIX QR Code
  console.log('\n🔵 STEP 1: Create PIX QR Code');
  const createRes = await request('POST', '/v1/pixQrCode/create', {
    amount: 100, // R$1.00
    expiresIn: 600, // 10 minutes
    description: 'Eduh Pro Test',
    metadata: {
      externalId: 'test-payment-uuid-123',
      userId: 'test-user-uuid-456',
      creditsToDebit: 0,
    },
  });

  if (createRes.status !== 200) {
    console.error('Failed to create QR code. Aborting.');
    process.exit(1);
  }

  const pixId = createRes.data.data.id;
  console.log(`\n✅ Created PIX QR Code: ${pixId}`);

  // Step 2: Check status (should be PENDING)
  console.log('\n🔵 STEP 2: Check status (expect PENDING)');
  await request('GET', `/v1/pixQrCode/check?id=${pixId}`);

  // Step 3: Simulate payment
  console.log('\n🔵 STEP 3: Simulate payment');
  await request('POST', `/v1/pixQrCode/simulate-payment?id=${pixId}`, {
    metadata: {},
  });

  // Step 4: Check status again (should be PAID)
  console.log('\n🔵 STEP 4: Check status (expect PAID)');
  await request('GET', `/v1/pixQrCode/check?id=${pixId}`);

  console.log('\n' + '='.repeat(60));
  console.log('Done! Now check your webhook.site URL for the webhook payload.');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
