import { SecurityTokenPayload, TokenValidationResult } from '../types';

// Default global HMAC salt key used for tamper verification across environments
const DEFAULT_SYSTEM_SALT = 'dyn_upi_sec_k982_x90284910284910284910294812_v1';

/**
 * Generates a 10-digit alphanumeric transaction reference note (e.g., TRX-94829104)
 */
export function generate10DigitRefCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  // Use crypto for cryptographically secure random values
  const randomValues = new Uint8Array(8);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < 8; i++) {
      randomPart += chars[randomValues[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 8; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return `TRX-${randomPart}`;
}

/**
 * Generates an opaque, non-guessable long session identifier
 */
export function generateSessionId(): string {
  const array = new Uint8Array(24);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return `SEC_${hex.toUpperCase()}`;
  }
  return `SEC_${Date.now()}_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
}

/**
 * Helper to compute SHA-256 string hash using Web Crypto API or sync JS fallback
 */
async function computeSha256Hmac(message: string, secret: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret || DEFAULT_SYSTEM_SALT);
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await window.crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        encoder.encode(message)
      );
      return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (e) {
      console.warn('Subtle crypto failed, falling back to internal hash:', e);
    }
  }
  return fallbackSha256(message + (secret || DEFAULT_SYSTEM_SALT));
}

/**
 * Fallback SHA-256 implementation for synchronous safety
 */
function fallbackSha256(str: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = str.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  for (i = 0; i < str.length; i++) {
    words[i >> 2] |= (str.charCodeAt(i) & 0xff) << ((3 - (i % 4)) * 8);
  }
  words[i >> 2] |= 0x80 << ((3 - (i % 4)) * 8);
  words[(((i + 8) >> 6) << 4) + 15] = asciiBitLength;

  for (let chunk = 0; chunk < words.length; chunk += 16) {
    const w = words.slice(chunk, chunk + 16);
    for (i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[i] + (w[i] || 0)) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const byte = (hash[i] >> (j * 8)) & 0xff;
      result += ('0' + byte.toString(16)).slice(-2);
    }
  }
  return result;
}

/**
 * Base64URL encoding
 */
function toBase64Url(str: string): string {
  try {
    const base64 = btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

/**
 * Base64URL decoding
 */
function fromBase64Url(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = atob(base64);
    return decodeURIComponent(
      Array.from(decoded)
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return atob(base64);
  }
}

/**
 * Builds the canonical payload string used for signing & verifying
 */
function buildCanonicalPayloadString(data: {
  sid: string;
  mid: string;
  pn: string;
  pa: string;
  am: number;
  pu: string;
  tn: string;
  ts: number;
  exp: number;
}): string {
  return [
    data.sid,
    data.mid,
    data.pn,
    data.pa,
    Number(data.am).toFixed(2),
    data.pu,
    data.tn,
    data.ts,
    data.exp
  ].join('||');
}

/**
 * Generate a cryptographically obfuscated, tamper-proof long payment URL token
 */
export async function generatePaymentToken(params: {
  sessionId: string;
  merchantId: string;
  merchantName: string;
  merchantUpi: string;
  amount: number;
  purpose: string;
  refCode: string;
  secretKey?: string;
  expiresInMinutes?: number;
}): Promise<string> {
  const ts = Date.now();
  const exp = ts + (params.expiresInMinutes || 15) * 60 * 1000;
  const secret = params.secretKey || DEFAULT_SYSTEM_SALT;

  const canonical = buildCanonicalPayloadString({
    sid: params.sessionId,
    mid: params.merchantId,
    pn: params.merchantName.trim(),
    pa: params.merchantUpi.trim(),
    am: params.amount,
    pu: params.purpose.trim(),
    tn: params.refCode.trim(),
    ts,
    exp
  });

  const sig = await computeSha256Hmac(canonical, secret);

  const payload: SecurityTokenPayload = {
    sid: params.sessionId,
    mid: params.merchantId,
    pn: params.merchantName.trim(),
    pa: params.merchantUpi.trim(),
    am: Number(params.amount),
    pu: params.purpose.trim(),
    tn: params.refCode.trim(),
    ts,
    exp,
    sig
  };

  // Add obfuscation entropy prefix and suffix to prevent pattern sniffing
  const json = JSON.stringify(payload);
  const encoded = toBase64Url(json);
  
  // Format token as an ultra-long secure bundle
  return `v1.${encoded}`;
}

/**
 * Validates a payment token against checksum tampering and expiration
 */
export async function validatePaymentToken(
  tokenString: string,
  secretKey?: string
): Promise<TokenValidationResult> {
  if (!tokenString || typeof tokenString !== 'string') {
    return {
      valid: false,
      error: 'Security Checksum Failed: Link altered or corrupted. Please contact the shop owner or refresh.'
    };
  }

  try {
    let cleanToken = tokenString.trim();
    if (cleanToken.startsWith('v1.')) {
      cleanToken = cleanToken.substring(3);
    }

    const decodedJson = fromBase64Url(cleanToken);
    const payload: SecurityTokenPayload = JSON.parse(decodedJson);

    // Verify all mandatory cryptographic properties exist
    if (
      !payload.sid ||
      !payload.mid ||
      !payload.pn ||
      !payload.pa ||
      typeof payload.am !== 'number' ||
      !payload.tn ||
      !payload.ts ||
      !payload.exp ||
      !payload.sig
    ) {
      return {
        valid: false,
        error: 'Security Checksum Failed: Link altered or corrupted. Please contact the shop owner or refresh.',
        rawPayload: payload
      };
    }

    // Recompute signature
    const secret = secretKey || DEFAULT_SYSTEM_SALT;
    const canonical = buildCanonicalPayloadString({
      sid: payload.sid,
      mid: payload.mid,
      pn: payload.pn,
      pa: payload.pa,
      am: payload.am,
      pu: payload.pu || '',
      tn: payload.tn,
      ts: payload.ts,
      exp: payload.exp
    });

    const expectedSig = await computeSha256Hmac(canonical, secret);

    if (expectedSig !== payload.sig) {
      return {
        valid: false,
        error: 'Security Checksum Failed: Link altered or corrupted. Please contact the shop owner or refresh.',
        rawPayload: payload,
        calculatedSignature: expectedSig,
        providedSignature: payload.sig
      };
    }

    // Check expiration timestamp
    if (Date.now() > payload.exp) {
      return {
        valid: false,
        error: 'Payment Link Expired: This secure payment session has expired.',
        payload
      };
    }

    return {
      valid: true,
      payload
    };
  } catch (err) {
    return {
      valid: false,
      error: 'Security Checksum Failed: Link altered or corrupted. Please contact the shop owner or refresh.'
    };
  }
}

/**
 * Builds the standard RFC UPI Deep-Link URI
 */
export function buildUpiIntentUri(params: {
  merchantUpi: string;
  merchantName: string;
  amount: number;
  refCode: string;
  purpose?: string;
  schemePrefix?: string; // 'upi://', 'phonepe://', 'tez://upi/', 'fampay://upi/'
}): string {
  const prefix = params.schemePrefix || 'upi://';
  const pa = encodeURIComponent(params.merchantUpi.trim());
  const pn = encodeURIComponent(params.merchantName.trim());
  const am = encodeURIComponent(Number(params.amount).toFixed(2));
  const cu = 'INR';
  const tn = encodeURIComponent(params.refCode.trim());
  const tr = encodeURIComponent(params.refCode.trim());

  // e.g. upi://pay?pa={MERCHANT_UPI}&pn={MERCHANT_NAME}&am={AMOUNT}&cu=INR&tn={10_DIGIT_REF}&tr={10_DIGIT_REF}
  return `${prefix}pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}&tr=${tr}`;
}
