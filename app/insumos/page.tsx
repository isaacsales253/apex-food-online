'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Save, Trash2, Edit3, ArrowLeftRight, MinusCircle, X, Download, UploadCloud, AlertTriangle, Check, BarChart2, FileText, Factory, ClipboardList, ChevronDown, Clock, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface Material {
  id: number;
  name: string;
  category: string;
  purchase_price: number;
  purchase_unit: string;
  stock_quantity: number;
  min_stock: number;
  conversion_factor: number;
  converted_unit: string;
  brands?: { brand: string; quantity: number }[];
}

function deriveConvertedUnit(purchaseUnit: string): string {
  const map: Record<string, string> = {
    'kg': 'g',
    'l': 'ml',
    'litro': 'ml',
    'litros': 'ml',
    'dúzia': 'un',
    'duzia': 'un',
  };
  return map[purchaseUnit.toLowerCase()] || purchaseUnit;
}

export default function ComprasPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    category: 'Materia-prima',
    purchase_price: 0,
    purchase_unit: 'kg',
    conversion_factor: 1000,
    converted_unit: 'g',
    min_stock: 0,
  });
  
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [deductingId, setDeductingId] = useState<number | null>(null);
  const [deductAmount, setDeductAmount] = useState<number>(0);
  const [deductBrand, setDeductBrand] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingMinStockId, setEditingMinStockId] = useState<number | null>(null);
  const [minStockValue, setMinStockValue] = useState<string>('');

  // History modal
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(null);
  const [historyData, setHistoryData] = useState<{ purchases: any[]; nfs: any[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Production modal state
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [prodTab, setProdTab] = useState<'recipe'|'manual'>('recipe');
  const [fichas, setFichas] = useState<any[]>([]);
  const [fichasLoading, setFichasLoading] = useState(false);
  const [selectedFichaId, setSelectedFichaId] = useState<number|null>(null);
  const [prodQty, setProdQty] = useState<number>(1);
  const [prodNotes, setProdNotes] = useState('');
  const [prodDate, setProdDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [prodSending, setProdSending] = useState(false);
  const [prodSuccess, setProdSuccess] = useState(false);
  const [prodError, setProdError] = useState<string|null>(null);
  const [prodHistory, setProdHistory] = useState<any[]>([]);
  const [prodHistoryLoading, setProdHistoryLoading] = useState(false);
  const [showProdHistory, setShowProdHistory] = useState(false);
  // Manual mode
  const [manualItems, setManualItems] = useState<{ raw_material_id: number; name: string; qty: number; purchase_unit: string }[]>([]);

  const selectedFicha = fichas.find(f => f.id === selectedFichaId) || null;

  const openProductionModal = async () => {
    setShowProductionModal(true);
    setProdTab('recipe');
    setSelectedFichaId(null);
    setProdQty(1);
    setProdNotes('');
    setProdDate(new Date().toISOString().split('T')[0]);
    setProdSuccess(false);
    setProdError(null);
    setManualItems([]);
    setFichasLoading(true);
    try {
      const res = await fetch('/api/fichas', { cache: 'no-store' });
      const data = await res.json();
      setFichas(Array.isArray(data) ? data : []);
    } catch { setFichas([]); } finally { setFichasLoading(false); }
  };

  const loadProdHistory = async () => {
    setShowProdHistory(true);
    setProdHistoryLoading(true);
    try {
      const res = await fetch('/api/insumos/producao', { cache: 'no-store' });
      const data = await res.json();
      setProdHistory(Array.isArray(data) ? data : []);
    } catch { setProdHistory([]); } finally { setProdHistoryLoading(false); }
  };

  const submitProduction = async () => {
    setProdSending(true);
    setProdError(null);
    try {
      let body: any = { quantity_produced: prodQty, notes: prodNotes, produced_at: prodDate };
      if (prodTab === 'recipe') {
        if (!selectedFichaId) { setProdError('Selecione uma ficha técnica'); setProdSending(false); return; }
        body.technical_sheet_id = selectedFichaId;
      } else {
        if (manualItems.length === 0) { setProdError('Adicione ao menos um insumo'); setProdSending(false); return; }
        body.manual_items = manualItems.map(i => ({
          raw_material_id: i.raw_material_id,
          raw_material_name: i.name,
          quantity_deducted: i.qty,
          purchase_unit: i.purchase_unit,
        }));
      }
      const res = await fetch('/api/insumos/producao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setProdError(data.error || 'Erro ao registrar'); return; }
      setProdSuccess(true);
      fetchMaterials();
    } catch { setProdError('Falha na conexão'); } finally { setProdSending(false); }
  };

  // Compute preview deductions for recipe mode
  const previewDeductions = selectedFicha && prodQty > 0
    ? selectedFicha.ingredients.map((ing: any) => {
        const multiplier = prodQty / (selectedFicha.yield || 1);
        const deductConverted = ing.quantity * multiplier * ((ing.loss_coefficient || 1) / (ing.gain_coefficient || 1));
        const deductPurchase = deductConverted / (ing.conversion_factor || 1);
        const mat = materials.find((m: Material) => m.id === ing.raw_material_id);
        const currentStock = mat?.stock_quantity ?? 0;
        const insufficient = deductPurchase > currentStock;
        return { name: ing.name, deductPurchase, purchase_unit: mat?.purchase_unit || '', currentStock, insufficient };
      })
    : [];
  const hasInsufficient = previewDeductions.some(d => d.insufficient);

  const openHistory = async (m: Material) => {
    setHistoryMaterial(m);
    setHistoryData(null);
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/insumos/${m.id}/historico`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || data.error) {
        setHistoryError(data.error || 'Erro ao carregar histórico');
      } else {
        setHistoryData({ purchases: data.purchases ?? [], nfs: data.nfs ?? [] });
      }
    } catch (e) {
      setHistoryError('Falha na conexão ao buscar histórico');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/insumos', { cache: 'no-store' });
      const data = await res.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/insumos/${editingId}` : '/api/insumos';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMaterial,
          converted_unit: deriveConvertedUnit(newMaterial.purchase_unit)
        })
      });
      setShowAddForm(false);
      setEditingId(null);
      fetchMaterials();
      setNewMaterial({
        name: '',
        category: 'Materia-prima',
        purchase_price: 0,
        purchase_unit: 'kg',
        conversion_factor: 1000,
        converted_unit: 'g',
        min_stock: 0,
      });
    } catch (error) {
      console.error('Error saving material:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este insumo?')) return;
    
    try {
      const res = await fetch(`/api/insumos/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || 'Erro ao excluir insumo');
        return;
      }
      
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Erro ao excluir insumo');
    }
  };

  const handleDeduct = async (id: number) => {
    try {
      if (deductAmount <= 0) {
        alert('A quantidade deve ser maior que zero.');
        return;
      }
      if (!confirm('Dar baixa nesta quantidade por motivo de extravio, validade ou dano?')) return;
      
      const res = await fetch(`/api/insumos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deductQuantity: deductAmount, brand: deductBrand })
      });
      
      if (!res.ok) {
         const data = await res.json();
         alert(data.error || 'Erro ao processar a baixa');
         return;
      }
      
      setDeductingId(null);
      setDeductAmount(0);
      setDeductBrand('');
      fetchMaterials();
    } catch (error) {
      console.error('Deduct error:', error);
      alert('Houve um erro inesperado tentar dar baixa no estoque.');
    }
  };

  const saveMinStock = async (id: number) => {
    const val = parseFloat(minStockValue) || 0;
    await fetch(`/api/insumos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ min_stock: val }),
    });
    setEditingMinStockId(null);
    fetchMaterials();
  };

  const downloadTemplate = () => {
    const headers = [
      ["Nome", "Categoria", "Unidade de Compra", "Fator de Conversão"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "Modelo_Importacao_Insumos.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
           alert("A planilha está vazia.");
           return;
        }

        const items = data.map((row: any) => ({
          name: row["Nome"],
          category: row["Categoria"],
          purchase_unit: row["Unidade de Compra"],
          conversion_factor: parseFloat(row["Fator de Conversão"]),
        })).filter((i: any) => i.name && i.name !== "Insumo Exemplo"); // Ignore template dummy data if kept

        if (items.length === 0) {
           alert("Nenhum item válido encontrado. Preencha a planilha e tente novamente.");
           return;
        }

        const res = await fetch('/api/insumos/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        });

        if (res.ok) {
           alert(items.length + " insumo(s) importado(s) com sucesso!");
           fetchMaterials();
        } else {
           const err = await res.json();
           alert(err.error || "Houve um erro na importação da planilha.");
        }
      } catch (error) {
         console.error("Error reading file:", error);
         alert("Erro ao formatar os dados. Certifique-se de usar a planilha modelo.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  return (
    <>
    <div className="space-y-8 animate-fade-in max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Controle de Insumos</h1>
          <p className="text-muted text-lg">Cadastro de matéria-prima, preços e conversões.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadProdHistory}
            className="btn bg-white/5 border border-white/10 hover:bg-white/10 text-xs px-4"
            title="Histórico de Produções"
          >
            <ClipboardList className="w-4 h-4 mr-2 text-violet-400" /> Histórico
          </button>

          <button
            onClick={openProductionModal}
            className="btn bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 font-bold"
          >
            <Factory className="w-4 h-4 mr-2" /> Registrar Produção
          </button>

          <button
            onClick={downloadTemplate}
            className="btn bg-white/5 border border-white/10 hover:bg-white/10 text-xs px-4"
            title="Baixar Planilha Modelo"
          >
            <Download className="w-4 h-4 mr-2" /> Modelo
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn bg-white/5 border border-white/10 hover:bg-white/10"
          >
            <UploadCloud className="w-4 h-4 mr-2 text-indigo-400" />
            Importar Excel
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
          />

          <button 
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (showAddForm) setEditingId(null);
            }}
            className="btn btn-primary"
          >
            {showAddForm ? <Trash2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showAddForm ? 'Cancelar' : 'Novo Insumo'}
          </button>
        </div>
      </header>

      {showAddForm && (
        <div className="glass-panel p-8 border-primary/20 bg-primary/5">
          <h2 className="text-xl font-bold mb-6">{editingId ? 'Editar Insumo' : 'Cadastrar Novo Insumo'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted">Nome do Insumo</label>
              <input 
                className="input" 
                placeholder="Ex: Flocão de Milho" 
                value={newMaterial.name}
                onChange={e => setNewMaterial({...newMaterial, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted">Categoria</label>
              <select 
                className="input"
                value={newMaterial.category}
                onChange={e => setNewMaterial({...newMaterial, category: e.target.value})}
              >
                <option value="Materia-prima">Matéria-prima</option>
                <option value="Proteína">Proteína</option>
                <option value="Verdura">Verdura</option>
                <option value="Tempero">Tempero</option>
                <option value="Laticínio">Laticínio</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted">Unidade de Compra</label>
              <input 
                className="input" 
                placeholder="Ex: kg" 
                value={newMaterial.purchase_unit}
                onChange={e => setNewMaterial({...newMaterial, purchase_unit: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted">Fator de Conversão</label>
              <input 
                type="number" 
                className="input" 
                value={newMaterial.conversion_factor}
                onChange={e => setNewMaterial({...newMaterial, conversion_factor: parseFloat(e.target.value)})}
                required
              />
            </div>
            <div className="lg:col-span-3 flex justify-end">
              <button type="submit" className="btn btn-primary px-8">
                <Save className="w-4 h-4" /> Salvar Item
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel p-6">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nome / Categoria</th>
                <th>Estoque Atual</th>
                <th>Est. Mínimo</th>
                <th>Preço Médio</th>
                <th>Conversão</th>
                <th>Preço Calibrado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted italic">
                    Nenhum insumo cadastrado. Clique em "Novo Insumo" para começar.
                  </td>
                </tr>
              ) : (
                materials.map((m) => {
                  const unitPrice = m.purchase_price / m.conversion_factor;
                  return (
                    <tr key={m.id} className={m.min_stock > 0 && (m.stock_quantity ?? 0) < m.min_stock ? "bg-rose-500/[0.04]" : ""}>
                      <td>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{m.name}</span>
                            {m.min_stock > 0 && (m.stock_quantity ?? 0) < m.min_stock && (
                              <span title="Abaixo do estoque mínimo" className="flex items-center gap-1 text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-lg">
                                <AlertTriangle className="w-3 h-3" /> BAIXO
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-primary uppercase font-bold">{m.category}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`font-extrabold text-lg ${m.min_stock > 0 && (m.stock_quantity ?? 0) < m.min_stock ? 'text-rose-400' : 'text-blue-400'}`}>{(m.stock_quantity ?? 0).toFixed(2)}</span>
                        <span className="text-xs font-bold text-muted ml-1 lowercase">{m.purchase_unit}</span>
                        {m.brands && m.brands.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                             {m.brands.map((b, i) => (
                               <span key={i} className="text-[10px] bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20 font-bold whitespace-nowrap">
                                  {b.brand}: {b.quantity.toFixed(2)}{m.purchase_unit}
                               </span>
                             ))}
                          </div>
                        )}
                      </td>
                      <td>
                        {editingMinStockId === m.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number" min="0" step="0.01"
                              className="input py-1 px-2 w-20 text-xs bg-slate-900"
                              value={minStockValue}
                              onChange={e => setMinStockValue(e.target.value)}
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') saveMinStock(m.id); if (e.key === 'Escape') setEditingMinStockId(null); }}
                            />
                            <button onClick={() => saveMinStock(m.id)} className="p-1 text-emerald-400 hover:bg-emerald-400/10 rounded">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingMinStockId(null)} className="p-1 text-muted hover:text-white rounded">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingMinStockId(m.id); setMinStockValue((m.min_stock ?? 0).toString()); }}
                            className="group flex items-center gap-1.5 text-sm font-bold hover:text-white transition-colors"
                            title="Clique para definir estoque mínimo"
                          >
                            <span className={m.min_stock > 0 ? 'text-amber-400' : 'text-slate-600'}>
                              {(m.min_stock ?? 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-muted lowercase">{m.purchase_unit}</span>
                            <Edit3 className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </td>
                      <td>
                        <span className="text-muted">R$ {m.purchase_price.toFixed(2)}</span>
                        <span className="text-[10px] font-bold block">per {m.purchase_unit}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 text-xs font-bold text-muted">
                          1 {m.purchase_unit} <ArrowLeftRight className="w-3 h-3" /> {m.conversion_factor} {m.converted_unit}
                        </div>
                      </td>
                      <td>
                        <span className="text-success font-bold">R$ {unitPrice.toFixed(4)}</span>
                        <span className="text-[10px] font-bold block">per {m.converted_unit}</span>
                      </td>
                      <td>
                        <div className="flex gap-2 items-center">
                          {deductingId === m.id ? (
                             <div className="flex flex-col gap-2 bg-black/20 p-2 rounded-lg border border-danger/20">
                               <div className="flex items-center gap-2">
                                 <input 
                                   type="number" 
                                   className="input py-1 px-2 w-20 text-xs bg-slate-900" 
                                   placeholder="Qtd"
                                   value={deductAmount || ''}
                                   onChange={e => setDeductAmount(parseFloat(e.target.value) || 0)}
                                   autoFocus
                                 />
                                 <select 
                                   className="input py-1 px-2 text-xs bg-slate-900 appearance-none flex-1 max-w-[120px]"
                                   value={deductBrand}
                                   onChange={e => setDeductBrand(e.target.value)}
                                 >
                                    <option value="">Geral</option>
                                    {m.brands?.map((b, i) => (
                                      <option key={i} value={b.brand}>{b.brand}</option>
                                    ))}
                                 </select>
                                 <div className="flex gap-1 ml-auto">
                                   <button onClick={() => handleDeduct(m.id)} className="p-1.5 text-danger hover:bg-danger/20 rounded font-bold" title="Confirmar Baixa">
                                     <Save className="w-3.5 h-3.5" />
                                   </button>
                                   <button onClick={() => { setDeductingId(null); setDeductBrand(''); }} className="p-1.5 text-muted hover:text-white rounded" title="Cancelar Baixa">
                                     <X className="w-3.5 h-3.5" />
                                   </button>
                                 </div>
                               </div>
                             </div>
                          ) : (
                             <>
                              <button
                                onClick={() => openHistory(m)}
                                className="p-2 hover:bg-violet-500/10 rounded-lg text-violet-400 transition-colors"
                                title="Ver histórico de preços e NFs"
                              >
                                <BarChart2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setDeductingId(m.id); setDeductAmount(0); setDeductBrand(''); }}
                                className="p-2 hover:bg-danger/10 rounded-lg text-danger transition-colors"
                                title="Dar baixa por Estrago/Extravio"
                              >
                                <MinusCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(m.id);
                                  setNewMaterial({
                                    name: m.name,
                                    category: m.category,
                                    purchase_price: m.purchase_price,
                                    purchase_unit: m.purchase_unit,
                                    conversion_factor: m.conversion_factor,
                                    converted_unit: m.converted_unit,
                                    min_stock: m.min_stock ?? 0,
                                  });
                                  setShowAddForm(true);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="p-2 hover:bg-white/5 rounded-lg text-primary transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(m.id)}
                                className="p-2 hover:bg-white/5 rounded-lg text-danger transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                             </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* History Modal */}
    {historyMaterial && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => setHistoryMaterial(null)}
      >
        <div
          className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 border-violet-500/30 bg-slate-900/95"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black text-white">{historyMaterial.name}</h2>
              <p className="text-xs text-muted uppercase font-bold tracking-widest mt-1">{historyMaterial.category}</p>
            </div>
            <button onClick={() => setHistoryMaterial(null)} className="p-2 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {historyLoading && (
            <div className="text-center py-16 text-muted animate-pulse">Carregando histórico...</div>
          )}

          {historyError && (
            <div className="text-center py-10 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
              {historyError}
            </div>
          )}

          {historyData && !historyError && (
            <>
              {/* Chart */}
              {(historyData.purchases?.length ?? 0) === 0 ? (
                <div className="text-center py-12 text-muted italic border border-dashed border-white/10 rounded-2xl mb-6">
                  Nenhuma compra registrada para este insumo.
                </div>
              ) : (
                <div className="mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-violet-400 mb-4 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4" /> Variação de Preço e Quantidade por Compra
                  </h3>
                  <ResponsiveContainer key={historyMaterial?.id} width="100%" height={260}>
                    <ComposedChart
                      data={historyData.purchases.map((p, i) => ({
                        label: p.purchase_date ? new Date(p.purchase_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : `#${i + 1}`,
                        price: parseFloat(((p.unit_price ?? 0) as number).toFixed(2)),
                        qty: parseFloat(((p.quantity ?? 0) as number).toFixed(3)),
                        supplier: p.supplier_name || 'Sem fornecedor',
                        brand: p.brand || 'Genérica',
                        index: i + 1,
                      }))}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" />
                      <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `R$${v}`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v}${historyMaterial.purchase_unit}`} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                        formatter={(value: any, name: any) =>
                          name === 'Preço Un.' ? [`R$ ${value}`, name] : [`${value} ${historyMaterial?.purchase_unit ?? ''}`, name]
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                      <Bar yAxisId="right" dataKey="qty" name="Qtd Comprada" fill="#6366f1" fillOpacity={0.5} radius={[4,4,0,0]} />
                      <Line yAxisId="left" type="monotone" dataKey="price" name="Preço Un." stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>

                  {/* Purchase detail table */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-3 text-muted font-bold uppercase tracking-wider">#</th>
                          <th className="text-left py-2 px-3 text-muted font-bold uppercase tracking-wider">Data</th>
                          <th className="text-left py-2 px-3 text-muted font-bold uppercase tracking-wider">Fornecedor</th>
                          <th className="text-left py-2 px-3 text-muted font-bold uppercase tracking-wider">Marca</th>
                          <th className="text-right py-2 px-3 text-muted font-bold uppercase tracking-wider">Qtd</th>
                          <th className="text-right py-2 px-3 text-amber-400 font-bold uppercase tracking-wider">Preço Un.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.purchases.map((p, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-2 px-3 text-muted">{i + 1}</td>
                            <td className="py-2 px-3 text-slate-300">{new Date(p.purchase_date).toLocaleDateString('pt-BR')}</td>
                            <td className="py-2 px-3 text-slate-300">{p.supplier_name || <span className="text-muted italic">—</span>}</td>
                            <td className="py-2 px-3 text-slate-400">{p.brand || 'Genérica'}</td>
                            <td className="py-2 px-3 text-right font-bold text-indigo-300">{p.quantity.toFixed(3)} {historyMaterial.purchase_unit}</td>
                            <td className="py-2 px-3 text-right font-black text-amber-400">R$ {p.unit_price.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* NF List */}
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Notas Fiscais Vinculadas
                </h3>
                {(historyData.nfs?.length ?? 0) === 0 ? (
                  <div className="text-center py-8 text-muted italic border border-dashed border-white/10 rounded-2xl">
                    Nenhuma nota fiscal registrada para este insumo.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyData.nfs.map((nf, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-3 md:items-center">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-emerald-400 text-sm">NF {nf.nf_number}</span>
                            {nf.supplier_name && (
                              <span className="text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2 py-0.5 rounded-lg font-bold">{nf.supplier_name}</span>
                            )}
                            {nf.nf_date && (
                              <span className="text-[10px] text-muted font-bold">{new Date(nf.nf_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 truncate">{nf.expense_name}</p>
                          {nf.nf_notes && (
                            <p className="text-xs text-muted mt-1 italic">{nf.nf_notes}</p>
                          )}
                          {nf.nf_key && (
                            <p className="text-[9px] text-slate-600 font-mono mt-1 truncate">{nf.nf_key}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-lg font-black text-emerald-400">R$ {nf.value.toFixed(2)}</p>
                            <p className="text-[10px] text-muted uppercase font-bold">Total NF</p>
                          </div>
                          {nf.nf_file ? (
                            <div className="flex gap-2">
                              <a
                                href={`/uploads/nf/${nf.nf_file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[10px] font-black rounded-lg transition-all"
                                title="Visualizar PDF"
                              >
                                <FileText className="w-3 h-3" /> Ver PDF
                              </a>
                              <a
                                href={`/uploads/nf/${nf.nf_file}`}
                                download
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 text-[10px] font-black rounded-lg transition-all"
                                title="Baixar arquivo"
                              >
                                <Download className="w-3 h-3" /> Baixar
                              </a>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-600 italic flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Sem arquivo
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )}
    {/* Production History Modal */}
    {showProdHistory && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowProdHistory(false)}>
        <div className="glass-panel w-full max-w-3xl max-h-[85vh] overflow-y-auto p-8 border-violet-500/30 bg-slate-900/95" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-white flex items-center gap-3"><ClipboardList className="w-6 h-6 text-violet-400" /> Histórico de Produções</h2>
            <button onClick={() => setShowProdHistory(false)} className="p-2 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
          {prodHistoryLoading ? (
            <div className="text-center py-16 text-muted animate-pulse">Carregando...</div>
          ) : prodHistory.length === 0 ? (
            <div className="text-center py-12 text-muted italic border border-dashed border-white/10 rounded-2xl">Nenhuma produção registrada ainda.</div>
          ) : (
            <div className="space-y-3">
              {prodHistory.map((log: any) => (
                <div key={log.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-400">{log.technical_sheet_name}</span>
                      <span className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-bold">{log.quantity_produced} {log.yield_unit}</span>
                    </div>
                    <span className="text-xs text-muted flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(log.produced_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                  </div>
                  {log.notes && <p className="text-xs text-slate-400 italic mb-2">{log.notes}</p>}
                  <div className="flex flex-wrap gap-2">
                    {log.items?.map((item: any, i: number) => (
                      <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-lg border border-white/10">
                        {item.raw_material_name}: <span className="font-bold text-rose-300">-{item.quantity_deducted.toFixed(3)} {item.purchase_unit}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

    {/* Production Modal */}
    {showProductionModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !prodSending && setShowProductionModal(false)}>
        <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 border-emerald-500/30 bg-slate-900/95" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-3"><Factory className="w-6 h-6 text-emerald-400" /> Registrar Produção</h2>
              <p className="text-xs text-muted mt-1">Dê baixa automática nos insumos utilizados</p>
            </div>
            <button onClick={() => setShowProductionModal(false)} disabled={prodSending} className="p-2 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>

          {prodSuccess ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-black text-emerald-400 mb-2">Produção Registrada!</h3>
              <p className="text-muted text-sm mb-6">Os insumos foram baixados do estoque automaticamente.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { setProdSuccess(false); setProdTab('recipe'); setSelectedFichaId(null); setProdQty(1); setProdNotes(''); setManualItems([]); }} className="btn bg-white/5 border border-white/10 hover:bg-white/10">
                  Nova Produção
                </button>
                <button onClick={() => setShowProductionModal(false)} className="btn btn-primary">
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-black/30 rounded-xl mb-6">
                <button onClick={() => setProdTab('recipe')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${prodTab === 'recipe' ? 'bg-emerald-500 text-white shadow' : 'text-muted hover:text-white'}`}>
                  Por Ficha Técnica
                </button>
                <button onClick={() => setProdTab('manual')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${prodTab === 'manual' ? 'bg-emerald-500 text-white shadow' : 'text-muted hover:text-white'}`}>
                  Avulsa (Manual)
                </button>
              </div>

              {/* Date & Notes common fields */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1.5 block">Data da Produção</label>
                  <input type="date" className="input text-sm" value={prodDate} onChange={e => setProdDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1.5 block">Observações</label>
                  <input type="text" className="input text-sm" placeholder="Ex: Produção do almoço" value={prodNotes} onChange={e => setProdNotes(e.target.value)} />
                </div>
              </div>

              {prodTab === 'recipe' ? (
                <>
                  {/* Recipe selector */}
                  <div className="mb-5">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1.5 block">Ficha Técnica</label>
                    {fichasLoading ? (
                      <div className="input animate-pulse text-muted text-sm">Carregando fichas...</div>
                    ) : fichas.length === 0 ? (
                      <div className="input text-muted text-sm">Nenhuma ficha técnica cadastrada</div>
                    ) : (
                      <select className="input text-sm" value={selectedFichaId ?? ''} onChange={e => setSelectedFichaId(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">Selecione uma ficha técnica...</option>
                        {fichas.map((f: any) => (
                          <option key={f.id} value={f.id}>{f.name} (rende {f.yield} {f.yield_unit})</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {selectedFicha && (
                    <div className="mb-5">
                      <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1.5 block">Quantidade a Produzir</label>
                      <div className="flex items-center gap-3">
                        <input type="number" min="0.1" step="0.1" className="input text-sm w-32" value={prodQty} onChange={e => setProdQty(parseFloat(e.target.value) || 1)} />
                        <span className="text-sm text-muted">{selectedFicha.yield_unit} <span className="text-slate-500">(receita rende {selectedFicha.yield} {selectedFicha.yield_unit})</span></span>
                      </div>
                    </div>
                  )}

                  {/* Preview deductions */}
                  {previewDeductions.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Insumos que serão baixados</h3>
                        {hasInsufficient && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg font-bold">
                            <AlertCircle className="w-3 h-3" /> Estoque insuficiente em alguns itens
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {previewDeductions.map((d, i) => (
                          <div key={i} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm ${d.insufficient ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/10'}`}>
                            <div className="flex items-center gap-2">
                              {d.insufficient && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                              <span className={`font-semibold ${d.insufficient ? 'text-rose-300' : 'text-slate-200'}`}>{d.name}</span>
                            </div>
                            <div className="text-right">
                              <span className={`font-black ${d.insufficient ? 'text-rose-400' : 'text-amber-400'}`}>-{d.deductPurchase.toFixed(3)} {d.purchase_unit}</span>
                              <span className="text-[10px] text-muted ml-2">/ {d.currentStock.toFixed(2)} em estoque</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Manual mode */
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider">Insumos para baixar</label>
                    <button
                      onClick={() => setManualItems(prev => [...prev, { raw_material_id: materials[0]?.id || 0, name: materials[0]?.name || '', qty: 1, purchase_unit: materials[0]?.purchase_unit || 'kg' }])}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar insumo
                    </button>
                  </div>
                  {manualItems.length === 0 ? (
                    <div className="text-center py-8 text-muted text-sm border border-dashed border-white/10 rounded-xl">Adicione insumos para dar baixa manual</div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {manualItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                          <select
                            className="input text-xs flex-1 min-w-0"
                            value={item.raw_material_id}
                            onChange={e => {
                              const mat = materials.find(m => m.id === Number(e.target.value));
                              setManualItems(prev => prev.map((x, i) => i === idx ? { ...x, raw_material_id: mat?.id || 0, name: mat?.name || '', purchase_unit: mat?.purchase_unit || 'kg' } : x));
                            }}
                          >
                            {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                          <input
                            type="number" min="0.001" step="0.001"
                            className="input text-xs w-24"
                            placeholder="Qtd"
                            value={item.qty || ''}
                            onChange={e => setManualItems(prev => prev.map((x, i) => i === idx ? { ...x, qty: parseFloat(e.target.value) || 0 } : x))}
                          />
                          <span className="text-xs text-muted w-8 shrink-0">{item.purchase_unit}</span>
                          <button onClick={() => setManualItems(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {prodError && (
                <div className="mb-4 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {prodError}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowProductionModal(false)} disabled={prodSending} className="btn bg-white/5 border border-white/10 hover:bg-white/10">
                  Cancelar
                </button>
                <button
                  onClick={submitProduction}
                  disabled={prodSending || (prodTab === 'recipe' && !selectedFichaId)}
                  className="btn bg-emerald-500 hover:bg-emerald-600 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {prodSending ? 'Registrando...' : <><Factory className="w-4 h-4 mr-2" /> Confirmar Produção</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}
    </>
  );
}
