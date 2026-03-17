'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, Trash2, Pencil, Save, Phone, MapPin, X,
  BarChart3, ShoppingCart, Package, FileText, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Clock, ChevronDown, ChevronRight,
  CheckCircle2, Calendar, Hash, DollarSign, Activity, Eye, Paperclip,
  UploadCloud, Download
} from 'lucide-react';
import { cn, maskCNPJ, maskPhone } from '@/lib/utils';

interface Supplier {
  id: number;
  name: string;
  contact: string;
  cnpj?: string;
  address?: string;
}

interface DashboardData {
  summary: {
    totalSessions: number;
    totalSpent: number;
    uniqueItems: number;
    avgTicket: number;
    totalExpenses: number;
    pendingExpenses: number;
    overdueExpenses: number;
    paidExpenses: number;
    totalExpenseCount: number;
  };
  byMonth: { month: string; totalSpent: number; sessions: number }[];
  topItems: {
    raw_material_id: number;
    raw_material_name: string;
    purchase_unit: string;
    totalQty: number;
    totalSpent: number;
    sessions: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
  }[];
  priceHistory: { name: string; unit: string; points: { date: string; price: number }[] }[];
  recentSessions: {
    id: number;
    date: string;
    sessionTotal: number;
    itemCount: number;
    items: { raw_material_name: string; purchase_unit: string; quantity: number; unit_price: number; total_price: number }[];
  }[];
  expenses: {
    id: number; name: string; category: string; value: number; period: string;
    paid: number; due_date: string | null; nf_number: string | null; nf_date: string | null; nf_file: string | null; created_at: string;
  }[];
}

