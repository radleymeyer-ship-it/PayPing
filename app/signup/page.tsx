'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, RefreshCw, Check, Mail, ArrowRight, ShieldCheck, Zap, Sparkles 
} from 'lucide-react';

export default function SignUpPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "pro">("trial");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    // Simulate Supabase signUp flow
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-x-hidden">
      
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header / Logo */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center gap-2 mb-3">
          <img src="/payping-robot.png" alt="Invoice Pilot" className="w-9 h-9 object-contain" />
          <span className="text-2xl font-bold tracking-tight text-white">
            Invoice<span className="text-emerald-400">Pilot</span>
          </span>
        </div>
        <p className="text-sm text-slate-400">Automated AR, Quickbooks Sync & Intelligent Payment Chasing</p>
      </div>

      {/* Main Card / Dashboard Preview CTA */}
      <div className="relative z-10 w-full max-w-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> Freemium Gated Experience
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Ready to sync your live data?
        </h1>
        
        <p className="text-sm text-slate-300">
          Connect your QuickBooks account or trigger a live database synchronization to unlock automated payment follow-ups.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Live DB
          </button>
          
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl text-sm border border-slate-700 transition-colors cursor-pointer"
          >
            Connect QuickBooks <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* ------------ AUTH / SIGNUP MODAL OVERLAY ------------ */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-4xl bg-[#07090e] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl my-8"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm font-semibold p-2 cursor-pointer"
              >
                ✕ Close
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 mb-2">
                  <img src="/payping-robot.png" alt="Invoice Pilot" className="w-8 h-8 object-contain" />
                  <span className="text-xl font-bold text-white">Invoice<span className="text-emerald-400">Pilot</span></span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Sign up to connect live data</h2>
                <p className="text-sm text-slate-400 mt-1">Start your 10-day trial or unlock unlimited access.</p>
              </div>

              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <div className="space-y-6">
                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        onClick={() => setSelectedPlan("trial")}
                        className={`cursor-pointer rounded-xl p-5 border transition-all ${
                          selectedPlan === "trial" ? "bg-slate-900 border-emerald-500 ring-1 ring-emerald-500" : "bg-slate-900/40 border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">10-Day Free Trial</span>
                          <div className={`w-4 h-4 rounded-full border ${selectedPlan === "trial" ? "bg-emerald-400 border-emerald-400" : "border-slate-600"}`} />
                        </div>
                        <div className="text-3xl font-bold text-white">$0 <span className="text-xs text-slate-400 font-normal">/ first 10 days</span></div>
                        <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> QuickBooks & Stripe Live Sync</li>
                          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Automated Email Reminders</li>
                        </ul>
                      </div>

                      <div
                        onClick={() => setSelectedPlan("pro")}
                        className={`cursor-pointer rounded-xl p-5 border transition-all ${
                          selectedPlan === "pro" ? "bg-slate-900 border-blue-500 ring-1 ring-blue-500" : "bg-slate-900/40 border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Unlimited Pro</span>
                          <div className={`w-4 h-4 rounded-full border ${selectedPlan === "pro" ? "bg-blue-400 border-blue-400" : "border-slate-600"}`} />
                        </div>
                        <div className="text-3xl font-bold text-white">$15 <span className="text-xs text-slate-400 font-normal">/ month</span></div>
                        <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400" /> Unlimited Invoices & Reminders</li>
                          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400" /> WhatsApp & Email Multi-Channel</li>
                        </ul>
                      </div>
                    </div>

                    {/* Signup Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="email"
                          required
                          placeholder="Work Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                        />
                        <input
                          type="password"
                          required
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer"
                      >
                        {loading ? "Creating Account..." : `Continue with ${selectedPlan === "trial" ? "10-Day Free Trial" : "Unlimited Pro ($15/mo)"} →`}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Confirmation step */
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 text-emerald-400">
                      <Mail className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Check your email</h3>
                    <p className="text-sm text-slate-300 mb-4">
                      We sent a verification link to <strong className="text-emerald-400">{email}</strong>. Please check your inbox and follow the instructions to complete your account setup.
                    </p>
                    <button 
                      onClick={() => setShowAuthModal(false)} 
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Close window
                    </button>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}