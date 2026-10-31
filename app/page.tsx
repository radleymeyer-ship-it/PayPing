'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Clock, Send, Settings, BarChart3, RefreshCw, Calendar, CheckCircle, Save, Mail,
  AlertCircle, TrendingUp, TrendingDown, Globe2, Radar, Zap, Plug, Plus, ArrowDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';


type Tab = 'dashboard' | 'invoices' | 'sequence' | 'integrations';

/* ---------- Robot logo (uses /paypring-robot.png from /public) ---------- */
function RobotLogo({ size = 44 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-tr from-blue-500 to-lime-400 opacity-60 blur-md animate-pulse" />
      {failed ? (
        <div className="relative w-full h-full rounded-xl bg-gradient-to-tr from-blue-700 to-lime-500 flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/paypring-robot.png"
          alt="PayPing robot"
          ref={(el) => { if (el && el.complete && el.naturalWidth === 0) setFailed(true); }}
          onError={() => setFailed(true)}
          className="relative w-full h-full rounded-xl object-cover ring-1 ring-white/20"
        />
      )}
      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-lime-400 ring-2 ring-slate-950 animate-ping" />
      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-lime-400 ring-2 ring-slate-950" />
    </motion.div>
  );
}

/* ---------- Shared glass card ---------- */
const glass =
  'bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_40px_-12px_rgba(59,130,246,0.25)]';

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

  // QuickBooks Connection State Check
  const [qbdConnected, setQbdConnected] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('qbd_connected') === 'true') {
        setQbdConnected(true);
      }
    }
  }, []);

  // Sequence Configuration State
  const [sequences, setSequences] = useState([
    {
      id: 1, day: 3, enabled: true,
      subject: 'Friendly Reminder: Invoice {{invoice_id}} is due',
      body: 'Hi {{customer_name}},\n\nThis is a friendly reminder that invoice {{invoice_id}} for {{amount}} was due on {{due_date}}.\n\nYou can complete payment here: {{payment_link}}\n\nThanks,\nPayPing Automated Billing',
    },
    {
      id: 2, day: 7, enabled: true,
      subject: 'Second Notice: Overdue Invoice {{invoice_id}}',
      body: 'Hi {{customer_name}},\n\nWe haven’t received payment for invoice {{invoice_id}} ({{amount}}). Please take a moment to settle this outstanding balance.\n\nPayment Link: {{payment_link}}\n\nBest regards,',
    },
    {
      id: 3, day: 14, enabled: false,
      subject: 'URGENT: Final Notice for Invoice {{invoice_id}}',
      body: 'Hi {{customer_name}},\n\nYour account is now 14 days overdue for invoice {{invoice_id}}. Please remit payment immediately to avoid service interruption.\n\nLink: {{payment_link}}',
    },
  ]);

  // Fetch invoices from live Supabase DB
  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvoices(data);

      // --- Compute Financial Aging Metrics ---
      const now = new Date();
      let collected = 0;
      let outstanding = 0;
      let current = 0;
      let overdue30 = 0;
      let overduePlus = 0;

      data.forEach((inv: any) => {
        const amount = Number(inv.amount_due || 0);
        if (inv.status === 'paid') {
          collected += amount;
        } else {
          outstanding += amount;
          if (!inv.due_date) {
            current += amount;
            return;
          }
          const dueDate = new Date(inv.due_date);
          const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 0) current += amount;
          else if (diffDays <= 30) overdue30 += amount;
          else overduePlus += amount;
        }
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSaveSequence = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const updateSequence = (idx: number, patch: Partial<(typeof sequences)[number]>) =>
    setSequences((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  // Trigger automated reminder via API route
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

  // Calculate live stats

  const totalRecoveredCents = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((acc, inv) => acc + Number(inv.amount_due || 0), 0);

  const activeOverdueCents = invoices
    .filter((inv) => inv.status === 'unpaid')
    .reduce((acc, inv) => acc + inv.amount_due, 0);

  const unpaid = useMemo(() => invoices.filter((i) => i.status === 'unpaid'), [invoices]);
  const currencies = useMemo(
    () => Array.from(new Set(invoices.map((i) => (i.currency || 'usd').toUpperCase()))),
    [invoices]
  );
  const recoveryRate = invoices.length
    ? Math.round((invoices.filter((i) => i.status === 'paid').length / invoices.length) * 100)
    : 0;

  
  // Simulated live dispatch feed (cycles through unpaid invoices)
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
    { id: 'dashboard', label: 'Overview', icon: BarChart3 },
    { id: 'invoices', label: 'Invoices', icon: Clock },
    { id: 'sequence', label: 'Sequence Engine', icon: Send },
    { id: 'integrations', label: 'Integrations', icon: Settings },
  ];

  const titles: Record<Tab, string> = {
    dashboard: 'Overview', invoices: 'Invoices', sequence: 'Sequence Engine', integrations: 'Integrations',
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Ambient glows + grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] rounded-full bg-lime-400/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center space-x-3">
          <RobotLogo />
          <div className="leading-tight">
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Pay</span>
              <span className="bg-gradient-to-r from-lime-300 to-green-500 bg-clip-text text-transparent">Ping</span>
            </span>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Your invoice reminder bot</div>
          </div>
        </div>

        <nav className="flex space-x-1 bg-slate-900/80 border border-white/10 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={'relative px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition ' + (activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-white')}
            >
              {activeTab === tab.id && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-600/30"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <tab.icon className="relative w-4 h-4" />
              <span className="relative hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-100">{titles[activeTab]}</h1>
          <button
  onClick={async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sync/quickbooks', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully synced ${data.count} invoices from QuickBooks!`);
        fetchInvoices(); // Refresh the table list
      } else {
        alert('Sync failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Sync error occurred.');
    } finally {
      setLoading(false);
    }
  }}
  disabled={loading}
  className="flex items-center space-x-1.5 text-xs bg-slate-900/70 backdrop-blur border border-white/10 px-3 py-2 rounded-lg hover:bg-slate-800 transition"
>
  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
  <span>{loading ? 'Syncing...' : 'Sync Live DB'}</span>
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
            {/* ---------- OVERVIEW ---------- */}
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
  {
    label: 'Total Recovered',
    value: formatCurrency(metrics.totalRecovered, invoices[0]?.currency || 'usd'),
    color: 'text-emerald-400',
    glow: 'from-emerald-500/20',
    badge: `${metrics.averageDSO}d avg DSO`,
    up: true,
  },
  {
    label: 'Active Overdue',
    value: formatCurrency(metrics.activeOverdue, invoices[0]?.currency || 'usd'),
    color: 'text-amber-400',
    glow: 'from-amber-500/20',
    badge: `${formatCurrency(metrics.projectedCashFlow, invoices[0]?.currency || 'usd')} 30d proj`,
    up: false,
  },
  {
    label: 'Currencies',
    value: currencies.length ? currencies.join(' · ') : '-',
    color: 'text-sky-400',
    glow: 'from-sky-500/20',
    badge: `${invoices.length} rows synced`,
    up: true,
    globe: true,
  },
                  ].map((c, i) => (
                    <motion.div
                      key={c.label} variants={fadeUp} initial="hidden" animate="show" custom={i}
                      whileHover={{ y: -4 }}
                      className={`${glass} relative overflow-hidden p-5`}
                    >
                      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${c.glow} to-transparent blur-2xl`} />
                      <div className="relative flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">{c.label}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          c.up ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {c.globe ? <Globe2 className="w-3 h-3" /> : c.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {c.badge}
                        </span>
                      </div>
                      <div className={`relative text-3xl font-extrabold tracking-tight mt-3 ${c.color}`}>{c.value}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Bot Dispatch Radar */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className={`${glass} p-6 grid md:grid-cols-[auto_1fr] gap-8 items-center`}>
                  <div className="relative w-56 h-56 mx-auto">
                    <div className="absolute inset-0 rounded-full border border-lime-400/30 bg-slate-950/60" />
                    <div className="absolute inset-8 rounded-full border border-lime-400/20" />
                    <div className="absolute inset-16 rounded-full border border-lime-400/10" />
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="absolute inset-0 rounded-full border-2 border-lime-400/60"
                        initial={{ scale: 0.1, opacity: 0.8 }}
                        animate={{ scale: 1, opacity: 0 }}
                        transition={{ duration: 3, repeat: Infinity, delay: i, ease: 'easeOut' }}
                      />
                    ))}
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'conic-gradient(from 0deg, rgba(163,230,53,0.35), transparent 25%)' }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    />
                    {unpaid.slice(0, 5).map((inv, i) => {
                      const a = (i / 5) * Math.PI * 2 + 0.6;
                      const r = 28 + (i % 3) * 16;
                      return (
                        <motion.span
                          key={inv.id}
                          className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]"
                          style={{ left: `${50 + r * Math.cos(a)}%`, top: `${50 + r * Math.sin(a)}%` }}
                          animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                        />
                      );
                    })}
                    <motion.div
                      className="absolute inset-0 m-auto w-16 h-16 rounded-full overflow-hidden ring-2 ring-lime-400/70 shadow-[0_0_24px_rgba(163,230,53,0.45)] bg-blue-700"
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/paypring-robot.png" alt="PayPing bot" className="w-full h-full object-cover scale-110" />
                    </motion.div>
                  </div>

                  <div className="space-y-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <Radar className="w-4 h-4 text-lime-400" />
                      <h2 className="text-sm font-bold text-slate-100">AI Bot Dispatch Status</h2>
                      <span className="ml-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-lime-300 bg-lime-400/10 border border-lime-400/20 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" /> ONLINE
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Scanning for overdue invoices · currently targeting{' '}
                      <span className="text-lime-300 font-semibold">{target}</span>
                    </div>
                    <div className="space-y-2 h-[10.5rem] overflow-hidden">
                      <AnimatePresence initial={false}>
                        {feed.map((f, i) => (
                          <motion.div
                            key={f.key}
                            layout
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1 - i * 0.2, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 text-xs font-mono bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2 text-slate-300"
                          >
                            <Zap className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                            <span className="truncate">{f.text}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Supabase Live ({invoices.length} Rows)
                    </div>
                  </div>
                </motion.div>
              </>
            )}

            {/* ---------- INVOICES ---------- */}
            {activeTab === 'invoices' && (
              <div className={`${glass} p-4 sm:p-6 space-y-4`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
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
                            {loading ? 'Fetching from Supabase...' : 'No invoices found.'}
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
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-lime-500 flex items-center justify-center text-[11px] font-bold text-white">
                                  {(inv.customer_name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  {inv.customer_name}
                                  <div className="text-[10px] text-slate-500 font-normal">{inv.customer_email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-slate-400">{inv.stripe_invoice_id}</td>
                            <td className="p-3 font-mono font-bold text-slate-100">
                              {formatCurrency(inv.amount_due, inv.currency || 'usd')}
                              <span className="ml-1.5 text-[9px] text-slate-500 font-sans">{(inv.currency || 'usd').toUpperCase()}</span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  inv.status === 'paid'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${inv.status === 'paid' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <motion.button
                                whileHover={inv.status !== 'paid' ? { scale: 1.05 } : undefined}
                                whileTap={inv.status !== 'paid' ? { scale: 0.95 } : undefined}
                                onClick={() => handleSendReminder(inv)}
                                disabled={sendingId === inv.id || inv.status === 'paid'}
                                className={`relative inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                                  inv.status === 'paid'
                                    ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-lime-500 text-white shadow-lg shadow-blue-600/25'
                                }`}
                              >
                                {sendingId === inv.id && (
                                  <span className="absolute inset-0 rounded-lg bg-blue-400/40 animate-ping" />
                                )}
                                <Mail className={`relative w-3.5 h-3.5 ${sendingId === inv.id ? 'animate-bounce' : ''}`} />
                                <span className="relative">{sendingId === inv.id ? 'Sending...' : 'Send Ping'}</span>
                              </motion.button>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <AnimatePresence>
                  {sendStatus && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                        sendStatus.success
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {sendStatus.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>{sendStatus.message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ---------- SEQUENCE ENGINE ---------- */}
            {activeTab === 'sequence' && (
              <div className="space-y-6">
                <div className={`${glass} flex items-center justify-between p-4`}>
                  <div>
                    <h2 className="text-sm font-bold text-slate-100">Automated Ping Cadence</h2>
                    <p className="text-xs text-slate-400">Configure reminder intervals and template text dispatches.</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveSequence}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-lime-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg shadow-blue-600/25 transition"
                  >
                    {savedSuccess ? <CheckCircle className="w-4 h-4 text-lime-200" /> : <Save className="w-4 h-4" />}
                    <span>{savedSuccess ? 'Saved Rules!' : 'Save Cadence'}</span>
                  </motion.button>
                </div>

                <div className="relative pl-0 md:pl-14 space-y-2">
                  {/* Trigger node */}
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <div className="hidden md:flex absolute left-0 w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="font-semibold">Trigger:</span>
                    <span className="text-slate-400">Invoice passes its due date</span>
                  </div>

                  {sequences.map((seq, idx) => (
                    <motion.div key={seq.id} variants={fadeUp} initial="hidden" animate="show" custom={idx} className="relative">
                      <div className="flex justify-center md:justify-start md:absolute md:-left-14 md:w-10 py-1 md:py-0 md:h-full">
                        <div className="flex md:flex-col items-center">
                          <ArrowDown className="w-4 h-4 text-slate-600 md:mb-1" />
                          <div className={`hidden md:block flex-1 w-px ${seq.enabled ? 'bg-gradient-to-b from-blue-500/60 to-lime-400/40' : 'bg-slate-700'}`} />
                        </div>
                      </div>
                      <div className={`${glass} p-5 space-y-3 transition ${seq.enabled ? '' : 'opacity-60'}`}>
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="flex items-center space-x-3">
                            <div className="relative bg-blue-500/10 text-blue-400 p-2 rounded-lg border border-blue-500/20">
                              <Calendar className="w-4 h-4" />
                              <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-lime-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-200">Ping Step #{idx + 1}</span>
                              <div className="text-[11px] text-slate-400">Triggers {seq.day} days after due date</div>
                            </div>
                          </div>
                          <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300">
                            <span>{seq.enabled ? 'Active' : 'Paused'}</span>
                            <span className={`relative w-9 h-5 rounded-full transition ${seq.enabled ? 'bg-lime-500' : 'bg-slate-700'}`}>
                              <motion.span
                                layout
                                className="absolute top-0.5 w-4 h-4 rounded-full bg-white"
                                style={{ left: seq.enabled ? '11px' : '2px' }}
                                animate={{ x: seq.enabled ? 16 : 0 }}
                              />
                              <input
                                type="checkbox"
                                checked={seq.enabled}
                                onChange={(e) => updateSequence(idx, { enabled: e.target.checked })}
                                className="sr-only"
                              />
                            </span>
                          </label>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold text-slate-400 uppercase">Subject Template</label>
                          <input
                            type="text"
                            value={seq.subject}
                            onChange={(e) => updateSequence(idx, { subject: e.target.value })}
                            className="w-full bg-slate-950/70 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold text-slate-400 uppercase">Message Body</label>
                          <textarea
                            rows={4}
                            value={seq.body}
                            onChange={(e) => updateSequence(idx, { body: e.target.value })}
                            className="w-full bg-slate-950/70 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition font-mono"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  <div className="flex items-center gap-3 text-xs text-slate-300 pt-2">
                    <div className="hidden md:flex absolute left-0 w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="font-semibold">Goal:</span>
                    <span className="text-slate-400">Invoice paid — sequence stops automatically</span>
                  </div>
                </div>
              </div>
            )}

            {/* ---------- INTEGRATIONS ---------- */}
            {activeTab === 'integrations' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'Stripe', desc: 'Sync invoices & payment links in real time.', status: 'Connected', href: '#', color: 'from-violet-600 to-indigo-600' },
                  { name: 'Supabase', desc: `Live database · ${invoices.length} invoice rows.`, status: 'Connected', href: '#', color: 'from-emerald-600 to-green-500' },
                  { name: 'QuickBooks', desc: 'Import overdue invoices from your books.', status: qbdConnected ? 'Connected' : 'Connect', href: '/api/auth/quickbooks', color: 'from-green-600 to-lime-500' },
                  { name: 'WhatsApp', desc: 'Send automated pings over WhatsApp via Twilio.', status: 'Connected', href: '#', color: 'from-emerald-500 to-teal-400' },
                ].map((it, i) => {
                  return (
                    <motion.div
                      key={it.name}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      custom={i}
                      whileHover={{ y: -4 }}
                      className={`${glass} p-5 flex items-start gap-4`}
                    >
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${it.color} flex items-center justify-center shrink-0`}>
                        <Plug className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-100">{it.name}</span>
                          <a
                            href={it.href}
                            className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                              it.status === 'Connect'
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            }`}
                          >
                            {it.status}
                          </a>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{it.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}