const PT_MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}
function fmtDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function MiniBar({ value, max, color = 'emerald' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 2;
  return (
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-${color}-400/70`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function FornecedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', cnpj: '', address: '' });

  // Dashboard modal
  const [dashSupplier, setDashSupplier] = useState<Supplier | null>(null);
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [expandedPriceItem, setExpandedPriceItem] = useState<string | null>(null);
  const [dashTab, setDashTab] = useState<'compras' | 'itens' | 'precos' | 'despesas'>('compras');
  const [nfUploading, setNfUploading] = useState<number | null>(null); // expense id being uploaded

  const handleNfUpload = async (expId: number, file: File) => {
    setNfUploading(expId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/despesas/${expId}/nf-upload`, { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setDashData(prev => prev ? {
          ...prev,
          expenses: prev.expenses.map(e => e.id === expId ? { ...e, nf_file: data.filename } : e)
        } : prev);
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao enviar arquivo');
      }
    } catch (e) { console.error(e); } finally { setNfUploading(null); }
  };

  const handleNfDelete = async (expId: number) => {
    if (!confirm('Remover arquivo da nota fiscal?')) return;
    try {
      await fetch(`/api/despesas/${expId}/nf-upload`, { method: 'DELETE' });
      setDashData(prev => prev ? {
        ...prev,
        expenses: prev.expenses.map(e => e.id === expId ? { ...e, nf_file: null } : e)
      } : prev);
    } catch (e) { console.error(e); }
  };

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/fornecedores', { cache: 'no-store' });
      setSuppliers(await res.json());
    } catch { } finally { setLoading(false); }
  };

  const openDashboard = async (s: Supplier) => {
    setDashSupplier(s);
    setDashData(null);
    setDashLoading(true);
    setDashTab('compras');
    setExpandedSession(null);
    setExpandedPriceItem(null);
    try {
      const res = await fetch(`/api/fornecedores/${s.id}/dashboard`, { cache: 'no-store' });
      setDashData(await res.json());
    } catch { } finally { setDashLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/fornecedores/${editingId}` : '/api/fornecedores';
    await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSupplier) });
    setShowAddForm(false); setEditingId(null);
    setNewSupplier({ name: '', contact: '', cnpj: '', address: '' });
    fetchSuppliers();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este fornecedor?')) return;
    const res = await fetch(`/api/fornecedores/${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Erro ao excluir'); return; }
    fetchSuppliers();
  };

  const startEdit = (item: Supplier) => {
    setEditingId(item.id);
    setNewSupplier({ name: item.name, contact: item.contact, cnpj: item.cnpj || '', address: item.address || '' });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Fornecedores</h1>
          <p className="text-muted text-lg">Cadastro de parceiros, marcas e contatos de compras.</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); if (showAddForm) setEditingId(null); if (!showAddForm) setNewSupplier({ name: '', contact: '', cnpj: '', address: '' }); }}
          className={cn("btn px-8 py-4", showAddForm ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-600 hover:bg-emerald-500 text-white")}
        >
          {showAddForm ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          {showAddForm ? 'Cancelar' : 'Novo Fornecedor'}
        </button>
      </header>

      {showAddForm && (
        <div className="glass-panel p-10 border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Truck className="w-32 h-32 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold mb-8 text-white">{editingId ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}</h2>
          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="space-y-3 md:col-span-6">
                <label className="block text-sm font-bold uppercase tracking-wider text-muted">Nome / Marca</label>
                <input className="input py-4 px-6 w-full text-lg border-emerald-500/20 focus:border-emerald-500/50" placeholder="Ex: Assaí Atacadista..." value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} required />
              </div>
              <div className="space-y-3 md:col-span-6">
                <label className="block text-sm font-bold uppercase tracking-wider text-muted">CNPJ</label>
                <input className="input py-4 px-6 w-full text-lg border-emerald-500/20 focus:border-emerald-500/50" placeholder="00.000.000/0000-00" value={newSupplier.cnpj} onChange={e => setNewSupplier({ ...newSupplier, cnpj: maskCNPJ(e.target.value) })} />
              </div>
              <div className="space-y-3 md:col-span-4">
                <label className="block text-sm font-bold uppercase tracking-wider text-muted">Contato</label>
                <input className="input py-4 px-6 w-full text-lg border-emerald-500/20 focus:border-emerald-500/50" placeholder="(00) 00000-0000" value={newSupplier.contact} onChange={e => setNewSupplier({ ...newSupplier, contact: maskPhone(e.target.value) })} />
              </div>
              <div className="space-y-3 md:col-span-8">
                <label className="block text-sm font-bold uppercase tracking-wider text-muted">Endereço</label>
                <input className="input py-4 px-6 w-full text-lg border-emerald-500/20 focus:border-emerald-500/50" placeholder="Rua, Número, Bairro, Cidade" value={newSupplier.address} onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end pt-6 border-t border-emerald-500/20">
              <button type="submit" className="btn bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-5 text-lg">
                <Save className="w-5 h-5 mr-3" /> {editingId ? 'Atualizar' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="glass-panel p-16 text-center text-muted">Carregando...</div>
      ) : suppliers.length === 0 ? (
        <div className="glass-panel p-20 text-center flex flex-col items-center border-dashed border-white/10">
          <Truck className="w-20 h-20 text-emerald-500/20 mb-6" />
          <h3 className="text-2xl font-bold text-white mb-2">Nenhum fornecedor cadastrado</h3>
          <p className="text-muted max-w-sm mb-8">Adicione os parceiros comerciais, atacadistas e feiras onde você adquire sua matéria-prima.</p>
          <button onClick={() => setShowAddForm(true)} className="btn bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4">Cadastrar Primeiro Fornecedor</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">
          {suppliers.map(item => (
            <div key={item.id} className="glass-panel p-6 border-white/5 hover:border-emerald-500/30 transition-all flex flex-col group">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-2xl border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors truncate">{item.name}</h3>
                  {item.cnpj && <p className="text-sm font-bold text-slate-300 mt-1">CNPJ: {item.cnpj}</p>}
                  {item.contact && <p className="text-sm text-muted flex items-center gap-1.5 mt-1"><Phone className="w-3 h-3" /> {item.contact}</p>}
                  {item.address && <p className="text-sm text-muted flex items-center gap-1.5 mt-1"><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{item.address}</span></p>}
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-auto pt-4 border-t border-white/5">
                {/* Dashboard button */}
                <button
                  onClick={() => openDashboard(item)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex-1"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Ver Relatório
                </button>
                <button onClick={() => startEdit(item)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-all"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-white/5 hover:bg-rose-500/20 rounded-xl text-muted hover:text-rose-400 transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════ DASHBOARD MODAL ═══════════════════ */}
      {dashSupplier && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) setDashSupplier(null); }}>
          <div className="bg-[#0f1117] border border-white/10 rounded-3xl w-full max-w-5xl my-4 overflow-hidden shadow-2xl animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/8 bg-emerald-500/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">{dashSupplier.name}</h2>
                  <p className="text-sm text-muted">{dashSupplier.cnpj || dashSupplier.contact || dashSupplier.address || 'Fornecedor'}</p>
                </div>
              </div>
              <button onClick={() => setDashSupplier(null)} className="p-2.5 rounded-xl bg-white/5 text-muted hover:bg-white/10 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {dashLoading ? (
              <div className="p-20 text-center text-muted flex flex-col items-center gap-3">
                <Activity className="w-8 h-8 animate-pulse text-emerald-400" />
                <p>Carregando dados do fornecedor...</p>
              </div>
            ) : !dashData ? (
              <div className="p-16 text-center text-muted">Erro ao carregar dados.</div>
            ) : (
              <div className="p-8 space-y-8">

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Total Gasto', value: `R$ ${fmtBRL(dashData.summary.totalSpent)}`, sub: `${dashData.summary.totalSessions} compra${dashData.summary.totalSessions !== 1 ? 's' : ''}`, color: 'emerald', icon: DollarSign },
                    { label: 'Ticket Médio', value: `R$ ${fmtBRL(dashData.summary.avgTicket)}`, sub: 'por compra', color: 'teal', icon: ShoppingCart },
                    { label: 'Itens Únicos', value: String(dashData.summary.uniqueItems), sub: 'produtos diferentes', color: 'sky', icon: Package },
                    { label: 'Despesas', value: `R$ ${fmtBRL(dashData.summary.totalExpenses)}`, sub: `${dashData.summary.totalExpenseCount} lançamento${dashData.summary.totalExpenseCount !== 1 ? 's' : ''}`, color: 'violet', icon: FileText },
                    { label: 'Pendente', value: `R$ ${fmtBRL(dashData.summary.pendingExpenses)}`, sub: 'a pagar', color: 'amber', icon: Clock },
                    { label: 'Em Atraso', value: `R$ ${fmtBRL(dashData.summary.overdueExpenses)}`, sub: 'vencidas', color: dashData.summary.overdueExpenses > 0 ? 'red' : 'slate', icon: AlertTriangle },
                  ].map(({ label, value, sub, color, icon: Icon }) => (
                    <div key={label} className={`glass-panel p-4 border-${color}-500/20 bg-${color}-500/5`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon className={`w-3.5 h-3.5 text-${color}-400`} />
                        <p className={`text-[10px] font-black uppercase tracking-wider text-${color}-400/80`}>{label}</p>
                      </div>
                      <p className={`text-lg font-black text-${color}-300 leading-tight`}>{value}</p>
                      <p className="text-[10px] text-muted mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* ── Gastos por mês (chart) ── */}
                {dashData.byMonth.length > 0 && (
                  <div className="glass-panel p-6 border-white/5">
                    <div className="flex items-center gap-2 mb-5">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Gastos por Mês</h3>
                    </div>
                    {(() => {
                      const maxVal = Math.max(...dashData.byMonth.map(m => m.totalSpent));
                      return (
                        <div className="flex items-end gap-2 h-40 overflow-x-auto pb-2">
                          {dashData.byMonth.map(m => {
                            const pct = maxVal > 0 ? (m.totalSpent / maxVal) * 100 : 0;
                            const [y, mo] = m.month.split('-');
                            return (
                              <div key={m.month} className="flex flex-col items-center gap-1 flex-shrink-0 group/bar" style={{ minWidth: 52 }}>
                                <div className="text-[9px] text-emerald-300 font-black opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                                  R$ {fmtBRL(m.totalSpent)}
                                </div>
                                <div className="w-full rounded-t-lg bg-emerald-500/70 hover:bg-emerald-400 transition-colors cursor-default relative" style={{ height: `${Math.max(4, pct * 1.3)}px`, minWidth: 40 }}>
                                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-muted opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                                    {m.sessions}x
                                  </div>
                                </div>
                                <p className="text-[9px] text-muted font-bold text-center">{PT_MONTHS_SHORT[parseInt(mo) - 1]}</p>
                                <p className="text-[9px] text-muted/60">{y}</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── Tabs ── */}
                <div>
                  <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
                    {([
                      { id: 'compras', label: 'Compras', icon: ShoppingCart },
                      { id: 'itens', label: 'Itens', icon: Package },
                      { id: 'precos', label: 'Preços', icon: TrendingUp },
                      { id: 'despesas', label: 'Despesas / NFs', icon: FileText },
                    ] as const).map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setDashTab(id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all",
                          dashTab === id ? "bg-emerald-500 text-white shadow" : "text-muted hover:text-white"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" /> {label}
                      </button>
                    ))}
                  </div>

                  {/* ── Tab: Compras (recent sessions) ── */}
                  {dashTab === 'compras' && (
                    <div className="space-y-3">
                      {dashData.recentSessions.length === 0 ? (
                        <div className="glass-panel p-10 text-center text-muted">Nenhuma compra registrada para este fornecedor.</div>
                      ) : dashData.recentSessions.map(sess => (
                        <div key={sess.id} className="glass-panel border-white/5 overflow-hidden">
                          <button
                            onClick={() => setExpandedSession(expandedSession === sess.id ? null : sess.id)}
                            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors"
                          >
                            <div className="p-2 bg-emerald-500/10 rounded-xl shrink-0">
                              <ShoppingCart className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-black text-white">{fmtDate(sess.date)}</p>
                              <p className="text-xs text-muted">{sess.itemCount} {sess.itemCount === 1 ? 'item' : 'itens'}</p>
                            </div>
                            <p className="text-lg font-black text-emerald-400">R$ {fmtBRL(sess.sessionTotal)}</p>
                            {expandedSession === sess.id
                              ? <ChevronDown className="w-4 h-4 text-muted" />
                              : <ChevronRight className="w-4 h-4 text-muted" />
                            }
                          </button>
                          {expandedSession === sess.id && (
                            <div className="border-t border-white/5 px-5 pb-4">
                              <table className="w-full text-xs mt-3">
                                <thead>
                                  <tr className="text-muted border-b border-white/5">
                                    <th className="pb-2 text-left font-bold uppercase tracking-wider">Insumo</th>
                                    <th className="pb-2 text-center font-bold uppercase tracking-wider">Qtd</th>
                                    <th className="pb-2 text-right font-bold uppercase tracking-wider">Preço Unit.</th>
                                    <th className="pb-2 text-right font-bold uppercase tracking-wider text-emerald-400">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sess.items.map((item, i) => (
                                    <tr key={i} className="border-b border-white/3 hover:bg-white/3">
                                      <td className="py-2 text-slate-200 font-semibold">{item.raw_material_name}</td>
                                      <td className="py-2 text-center text-slate-400">{item.quantity} {item.purchase_unit}</td>
                                      <td className="py-2 text-right text-slate-400">R$ {fmtBRL(item.unit_price)}</td>
                                      <td className="py-2 text-right font-black text-emerald-300">R$ {fmtBRL(item.total_price)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td colSpan={3} className="pt-3 text-xs font-black text-muted uppercase tracking-wider">Total da compra</td>
                                    <td className="pt-3 text-right font-black text-white">R$ {fmtBRL(sess.sessionTotal)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Tab: Itens ── */}
                  {dashTab === 'itens' && (
                    <div className="glass-panel border-white/5 overflow-hidden">
                      {dashData.topItems.length === 0 ? (
                        <div className="p-10 text-center text-muted">Nenhum item encontrado.</div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-white/5 border-b border-white/8">
                              <th className="py-3 px-4 text-left text-muted font-bold uppercase tracking-wider">Produto</th>
                              <th className="py-3 px-4 text-center text-muted font-bold uppercase tracking-wider">Compras</th>
                              <th className="py-3 px-4 text-right text-muted font-bold uppercase tracking-wider">Qtd Total</th>
                              <th className="py-3 px-4 text-right text-muted font-bold uppercase tracking-wider">Preço Médio</th>
                              <th className="py-3 px-4 text-right text-muted font-bold uppercase tracking-wider">Min / Max</th>
                              <th className="py-3 px-4 text-right text-emerald-400 font-bold uppercase tracking-wider">Total Gasto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const maxSpent = Math.max(...dashData.topItems.map(i => i.totalSpent));
                              return dashData.topItems.map(item => {
                                const variation = item.maxPrice > 0 ? ((item.maxPrice - item.minPrice) / item.maxPrice) * 100 : 0;
                                const TrendIcon = variation < 5 ? Minus : variation < 20 ? TrendingUp : TrendingUp;
                                return (
                                  <tr key={item.raw_material_id} className="border-b border-white/5 hover:bg-white/3">
                                    <td className="py-3 px-4">
                                      <p className="font-bold text-slate-200">{item.raw_material_name}</p>
                                      <MiniBar value={item.totalSpent} max={maxSpent} />
                                    </td>
                                    <td className="py-3 px-4 text-center text-slate-400">{item.sessions}x</td>
                                    <td className="py-3 px-4 text-right text-slate-300">{item.totalQty.toFixed(2)} {item.purchase_unit}</td>
                                    <td className="py-3 px-4 text-right text-slate-300">R$ {fmtBRL(item.avgPrice)}</td>
                                    <td className="py-3 px-4 text-right">
                                      <span className="text-emerald-400/80">R$ {fmtBRL(item.minPrice)}</span>
                                      <span className="text-slate-600 mx-1">/</span>
                                      <span className="text-rose-400/80">R$ {fmtBRL(item.maxPrice)}</span>
                                      {variation >= 5 && (
                                        <span className={cn("ml-1 text-[9px] font-black", variation >= 20 ? "text-rose-400" : "text-amber-400")}>
                                          ↑{variation.toFixed(0)}%
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-right font-black text-emerald-300">R$ {fmtBRL(item.totalSpent)}</td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* ── Tab: Preços (price history) ── */}
                  {dashTab === 'precos' && (
                    <div className="space-y-3">
                      {dashData.priceHistory.length === 0 ? (
                        <div className="glass-panel p-10 text-center text-muted">Histórico de preços indisponível. São necessárias ao menos 2 compras do mesmo insumo.</div>
                      ) : dashData.priceHistory.map(ph => {
                        const key = ph.name;
                        const isExpanded = expandedPriceItem === key;
                        const first = ph.points[0].price;
                        const last = ph.points[ph.points.length - 1].price;
                        const variation = ((last - first) / first) * 100;
                        const isUp = variation > 0.5;
                        const isDown = variation < -0.5;
                        const maxP = Math.max(...ph.points.map(p => p.price));
                        const minP = Math.min(...ph.points.map(p => p.price));
                        return (
                          <div key={key} className="glass-panel border-white/5 overflow-hidden">
                            <button
                              onClick={() => setExpandedPriceItem(isExpanded ? null : key)}
                              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors"
                            >
                              <div className={cn("p-2 rounded-xl shrink-0", isUp ? "bg-rose-500/10" : isDown ? "bg-emerald-500/10" : "bg-white/5")}>
                                {isUp ? <TrendingUp className="w-4 h-4 text-rose-400" /> : isDown ? <TrendingDown className="w-4 h-4 text-emerald-400" /> : <Minus className="w-4 h-4 text-slate-400" />}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-black text-white">{ph.name}</p>
                                <p className="text-xs text-muted">{ph.points.length} registros · {ph.unit}</p>
                              </div>
                              <div className="text-right mr-3">
                                <p className="text-xs text-muted">R$ {fmtBRL(first)} → R$ {fmtBRL(last)}</p>
                                <p className={cn("text-sm font-black", isUp ? "text-rose-400" : isDown ? "text-emerald-400" : "text-slate-400")}>
                                  {isUp ? '+' : ''}{variation.toFixed(1)}%
                                </p>
                              </div>
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted shrink-0" />}
                            </button>
                            {isExpanded && (
                              <div className="border-t border-white/5 px-5 pb-5">
                                {/* Mini price chart */}
                                <div className="mt-4 mb-3">
                                  <div className="flex items-end gap-1 h-20 overflow-x-auto">
                                    {ph.points.map((pt, i) => {
                                      const range = maxP - minP || 1;
                                      const pct = ((pt.price - minP) / range) * 100;
                                      const isLast = i === ph.points.length - 1;
                                      return (
                                        <div key={i} className="flex flex-col items-center gap-0.5 flex-shrink-0 group/pt" style={{ minWidth: 36 }}>
                                          <div className="text-[8px] text-white/70 opacity-0 group-hover/pt:opacity-100 transition-opacity whitespace-nowrap">
                                            R$ {fmtBRL(pt.price)}
                                          </div>
                                          <div
                                            className={cn("w-5 rounded-t-md transition-colors cursor-default", isLast ? "bg-emerald-400" : "bg-emerald-500/50 hover:bg-emerald-500/80")}
                                            style={{ height: `${Math.max(4, pct * 0.6 + 10)}px` }}
                                          />
                                          <p className="text-[8px] text-muted/70 text-center" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', maxHeight: 36 }}>
                                            {fmtDate(pt.date).substring(0, 5)}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                {/* Table */}
                                <table className="w-full text-xs mt-2">
                                  <thead>
                                    <tr className="text-muted border-b border-white/5">
                                      <th className="pb-2 text-left font-bold">Data</th>
                                      <th className="pb-2 text-right font-bold">Preço Unit.</th>
                                      <th className="pb-2 text-right font-bold">Variação</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ph.points.map((pt, i) => {
                                      const prev = ph.points[i - 1];
                                      const delta = prev ? ((pt.price - prev.price) / prev.price) * 100 : null;
                                      return (
                                        <tr key={i} className="border-b border-white/3">
                                          <td className="py-1.5 text-slate-400">{fmtDate(pt.date)}</td>
                                          <td className="py-1.5 text-right font-black text-slate-200">R$ {fmtBRL(pt.price)}</td>
                                          <td className="py-1.5 text-right">
                                            {delta !== null && (
                                              <span className={cn("font-bold text-[10px]", delta > 0 ? "text-rose-400" : delta < 0 ? "text-emerald-400" : "text-slate-500")}>
                                                {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── Tab: Despesas / NFs ── */}
                  {dashTab === 'despesas' && (
                    <div className="space-y-3">
                      {dashData.expenses.length === 0 ? (
                        <div className="glass-panel p-10 text-center text-muted">Nenhuma despesa vinculada a este fornecedor.</div>
                      ) : (
                        <>
                          {/* Summary bar */}
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'Total', value: dashData.summary.totalExpenses, color: 'violet' },
                              { label: 'Pago', value: dashData.summary.paidExpenses, color: 'emerald' },
                              { label: 'Pendente', value: dashData.summary.pendingExpenses, color: 'amber' },
                            ].map(({ label, value, color }) => (
                              <div key={label} className={`glass-panel p-4 border-${color}-500/20 bg-${color}-500/5 text-center`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest text-${color}-400 mb-1`}>{label}</p>
                                <p className={`text-xl font-black text-${color}-300`}>R$ {fmtBRL(value)}</p>
                              </div>
                            ))}
                          </div>
                          {dashData.expenses.map(exp => {
                            const isOverdue = !exp.paid && exp.due_date && exp.due_date < today;
                            const isDueToday = !exp.paid && exp.due_date === today;
                            return (
                              <div key={exp.id} className={cn("glass-panel px-5 py-4 border-white/5 flex flex-col md:flex-row md:items-center gap-3",
                                isOverdue ? "bg-red-500/5 border-red-500/15" : isDueToday ? "bg-amber-500/5 border-amber-500/15" : ""
                              )}>
                                <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1", exp.paid ? "bg-emerald-400" : isOverdue ? "bg-red-400" : "bg-amber-400")} />
                                <div className="flex-1 min-w-0">
                                  <p className={cn("font-bold text-sm truncate", exp.paid ? "text-slate-400 line-through" : "text-slate-100")}>{exp.name}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[10px] text-muted">{exp.category}</span>
                                    {exp.due_date && !exp.paid && (
                                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1",
                                        isOverdue ? "text-red-300 bg-red-500/15 border border-red-500/25 animate-pulse"
                                          : isDueToday ? "text-amber-300 bg-amber-500/15 border border-amber-500/25"
                                            : "text-slate-400 bg-white/5 border border-white/10"
                                      )}>
                                        {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                                        {isOverdue ? `VENCIDA ${fmtDate(exp.due_date)}` : isDueToday ? 'VENCE HOJE' : `Vence ${fmtDate(exp.due_date)}`}
                                      </span>
                                    )}
                                    {exp.nf_number && (
                                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-emerald-500/20">
                                        <FileText className="w-3 h-3" /> NF {exp.nf_number}
                                      </span>
                                    )}
                                    {exp.nf_file && (
                                      <a
                                        href={`/uploads/nf/${exp.nf_file}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-sky-500/20 transition-all"
                                        title="Abrir arquivo da Nota Fiscal"
                                      >
                                        <Paperclip className="w-3 h-3" /> Ver NF
                                      </a>
                                    )}
                                    {exp.paid ? (
                                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> PAGO
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {/* NF PDF Actions */}
                                  {exp.nf_file ? (
                                    <div className="flex gap-1.5">
                                      <a
                                        href={`/uploads/nf/${exp.nf_file}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-500/15 border border-sky-500/25 text-sky-400 rounded-xl text-[10px] font-black hover:bg-sky-500/25 transition-all"
                                        title="Visualizar PDF"
                                      >
                                        <Eye className="w-3 h-3" /> Ver
                                      </a>
                                      <a
                                        href={`/uploads/nf/${exp.nf_file}`}
                                        download
                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-xl text-[10px] font-black hover:bg-emerald-500/25 transition-all"
                                        title="Baixar PDF"
                                      >
                                        <Download className="w-3 h-3" /> Baixar
                                      </a>
                                      <button
                                        onClick={() => handleNfDelete(exp.id)}
                                        className="flex items-center gap-1 px-2 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black hover:bg-red-500/20 transition-all"
                                        title="Remover arquivo"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <label
                                      className={cn(
                                        "flex items-center gap-1 px-2.5 py-1.5 border rounded-xl text-[10px] font-black transition-all cursor-pointer",
                                        nfUploading === exp.id
                                          ? "bg-orange-500/20 border-orange-500/30 text-orange-300 cursor-wait"
                                          : "bg-white/5 border-white/15 text-slate-400 hover:bg-emerald-500/10 hover:border-emerald-500/25 hover:text-emerald-400"
                                      )}
                                      title="Anexar PDF da nota fiscal"
                                    >
                                      {nfUploading === exp.id
                                        ? <><Clock className="w-3 h-3 animate-spin" /> Enviando...</>
                                        : <><UploadCloud className="w-3 h-3" /> Anexar NF</>
                                      }
                                      <input
                                        type="file"
                                        accept="application/pdf,.pdf,image/jpeg,image/png"
                                        className="hidden"
                                        disabled={nfUploading !== null}
                                        onChange={e => { const f = e.target.files?.[0]; if (f) handleNfUpload(exp.id, f); e.target.value = ''; }}
                                      />
                                    </label>
                                  )}
                                  <div className="text-right">
                                    <p className={cn("text-lg font-black", exp.paid ? "text-slate-500" : isOverdue ? "text-red-400" : "text-rose-400")}>
                                      R$ {fmtBRL(exp.value)}
                                    </p>
                                    <p className="text-[10px] text-muted">{fmtDate(exp.created_at?.substring(0, 10))}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
