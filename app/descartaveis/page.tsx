'use client';

import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Plus, Save, Trash2, Pencil, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Disposable {
  id: number;
  name: string;
  category: string;
  unit: string;
  unit_cost: number;
  stock_quantity: number;
}

const CATEGORIES = ['Talher', 'Copo', 'Prato', 'Embalagem', 'Guardanapo', 'Sacola', 'Outros'];

const emptyForm = { name: '', category: 'Talher', unit: 'un' };

export default function DescartaveisPage() {
  const [items, setItems] = useState<Disposable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    fetchItems();
    const onVisible = () => { if (document.visibilityState === 'visible') fetchItems(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/descartaveis', { cache: 'no-store' });
      setItems(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/descartaveis/${editingId}` : '/api/descartaveis';
    const method = editingId ? 'PUT' : 'POST';
    try {
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      fetchItems();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (item: Disposable) => {
    setEditingId(item.id);
    setForm({ name: item.name, category: item.category, unit: item.unit });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir este item?')) return;
    await fetch(`/api/descartaveis/${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const totalValue = items.reduce((acc, i) => acc + i.unit_cost * i.stock_quantity, 0);

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const group = items.filter(i => i.category === cat);
    if (group.length > 0) acc[cat] = group;
    return acc;
  }, {} as Record<string, Disposable[]>);

  return (
    <div className="space-y-8 animate-fade-in max-w-[1400px] mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Talheres e Descartáveis</h1>
          <p className="text-muted text-lg">Controle de estoque de itens descartáveis e utensílios.</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) { setEditingId(null); setForm({ ...emptyForm }); } }}
          className={cn('btn px-8 py-4', showForm ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'btn-primary')}
        >
          {showForm ? <Trash2 className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          {showForm ? 'Cancelar' : 'Novo Item'}
        </button>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="p-3 bg-orange-500/20 rounded-xl"><Package className="w-6 h-6 text-orange-400" /></div>
          <div>
            <p className="text-xs text-muted font-bold uppercase tracking-widest">Total de Itens Cadastrados</p>
            <p className="text-2xl font-black text-white">{items.length}</p>
          </div>
        </div>
        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl"><UtensilsCrossed className="w-6 h-6 text-emerald-400" /></div>
          <div>
            <p className="text-xs text-muted font-bold uppercase tracking-widest">Valor Total em Estoque</p>
            <p className="text-2xl font-black text-emerald-400">R$ {totalValue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-panel p-8 border-orange-500/20 bg-orange-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10"><UtensilsCrossed className="w-32 h-32" /></div>
          <h2 className="text-xl font-bold mb-6 text-white">{editingId ? 'Editar Item' : 'Cadastrar Novo Item'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Nome do Item</label>
                <input className="input py-3" placeholder="Ex: Garfo Descartável" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Categoria</label>
                <select className="input py-3" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Unidade</label>
                <select className="input py-3" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  <option value="un">un (unidade)</option>
                  <option value="pct">pct (pacote)</option>
                  <option value="cx">cx (caixa)</option>
                  <option value="rolo">rolo</option>
                </select>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
              O <strong>custo por unidade</strong> e o <strong>estoque</strong> são atualizados automaticamente pela <strong>Lista de Compras</strong>. Cadastre o item aqui e registre as compras lá.
            </div>
            <div className="flex justify-end pt-4 border-t border-white/10">
              <button type="submit" className="btn btn-primary px-10 py-4">
                <Save className="w-5 h-5 mr-2" /> Salvar Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items grouped by category */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-muted">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="glass-panel p-16 text-center">
          <UtensilsCrossed className="w-16 h-16 text-muted mx-auto mb-4 opacity-30" />
          <p className="text-muted text-lg">Nenhum item cadastrado.</p>
          <p className="text-sm text-slate-600 mt-1">Clique em "Novo Item" para começar.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} className="glass-panel overflow-hidden border-white/5">
            <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-orange-400">{cat}</span>
              <span className="text-xs text-muted">({catItems.length} {catItems.length === 1 ? 'item' : 'itens'})</span>
            </div>
            <div className="table-container border-none bg-transparent">
              <table>
                <thead>
                  <tr>
                    <th className="!bg-transparent !pl-6">Item</th>
                    <th className="!bg-transparent text-right">Custo Unit.</th>
                    <th className="!bg-transparent text-right">Estoque</th>
                    <th className="!bg-transparent text-right">Valor Total</th>
                    <th className="!bg-transparent text-right !pr-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {catItems.map(item => (
                    <tr key={item.id} className="hover:!bg-white/[0.02]">
                      <td className="!pl-6">
                        <p className="font-bold text-slate-200">{item.name}</p>
                        <p className="text-xs text-muted">{item.unit}</p>
                      </td>
                      <td className="text-right text-slate-400 font-medium">R$ {item.unit_cost.toFixed(3)}</td>
                      <td className="text-right font-bold text-slate-200">
                        {item.stock_quantity} <span className="text-xs opacity-60">{item.unit}</span>
                      </td>
                      <td className="text-right font-black text-emerald-400">R$ {(item.unit_cost * item.stock_quantity).toFixed(2)}</td>
                      <td className="!pr-6">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleEdit(item)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-muted hover:text-primary transition-all">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-muted hover:text-rose-400 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
