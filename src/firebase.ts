import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  update,
  onValue,
  off
} from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { PaymentSession, TelemetryEvent, PaymentStatus } from './types';

const firebaseConfig = {
  apiKey: 'AIzaSyCChxWVg-w1TiertkXlUrfUgcC19y-CPNw',
  authDomain: 'hiiii-72d78.firebaseapp.com',
  databaseURL: 'https://hiiii-72d78-default-rtdb.firebaseio.com',
  projectId: 'hiiii-72d78',
  storageBucket: 'hiiii-72d78.firebasestorage.app',
  messagingSenderId: '560685164053',
  appId: '1:560685164053:web:7f672f7503160ec868901c'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const db = getFirestore(app);
export const isFirebaseLive = true;

// -------------------------------------------------------------
// Cross-Tab & Local Realtime Relay Layer for zero-latency fallback
// -------------------------------------------------------------
const STORAGE_KEY_SESSIONS = 'dyn_upi_sessions_v1';
const BROADCAST_CHANNEL_NAME = 'dyn_upi_realtime_channel';

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    // fallback
  }
}

function getStoredSessions(): Record<string, Record<string, PaymentSession>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredSessions(data: Record<string, Record<string, PaymentSession>>) {
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(data));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'SYNC_SESSIONS', data });
    }
  } catch (e) {
    console.error('Failed to save session store', e);
  }
}

/**
 * Push or initialize a payment session in Firebase Realtime Database
 */
export async function savePaymentSession(session: PaymentSession): Promise<void> {
  // 1. Firebase RTDB
  try {
    const sessionRef = ref(rtdb, `sessions/${session.merchantId}/${session.sessionId}`);
    await set(sessionRef, session);
  } catch (err) {
    console.warn('Firebase RTDB savePaymentSession sync notice:', err);
  }

  // 2. Local & cross-tab sync
  const store = getStoredSessions();
  if (!store[session.merchantId]) {
    store[session.merchantId] = {};
  }
  store[session.merchantId][session.sessionId] = session;
  saveStoredSessions(store);
}

/**
 * Record a live telemetry event (from client payment page) to Firebase RTDB
 */
export async function recordTelemetryEvent(params: {
  merchantId: string;
  sessionId: string;
  event: TelemetryEvent;
}): Promise<void> {
  const { merchantId, sessionId, event } = params;

  // 1. Firebase RTDB
  try {
    const sessionRef = ref(rtdb, `sessions/${merchantId}/${sessionId}`);
    const telemetryRef = ref(rtdb, `telemetry/${merchantId}/${sessionId}/${event.id}`);
    
    await set(telemetryRef, event);
    await update(sessionRef, {
      lastEvent: event.status,
      lastEventTime: event.timestamp,
      ...(event.payerName ? { payerName: event.payerName } : {}),
      ...(event.ip ? { payerIp: event.ip } : {}),
      ...(event.os ? { payerOs: event.os } : {}),
      ...(event.browser ? { payerBrowser: event.browser } : {}),
      ...(event.device ? { payerDevice: event.device } : {})
    });
  } catch (err) {
    console.warn('Firebase RTDB recordTelemetryEvent notice:', err);
  }

  // 2. Local & cross-tab sync
  const store = getStoredSessions();
  if (store[merchantId] && store[merchantId][sessionId]) {
    const session = store[merchantId][sessionId];
    session.telemetryLogs = session.telemetryLogs || [];
    session.telemetryLogs.push(event);
    session.lastEvent = event.status;
    session.lastEventTime = event.timestamp;
    if (event.payerName) session.payerName = event.payerName;
    if (event.ip) session.payerIp = event.ip;
    if (event.os) session.payerOs = event.os;
    if (event.browser) session.payerBrowser = event.browser;
    if (event.device) session.payerDevice = event.device;
    saveStoredSessions(store);
  } else {
    if (!store[merchantId]) store[merchantId] = {};
    store[merchantId][sessionId] = {
      sessionId,
      merchantId,
      merchantName: 'Merchant',
      merchantUpi: 'merchant@upi',
      purpose: 'Payment',
      amount: 0,
      refCode: 'TRX-UNKNOWN',
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
      status: 'pending',
      token: '',
      payerName: event.payerName,
      payerIp: event.ip,
      payerOs: event.os,
      payerBrowser: event.browser,
      payerDevice: event.device,
      lastEvent: event.status,
      lastEventTime: event.timestamp,
      telemetryLogs: [event]
    };
    saveStoredSessions(store);
  }
}

/**
 * Update payment verification status in Firebase RTDB
 */
export async function updateSessionStatus(
  merchantId: string,
  sessionId: string,
  status: PaymentStatus
): Promise<void> {
  // 1. Firebase RTDB
  try {
    const sessionRef = ref(rtdb, `sessions/${merchantId}/${sessionId}`);
    await update(sessionRef, { status });
  } catch (err) {
    console.warn('Firebase RTDB updateSessionStatus notice:', err);
  }

  // 2. Local & cross-tab sync
  const store = getStoredSessions();
  if (store[merchantId] && store[merchantId][sessionId]) {
    store[merchantId][sessionId].status = status;
    saveStoredSessions(store);
  }
}

/**
 * Real-time listener for merchant telemetry & payment sessions via Firebase RTDB
 */
export function subscribeToMerchantSessions(
  merchantId: string,
  onUpdate: (sessions: PaymentSession[]) => void
): () => void {
  const notifyLocal = () => {
    const store = getStoredSessions();
    const merchantSessions = store[merchantId] ? Object.values(store[merchantId]) : [];
    merchantSessions.sort((a, b) => (b.lastEventTime || b.createdAt) - (a.lastEventTime || a.createdAt));
    onUpdate(merchantSessions);
  };

  notifyLocal();

  const handleBroadcast = (msg: MessageEvent) => {
    if (msg.data && msg.data.type === 'SYNC_SESSIONS') {
      notifyLocal();
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_SESSIONS) {
      notifyLocal();
    }
  };
  window.addEventListener('storage', handleStorage);

  // Firebase RTDB Realtime Listener
  let firebaseUnsub = () => {};
  try {
    const sessionsRef = ref(rtdb, `sessions/${merchantId}`);
    onValue(sessionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: PaymentSession[] = Object.values(val);
        list.sort((a, b) => (b.lastEventTime || b.createdAt) - (a.lastEventTime || a.createdAt));
        onUpdate(list);
      }
    });
    firebaseUnsub = () => off(sessionsRef);
  } catch (e) {
    console.warn('Firebase RTDB listener note:', e);
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('storage', handleStorage);
    firebaseUnsub();
  };
}

export default app;
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
};
