'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Banknote, Plus, Trash2, PieChart, Pencil, Check, X,
  FileText, CheckCircle2, RotateCcw, ChevronDown, Package, ShoppingCart,
  Tags, Repeat, AlertCircle, Search, Truck, Calendar, Clock, AlertTriangle,
  Hash, SplitSquareHorizontal, Zap, Upload, Eye, Paperclip
} from 'lucide-react';
import { cn, maskCurrency, unmaskCurrency } from '@/lib/utils';

interface Expense {
  id: number;
  name: string;
  category: string;
  value: number;
  period: string;
  paid: number;
  nf_number: string | null;
  nf_date: string | null;
  nf_notes: string | null;
  nf_key: string | null;
  nf_file: string | null;
  due_date: string | null;
  shopping_session_id: number | null;
  supplier_name: string | null;
  created_at: string;
}

interface ShoppingItem {
  id: number;
  raw_material_id: number;
  raw_material_name: string;
  purchase_unit: string;
  brand: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier_name: string | null;
}

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

interface Category {
  id: number;
  name: string;
}

export default function DespesasPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nfOpenId, setNfOpenId] = useState<number | null>(null);

  const todayDespesas = new Date().toISOString().split('T')[0];
  const currentYearDespesas = String(new Date().getFullYear());

  const [filterModeDespesas, setFilterModeDespesas] = useState<'dia' | 'mes' | 'ano' | 'tudo'>('mes');
  const [filterValueDespesas, setFilterValueDespesas] = useState(() => todayDespesas.substring(0, 7));
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);

  const handleFilterModeDespesas = (mode: 'dia' | 'mes' | 'ano' | 'tudo') => {
    setFilterModeDespesas(mode);
    setShowOnlyOverdue(false);
    if (mode === 'dia') setFilterValueDespesas(todayDespesas);
    else if (mode === 'mes') setFilterValueDespesas(todayDespesas.substring(0, 7));
    else if (mode === 'ano') setFilterValueDespesas(currentYearDespesas);
    else setFilterValueDespesas('');
  };

  // Categories management
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catError, setCatError] = useState('');
  const [deletingCatId, setDeletingCatId] = useState<number | null>(null);

  // Recurring / installments
  type RecurringMode = 'once' | 'monthly' | 'parcelas';
  const [recurringMode, setRecurringMode] = useState<RecurringMode>('once');
  const [monthlyCount, setMonthlyCount] = useState('3');
  const [parcelasCount, setParcelasCount] = useState('2');
  const [parcelaDates, setParcelaDates] = useState<string[]>([]);
  const parcelaDueDateBaseRef = useRef('');

  // Shopping items state
  const [itensOpenId, setItensOpenId] = useState<number | null>(null);
  const [sessionItems, setSessionItems] = useState<ShoppingItem[]>([]);
  const [editingItems, setEditingItems] = useState<Record<number, { quantity: string; unit_price: string }>>({});
  const [savingItems, setSavingItems] = useState(false);
  const [itensSearch, setItensSearch] = useState('');

  const [form, setForm] = useState({
    name: '',
    category: '',
    value: '0',
    period: 'Monthly',
    nf_number: '',
    nf_date: '',
    nf_notes: '',
    nf_key: '',
    due_date: '',
  });

  const [nfForm, setNfForm] = useState({ nf_number: '', nf_date: '', nf_notes: '', nf_key: '' });
  const [nfUploading, setNfUploading] = useState(false);

  const handleNfFileUpload = async (expId: number, file: File) => {
    setNfUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/despesas/${expId}/nf-upload`, { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setExpenses(prev => prev.map(e => e.id === expId ? { ...e, nf_file: data.filename } : e));
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao enviar arquivo');
      }
    } catch (e) { console.error(e); }
    setNfUploading(false);
  };

  const handleNfFileDelete = async (expId: number) => {
    try {
      const res = await fetch(`/api/despesas/${expId}/nf-upload`, { method: 'DELETE' });
      if (res.ok) {
        setExpenses(prev => prev.map(e => e.id === expId ? { ...e, nf_file: null } : e));
      }
    } catch (e) { console.error(e); }
  };

  // Sync parcelaDates when due_date or parcelasCount changes
  useEffect(() => {
    if (!form.due_date) {
      setParcelaDates([]);
      parcelaDueDateBaseRef.current = '';
      return;
    }
    const count = Math.max(2, parseInt(parcelasCount) || 2);
    if (form.due_date !== parcelaDueDateBaseRef.current) {
      // Base date changed → full reset of all dates
      parcelaDueDateBaseRef.current = form.due_date;
      setParcelaDates(
        Array.from({ length: count }, (_, i) => {
          const d = new Date(form.due_date + 'T12:00:00');
          d.setMonth(d.getMonth() + i);
          return d.toISOString().split('T')[0];
        })
      );
    } else {
      // Only count changed → preserve user edits, extend/trim
      setParcelaDates(prev => {
        if (prev.length === count) return prev;
        const result = [...prev.slice(0, count)];
        while (result.length < count) {
          const lastDate = result[result.length - 1] || form.due_date;
          const d = new Date(lastDate + 'T12:00:00');
          d.setMonth(d.getMonth() + 1);
          result.push(d.toISOString().split('T')[0]);
        }
        return result;
      });
    }
  }, [form.due_date, parcelasCount]);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    const onVis = () => { if (document.visibilityState === 'visible') fetchExpenses(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/despesas', { cache: 'no-store' });
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categorias-despesa', { cache: 'no-store' });
      const data: Category[] = await res.json();
      setCategories(data);
      setForm(f => ({ ...f, category: f.category || data[0]?.name || '' }));
    } catch (e) { console.error(e); }
  };

  const addCategory = async () => {
    setCatError('');
    if (!newCatName.trim()) return;
    const res = await fetch('/api/categorias-despesa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim() }),
    });
    if (res.ok) {
      setNewCatName('');
      fetchCategories();
    } else {
      const d = await res.json();
      setCatError(d.error || 'Erro ao criar categoria');
    }
  };

  const deleteCategory = async (cat: Category) => {
    setDeletingCatId(cat.id);
    const res = await fetch(`/api/categorias-despesa/${cat.id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchCategories();
    } else {
      const d = await res.json();
      alert(d.error || 'Erro ao excluir');
    }
    setDeletingCatId(null);
  };

  const resetForm = () => {
    setForm({ name: '', category: categories[0]?.name || '', value: '0', period: 'Monthly', nf_number: '', nf_date: '', nf_notes: '', nf_key: '', due_date: '' });
    setRecurringMode('once');
    setMonthlyCount('3');
    setParcelasCount('2');
    setParcelaDates([]);
    parcelaDueDateBaseRef.current = '';
    setEditingId(null);
  };

  const startEdit = (exp: Expense) => {
    setForm({
      name: exp.name,
      category: exp.category,
      value: maskCurrency(exp.value),
      period: exp.period,
      nf_number: exp.nf_number ?? '',
      nf_date: exp.nf_date ?? '',
      nf_notes: exp.nf_notes ?? '',
      nf_key: exp.nf_key ?? '',
      due_date: exp.due_date ?? '',
    });
    setEditingId(exp.id);
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const basePayload = {
      name: form.name,
      category: form.category,
      value: unmaskCurrency(form.value),
      period: form.period,
      nf_number: form.nf_number || null,
      nf_date: form.nf_date || null,
      nf_notes: form.nf_notes || null,
      nf_key: form.nf_key || null,
      due_date: form.due_date || null,
    };

    if (editingId) {
      await fetch(`/api/despesas/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePayload),
      });
    } else if (recurringMode === 'monthly') {
      // Generate one expense per month, N times
      const count = Math.max(1, parseInt(monthlyCount) || 1);
      const baseDate = form.due_date ? new Date(form.due_date + 'T12:00:00') : new Date();
      const reqs: Promise<any>[] = [];
      for (let i = 0; i < count; i++) {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + i);
        const label = `${form.name} — ${PT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        const due = d.toISOString().split('T')[0];
        reqs.push(fetch('/api/despesas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...basePayload, name: label, due_date: due }),
        }));
      }
      await Promise.all(reqs);
    } else if (recurringMode === 'parcelas') {
      // Generate N installments — use user-edited parcelaDates
      const count = Math.max(2, parseInt(parcelasCount) || 2);
      const reqs: Promise<any>[] = [];
      for (let i = 0; i < count; i++) {
        const due = parcelaDates[i] || (() => {
          const d = new Date((form.due_date || '') + 'T12:00:00');
          d.setMonth(d.getMonth() + i);
          return d.toISOString().split('T')[0];
        })();
        const label = `${form.name} — Parcela ${i + 1}/${count}`;
        reqs.push(fetch('/api/despesas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...basePayload, name: label, due_date: due }),
        }));
      }
      await Promise.all(reqs);
    } else {
      await fetch('/api/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePayload),
      });
    }

    setShowAdd(false);
    resetForm();
    fetchExpenses();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir esta despesa?')) return;
    const res = await fetch(`/api/despesas/${id}`, { method: 'DELETE' });
    if (res.ok) fetchExpenses();
    else { const d = await res.json(); alert('Erro: ' + (d.error || 'desconhecido')); }
  };

  const togglePaid = async (exp: Expense) => {
    await fetch(`/api/despesas/${exp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid: exp.paid ? 0 : 1 }),
    });
    fetchExpenses();
  };

  const openNf = (exp: Expense) => {
    setNfForm({ nf_number: exp.nf_number ?? '', nf_date: exp.nf_date ?? '', nf_notes: exp.nf_notes ?? '', nf_key: exp.nf_key ?? '' });
    setNfOpenId(exp.id);
  };

  const saveNf = async (id: number, override?: { nf_number: string; nf_date: string; nf_notes: string; nf_key: string }) => {
    await fetch(`/api/despesas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(override ?? nfForm),
    });
    setNfOpenId(null);
    fetchExpenses();
  };

  const openItens = async (exp: Expense) => {
    if (itensOpenId === exp.id) {
      setItensOpenId(null);
      setItensSearch('');
      return;
    }
    setItensOpenId(exp.id);
    setSessionItems([]);
    setEditingItems({});
    setItensSearch('');
    try {
      const res = await fetch(`/api/despesas/${exp.id}/itens`, { cache: 'no-store' });
      const data: ShoppingItem[] = await res.json();
      setSessionItems(data);
      const initial: Record<number, { quantity: string; unit_price: string }> = {};
      data.forEach(item => {
        initial[item.id] = {
          quantity: item.quantity.toString(),
          unit_price: maskCurrency(item.unit_price),
        };
      });
      setEditingItems(initial);
    } catch (e) { console.error(e); }
  };

  const saveItens = async (expId: number) => {
    setSavingItems(true);
    try {
      const items = sessionItems.map(item => ({
        id: item.id,
        quantity: parseFloat(editingItems[item.id]?.quantity || '0') || 0,
        unit_price: unmaskCurrency(editingItems[item.id]?.unit_price || '0'),
      }));
      const res = await fetch(`/api/despesas/${expId}/itens`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        setItensOpenId(null);
        fetchExpenses();
      }
    } catch (e) { console.error(e); } finally { setSavingItems(false); }
  };

  const itemTotal = (itemId: number) => {
    const entry = editingItems[itemId];
    if (!entry) return 0;
    const qty = parseFloat(entry.quantity) || 0;
    const price = unmaskCurrency(entry.unit_price);
    return qty * price;
  };

  const itensGrandTotal = () =>
    sessionItems.reduce((acc, item) => acc + itemTotal(item.id), 0);

  const today = new Date().toISOString().split('T')[0];

  const filteredExpenses = expenses.filter(e => {
    // Period filter
    if (filterModeDespesas !== 'tudo') {
      const dateStr = e.created_at || '';
      if (!dateStr.startsWith(filterValueDespesas)) return false;
    }
    // Overdue filter
    if (showOnlyOverdue) {
      if (e.paid || !e.due_date || e.due_date >= today) return false;
    }
    return true;
  });

  const availableYearsDespesas = [...new Set(expenses.map(e => (e.created_at || '').substring(0, 4)).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));
  if (!availableYearsDespesas.includes(currentYearDespesas)) availableYearsDespesas.unshift(currentYearDespesas);
  const totalMonthly = filteredExpenses.reduce((acc, curr) => acc + curr.value, 0);
  const totalPaid = filteredExpenses.filter(e => e.paid).reduce((acc, e) => acc + e.value, 0);
  const totalPending = totalMonthly - totalPaid;
  const totalOverdue = filteredExpenses
    .filter(e => !e.paid && e.due_date && e.due_date < today)
    .reduce((acc, e) => acc + e.value, 0);

  return (
    <div className="space-y-10 animate-fade-in max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Despesas e Compras</h1>
          <p className="text-muted text-lg">Gestão inteligente de <span className="text-rose-400 font-bold">despesas fixas</span> e notas de compra.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCatManager(v => !v)}
            className={cn("btn px-5 py-3 text-sm", showCatManager ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-white/5 text-muted border border-white/10 hover:border-white/20 hover:text-white")}
          >
            <Tags className="w-4 h-4 mr-2" />
            Categorias
          </button>
          <button
            onClick={() => { setShowAdd(v => !v); if (showAdd) resetForm(); }}
            className={cn("btn px-8 py-4", showAdd ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "btn-primary")}
          >
            {showAdd ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
            {showAdd ? 'Cancelar' : 'Nova Despesa'}
          </button>
        </div>
      </header>

      {/* Category manager panel */}
      {showCatManager && (
        <div className="glass-panel p-8 border-violet-500/20 bg-violet-500/5 animate-fade-in">
          <div className="flex items-center gap-2 mb-6">
            <Tags className="w-5 h-5 text-violet-400" />
            <h2 className="text-xl font-bold text-white">Gerenciar Categorias</h2>
          </div>
          <div className="flex gap-3 mb-6">
            <input
              className="input py-2.5 flex-1"
              placeholder="Nova categoria..."
              value={newCatName}
              onChange={e => { setNewCatName(e.target.value); setCatError(''); }}
              onKeyDown={e => e.key === 'Enter' && addCategory()}
            />
            <button onClick={addCategory} className="btn btn-primary px-5 py-2.5">
              <Plus className="w-4 h-4 mr-1.5" /> Adicionar
            </button>
          </div>
          {catError && (
            <div className="flex items-center gap-2 text-rose-400 text-sm mb-4">
              <AlertCircle className="w-4 h-4" /> {catError}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-sm font-semibold text-slate-200 truncate">{cat.name}</span>
                <button
                  onClick={() => deleteCategory(cat)}
                  disabled={deletingCatId === cat.id}
                  title="Excluir categoria"
                  className="p-1 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-40 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Period filter bar */}
      <div className="flex items-center gap-3 glass-panel px-5 py-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <Banknote className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-black text-muted uppercase tracking-widest">Período</span>
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {(['dia','mes','ano','tudo'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => handleFilterModeDespesas(mode)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-black transition-all",
                filterModeDespesas === mode ? "bg-rose-500 text-white shadow" : "text-muted hover:text-white"
              )}
            >
              {mode === 'dia' ? 'Dia' : mode === 'mes' ? 'Mês' : mode === 'ano' ? 'Ano' : 'Tudo'}
            </button>
          ))}
        </div>
        {filterModeDespesas === 'dia' && (
          <input type="date" className="input py-1.5 text-sm w-auto" value={filterValueDespesas} onChange={e => setFilterValueDespesas(e.target.value)} />
        )}
        {filterModeDespesas === 'mes' && (
          <input type="month" className="input py-1.5 text-sm w-auto" value={filterValueDespesas} onChange={e => setFilterValueDespesas(e.target.value)} />
        )}
        {filterModeDespesas === 'ano' && (
          <select className="input py-1.5 text-sm w-auto" value={filterValueDespesas} onChange={e => setFilterValueDespesas(e.target.value)}>
            {availableYearsDespesas.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {/* Em Atraso toggle */}
        <button
          onClick={() => setShowOnlyOverdue(v => !v)}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black border transition-all",
            showOnlyOverdue
              ? "bg-red-500/20 border-red-500/40 text-red-300"
              : totalOverdue > 0
                ? "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20 animate-pulse"
                : "bg-white/5 border-white/10 text-muted hover:border-white/20"
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          {showOnlyOverdue ? 'Ver todas' : `Em Atraso${totalOverdue > 0 ? ` (${filteredExpenses.filter(e => !e.paid && !!e.due_date && e.due_date < today).length})` : ''}`}
        </button>

        <span className="text-xs text-muted ml-auto">
          {showOnlyOverdue
            ? `${filteredExpenses.length} em atraso`
            : filterModeDespesas === 'tudo'
              ? `${expenses.length} despesa${expenses.length !== 1 ? 's' : ''} no total`
              : `${filteredExpenses.length} despesa${filteredExpenses.length !== 1 ? 's' : ''} no período`
          }
        </span>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-7 border-l-4 border-l-rose-500/50 bg-rose-500/5">
          <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em] mb-3">Total do Período</h3>
          <p className="text-4xl font-black text-rose-400">R$ {totalMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-panel p-7 border-l-4 border-l-emerald-500/50 bg-emerald-500/5">
          <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em] mb-3">Pago</h3>
          <p className="text-4xl font-black text-emerald-400">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-panel p-7 border-l-4 border-l-amber-500/50 bg-amber-500/5">
          <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em] mb-3">Pendente</h3>
          <p className="text-4xl font-black text-amber-400">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <button
          onClick={() => totalOverdue > 0 && setShowOnlyOverdue(v => !v)}
          className={cn("glass-panel p-7 border-l-4 transition-all text-left w-full", totalOverdue > 0 ? "border-l-red-500/70 bg-red-500/8 cursor-pointer hover:bg-red-500/12" : "border-l-slate-500/30 bg-white/2 cursor-default", showOnlyOverdue ? "ring-2 ring-red-500/40" : "")}
        >
          <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
            {totalOverdue > 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
            Em Atraso
            {totalOverdue > 0 && <span className="ml-auto text-[9px] text-red-400/60 normal-case font-bold">{showOnlyOverdue ? '▲ filtrado' : 'clique p/ filtrar'}</span>}
          </h3>
          <p className={cn("text-4xl font-black", totalOverdue > 0 ? "text-red-400" : "text-slate-500")}>
            R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          {totalOverdue > 0 && (
            <p className="text-[10px] text-red-400/70 font-bold mt-2">
              {filteredExpenses.filter(e => !e.paid && e.due_date && e.due_date < today).length} despesa(s) vencida(s)
            </p>
          )}
        </button>
      </section>

      {/* Add / Edit form */}
      {showAdd && (
        <div className="glass-panel border-orange-500/20 bg-orange-500/3 animate-fade-in overflow-hidden">
          {/* Form header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/15 rounded-xl border border-orange-500/20">
                <Banknote className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">{editingId ? 'Editar Despesa' : 'Nova Despesa'}</h2>
                <p className="text-xs text-muted">{editingId ? 'Atualize os dados abaixo' : 'Preencha os campos para registrar'}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-7">

            {/* ── Bloco 1: Dados principais ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5 space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted">Descrição *</label>
                <input
                  className="input py-3 text-base font-semibold"
                  placeholder="Ex: Aluguel da Cozinha"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="md:col-span-4 space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted">Categoria</label>
                <div className="relative">
                  <select className="input py-3 appearance-none" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                </div>
              </div>
              <div className="md:col-span-3 space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted">Valor (R$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">R$</span>
                  <input
                    type="text"
                    className="input py-3 pl-9 text-base font-black text-white"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* ── Bloco 2: Vencimento + NF (colapsável visualmente) ── */}
            <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
              {/* Vencimento — destaque */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/8">
                <div className="p-4 space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Vencimento
                  </label>
                  <input
                    type="date"
                    className={cn("input py-2.5 text-sm w-full",
                      form.due_date && form.due_date < today
                        ? "border-red-500/40 bg-red-500/8 text-red-300"
                        : form.due_date
                          ? "border-amber-500/30 bg-amber-500/5 text-amber-200"
                          : ""
                    )}
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  />
                  {form.due_date && form.due_date < today && (
                    <p className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Já vencida
                    </p>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Nº Nota Fiscal
                  </label>
                  <input className="input py-2.5 text-sm w-full" placeholder="Opcional" value={form.nf_number} onChange={e => setForm(f => ({ ...f, nf_number: e.target.value }))} />
                </div>
                <div className="p-4 space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted">Data da NF</label>
                  <input type="date" className="input py-2.5 text-sm w-full" value={form.nf_date} onChange={e => setForm(f => ({ ...f, nf_date: e.target.value }))} />
                </div>
                <div className="p-4 space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted">Observações</label>
                  <input className="input py-2.5 text-sm w-full" placeholder="Opcional" value={form.nf_notes} onChange={e => setForm(f => ({ ...f, nf_notes: e.target.value }))} />
                </div>
              </div>
              {/* Chave NF-e */}
              <div className="border-t border-white/8 px-4 py-3 space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Chave de Acesso NF-e (44 dígitos)
                </label>
                <div className="relative">
                  <input
                    className="input py-2.5 text-sm font-mono tracking-wider w-full pr-16"
                    placeholder="00000000000000000000000000000000000000000000"
                    maxLength={44}
                    value={form.nf_key}
                    onChange={e => setForm(f => ({ ...f, nf_key: e.target.value.replace(/\D/g, '').slice(0, 44) }))}
                  />
                  {form.nf_key && (
                    <span className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black",
                      form.nf_key.length === 44 ? "text-emerald-400" : "text-muted"
                    )}>
                      {form.nf_key.length}/44
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Bloco 3: Tipo de lançamento (apenas para novos) ── */}
            {!editingId && (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-muted mb-3">Tipo de Lançamento</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'once',     icon: Zap,                    label: 'Avulso',     sub: 'Um único registro',           color: 'orange' },
                      { id: 'monthly',  icon: Repeat,                 label: 'Mensal',     sub: 'Repete mês a mês',            color: 'violet' },
                      { id: 'parcelas', icon: SplitSquareHorizontal,  label: 'Parcelado',  sub: 'Divide em parcelas',          color: 'sky'    },
                    ] as const).map(({ id, icon: Icon, label, sub, color }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRecurringMode(id)}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-2xl border text-left transition-all",
                          recurringMode === id
                            ? color === 'orange' ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                            : color === 'violet' ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                                                 : "bg-sky-500/15 border-sky-500/40 text-sky-300"
                            : "bg-white/3 border-white/8 text-muted hover:border-white/15 hover:text-slate-300"
                        )}
                      >
                        <div className={cn("p-2 rounded-xl shrink-0",
                          recurringMode === id
                            ? color === 'orange' ? "bg-orange-500/20" : color === 'violet' ? "bg-violet-500/20" : "bg-sky-500/20"
                            : "bg-white/5"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-black">{label}</p>
                          <p className="text-[11px] opacity-60 font-medium">{sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monthly options */}
                {recurringMode === 'monthly' && (
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-5 animate-fade-in space-y-4">
                    <p className="text-xs font-black text-violet-300 uppercase tracking-widest flex items-center gap-2">
                      <Repeat className="w-3.5 h-3.5" /> Configurar Recorrência Mensal
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="space-y-2 flex-1">
                        <label className="text-[11px] font-black uppercase tracking-widest text-muted">Repetir por quantos meses?</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range" min="1" max="36"
                            value={monthlyCount}
                            onChange={e => setMonthlyCount(e.target.value)}
                            className="flex-1 accent-violet-500"
                          />
                          <div className="bg-violet-500/20 border border-violet-500/30 rounded-xl px-4 py-2 text-center min-w-[60px]">
                            <p className="text-xl font-black text-violet-200">{monthlyCount}</p>
                            <p className="text-[9px] text-violet-400 font-bold">meses</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-muted">1º vencimento em</label>
                        <input
                          type="date"
                          className="input py-2.5 text-sm border-violet-500/30 bg-violet-500/5"
                          value={form.due_date}
                          onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    {/* Preview */}
                    {form.due_date && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Prévia dos lançamentos</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {Array.from({ length: Math.min(parseInt(monthlyCount) || 1, 12) }).map((_, i) => {
                            const d = new Date(form.due_date + 'T12:00:00');
                            d.setMonth(d.getMonth() + i);
                            return (
                              <div key={i} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-center">
                                <p className="text-[10px] font-black text-violet-300">{PT_MONTHS[d.getMonth()].substring(0,3)} {d.getFullYear()}</p>
                                <p className="text-[9px] text-muted">vence {d.getDate().toString().padStart(2,'0')}/{(d.getMonth()+1).toString().padStart(2,'0')}</p>
                              </div>
                            );
                          })}
                          {parseInt(monthlyCount) > 12 && (
                            <div className="bg-white/3 border border-white/5 rounded-xl px-3 py-2 text-center flex items-center justify-center">
                              <p className="text-[10px] text-muted font-bold">+ {parseInt(monthlyCount) - 12} mais</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Parcelas options */}
                {recurringMode === 'parcelas' && (
                  <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-5 animate-fade-in space-y-4">
                    <p className="text-xs font-black text-sky-300 uppercase tracking-widest flex items-center gap-2">
                      <SplitSquareHorizontal className="w-3.5 h-3.5" /> Configurar Parcelamento
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="space-y-2 flex-1">
                        <label className="text-[11px] font-black uppercase tracking-widest text-muted">Número de parcelas</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range" min="2" max="48"
                            value={parcelasCount}
                            onChange={e => setParcelasCount(e.target.value)}
                            className="flex-1 accent-sky-500"
                          />
                          <div className="bg-sky-500/20 border border-sky-500/30 rounded-xl px-4 py-2 text-center min-w-[60px]">
                            <p className="text-xl font-black text-sky-200">{parcelasCount}x</p>
                            <p className="text-[9px] text-sky-400 font-bold">parcelas</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-muted">Vencimento da 1ª parcela</label>
                        <input
                          type="date"
                          className="input py-2.5 text-sm border-sky-500/30 bg-sky-500/5"
                          value={form.due_date}
                          onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    {/* Parcelas preview table */}
                    {form.due_date && unmaskCurrency(form.value) > 0 && parcelaDates.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Prévia das parcelas <span className="text-sky-400/70 normal-case font-medium">— edite os vencimentos abaixo</span></p>
                        <div className="rounded-xl border border-white/8 overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-white/5 border-b border-white/8">
                                <th className="py-2 px-3 text-left text-muted font-bold uppercase tracking-wider">Parcela</th>
                                <th className="py-2 px-3 text-left text-muted font-bold uppercase tracking-wider">Vencimento</th>
                                <th className="py-2 px-3 text-right text-sky-400 font-bold uppercase tracking-wider">Valor</th>
                              </tr>
                            </thead>
                            <tbody className={cn(parseInt(parcelasCount) > 8 && "block max-h-64 overflow-y-auto")}>
                              {Array.from({ length: parseInt(parcelasCount) || 2 }).map((_, i) => {
                                const val = unmaskCurrency(form.value);
                                return (
                                  <tr key={i} className={cn("border-b border-white/5 hover:bg-white/3", parseInt(parcelasCount) > 8 && "table")}>
                                    <td className="py-1.5 px-3 font-black text-slate-300 w-16">
                                      {i + 1}/{parcelasCount}
                                    </td>
                                    <td className="py-1.5 px-3">
                                      <input
                                        type="date"
                                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 hover:border-sky-500/40 focus:border-sky-500 focus:outline-none focus:bg-sky-500/10 transition-all w-36"
                                        value={parcelaDates[i] || ''}
                                        onChange={e => {
                                          const updated = [...parcelaDates];
                                          updated[i] = e.target.value;
                                          setParcelaDates(updated);
                                        }}
                                      />
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-black text-sky-300">
                                      R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-white/5 border-t border-white/10">
                                <td colSpan={2} className="py-2.5 px-3 text-xs font-black text-muted uppercase tracking-wider">Total</td>
                                <td className="py-2.5 px-3 text-right font-black text-white">
                                  R$ {(unmaskCurrency(form.value) * (parseInt(parcelasCount) || 2)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary w-full py-4 text-base font-black rounded-2xl tracking-wider"
            >
              {editingId
                ? 'SALVAR ALTERAÇÕES'
                : recurringMode === 'monthly'
                  ? `GERAR ${monthlyCount} DESPESAS MENSAIS`
                  : recurringMode === 'parcelas'
                    ? `REGISTRAR ${parcelasCount} PARCELAS`
                    : 'REGISTRAR DESPESA'
              }
            </button>
          </form>
        </div>
      )}

      {/* Expense list */}
      <div className="glass-panel overflow-hidden border-white/5">
        <div className="p-8 border-b border-white/5 bg-white/5">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <PieChart className="w-6 h-6 text-primary" />
            Detalhamento de Gastos
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted">Carregando...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-muted">
            {expenses.length === 0 ? 'Nenhuma despesa cadastrada.' : 'Nenhuma despesa no período selecionado.'}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredExpenses.map(exp => {
              const isOverdue = !exp.paid && !!exp.due_date && exp.due_date < today;
              const isDueToday = !exp.paid && !!exp.due_date && exp.due_date === today;
              return (
              <div key={exp.id} className={cn(
                "transition-all",
                exp.paid ? "bg-emerald-500/[0.03]" : isOverdue ? "bg-red-500/[0.04]" : isDueToday ? "bg-amber-500/[0.03]" : ""
              )}>
                {/* Main row */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 px-8 py-5">
                  {/* Status dot + name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      exp.paid ? "bg-emerald-400" : "bg-amber-400"
                    )} />
                    <div className="min-w-0">
                      <p className={cn("font-bold text-lg leading-tight truncate", exp.paid ? "text-slate-400 line-through" : "text-slate-100")}>
                        {exp.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted font-black uppercase tracking-widest">{exp.category}</span>
                        {(!exp.shopping_session_id || exp.period !== 'Avulso') && (
                          <span className="badge badge-primary py-0.5 px-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px]">
                            {exp.period === 'Monthly' ? 'MENSAL' : exp.period === 'Annual' ? 'ANUAL' : exp.period.toUpperCase()}
                          </span>
                        )}
                        {exp.shopping_session_id && (
                          <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3" /> Compra
                          </span>
                        )}
                        {exp.supplier_name ? (
                          <span className="text-[10px] text-sky-300 font-bold bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <Truck className="w-3 h-3" /> {exp.supplier_name}
                          </span>
                        ) : exp.shopping_session_id ? (
                          <span className="text-[10px] text-slate-500 font-bold bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <Truck className="w-3 h-3" /> Sem Fornecedor
                          </span>
                        ) : null}
                        {exp.nf_number && (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <FileText className="w-3 h-3" /> NF {exp.nf_number}
                          </span>
                        )}
                        {exp.nf_file && (
                          <a
                            href={`/uploads/nf/${exp.nf_file}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[10px] text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-sky-500/20 transition-all"
                            title="Abrir arquivo da NF"
                          >
                            <Paperclip className="w-3 h-3" /> Arquivo NF
                          </a>
                        )}
                        {/* Due date badge */}
                        {exp.due_date && !exp.paid && (() => {
                          const isOverdue = exp.due_date < today;
                          const isDueToday = exp.due_date === today;
                          const [dy, dm, dd] = exp.due_date.split('-');
                          const label = `${dd}/${dm}/${dy}`;
                          if (isOverdue) return (
                            <span className="text-[10px] font-black text-red-300 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> VENCIDA {label}
                            </span>
                          );
                          if (isDueToday) return (
                            <span className="text-[10px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Clock className="w-3 h-3" /> VENCE HOJE
                            </span>
                          );
                          return (
                            <span className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Vence {label}
                            </span>
                          );
                        })()}
                        {exp.due_date && exp.paid && (() => {
                          const [dy, dm, dd] = exp.due_date.split('-');
                          return (
                            <span className="text-[10px] font-bold text-slate-500 bg-white/3 border border-white/5 px-2 py-0.5 rounded-lg flex items-center gap-1 line-through">
                              <Calendar className="w-3 h-3" /> {dd}/{dm}/{dy}
                            </span>
                          );
                        })()}
                        {exp.paid && (
                          <span className="text-[10px] text-emerald-400 font-bold">PAGO</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Value */}
                  <p className={cn("text-xl font-black shrink-0", exp.paid ? "text-slate-500" : "text-rose-400")}>
                    R$ {exp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 flex-wrap">
                    {/* Pago toggle */}
                    <button
                      onClick={() => togglePaid(exp)}
                      title={exp.paid ? 'Reabrir pagamento' : 'Marcar como pago'}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all",
                        exp.paid
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                      )}
                    >
                      {exp.paid
                        ? <><RotateCcw className="w-3.5 h-3.5" /> Reabrir</>
                        : <><CheckCircle2 className="w-3.5 h-3.5" /> Pago</>
                      }
                    </button>

                    {/* Itens da compra button — only for shopping sessions */}
                    {exp.shopping_session_id && (
                      <button
                        onClick={() => openItens(exp)}
                        title="Ver itens da compra"
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all",
                          itensOpenId === exp.id
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                        )}
                      >
                        <Package className="w-3.5 h-3.5" />
                        Itens da Compra
                      </button>
                    )}

                    {/* NF button */}
                    <button
                      onClick={() => nfOpenId === exp.id ? setNfOpenId(null) : openNf(exp)}
                      title="Nota Fiscal"
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all",
                        nfOpenId === exp.id
                          ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
                          : exp.nf_number || exp.nf_file
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-white/5 text-muted border-white/10 hover:border-white/20 hover:text-white"
                      )}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {exp.nf_number ? `NF ${exp.nf_number}` : 'Nota Fiscal'}
                      {exp.nf_file && <Paperclip className="w-3 h-3 ml-0.5 opacity-70" />}
                    </button>

                    {/* Quick PDF view — only when file is attached and form is closed */}
                    {exp.nf_file && nfOpenId !== exp.id && (
                      <a
                        href={`/uploads/nf/${exp.nf_file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir PDF da NF"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-sky-500/20 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> PDF
                      </a>
                    )}

                    {/* Edit */}
                    <button
                      onClick={() => startEdit(exp)}
                      title="Editar"
                      className="p-2 rounded-xl text-muted hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10 transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(exp.id)}
                      title="Excluir"
                      className="p-2 rounded-xl text-muted hover:bg-rose-500/10 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Shopping items inline panel */}
                {itensOpenId === exp.id && (
                  <div className="mx-8 mb-5 p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-black text-white uppercase tracking-wider">Itens da Compra</span>
                        <span className="text-xs text-muted">— edite quantidades e preços unitários</span>
                      </div>
                    </div>

                    {sessionItems.length === 0 ? (
                      <p className="text-center text-muted text-sm py-4">Carregando itens...</p>
                    ) : (
                      <>
                        {/* Search */}
                        <div className="relative mb-3">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                          <input
                            className="input py-2 pl-9 text-sm w-full bg-white/5"
                            placeholder="Pesquisar insumo ou fornecedor..."
                            value={itensSearch}
                            onChange={e => setItensSearch(e.target.value)}
                          />
                        </div>

                        {/* Table header */}
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-muted border-b border-white/5 mb-2">
                          <div className="col-span-3">Insumo</div>
                          <div className="col-span-2">Fornecedor</div>
                          <div className="col-span-2">Marca</div>
                          <div className="col-span-2 text-center">Qtd</div>
                          <div className="col-span-1 text-center">Preço Unit.</div>
                          <div className="col-span-2 text-right">Total</div>
                        </div>

                        <div className="space-y-1">
                          {sessionItems.filter(item =>
                            !itensSearch ||
                            item.raw_material_name?.toLowerCase().includes(itensSearch.toLowerCase()) ||
                            item.supplier_name?.toLowerCase().includes(itensSearch.toLowerCase()) ||
                            item.brand?.toLowerCase().includes(itensSearch.toLowerCase())
                          ).map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-xl hover:bg-white/5 transition-all">
                              <div className="col-span-3">
                                <p className="text-sm font-semibold text-white truncate">{item.raw_material_name}</p>
                                <p className="text-[10px] text-muted">{item.purchase_unit}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-blue-400 truncate flex items-center gap-1">
                                  <Truck className="w-3 h-3 shrink-0" />
                                  {item.supplier_name || <span className="text-muted italic">—</span>}
                                </p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-slate-400 truncate">{item.brand}</p>
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  className="input py-1.5 text-sm text-center w-full"
                                  value={editingItems[item.id]?.quantity ?? item.quantity}
                                  onChange={e => setEditingItems(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], quantity: e.target.value }
                                  }))}
                                />
                              </div>
                              <div className="col-span-1">
                                <input
                                  type="text"
                                  className="input py-1.5 text-sm text-center w-full"
                                  value={editingItems[item.id]?.unit_price ?? maskCurrency(item.unit_price)}
                                  onChange={e => setEditingItems(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], unit_price: maskCurrency(e.target.value) }
                                  }))}
                                />
                              </div>
                              <div className="col-span-2 text-right">
                                <p className="text-sm font-bold text-orange-400">
                                  R$ {itemTotal(item.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Grand total */}
                        <div className="flex justify-between items-center pt-3 mt-3 border-t border-white/10 px-3">
                          <span className="text-sm font-black uppercase tracking-wider text-muted">Total da Compra</span>
                          <span className="text-xl font-black text-white">
                            R$ {itensGrandTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => saveItens(exp.id)}
                            disabled={savingItems}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            {savingItems ? 'Salvando...' : 'Salvar Alterações'}
                          </button>
                          <button
                            onClick={() => setItensOpenId(null)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-muted rounded-xl text-sm font-bold hover:bg-white/10 transition-all"
                          >
                            <X className="w-4 h-4" /> Cancelar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* NF inline form */}
                {nfOpenId === exp.id && (
                  <div className="mx-8 mb-5 p-5 bg-orange-500/5 border border-orange-500/20 rounded-2xl animate-fade-in">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-black text-white uppercase tracking-wider">Nota Fiscal</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Número da NF</label>
                        <input
                          className="input py-2 text-sm"
                          placeholder="Ex: 001234"
                          value={nfForm.nf_number}
                          onChange={e => setNfForm(f => ({ ...f, nf_number: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Data da NF</label>
                        <input
                          type="date"
                          className="input py-2 text-sm"
                          value={nfForm.nf_date}
                          onChange={e => setNfForm(f => ({ ...f, nf_date: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Observações</label>
                        <input
                          className="input py-2 text-sm"
                          placeholder="Fornecedor, referência..."
                          value={nfForm.nf_notes}
                          onChange={e => setNfForm(f => ({ ...f, nf_notes: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1 md:col-span-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Chave de Acesso NF-e (44 dígitos)</label>
                        <input
                          className="input py-2 text-sm font-mono tracking-wider"
                          placeholder="00000000000000000000000000000000000000000000"
                          maxLength={44}
                          value={nfForm.nf_key}
                          onChange={e => setNfForm(f => ({ ...f, nf_key: e.target.value.replace(/\D/g, '').slice(0, 44) }))}
                        />
                        {nfForm.nf_key && <p className="text-[10px] text-muted mt-0.5">{nfForm.nf_key.length}/44 dígitos</p>}
                      </div>

                      {/* ── PDF Upload ── */}
                      <div className="space-y-2 md:col-span-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                          <Paperclip className="w-3 h-3" /> Arquivo da Nota Fiscal (PDF / Imagem)
                        </label>
                        {exp.nf_file ? (
                          <div className="flex items-center gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3">
                            <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-xs text-emerald-300 font-medium flex-1 truncate">
                              {exp.nf_file.replace(/^nf-\d+-\d+/, 'nota-fiscal')}
                            </span>
                            <a
                              href={`/uploads/nf/${exp.nf_file}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/15 border border-sky-500/20 text-sky-400 rounded-lg text-xs font-bold hover:bg-sky-500/25 transition-all shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver arquivo
                            </a>
                            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg text-xs font-bold hover:bg-orange-500/20 transition-all shrink-0 cursor-pointer">
                              <Upload className="w-3.5 h-3.5" /> Substituir
                              <input
                                type="file"
                                accept="application/pdf,.pdf,image/jpeg,image/png"
                                className="hidden"
                                disabled={nfUploading}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleNfFileUpload(exp.id, f); e.target.value = ''; }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleNfFileDelete(exp.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-bold hover:bg-rose-500/20 transition-all shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remover
                            </button>
                          </div>
                        ) : (
                          <label className={cn(
                            "flex flex-col items-center gap-2 border-2 border-dashed border-white/12 rounded-xl p-5 cursor-pointer transition-all group",
                            nfUploading ? "opacity-60 pointer-events-none" : "hover:border-orange-500/30 hover:bg-orange-500/3"
                          )}>
                            {nfUploading ? (
                              <>
                                <span className="w-5 h-5 border-2 border-orange-400/40 border-t-orange-400 rounded-full animate-spin" />
                                <span className="text-xs text-orange-400">Enviando arquivo...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-muted group-hover:text-orange-400 transition-colors" />
                                <div className="text-center">
                                  <p className="text-xs font-bold text-muted group-hover:text-orange-300 transition-colors">Clique para anexar a NF</p>
                                  <p className="text-[10px] text-slate-600 mt-0.5">PDF, JPG ou PNG</p>
                                </div>
                              </>
                            )}
                            <input
                              type="file"
                              accept="application/pdf,.pdf,image/jpeg,image/png"
                              className="hidden"
                              disabled={nfUploading}
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleNfFileUpload(exp.id, f); e.target.value = ''; }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => saveNf(exp.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/30 transition-all"
                      >
                        <Check className="w-4 h-4" /> Salvar NF
                      </button>
                      <button
                        onClick={() => setNfOpenId(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 text-muted rounded-xl text-sm font-bold hover:bg-white/10 transition-all"
                      >
                        <X className="w-4 h-4" /> Cancelar
                      </button>
                      {exp.nf_number && (
                        <button
                          onClick={() => saveNf(exp.id, { nf_number: '', nf_date: '', nf_notes: '', nf_key: '' })}
                          className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-500/20 transition-all ml-auto"
                        >
                          <Trash2 className="w-4 h-4" /> Remover NF
                        </button>
                      )}
                    </div>
                    {exp.nf_notes && (
                      <p className="text-xs text-muted mt-3">Obs: {exp.nf_notes}</p>
                    )}
                  </div>
                )}
              </div>
            ); })}
          </div>
        )}
      </div>
    </div>
  );
}
