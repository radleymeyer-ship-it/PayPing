"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Mail, ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react";

export default function SignUpPage() {
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "pro">("trial");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
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
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Choose your plan & get started
        </h1>
        <p className="text-base text-slate-400 mt-2">
          Automate your overdue invoice collection in minutes.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!isSubmitted ? (
          <motion.div
            key="signup-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10"
          >
            {/* Card 1: 10-Day Free Trial */}
            <div
              onClick={() => setSelectedPlan("trial")}
              className={`cursor-pointer rounded-2xl p-6 sm:p-8 transition-all duration-200 border relative flex flex-col justify-between ${
                selectedPlan === "trial"
                  ? "bg-slate-900/90 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
                  : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    Most Popular
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedPlan === "trial"
                        ? "border-emerald-400 bg-emerald-400"
                        : "border-slate-600"
                    }`}
                  >
                    {selectedPlan === "trial" && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white">10-Day Free Trial</h2>
                <p className="text-sm text-slate-400 mt-1">Full access to test all automation features.</p>

                <div className="my-6">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                  <span className="text-slate-400 text-sm font-medium"> / first 10 days</span>
                </div>

                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>QuickBooks & Stripe Live Sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Automated Email Reminders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cancel anytime before day 10</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-800/80">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> No credit card required to start
                </span>
              </div>
            </div>

            {/* Card 2: Unlimited Access ($15/mo) */}
            <div
              onClick={() => setSelectedPlan("pro")}
              className={`cursor-pointer rounded-2xl p-6 sm:p-8 transition-all duration-200 border relative flex flex-col justify-between ${
                selectedPlan === "pro"
                  ? "bg-slate-900/90 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500"
                  : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20">
                    Unlimited
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedPlan === "pro"
                        ? "border-blue-400 bg-blue-400"
                        : "border-slate-600"
                    }`}
                  >
                    {selectedPlan === "pro" && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white">Unlimited Pro Access</h2>
                <p className="text-sm text-slate-400 mt-1">Uncapped collection sequences & multi-currency.</p>

                <div className="my-6">
                  <span className="text-4xl font-extrabold text-white">$15</span>
                  <span className="text-slate-400 text-sm font-medium"> / month</span>
                </div>

                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Unlimited Invoices & Reminders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>WhatsApp & Email Multi-Channel</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Priority Support & Live DB Sync</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-800/80">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Billed monthly, stop anytime
                </span>
              </div>
            </div>

            {/* Registration Form Bar */}
            <form
              onSubmit={handleSubmit}
              className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm mt-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer text-base shadow-lg shadow-emerald-500/20"
              >
                {loading ? (
                  <span>Creating account...</span>
                ) : (
                  <>
                    <span>
                      Start with {selectedPlan === "trial" ? "10-Day Free Trial" : "Unlimited Pro ($15/mo)"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-500 mt-4">
                By signing up, you agree to our Terms of Service & Privacy Policy.
              </p>
            </form>
          </motion.div>
        ) : (
          /* Step 2: Email Confirmation Prompt */
          <motion.div
            key="email-confirm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-md relative z-10 shadow-2xl"
          >
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-400">
              <Mail className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              We sent a verification link to <strong className="text-emerald-400">{email}</strong>.
              Please click the link in your email to confirm your account and enter your dashboard.
            </p>

            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 mb-6 flex items-start gap-3 text-left">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Verification prevents unauthorized access to your QuickBooks & invoice data.
              </span>
            </div>

            <button
              onClick={() => setIsSubmitted(false)}
              className="text-xs text-slate-400 hover:text-white underline transition-colors cursor-pointer"
            >
              Entered the wrong email? Go back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}