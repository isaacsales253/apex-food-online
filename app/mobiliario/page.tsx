'use client';

import React, { useState, useEffect } from 'react';
import {
  Sofa, Plus, Trash2, Pencil, Calendar, Save, Tag, DollarSign,
  Package, TrendingDown, Wrench, X, Check, AlertTriangle, Clock, Truck
} from 'lucide-react';
import { cn, maskCurrency, unmaskCurrency } from '@/lib/utils';

interface Furniture {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  purchase_date: string;
  condition: string;
  annual_depreciation_percent: number;
}

interface Maintenance {
  id: number;
  furniture_id: number;
  description: string;
  type: string;
  cost: number;
  maintenance_date: string;
  technician: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  expense_id: number | null;
  created_at: string;
}

const MAINTENANCE_TYPES = ['Corretiva', 'Preventiva', 'Preditiva', 'Emergencial'];

export default function MobiliarioPage() {
  const [furniture, setFurniture] = useState<Furniture[]>([]);
  const [totalMaintenance, setTotalMaintenance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);

  // Maintenance state
  const [manutOpenId, setManutOpenId] = useState<number | null>(null);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [savingManut, setSavingManut] = useState(false);
  const [manutError, setManutError] = useState('');
  const [manutForm, setManutForm] = useState({
    description: '',
    type: 'Corretiva',
    cost: '',
    maintenance_date: new Date().toISOString().split('T')[0],
    technician: '',
    supplier_id: '',
  });

  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Móveis',
    quantity: 1,
    unit_price: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    condition: 'Novo',
    annual_depreciation_percent: 10
  });

  useEffect(() => {
    fetchFurniture();
    fetch('/api/fornecedores', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setSuppliers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const fetchFurniture = async () => {
    try {
      const res = await fetch('/api/mobiliario', { cache: 'no-store' });
      const data = await res.json();
      setFurniture(data.items ?? data);
      setTotalMaintenance(data.totalMaintenance ?? 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/mobiliario/${editingId}` : '/api/mobiliario';
      const method = editingId ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) });
      setShowAddForm(false);
      setEditingId(null);
      fetchFurniture();
      setNewItem({ name: '', category: 'Móveis', quantity: 1, unit_price: 0, purchase_date: new Date().toISOString().split('T')[0], condition: 'Novo', annual_depreciation_percent: 10 });
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este item do mobiliário?')) return;
    try {
      await fetch(`/api/mobiliario/${id}`, { method: 'DELETE' });
      fetchFurniture();
    } catch (error) { console.error(error); }
  };

  const startEdit = (item: Furniture) => {
    setEditingId(item.id);
    setNewItem({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit_price: item.unit_price,
      purchase_date: item.purchase_date,
      condition: item.condition,
      annual_depreciation_percent: item.annual_depreciation_percent ?? 10
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openManutencoes = async (item: Furniture) => {
    if (manutOpenId === item.id) {
      setManutOpenId(null);
      return;
    }
    setManutOpenId(item.id);
    setMaintenances([]);
    setManutError('');
    setManutForm({ description: '', type: 'Corretiva', cost: '', maintenance_date: new Date().toISOString().split('T')[0], technician: '', supplier_id: '' });
    try {
      const res = await fetch(`/api/mobiliario/${item.id}/manutencoes`, { cache: 'no-store' });
      setMaintenances(await res.json());
    } catch (e) { console.error(e); }
  };

  const saveManutencao = async (furnitureId: number) => {
    setManutError('');
    if (!manutForm.description || !manutForm.cost) return;
    if (!manutForm.supplier_id) {
      setManutError('Selecione um fornecedor para continuar.');
      return;
    }
    setSavingManut(true);
    try {
      const res = await fetch(`/api/mobiliario/${furnitureId}/manutencoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: manutForm.description,
          type: manutForm.type,
          cost: unmaskCurrency(manutForm.cost),
          maintenance_date: manutForm.maintenance_date,
          technician: manutForm.technician || null,
          supplier_id: parseInt(manutForm.supplier_id),
        }),
      });
      if (res.ok) {
        setManutForm({ description: '', type: 'Corretiva', cost: '', maintenance_date: new Date().toISOString().split('T')[0], technician: '', supplier_id: '' });
        const updated = await fetch(`/api/mobiliario/${furnitureId}/manutencoes`, { cache: 'no-store' });
        setMaintenances(await updated.json());
      }
    } catch (e) { console.error(e); } finally { setSavingManut(false); }
  };

  const deleteManutencao = async (furnitureId: number, mId: number) => {
    if (!confirm('Excluir esta manutenção? A despesa vinculada também será removida.')) return;
    await fetch(`/api/mobiliario/${furnitureId}/manutencoes/${mId}`, { method: 'DELETE' });
    const updated = await fetch(`/api/mobiliario/${furnitureId}/manutencoes`, { cache: 'no-store' });
    setMaintenances(await updated.json());
  };

  const typeColor = (type: string) => {
    if (type === 'Corretiva') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (type === 'Preventiva') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (type === 'Preditiva') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20'; // Emergencial
  };

  const totalAssetsValue = furniture.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
  const totalItemsCount = furniture.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalCurrentValue = furniture.reduce((acc, curr) => {
    const years = Math.max(0, (new Date().getTime() - new Date(curr.purchase_date).getTime()) / (1000 * 3600 * 24 * 365));
    const rate = (curr.annual_depreciation_percent ?? 10) / 100;
    return acc + Math.max(0, curr.quantity * curr.unit_price * (1 - rate * years));
  }, 0);
  const totalDepreciation = totalAssetsValue - totalCurrentValue;

  return (
    <div className="space-y-10 animate-fade-in max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Mobiliário e Ativos</h1>
          <p className="text-muted text-lg">Gerencie <span className="text-blue-400 font-bold">equipamentos</span>, móveis e patrimônio da loja.</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (showAddForm) setEditingId(null);
            if (!showAddForm) setNewItem({ name: '', category: 'Móveis', quantity: 1, unit_price: 0, purchase_date: new Date().toISOString().split('T')[0], condition: 'Novo', annual_depreciation_percent: 10 });
          }}
          className={cn("btn px-8 py-4", showAddForm ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-blue-600 hover:bg-blue-500 text-white")}
        >
          {showAddForm ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          {showAddForm ? 'Cancelar' : 'Adicionar Patrimônio'}
        </button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="glass-panel p-7 border-l-4 border-l-blue-500/50 bg-blue-500/5">
          <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em] mb-3">Valor de Aquisição</h3>
          <p className="text-3xl font-black text-blue-400">R$ {totalAssetsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted mt-1">{totalItemsCount} unidades no inventário</p>
        </div>
        <div className="glass-panel p-7 border-l-4 border-l-emerald-500/50 bg-emerald-500/5">
          <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em] mb-3">Valor Atual (Depreciado)</h3>
          <p className="text-3xl font-black text-emerald-400">R$ {totalCurrentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted mt-1">Valor contábil estimado</p>
        </div>
        <div className="glass-panel p-7 border-l-4 border-l-rose-500/50 bg-rose-500/5">
          <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em] mb-3">Perdido em Depreciação</h3>
          <p className="text-3xl font-black text-rose-400">R$ {totalDepreciation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted mt-1">{totalAssetsValue > 0 ? ((totalDepreciation / totalAssetsValue) * 100).toFixed(1) : '0'}% do valor original</p>
        </div>
        <div className="glass-panel p-7 border-l-4 border-l-orange-500/50 bg-orange-500/5">
          <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em] mb-3">Gasto em Manutenções</h3>
          <p className="text-3xl font-black text-orange-400">R$ {totalMaintenance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted mt-1">Total histórico acumulado</p>
        </div>
      </section>

      {showAddForm && (
        <div className="glass-panel p-10 border-blue-500/20 bg-blue-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sofa className="w-32 h-32 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold mb-8 text-white">
            {editingId ? 'Editar Item do Patrimônio' : 'Registrar Novo Item'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-3 lg:col-span-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Nome do Item</label>
                <input className="input py-4 px-6 text-lg border-blue-500/20 focus:border-blue-500/50" placeholder="Ex: Balcão Refrigerado 2 Portas" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Categoria</label>
                <select className="input py-4 px-6 text-lg border-blue-500/20 focus:border-blue-500/50 appearance-none bg-slate-900" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                  <option value="Móveis">Móveis e Decoração</option>
                  <option value="Equipamentos">Equipamentos e Máquinas</option>
                  <option value="Utensílios">Utensílios Pesados</option>
                  <option value="Eletrônicos">Eletrônicos / Informática</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Quantidade Alocada</label>
                <input type="number" className="input py-4 px-6 text-lg border-blue-500/20 focus:border-blue-500/50" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} required min="1" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Valor Unitário (R$)</label>
                <input type="number" step="0.01" className="input py-4 px-6 text-lg border-blue-500/20 focus:border-blue-500/50" value={newItem.unit_price} onChange={e => setNewItem({...newItem, unit_price: parseFloat(e.target.value)})} required />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Data da Compra</label>
                <input type="date" className="input py-4 px-6 text-lg border-blue-500/20 focus:border-blue-500/50 w-full" value={newItem.purchase_date} onChange={e => setNewItem({...newItem, purchase_date: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Condição Atual</label>
                <select className="input py-4 px-6 text-lg border-blue-500/20 focus:border-blue-500/50 appearance-none bg-slate-900" value={newItem.condition} onChange={e => setNewItem({...newItem, condition: e.target.value})}>
                  <option value="Novo">Novo (excelente estado)</option>
                  <option value="Bom">Bom (marcas de uso leves)</option>
                  <option value="Desgastado">Desgastado (precisa atenção)</option>
                  <option value="Quebrado">Quebrado / Para Descarte</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Depreciação Anual (%)</label>
                <input type="number" step="0.1" className="input py-4 px-6 text-lg border-blue-500/20 focus:border-blue-500/50 w-full" value={newItem.annual_depreciation_percent} onChange={e => setNewItem({...newItem, annual_depreciation_percent: parseFloat(e.target.value)})} />
              </div>
            </div>
            <div className="flex justify-end pt-6 border-t border-blue-500/20">
              <button type="submit" className="btn bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 text-lg shadow-lg shadow-blue-900/40">
                <Save className="w-5 h-5 mr-3" />
                {editingId ? 'Atualizar Item' : 'Registrar no Inventário'}
              </button>
            </div>
          </form>
        </div>
      )}

      {furniture.length > 0 ? (
        <div className="space-y-4">
          {furniture.map((item) => (
            <div key={item.id} className="glass-panel border-white/5 hover:border-blue-500/20 transition-all overflow-hidden">
              {/* Asset card row */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-6 p-6 group">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600/20 to-amber-600/20 rounded-2xl border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Sofa className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors truncate">{item.name}</h3>
                    <div className="badge badge-primary bg-slate-800 text-slate-300 border-none px-2 py-0.5 text-xs">{item.category}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 flex-1">
                  <div>
                    <div className="text-[10px] text-muted font-bold uppercase mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Qtd</div>
                    <span className="text-lg font-black text-white">{item.quantity}</span>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted font-bold uppercase mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Compra</div>
                    <span className="text-base font-black text-blue-400">R$ {(item.quantity * item.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted font-bold uppercase mb-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Condição</div>
                    <span className={cn("text-xs font-bold px-2 py-1 rounded-md",
                      item.condition === 'Novo' ? "bg-emerald-500/10 text-emerald-400" :
                      item.condition === 'Bom' ? "bg-blue-500/10 text-blue-400" :
                      item.condition === 'Desgastado' ? "bg-amber-500/10 text-amber-400" :
                      "bg-rose-500/10 text-rose-400"
                    )}>{item.condition}</span>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted font-bold uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Aquisição</div>
                    <span className="text-sm font-bold text-slate-300">{item.purchase_date.split('-').reverse().join('/')}</span>
                  </div>
                  <div>
                    {(() => {
                      const years = Math.max(0, (new Date().getTime() - new Date(item.purchase_date).getTime()) / (1000 * 3600 * 24 * 365));
                      const rate = (item.annual_depreciation_percent ?? 10) / 100;
                      const current = Math.max(0, item.quantity * item.unit_price * (1 - rate * years));
                      return (
                        <>
                          <div className="text-[10px] text-muted font-bold uppercase mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3 text-rose-400" /> Valor Atual</div>
                          <span className="text-base font-black text-emerald-400">R$ {current.toFixed(2)}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openManutencoes(item)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all",
                      manutOpenId === item.id
                        ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
                        : "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                    )}
                  >
                    <Wrench className="w-4 h-4" />
                    Manutenção
                  </button>
                  <button onClick={() => startEdit(item)} className="p-2.5 bg-white/5 hover:bg-blue-500/20 rounded-xl text-muted hover:text-blue-400 transition-all">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-white/5 hover:bg-rose-500/20 rounded-xl text-muted hover:text-rose-400 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Maintenance panel */}
              {manutOpenId === item.id && (
                <div className="border-t border-orange-500/20 bg-orange-500/5 p-6 space-y-6 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-black text-white uppercase tracking-wider">Controle de Manutenção</span>
                    <span className="text-xs text-muted">— a despesa será gerada automaticamente</span>
                  </div>

                  {/* New maintenance form */}
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-400 mb-4">Registrar Nova Manutenção</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="lg:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Descrição do Serviço</label>
                        <input
                          className="input py-2.5 text-sm"
                          placeholder="Ex: Troca de resistência, limpeza de filtros..."
                          value={manutForm.description}
                          onChange={e => setManutForm(f => ({ ...f, description: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Tipo</label>
                        <select
                          className="input py-2.5 text-sm appearance-none"
                          value={manutForm.type}
                          onChange={e => setManutForm(f => ({ ...f, type: e.target.value }))}
                        >
                          {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Custo (R$)</label>
                        <input
                          className="input py-2.5 text-sm"
                          placeholder="0,00"
                          value={manutForm.cost}
                          onChange={e => setManutForm(f => ({ ...f, cost: maskCurrency(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Data</label>
                        <input
                          type="date"
                          className="input py-2.5 text-sm"
                          value={manutForm.maintenance_date}
                          onChange={e => setManutForm(f => ({ ...f, maintenance_date: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Técnico / Empresa</label>
                        <input
                          className="input py-2.5 text-sm"
                          placeholder="Opcional"
                          value={manutForm.technician}
                          onChange={e => setManutForm(f => ({ ...f, technician: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
                          Fornecedor <span className="text-rose-400">*</span>
                        </label>
                        <select
                          className={cn("input py-2.5 text-sm appearance-none", !manutForm.supplier_id ? "border-rose-500/30" : "")}
                          value={manutForm.supplier_id}
                          onChange={e => { setManutForm(f => ({ ...f, supplier_id: e.target.value })); setManutError(''); }}
                          required
                        >
                          <option value="">Selecione o fornecedor...</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {suppliers.length === 0 && (
                          <p className="text-[10px] text-amber-400">Nenhum fornecedor cadastrado. Cadastre em Fornecedores.</p>
                        )}
                      </div>
                    </div>
                    {manutError && (
                      <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {manutError}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => saveManutencao(item.id)}
                        disabled={savingManut || !manutForm.description || !manutForm.cost || !manutForm.supplier_id}
                        className="flex items-center gap-2 px-5 py-2.5 bg-orange-500/20 text-orange-400 rounded-xl text-sm font-bold hover:bg-orange-500/30 transition-all border border-orange-500/20 disabled:opacity-40"
                      >
                        <Check className="w-4 h-4" />
                        {savingManut ? 'Salvando...' : 'Registrar e Gerar Despesa'}
                      </button>
                      <p className="text-[10px] text-muted flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        Gera despesa automaticamente em "Despesas e Compras"
                      </p>
                    </div>
                  </div>

                  {/* Maintenance history */}
                  {maintenances.length > 0 && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-muted mb-3">Histórico de Manutenções</p>
                      <div className="space-y-2">
                        {maintenances.map(m => (
                          <div key={m.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center shrink-0">
                              <Wrench className="w-4 h-4 text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{m.description}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg border", typeColor(m.type))}>
                                  {m.type}
                                </span>
                                <span className="text-[10px] text-muted flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {m.maintenance_date.split('-').reverse().join('/')}
                                </span>
                                {m.supplier_name && (
                                  <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    <Truck className="w-3 h-3" />{m.supplier_name}
                                  </span>
                                )}
                                {m.technician && (
                                  <span className="text-[10px] text-slate-400">{m.technician}</span>
                                )}
                                {m.expense_id && (
                                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                                    Despesa gerada
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-base font-black text-orange-400 shrink-0">
                              R$ {m.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <button
                              onClick={() => deleteManutencao(item.id, m.id)}
                              className="p-2 rounded-xl text-muted hover:bg-rose-500/10 hover:text-rose-400 transition-all shrink-0"
                              title="Excluir (remove a despesa vinculada)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {maintenances.length === 0 && (
                    <div className="text-center py-4 text-muted text-sm">
                      Nenhuma manutenção registrada para este ativo.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !loading && (
        <div className="glass-panel p-20 text-center flex flex-col items-center justify-center animate-fade-in border-dashed border-white/10">
          <Sofa className="w-20 h-20 text-blue-500/20 mb-6" />
          <h3 className="text-2xl font-bold text-white mb-2">Inventário Vazio</h3>
          <p className="text-muted max-w-sm mb-8">Você ainda não registrou nenhum bem ou equipamento do estabelecimento.</p>
          <button onClick={() => setShowAddForm(true)} className="btn bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 shadow-lg shadow-blue-900/40">
            Cadastrar Primeiro Item
          </button>
        </div>
      )}
    </div>
  );
}
