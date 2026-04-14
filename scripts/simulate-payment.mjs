/**
 * Simulates an AbacatePay PIX payment in dev mode.
 *
 * Usage:
 *   node scripts/simulate-payment.mjs pix_char_xxx
 *
 * Requires ABACATEPAY_API_KEY in .env.local
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const pixId = process.argv[2];
if (!pixId) {
  console.error('Usage: node scripts/simulate-payment.mjs pix_char_xxx');
  process.exit(1);
}

const API_KEY = process.env.ABACATEPAY_API_KEY;
if (!API_KEY) {
  console.error('Missing ABACATEPAY_API_KEY in .env.local');
  process.exit(1);
}

const res = await fetch(`https://api.abacatepay.com/v1/pixQrCode/simulate-payment?id=${pixId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: '{}',
});

const data = await res.json().catch(() => null);

if (!res.ok) {
  console.error(`Failed (${res.status}):`, JSON.stringify(data));
  process.exit(1);
}

console.log(`Payment simulated for ${pixId}`);
