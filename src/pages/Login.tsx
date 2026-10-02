import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  Key,
  ArrowRight,
  Sparkles,
  Zap,
  Gamepad2,
  Briefcase,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInAsDemoMerchant } = useAuth();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('merchant@apexpay.io');
  const [password, setPassword] = useState<string>('password123');
  const [businessName, setBusinessName] = useState<string>('Apex Digital Store');
  const [upiId, setUpiId] = useState<string>('apexcloud@okhdfcbank');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, businessName, upiId);
      } else {
        await signInWithEmail(email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (preset: 'apex' | 'gaming' | 'freelance') => {
    signInAsDemoMerchant(preset);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-xl shadow-indigo-500/20">
          UPI
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Dynamic UPI Gateway
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Merchant Dashboard • Live Realtime Telemetry • Anti-Bypass Security
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />

          {/* Quick Demo Merchant Presets */}
          <div className="mb-6 pb-5 border-b border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5 flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Instant One-Click Demo Mode</span>
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('apex')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-indigo-500/30 text-left transition-all active:scale-95 cursor-pointer group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-indigo-300">
                  SaaS Store
                </div>
                <div className="text-[10px] text-slate-400 truncate">₹499/mo</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('gaming')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-purple-500/30 text-left transition-all active:scale-95 cursor-pointer group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-purple-300 flex items-center space-x-1">
                  <Gamepad2 className="w-3 h-3 text-purple-400" />
                  <span>Gaming</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">₹149 pass</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('freelance')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/30 text-left transition-all active:scale-95 cursor-pointer group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-emerald-300 flex items-center space-x-1">
                  <Briefcase className="w-3 h-3 text-emerald-400" />
                  <span>Agency</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">₹2,500 inv</div>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Business / Store Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    placeholder="e.g. Apex Digital Goods"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Receiving UPI ID (VPA)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required
                    placeholder="e.g. user@okhdfcbank"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Merchant Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="merchant@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-900/30 active:scale-[0.99] cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>{isSignUp ? 'Create Merchant Account' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={async () => {
                await signInWithGoogle();
                navigate('/dashboard');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-all border border-slate-700 cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Sign in with Google</span>
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Register Merchant Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
