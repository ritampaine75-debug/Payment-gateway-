import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Download,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  Lock,
  QrCode,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Info,
  CheckCircle2,
  ArrowRight,
  User,
  Zap,
  HelpCircle
} from 'lucide-react';
import { validatePaymentToken, buildUpiIntentUri } from '../utils/security';
import { recordTelemetryEvent, savePaymentSession } from '../firebase';
import { getClientFullInfo, ClientInfo } from '../utils/userAgent';
import { SecurityTokenPayload, EventStatus } from '../types';

export const PaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [tokenString, setTokenString] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SecurityTokenPayload | null>(null);
  
  // Payer Identification Step
  const [payerName, setPayerName] = useState<string>('');
  const [isIdentified, setIsIdentified] = useState<boolean>(false);
  const [identificationError, setIdentificationError] = useState<string>('');

  // Client Info & Telemetry
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const telemetryLoggedRef = useRef<boolean>(false);

  // 120-second (2 minutes) Countdown Timer
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // UI helpers
  const [copiedRef, setCopiedRef] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [paidConfirmed, setPaidConfirmed] = useState<boolean>(false);
  const [showSimulateTamper, setShowSimulateTamper] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'apps'>('qr');
  const [lastActionStatus, setLastActionStatus] = useState<string>('');

  // Extract token from query param (support ?token=... or direct hash)
  useEffect(() => {
    let token = searchParams.get('token');
    if (!token && window.location.hash.includes('token=')) {
      const parts = window.location.hash.split('token=');
      if (parts[1]) token = parts[1].split('&')[0];
    }
    if (token) {
      setTokenString(token);
    } else {
      setIsValidating(false);
      setValidationError(
        'Security Checksum Failed: Link altered or corrupted. Please contact the shop owner or refresh.'
      );
    }
  }, [searchParams]);

  // Validate Token & Cryptographic Checksum
  useEffect(() => {
    if (!tokenString) return;

    let isMounted = true;
    async function verify() {
      setIsValidating(true);
      const res = await validatePaymentToken(tokenString);

      if (!isMounted) return;

      if (!res.valid || !res.payload) {
        setValidationError(
          res.error ||
            'Security Checksum Failed: Link altered or corrupted. Please contact the shop owner or refresh.'
        );
        setIsValidating(false);
      } else {
        setValidationError(null);
        setPayload(res.payload);
        setIsValidating(false);
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [tokenString]);

  // Fetch client public IP and log initial "Opened (No Interaction Yet)" Telemetry
  useEffect(() => {
    if (!payload || telemetryLoggedRef.current) return;
    telemetryLoggedRef.current = true;

    async function initTelemetry() {
      if (!payload) return;
      const info = await getClientFullInfo();
      setClientInfo(info);

      const eventId = `EVT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = Date.now();

      await recordTelemetryEvent({
        merchantId: payload.mid,
        sessionId: payload.sid,
        event: {
          id: eventId,
          sessionId: payload.sid,
          timestamp,
          status: 'Opened (No Interaction Yet)',
          ip: info.ip,
          os: info.os,
          browser: info.browser,
          device: info.device,
          details: `Opened link on ${info.browser} / ${info.os}`
        }
      });
    }

    initTelemetry();
  }, [payload]);

  // 120-Second Countdown Timer
  useEffect(() => {
    if (!payload || isExpired) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          // Log session expired to telemetry
          if (payload) {
            recordTelemetryEvent({
              merchantId: payload.mid,
              sessionId: payload.sid,
              event: {
                id: `EVT_EXP_${Date.now()}`,
                sessionId: payload.sid,
                timestamp: Date.now(),
                status: 'Session Expired',
                payerName: payerName || 'Guest Payer',
                ip: clientInfo?.ip,
                os: clientInfo?.os,
                browser: clientInfo?.browser,
                device: clientInfo?.device,
                details: '120-second dynamic payment window expired'
              }
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [payload, isExpired, payerName, clientInfo]);

  // Handle Payer Identification Submission
  const handleIdentifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerName.trim() || payerName.trim().length < 2) {
      setIdentificationError('Please enter your valid name to proceed with payment.');
      return;
    }
    setIdentificationError('');
    setIsIdentified(true);

    if (payload) {
      const eventId = `EVT_ID_${Date.now()}`;
      await recordTelemetryEvent({
        merchantId: payload.mid,
        sessionId: payload.sid,
        event: {
          id: eventId,
          sessionId: payload.sid,
          timestamp: Date.now(),
          status: 'Identified',
          payerName: payerName.trim(),
          ip: clientInfo?.ip,
          os: clientInfo?.os,
          browser: clientInfo?.browser,
          device: clientInfo?.device,
          details: `Payer identified as "${payerName.trim()}"`
        }
      });
    }
  };

  // Log App / Action click to Firebase Realtime Database
  const handleAppClick = async (
    status: EventStatus,
    schemePrefix: string,
    appName: string
  ) => {
    if (!payload || isExpired) return;

    setLastActionStatus(`Opening ${appName}...`);
    setTimeout(() => setLastActionStatus(''), 3500);

    // Build intent URI
    const uri = buildUpiIntentUri({
      merchantUpi: payload.pa,
      merchantName: payload.pn,
      amount: payload.am,
      refCode: payload.tn,
      purpose: payload.pu,
      schemePrefix
    });

    // 1. Immediately log to Firebase RTDB
    await recordTelemetryEvent({
      merchantId: payload.mid,
      sessionId: payload.sid,
      event: {
        id: `EVT_CLICK_${Date.now()}`,
        sessionId: payload.sid,
        timestamp: Date.now(),
        status,
        payerName: payerName || 'Guest Payer',
        ip: clientInfo?.ip,
        os: clientInfo?.os,
        browser: clientInfo?.browser,
        device: clientInfo?.device,
        details: `Initiated intent via ${appName}`
      }
    });

    // 2. Trigger browser intent URL
    window.location.href = uri;
  };

  // Download High-Res QR Code Card
  const handleDownloadQr = async () => {
    if (!payload || isExpired) return;

    // Log telemetry
    await recordTelemetryEvent({
      merchantId: payload.mid,
      sessionId: payload.sid,
      event: {
        id: `EVT_QR_DL_${Date.now()}`,
        sessionId: payload.sid,
        timestamp: Date.now(),
        status: 'Downloaded QR Code',
        payerName: payerName || 'Guest Payer',
        ip: clientInfo?.ip,
        os: clientInfo?.os,
        browser: clientInfo?.browser,
        device: clientInfo?.device,
        details: 'Downloaded QR code voucher PNG'
      }
    });

    // Create canvas snapshot of QR Code
    const svgElement = document.getElementById('secure-upi-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 800;
    canvas.height = 950;

    img.onload = () => {
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 950);

      // Header Banner
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 800, 160);

      // Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(payload.pn, 400, 70);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '22px monospace';
      ctx.fillText(`UPI: ${payload.pa}`, 400, 115);

      // Draw QR Code
      ctx.drawImage(img, 150, 200, 500, 500);

      // Amount Box
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.roundRect(100, 730, 600, 160, 20);
      ctx.fill();
      ctx.stroke();

      // Amount Text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(`₹${payload.am.toFixed(2)}`, 400, 785);

      // 10-Digit Ref Note
      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`Ref Note: ${payload.tn}`, 400, 830);

      ctx.fillStyle = '#64748b';
      ctx.font = '16px sans-serif';
      ctx.fillText('Scan with GPay, PhonePe, Paytm, BHIM, or any UPI App', 400, 865);

      const link = document.createElement('a');
      link.download = `UPI-Payment-${payload.tn}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Copy 10-digit Transaction Note
  const handleCopyRef = () => {
    if (!payload) return;
    navigator.clipboard.writeText(payload.tn);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Copy UPI ID
  const handleCopyUpi = () => {
    if (!payload) return;
    navigator.clipboard.writeText(payload.pa);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Payer marks as paid
  const handleMarkAsPaid = async () => {
    if (!payload) return;
    setPaidConfirmed(true);

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    await recordTelemetryEvent({
      merchantId: payload.mid,
      sessionId: payload.sid,
      event: {
        id: `EVT_PAID_${Date.now()}`,
        sessionId: payload.sid,
        timestamp: Date.now(),
        status: 'Marked as Paid by User',
        payerName: payerName || 'Guest Payer',
        ip: clientInfo?.ip,
        os: clientInfo?.os,
        browser: clientInfo?.browser,
        device: clientInfo?.device,
        details: `Payer confirmed completion for Ref ${payload.tn}`
      }
    });
  };

  // Format timer string MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // 1. TAMPER / CHECKSUM FAILURE VIEW
  // -------------------------------------------------------------
  if (validationError && !isValidating) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 selection:bg-rose-500 selection:text-white">
        <div className="w-full max-w-xl bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/40 relative overflow-hidden backdrop-blur-xl">
          {/* Top glowing bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500"></div>

          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Cryptographic Tamper Protection
              </h1>
              <p className="text-xs sm:text-sm text-rose-400 font-mono">
                HMAC-SHA256 CHECKSUM_VERIFICATION_FAILED
              </p>
            </div>
          </div>

          <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 sm:p-5 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200 text-sm sm:text-base leading-relaxed">
                  Security Checksum Failed: Link altered or corrupted. Please contact the shop owner or refresh.
                </p>
                <p className="text-xs text-rose-300/80 mt-2">
                  The URL token integrity check detected modified parameters, an altered amount, invalid signature, or bit-level URL tampering.
                </p>
              </div>
            </div>
          </div>

          {/* Security Diagnostic Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-6 font-mono text-xs text-slate-400 space-y-2">
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-500">Security Layer:</span>
              <span className="text-emerald-400 font-semibold">HMAC-SHA256 Anti-Bypass Guard</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-500">Payload Status:</span>
              <span className="text-rose-400 font-semibold">SIG_MISMATCH / CORRUPTED_TOKEN</span>
            </div>
            <div className="break-all pt-1 text-[11px] text-slate-500">
              <span className="text-slate-400">Raw Token: </span>
              {tokenString ? `${tokenString.substring(0, 48)}...` : 'NONE'}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition-all shadow-lg shadow-rose-900/30 active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry / Refresh Link</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all border border-slate-700"
            >
              <span>Return to Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. LOADING STATE
  // -------------------------------------------------------------
  if (isValidating || !payload) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="font-mono text-sm text-slate-400 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Verifying HMAC-SHA256 Checksum & Opening Live Telemetry...</span>
          </p>
        </div>
      </div>
    );
  }

  const upiUniversalUri = buildUpiIntentUri({
    merchantUpi: payload.pa,
    merchantName: payload.pn,
    amount: payload.am,
    refCode: payload.tn,
    purpose: payload.pu,
    schemePrefix: 'upi://'
  });

  // -------------------------------------------------------------
  // 3. STEP 1 - PAYER IDENTIFICATION MODAL
  // -------------------------------------------------------------
  if (!isIdentified) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 selection:bg-indigo-500 selection:text-white">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/30 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

          {/* Merchant Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white">{payload.pn}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Payment for <span className="text-slate-200 font-semibold">{payload.pu || 'Order'}</span>
            </p>
            <div className="mt-3 inline-block px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-300 font-bold text-lg">
              ₹{payload.am.toFixed(2)}
            </div>
          </div>

          <form onSubmit={handleIdentifySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <User className="w-4 h-4 text-indigo-400" />
                <span>Step 1 of 2: Payer Full Name</span>
              </label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
                autoFocus
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              />
              {identificationError && (
                <p className="text-xs text-rose-400 mt-1.5">{identificationError}</p>
              )}
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-[11px] text-slate-400 flex items-start space-x-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Your name will be transmitted directly to the merchant's live ledger with dynamic transaction reference <strong className="text-slate-200 font-mono">{payload.tn}</strong>.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-900/30 active:scale-[0.99] cursor-pointer"
            >
              <span>Proceed to UPI Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 4. STEP 2 - MAIN ACTIVE PAYMENT INTERFACE
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-6 selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between py-2 border-b border-slate-800/80 mb-4 sm:mb-6">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
            UPI
          </div>
          <div>
            <span className="font-bold text-sm text-white tracking-tight">Dynamic UPI Gateway</span>
            <span className="hidden sm:inline-block ml-2 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Anti-Bypass Verified
            </span>
          </div>
        </div>

        {/* Live 120s Timer Badge */}
        <div
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold transition-all ${
            isExpired
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
              : timeLeft < 30
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 animate-pulse'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{isExpired ? 'EXPIRED' : formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-xl mx-auto flex-1 flex flex-col justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-indigo-950/40 relative overflow-hidden backdrop-blur-xl">
          {/* Top Progress Bar for Timer */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
            <div
              className={`h-full transition-all duration-1000 ${
                isExpired
                  ? 'bg-rose-500'
                  : timeLeft < 30
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500'
              }`}
              style={{ width: `${(timeLeft / 120) * 100}%` }}
            />
          </div>

          {/* Expired Overlay Banner */}
          {isExpired ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Payment Session Expired</h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                The 2-minute dynamic transaction security window has elapsed. All payment triggers and deep-links have been deactivated to prevent unauthorized duplicate debits.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center space-x-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Request New Session</span>
              </button>
            </div>
          ) : paidConfirmed ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Payment Transmitted!</h2>
              <p className="text-sm text-slate-400 mb-4">
                Your payment notice for Ref <strong className="text-emerald-400 font-mono">{payload.tn}</strong> has been sent to <span className="text-white font-semibold">{payload.pn}</span>.
              </p>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left font-mono text-xs text-slate-300 space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-500">Merchant UPI:</span>
                  <span className="text-white">{payload.pa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="text-emerald-400 font-bold">₹{payload.am.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">10-Digit Note:</span>
                  <span className="text-indigo-400 font-bold">{payload.tn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payer Name:</span>
                  <span className="text-slate-300">{payerName}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                You may now close this page or return to your merchant.
              </p>
            </div>
          ) : (
            <>
              {/* Merchant Details Card */}
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-5 mb-5">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      Paying To
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                      VERIFIED
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-white mt-0.5">{payload.pn}</h1>
                  <p className="text-xs text-slate-400 flex items-center space-x-1.5 mt-0.5">
                    <span>{payload.pa}</span>
                    <button
                      onClick={handleCopyUpi}
                      className="text-slate-500 hover:text-slate-300 transition-colors"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
                    Amount
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    ₹{payload.am.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">INR • Zero Surcharge</span>
                </div>
              </div>

              {/* 10-Digit Transaction Reference Notice Banner */}
              <div className="bg-gradient-to-r from-indigo-950/60 to-blue-950/60 border border-indigo-500/40 rounded-2xl p-4 mb-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-indigo-300 font-bold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Mandatory Transaction Note</span>
                  </span>
                  <button
                    onClick={handleCopyRef}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 text-xs font-mono transition-all border border-indigo-500/30 active:scale-95 cursor-pointer"
                  >
                    {copiedRef ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="font-mono text-xl sm:text-2xl font-black text-white tracking-widest bg-slate-950/80 px-3 py-2 rounded-xl border border-indigo-500/30 text-center select-all">
                  {payload.tn}
                </div>

                <p className="text-[11px] text-indigo-200/80 mt-2 text-center font-medium">
                  ⚠️ <span className="underline">Ensure this 10-digit note appears in your UPI app message before sending.</span>
                </p>
              </div>

              {/* Method Switcher Tabs: QR Code vs Direct UPI Apps */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-5">
                <button
                  onClick={() => setActiveTab('qr')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    activeTab === 'qr'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Scan Dynamic QR</span>
                </button>
                <button
                  onClick={() => setActiveTab('apps')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    activeTab === 'apps'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Pay via UPI App</span>
                </button>
              </div>

              {/* TAB 1: DYNAMIC QR CODE */}
              {activeTab === 'qr' && (
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-white rounded-3xl shadow-xl relative border-4 border-indigo-500/20 mb-4 group transition-transform">
                    <QRCodeSVG
                      id="secure-upi-qr-svg"
                      value={upiUniversalUri}
                      size={220}
                      level="H"
                      includeMargin={false}
                    />
                    {/* Small center watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 bg-slate-900 rounded-xl border-2 border-white flex items-center justify-center text-indigo-400 font-bold text-xs shadow-lg">
                        ₹
                      </div>
                    </div>
                  </div>

                  <div className="w-full flex flex-col sm:flex-row gap-2.5 mb-4">
                    <button
                      onClick={handleDownloadQr}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs sm:text-sm flex items-center justify-center space-x-2 border border-slate-700 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-indigo-400" />
                      <span>Download QR Voucher (PNG)</span>
                    </button>
                    <button
                      onClick={() => handleAppClick('Clicked Generic UPI', 'upi://', 'Generic UPI')}
                      className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Launch UPI App</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 text-center">
                    Compatible with Google Pay, PhonePe, Paytm, BHIM, Cred, FamPay, Amazon Pay & 150+ Indian Bank Apps.
                  </p>
                </div>
              )}

              {/* TAB 2: DIRECT UPI APP DEEP LINKS */}
              {activeTab === 'apps' && (
                <div className="space-y-2.5 mb-5">
                  <p className="text-xs text-slate-400 text-center mb-3">
                    Click your preferred UPI app below to trigger seamless direct payment intent:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* PhonePe */}
                    <button
                      onClick={() => handleAppClick('Clicked PhonePe', 'phonepe://', 'PhonePe')}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-purple-950/40 border border-purple-500/30 text-left transition-all active:scale-[0.98] cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          Pe
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-white group-hover:text-purple-300">
                            PhonePe
                          </div>
                          <div className="text-[10px] text-slate-400">Direct App Intent</div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Google Pay */}
                    <button
                      onClick={() => handleAppClick('Clicked Google Pay', 'tez://upi/', 'Google Pay')}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-blue-950/40 border border-blue-500/30 text-left transition-all active:scale-[0.98] cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          G
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-white group-hover:text-blue-300">
                            Google Pay
                          </div>
                          <div className="text-[10px] text-slate-400">tez:// UPI Intent</div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* FamPay */}
                    <button
                      onClick={() => handleAppClick('Clicked FamPay', 'fampay://upi/', 'FamPay')}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-amber-950/40 border border-amber-500/30 text-left transition-all active:scale-[0.98] cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold text-sm shadow-md">
                          Fam
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-white group-hover:text-amber-300">
                            FamPay
                          </div>
                          <div className="text-[10px] text-slate-400">Gen-Z UPI Fast-lane</div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Generic / All UPI Apps */}
                    <button
                      onClick={() => handleAppClick('Clicked Generic UPI', 'upi://', 'Any UPI App')}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-emerald-950/40 border border-emerald-500/30 text-left transition-all active:scale-[0.98] cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          UPI
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-white group-hover:text-emerald-300">
                            Any Other App
                          </div>
                          <div className="text-[10px] text-slate-400">Paytm, BHIM, CRED</div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {lastActionStatus && (
                <div className="mb-4 text-center text-xs font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 py-1.5 px-3 rounded-xl animate-fade-in">
                  {lastActionStatus}
                </div>
              )}

              {/* Bottom Confirmation Bar */}
              <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-left">
                  <div className="text-xs text-slate-300 font-medium">Already completed transfer?</div>
                  <div className="text-[11px] text-slate-500">Notify the merchant ledger instantly.</div>
                </div>
                <button
                  onClick={handleMarkAsPaid}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-emerald-950/40 active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I Have Paid ₹{payload.am.toFixed(2)}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Security & Anti-Bypass Diagnostics Footer */}
        <div className="mt-4 text-center space-y-2">
          <div className="inline-flex items-center space-x-2 text-[11px] text-slate-500 bg-slate-900/60 border border-slate-800/80 px-3 py-1 rounded-full">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Cryptographically Bound: Session ID {payload.sid.substring(0, 16)}...</span>
          </div>

          <div className="flex items-center justify-center space-x-4 text-xs text-slate-500">
            <button
              onClick={() => setShowSimulateTamper(!showSimulateTamper)}
              className="hover:text-indigo-400 underline transition-colors cursor-pointer"
            >
              {showSimulateTamper ? 'Hide Security Test Lab' : 'Test Tamper-Proof Defense'}
            </button>
          </div>

          {/* Tamper Test Lab Simulator */}
          {showSimulateTamper && (
            <div className="mt-3 p-4 bg-slate-900 border border-indigo-500/30 rounded-2xl text-left text-xs space-y-2 animate-fade-in">
              <div className="font-bold text-indigo-300 flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>Simulate URL Tampering / Parameter Forgery</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Click below to modify 1 character in the cryptographic token (simulating an attacker changing the amount or UPI ID in the URL):
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => {
                    const altered = tokenString.slice(0, -4) + 'XXXX';
                    navigate(`/pay?token=${altered}`);
                    window.location.reload();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-mono cursor-pointer"
                >
                  Corrupt Checksum Bytes & Reload
                </button>
                <button
                  onClick={() => {
                    navigate(`/pay?token=invalid_forged_token_test`);
                    window.location.reload();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-mono cursor-pointer"
                >
                  Inject Forged Token
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-xl mx-auto text-center py-3 text-[11px] text-slate-600">
        Dynamic UPI Gateway • End-to-End HMAC-SHA256 Protected • Direct-to-VPA Surcharge-Free
      </footer>
    </div>
  );
};
