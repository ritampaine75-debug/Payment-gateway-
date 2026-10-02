export interface ClientInfo {
  ip: string;
  browser: string;
  os: string;
  device: string;
  userAgent: string;
  screenResolution: string;
}

export async function fetchClientPublicIp(): Promise<string> {
  // Try api.ipify.org first as requested
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) return data.ip;
    }
  } catch (e) {
    // try fallback
  }

  // Fallback 1: ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) return data.ip;
    }
  } catch (e) {}

  // Fallback 2: icanhazip
  try {
    const res = await fetch('https://icanhazip.com/');
    if (res.ok) {
      const text = await res.text();
      if (text) return text.trim();
    }
  } catch (e) {}

  // Local/anonymized fallback identifier
  return '198.51.100.42 (Client IP)';
}

export function parseUserAgent(): Omit<ClientInfo, 'ip'> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let device = 'Desktop / Laptop';

  // Device Detection
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    device = /ipad|tablet/i.test(ua) ? 'Tablet' : 'Mobile Phone';
  }

  // OS Detection
  if (/windows nt 10.0/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android OS';
  else if (/iphone/i.test(ua)) os = 'iOS (iPhone)';
  else if (/ipad/i.test(ua)) os = 'iPadOS';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS (Apple Silicon / Intel)';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Browser Detection
  if (/edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/fampay/i.test(ua)) browser = 'FamPay WebView';
  else if (/phonepe/i.test(ua)) browser = 'PhonePe WebView';
  else if (/gpay|tez/i.test(ua)) browser = 'GPay In-App Browser';

  const screenResolution =
    typeof window !== 'undefined'
      ? `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio}x)`
      : '1920x1080';

  return {
    browser,
    os,
    device,
    userAgent: ua,
    screenResolution
  };
}

export async function getClientFullInfo(): Promise<ClientInfo> {
  const ip = await fetchClientPublicIp();
  const uaInfo = parseUserAgent();
  return {
    ip,
    ...uaInfo
  };
}
