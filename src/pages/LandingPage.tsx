import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
  Sparkles,
  Lock,
  Smartphone,
  CheckCircle2,
  ExternalLink,
  Code2,
  ShieldAlert,
  Server,
  Layers,
  ChevronRight,
  Terminal,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { generatePaymentToken, generateSessionId, generate10DigitRefCode } from '../utils/security';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [demoAmount, setDemoAmount] = useState<number>(499);
  const [demoPurpose, setDemoPurpose] = useState<string>('Pro SaaS License (1 Year)');
  const [demoToken, setDemoToken] = useState<string>('');
  const [demoRef, setDemoRef] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleCreateLiveDemo = async () => {
    const sid = generateSessionId();
    const refCode = generate10DigitRefCode();
    const token = await generatePaymentToken({
      sessionId: sid,
      merchantId: 'DEMO_MERCHANT_APEX',
      merchantName: 'Apex Cloud & Digital Store',
      merchantUpi: 'apexcloud@okhdfcbank',
      amount: demoAmount,
      purpose: demoPurpose,
      refCode,
      expiresInMinutes: 15
    });

    setDemoToken(token);
    setDemoRef(refCode);
    navigate(`/pay?token=${token}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/20">
              UPI
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                Dynamic UPI Gateway
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/30">
                v1.0 Production
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-indigo-900/40 active:scale-95 cursor-pointer flex items-center space-x-1.5"
            >
              <span>Merchant Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-16 pb-20 max-w-7xl mx-auto text-center overflow-hidden">
        {/* Glow gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Anti-Bypass Cryptographic Security + Real-Time Telemetry</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
            Zero-Fee Dynamic UPI Gateway with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-emerald-400">
              Live Real-Time Telemetry
            </span>
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Generate cryptographically obfuscated, tamper-proof UPI payment links. Capture instant payer IP, browser metadata, and deep-link click events via Firebase Realtime Database.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={handleCreateLiveDemo}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm sm:text-base transition-all shadow-xl shadow-indigo-900/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2"
            >
              <Zap className="w-5 h-5" />
              <span>Launch Live Payer Experience (₹499)</span>
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm sm:text-base transition-all border border-slate-700 cursor-pointer flex items-center justify-center space-x-2"
            >
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>Open Merchant Live Telemetry</span>
            </button>
          </div>
        </div>
      </section>

      {/* THREE PILLARS OF THE ARCHITECTURE */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 max-w-7xl mx-auto border-t border-slate-800">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Engineered for High-Security & Real-Time Observability
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Eliminate traditional payment gateway fees (2%) while maintaining complete transaction audit integrity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Cryptographic HMAC-SHA256 Links</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              URLs never expose raw amounts or merchant keys. Payloads are signed with merchant secrets. If any character is altered by an attacker, the system rejects the link instantly.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Instant Realtime Telemetry</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              The millisecond a payer opens the payment link, public IP, User-Agent, and OS are transmitted to Firebase Realtime Database. Tracks clicks on PhonePe, GPay, FamPay & QR downloads.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">10-Digit Alphanumeric Audit Note</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Every link generates a non-repeating 10-digit reference note (e.g., <code className="text-indigo-400 font-mono">TRX-94829104</code>) pre-filled in the UPI message parameter for 1:1 reconciliation.
            </p>
          </div>
        </div>
      </section>

      {/* INTERACTIVE LINK BUILDER DEMO */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 max-w-5xl mx-auto">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="max-w-xl mx-auto text-center mb-8">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              Interactive Test Lab
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Generate & Inspect an Opaque UPI Token
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Item / Purpose
              </label>
              <input
                type="text"
                value={demoPurpose}
                onChange={(e) => setDemoPurpose(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Amount (₹ INR)
              </label>
              <input
                type="number"
                value={demoAmount}
                onChange={(e) => setDemoAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs sm:text-sm font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleCreateLiveDemo}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-indigo-900/30"
            >
              <span>Test Payment Page with Dynamic Timer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all border border-slate-700 cursor-pointer"
            >
              <span>View Merchant Live Logs</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-400">Dynamic UPI Gateway & Analytics</span>
          </div>
          <div>Production-ready for Vercel, Firebase Realtime Database & React 18.</div>
        </div>
      </footer>
    </div>
  );
};
