'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Save, Trash2, ChevronDown, ChevronUp, Scale, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Ingredient {
  raw_material_id: number;
  quantity: number;
  loss_coefficient: number;
  gain_coefficient: number;
  name?: string;
  total_cost?: number;
}

interface Ficha {
  id: number;
  name: string;
  yield: number;
  yield_unit: string;
  total_cost: number;
  ingredients: any[];
}

export default function FichasPage() {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingFichaId, setEditingFichaId] = useState<number | null>(null);

  const [newFicha, setNewFicha] = useState({
    name: '',
    yield: 1,
    yield_unit: 'porção',
    ingredients: [] as Ingredient[]
  });

  useEffect(() => {
    fetchFichas();
    fetchMaterials();

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchFichas();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const fetchFichas = async () => {
    try {
      const res = await fetch('/api/fichas', { cache: 'no-store' });
      const data = await res.json();
      setFichas(data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/insumos');
      const data = await res.json();
      setMaterials(data);
    } catch (error) { console.error(error); }
  };

  const startEdit = (ficha: Ficha) => {
    setEditingFichaId(ficha.id);
    setNewFicha({
      name: ficha.name,
      yield: ficha.yield,
      yield_unit: ficha.yield_unit,
      ingredients: (ficha.ingredients || []).map(ing => ({
        raw_material_id: ing.raw_material_id,
        quantity: ing.quantity,
        loss_coefficient: ing.loss_coefficient || 1.0,
        gain_coefficient: ing.gain_coefficient || 1.0
      }))
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addIngredientToNew = () => {
    if (materials.length === 0) return;
    setNewFicha({
      ...newFicha,
      ingredients: [...newFicha.ingredients, { 
        raw_material_id: materials[0].id, 
        quantity: 0,
        loss_coefficient: 1.0,
        gain_coefficient: 1.0
      }]
    });
  };

  const removeIngredientFromNew = (index: number) => {
    const next = [...newFicha.ingredients];
    next.splice(index, 1);
    setNewFicha({ ...newFicha, ingredients: next });
  };

  const updateIngredientNew = (index: number, field: string, value: any) => {
    const next = [...newFicha.ingredients];
    next[index] = { ...next[index], [field]: value };
    setNewFicha({ ...newFicha, ingredients: next });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingFichaId ? `/api/fichas/${editingFichaId}` : '/api/fichas';
      const method = editingFichaId ? 'PUT' : 'POST';

      await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFicha)
      });
      setShowAddForm(false);
      setEditingFichaId(null);
      fetchFichas();
      setNewFicha({ name: '', yield: 1, yield_unit: 'porção', ingredients: [] });
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (id: number) => {
    console.log('--- Handle Delete Called ---');
    console.log('Target ID:', id);
    
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Deseja realmente excluir esta ficha técnica?');
      if (!confirmed) {
        console.log('Deletion cancelled by user');
        return;
      }
    }

    try {
      console.log('Firing DELETE request to /api/fichas/' + id);
      const res = await fetch(`/api/fichas/${id}`, { 
        method: 'DELETE',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);
      
      if (res.ok) {
        fetchFichas();
      } else {
        alert('Erro ao excluir: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) { 
      console.error('CRITICAL Error in handleDelete:', error);
      alert('Erro crítico ao tentar excluir. Veja o console.');
    }
  };




  return (
    <div className="space-y-10 animate-fade-in max-w-[1600px] mx-auto">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Fichas Técnicas</h1>
          <p className="text-muted text-lg">Composição de receitas e cálculo de <span className="text-primary font-bold">custo de produção</span>.</p>
        </div>
        <div className="flex flex-wrap gap-3">

          <button 
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (showAddForm) setEditingFichaId(null);
              if (!showAddForm) setNewFicha({ name: '', yield: 1, yield_unit: 'porção', ingredients: [] });
            }}
            className={cn(
              "btn px-8 py-4",
              showAddForm ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "btn-primary"
            )}
          >
            {showAddForm ? <Trash2 className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
            {showAddForm ? 'Cancelar' : 'Nova Receita'}
          </button>
        </div>
      </header>

      {showAddForm && (
        <div className="glass-panel p-10 border-orange-500/20 bg-orange-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen className="w-32 h-32" />
          </div>
          <h2 className="text-2xl font-bold mb-8 text-white">
            {editingFichaId ? 'Editar Ficha Técnica' : 'Criar Nova Ficha Técnica'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Nome da Receita</label>
                <input 
                  className="input py-4 px-6 text-lg" 
                  placeholder="Ex: Cuscuz Nordestino" 
                  value={newFicha.name}
                  onChange={e => setNewFicha({...newFicha, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Rendimento</label>
                <input 
                  type="number"
                  className="input py-4 px-6 text-lg" 
                  value={newFicha.yield}
                  onChange={e => setNewFicha({...newFicha, yield: parseFloat(e.target.value)})}
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Unidade de Medida</label>
                <input 
                  className="input py-4 px-6 text-lg" 
                  placeholder="Ex: porção, kg, un" 
                  value={newFicha.yield_unit}
                  onChange={e => setNewFicha({...newFicha, yield_unit: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold flex items-center gap-3 text-white">
                  <Scale className="w-5 h-5 text-primary" /> 
                  Ingredientes Necessários
                </h3>
                <button type="button" onClick={addIngredientToNew} className="btn bg-white/10 hover:bg-white/20 text-sm py-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Insumo
                </button>
              </div>

              <div className="space-y-4">
                {newFicha.ingredients.map((ing, idx) => (
                  <div key={idx} className="p-6 glass-panel bg-white/5 border-white/5 rounded-2xl animate-fade-in space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-widest text-orange-400">Ingrediente {idx + 1}</span>
                      <button type="button" onClick={() => removeIngredientFromNew(idx)} className="text-rose-400 p-2 hover:bg-rose-500/10 rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted">Insumo</label>
                        <select
                          className="input"
                          value={ing.raw_material_id}
                          onChange={e => {
                            const matId = parseInt(e.target.value);
                            const next = [...newFicha.ingredients];
                            next[idx] = {
                              ...next[idx],
                              raw_material_id: matId,
                              loss_coefficient: 1.0,
                              gain_coefficient: 1.0
                            };
                            setNewFicha({ ...newFicha, ingredients: next });
                          }}
                        >
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.converted_unit})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted">Quantidade</label>
                        <p className="text-[11px] text-slate-500 -mt-1">Quantidade líquida do insumo na receita</p>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="Ex: 0.500"
                          className="input"
                          value={ing.quantity}
                          onChange={e => updateIngredientNew(idx, 'quantity', parseFloat(e.target.value))}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted">Fator de Correção</label>
                        <p className="text-[11px] text-slate-500 -mt-1">Compensa perdas no preparo (cascas, aparas). Ex: 1.30 = 30% de perda</p>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 1.00"
                          className="input"
                          value={ing.loss_coefficient}
                          onChange={e => updateIngredientNew(idx, 'loss_coefficient', parseFloat(e.target.value))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted">Índice de Cocção</label>
                        <p className="text-[11px] text-slate-500 -mt-1">Variação de peso após cozimento. Ex: 0.70 = reduz 30% ao cozinhar</p>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 1.00"
                          className="input"
                          value={ing.gain_coefficient}
                          onChange={e => updateIngredientNew(idx, 'gain_coefficient', parseFloat(e.target.value))}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-white/10">
              <button type="submit" className="btn btn-primary px-12 py-5 text-lg">
                <Save className="w-5 h-5 mr-3" /> 
                Salvar Ficha Técnica
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {fichas.map((ficha) => (
          <div key={ficha.id} className="glass-panel overflow-hidden group border-white/5 hover:border-white/10">
            <div 
              className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer gap-6"
              onClick={() => setExpandedId(expandedId === ficha.id ? null : ficha.id)}
            >
              <div className="flex items-center gap-6">
                <div className="p-4 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-2xl border border-white/10 text-primary">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-primary transition-colors">{ficha.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="badge badge-primary">Rendimento: {ficha.yield} {ficha.yield_unit}</span>
                    <span className="text-xs text-muted font-medium">• {ficha.ingredients.length} Ingredientes</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0 md:gap-12 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right">
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Custo Total</p>
                  <p className="text-2xl font-black text-emerald-400">R$ {ficha.total_cost?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="text-right border-l border-white/10 pl-8 hidden sm:block">
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Custo unitário</p>
                  <p className="text-2xl font-black text-orange-400">R$ {(ficha.total_cost / ficha.yield).toFixed(2) || '0.00'}</p>
                </div>
                <div className="flex gap-2 ml-6">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(ficha);
                    }}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-muted hover:text-primary transition-all"
                  >
                    <Pencil className="w-5 h-5" />
                    <span className="sr-only">Editar</span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(ficha.id);
                    }}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-muted hover:text-rose-400 transition-all relative z-20"
                  >
                    <Trash2 className="w-5 h-5 pointer-events-none" />
                  </button>
                </div>
                <div className="p-2 bg-white/5 rounded-full ml-4">
                  {expandedId === ficha.id ? <ChevronUp className="w-6 h-6 text-muted" /> : <ChevronDown className="w-6 h-6 text-muted" />}
                </div>
              </div>
            </div>

            {expandedId === ficha.id && (
              <div className="p-8 border-t border-white/5 bg-slate-900/40 animate-fade-in">
                <div className="table-container border-none bg-transparent">
                  <table>
                    <thead>
                      <tr>
                        <th className="!bg-transparent !pl-0 text-white">Insumo</th>
                        <th className="!bg-transparent text-right text-white">Qtd. Líquida</th>
                        <th className="!bg-transparent text-right text-white">Fator Correção / Índ. Cocção</th>
                        <th className="!bg-transparent text-right text-white">Qtd. Bruta</th>
                        <th className="!bg-transparent text-right text-white">Custo Unit.</th>
                        <th className="!bg-transparent text-right text-white !pr-0">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {ficha.ingredients.map((ing: any) => {
                          const grossQuantity = (ing.quantity / (ing.gain_coefficient || 1)) * (ing.loss_coefficient || 1);
                          const subtotal = grossQuantity * (ing.purchase_price / ing.conversion_factor);
                          return (
                           <tr key={ing.id} className="hover:!bg-white/[0.02]">
                             <td className="!pl-0 font-bold text-slate-200 py-5">{ing.name}</td>
                             <td className="text-right text-slate-400 font-medium">
                               {ing.quantity} <span className="text-[10px] opacity-60 uppercase">{ing.converted_unit}</span>
                             </td>
                             <td className="text-right text-slate-400 font-medium">
                               {ing.loss_coefficient?.toFixed(2)} / {ing.gain_coefficient?.toFixed(2)}
                             </td>
                             <td className="text-right text-slate-400 font-medium">
                               {grossQuantity.toFixed(3)} <span className="text-[10px] opacity-60 uppercase">{ing.converted_unit}</span>
                             </td>
                             <td className="text-right text-slate-400 font-medium">R$ {(ing.purchase_price / ing.conversion_factor).toFixed(4)}</td>
                             <td className="text-right font-black text-white !pr-0">R$ {subtotal.toFixed(2)}</td>
                           </tr>
                          );
                       })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="text-right font-bold text-muted uppercase tracking-tighter pt-8">Impacto Financeiro Total</td>
                        <td className="text-right text-2xl font-black text-emerald-400 pt-8 !pr-0">R$ {ficha.total_cost?.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
