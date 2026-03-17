'use client';

import React, { useState, useEffect } from 'react';
import { Utensils, Plus, Trash2, Package, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CardapioPage() {
  const [meals, setMeals] = useState<any[]>([]);
  const [fichas, setFichas] = useState<any[]>([]);
  const [allDisposables, setAllDisposables] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingMealId, setEditingMealId] = useState<number | null>(null);

  const emptyMeal = { name: '', components: [] as any[], disposables: [] as { disposable_id: number; quantity: number }[] };
  const [newMeal, setNewMeal] = useState({ ...emptyMeal });

  useEffect(() => {
    fetchMeals();
    fetchFichas();
    fetchDisposables();
  }, []);

  const fetchMeals = async () => {
    try {
      const res = await fetch('/api/cardapio', { cache: 'no-store' });
      const data = await res.json();
      setMeals(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchFichas = async () => {
    try {
      const res = await fetch('/api/fichas');
      setFichas(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchDisposables = async () => {
    try {
      const res = await fetch('/api/descartaveis');
      const data = await res.json();
      setAllDisposables(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const toggleDisposable = (disposable_id: number) => {
    const exists = newMeal.disposables.find(d => d.disposable_id === disposable_id);
    if (exists) {
      setNewMeal({ ...newMeal, disposables: newMeal.disposables.filter(d => d.disposable_id !== disposable_id) });
    } else {
      setNewMeal({ ...newMeal, disposables: [...newMeal.disposables, { disposable_id, quantity: 1 }] });
    }
  };

  const updateDisposableQty = (disposable_id: number, quantity: number) => {
    setNewMeal({ ...newMeal, disposables: newMeal.disposables.map(d => d.disposable_id === disposable_id ? { ...d, quantity } : d) });
  };

  const addCompToNew = () => {
    if (fichas.length === 0) return;
    setNewMeal({ ...newMeal, components: [...newMeal.components, { technical_sheet_id: fichas[0].id, quantity: 1 }] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingMealId ? `/api/cardapio/${editingMealId}` : '/api/cardapio';
      const method = editingMealId ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newMeal) });
      setShowAdd(false);
      setEditingMealId(null);
      setNewMeal({ ...emptyMeal });
      fetchMeals();
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja realmente excluir este item do cardápio?')) return;
    try {
      await fetch(`/api/cardapio/${id}`, { method: 'DELETE' });
      fetchMeals();
    } catch (error) { console.error(error); }
  };

  const startEdit = (meal: any) => {
    setEditingMealId(meal.id);
    setNewMeal({
      name: meal.name,
      components: meal.components || [],
      disposables: (meal.disposables || []).map((d: any) => ({ disposable_id: d.disposable_id, quantity: d.quantity }))
    });
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Gestão de Cardápio</h1>
          <p className="text-muted text-lg">Monte a <span className="text-emerald-400 font-bold">composição técnica</span> dos pratos e defina os descartáveis utilizados.</p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); if (showAdd) setEditingMealId(null); if (!showAdd) setNewMeal({ ...emptyMeal }); }}
          className={cn('btn px-8 py-4', showAdd ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'btn-primary')}
        >
          {showAdd ? <Trash2 className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          {showAdd ? 'Cancelar' : 'Novo Item no Cardápio'}
        </button>
      </header>

      {showAdd && (
        <div className="glass-panel p-10 border-orange-500/20 bg-orange-500/5 relative overflow-hidden">
          <h2 className="text-2xl font-bold mb-8 text-white">
            {editingMealId ? 'Editar Item do Cardápio' : 'Cadastrar Novo Prato'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="space-y-3 max-w-lg">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Nome do Prato</label>
              <input
                className="input py-4 text-lg"
                placeholder="Ex: Cuscuz Premium Completo"
                value={newMeal.name}
                onChange={e => setNewMeal({ ...newMeal, name: e.target.value })}
                required
              />
            </div>

            {/* Composição Técnica */}
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <Utensils className="w-5 h-5 text-primary" />
                  Composição Técnica
                </h3>
                <button type="button" onClick={addCompToNew} className="btn bg-white/10 hover:bg-white/20 text-sm py-2 px-4">+ Adicionar Ficha</button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {newMeal.components.map((comp, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 glass-panel border-white/5 bg-white/5 rounded-2xl animate-fade-in">
                    <select className="input" value={comp.technical_sheet_id} onChange={e => {
                      const next = [...newMeal.components];
                      next[idx].technical_sheet_id = parseInt(e.target.value);
                      setNewMeal({ ...newMeal, components: next });
                    }}>
                      {fichas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <div className="flex gap-4">
                      <input type="number" placeholder="Quantidade" className="input flex-1" value={comp.quantity} onChange={e => {
                        const next = [...newMeal.components];
                        next[idx].quantity = parseFloat(e.target.value);
                        setNewMeal({ ...newMeal, components: next });
                      }} />
                      <button type="button" onClick={() => {
                        const next = [...newMeal.components];
                        next.splice(idx, 1);
                        setNewMeal({ ...newMeal, components: next });
                      }} className="text-rose-400 p-2 hover:bg-rose-500/10 rounded-xl transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Descartáveis */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  Embalagens e Descartáveis
                </h3>
                {newMeal.disposables.length > 0 && (
                  <span className="text-sm font-bold text-emerald-400">
                    Total: R$ {newMeal.disposables.reduce((acc, d) => {
                      const disp = allDisposables.find(x => x.id === d.disposable_id);
                      return acc + (disp ? disp.unit_cost * d.quantity : 0);
                    }, 0).toFixed(3)}
                  </span>
                )}
              </div>
              {allDisposables.length === 0 ? (
                <p className="text-sm text-muted px-2">Nenhum descartável cadastrado. Acesse <strong>Talheres e Descartáveis</strong> para cadastrar.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allDisposables.map((disp: any) => {
                    const selected = newMeal.disposables.find(d => d.disposable_id === disp.id);
                    return (
                      <div
                        key={disp.id}
                        className={cn('p-4 rounded-2xl border cursor-pointer transition-all', selected ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10')}
                        onClick={() => toggleDisposable(disp.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={cn('font-bold text-sm', selected ? 'text-orange-300' : 'text-slate-300')}>{disp.name}</p>
                            <p className="text-xs text-muted">{disp.category} · R$ {disp.unit_cost.toFixed(3)}/{disp.unit}</p>
                          </div>
                          <div className={cn('w-4 h-4 rounded-full border-2 shrink-0 mt-0.5', selected ? 'border-orange-400 bg-orange-400' : 'border-slate-600')} />
                        </div>
                        {selected && (
                          <div className="mt-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <label className="text-xs text-muted">Qtd.:</label>
                            <input type="number" min="1" step="1" className="input py-1 px-2 text-sm w-20" value={selected.quantity} onChange={e => updateDisposableQty(disp.id, parseInt(e.target.value) || 1)} />
                            <span className="text-xs text-muted">{disp.unit}</span>
                            <span className="text-xs text-emerald-400 ml-auto font-bold">= R$ {(disp.unit_cost * selected.quantity).toFixed(3)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary w-full py-5 text-xl font-black rounded-2xl">
              SALVAR PRATO
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="glass-panel p-12 text-center text-muted">Carregando...</div>
      ) : meals.length === 0 ? (
        <div className="glass-panel p-16 text-center">
          <Utensils className="w-16 h-16 text-muted mx-auto mb-4 opacity-30" />
          <p className="text-muted text-lg">Nenhum prato cadastrado.</p>
          <p className="text-sm text-slate-600 mt-1">Clique em "Novo Item no Cardápio" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {meals.map((meal) => {
            const totalCost = (meal.total_food_cost || 0) + (meal.packaging_cost || 0);
            return (
              <div key={meal.id} className="glass-panel p-8 group border-white/5 hover:border-orange-500/30 transition-all flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-black text-white group-hover:text-primary transition-colors leading-tight">{meal.name}</h3>
                  <div className="flex gap-2 shrink-0 ml-2">
                    <button onClick={() => startEdit(meal)} className="p-2 hover:bg-white/10 rounded-lg text-muted hover:text-primary transition-all">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(meal.id)} className="p-2 hover:bg-rose-500/10 rounded-lg text-muted hover:text-rose-400 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted font-bold flex items-center gap-2">
                      <Utensils className="w-3.5 h-3.5" /> Custo Insumos
                    </span>
                    <span className="font-black text-slate-200">R$ {(meal.total_food_cost || 0).toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted font-bold flex items-center gap-2">
                      <Package className="w-3.5 h-3.5" /> Custo Embalagem
                    </span>
                    <span className="font-black text-slate-200">R$ {(meal.packaging_cost || 0).toFixed(3)}</span>
                  </div>
                  <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-sm font-black text-white uppercase tracking-wider">Custo Total</span>
                    <span className="text-xl font-black text-amber-400">R$ {totalCost.toFixed(3)}</span>
                  </div>
                </div>

                {(meal.components || []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2">Fichas Técnicas</p>
                    <div className="flex flex-wrap gap-2">
                      {(meal.components || []).map((c: any, i: number) => {
                        const ficha = fichas.find(f => f.id === c.technical_sheet_id);
                        return (
                          <span key={i} className="text-xs bg-orange-500/10 text-orange-300 border border-orange-500/20 px-3 py-1 rounded-full font-bold">
                            {ficha?.name || `Ficha #${c.technical_sheet_id}`} ×{c.quantity}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
