'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, Users,
  AlertTriangle, CheckCircle2, Clock, Truck, BarChart3, PieChart,
  Utensils, Receipt, Star, ArrowUpRight, ArrowDownRight, Zap,
  Calendar, Activity, Target, Award, Building2, FileText, Loader2,
  RefreshCw, Boxes, UserCheck, ShoppingBag, CreditCard, Wallet,
  ChefHat, TrendingUp as Trend, Minus, AlertCircle, Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function fmtBRL(v: number) {
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtShort(v: number) {
  if (v >= 1_000_000) return `R$ ${(v/1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v/1_000).toFixed(1)}k`;
  return `R$ ${fmtBRL(v)}`;
}
function fmtDate(s: string) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

type TabId    = 'overview' | 'cardapio' | 'financeiro' | 'compras' | 'alertas';
type PeriodMode = 'day' | 'month' | 'year';

function defaultValue(mode: PeriodMode): string {
  const now = new Date();
  if (mode === 'day')   return now.toISOString().split('T')[0];
  if (mode === 'year')  return String(now.getFullYear());
  return now.toISOString().substring(0, 7);
}

function periodDisplayLabel(mode: PeriodMode, value: string): string {
  if (mode === 'day') {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  if (mode === 'year') return value;
  const [y, m] = value.split('-');
  return `${PT_MONTHS[parseInt(m) - 1]} de ${y}`;
}

export default function Dashboard() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<TabId>('overview');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [periodMode,  setPeriodMode]  = useState<PeriodMode>('month');
  const [periodValue, setPeriodValue] = useState<string>(() => defaultValue('month'));

  const load = useCallback(async (mode?: PeriodMode, val?: string) => {
    const m = mode  ?? periodMode;
    const v = val   ?? periodValue;
    setLoading(true);
    try {
      const res  = await fetch(`/api/dashboard?period=${m}&value=${encodeURIComponent(v)}`, { cache: 'no-store' });
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMode, periodValue]);

  useEffect(() => { load(); }, [load]);

  const changePeriodMode = (mode: PeriodMode) => {
    const val = defaultValue(mode);
    setPeriodMode(mode);
    setPeriodValue(val);
    load(mode, val);
  };

  const changePeriodValue = (val: string) => {
    setPeriodValue(val);
    load(periodMode, val);
  };

  const now   = new Date();
  const month = PT_MONTHS[now.getMonth()];
  const year  = now.getFullYear();

  if (loading && !data) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
        <p className="text-muted text-sm">Carregando painel...</p>
      </div>
    </div>
  );

  const d = data || {};
  const cm = d.currentMonth || {};

  const profit = (Number(cm.revenue) || 0) - (Number(cm.expenses) || 0) - (Number(cm.purchases) || 0);
  const profitMargin = Number(cm.revenue) > 0 ? (profit / Number(cm.revenue)) * 100 : 0;

  return (
    <div className="space-y-8 animate-fade-in max-w-[1700px] mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Painel de Controle
          </h1>
          <p className="text-muted mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            {periodDisplayLabel(periodMode, periodValue)} — visão operacional completa
          </p>
        </div>

        {/* ── Period filter ───────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode toggles */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            {(['day','month','year'] as PeriodMode[]).map(m => (
              <button
                key={m}
                onClick={() => changePeriodMode(m)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  periodMode === m
                    ? "bg-primary text-white shadow"
                    : "text-muted hover:text-white"
                )}
              >
                {m === 'day' ? 'Dia' : m === 'month' ? 'Mês' : 'Ano'}
              </button>
            ))}
          </div>

          {/* Value picker */}
          {periodMode === 'day' && (
            <input
              type="date"
              value={periodValue}
              onChange={e => e.target.value && changePeriodValue(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-primary/50 hover:border-white/20 transition-all"
            />
          )}
          {periodMode === 'month' && (
            <input
              type="month"
              value={periodValue}
              onChange={e => e.target.value && changePeriodValue(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-primary/50 hover:border-white/20 transition-all"
            />
          )}
          {periodMode === 'year' && (
            <select
              value={periodValue}
              onChange={e => changePeriodValue(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-primary/50 hover:border-white/20 transition-all appearance-none"
            >
              {Array.from({ length: 5 }, (_, i) => String(year - i)).map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          )}

          <span className="text-[10px] text-slate-600 font-mono hidden md:block">
            Atualizado {lastRefresh.toLocaleTimeString('pt-BR')}
          </span>
          <button
            onClick={() => load()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm font-bold text-muted hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Atualizar
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      {(() => {
        const pLabel = periodMode === 'day' ? 'do Dia' : periodMode === 'year' ? 'do Ano' : 'do Mês';
        const prevLabel = periodMode === 'day' ? 'dia anterior' : periodMode === 'year' ? 'ano anterior' : 'mês anterior';
        return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            label={`Receita ${pLabel}`}
            value={fmtShort(cm.revenue || 0)}
            sub={`${cm.salesCount || 0} venda${cm.salesCount !== 1 ? 's' : ''}`}
            icon={TrendingUp}
            color="emerald"
            growth={cm.revenueGrowth}
            growthLabel={prevLabel}
            href="/lancamentos"
          />
          <KpiCard
            label="Lucro Líquido"
            value={fmtShort(profit)}
            sub={`Margem ${profitMargin.toFixed(1)}%`}
            icon={DollarSign}
            color={profit >= 0 ? 'teal' : 'red'}
            growth={null}
            href="/lancamentos"
          />
          <KpiCard
            label={`Despesas ${pLabel}`}
            value={fmtShort(cm.expenses || 0)}
            sub={`${cm.expensesCount || 0} lançamentos`}
            icon={Receipt}
            color="rose"
            growth={cm.expenseGrowth}
            growthInverse
            growthLabel={prevLabel}
            href="/despesas"
          />
          <KpiCard
            label="Compras / Insumos"
            value={fmtShort(cm.purchases || 0)}
            sub={`${cm.purchasesCount || 0} sessão${cm.purchasesCount !== 1 ? 'ões' : ''}`}
            icon={ShoppingCart}
            color="sky"
            growth={null}
            href="/compras"
          />
          <KpiCard
            label="Estoque em Valor"
            value={fmtShort(d.stockValue || 0)}
            sub={`${d.counts?.rawMaterials || 0} insumos`}
            icon={Boxes}
            color="violet"
            growth={null}
            href="/insumos"
          />
          <KpiCard
            label="Pendente a Pagar"
            value={fmtShort(d.pending?.total || 0)}
            sub={`${d.pending?.count || 0} despesa${d.pending?.count !== 1 ? 's' : ''}`}
            icon={Clock}
            color={d.pending?.total > 0 ? 'amber' : 'slate'}
            growth={null}
            href="/despesas"
          />
        </div>
        );
      })()}

      {/* ── Quick counts ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Pratos no Cardápio', val: d.counts?.meals || 0,        icon: ChefHat,       color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', href: '/cardapio' },
          { label: 'Fornecedores',        val: d.counts?.suppliers || 0,    icon: Truck,         color: 'text-sky-400',    bg: 'bg-sky-500/10 border-sky-500/20',    href: '/fornecedores' },
          { label: 'Funcionários Ativos', val: d.counts?.employees || 0,    icon: Users,         color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20',  href: '/pessoas' },
          { label: 'Colaboradores',       val: d.counts?.collaborators || 0,icon: UserCheck,     color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', href: '/pessoas' },
          { label: 'Tipos de Insumo',     val: d.counts?.rawMaterials || 0, icon: Package,       color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20',  href: '/insumos' },
          { label: 'Alertas Ativos',      val: d.alerts?.length || 0,       icon: AlertTriangle, color: d.alerts?.length > 0 ? 'text-red-400' : 'text-slate-500', bg: d.alerts?.length > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-white/3 border-white/8', href: null },
        ].map(({ label, val, icon: Icon, color, bg, href }) => {
          const inner = (
            <>
              <Icon className={`w-5 h-5 shrink-0 ${color}`} />
              <div className="min-w-0">
                <p className="text-lg font-black text-white">{val}</p>
                <p className="text-[10px] text-muted leading-tight truncate">{label}</p>
              </div>
            </>
          );
          return href ? (
            <Link key={label} href={href} className={`glass-panel p-4 border flex items-center gap-3 ${bg} hover:brightness-110 transition-all cursor-pointer`}>
              {inner}
            </Link>
          ) : (
            <button key={label} onClick={() => setTab('alertas')} className={`glass-panel p-4 border flex items-center gap-3 text-left w-full ${bg} hover:brightness-110 transition-all cursor-pointer`}>
              {inner}
            </button>
          );
        })}
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="border-b border-white/8 flex gap-0 overflow-x-auto">
        {([
          { id: 'overview',   label: 'Visão Geral',  icon: BarChart3 },
          { id: 'cardapio',   label: 'Cardápio',      icon: ChefHat },
          { id: 'financeiro', label: 'Financeiro',    icon: DollarSign },
          { id: 'compras',    label: 'Compras & Estoque', icon: ShoppingCart },
          { id: 'alertas',    label: `Alertas ${d.alerts?.length > 0 ? `(${d.alerts.length})` : ''}`, icon: AlertTriangle },
        ] as { id: TabId; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 whitespace-nowrap transition-all",
              tab === id
                ? "text-white border-primary"
                : "text-muted border-transparent hover:text-slate-300 hover:border-white/20"
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: VISÃO GERAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-6">

          {/* Monthly trend + channels row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Trend chart */}
            <div className="xl:col-span-2 glass-panel p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-white">Receita × Despesa por Mês</h3>
                  <p className="text-xs text-muted mt-0.5">Últimos 7 meses</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Receita</span>
                  <span className="flex items-center gap-1.5 text-rose-400"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />Despesa</span>
                  <span className="flex items-center gap-1.5 text-sky-400"><span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />Compras</span>
                </div>
              </div>
              <MonthlyBarChart data={d.monthlyTrend || []} />
            </div>

            {/* Channels */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-black text-white mb-1">Canais de Venda</h3>
              <p className="text-xs text-muted mb-5">Receita deste mês por canal</p>
              {(d.salesByChannel?.length > 0) ? (
                <div className="space-y-3">
                  {d.salesByChannel.map((ch: any) => {
                    const total = d.salesByChannel.reduce((s: number, c: any) => s + c.total_revenue, 0);
                    const pct   = total > 0 ? (ch.total_revenue / total) * 100 : 0;
                    return (
                      <div key={ch.channel} className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-200">{ch.channel}</span>
                          <div className="text-right">
                            <span className="text-sm font-black text-emerald-400">R$ {fmtBRL(ch.total_revenue)}</span>
                            <span className="text-[10px] text-muted ml-2">{ch.count}x</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted">
                          <span>Lucro: R$ {fmtBRL(ch.total_profit)}</span>
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty label="Nenhuma venda registrada neste mês" />
              )}
              {d.salesByChannelAllTime?.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Histórico geral</p>
                  <div className="space-y-1">
                    {d.salesByChannelAllTime.map((ch: any) => (
                      <div key={ch.channel} className="flex justify-between text-xs">
                        <span className="text-slate-400">{ch.channel}</span>
                        <span className="font-bold text-white">{ch.count} venda{ch.count!==1?'s':''} · R$ {fmtBRL(ch.total_revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top meals this month + recent sales */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Top meals */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-black text-white mb-1">Top Pratos — {month}</h3>
              <p className="text-xs text-muted mb-5">Mais vendidos neste mês</p>
              {d.topMeals?.length > 0 ? (
                <div className="space-y-2">
                  {d.topMeals.map((m: any, i: number) => {
                    const max = Math.max(...d.topMeals.map((x: any) => x.quantity));
                    const pct = max > 0 ? (m.quantity / max) * 100 : 0;
                    return (
                      <div key={m.name} className="flex items-center gap-3">
                        <span className={cn("w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
                          i === 0 ? 'bg-amber-500/20 text-amber-400' :
                          i === 1 ? 'bg-slate-500/20 text-slate-300' :
                          i === 2 ? 'bg-orange-800/20 text-orange-600' : 'bg-white/5 text-muted'
                        )}>{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-slate-200 truncate">{m.name}</span>
                            <span className="text-xs text-muted ml-2 shrink-0">{m.quantity}x</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-emerald-400">R$ {fmtBRL(m.revenue)}</p>
                          <p className="text-[10px] text-muted">Lucro R$ {fmtBRL(m.profit)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty label="Nenhuma venda registrada neste mês" />
              )}
            </div>

            {/* Recent sales */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-black text-white mb-1">Últimas Vendas</h3>
              <p className="text-xs text-muted mb-4">10 mais recentes</p>
              {d.recentSales?.length > 0 ? (
                <div className="space-y-1.5">
                  {d.recentSales.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/3 transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{s.meal_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted">{fmtDate(s.sale_date)}</span>
                          <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded">{s.channel}</span>
                          {s.collaborator_name && (
                            <span className="text-[10px] text-violet-400">{s.collaborator_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-white">{s.quantity}x</p>
                        <p className="text-xs text-emerald-400">R$ {fmtBRL(s.total_revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty label="Nenhuma venda registrada" />
              )}
            </div>
          </div>

          {/* P&L summary */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-white">Resumo Financeiro — {month}/{year}</h3>
              <span className="text-[10px] text-muted font-mono bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                Resultado = Receita − Despesas
              </span>
            </div>

            {/* Main cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Receita Total',  val: cm.revenue   || 0, color: 'text-emerald-400', bg: 'bg-emerald-500/8 border-emerald-500/20', sign: '+' },
                { label: 'Total Despesas', val: cm.expenses  || 0, color: 'text-rose-400',    bg: 'bg-rose-500/8 border-rose-500/20',    sign: '−' },
                { label: 'Total Compras',  val: cm.purchases || 0, color: 'text-sky-400',     bg: 'bg-sky-500/8 border-sky-500/20',      sign: '−' },
                { label: 'Mão de Obra',    val: d.payroll?.total || 0, color: 'text-violet-400', bg: 'bg-violet-500/8 border-violet-500/20', sign: '−' },
              ].map(({ label, val, color, bg, sign }) => (
                <div key={label} className={`rounded-2xl border p-4 ${bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">{label}</p>
                    <span className={`text-[10px] font-black ${sign === '+' ? 'text-emerald-500' : 'text-rose-500'}`}>{sign}</span>
                  </div>
                  <p className={`text-xl font-black ${color}`}>R$ {fmtBRL(val)}</p>
                </div>
              ))}
            </div>

            {/* Result row */}
            <div className={`rounded-2xl border-2 p-5 flex flex-col md:flex-row items-start md:items-center gap-4 ${profit >= 0 ? 'bg-teal-500/8 border-teal-500/30' : 'bg-red-500/8 border-red-500/30'}`}>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">
                  Resultado  <span className="normal-case font-normal text-slate-500">(Receita − Despesas)</span>
                </p>
                <div className="flex items-baseline gap-3">
                  <p className={`text-3xl font-black ${profit >= 0 ? 'text-teal-300' : 'text-red-400'}`}>
                    {profit >= 0 ? '+' : ''}R$ {fmtBRL(profit)}
                  </p>
                  <span className={`text-sm font-bold ${profit >= 0 ? 'text-teal-500' : 'text-red-500'}`}>
                    {cm.revenue > 0 ? `${profitMargin.toFixed(1)}% de margem` : 'sem receita'}
                  </span>
                </div>
              </div>
              {/* Formula breakdown */}
              <div className="flex flex-wrap items-center gap-2 text-sm font-mono">
                <span className="text-emerald-400 font-black">R$ {fmtBRL(cm.revenue || 0)}</span>
                <span className="text-muted">−</span>
                <span className="text-rose-400 font-black">R$ {fmtBRL(cm.expenses || 0)}</span>
                <span className="text-muted">=</span>
                <span className={`font-black ${profit >= 0 ? 'text-teal-300' : 'text-red-400'}`}>
                  {profit >= 0 ? '+' : ''}R$ {fmtBRL(profit)}
                </span>
              </div>
            </div>

            {/* Resultado Final (deducting purchases too) */}
            {(() => {
              const cashResult = profit - (cm.purchases || 0);
              return (
                <div className={`mt-3 rounded-xl border px-4 py-3 flex flex-col md:flex-row items-start md:items-center gap-3 ${cashResult >= 0 ? 'bg-teal-500/5 border-teal-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                      Resultado Final  <span className="normal-case font-normal text-slate-600">(Receita − Despesas − Compras)</span>
                    </p>
                    <p className={`text-xl font-black mt-0.5 ${cashResult >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                      {cashResult >= 0 ? '+' : ''}R$ {fmtBRL(cashResult)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted">
                    <span className="text-emerald-400">R$ {fmtBRL(cm.revenue || 0)}</span>
                    <span>−</span>
                    <span className="text-rose-400">R$ {fmtBRL(cm.expenses || 0)}</span>
                    <span>−</span>
                    <span className="text-sky-400">R$ {fmtBRL(cm.purchases || 0)}</span>
                    <span>=</span>
                    <span className={cashResult >= 0 ? 'text-teal-400' : 'text-red-400'}>
                      {cashResult >= 0 ? '+' : ''}R$ {fmtBRL(cashResult)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: CARDÁPIO
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'cardapio' && (
        <div className="space-y-6">

          {/* Menu ranking table */}
          <div className="glass-panel overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center gap-3">
              <ChefHat className="w-5 h-5 text-orange-400" />
              <div>
                <h3 className="text-lg font-black text-white">Ranking de Rentabilidade</h3>
                <p className="text-xs text-muted">Todos os pratos ordenados por margem de lucro</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-muted">#</th>
                    <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-muted">Prato</th>
                    <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-muted">Custo</th>
                    <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-muted">Taxa iFood</th>
                    <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-muted">Preço Venda</th>
                    <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-muted">Lucro Unit.</th>
                    <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-muted">Margem</th>
                    <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest text-muted">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {d.menuRanking?.length > 0 ? d.menuRanking.map((m: any, i: number) => {
                    const status = m.margin >= 35 ? { label: 'Excelente', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
                                 : m.margin >= 20 ? { label: 'Bom',       cls: 'text-teal-400 bg-teal-500/10 border-teal-500/20' }
                                 : m.margin >= 10 ? { label: 'Atenção',   cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
                                 :                  { label: 'Crítico',   cls: 'text-red-400 bg-red-500/10 border-red-500/20' };
                    return (
                      <tr key={m.id} className="hover:bg-white/2 transition-all">
                        <td className="py-3 px-4 text-muted text-xs font-bold">{i+1}</td>
                        <td className="py-3 px-4 font-bold text-slate-100">{m.name}</td>
                        <td className="py-3 px-4 text-right text-muted text-xs">R$ {fmtBRL(m.cost)}</td>
                        <td className="py-3 px-4 text-right text-rose-400 text-xs">R$ {fmtBRL(m.ifoodFee)}</td>
                        <td className="py-3 px-4 text-right text-white font-bold">R$ {fmtBRL(m.price)}</td>
                        <td className="py-3 px-4 text-right font-black text-emerald-400">R$ {fmtBRL(m.profit)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden max-w-[80px]">
                              <div className={cn("h-full rounded-full", m.margin>=35?'bg-emerald-500':m.margin>=20?'bg-teal-500':m.margin>=10?'bg-amber-500':'bg-red-500')}
                                   style={{ width: `${Math.min(100, Math.max(0, m.margin))}%` }} />
                            </div>
                            <span className={cn("text-xs font-bold", m.margin>=20?'text-emerald-400':m.margin>=10?'text-amber-400':'text-red-400')}>
                              {m.margin.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn("text-[10px] font-black px-2 py-1 rounded-lg border", status.cls)}>{status.label}</span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={8} className="py-10 text-center text-muted italic text-sm">Nenhum prato cadastrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top items all time + this month */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="glass-panel p-6">
              <h3 className="text-lg font-black text-white mb-1">Mais Vendidos — {month}</h3>
              <p className="text-xs text-muted mb-5">Por quantidade neste mês</p>
              {d.topMeals?.length > 0 ? (
                <HorizontalBarList
                  items={d.topMeals.map((m: any) => ({ label: m.name, value: m.quantity, sub: `R$ ${fmtBRL(m.revenue)}`, color: 'bg-orange-500' }))}
                  max={Math.max(...(d.topMeals || []).map((m: any) => m.quantity))}
                />
              ) : <Empty label="Sem vendas neste mês" />}
            </div>
            <div className="glass-panel p-6">
              <h3 className="text-lg font-black text-white mb-1">Mais Vendidos — Histórico</h3>
              <p className="text-xs text-muted mb-5">Por quantidade total registrada</p>
              {d.topMealsAllTime?.length > 0 ? (
                <HorizontalBarList
                  items={d.topMealsAllTime.map((m: any) => ({ label: m.name, value: m.quantity, sub: `R$ ${fmtBRL(m.revenue)}`, color: 'bg-violet-500' }))}
                  max={Math.max(...(d.topMealsAllTime || []).map((m: any) => m.quantity))}
                />
              ) : <Empty label="Nenhuma venda registrada" />}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: FINANCEIRO
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'financeiro' && (
        <div className="space-y-6">

          {/* DRE-style summary */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-400" /> Demonstrativo — {month}/{year}
            </h3>
            <div className="max-w-lg space-y-2">
              {[
                { label: '(+) Receita Bruta',    val: cm.revenue||0,      cls: 'text-emerald-400', border: '' },
                { label: '(-) Custo Compras',     val: -(cm.purchases||0), cls: 'text-rose-400',    border: '' },
                { label: '(-) Despesas Operac.',  val: -(cm.expenses||0),  cls: 'text-rose-400',    border: '' },
                { label: '(=) Lucro Estimado',    val: profit,             cls: profit>=0?'text-teal-300':'text-red-400', border: 'border-t border-white/15 pt-2 mt-2' },
              ].map(({ label, val, cls, border }) => (
                <div key={label} className={`flex justify-between items-center ${border}`}>
                  <span className="text-sm text-slate-300">{label}</span>
                  <span className={`text-sm font-black ${cls}`}>R$ {fmtBRL(Math.abs(val))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses by category */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="glass-panel p-6">
              <h3 className="text-lg font-black text-white mb-1">Despesas por Categoria — {month}</h3>
              <p className="text-xs text-muted mb-5">Distribuição do mês atual</p>
              {d.expByCategory?.length > 0 ? (
                <CategoryBreakdown items={d.expByCategory} />
              ) : <Empty label="Sem despesas neste mês" />}
            </div>
            <div className="glass-panel p-6">
              <h3 className="text-lg font-black text-white mb-1">Despesas por Categoria — Histórico</h3>
              <p className="text-xs text-muted mb-5">Acumulado geral</p>
              {d.expByCategoryAllTime?.length > 0 ? (
                <CategoryBreakdown items={d.expByCategoryAllTime} />
              ) : <Empty label="Nenhuma despesa registrada" />}
            </div>
          </div>

          {/* Monthly trend + payroll */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 glass-panel p-6">
              <h3 className="text-lg font-black text-white mb-1">Evolução Mensal de Gastos</h3>
              <p className="text-xs text-muted mb-5">Despesas × Compras nos últimos meses</p>
              <MonthlyBarChart data={d.monthlyTrend || []} mode="expenses" />
            </div>
            <div className="glass-panel p-6">
              <h3 className="text-lg font-black text-white mb-1">Folha de Pagamento</h3>
              <p className="text-xs text-muted mb-5">{month}/{year}</p>
              <div className="bg-cyan-500/8 border border-cyan-500/20 rounded-2xl p-5 text-center mb-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-1">Total Lançado</p>
                <p className="text-3xl font-black text-white">R$ {fmtBRL(d.payroll?.total || 0)}</p>
                <p className="text-xs text-muted mt-1">{d.payroll?.count || 0} lançamento{d.payroll?.count!==1?'s':''}</p>
              </div>
              <div className="space-y-2 mt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted">Equipe</p>
                <div className="flex items-center gap-3 p-3 bg-white/3 rounded-xl">
                  <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">{d.counts?.employees || 0} funcionário{d.counts?.employees!==1?'s':''} ativos</p>
                    <p className="text-xs text-muted">{d.counts?.collaborators || 0} colaborador{d.counts?.collaborators!==1?'es':''}</p>
                  </div>
                </div>
              </div>
              {/* Overdue expenses */}
              {d.overdueExpenses?.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400">⚠ Despesas Vencidas</p>
                  {d.overdueExpenses.slice(0,4).map((exp: any) => (
                    <div key={exp.id} className="flex justify-between items-center px-3 py-2 bg-red-500/8 border border-red-500/15 rounded-xl">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{exp.name}</p>
                        <p className="text-[10px] text-red-400">{fmtDate(exp.due_date)}</p>
                      </div>
                      <span className="text-xs font-black text-red-400 shrink-0 ml-2">R$ {fmtBRL(exp.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Overdue full list */}
          {d.overdueExpenses?.length > 0 && (
            <div className="glass-panel p-6">
              <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Todas as Despesas Vencidas ({d.overdueExpenses.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      {['Nome','Fornecedor','Vencimento','Valor'].map(h => (
                        <th key={h} className="py-2.5 px-4 text-left text-[10px] font-black uppercase tracking-wider text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {d.overdueExpenses.map((exp: any) => (
                      <tr key={exp.id} className="hover:bg-red-500/3">
                        <td className="py-3 px-4 font-semibold text-slate-200">{exp.name}</td>
                        <td className="py-3 px-4 text-muted text-xs">{exp.supplier_name || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-lg">{fmtDate(exp.due_date)}</span>
                        </td>
                        <td className="py-3 px-4 font-black text-red-400">R$ {fmtBRL(exp.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: COMPRAS & ESTOQUE
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'compras' && (
        <div className="space-y-6">

          {/* Top suppliers */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-3 mb-5">
              <Truck className="w-5 h-5 text-sky-400" />
              <div>
                <h3 className="text-lg font-black text-white">Top Fornecedores por Volume</h3>
                <p className="text-xs text-muted">Ranking histórico de gastos por fornecedor</p>
              </div>
            </div>
            {d.topSuppliers?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      {['#','Fornecedor','Total Comprado','Sessões','Itens Únicos','Share'].map(h => (
                        <th key={h} className="py-2.5 px-4 text-left text-[10px] font-black uppercase tracking-wider text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {d.topSuppliers.map((s: any, i: number) => {
                      const totalAll = d.topSuppliers.reduce((acc: number, x: any) => acc + x.total, 0);
                      const share = totalAll > 0 ? (s.total / totalAll) * 100 : 0;
                      return (
                        <tr key={s.name} className="hover:bg-white/2">
                          <td className="py-3 px-4 text-muted font-bold text-xs">{i+1}</td>
                          <td className="py-3 px-4 font-bold text-slate-100">{s.name}</td>
                          <td className="py-3 px-4 font-black text-sky-400">R$ {fmtBRL(s.total)}</td>
                          <td className="py-3 px-4 text-muted">{s.sessions}</td>
                          <td className="py-3 px-4 text-muted">{s.uniqueItems}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden max-w-[100px]">
                                <div className="h-full bg-sky-500 rounded-full" style={{ width: `${share}%` }} />
                              </div>
                              <span className="text-xs text-muted">{share.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <Empty label="Nenhuma compra registrada" />}
          </div>

          {/* Purchases trend + stock summary */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="glass-panel p-6">
              <h3 className="text-lg font-black text-white mb-1">Compras por Mês</h3>
              <p className="text-xs text-muted mb-5">Histórico de sessões de compra</p>
              <PurchaseBarChart data={d.monthlyTrend || []} />
            </div>
            <div className="glass-panel p-6">
              <h3 className="text-lg font-black text-white mb-1">Resumo de Estoque</h3>
              <p className="text-xs text-muted mb-5">Valor em insumos disponíveis</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-violet-500/8 border border-violet-500/20 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black uppercase text-violet-400 mb-1">Valor Total</p>
                  <p className="text-2xl font-black text-white">R$ {fmtBRL(d.stockValue||0)}</p>
                </div>
                <div className="bg-teal-500/8 border border-teal-500/20 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black uppercase text-teal-400 mb-1">Tipos de Insumo</p>
                  <p className="text-2xl font-black text-white">{d.counts?.rawMaterials||0}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm py-2 border-b border-white/5">
                  <span className="text-muted">Itens com alerta de estoque</span>
                  <span className={cn("font-black", d.stockAlerts?.length>0?'text-amber-400':'text-emerald-400')}>{d.stockAlerts?.length||0}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-white/5">
                  <span className="text-muted">Itens com estoque zerado</span>
                  <span className={cn("font-black", d.zeroStock?.length>0?'text-red-400':'text-emerald-400')}>{d.zeroStock?.length||0}</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span className="text-muted">Compras este mês</span>
                  <span className="font-black text-sky-400">R$ {fmtBRL(cm.purchases||0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stock alerts table */}
          {(d.stockAlerts?.length > 0 || d.zeroStock?.length > 0) && (
            <div className="glass-panel overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-lg font-black text-white">Estoque Crítico</h3>
                  <p className="text-xs text-muted">Insumos abaixo do estoque mínimo configurado</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-amber-500/3">
                      {['Insumo','Estoque Atual','Mínimo','Cobertura','Status'].map(h => (
                        <th key={h} className="py-2.5 px-4 text-left text-[10px] font-black uppercase tracking-wider text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[...d.stockAlerts||[], ...d.zeroStock||[]].slice(0,15).map((rm: any) => {
                      const pct    = rm.min_stock > 0 ? (rm.stock / rm.min_stock) * 100 : 0;
                      const isCrit = rm.stock <= 0;
                      return (
                        <tr key={rm.id} className={isCrit ? 'bg-red-500/5' : 'hover:bg-amber-500/3'}>
                          <td className="py-3 px-4 font-bold text-slate-200">{rm.name}</td>
                          <td className="py-3 px-4">
                            <span className={cn("font-black", isCrit?'text-red-400':'text-amber-400')}>
                              {Number(rm.stock).toFixed(2)} {rm.unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted text-xs">{rm.min_stock||'—'} {rm.unit}</td>
                          <td className="py-3 px-4">
                            {rm.min_stock > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden max-w-[80px]">
                                  <div className={cn("h-full rounded-full", pct<=0?'bg-red-500':pct<50?'bg-amber-500':'bg-emerald-500')}
                                       style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                                </div>
                                <span className="text-xs text-muted">{pct.toFixed(0)}%</span>
                              </div>
                            ) : <span className="text-xs text-muted">—</span>}
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn("text-[10px] font-black px-2 py-1 rounded-lg border",
                              isCrit ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            )}>
                              {isCrit ? 'Zerado' : 'Crítico'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: ALERTAS
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'alertas' && (
        <div className="space-y-4">
          {d.alerts?.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                {[
                  { type: 'danger', label: 'Críticos',  color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                  { type: 'warning',label: 'Atenção',   color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                  { type: 'info',   label: 'Informação',color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
                ].map(({ type, label, color }) => {
                  const count = d.alerts.filter((a: any) => a.type === type).length;
                  return (
                    <div key={type} className={`glass-panel p-4 border flex items-center gap-3 ${color}`}>
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="text-2xl font-black text-white">{count}</p>
                        <p className="text-[10px] text-muted">{label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-3">
                {d.alerts.map((a: any, i: number) => (
                  <div key={i} className={cn("glass-panel p-5 border flex items-start gap-4",
                    a.type === 'danger'  ? 'border-red-500/20 bg-red-500/5' :
                    a.type === 'warning' ? 'border-amber-500/20 bg-amber-500/5' :
                                           'border-sky-500/20 bg-sky-500/5'
                  )}>
                    <div className={cn("p-2 rounded-xl shrink-0",
                      a.type==='danger'?'bg-red-500/15':a.type==='warning'?'bg-amber-500/15':'bg-sky-500/15'
                    )}>
                      <AlertTriangle className={cn("w-4 h-4",
                        a.type==='danger'?'text-red-400':a.type==='warning'?'text-amber-400':'text-sky-400'
                      )} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-black",
                        a.type==='danger'?'text-red-300':a.type==='warning'?'text-amber-300':'text-sky-300'
                      )}>{a.title}</p>
                      <p className="text-xs text-muted mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="glass-panel p-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-xl font-black text-white mb-2">Tudo em Ordem!</h3>
              <p className="text-muted text-sm">Nenhum alerta operacional no momento.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color, growth, growthInverse, growthLabel, href }: {
  label: string; value: string; sub: string; icon: any;
  color: string; growth: number | null; growthInverse?: boolean; growthLabel?: string;
  href?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
    teal:    'bg-teal-500/15 border-teal-500/25 text-teal-400',
    rose:    'bg-rose-500/15 border-rose-500/25 text-rose-400',
    sky:     'bg-sky-500/15 border-sky-500/25 text-sky-400',
    violet:  'bg-violet-500/15 border-violet-500/25 text-violet-400',
    amber:   'bg-amber-500/15 border-amber-500/25 text-amber-400',
    red:     'bg-red-500/15 border-red-500/25 text-red-400',
    slate:   'bg-white/5 border-white/10 text-slate-500',
  };
  const isGood = growth !== null ? (growthInverse ? growth < 0 : growth > 0) : null;
  const inner = (
    <>
      <div className="flex items-start justify-between mb-3">
        <Icon className="w-4 h-4 opacity-80" />
        <div className="flex items-center gap-1.5">
          {growth !== null && (
            <span
              title={growthLabel ? `vs. ${growthLabel}` : undefined}
              className={cn("flex items-center gap-0.5 text-[10px] font-black cursor-default",
                isGood ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {isGood ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(growth).toFixed(1)}%
            </span>
          )}
          {href && <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />}
        </div>
      </div>
      <p className="text-xl font-black text-white leading-tight">{value}</p>
      <p className="text-[10px] text-muted mt-1 font-bold uppercase tracking-wider truncate">{label}</p>
      <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cn(
        `glass-panel p-4 border group transition-all duration-200 hover:brightness-110 hover:scale-[1.02] hover:shadow-lg`,
        colorMap[color]
      )}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={`glass-panel p-4 border ${colorMap[color]}`}>
      {inner}
    </div>
  );
}

function MonthlyBarChart({ data, mode = 'all' }: { data: any[]; mode?: 'all' | 'expenses' }) {
  if (!data.length) return <Empty label="Sem dados históricos" />;
  const maxVal = Math.max(...data.flatMap((d: any) =>
    mode === 'expenses'
      ? [d.expenses, d.purchases]
      : [d.revenue, d.expenses, d.purchases, Math.abs(d.netResult ?? 0)]
  ), 1);

  const bars = mode === 'expenses'
    ? [
        { key: 'expenses',  color: 'bg-rose-500/70 hover:bg-rose-400',    label: 'Despesas' },
        { key: 'purchases', color: 'bg-sky-500/70 hover:bg-sky-400',      label: 'Compras' },
      ]
    : [
        { key: 'revenue',   color: 'bg-emerald-500/80 hover:bg-emerald-400', label: 'Receita' },
        { key: 'expenses',  color: 'bg-rose-500/70 hover:bg-rose-400',       label: 'Despesas' },
        { key: 'purchases', color: 'bg-sky-500/70 hover:bg-sky-400',         label: 'Compras' },
      ];

  return (
    <div>
      <div className="flex items-end gap-2 h-48 px-1">
        {data.map((m: any) => {
          const net: number = m.netResult ?? (m.revenue - m.expenses);
          const netPct = (Math.abs(net) / maxVal) * 100;
          const netPositive = net >= 0;
          return (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="w-full flex items-end gap-0.5 h-36">
                {bars.map(({ key, color, label }) => (
                  <div key={key}
                       className={`flex-1 rounded-t-sm transition-all cursor-default relative group ${color}`}
                       style={{ height: `${((m[key] || 0) / maxVal) * 100}%` }}
                       title={`${label}: R$ ${fmtBRL(m[key] || 0)}`}>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-[9px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all z-10">
                      R$ {fmtBRL(m[key] || 0)}
                    </div>
                  </div>
                ))}
                {/* Resultado bar (R - D) */}
                <div
                  className={`flex-1 rounded-t-sm transition-all cursor-default relative group border-t-2 ${
                    netPositive
                      ? 'bg-teal-400/60 hover:bg-teal-300/70 border-teal-400'
                      : 'bg-red-500/50 hover:bg-red-400/60 border-red-400'
                  }`}
                  style={{ height: `${netPct}%` }}
                  title={`Resultado (R−D): R$ ${fmtBRL(net)}`}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-[9px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all z-10">
                    {netPositive ? '+' : ''}R$ {fmtBRL(net)}
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-muted text-center truncate w-full">{m.label}</p>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
        {mode !== 'expenses' && (
          <span className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80 inline-block" /> Receita
          </span>
        )}
        <span className="flex items-center gap-1.5 text-[10px] text-muted">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/70 inline-block" /> Despesas
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted">
          <span className="w-2.5 h-2.5 rounded-sm bg-sky-500/70 inline-block" /> Compras
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted">
          <span className="w-2.5 h-2.5 rounded-sm bg-teal-400/60 inline-block border-t border-teal-400" /> Resultado (R−D)
        </span>
      </div>
    </div>
  );
}

function PurchaseBarChart({ data }: { data: any[] }) {
  if (!data.length) return <Empty label="Sem dados de compras" />;
  const max = Math.max(...data.map((d: any) => d.purchases), 1);
  return (
    <div className="flex items-end gap-2 h-48 px-1">
      {data.map((m: any) => (
        <div key={m.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full flex flex-col justify-end h-36">
            <div className="w-full bg-sky-500/70 rounded-t-sm hover:bg-sky-400 transition-all cursor-default relative group"
                 style={{ height: `${(m.purchases / max) * 100}%` }}
                 title={`R$ ${fmtBRL(m.purchases)}`}>
              {m.purchases > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-[9px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                  {m.sessions} compra{m.sessions!==1?'s':''}
                </div>
              )}
            </div>
          </div>
          <p className="text-[9px] text-muted text-center truncate w-full">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

function HorizontalBarList({ items, max }: { items: { label: string; value: number; sub: string; color: string }[]; max: number }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-200 truncate max-w-[65%]">{item.label}</span>
            <div className="text-right">
              <span className="text-sm font-black text-white">{item.value}x</span>
              <span className="text-[10px] text-muted ml-2">{item.sub}</span>
            </div>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full ${item.color} rounded-full`} style={{ width: `${max > 0 ? (item.value / max) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryBreakdown({ items }: { items: any[] }) {
  const total = items.reduce((s: number, i: any) => s + i.total, 0);
  const COLORS = ['bg-violet-500','bg-sky-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-teal-500','bg-orange-500','bg-pink-500'];
  return (
    <div className="space-y-3">
      {items.map((item: any, i: number) => {
        const pct = total > 0 ? (item.total / total) * 100 : 0;
        return (
          <div key={item.category} className="space-y-1.5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${COLORS[i % COLORS.length]} shrink-0`} />
                <span className="text-sm font-bold text-slate-200 truncate max-w-[150px]">{item.category}</span>
                <span className="text-[10px] text-muted">{item.count}x</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-white">R$ {fmtBRL(item.total)}</span>
                <span className="text-[10px] text-muted ml-2">{pct.toFixed(0)}%</span>
              </div>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full ${COLORS[i % COLORS.length]} rounded-full opacity-70`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="py-10 text-center text-muted text-sm italic opacity-60">{label}</div>
  );
}
