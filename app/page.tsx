'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Clock, Send, Settings, BarChart3, RefreshCw, Calendar, CheckCircle, Save, Mail,
  AlertCircle, TrendingUp, TrendingDown, Globe2, Radar, Zap, Plug, Plus, ArrowDown, LayoutDashboard,
  Users, Layers, ExternalLink, Activity, ShieldCheck, Sparkles, MessageSquare, PhoneCall, Smartphone, Radio, Play
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

declare global {
  interface Window {
    Paddle?: any;
  }
}
type Tab = 'dashboard' | 'invoices' | 'sequence' | 'integrations' | 'team';
type Tone = 'friendly' | 'firm' | 'urgent' | 'executive';
type Channel = 'email' | 'whatsapp' | 'sms';

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
  
  // 👉 Place them here correctly:
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState({
    totalRecovered: 0,
    activeOverdue: 0,
    averageDSO: 0,
    projectedCashFlow: 0,
    recoveryRate: 90,
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "pro">("trial");
  const [email, setEmail] = useState("");

  // Simulator Modal State
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorChannel, setSimulatorChannel] = useState<Channel>('whatsapp');
  const [simulatorText, setSimulatorText] = useState('');

  const handleOpenSimulator = () => {
    setSimulatorText(
      `Hi Acme Corp,\n\nThis is an automated reminder from Qubi AI regarding invoice #INV-2024-03 for $4,250.00 which was due on Nov 01.\n\nSecure payment link: https://qubi.ai/pay/inv_9981a\n\nPlease settle to keep your account active.`
    );
    setShowSimulator(true);
  };

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
  const [xeroConnected, setXeroConnected] = useState<boolean>(false);

  useEffect(() => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('xero_connected') === 'true') {
      setXeroConnected(true);
      // 🔴 Are you setting mock/demo invoices here? Check if hardcoded invoices are being loaded back in!
    }
  }
}, []);

  // Sequence Configuration with AI Tone & Multi-Channel Selection
  const [sequences, setSequences] = useState([
    {
      id: 1, day: 3, enabled: true, tone: 'friendly' as Tone, channel: 'email' as Channel,
      subject: 'Friendly Reminder: Invoice {{invoice_id}} is due',
      body: 'Hi {{customer_name}},\n\nHope you are having a great week! This is a quick friendly note that invoice {{invoice_id}} for {{amount}} was due on {{due_date}}.\n\nYou can easily settle this online here: {{payment_link}}',
    },
    {
      id: 2, day: 7, enabled: true, tone: 'firm' as Tone, channel: 'whatsapp' as Channel,
      subject: 'Second Notice: Overdue Invoice {{invoice_id}}',
      body: 'Hi {{customer_name}},\n\nOur records show that invoice {{invoice_id}} ({{amount}}) remains unpaid. Please arrange for payment today to ensure your account remains in good standing.\n\nPayment Link: {{payment_link}}',
    },
    {
      id: 3, day: 14, enabled: false, tone: 'urgent' as Tone, channel: 'sms' as Channel,
      subject: 'URGENT: Final Notice for Invoice {{invoice_id}}',
      body: 'ATTENTION {{customer_name}},\n\nYour account is now 14 days overdue for invoice {{invoice_id}}. Immediate settlement is required to prevent account suspension or late fees.\n\nSettle immediately: {{payment_link}}',
    },
  ]);

  const tonePresets: Record<Tone, { label: string; color: string; subject: string; body: string }> = {
    friendly: {
      label: 'Friendly & Soft',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      subject: 'Friendly Reminder: Invoice {{invoice_id}} is due',
      body: 'Hi {{customer_name}},\n\nHope you are well! Just a gentle reminder that invoice {{invoice_id}} for {{amount}} was due on {{due_date}}.\n\nPay online: {{payment_link}}',
    },
    firm: {
      label: 'Firm & Professional',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      subject: 'Second Notice: Overdue Balance for Invoice {{invoice_id}}',
      body: 'Hi {{customer_name}},\n\nWe haven’t received payment for invoice {{invoice_id}} ({{amount}}). Please take a moment to settle this outstanding balance.\n\nPayment Link: {{payment_link}}',
    },
    urgent: {
      label: 'Urgent / Final Notice',
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      subject: 'URGENT NOTICE: Overdue Invoice {{invoice_id}}',
      body: 'ATTENTION {{customer_name}},\n\nYour account is now overdue for invoice {{invoice_id}} ({{amount}}). Please settle this balance immediately to avoid late fees or collection escalation.\n\nLink: {{payment_link}}',
    },
    executive: {
      label: 'Executive Escalation',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      subject: 'Overdue Account Review — Invoice {{invoice_id}}',
      body: 'Dear {{customer_name}},\n\nThis message is escalated regarding overdue invoice {{invoice_id}} ({{amount}}). Kindly reply to arrange payment or confirm transfer details.\n\nDirect settlement link: {{payment_link}}',
    },
  };

  const channelMeta: Record<Channel, { label: string; icon: any; color: string; badge: string }> = {
    email: { label: 'Email', icon: Mail, color: 'text-sky-400 border-sky-500/30 bg-sky-500/10', badge: 'Standard' },
    whatsapp: { label: 'WhatsApp', icon: PhoneCall, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', badge: 'Pro Channel' },
    sms: { label: 'SMS Ping', icon: Smartphone, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', badge: 'Pro Channel' },
  };

  const getRiskGrade = (id: string, status: string) => {
    if (status === 'paid') return { grade: 'Grade A', label: 'Fast Payer', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    const charCode = (id || 'a').charCodeAt(0);
    if (charCode % 3 === 0) return { grade: 'Grade C', label: 'Slow Payer', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    if (charCode % 5 === 0) return { grade: 'Grade F', label: 'High Risk', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    return { grade: 'Grade B', label: 'Reliable', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  };

  const applyTonePreset = (idx: number, newTone: Tone) => {
    const preset = tonePresets[newTone];
    setSequences((prev) =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, tone: newTone, subject: preset.subject, body: preset.body }
          : s
      )
    );
  };

  const setStepChannel = (idx: number, newChannel: Channel) => {
    setSequences((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, channel: newChannel } : s))
    );
  };

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

  useEffect(() => {
    if (!invoices || invoices.length === 0) {
      setMetrics({
        totalRecovered: 0,
        activeOverdue: 0,
        averageDSO: 0,
        projectedCashFlow: 0,
        recoveryRate: 0,
      });
      return;
    }

    let collected = 0;
    let outstanding = 0;
    const paidInvoices = invoices.filter((inv: any) => inv.status === 'paid');
    
    invoices.forEach((inv: any) => {
      const amount = Number(inv.amount_due || 0);
      if (inv.status === 'paid') {
        collected += amount;
      } else {
        outstanding += amount;
      }
    });

    const rate = invoices.length > 0 ? Math.round((paidInvoices.length / invoices.length) * 100) : 0;

    setMetrics({
      totalRecovered: collected,
      activeOverdue: outstanding,
      averageDSO: 0,
      projectedCashFlow: outstanding * 0.85,
      recoveryRate: rate,
    });
  }, [invoices]);

  const unpaid = useMemo(() => invoices.filter((i) => i.status === 'unpaid'), [invoices]);

  const [feed, setFeed] = useState<{ key: number; text: string; channel: Channel }[]>([]);
  const [target, setTarget] = useState<string>('Standing by…');
  
  useEffect(() => {
    if (!unpaid.length) { setTarget('All clear 🎉'); return; }
    let n = 0;
    const tick = () => {
      const inv = unpaid[n % unpaid.length];
      const activeSteps = sequences.filter((s) => s.enabled);
      const step = activeSteps[n % Math.max(1, activeSteps.length)];
      const currentChannel = step?.channel || 'email';
      setTarget(inv.customer_name);
      setFeed((f) => [
        {
          key: Date.now() + n,
          text: `Ping (${currentChannel.toUpperCase()}) → ${inv.customer_name} [Step ${step?.day || 3}]`,
          channel: currentChannel,
        },
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
    { id: 'invoices', label: 'Invoices & Portal', icon: Clock },
    { id: 'sequence', label: 'Sequence Engine', icon: Send },
    { id: 'integrations', label: 'Integrations', icon: Settings },
    { id: 'team', label: 'Staff & Tasks', icon: Users },
  ];

  const titles: Record<Tab, string> = {
    dashboard: 'Dashboard Overview',
    invoices: 'Invoices, Portal & Risk Scoring',
    sequence: 'AI Sequence & Channel Engine',
    integrations: 'Accounting Integrations',
    team: 'Staff Management & Tasks',
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

  const monthlyData = [
    { month: 'Jan', height: '30%' },
    { month: 'Feb', height: '45%' },
    { month: 'Mar', height: '60%' },
    { month: 'Apr', height: '52%' },
    { month: 'May', height: '80%' },
    { month: 'Jun', height: '72%' },
    { month: 'Jul', height: '95%' },
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex font-sans overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] rounded-full bg-lime-400/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      {/* LEFT SIDEBAR */}
      <aside className="relative z-20 w-64 border-r border-white/10 bg-slate-950/80 backdrop-blur-xl flex flex-col justify-between p-6 hidden md:flex">
        <div className="space-y-8">
          <div className="flex items-center space-x-3">
            <RobotLogo size={40} />
            <div className="leading-tight">
              <span className="text-[22px] font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Qubi</span>
                <span className="bg-gradient-to-r from-lime-300 to-green-500 bg-clip-text text-transparent"> AI</span>
              </span>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Autonomous Revenue</div>
            </div>
          </div>

          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-2">
            <div className="text-xs text-slate-400 font-medium">14-Day Free Trial</div>
            <div className="text-sm font-bold text-emerald-400">Pro $15/mo</div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative z-10">
        <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-xl px-8 py-4 flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-slate-100">{titles[activeTab]}</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleOpenSimulator}
              className="flex items-center space-x-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-lg shadow-blue-600/10"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Test AI Dispatch</span>
            </button>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Start 14-Day Free Trial
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
  
  
  {/* Hide trial banner once authenticated */}
  {!isAuthenticated && (
    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl backdrop-blur-md">
      <div className="flex items-center space-x-2.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-semibold text-emerald-300">
          14-Day Free Trial active — Risk Scoring & Simulator online. Upgrade to Pro ($15/mo) for WhatsApp automation.
        </span>
      </div>
      <button
        onClick={() => setShowAuthModal(true)}
        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer"
      >
        Unlock Pro ($15/mo) →
      </button>
    </div>
  )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* OVERVIEW */}
              {activeTab === 'dashboard' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div variants={fadeUp} initial="hidden" animate="show" className={`${glass} p-8 relative overflow-hidden`}>
                      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-emerald-500/20 to-transparent blur-3xl" />
                      <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Total Recovered</div>
                      <div className="text-[44px] font-extrabold tracking-tight text-emerald-400 mb-2">
                        {formatCurrency(metrics.totalRecovered, invoices[0]?.currency || 'usd')}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-slate-400 pt-2 border-t border-white/5">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> +18.7% vs last month
                        </span>
                        <span>•</span>
                        <span>{metrics.averageDSO} days avg DSO</span>
                      </div>
                    </motion.div>

                    <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className={`${glass} p-8 relative overflow-hidden flex flex-col justify-between`}>
                      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-blue-500/20 to-transparent blur-3xl" />
                      <div>
                        <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Recovery Rate</div>
                        <div className="text-[44px] font-extrabold tracking-tight text-blue-400 mb-2">
                          {metrics.recoveryRate}%
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-slate-400 pt-2 border-t border-white/5">
                        <span className="text-blue-400 font-bold">+3.2% conversion rate</span>
                        <span>•</span>
                        <span>{invoices.length} active invoices tracked</span>
                      </div>
                    </motion.div>
                  </div>

                  {/* MULTI-CHANNEL DISTRIBUTION BREAKDOWN WIDGET */}
                  <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2} className={`${glass} p-6 space-y-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                          <Radio className="w-4 h-4 text-lime-400" /> Active Communication Channels
                        </h2>
                        <p className="text-xs text-slate-400">Live dispatch share across reminder channels</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('sequence')}
                        className="text-xs text-blue-400 font-semibold hover:underline cursor-pointer"
                      >
                        Configure Channels →
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-sky-500/20 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-sky-400" /> Email
                          </span>
                          <span className="text-xs font-mono font-bold text-sky-400">60%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                          <div className="bg-sky-400 h-full w-[60%]" />
                        </div>
                      </div>

                      <div className="bg-slate-950/60 p-4 rounded-xl border border-emerald-500/20 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400">30%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                          <div className="bg-emerald-400 h-full w-[30%]" />
                        </div>
                      </div>

                      <div className="bg-slate-950/60 p-4 rounded-xl border border-purple-500/20 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-purple-400" /> SMS
                          </span>
                          <span className="text-xs font-mono font-bold text-purple-400">10%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                          <div className="bg-purple-400 h-full w-[10%]" />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className={`${glass} p-6 space-y-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-slate-100">Recovery Over Time</h2>
                        <p className="text-xs text-slate-400">Monthly breakdown of automated payment recovery performance</p>
                      </div>
                    </div>
                    <div className="h-44 flex items-end justify-between gap-4 pt-6 px-4 border-b border-white/5 pb-2">
                      {monthlyData.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="w-full bg-slate-800/60 rounded-t-lg relative flex items-end overflow-hidden" style={{ height: '120px' }}>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: d.height }}
                              transition={{ duration: 0.8, delay: i * 0.08 }}
                              className="w-full bg-gradient-to-t from-blue-600 to-lime-400 rounded-t-lg group-hover:from-blue-500 group-hover:to-lime-300 transition-all"
                            />
                          </div>
                          <span className="text-xs font-mono text-slate-400">{d.month}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className={`${glass} p-6 grid md:grid-cols-[auto_1fr] gap-8 items-center`}>
                    <div className="relative w-48 h-48 mx-auto">
                      <div className="absolute inset-0 rounded-full border border-lime-400/30 bg-slate-950/60" />
                      <div className="absolute inset-8 rounded-full border border-lime-400/20" />
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ background: 'conic-gradient(from 0deg, rgba(163,230,53,0.35), transparent 25%)' }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.div
                        className="absolute inset-0 m-auto w-14 h-14 rounded-full overflow-hidden ring-2 ring-lime-400/70 shadow-[0_0_24px_rgba(163,230,53,0.45)] bg-blue-700"
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
                        <h2 className="text-[17px] font-bold text-slate-100">AI Bot Dispatch Status</h2>
                        <span className="ml-2 inline-flex items-center gap-1.5 text-xs font-bold text-lime-300 bg-lime-400/10 border border-lime-400/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" /> ONLINE
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Active targeting focus: <span className="text-lime-300 font-semibold">{target}</span>
                      </div>
                      <div className="space-y-2 h-28 overflow-hidden">
                        <AnimatePresence initial={false}>
                          {feed.map((f, i) => (
                            <motion.div
                              key={f.key}
                              layout
                              initial={{ opacity: 0, x: -16 }}
                              animate={{ opacity: 1 - i * 0.2, x: 0 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-2 text-xs font-mono bg-slate-950/60 border border-white/5 rounded-lg px-3 py-1.5 text-slate-300"
                            >
                              <Zap className="w-3 h-3 text-lime-400 shrink-0" />
                              <span className="truncate">{f.text}</span>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}

              {/* INVOICES WITH CUSTOMER RISK SCORING (A-F GRADING) */}
              {activeTab === 'invoices' && (
                <div className={`${glass} p-6 space-y-6`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-base font-bold text-slate-100">Invoices, Client Portal & Risk Grading</h2>
                      <p className="text-xs text-slate-400">Review payer risk scores (A–F) and manage client billing links.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-slate-400 uppercase font-bold tracking-wider text-xs">
                        <tr className="border-b border-white/10">
                          <th className="p-3">Customer</th>
                          <th className="p-3">Payer Risk Score</th>
                          <th className="p-3">Invoice ID</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Portal Link</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500">
                              {loading ? 'Fetching invoices...' : 'No invoices found.'}
                            </td>
                          </tr>
                        ) : (
                          invoices.map((inv, i) => {
                            const risk = getRiskGrade(inv.id, inv.status);
                            return (
                              <motion.tr
                                key={inv.id}
                                className="border-b border-white/5 hover:bg-white/[0.04] transition group text-xs"
                              >
                                <td className="p-3 font-semibold text-slate-200">
                                  <div>{inv.customer_name}</div>
                                  <div className="text-[11px] text-slate-500 font-normal">{inv.customer_email}</div>
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${risk.color}`}>
                                    <ShieldCheck className="w-3 h-3" />
                                    {risk.grade} ({risk.label})
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-slate-400">{inv.stripe_invoice_id || inv.id}</td>
                                <td className="p-3 font-mono font-bold text-slate-100">
                                  {formatCurrency(inv.amount_due, inv.currency || 'usd')}
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                                    inv.status === 'paid'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}>
                                    {inv.status}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <button
                                    onClick={() => alert(`Client Portal URL generated for ${inv.customer_name}`)}
                                    className="flex items-center space-x-1 text-blue-400 hover:underline cursor-pointer"
                                  >
                                    <span>Portal Link</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => handleSendReminder(inv)}
                                    disabled={sendingId === inv.id || inv.status === 'paid'}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                      inv.status === 'paid'
                                        ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                                  >
                                    {sendingId === inv.id ? 'Sending...' : 'Send Ping'}
                                  </button>
                                </td>
                              </motion.tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SEQUENCE ENGINE */}
              {activeTab === 'sequence' && (
                <div className="space-y-6">
                  <div className={`${glass} flex items-center justify-between p-6`}>
                    <div>
                      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-lime-400" /> AI Sequence & Multi-Channel Engine
                      </h2>
                      <p className="text-xs text-slate-400">Configure reminder intervals, AI personas, and dispatch channels.</p>
                    </div>
                    <button
                      onClick={handleSaveSequence}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savedSuccess ? 'Saved!' : 'Save Cadence'}</span>
                    </button>
                  </div>

                  <div className="grid gap-6">
                    {sequences.map((seq, idx) => (
                      <div key={seq.id} className={`${glass} p-6 space-y-4`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs">
                              {seq.id}
                            </span>
                            <span className="font-bold text-slate-200 text-sm">Day {seq.day} Automated Step</span>
                          </div>
                          <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                            <span>Active</span>
                            <input
                              type="checkbox"
                              checked={seq.enabled}
                              onChange={(e) => updateSequence(idx, { enabled: e.target.checked })}
                              className="w-4 h-4 accent-emerald-500 cursor-pointer"
                            />
                          </label>
                        </div>

                        {/* CHANNEL TOGGLE */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5 text-lime-400" /> Dispatch Channel:
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['email', 'whatsapp', 'sms'] as Channel[]).map((cKey) => {
                              const CIcon = channelMeta[cKey].icon;
                              const isSelected = seq.channel === cKey;
                              return (
                                <button
                                  key={cKey}
                                  type="button"
                                  onClick={() => setStepChannel(idx, cKey)}
                                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? channelMeta[cKey].color + ' ring-1 ring-white/20'
                                      : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <CIcon className="w-3.5 h-3.5" />
                                    <span>{channelMeta[cKey].label}</span>
                                  </div>
                                  <span className="text-[10px] opacity-75 font-normal">{channelMeta[cKey].badge}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* TONE SELECTOR */}
                        <div className="space-y-2 pt-2">
                          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-lime-400" /> AI Tone Persona:
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {(['friendly', 'firm', 'urgent', 'executive'] as Tone[]).map((tKey) => (
                              <button
                                key={tKey}
                                type="button"
                                onClick={() => applyTonePreset(idx, tKey)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-left cursor-pointer ${
                                  seq.tone === tKey
                                    ? tonePresets[tKey].color + ' ring-1 ring-white/20'
                                    : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <div>{tonePresets[tKey].label}</div>
                                {seq.tone === tKey && <span className="text-[10px] opacity-75 font-normal">Active Preset</span>}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Subject Line</label>
                            <input
                              type="text"
                              value={seq.subject}
                              onChange={(e) => updateSequence(idx, { subject: e.target.value })}
                              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Message Template Body</label>
                            <textarea
                              rows={3}
                              value={seq.body}
                              onChange={(e) => updateSequence(idx, { body: e.target.value })}
                              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-sans"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* INTEGRATIONS WITH FUNCTIONAL XERO & QUICKBOOKS BUTTONS */}
              {activeTab === 'integrations' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`${glass} p-6 space-y-4`}>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                      QB
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-100">QuickBooks Online</h2>
                      <p className="text-xs text-slate-400">Sync invoices and financial records seamlessly.</p>
                    </div>
                    <button
                      onClick={() => {
                        window.location.href = '/api/auth/quickbooks';
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer"
                    >
                      {qbdConnected ? "Connected" : "Connect QuickBooks"}
                    </button>
                  </div>

                  <div className={`${glass} p-6 space-y-4`}>
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold">
                      Xero
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-100">Xero Accounting</h2>
                      <p className="text-xs text-slate-400">Automate collection triggers for Xero books.</p>
                    </div>
                    <button
                      onClick={() => {
                        window.location.href = '/api/auth/xero';
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer"
                    >
                      {xeroConnected ? "Connected" : "Connect Xero"}
                    </button>
                  </div>

                  <div className={`${glass} p-6 space-y-4`}>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                      MYOB
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-100">MYOB Business</h2>
                      <p className="text-xs text-slate-400">Enterprise ledger integration for SME teams.</p>
                    </div>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer"
                    >
                      Connect MYOB
                    </button>
                  </div>
                </div>
              )}

              {/* STAFF & TASKS */}
              {activeTab === 'team' && (
                <div className={`${glass} p-6 space-y-6`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-base font-bold text-slate-100">Staff & Collection Tasks</h2>
                      <p className="text-xs text-slate-400">Assign specific accounts to collection officers and track resolution diary.</p>
                    </div>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                    >
                      + Assign Staff User
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                        <span>Task: Manual Phone Escalation</span>
                        <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Pending</span>
                      </div>
                      <p className="text-xs text-slate-400">Account: Acme Ltd • Assigned to: Sarah (Finance Lead)</p>
                    </div>

                    <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                        <span>Task: Payment Plan Review</span>
                        <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Completed</span>
                      </div>
                      <p className="text-xs text-slate-400">Account: Tech Solutions • Assigned to: Alex (Accounts)</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ---------- TEST PING SIMULATOR MODAL ---------- */}
      {showSimulator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${glass} max-w-lg w-full p-6 space-y-6 relative`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-lime-400" />
                <h2 className="text-lg font-bold text-slate-100">AI Dispatch Simulator</h2>
              </div>
              <button
                onClick={() => setShowSimulator(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex space-x-2 bg-slate-950/60 p-1 rounded-xl border border-white/10">
              {(['whatsapp', 'email', 'sms'] as Channel[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setSimulatorChannel(c);
                    if (c === 'whatsapp') {
                      setSimulatorText(`*Qubi AI Notice*\n\nHi Acme Corp,\n\nInvoice #INV-2024-03 ($4,250.00) is now due. Tap below to pay instantly:\n🔗 https://qubi.ai/pay/inv_9981a`);
                    } else if (c === 'email') {
                      setSimulatorText(`Subject: Friendly Reminder: Invoice #INV-2024-03 is due\n\nHi Acme Corp,\n\nThis is a friendly reminder that your balance of $4,250.00 is due. You can complete payment here: https://qubi.ai/pay/inv_9981a`);
                    } else {
                      setSimulatorText(`[Qubi AI] Reminder: Invoice #INV-2024-03 ($4,250.00) is due. Pay now: https://qubi.ai/pay/inv_9981a`);
                    }
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                    simulatorChannel === c ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-white/10 font-mono text-xs text-slate-300 whitespace-pre-wrap">
              {simulatorText}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  alert("Simulated test ping successfully dispatched to sandbox!");
                  setShowSimulator(false);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Send Test Ping Now
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ---------- AUTH & UPGRADE MODAL ---------- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${glass} max-w-md w-full p-6 space-y-6 relative`}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-100">Qubi AI — Select Plan</h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setSelectedPlan("trial")}
                className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                  selectedPlan === "trial" ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                14-Day Free Trial
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlan("pro")}
                className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                  selectedPlan === "pro" ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pro Tier ($15/mo)
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

       {/* Password Input Field */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Error Message Box */}
            {authError && (
              <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                {authError}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (selectedPlan === 'pro') {
                  handlePaddleCheckout();
                } else {
                  if (!email || !password) {
                    setAuthError('Please enter both email and password.');
                    return;
                  }
                  setIsAuthenticated(true);
                  setInvoices([]); // Clears demo invoices for a clean workspace!
                  setShowAuthModal(false);
                  setAuthError(null);
                }
              }}
                className={`w-full py-3 text-xs font-bold rounded-xl transition cursor-pointer ${
                  selectedPlan === 'pro'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {selectedPlan === 'pro' ? 'Upgrade to Pro — $15/mo' : 'Start 14-Day Free Trial'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}