import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Activity,
  PlusCircle,
  QrCode,
  Sparkles,
  Copy,
  Check,
  Download,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Smartphone,
  Eye,
  Settings,
  LogOut,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Layers,
  Code2,
  Share2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wifi,
  FileSpreadsheet,
  Globe,
  Monitor
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  generate10DigitRefCode,
  generateSessionId,
  generatePaymentToken
} from '../utils/security';
import {
  savePaymentSession,
  subscribeToMerchantSessions,
  updateSessionStatus
} from '../firebase';
import { PaymentSession, PaymentStatus, EventStatus } from '../types';

export const Dashboard: React.FC = () => {
  const { user, profile, updateMerchantProfile, logout, isFirebaseConnected } = useAuth();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'live' | 'generate' | 'analytics' | 'integrate' | 'settings'>('live');

  // Real-time Payment Sessions list
  const [sessions, setSessions] = useState<PaymentSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<PaymentSession | null>(null);

  // Link Generator Form State
  const [purpose, setPurpose] = useState<string>('Premium Pro Subscription (Annual)');
  const [amount, setAmount] = useState<number>(profile?.defaultAmount || 499);
  const [customExpiry, setCustomExpiry] = useState<number>(15);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [generatedRef, setGeneratedRef] = useState<string>('');
  const [generatedSessionId, setGeneratedSessionId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Settings State
  const [settingsBusinessName, setSettingsBusinessName] = useState<string>(profile?.businessName || '');
  const [settingsUpiId, setSettingsUpiId] = useState<string>(profile?.upiId || '');
  const [settingsSecretKey, setSettingsSecretKey] = useState<string>(profile?.secretKey || '');
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  // Subscribe to Realtime Database / Cross-Tab updates
  useEffect(() => {
    if (!profile?.uid) return;

    const unsubscribe = subscribeToMerchantSessions(profile.uid, (data) => {
      setSessions(data);
      // Update selected modal if open
      if (selectedSession) {
        const updated = data.find((s) => s.sessionId === selectedSession.sessionId);
        if (updated) setSelectedSession(updated);
      }
    });

    return () => unsubscribe();
  }, [profile?.uid, selectedSession]);

  // Sync settings inputs when profile loads
  useEffect(() => {
    if (profile) {
      setSettingsBusinessName(profile.businessName);
      setSettingsUpiId(profile.upiId);
      setSettingsSecretKey(profile.secretKey);
    }
  }, [profile]);

  // Generate Link Handler
  const handleGenerateLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;

    setIsGenerating(true);
    const sid = generateSessionId();
    const refCode = generate10DigitRefCode();

    const token = await generatePaymentToken({
      sessionId: sid,
      merchantId: profile.uid,
      merchantName: profile.businessName,
      merchantUpi: profile.upiId,
      amount: Number(amount),
      purpose: purpose.trim(),
      refCode,
      secretKey: profile.secretKey,
      expiresInMinutes: Number(customExpiry)
    });

    // Determine base URL
    const origin = window.location.origin;
    const fullPayUrl = `${origin}/pay?token=${token}`;

    const newSession: PaymentSession = {
      sessionId: sid,
      merchantId: profile.uid,
      merchantName: profile.businessName,
      merchantUpi: profile.upiId,
      purpose: purpose.trim(),
      amount: Number(amount),
      refCode,
      createdAt: Date.now(),
      expiresAt: Date.now() + Number(customExpiry) * 60 * 1000,
      status: 'pending',
      token,
      telemetryLogs: []
    };

    await savePaymentSession(newSession);

    setGeneratedLink(fullPayUrl);
    setGeneratedRef(refCode);
    setGeneratedSessionId(sid);
    setIsGenerating(false);
  };

  // Initial link generation on mount if none exists
  useEffect(() => {
    if (!generatedLink && profile) {
      handleGenerateLink();
    }
  }, [profile]);

  // Toggle Payment Status (Paid / Pending)
  const handleToggleStatus = async (s: PaymentSession) => {
    if (!profile) return;
    const nextStatus: PaymentStatus = s.status === 'paid' ? 'pending' : 'paid';
    await updateSessionStatus(profile.uid, s.sessionId, nextStatus);
  };

  // Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // AI Agent Integration Prompt Generator
  const aiDesignerPrompt = useMemo(() => {
    return `I have an HTML/React website. Please integrate this dynamic payment button into my checkout or donation section. Point the Pay Now button directly to: ${generatedLink || 'https://yourdomain.vercel.app/pay?token=...'}. Style it using modern Tailwind CSS with a clean hover state and include the 10-digit note "${generatedRef || 'TRX-94829104'}" for audit tracking.`;
  }, [generatedLink, generatedRef]);

  const handleCopyAiPrompt = () => {
    navigator.clipboard.writeText(aiDesignerPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateMerchantProfile({
      businessName: settingsBusinessName,
      upiId: settingsUpiId,
      secretKey: settingsSecretKey
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch =
        s.refCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.payerName && s.payerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.payerIp && s.payerIp.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.sessionId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        s.status === statusFilter ||
        (statusFilter === 'active' && s.status === 'pending') ||
        (statusFilter === 'interacted' && s.lastEvent && s.lastEvent !== 'Opened (No Interaction Yet)');

      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchQuery, statusFilter]);

  // Analytics Metrics
  const analytics = useMemo(() => {
    const totalVolume = sessions.reduce((acc, s) => acc + (s.status === 'paid' ? s.amount : 0), 0);
    const totalCount = sessions.length;
    const paidCount = sessions.filter((s) => s.status === 'paid').length;
    const conversionRate = totalCount > 0 ? ((paidCount / totalCount) * 100).toFixed(1) : '0.0';

    const appBreakdown: Record<string, number> = {
      'PhonePe': 0,
      'Google Pay': 0,
      'FamPay': 0,
      'Generic QR': 0,
      'Other': 0
    };

    sessions.forEach((s) => {
      s.telemetryLogs?.forEach((log) => {
        if (log.status.includes('PhonePe')) appBreakdown['PhonePe']++;
        else if (log.status.includes('Google Pay')) appBreakdown['Google Pay']++;
        else if (log.status.includes('FamPay')) appBreakdown['FamPay']++;
        else if (log.status.includes('QR')) appBreakdown['Generic QR']++;
        else appBreakdown['Other']++;
      });
    });

    return { totalVolume, totalCount, paidCount, conversionRate, appBreakdown };
  }, [sessions]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'Session ID',
      'Ref Code (10-Digit)',
      'Payer Name',
      'Amount (INR)',
      'Status',
      'Last Event',
      'Client IP',
      'OS / Browser',
      'Created At',
      'Last Interaction'
    ];

    const rows = filteredSessions.map((s) => [
      s.sessionId,
      s.refCode,
      s.payerName || 'Anonymous',
      s.amount,
      s.status,
      s.lastEvent || 'No Events',
      s.payerIp || 'N/A',
      `${s.payerOs || ''} / ${s.payerBrowser || ''}`,
      new Date(s.createdAt).toISOString(),
      s.lastEventTime ? new Date(s.lastEventTime).toISOString() : 'N/A'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `upi-telemetry-ledger-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: EventStatus | undefined) => {
    if (!status) return <span className="text-slate-500 text-xs">Waiting for visit...</span>;

    if (status.includes('PhonePe')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
          📱 PhonePe Clicked
        </span>
      );
    }
    if (status.includes('Google Pay')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          ⚡ Google Pay Clicked
        </span>
      );
    }
    if (status.includes('FamPay')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          🔥 FamPay Clicked
        </span>
      );
    }
    if (status.includes('QR')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
          📥 Downloaded QR
        </span>
      );
    }
    if (status.includes('Generic UPI')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          ✨ UPI App Clicked
        </span>
      );
    }
    if (status.includes('Paid')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
          ✅ Marked as Paid
        </span>
      );
    }
    if (status.includes('Opened')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          👀 Opened (Idle)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/20">
              UPI
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg text-white tracking-tight">
                  Dynamic UPI Gateway
                </span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Realtime Active</span>
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center space-x-2">
                <span>{profile?.businessName || 'Apex Digital Store'}</span>
                <span>•</span>
                <span className="font-mono text-indigo-400">{profile?.upiId}</span>
              </div>
            </div>
          </div>

          {/* Right Header actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setActiveTab('generate')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-indigo-900/30 active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">New Secure Link</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-slate-800 border-indigo-500 text-indigo-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Merchant Profile Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD BODY */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Settled Revenue
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ₹{analytics.totalVolume.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
              <span className="text-emerald-400 font-semibold">{analytics.paidCount} Verified</span>
              <span>from {analytics.totalCount} dynamic links</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Conversion Rate
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {analytics.conversionRate}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Direct Intent + Zero payment gateway drop-off
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Live Active Sessions
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {sessions.filter((s) => s.status === 'pending').length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Active with 120s countdown timers
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Anti-Bypass Guard
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight flex items-center space-x-1.5">
              <span>100%</span>
              <span className="text-xs text-purple-300 font-mono font-normal">HMAC</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Zero unverified direct merchant bypass
            </div>
          </div>
        </div>

        {/* TAB BUTTONS */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Telemetry & Payment Logs</span>
            <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/60 text-[10px] font-mono">
              {sessions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'generate'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate Secure Link</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Telemetry Breakdown</span>
          </button>

          <button
            onClick={() => setActiveTab('integrate')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'integrate'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>AI Designer & Embed Prompt</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Merchant Settings</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: LIVE TELEMETRY & PAYMENT LOGS TABLE                     */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            {/* Search, Filter & Export Action Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by 10-digit Ref (e.g. TRX-9482), Payer Name, IP, or Session ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Sessions ({sessions.length})</option>
                  <option value="paid">Verified Paid Only</option>
                  <option value="active">Active (Pending)</option>
                  <option value="interacted">Interacted / Clicked</option>
                </select>

                <button
                  onClick={handleExportCsv}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer"
                  title="Export to CSV"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span className="hidden md:inline">Export CSV</span>
                </button>
              </div>
            </div>

            {/* Realtime Telemetry Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-4">Session & 10-Digit Ref</th>
                      <th className="py-3.5 px-4">Payer & IP Telemetry</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Live Event Status</th>
                      <th className="py-3.5 px-4">Last Activity</th>
                      <th className="py-3.5 px-4 text-center">Settlement Toggle</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {filteredSessions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                          <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium text-slate-400">No payment sessions recorded yet</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Generate a secure payment link and open it in a new window to watch real-time telemetry!
                          </p>
                          <button
                            onClick={() => setActiveTab('generate')}
                            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold"
                          >
                            Generate Test Link
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredSessions.map((s) => (
                        <tr
                          key={s.sessionId}
                          className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                          onClick={() => setSelectedSession(s)}
                        >
                          {/* Col 1: Session & Ref */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white tracking-wider flex items-center space-x-1.5">
                              <span className="text-indigo-400">{s.refCode}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-sans truncate max-w-[140px]">
                              {s.purpose}
                            </div>
                            <div className="text-[9px] text-slate-600 truncate max-w-[140px]">
                              {s.sessionId}
                            </div>
                          </td>

                          {/* Col 2: Payer Name & IP */}
                          <td className="py-3.5 px-4 font-sans">
                            <div className="font-semibold text-slate-200">
                              {s.payerName || <span className="text-slate-500 italic">Unidentified Payer</span>}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                              <Globe className="w-3 h-3 text-slate-500" />
                              <span>{s.payerIp || 'Pending IP...'}</span>
                            </div>
                            {(s.payerBrowser || s.payerOs) && (
                              <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                                <Monitor className="w-3 h-3 text-slate-600" />
                                <span>
                                  {s.payerBrowser} • {s.payerOs}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Col 3: Amount */}
                          <td className="py-3.5 px-4 font-bold text-white text-sm">
                            ₹{s.amount.toFixed(2)}
                          </td>

                          {/* Col 4: Live Event Status */}
                          <td className="py-3.5 px-4 font-sans">
                            {getStatusBadge(s.lastEvent)}
                            {s.telemetryLogs?.length > 1 && (
                              <span className="ml-2 text-[10px] text-slate-500 font-mono">
                                ({s.telemetryLogs.length} events)
                              </span>
                            )}
                          </td>

                          {/* Col 5: Timestamp */}
                          <td className="py-3.5 px-4 text-slate-400 text-[11px] font-sans">
                            {s.lastEventTime
                              ? new Date(s.lastEventTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })
                              : new Date(s.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                          </td>

                          {/* Col 6: Toggle Status */}
                          <td
                            className="py-3.5 px-4 text-center font-sans"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleToggleStatus(s)}
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                s.status === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                              }`}
                            >
                              {s.status === 'paid' ? '✓ Verified Paid' : '⏳ Pending'}
                            </button>
                          </td>

                          {/* Col 7: Actions */}
                          <td
                            className="py-3.5 px-4 text-right font-sans"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => setSelectedSession(s)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                title="Inspect Audit Trail"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={`/pay?token=${s.token}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 transition-colors"
                                title="Open Payer URL"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: GENERATE SECURE LINK PANEL                             */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
              <div className="flex items-center space-x-2.5 mb-5 pb-4 border-b border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Generate Secure Payment Link</h2>
                  <p className="text-xs text-slate-400">
                    Opaque, cryptographically signed token with HMAC-SHA256 anti-tamper checksum
                  </p>
                </div>
              </div>

              <form onSubmit={handleGenerateLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Purpose / Product / Service Name
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Website Consulting, Pro Subscription, Donation"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Amount (INR ₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Session Expiry
                    </label>
                    <select
                      value={customExpiry}
                      onChange={(e) => setCustomExpiry(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value={2}>2 Minutes (Dynamic Window)</option>
                      <option value={5}>5 Minutes</option>
                      <option value={15}>15 Minutes</option>
                      <option value={60}>1 Hour</option>
                      <option value={1440}>24 Hours</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Payee Name:</span>
                    <span className="text-white font-medium">{profile?.businessName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Payee UPI VPA:</span>
                    <span className="text-indigo-400 font-mono font-medium">{profile?.upiId}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Security Method:</span>
                    <span className="text-emerald-400 font-semibold">HMAC-SHA256 Base64URL</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-900/30 active:scale-[0.99] cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerating ? 'Computing Checksum...' : 'Generate New Dynamic Link'}</span>
                </button>
              </form>
            </div>

            {/* Generated Result Card */}
            <div className="lg:col-span-6 bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5" />
                    <span>Cryptographically Signed & Ready</span>
                  </span>
                  <span className="font-mono text-xs text-indigo-400 font-bold">
                    Ref: {generatedRef}
                  </span>
                </div>

                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tamper-Proof Payment URL (Opaque Token):
                </label>
                <div className="relative mb-4">
                  <textarea
                    readOnly
                    value={generatedLink}
                    rows={3}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs font-mono resize-none focus:outline-none focus:border-indigo-500 select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow cursor-pointer active:scale-95"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                {/* AI Agent Integration Prompt Generator Box */}
                <div className="bg-slate-950 border border-indigo-500/20 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>One-Click AI Agent Integration Prompt</span>
                    </span>
                    <button
                      onClick={handleCopyAiPrompt}
                      className="text-xs text-indigo-400 hover:text-indigo-200 font-medium flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedPrompt ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Prompt Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 select-all">
                    "{aiDesignerPrompt}"
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={generatedLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Test Payment Screen (New Window)</span>
                </a>
                <button
                  onClick={() => setActiveTab('live')}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all border border-slate-700 cursor-pointer"
                >
                  <Activity className="w-4 h-4" />
                  <span>Watch Live Logs</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: ANALYTICS & TELEMETRY BREAKDOWN                         */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Payment App Preference Chart */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Payment Method Distribution</h3>
                  <p className="text-xs text-slate-400">
                    Clicks recorded on direct UPI app deep links & QR scans
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(analytics.appBreakdown).map(([appName, count]) => {
                  const total = Object.values(analytics.appBreakdown).reduce((a, b) => a + b, 0) || 1;
                  const percentage = Math.round((count / total) * 100);

                  let color = 'bg-indigo-500';
                  if (appName === 'PhonePe') color = 'bg-purple-500';
                  if (appName === 'Google Pay') color = 'bg-blue-500';
                  if (appName === 'FamPay') color = 'bg-amber-500';
                  if (appName === 'Generic QR') color = 'bg-emerald-500';

                  return (
                    <div key={appName} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300">{appName}</span>
                        <span className="text-slate-400 font-mono">
                          {count} clicks ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full ${color} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Conversion Funnel */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Payer Funnel Telemetry</h3>
                  <p className="text-xs text-slate-400">Step-by-step conversion drop-off</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-sans">1. Links Generated</span>
                  <span className="text-white font-bold">{sessions.length}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-sans">2. Page Opened (IP Logged)</span>
                  <span className="text-indigo-400 font-bold">
                    {sessions.filter((s) => s.lastEvent).length}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-sans">3. Identified with Name</span>
                  <span className="text-blue-400 font-bold">
                    {sessions.filter((s) => s.payerName).length}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-sans">4. Deep-Link Triggered / QR Scan</span>
                  <span className="text-purple-400 font-bold">
                    {
                      sessions.filter(
                        (s) =>
                          s.lastEvent &&
                          !s.lastEvent.includes('Opened') &&
                          !s.lastEvent.includes('Identified')
                      ).length
                    }
                  </span>
                </div>
                <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30 flex justify-between items-center">
                  <span className="text-emerald-300 font-sans font-semibold">5. Verified Settlements</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {analytics.paidCount} ({analytics.conversionRate}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: AI DESIGNER & EMBED CODE SNIPPETS                      */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'integrate' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">AI Web Designer & Frontend Snippets</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Drop this dynamic payment gateway into any React, Next.js, or HTML static site in seconds.
              </p>
            </div>

            {/* AI Designer Prompt */}
            <div className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-5 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Prompt for AI Assistants (ChatGPT, Claude, Cursor, v0)</span>
                </span>
                <button
                  onClick={handleCopyAiPrompt}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
                </button>
              </div>
              <pre className="text-xs font-mono text-slate-300 bg-slate-900 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap select-all">
                {aiDesignerPrompt}
              </pre>
            </div>

            {/* React Tailwind Button Snippet */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">HTML / React Tailwind Component</span>
              </div>
              <pre className="text-xs font-mono text-emerald-400 bg-slate-900 p-4 rounded-xl overflow-x-auto select-all">
{`<a
  href="${generatedLink || 'https://yourdomain.vercel.app/pay?token=...'}"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center space-x-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
>
  <span>Pay ₹${amount || 499} via UPI</span>
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
  </svg>
</a>`}
              </pre>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: MERCHANT PROFILE & SETTINGS                            */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Merchant Profile & VPA Settings</h2>
                <p className="text-xs text-slate-400">
                  Update your default UPI address and cryptographic signing secret key
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Merchant Display Name
                </label>
                <input
                  type="text"
                  value={settingsBusinessName}
                  onChange={(e) => setSettingsBusinessName(e.target.value)}
                  placeholder="e.g. Apex Digital Store"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  UPI VPA Address (Receiving Account)
                </label>
                <input
                  type="text"
                  value={settingsUpiId}
                  onChange={(e) => setSettingsUpiId(e.target.value)}
                  placeholder="e.g. user@okhdfcbank, merchant@paytm"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Valid UPI VPAs include @okhdfcbank, @okaxis, @paytm, @ybl, @ibl, @postbank, etc.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  HMAC Cryptographic Secret Key (Anti-Tamper Signature)
                </label>
                <input
                  type="text"
                  value={settingsSecretKey}
                  onChange={(e) => setSettingsSecretKey(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-indigo-400 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Never share this secret with payers. It is used exclusively to generate and verify SHA-256 link checksums.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-900/30 active:scale-98 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Merchant Profile</span>
                </button>
              </div>

              {settingsSaved && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center animate-fade-in">
                  Merchant profile and cryptographic keys successfully updated!
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SESSION INSPECTOR MODAL (FULL AUDIT TRAIL)                    */}
      {/* ------------------------------------------------------------- */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedSession(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Session Telemetry Audit Trail</h3>
                <p className="font-mono text-xs text-indigo-400">{selectedSession.refCode}</p>
              </div>
            </div>

            {/* Session Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs font-mono mb-5">
              <div>
                <span className="text-slate-500 block">Amount:</span>
                <span className="text-emerald-400 font-bold text-sm">₹{selectedSession.amount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Payer Name:</span>
                <span className="text-white">{selectedSession.payerName || 'Not identified yet'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status:</span>
                <span className="text-indigo-400 font-bold uppercase">{selectedSession.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block">IP Address:</span>
                <span className="text-slate-300">{selectedSession.payerIp || 'Pending...'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Browser/OS:</span>
                <span className="text-slate-300 truncate block">
                  {selectedSession.payerBrowser || selectedSession.payerOs || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Created:</span>
                <span className="text-slate-400">
                  {new Date(selectedSession.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Chronological Event Timeline */}
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Chronological Interaction Events ({selectedSession.telemetryLogs?.length || 0})
            </h4>

            <div className="space-y-2.5">
              {(!selectedSession.telemetryLogs || selectedSession.telemetryLogs.length === 0) ? (
                <div className="text-center py-6 text-slate-500 text-xs font-sans">
                  No interactions captured yet for this session.
                </div>
              ) : (
                selectedSession.telemetryLogs.map((log, index) => (
                  <div
                    key={log.id || index}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white flex items-center space-x-2">
                        <span>{log.status}</span>
                      </div>
                      {log.details && (
                        <div className="text-slate-400 text-[11px] mt-0.5">{log.details}</div>
                      )}
                      {log.ip && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          IP: {log.ip} • Device: {log.device || 'Desktop/Mobile'}
                        </div>
                      )}
                    </div>
                    <span className="text-slate-500 font-mono text-[11px] shrink-0 ml-3">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end space-x-3">
              <button
                onClick={() => {
                  handleToggleStatus(selectedSession);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  selectedSession.status === 'paid'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {selectedSession.status === 'paid' ? 'Mark as Pending' : '✓ Mark as Paid'}
              </button>
              <button
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
