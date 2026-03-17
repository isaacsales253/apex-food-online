'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Plus, Utensils, Package, DollarSign, TrendingUp,
  Calendar, ChevronDown, X, CheckCircle2, ShieldAlert, Pencil, Trash2, Check, Users, Ban,
  CreditCard, Banknote, Wallet, QrCode, CircleDollarSign, Clock, AlertCircle
} from 'lucide-react';
import { cn, maskCurrency, unmaskCurrency } from '@/lib/utils';

interface Meal {
  id: number;
  name: string;
  sale_price: number;
  ifood_fee_percent: number;
  tax_percent: number;
  total_food_cost: number;
  packaging_cost: number;
}

interface Sale {
  id: number;
  meal_name: string;
  quantity: number;
  sale_date: string;
  channel: string;
  unit_sale_price: number;
  unit_food_cost: number;
  unit_packaging_cost: number;
  ifood_fee_percent: number;
  tax_percent: number;
  unit_ifood_fee: number;
  unit_tax: number;
  unit_profit: number;
  total_revenue: number;
  total_profit: number;
  collaborator_id: number | null;
  collaborator_name: string | null;
  payment_method: string | null;
  payment_received: number; // 0 | 1
  payment_received_at: string | null;
}

interface Collaborator {
  id: number;
  name: string;
  role: string;
  commission_percent: number;
  commission_type: string; // 'total' | 'net' | 'profit'
  allowed_meals: string | null; // JSON array of meal IDs, null = todos permitidos
}

const CHANNELS = ['iFood', 'Balcão', 'WhatsApp', 'Outro'];

const PAYMENT_METHODS = [
  { id: 'Pix',               label: 'Pix',               icon: QrCode,          color: 'emerald' },
  { id: 'Cartão de Crédito', label: 'Crédito',           icon: CreditCard,      color: 'violet'  },
  { id: 'Cartão de Débito',  label: 'Débito',            icon: Wallet,          color: 'blue'    },
  { id: 'Dinheiro',          label: 'Dinheiro',          icon: Banknote,        color: 'amber'   },
] as const;

type PaymentMethodId = typeof PAYMENT_METHODS[number]['id'];

