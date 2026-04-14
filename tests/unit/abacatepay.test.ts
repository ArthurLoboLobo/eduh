import { describe, it, expect, vi, afterEach } from 'vitest';
import { createPixQrCode, checkPixQrCode, simulatePixPayment } from '@/lib/abacatepay';

function mockFetchResponse(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('abacateRequest (via createPixQrCode)', () => {
  it('should send correct method, URL, headers, body and unwrap data', async () => {
    process.env.ABACATEPAY_API_KEY = 'test_key_123';
    const mockFetch = mockFetchResponse(200, { data: { id: 'pix_char_1' }, error: null });
    vi.stubGlobal('fetch', mockFetch);

    const result = await createPixQrCode({
      amount: 100,
      expiresIn: 600,
      description: 'Test',
      metadata: { userId: 'u1' },
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.abacatepay.com/v1/pixQrCode/create');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer test_key_123',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    expect(JSON.parse(options.body)).toEqual({
      amount: 100,
      expiresIn: 600,
      description: 'Test',
      metadata: { userId: 'u1' },
    });
    expect(result).toEqual({ id: 'pix_char_1' });
  });

  it('should throw on HTTP error with status and body', async () => {
    const mockFetch = mockFetchResponse(400, { error: 'bad request' });
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      createPixQrCode({ amount: 100, expiresIn: 600 })
    ).rejects.toThrow(/400/);

    await expect(
      createPixQrCode({ amount: 100, expiresIn: 600 })
    ).rejects.toThrow(/bad request/);
  });

  it('should throw on 200 with error in body', async () => {
    const mockFetch = mockFetchResponse(200, { error: 'something', data: null });
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      createPixQrCode({ amount: 100, expiresIn: 600 })
    ).rejects.toThrow(/something/);
  });
});

describe('createPixQrCode', () => {
  it('should return the full expected shape and include all params in body', async () => {
    const responseData = {
      id: 'pix_char_42',
      brCode: 'br123',
      brCodeBase64: 'base64data',
      status: 'PENDING',
      expiresAt: '2026-04-08T12:00:00Z',
    };
    const mockFetch = mockFetchResponse(200, { data: responseData, error: null });
    vi.stubGlobal('fetch', mockFetch);

    const result = await createPixQrCode({
      amount: 2000,
      expiresIn: 600,
      description: 'Eduh Pro',
      metadata: { userId: 'u1', creditsToDebit: 0 },
    });

    expect(result).toEqual(responseData);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      amount: 2000,
      expiresIn: 600,
      description: 'Eduh Pro',
      metadata: { userId: 'u1', creditsToDebit: 0 },
    });
  });
});

describe('checkPixQrCode', () => {
  it('should send GET to correct URL and unwrap response', async () => {
    const responseData = {
      status: 'PENDING',
      expiresAt: '2026-04-08T12:00:00Z',
      id: 'pix_char_42',
      amount: 2000,
    };
    const mockFetch = mockFetchResponse(200, { data: responseData, error: null });
    vi.stubGlobal('fetch', mockFetch);

    const result = await checkPixQrCode('pix_char_42');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.abacatepay.com/v1/pixQrCode/check?id=pix_char_42');
    expect(options.method).toBe('GET');
    expect(options.body).toBeUndefined();
    expect(result).toEqual(responseData);
  });
});

describe('simulatePixPayment', () => {
  it('should send POST to correct URL and not throw on success', async () => {
    const mockFetch = mockFetchResponse(200, { data: { id: 'pix_char_42', status: 'PAID' }, error: null });
    vi.stubGlobal('fetch', mockFetch);

    const result = await simulatePixPayment('pix_char_42');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.abacatepay.com/v1/pixQrCode/simulate-payment?id=pix_char_42');
    expect(options.method).toBe('POST');
    expect(result).toBeUndefined();
  });
});
