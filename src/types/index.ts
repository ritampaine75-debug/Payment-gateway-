export type EventStatus =
  | 'Opened (No Interaction Yet)'
  | 'Identified'
  | 'Idle (No Action)'
  | 'Downloaded QR Code'
  | 'Clicked PhonePe'
  | 'Clicked Google Pay'
  | 'Clicked FamPay'
  | 'Clicked Paytm'
  | 'Clicked BHIM'
  | 'Clicked CRED'
  | 'Clicked Generic UPI'
  | 'Payment Verified (Paid)'
  | 'Marked as Paid by User'
  | 'Session Expired';

export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'flagged';

export interface TelemetryEvent {
  id: string;
  sessionId: string;
  timestamp: number;
  status: EventStatus;
  payerName?: string;
  ip?: string;
  os?: string;
  browser?: string;
  device?: string;
  details?: string;
}

export interface PaymentSession {
  sessionId: string;
  merchantId: string;
  merchantName: string;
  merchantUpi: string;
  purpose: string;
  amount: number;
  refCode: string; // 10-digit alphanumeric transaction note (e.g., TRX-94829104)
  createdAt: number;
  expiresAt: number;
  status: PaymentStatus;
  token: string;
  payerName?: string;
  payerIp?: string;
  payerOs?: string;
  payerBrowser?: string;
  payerDevice?: string;
  lastEvent?: EventStatus;
  lastEventTime?: number;
  telemetryLogs: TelemetryEvent[];
  isTampered?: boolean;
}

export interface MerchantProfile {
  uid: string;
  email: string;
  businessName: string;
  upiId: string;
  secretKey: string;
  defaultAmount?: number;
  createdAt: number;
}

export interface SecurityTokenPayload {
  sid: string;       // Session ID
  mid: string;       // Merchant UID
  pn: string;        // Payee Name (Merchant)
  pa: string;        // Payee Address (UPI ID)
  am: number;        // Amount in INR
  pu: string;        // Purpose / Item Name
  tn: string;        // 10-digit transaction reference note
  ts: number;        // Timestamp created (epoch ms)
  exp: number;       // Expiry timestamp (epoch ms)
  sig: string;       // HMAC-SHA256 Checksum Signature
}

export interface TokenValidationResult {
  valid: boolean;
  error?: string;
  payload?: SecurityTokenPayload;
  rawPayload?: any;
  calculatedSignature?: string;
  providedSignature?: string;
}