export default function LancamentosPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [successId, setSuccessId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    quantity: '1',
    sale_date: '',
    channel: 'iFood',
    unit_sale_price: '',
    collaborator_id: '',
  });

  const today = new Date().toISOString().split('T')[0];
  const currentYear = String(new Date().getFullYear());

  const [filterMode, setFilterMode] = useState<'dia' | 'mes' | 'ano' | 'tudo'>('mes');
  const [filterValue, setFilterValue] = useState(() => today.substring(0, 7));

  const handleFilterModeChange = (mode: 'dia' | 'mes' | 'ano' | 'tudo') => {
    setFilterMode(mode);
    if (mode === 'dia') setFilterValue(today);
    else if (mode === 'mes') setFilterValue(today.substring(0, 7));
    else if (mode === 'ano') setFilterValue(currentYear);
    else setFilterValue('');
  };

  const [form, setForm] = useState({
    meal_id: '',
    quantity: '1',
    sale_date: today,
    channel: 'iFood',
    unit_sale_price: '',
    collaborator_id: '',
    payment_method: '',
  });

  useEffect(() => {
    fetchAll();
    const onVis = () => { if (document.visibilityState === 'visible') fetchAll(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const fetchAll = async () => {
    try {
      const [mealsRes, salesRes, collabsRes] = await Promise.all([
        fetch('/api/cardapio', { cache: 'no-store' }),
        fetch('/api/lancamentos', { cache: 'no-store' }),
        fetch('/api/colaboradores', { cache: 'no-store' }),
      ]);
      const mealsData = await mealsRes.json();
      const salesData = await salesRes.json();
      const collabsData = await collabsRes.json();
      setMeals(Array.isArray(mealsData) ? mealsData : []);
      setSales(Array.isArray(salesData) ? salesData : []);
      setCollaborators(Array.isArray(collabsData) ? collabsData : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const selectedMeal = meals.find(m => m.id === Number(form.meal_id));

  const isIfood = form.channel === 'iFood';

  const calcSnapshot = () => {
    if (!selectedMeal) return null;
    const sp = unmaskCurrency(form.unit_sale_price) || selectedMeal.sale_price;
    const qty = parseInt(form.quantity) || 1;
    const ifoodFeePercent = isIfood ? selectedMeal.ifood_fee_percent : 0;
    const ifoodFee = (sp * ifoodFeePercent) / 100;
    const netAfterComm = sp - ifoodFee;
    // iFood: imposto sobre valor líquido; outros canais: imposto sobre preço cheio
    const taxBase = isIfood ? netAfterComm : sp;
    const taxVal = (taxBase * selectedMeal.tax_percent) / 100;
    const foodCost = selectedMeal.total_food_cost || 0;
    const packCost = selectedMeal.packaging_cost || 0;
    const unitProfit = sp - ifoodFee - taxVal - foodCost - packCost;
    const totalRevenue = sp * qty;
    const totalProfit = unitProfit * qty;
    const margin = sp > 0 ? (unitProfit / sp) * 100 : 0;
    return { sp, qty, ifoodFeePercent, ifoodFee, netAfterComm, taxBase, taxVal, foodCost, packCost, unitProfit, totalRevenue, totalProfit, margin };
  };

  const snap = calcSnapshot();

  const selectedCollab = form.collaborator_id
    ? collaborators.find(c => c.id === Number(form.collaborator_id)) ?? null
    : null;

  const calcCollabCommission = (s: ReturnType<typeof calcSnapshot>, collab: Collaborator | null): number => {
    if (!s || !collab || !collab.commission_percent) return 0;
    let base = 0;
    if (collab.commission_type === 'net') {
      base = (s.sp - s.ifoodFee - s.taxVal) * s.qty;
    } else if (collab.commission_type === 'profit') {
      base = s.totalProfit;
    } else {
      base = s.totalRevenue; // 'total' (default)
    }
    return (base * collab.commission_percent) / 100;
  };

  const collabCommission = calcCollabCommission(snap, selectedCollab);

  const commissionTypeLabel = (type: string) => {
    if (type === 'net') return 'sobre receita líquida';
    if (type === 'profit') return 'sobre lucro';
    return 'sobre receita bruta';
  };

  // Verifica se o colaborador está autorizado a trabalhar com o prato selecionado
  const collabMealBlocked = (() => {
    if (!selectedCollab || !selectedMeal) return false;
    if (!selectedCollab.allowed_meals) return false; // null = todos os itens permitidos
    try {
      const allowed: number[] = JSON.parse(selectedCollab.allowed_meals);
      if (allowed.length === 0) return false; // lista vazia = todos permitidos
      return !allowed.includes(selectedMeal.id);
    } catch {
      return false;
    }
  })();

  // Itens que o colaborador pode trabalhar (para exibir no alerta)
  const collabAllowedMealNames = (() => {
    if (!selectedCollab?.allowed_meals) return [];
    try {
      const allowed: number[] = JSON.parse(selectedCollab.allowed_meals);
      return meals.filter(m => allowed.includes(m.id)).map(m => m.name);
    } catch {
      return [];
    }
  })();

  const handleMealChange = (mealId: string) => {
    const meal = meals.find(m => m.id === Number(mealId));
    setForm(f => ({
      ...f,
      meal_id: mealId,
      unit_sale_price: meal ? maskCurrency(meal.sale_price) : '',
    }));
  };

  const handleSave = async () => {
    if (!selectedMeal || !snap) return;
    setSaving(true);
    try {
      const payload = {
        meal_id: selectedMeal.id,
        meal_name: selectedMeal.name,
        quantity: snap.qty,
        sale_date: form.sale_date,
        channel: form.channel,
        unit_sale_price: snap.sp,
        unit_food_cost: snap.foodCost,
        unit_packaging_cost: snap.packCost,
        ifood_fee_percent: snap.ifoodFeePercent,
        tax_percent: selectedMeal.tax_percent,
        unit_ifood_fee: snap.ifoodFee,
        unit_tax: snap.taxVal,
        unit_profit: snap.unitProfit,
        total_revenue: snap.totalRevenue,
        total_profit: snap.totalProfit,
        collaborator_id: form.collaborator_id ? Number(form.collaborator_id) : null,
        payment_method: form.payment_method || null,
      };
      const res = await fetch('/api/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSuccessId(data.id);
      setTimeout(() => setSuccessId(null), 3000);
      setShowForm(false);
      setForm({ meal_id: '', quantity: '1', sale_date: today, channel: 'iFood', unit_sale_price: '', collaborator_id: '', payment_method: '' });
      await fetchAll();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const startEdit = (sale: Sale) => {
    setEditingId(sale.id);
    setEditForm({
      quantity: String(sale.quantity),
      sale_date: sale.sale_date,
      channel: sale.channel,
      unit_sale_price: maskCurrency(sale.unit_sale_price),
      collaborator_id: sale.collaborator_id ? String(sale.collaborator_id) : '',
    });
  };

  const calcEditSnapshot = (sale: Sale) => {
    const sp = unmaskCurrency(editForm.unit_sale_price) || sale.unit_sale_price;
    const qty = parseInt(editForm.quantity) || 1;
    const isIfoodEdit = editForm.channel === 'iFood';
    const ifoodFeePercent = isIfoodEdit ? sale.ifood_fee_percent : 0;
    const ifoodFee = (sp * ifoodFeePercent) / 100;
    const taxBase = isIfoodEdit ? sp - ifoodFee : sp;
    const taxVal = (taxBase * sale.tax_percent) / 100;
    const unitProfit = sp - ifoodFee - taxVal - sale.unit_food_cost - sale.unit_packaging_cost;
    return {
      sp, qty,
      ifoodFeePercent,
      unit_ifood_fee: ifoodFee,
      unit_tax: taxVal,
      unit_profit: unitProfit,
      total_revenue: sp * qty,
      total_profit: unitProfit * qty,
    };
  };

  const handleSaveEdit = async (sale: Sale) => {
    const snap = calcEditSnapshot(sale);
    setSaving(true);
    try {
      await fetch(`/api/lancamentos/${sale.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: snap.qty,
          sale_date: editForm.sale_date,
          channel: editForm.channel,
          unit_sale_price: snap.sp,
          ifood_fee_percent: snap.ifoodFeePercent,
          unit_ifood_fee: snap.unit_ifood_fee,
          unit_tax: snap.unit_tax,
          unit_profit: snap.unit_profit,
          total_revenue: snap.total_revenue,
          total_profit: snap.total_profit,
          collaborator_id: editForm.collaborator_id ? Number(editForm.collaborator_id) : null,
        }),
      });
      setEditingId(null);
      await fetchAll();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este lançamento?')) return;
    await fetch(`/api/lancamentos/${id}`, { method: 'DELETE' });
    await fetchAll();
  };

  const handleConfirmPayment = async (id: number, method: string) => {
    await fetch(`/api/lancamentos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: method, payment_received: 1 }),
    });
    setConfirmingPaymentId(null);
    await fetchAll();
  };

  const handleUndoPayment = async (id: number) => {
    await fetch(`/api/lancamentos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: null, payment_received: 0 }),
    });
    await fetchAll();
  };

  const [pendingOnly, setPendingOnly] = useState(false);

  // Count of all unpaid sales (global, ignoring period filter) for badge
  const totalPendingCount = sales.filter(s => s.payment_received !== 1).length;

  const filteredSales = sales.filter(s => {
    // Period filter
    const inPeriod = (() => {
      if (filterMode === 'tudo') return true;
      if (filterMode === 'dia') return s.sale_date === filterValue;
      return s.sale_date.startsWith(filterValue);
    })();
    if (!inPeriod) return false;
    // Pending filter
    if (pendingOnly) return s.payment_received !== 1;
    return true;
  });

  const availableYears = [...new Set(sales.map(s => s.sale_date.substring(0, 4)))]
    .sort((a, b) => b.localeCompare(a));
  if (!availableYears.includes(currentYear)) availableYears.unshift(currentYear);

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total_revenue, 0);
  const totalProfit = filteredSales.reduce((acc, s) => acc + s.total_profit, 0);
  const totalUnits = filteredSales.reduce((acc, s) => acc + s.quantity, 0);
  const totalReceived = filteredSales.reduce((acc, s) => acc + (s.payment_received === 1 ? s.total_revenue : 0), 0);
  const totalPending = totalRevenue - totalReceived;
  const profitReceived = filteredSales.reduce((acc, s) => acc + (s.payment_received === 1 ? s.total_profit : 0), 0);
  const paymentBreakdown = PAYMENT_METHODS.map(pm => ({
    ...pm,
    total: filteredSales.filter(s => s.payment_method === pm.id && s.payment_received === 1).reduce((a, s) => a + s.total_revenue, 0),
    count: filteredSales.filter(s => s.payment_method === pm.id && s.payment_received === 1).length,
  })).filter(pm => pm.total > 0);

  const groupedByDate = filteredSales.reduce<Record<string, Sale[]>>((acc, s) => {
    const key = s.sale_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-10 animate-fade-in max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Vendas</h1>
          <p className="text-muted text-lg">
            Registre as vendas do período. Os <span className="text-emerald-400 font-bold">custos e preços são congelados</span> no momento do lançamento.
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn btn-primary px-6 py-3 flex items-center gap-2 shrink-0"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Novo Lançamento'}
        </button>
      </header>

      {/* Period filter bar */}
      <div className="flex items-center gap-3 glass-panel px-5 py-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <Calendar className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-black text-muted uppercase tracking-widest">Período</span>
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {(['dia','mes','ano','tudo'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => handleFilterModeChange(mode)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-black transition-all",
                filterMode === mode ? "bg-orange-500 text-white shadow" : "text-muted hover:text-white"
              )}
            >
              {mode === 'dia' ? 'Dia' : mode === 'mes' ? 'Mês' : mode === 'ano' ? 'Ano' : 'Tudo'}
            </button>
          ))}
        </div>
        {filterMode === 'dia' && (
          <input type="date" className="input py-1.5 text-sm w-auto" value={filterValue} onChange={e => setFilterValue(e.target.value)} />
        )}
        {filterMode === 'mes' && (
          <input type="month" className="input py-1.5 text-sm w-auto" value={filterValue} onChange={e => setFilterValue(e.target.value)} />
        )}
        {filterMode === 'ano' && (
          <select className="input py-1.5 text-sm w-auto" value={filterValue} onChange={e => setFilterValue(e.target.value)}>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {/* A Receber filter button */}
        <button
          onClick={() => setPendingOnly(v => !v)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ml-auto",
            pendingOnly
              ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
              : totalPendingCount > 0
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                : "bg-white/5 border-white/10 text-slate-500 cursor-default"
          )}
          disabled={totalPendingCount === 0}
          title={pendingOnly ? "Mostrar todas as vendas" : "Filtrar vendas a receber"}
        >
          <Clock className="w-3.5 h-3.5" />
          A Receber ({totalPendingCount})
        </button>

        <span className={cn("text-xs text-muted", pendingOnly ? "hidden" : "")}>
          {filterMode === 'tudo'
            ? `${sales.length} venda${sales.length !== 1 ? 's' : ''} no total`
            : `${filteredSales.length} venda${filteredSales.length !== 1 ? 's' : ''} no período`
          }
        </span>
      </div>

      {/* A Receber active banner */}
      {pendingOnly && (
        <div className="flex items-center justify-between gap-4 px-5 py-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-300">Mostrando apenas vendas a receber</p>
              <p className="text-xs text-amber-500/80">
                {filteredSales.length} venda{filteredSales.length !== 1 ? 's' : ''} pendente{filteredSales.length !== 1 ? 's' : ''} —&nbsp;
                Total: <span className="font-black text-amber-300">R$ {totalRevenue.toFixed(2)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setPendingOnly(false)}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-1.5 rounded-xl transition-all"
          >
            <X className="w-3.5 h-3.5" /> Limpar filtro
          </button>
        </div>
      )}

      {/* Summary cards — row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="p-3 bg-orange-500/20 rounded-xl"><ShoppingBag className="w-6 h-6 text-orange-400" /></div>
          <div>
            <p className="text-xs text-muted font-bold uppercase tracking-widest">Unidades Vendidas</p>
            <p className="text-2xl font-black text-white">{totalUnits}</p>
          </div>
        </div>
        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl"><DollarSign className="w-6 h-6 text-emerald-400" /></div>
          <div>
            <p className="text-xs text-muted font-bold uppercase tracking-widest">Receita Total</p>
            <p className="text-2xl font-black text-white">R$ {totalRevenue.toFixed(2)}</p>
          </div>
        </div>
        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 rounded-xl"><TrendingUp className="w-6 h-6 text-amber-400" /></div>
          <div>
            <p className="text-xs text-muted font-bold uppercase tracking-widest">Lucro Total</p>
            <p className={cn("text-2xl font-black", totalProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
              R$ {totalProfit.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards — row 2: recebimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recebido */}
        <div className="glass-panel p-6 flex items-center gap-4 border border-emerald-500/15">
          <div className="p-3 bg-emerald-500/20 rounded-xl"><CheckCircle2 className="w-6 h-6 text-emerald-400" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted font-bold uppercase tracking-widest">Recebido</p>
            <p className="text-2xl font-black text-emerald-400">R$ {totalReceived.toFixed(2)}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[11px] text-muted">Lucro confirmado:</span>
              <span className={cn("text-[11px] font-black", profitReceived >= 0 ? "text-emerald-400" : "text-rose-400")}>
                R$ {profitReceived.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Pendente */}
        <div className="glass-panel p-6 flex items-center gap-4 border border-amber-500/15">
          <div className="p-3 bg-amber-500/20 rounded-xl"><CircleDollarSign className="w-6 h-6 text-amber-400" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted font-bold uppercase tracking-widest">Aguardando</p>
            <p className={cn("text-2xl font-black", totalPending > 0 ? "text-amber-400" : "text-slate-500")}>
              R$ {totalPending.toFixed(2)}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[11px] text-muted">
                {filteredSales.filter(s => s.payment_received !== 1).length} venda{filteredSales.filter(s => s.payment_received !== 1).length !== 1 ? 's' : ''} sem confirmação
              </span>
            </div>
            {totalPendingCount > 0 && !pendingOnly && (
              <button
                onClick={() => setPendingOnly(true)}
                className="mt-2 text-[10px] font-black text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <AlertCircle className="w-3 h-3" /> Ver todas a receber
              </button>
            )}
          </div>
        </div>

        {/* Como foi pago */}
        <div className="glass-panel p-6 border border-white/5">
          <p className="text-xs text-muted font-bold uppercase tracking-widest mb-4">Como foi pago</p>
          {paymentBreakdown.length === 0 ? (
            <p className="text-sm text-slate-600 italic">Nenhum recebimento confirmado ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {paymentBreakdown.map(pm => {
                const Icon = pm.icon;
                const pct = totalReceived > 0 ? (pm.total / totalReceived) * 100 : 0;
                return (
                  <div key={pm.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className={cn(
                          "w-3.5 h-3.5",
                          pm.color === 'emerald' ? "text-emerald-400"
                          : pm.color === 'violet'  ? "text-violet-400"
                          : pm.color === 'blue'    ? "text-blue-400"
                          : "text-amber-400"
                        )} />
                        <span className="text-xs font-bold text-slate-300">{pm.label}</span>
                        <span className="text-[10px] text-muted">({pm.count}x)</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-white">R$ {pm.total.toFixed(2)}</span>
                        <span className="text-[10px] text-muted ml-1.5">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          pm.color === 'emerald' ? "bg-emerald-500"
                          : pm.color === 'violet'  ? "bg-violet-500"
                          : pm.color === 'blue'    ? "bg-blue-500"
                          : "bg-amber-500"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {/* Total recebido bar footer */}
              <div className="pt-1 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] text-muted font-bold uppercase">Total recebido</span>
                <span className="text-xs font-black text-emerald-400">R$ {totalReceived.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New sale form */}
      {showForm && (
        <div className="glass-panel border border-orange-500/30 bg-orange-500/5 p-8 animate-fade-in">
          <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6">Registrar Venda</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: inputs */}
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                  <Utensils className="w-3 h-3" /> Prato
                </label>
                <div className="relative">
                  <select
                    className="input py-3 pr-10 appearance-none"
                    value={form.meal_id}
                    onChange={e => handleMealChange(e.target.value)}
                  >
                    <option value="">Selecione um prato...</option>
                    {meals.filter(m => m.sale_price > 0).map(m => (
                      <option key={m.id} value={m.id}>{m.name} — R$ {m.sale_price.toFixed(2)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                </div>
                {meals.filter(m => m.sale_price === 0).length > 0 && (
                  <p className="text-[11px] text-amber-400/70">Pratos sem precificação não aparecem na lista.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                  <DollarSign className="w-3 h-3" /> Preço de Venda (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold">R$</span>
                  <input
                    type="text"
                    className="input py-3 pl-12"
                    placeholder={selectedMeal ? maskCurrency(selectedMeal.sale_price) : '0,00'}
                    value={form.unit_sale_price}
                    onChange={e => setForm(f => ({ ...f, unit_sale_price: e.target.value }))}
                  />
                </div>
                {selectedMeal && (
                  <p className="text-[11px] text-muted">Preço padrão: R$ {selectedMeal.sale_price.toFixed(2)}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    className="input py-3"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Data
                  </label>
                  <input
                    type="date"
                    className="input py-3"
                    value={form.sale_date}
                    onChange={e => setForm(f => ({ ...f, sale_date: e.target.value }))}
                  />
                </div>
              </div>

              {collaborators.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                    <Users className="w-3 h-3 text-violet-400" />
                    Equipe — Colaborador
                  </label>
                  <div className="relative">
                    <select
                      className={cn(
                        "input py-3 pr-10 appearance-none transition-all",
                        selectedCollab && "border-violet-500/40 bg-violet-500/5 text-violet-200"
                      )}
                      value={form.collaborator_id}
                      onChange={e => setForm(f => ({ ...f, collaborator_id: e.target.value }))}
                    >
                      <option value="">— Sem colaborador —</option>
                      {collaborators.map(c => (
                        <option key={c.id} value={c.id}>{c.name} · {c.role}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                  </div>
                  {selectedCollab && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                      <div className="w-7 h-7 rounded-full bg-violet-500/30 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-black text-violet-300">{selectedCollab.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-violet-200 truncate">{selectedCollab.name}</p>
                        <p className="text-[10px] text-violet-400/70">{selectedCollab.role}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-violet-300">{selectedCollab.commission_percent}%</p>
                        <p className="text-[10px] text-violet-400/60">{commissionTypeLabel(selectedCollab.commission_type)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted">Canal de Venda</label>
                <div className="flex gap-2 flex-wrap">
                  {CHANNELS.map(ch => (
                    <button
                      key={ch}
                      onClick={() => setForm(f => ({ ...f, channel: ch }))}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                        form.channel === ch
                          ? "bg-orange-600 border-orange-500 text-white"
                          : "border-white/10 text-muted hover:border-white/30 hover:text-white"
                      )}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment method selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                  <CircleDollarSign className="w-3 h-3 text-emerald-400" />
                  Forma de Pagamento <span className="normal-case font-normal text-muted/60">(opcional)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(pm => {
                    const Icon = pm.icon;
                    const selected = form.payment_method === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, payment_method: selected ? '' : pm.id }))}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all",
                          selected
                            ? pm.color === 'emerald' ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                            : pm.color === 'violet'  ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                            : pm.color === 'blue'    ? "bg-blue-500/15 border-blue-500/40 text-blue-300"
                            : "bg-amber-500/15 border-amber-500/40 text-amber-300"
                            : "border-white/10 text-muted hover:border-white/25 hover:text-white"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {pm.label}
                        {selected && <Check className="w-3 h-3 ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {form.payment_method && (
                  <p className="text-[11px] text-emerald-400/70 px-1">✓ Venda já será registrada como recebida via <strong>{form.payment_method}</strong></p>
                )}
              </div>

              {collabMealBlocked && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 animate-fade-in">
                  <Ban className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-rose-300">
                      {selectedCollab?.name} não está autorizado(a) a trabalhar com <span className="text-white">{selectedMeal?.name}</span>.
                    </p>
                    {collabAllowedMealNames.length > 0 && (
                      <p className="text-[11px] text-rose-400/70">
                        Itens permitidos: {collabAllowedMealNames.join(', ')}
                      </p>
                    )}
                    <p className="text-[11px] text-rose-400/60">
                      Altere o prato, escolha outro colaborador, ou atualize as permissões na aba <span className="font-bold text-rose-300">Equipe</span>.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving || !selectedMeal || !snap || collabMealBlocked}
                className={cn(
                  "btn w-full py-4 justify-center disabled:opacity-40 transition-all",
                  collabMealBlocked
                    ? "bg-rose-500/20 border border-rose-500/30 text-rose-300 cursor-not-allowed"
                    : "btn-primary"
                )}
              >
                {saving ? 'Salvando...' : collabMealBlocked ? 'Lançamento Bloqueado' : 'Confirmar Lançamento'}
              </button>
            </div>

            {/* Right: snapshot preview */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Snapshot do Lançamento</h4>
              {snap && selectedMeal ? (
                <div className="bg-white/5 rounded-2xl border border-white/5 p-5 space-y-3">
                  <SnapRow label="Preço Unitário" value={`R$ ${snap.sp.toFixed(2)}`} />
                  {isIfood && (
                    <>
                      <SnapRow label={`(-) Comissão iFood (${selectedMeal.ifood_fee_percent}%)`} value={`- R$ ${snap.ifoodFee.toFixed(2)}`} variant="danger" icon={ShieldAlert} />
                      <SnapRow label="Valor Líquido (base imposto)" value={`R$ ${snap.netAfterComm.toFixed(2)}`} />
                    </>
                  )}
                  <SnapRow label={`(-) Impostos (${selectedMeal.tax_percent}% s/ ${isIfood ? 'valor líquido' : 'preço cheio'})`} value={`- R$ ${snap.taxVal.toFixed(2)}`} variant="danger" icon={ShieldAlert} />
                  <SnapRow label="(-) Custo Insumos" value={`- R$ ${snap.foodCost.toFixed(3)}`} variant="warning" icon={Utensils} />
                  <SnapRow label="(-) Custo Embalagem" value={`- R$ ${snap.packCost.toFixed(3)}`} variant="warning" icon={Package} />
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-white text-sm uppercase tracking-wider">Lucro Unit.</span>
                      <span className={cn("text-xl font-black", snap.unitProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        R$ {snap.unitProfit.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted font-bold uppercase">Margem</span>
                      <span className={cn(
                        "text-sm font-black px-3 py-0.5 rounded-lg",
                        snap.margin >= 30 ? "bg-emerald-500/10 text-emerald-400" : snap.margin >= 15 ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                      )}>
                        {snap.margin.toFixed(1)}%
                      </span>
                    </div>
                    {snap.qty > 1 && (
                      <div className="pt-2 border-t border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted font-bold uppercase">Total ({snap.qty}x)</span>
                          <div className="text-right">
                            <p className="text-xs text-muted">Receita: R$ {snap.totalRevenue.toFixed(2)}</p>
                            <p className={cn("text-sm font-black", snap.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                              Lucro: R$ {snap.totalProfit.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 rounded-2xl border border-white/5 p-8 text-center text-muted text-sm">
                  Selecione um prato para ver o snapshot.
                </div>
              )}

              {/* Collaborator commission card */}
              {selectedCollab && snap && (
                <div className={cn(
                  "border rounded-2xl p-4 space-y-3 animate-fade-in",
                  collabMealBlocked
                    ? "bg-rose-500/8 border-rose-500/30"
                    : "bg-violet-500/8 border-violet-500/25"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {collabMealBlocked
                        ? <Ban className="w-3.5 h-3.5 text-rose-400" />
                        : <Users className="w-3.5 h-3.5 text-violet-400" />
                      }
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        collabMealBlocked ? "text-rose-400" : "text-violet-400"
                      )}>
                        {collabMealBlocked ? 'Item não autorizado' : 'Comissão do Colaborador'}
                      </span>
                    </div>
                    {!collabMealBlocked && (
                      <span className="text-[10px] font-bold text-violet-400/60 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                        {commissionTypeLabel(selectedCollab.commission_type)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full border flex items-center justify-center shrink-0",
                      collabMealBlocked
                        ? "bg-rose-500/25 border-rose-500/30"
                        : "bg-violet-500/25 border-violet-500/30"
                    )}>
                      <span className={cn(
                        "text-sm font-black",
                        collabMealBlocked ? "text-rose-200" : "text-violet-200"
                      )}>{selectedCollab.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white truncate">{selectedCollab.name}</p>
                      <p className={cn(
                        "text-[11px]",
                        collabMealBlocked ? "text-rose-400/70" : "text-violet-400/70"
                      )}>
                        {selectedCollab.role}
                        {collabMealBlocked
                          ? ` · sem permissão para "${selectedMeal?.name}"`
                          : ` · ${selectedCollab.commission_percent}% de comissão`
                        }
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {collabMealBlocked ? (
                        <p className="text-sm font-black text-rose-400">Bloqueado</p>
                      ) : (
                        <>
                          <p className="text-[10px] text-muted font-bold uppercase mb-0.5">Comissão</p>
                          <p className="text-lg font-black text-violet-300">R$ {collabCommission.toFixed(2)}</p>
                        </>
                      )}
                    </div>
                  </div>
                  {!collabMealBlocked && (
                    <div className="pt-2 border-t border-violet-500/15">
                      {selectedCollab.commission_type === 'total' && (
                        <div className="text-[10px] text-violet-400/60 text-center">
                          Base: R$ {snap.totalRevenue.toFixed(2)} (receita bruta) × {selectedCollab.commission_percent}%
                        </div>
                      )}
                      {selectedCollab.commission_type === 'net' && (
                        <div className="text-[10px] text-violet-400/60 text-center">
                          Base: R$ {((snap.sp - snap.ifoodFee - snap.taxVal) * snap.qty).toFixed(2)} (após taxas) × {selectedCollab.commission_percent}%
                        </div>
                      )}
                      {selectedCollab.commission_type === 'profit' && (
                        <div className="text-[10px] text-violet-400/60 text-center">
                          Base: R$ {snap.totalProfit.toFixed(2)} (lucro total) × {selectedCollab.commission_percent}%
                        </div>
                      )}
                    </div>
                  )}
                  {collabMealBlocked && collabAllowedMealNames.length > 0 && (
                    <div className="pt-2 border-t border-rose-500/20 text-[10px] text-rose-400/60 text-center">
                      Itens autorizados: {collabAllowedMealNames.join(' · ')}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-muted px-1">
                Os valores acima serão <span className="text-amber-400 font-bold">congelados permanentemente</span> neste lançamento — mesmo que os custos mudem futuramente.
              </p>
            </div>
          </div>
        </div>
      )}

      {successId && (
        <div className="glass-panel border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-emerald-300 font-bold text-sm">Venda registrada com sucesso! (ID #{successId})</p>
        </div>
      )}

      {/* Historical sales */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-muted">Carregando...</div>
      ) : sales.length === 0 ? (
        <div className="glass-panel p-16 text-center">
          <ShoppingBag className="w-16 h-16 text-muted mx-auto mb-4 opacity-30" />
          <p className="text-muted text-lg">Nenhuma venda registrada ainda.</p>
          <p className="text-sm text-slate-600 mt-1">Clique em <strong>Novo Lançamento</strong> para começar.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => {
            const daySales = groupedByDate[date];
            const dayRevenue = daySales.reduce((a, s) => a + s.total_revenue, 0);
            const dayProfit = daySales.reduce((a, s) => a + s.total_profit, 0);
            const dayUnits = daySales.reduce((a, s) => a + s.quantity, 0);
            const [year, month, day] = date.split('-');
            const dateLabel = `${day}/${month}/${year}`;

            const dayReceived = daySales.reduce((a, s) => a + (s.payment_received === 1 ? s.total_revenue : 0), 0);
            const dayPending = daySales.filter(s => s.payment_received !== 1).length;
            return (
              <div key={date} className="space-y-2">
                {/* Day header */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-black text-white">{dateLabel}</span>
                    <span className="text-xs text-muted font-bold">{dayUnits} un.</span>
                    {dayPending > 0 && (
                      <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        {dayPending} pendente{dayPending > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-xs font-bold">
                    <span className="text-slate-400">Receita: <span className="text-white">R$ {dayRevenue.toFixed(2)}</span></span>
                    <span className="text-slate-400">Recebido: <span className="text-emerald-400">R$ {dayReceived.toFixed(2)}</span></span>
                    <span className="text-slate-400">Lucro: <span className={cn(dayProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>R$ {dayProfit.toFixed(2)}</span></span>
                  </div>
                </div>

                {/* Day rows */}
                <div className="space-y-2">
                  {daySales.map(sale => {
                    const isEditing = editingId === sale.id;
                    const isConfirmingPayment = confirmingPaymentId === sale.id;
                    const editSnap = isEditing ? calcEditSnapshot(sale) : null;
                    const margin = sale.unit_sale_price > 0 ? (sale.unit_profit / sale.unit_sale_price) * 100 : 0;
                    const pmInfo = PAYMENT_METHODS.find(p => p.id === sale.payment_method);
                    const PmIcon = pmInfo?.icon;
                    return (
                      <div key={sale.id} className={cn(
                        "glass-panel border transition-all",
                        isEditing ? "border-orange-500/40 bg-orange-500/5"
                        : isConfirmingPayment ? "border-emerald-500/30 bg-emerald-500/3"
                        : "border-white/5 hover:border-white/15"
                      )}>
                        {/* Main row */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              margin >= 30 ? "bg-emerald-400" : margin >= 15 ? "bg-amber-400" : "bg-rose-400"
                            )} />
                            <div>
                              <p className="font-black text-white">{sale.meal_name}</p>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-muted font-bold uppercase">{sale.channel}</span>
                                <span className="text-[10px] text-muted">•</span>
                                <span className="text-[10px] text-muted font-bold">{sale.quantity}x @ R$ {sale.unit_sale_price.toFixed(2)}</span>
                                <span className="text-[10px] text-muted">•</span>
                                <span className="text-[10px] text-muted font-bold">iFood {sale.ifood_fee_percent}% | Imposto {sale.tax_percent}%</span>
                                {sale.collaborator_name && (
                                  <span className="text-[10px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-lg">
                                    % {sale.collaborator_name}
                                  </span>
                                )}
                                {/* Payment badge */}
                                {sale.payment_received === 1 && pmInfo ? (
                                  <span className={cn(
                                    "text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1",
                                    pmInfo.color === 'emerald' ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                    : pmInfo.color === 'violet'  ? "bg-violet-500/10 border border-violet-500/20 text-violet-400"
                                    : pmInfo.color === 'blue'    ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                                    : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                                  )}>
                                    {PmIcon && <PmIcon className="w-2.5 h-2.5" />}
                                    {sale.payment_method}
                                  </span>
                                ) : sale.payment_received !== 1 ? (
                                  <span className="text-[10px] font-bold text-slate-500 bg-white/3 border border-white/8 px-2 py-0.5 rounded-lg">
                                    Aguardando recebimento
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-[10px] text-muted font-bold uppercase">Receita</p>
                              <p className="text-base font-black text-slate-200">R$ {sale.total_revenue.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-muted font-bold uppercase">Lucro</p>
                              <p className={cn("text-base font-black", sale.total_profit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                R$ {sale.total_profit.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-muted font-bold uppercase">Margem</p>
                              <span className={cn(
                                "text-sm font-black px-2 py-0.5 rounded-lg",
                                margin >= 30 ? "bg-emerald-500/10 text-emerald-400" : margin >= 15 ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                              )}>
                                {margin.toFixed(1)}%
                              </span>
                            </div>
                            {/* Action buttons */}
                            <div className="flex items-center gap-1 ml-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(sale)}
                                    disabled={saving}
                                    className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
                                    title="Salvar"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-2 rounded-lg bg-white/5 text-muted hover:bg-white/10 transition-all"
                                    title="Cancelar"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {/* Confirm payment button */}
                                  {sale.payment_received !== 1 ? (
                                    <button
                                      onClick={() => setConfirmingPaymentId(isConfirmingPayment ? null : sale.id)}
                                      className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black border transition-all",
                                        isConfirmingPayment
                                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                          : "bg-emerald-500/8 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-300"
                                      )}
                                      title="Confirmar Recebimento"
                                    >
                                      <CircleDollarSign className="w-3.5 h-3.5" />
                                      {isConfirmingPayment ? 'Cancelar' : 'Receber'}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleUndoPayment(sale.id)}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black border bg-white/3 border-white/10 text-slate-500 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 transition-all"
                                      title="Desfazer recebimento"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      Recebido
                                    </button>
                                  )}
                                  <button
                                    onClick={() => startEdit(sale)}
                                    className="p-2 rounded-lg bg-white/5 text-muted hover:bg-orange-500/20 hover:text-orange-400 transition-all"
                                    title="Editar"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(sale.id)}
                                    className="p-2 rounded-lg bg-white/5 text-muted hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inline edit form */}
                        {isEditing && (
                          <div className="px-5 pb-5 border-t border-orange-500/20 pt-4 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Preço Unitário</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">R$</span>
                                  <input
                                    type="text"
                                    className="input py-2 pl-9 text-sm"
                                    value={editForm.unit_sale_price}
                                    onChange={e => setEditForm(f => ({ ...f, unit_sale_price: e.target.value }))}
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Quantidade</label>
                                <input
                                  type="number"
                                  min="1"
                                  className="input py-2 text-sm"
                                  value={editForm.quantity}
                                  onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Data</label>
                                <input
                                  type="date"
                                  className="input py-2 text-sm"
                                  value={editForm.sale_date}
                                  onChange={e => setEditForm(f => ({ ...f, sale_date: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Canal</label>
                                <div className="flex gap-1 flex-wrap">
                                  {CHANNELS.map(ch => (
                                    <button
                                      key={ch}
                                      onClick={() => setEditForm(f => ({ ...f, channel: ch }))}
                                      className={cn(
                                        "px-2 py-1 rounded-lg text-[11px] font-bold border transition-all",
                                        editForm.channel === ch
                                          ? "bg-orange-600 border-orange-500 text-white"
                                          : "border-white/10 text-muted hover:border-white/30"
                                      )}
                                    >{ch}</button>
                                  ))}
                                </div>
                              </div>
                              {collaborators.length > 0 && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Colaborador</label>
                                  <select
                                    className="input py-2 text-sm appearance-none"
                                    value={editForm.collaborator_id}
                                    onChange={e => setEditForm(f => ({ ...f, collaborator_id: e.target.value }))}
                                  >
                                    <option value="">— Nenhum —</option>
                                    {collaborators.map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                            {editSnap && (
                              <div className="flex flex-wrap gap-3 text-[11px]">
                                <span className="text-muted">Preview: Receita <span className="text-white font-bold">R$ {editSnap.total_revenue.toFixed(2)}</span></span>
                                <span className="text-muted">Comissão <span className="text-rose-400 font-bold">R$ {editSnap.unit_ifood_fee.toFixed(2)}</span></span>
                                <span className="text-muted">Imposto <span className="text-rose-400 font-bold">R$ {editSnap.unit_tax.toFixed(2)}</span></span>
                                <span className="text-muted">Lucro <span className={cn("font-bold", editSnap.unit_profit >= 0 ? "text-emerald-400" : "text-rose-400")}>R$ {editSnap.unit_profit.toFixed(2)}/un · R$ {editSnap.total_profit.toFixed(2)} total</span></span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Inline payment picker */}
                        {isConfirmingPayment && (
                          <div className="px-5 pb-5 border-t border-emerald-500/20 pt-4 animate-fade-in">
                            <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <CircleDollarSign className="w-3.5 h-3.5" />
                              Confirmar recebimento de R$ {sale.total_revenue.toFixed(2)} — Como foi pago?
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {PAYMENT_METHODS.map(pm => {
                                const Icon = pm.icon;
                                return (
                                  <button
                                    key={pm.id}
                                    onClick={() => handleConfirmPayment(sale.id, pm.id)}
                                    className={cn(
                                      "flex items-center gap-2 px-4 py-3 rounded-xl border font-bold text-sm transition-all hover:scale-[1.02]",
                                      pm.color === 'emerald' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                                      : pm.color === 'violet'  ? "bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20"
                                      : pm.color === 'blue'    ? "bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                                      : "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                                    )}
                                  >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    {pm.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Frozen snapshot detail */}
                        {!isEditing && !isConfirmingPayment && (
                          <div className="px-5 pb-4 flex flex-wrap gap-4 border-t border-white/5 pt-3">
                            <SnapTag label="Custo Insumos" value={`R$ ${sale.unit_food_cost.toFixed(3)}`} />
                            <SnapTag label="Custo Embalagem" value={`R$ ${sale.unit_packaging_cost.toFixed(3)}`} />
                            <SnapTag label="Comissão iFood" value={`R$ ${sale.unit_ifood_fee.toFixed(2)}`} />
                            <SnapTag label="Impostos" value={`R$ ${sale.unit_tax.toFixed(2)}`} />
                            <SnapTag label="Lucro Unit." value={`R$ ${sale.unit_profit.toFixed(2)}`} highlight />
                            {sale.payment_received === 1 && sale.payment_method && (
                              <SnapTag label="Recebido via" value={sale.payment_method} highlight />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SnapRow({ label, value, variant, icon: Icon }: { label: string; value: string; variant?: 'danger' | 'warning'; icon?: any }) {
  return (
    <div className="flex justify-between items-center">
      <span className={cn(
        "text-sm font-bold flex items-center gap-1.5",
        variant === 'danger' ? "text-rose-400" : variant === 'warning' ? "text-amber-400" : "text-slate-300"
      )}>
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span className={cn(
        "text-sm font-black",
        variant === 'danger' ? "text-rose-400" : variant === 'warning' ? "text-amber-400" : "text-slate-200"
      )}>{value}</span>
    </div>
  );
}

function SnapTag({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold",
      highlight ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-400"
    )}>
      <span className="text-muted font-medium">{label}:</span>
      <span>{value}</span>
    </div>
  );
}
