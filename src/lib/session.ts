
const secretKeyStr = process.env.AUTH_SECRET || 'fallback_secret_for_development_only_123';
const saltStr = process.env.AUTH_SALT || 'fallback_salt';

// Helper to get CryptoKey
async function getHmacKey() {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKeyStr),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// Hash a PIN 1-way
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + saltStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Compare hashed PIN
export async function verifyPin(pin: string, expectedHash: string): Promise<boolean> {
  const hashed = await hashPin(pin);
  // Prevent timing attacks using crypto.subtle.verify on HMAC would be ideal, 
  // but a simple string comparison is usually sufficient for a 4-digit PIN 
  // since the risk is brute-force, which we prevent via RateLimit.
  return hashed === expectedHash;
}

// Generate secure cookie token
export async function createSessionToken(role: 'user' | 'admin'): Promise<string> {
  const payload = JSON.stringify({ role, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 }); // 7 days
  const encodedPayload = encodeURIComponent(payload);
  
  const key = await getHmacKey();
  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(encodedPayload));
  
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${encodedPayload}.${signatureHex}`;
}

// Verify secure cookie token
export async function verifySessionToken(token: string): Promise<{ role: 'user' | 'admin' } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    
    const [encodedPayload, signatureHex] = parts;
    
    const key = await getHmacKey();
    const encoder = new TextEncoder();
    
    // Reconstruct Uint8Array from Hex
    const sigBytes = new Uint8Array(signatureHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(encodedPayload)
    );
    
    if (!isValid) return null;
    
    const payloadStr = decodeURIComponent(encodedPayload);
    const payload = JSON.parse(payloadStr);
    
    if (payload.exp < Date.now()) return null; // Expired
    
    return { role: payload.role };
  } catch (err) {
    return null;
  }
}
