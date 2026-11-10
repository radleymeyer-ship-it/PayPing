'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Clock, Send, Settings, BarChart3, RefreshCw, Calendar, CheckCircle, Save, Mail,
  AlertCircle, TrendingUp, TrendingDown, Globe2, Radar, Zap, Plug, Plus, ArrowDown, LayoutDashboard,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

declare global {
  interface Window {
    Paddle?: any;
  }
}
type Tab = 'dashboard' | 'invoices' | 'sequence' | 'integrations';

/* ---------- Robot logo ---------- */
function RobotLogo({ size = 44 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-lime-400/20 blur-sm animate-pulse" />
      {failed ? (
        <div className="relative w-full h-full rounded-xl bg-gradient-to-tr from-blue-700 to-lime-500 flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/InvoicePilot-robot.png"
          alt="Qubi AI robot"
          ref={(el) => { if (el && el.complete && el.naturalWidth === 0) setFailed(true); }}
          onError={() => setFailed(true)}
          className="relative z-10 w-full h-full object-contain"
        />
      )}
      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-lime-400 ring-2 ring-slate-950 animate-ping" />
      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-lime-400 ring-2 ring-slate-950" />
    </motion.div>
  );
}

const glass = 'bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_40px_-12px_rgba(59,130,246,0.25)]';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [metrics, setMetrics] = useState({
    totalRecovered: 0,
    activeOverdue: 0,
    averageDSO: 0,
    projectedCashFlow: 0,
    currentDue: 0,
    overdue1to30: 0,
    overdue30Plus: 0,
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "pro">("trial");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handlePaddleCheckout = () => {
    if (typeof window !== 'undefined' && window.Paddle) {
      window.Paddle.Checkout.open({
        items: [
          {
            priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO,
            quantity: 1,
          },
        ],
        customer: {
          email: email || undefined,
        },
      });
    } else {
      alert("Paddle SDK is loading... Please try again in a moment.");
    }
  };
  
  const [qbdConnected, setQbdConnected] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('qbd_connected') === 'true') {
        setQbdConnected(true);
      }
    }
  }, []);

  const [sequences, setSequences] = useState([
    {
      id: 1, day: 3, enabled: true,
      subject: 'Friendly Reminder: Invoice {{invoice_id}} is due',
      body: 'Hi {{customer_name}},\n\nThis is a friendly reminder that invoice {{invoice_id}} for {{amount}} was due on {{due_date}}.\n\nYou can complete payment here: {{payment_link}}',
    },
    {
      id: 2, day: 7, enabled: true,
      subject: 'Second Notice: Overdue Invoice {{invoice_id}}',
      body: 'Hi {{customer_name}},\n\nWe haven’t received payment for invoice {{invoice_id}} ({{amount}}). Please take a moment to settle this balance.',
    },
    {
      id: 3, day: 14, enabled: false,
      subject: 'URGENT: Final Notice for Invoice {{invoice_id}}',
      body: 'Hi {{customer_name}},\n\nYour account is now 14 days overdue for invoice {{invoice_id}}. Please remit payment immediately.',
    },
  ]);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvoices(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Compute financial metrics
  useEffect(() => {
    if (!invoices || invoices.length === 0) return;

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let collected = 0;
    let outstanding = 0;
    let current = 0;
    let overdue30 = 0;
    let overduePlus = 0;
    let cashFlow = 0;

    const paidInvoices = invoices.filter((inv: any) => inv.status === 'paid' && inv.created_at && inv.updated_at);
    const totalDaysToPay = paidInvoices.reduce((acc: number, inv: any) => {
      const created = new Date(inv.created_at).getTime();
      const paid = new Date(inv.updated_at).getTime();
      return acc + Math.max(0, (paid - created) / (1000 * 60 * 60 * 24));
    }, 0);
    const averageDSO = paidInvoices.length > 0 ? Math.round(totalDaysToPay / paidInvoices.length) : 0;

    invoices.forEach((inv: any) => {
      const amount = Number(inv.amount_due || 0);
      if (inv.status === 'paid') {
        collected += amount;
      } else {
        outstanding += amount;
        if (inv.due_date) {
          const dueDate = new Date(inv.due_date);
          if (dueDate >= now && dueDate <= thirtyDaysFromNow) {
            cashFlow += amount;
          }
          const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 0) current += amount;
          else if (diffDays <= 30) overdue30 += amount;
          else overduePlus += amount;
        } else {
          current += amount;
        }
      }
    });

    setMetrics({
      totalRecovered: collected,
      activeOverdue: outstanding,
      averageDSO,
      projectedCashFlow: cashFlow,
      currentDue: current,
      overdue1to30: overdue30,
      overdue30Plus: overduePlus,
    });
  }, [invoices]);

  const unpaid = useMemo(() => invoices.filter((i) => i.status === 'unpaid'), [invoices]);
  const currencies = useMemo(() => Array.from(new Set(invoices.map((i) => (i.currency || 'usd').toUpperCase()))), [invoices]);

  const [feed, setFeed] = useState<{ key: number; text: string }[]>([]);
  const [target, setTarget] = useState<string>('Standing by…');
  
  useEffect(() => {
    if (!unpaid.length) { setTarget('All clear 🎉'); return; }
    let n = 0;
    const tick = () => {
      const inv = unpaid[n % unpaid.length];
      const step = sequences.filter((s) => s.enabled)[n % Math.max(1, sequences.filter((s) => s.enabled).length)];
      setTarget(inv.customer_name);
      setFeed((f) => [
        { key: Date.now() + n, text: `Ping queued → ${inv.customer_name} (${step ? `Day ${step.day}` : 'manual'})` },
        ...f,
      ].slice(0, 4));
      n++;
    };
    tick();
    const t = setInterval(tick, 3200);
    return () => clearInterval(t);
  }, [unpaid, sequences]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: Clock },
    { id: 'sequence', label: 'Sequence Engine', icon: Send },
    { id: 'integrations', label: 'Integrations', icon: Settings },
  ];

  const titles: Record<Tab, string> = {
    dashboard: 'Dashboard Overview', invoices: 'Invoices & Recovery', sequence: 'Sequence Engine', integrations: 'Integrations',
  };

  const handleSaveSequence = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const updateSequence = (idx: number, patch: Partial<(typeof sequences)[number]>) =>
    setSequences((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const handleSendReminder = async (invoice: any) => {
    setSendingId(invoice.id);
    setSendStatus(null);
    try {
      const res = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invoice.customer_email,
          customerName: invoice.customer_name,
          invoiceId: invoice.id,
          amount: formatCurrency(invoice.amount_due, invoice.currency || 'usd'),
          dueDate: invoice.due_date,
          paymentUrl: invoice.hosted_invoice_url || 'https://stripe.com',
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSendStatus({ id: invoice.id, success: true, message: 'Ping sent successfully!' });
      } else {
        setSendStatus({ id: invoice.id, success: false, message: result.error || 'Failed to send ping.' });
      }
    } catch (err: any) {
      setSendStatus({ id: invoice.id, success: false, message: err.message || 'Error triggering ping.' });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex font-sans overflow-hidden">
      {/* Ambient glows + grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] rounded-full bg-lime-400/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="relative z-20 w-64 border-r border-white/10 bg-slate-950/80 backdrop-blur-xl flex flex-col justify-between p-6 hidden md:flex">
        <div className="space-y-8">
          {/* Logo & Slogan */}
          <div className="flex items-center space-x-3">
            <RobotLogo size={40} />
            <div className="leading-tight">
              <span className="text-[22px] font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Qubi</span>
                <span className="bg-gradient-to-r from-lime-300 to-green-500 bg-clip-text text-transparent"> AI</span>
              </span>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Autonomous Billing</div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer / Upgrade CTA */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-2">
            <div className="text-xs text-slate-400 font-medium">Pro Subscription</div>
            <div className="text-sm font-bold text-emerald-400">$15/mo Active</div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Manage Plan
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative z-10">
        
        {/* Top Header Bar */}
        <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-xl px-8 py-4 flex items-center justify-between">
          <h1 className="text-[24px] font-bold text-slate-100">{titles[activeTab]}</h1>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center space-x-1.5 text-xs bg-slate-900/70 border border-white/10 px-3 py-2 rounded-lg hover:bg-slate-800 transition text-slate-200 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sync Live DB</span>
            </button>

            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Sign In / Upgrade
            </button>
          </div>
        </header>

        {/* Main View Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
          
          {/* Demo Mode Notice */}
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl backdrop-blur-md">
            <div className="flex items-center space-x-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-300">
                Demo Mode — Autonomous reminders active. Connect your live database to manage real accounts.
              </span>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer"
            >
              Upgrade to Pro →
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* ---------- OVERVIEW TAB ---------- */}
              {activeTab === 'dashboard' && (
                <>
                  {/* Hero Metric Card */}
                  <motion.div variants={fadeUp} initial="hidden" animate="show" className={`${glass} p-8 relative overflow-hidden`}>
                    <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-emerald-500/20 to-transparent blur-3xl" />
                    <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Total Revenue Recovered</div>
                    <div className="text-[48px] font-extrabold tracking-tight text-emerald-400 mb-2">
                      {formatCurrency(metrics.totalRecovered, invoices[0]?.currency || 'usd')}
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-slate-400 pt-2 border-t border-white/5">
                      <div><strong className="text-slate-200">{metrics.averageDSO} days</strong> avg DSO speedup</div>
                      <div>•</div>
                      <div><strong className="text-slate-200">{invoices.filter(i => i.status === 'paid').length}</strong> invoices fully collected</div>
                    </div>
                  </motion.div>

                  {/* Secondary Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        label: 'Active Overdue',
                        value: formatCurrency(metrics.activeOverdue, invoices[0]?.currency || 'usd'),
                        color: 'text-amber-400',
                        glow: 'from-amber-500/20',
                        badge: `${formatCurrency(metrics.projectedCashFlow, invoices[0]?.currency || 'usd')} 30d proj`,
                        up: false,
                      },
                      {
                        label: 'Currencies Synced',
                        value: currencies.length ? currencies.join(' · ') : 'USD',
                        color: 'text-sky-400',
                        glow: 'from-sky-500/20',
                        badge: `${invoices.length} rows active`,
                        up: true,
                        globe: true,
                      },
                      {
                        label: 'Bot Status',
                        value: 'ONLINE',
                        color: 'text-lime-400',
                        glow: 'from-lime-500/20',
                        badge: 'Autonomous',
                        up: true,
                      },
                    ].map((c, i) => (
                      <motion.div
                        key={c.label} variants={fadeUp} initial="hidden" animate="show" custom={i}
                        className={`${glass} relative overflow-hidden p-6`}
                      >
                        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${c.glow} to-transparent blur-2xl`} />
                        <div className="relative flex items-center justify-between">
                          <span className="text-[13px] text-slate-400 uppercase tracking-wider font-semibold">{c.label}</span>
                          <span className={`inline-flex items-center gap-1 text-[12px] font-bold px-2 py-0.5 rounded-full border ${
                            c.up ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {c.badge}
                          </span>
                        </div>
                        <div className={`relative text-[32px] font-extrabold tracking-tight mt-3 ${c.color}`}>{c.value}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Bot Dispatch Radar & Live Feed */}
                  <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className={`${glass} p-6 grid md:grid-cols-[auto_1fr] gap-8 items-center`}>
                    <div className="relative w-52 h-52 mx-auto">
                      <div className="absolute inset-0 rounded-full border border-lime-400/30 bg-slate-950/60" />
                      <div className="absolute inset-8 rounded-full border border-lime-400/20" />
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ background: 'conic-gradient(from 0deg, rgba(163,230,53,0.35), transparent 25%)' }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.div
                        className="absolute inset-0 m-auto w-16 h-16 rounded-full overflow-hidden ring-2 ring-lime-400/70 shadow-[0_0_24px_rgba(163,230,53,0.45)] bg-blue-700"
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/InvoicePilot-robot.png" alt="Qubi AI bot" className="w-full h-full object-cover scale-110" />
                      </motion.div>
                    </div>

                    <div className="space-y-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <Radar className="w-4 h-4 text-lime-400" />
                        <h2 className="text-[18px] font-bold text-slate-100">Live AI Bot Dispatch Stream</h2>
                        <span className="ml-2 inline-flex items-center gap-1.5 text-xs font-bold text-lime-300 bg-lime-400/10 border border-lime-400/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" /> ACTIVE
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">
                        Targeting client account: <span className="text-lime-300 font-semibold">{target}</span>
                      </div>
                      <div className="space-y-2 h-36 overflow-hidden">
                        <AnimatePresence initial={false}>
                          {feed.map((f, i) => (
                            <motion.div
                              key={f.key}
                              layout
                              initial={{ opacity: 0, x: -16 }}
                              animate={{ opacity: 1 - i * 0.2, x: 0 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-2 text-sm font-mono bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2 text-slate-300"
                            >
                              <Zap className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                              <span className="truncate">{f.text}</span>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}

              {/* ---------- INVOICES TAB ---------- */}
              {activeTab === 'invoices' && (
                <div className={`${glass} p-6 space-y-4`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-slate-400 uppercase font-bold tracking-wider">
                        <tr className="border-b border-white/10">
                          <th className="p-3">Customer</th>
                          <th className="p-3">Invoice ID</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">
                              {loading ? 'Syncing invoices...' : 'No invoices found.'}
                            </td>
                          </tr>
                        ) : (
                          invoices.map((inv, i) => (
                            <motion.tr
                              key={inv.id}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: Math.min(i, 10) * 0.04 }}
                              className="border-b border-white/5 hover:bg-white/[0.04] transition group"
                            >
                              <td className="p-3 font-semibold text-slate-200">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-lime-500 flex items-center justify-center text-sm font-bold text-white">
                                    {(inv.customer_name || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    {inv.customer_name}
                                    <div className="text-xs text-slate-500 font-normal">{inv.customer_email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-slate-400">{inv.stripe_invoice_id || inv.id}</td>
                              <td className="p-3 font-mono font-bold text-slate-100">
                                {formatCurrency(inv.amount_due, inv.currency || 'usd')}
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                                  inv.status === 'paid'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${inv.status === 'paid' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                  {inv.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleSendReminder(inv)}
                                  disabled={sendingId === inv.id || inv.status === 'paid'}
                                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    inv.status === 'paid'
                                      ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
                                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25'
                                  }`}
                                >
                                  {sendingId === inv.id ? 'Sending...' : 'Send Ping'}
                                </button>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------- SEQUENCE ENGINE TAB ---------- */}
              {activeTab === 'sequence' && (
                <div className="space-y-6">
                  <div className={`${glass} flex items-center justify-between p-6`}>
                    <div>
                      <h2 className="text-[18px] font-bold text-slate-100">Automated Follow-up Cadence</h2>
                      <p className="text-sm text-slate-400">Configure reminder intervals across email and messaging channels.</p>
                    </div>
                    <button
                      onClick={handleSaveSequence}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg shadow-blue-600/25 transition cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savedSuccess ? 'Saved!' : 'Save Cadence'}</span>
                    </button>
                  </div>

                  <div className="grid gap-4">
                    {sequences.map((seq, idx) => (
                      <div key={seq.id} className={`${glass} p-6 space-y-4`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs">
                              {seq.id}
                            </span>
                            <span className="font-bold text-slate-200">Day {seq.day} Follow-up</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={seq.enabled}
                            onChange={(e) => updateSequence(idx, { enabled: e.target.checked })}
                            className="w-4 h-4 accent-emerald-500 cursor-pointer"
                          />
                        </div>
                        <input
                          type="text"
                          value={seq.subject}
                          onChange={(e) => updateSequence(idx, { subject: e.target.value })}
                          className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-