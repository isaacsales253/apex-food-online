'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, CheckCircle2, Circle, Search, Printer, Save, Plus, Trash2, Truck, AlertTriangle, PackagePlus } from 'lucide-react';
import { cn, maskCurrency, unmaskCurrency } from '@/lib/utils';

const fmtBRL = (v: number) =>
  Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface CartItem {
  id: string; // unique literal client id for this row
  supplier_id: number | '';
  brand: string;
  quantity: number;
  unit_price: number;
}

export default function ListaComprasPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<any[]>([]);
  const [disposables, setDisposables] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [cart, setCart] = useState<Record<number, CartItem[]>>({});
  const [dispCart, setDispCart] = useState<Record<number, { qty: number; unit_price: number; supplier_id: number | '' }>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [matsRes, supsRes, brandsRes, dispRes] = await Promise.all([
        fetch('/api/insumos', { cache: 'no-store' }),
        fetch('/api/fornecedores', { cache: 'no-store' }),
        fetch('/api/marcas', { cache: 'no-store' }),
        fetch('/api/descartaveis', { cache: 'no-store' })
      ]);
      const [matsData, supsData, brandsData, dispData] = await Promise.all([matsRes.json(), supsRes.json(), brandsRes.json(), dispRes.json()]);
      setMaterials(Array.isArray(matsData) ? matsData : []);
      setSuppliers(Array.isArray(supsData) ? supsData : []);
      setBrands(Array.isArray(brandsData) ? brandsData : []);
      setDisposables(Array.isArray(dispData) ? dispData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const belowMinStock = materials.filter(m => m.min_stock > 0 && (m.stock_quantity ?? 0) < m.min_stock);

  const autoFillMinStock = () => {
    const next = { ...cart };
    belowMinStock.forEach(m => {
      const deficit = m.min_stock - (m.stock_quantity ?? 0);
      const price = m.last_purchase_price || m.purchase_price;
      if (!next[m.id] || next[m.id].length === 0) {
        next[m.id] = [{ id: Math.random().toString(), supplier_id: '', brand: '', quantity: parseFloat(deficit.toFixed(3)), unit_price: price }];
      }
    });
    setCart(next);
  };

  const toggleDisp = (id: number, defaultPrice: number) => {
    setDispCart(prev => {
      if (prev[id]) { const n = { ...prev }; delete n[id]; return n; }
      return { ...prev, [id]: { qty: 1, unit_price: defaultPrice, supplier_id: '' } };
    });
  };

  const updateDisp = (id: number, field: 'qty' | 'unit_price' | 'supplier_id', value: number | string) => {
    setDispCart(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const toggleCheck = (id: number, defaultPrice: number) => {
    const next = { ...cart };
    if (next[id] && next[id].length > 0) {
      delete next[id];
    } else {
      const mat = materials.find(m => m.id === id);
      const price = mat?.last_purchase_price || defaultPrice;
      next[id] = [{ id: Math.random().toString(), supplier_id: '', brand: '', quantity: 1, unit_price: price }];
    }
    setCart(next);
  };

  const addSupplierRow = (materialId: number, defaultPrice: number) => {
    const mat = materials.find(m => m.id === materialId);
    const price = mat?.last_purchase_price || defaultPrice;
    setCart(prev => {
      const existing = prev[materialId] || [];
      return {
        ...prev,
        [materialId]: [...existing, { id: Math.random().toString(), supplier_id: '', brand: '', quantity: 1, unit_price: price }]
      };
    });
  };

  const removeCartItem = (materialId: number, itemId: string) => {
    setCart(prev => {
      const filtered = prev[materialId].filter(c => c.id !== itemId);
      if (filtered.length === 0) {
        const next = { ...prev };
        delete next[materialId];
        return next;
      }
      return {
        ...prev,
        [materialId]: filtered
      };
    });
  };

  const updateCartLine = (materialId: number, itemId: string, field: keyof Omit<CartItem, 'id'>, value: any) => {
    setCart(prev => ({
      ...prev,
      [materialId]: prev[materialId].map(line => 
        line.id === itemId ? { ...line, [field]: value } : line
      )
    }));
  };

  const updateCartLineTotal = (materialId: number, itemId: string, total: number) => {
    setCart(prev => ({
      ...prev,
      [materialId]: prev[materialId].map(line => {
        if (line.id === itemId) {
          const qty = line.quantity || 1;
          return { ...line, unit_price: total / qty };
        }
        return line;
      })
    }));
  };

  const handleSavePurchase = async () => {
    // Flatten the lines
    const itemsToSave: any[] = [];
    let missingSupplier = false;

    Object.entries(cart).forEach(([idStr, lines]) => {
      const raw_material_id = parseInt(idStr);
      lines.forEach(line => {
         if (line.quantity > 0) {
           if (line.supplier_id === '') {
             missingSupplier = true;
           }
           itemsToSave.push({
             raw_material_id,
             supplier_id: line.supplier_id === '' ? null : parseInt(line.supplier_id.toString()),
             brand: line.brand || 'Genérica',
             quantity: line.quantity,
             unit_price: line.unit_price,
             total_price: line.quantity * line.unit_price
           });
         }
      });
    });

    const disposable_items = Object.entries(dispCart).map(([idStr, entry]) => ({
      disposable_id: parseInt(idStr),
      quantity: entry.qty,
      unit_price: entry.unit_price,
      supplier_id: entry.supplier_id === '' ? null : parseInt(entry.supplier_id.toString())
    }));

    const missingDispSupplier = Object.values(dispCart).some(e => e.supplier_id === '');

    if (missingSupplier || missingDispSupplier) {
      alert("Obrigatório: Por favor, selecione um fornecedor para todos os itens antes de registrar a compra.");
      return;
    }

    if (itemsToSave.length === 0 && disposable_items.length === 0) {
      alert("Selecione pelo menos um item para registrar a compra.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_cost: totalCalculated,
          items: itemsToSave,
          disposable_items
        })
      });

      if (!res.ok) throw new Error('Falha ao salvar');

      alert("Compra registrada com sucesso! Os estoques foram atualizados.");
      setCart({});
      setDispCart({});
      fetchData();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Houve um erro ao tentar salvar a compra.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalInsumosCalculated = Object.values(cart).reduce((acc, lines) => {
    return acc + lines.reduce((subAcc, line) => subAcc + (line.quantity * line.unit_price), 0);
  }, 0);

  const totalDisposablesCalculated = Object.values(dispCart).reduce((acc, entry) => {
    return acc + entry.qty * entry.unit_price;
  }, 0);

  const totalCalculated = totalInsumosCalculated + totalDisposablesCalculated;

  const filteredDisposables = disposables.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Print via popup window ────────────────────────────────────────────────
  const handlePrint = () => {
    const printDate = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    type InsumoRow = { name: string; category: string; qty: number; unit: string; unit_price: number; total: number; supplier: string; brand: string };
    type DispRow   = { name: string; category: string; qty: number; unit: string; unit_price: number; total: number; supplier: string };

    const insRows: InsumoRow[] = [];
    Object.entries(cart).forEach(([idStr, lines]) => {
      const mat = materials.find(m => m.id === parseInt(idStr));
      if (!mat) return;
      lines.forEach(line => {
        if (line.quantity > 0) {
          const sup = suppliers.find(s => s.id === parseInt(line.supplier_id?.toString() || ''));
          insRows.push({
            name: mat.name, category: mat.category,
            qty: line.quantity, unit: mat.purchase_unit,
            unit_price: line.unit_price, total: line.quantity * line.unit_price,
            supplier: sup?.name || '—', brand: line.brand || '—',
          });
        }
      });
    });
    insRows.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

    const dispRows: DispRow[] = [];
    Object.entries(dispCart).forEach(([idStr, entry]) => {
      const d = disposables.find(x => x.id === parseInt(idStr));
      if (!d) return;
      const sup = suppliers.find(s => s.id === parseInt(entry.supplier_id?.toString() || ''));
      dispRows.push({
        name: d.name, category: d.category,
        qty: entry.qty, unit: d.unit,
        unit_price: entry.unit_price, total: entry.qty * entry.unit_price,
        supplier: sup?.name || '—',
      });
    });

    const totalIns  = insRows.reduce((s, r) => s + r.total, 0);
    const totalDisp = dispRows.reduce((s, r) => s + r.total, 0);
    const totalAll  = totalIns + totalDisp;

    const rowStyle = `padding:5px 7px;border:1px solid #ddd;`;
    const thStyle  = `padding:5px 7px;border:1px solid #ccc;background:#f5f5f5;font-weight:700;font-size:10px;text-align:`;

    const insRowsHtml = insRows.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafe'}">
        <td style="${rowStyle}font-weight:700">${r.name}</td>
        <td style="${rowStyle}color:#666">${r.category}</td>
        <td style="${rowStyle}text-align:center;font-weight:700">${r.qty % 1 === 0 ? r.qty : r.qty.toFixed(3)}</td>
        <td style="${rowStyle}text-align:center;color:#888;font-size:9px;text-transform:uppercase">${r.unit}</td>
        <td style="${rowStyle}text-align:right">R$ ${fmtBRL(r.unit_price)}</td>
        <td style="${rowStyle}text-align:right;font-weight:800;color:#059669">R$ ${fmtBRL(r.total)}</td>
        <td style="${rowStyle}color:#444">${r.supplier}</td>
        <td style="${rowStyle}color:#888">${r.brand}</td>
      </tr>`).join('');

    const dispRowsHtml = dispRows.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#fffdf5'}">
        <td style="${rowStyle}font-weight:700">${r.name}</td>
        <td style="${rowStyle}color:#666">${r.category}</td>
        <td style="${rowStyle}text-align:center;font-weight:700">${r.qty}</td>
        <td style="${rowStyle}text-align:center;color:#888;font-size:9px;text-transform:uppercase">${r.unit}</td>
        <td style="${rowStyle}text-align:right">R$ ${fmtBRL(r.unit_price)}</td>
        <td style="${rowStyle}text-align:right;font-weight:800;color:#059669">R$ ${fmtBRL(r.total)}</td>
        <td style="${rowStyle}color:#444">${r.supplier}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Lista de Compras — APEX Food</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; background: #fff; padding: 16px; }
        h1 { font-size: 22px; font-weight: 900; color: #7c3aed; letter-spacing: -0.5px; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #7c3aed; padding-bottom: 10px; margin-bottom: 16px; }
        .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; padding: 0 0 6px 8px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; table-layout: fixed; margin-bottom: 4px; }
        tfoot td { background: #f3f0ff; font-weight: 800; }
        .total-box { margin-top: 16px; border-top: 2px solid #ddd; padding-top: 12px; text-align: right; }
        .total-box .label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; }
        .total-box .value { font-size: 24px; font-weight: 900; color: #059669; }
        .footer { margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 8px; font-size: 9px; color: #aaa; text-align: center; }
        @page { size: A4 landscape; margin: 10mm 12mm; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <div class="header">
        <div>
          <p style="font-size:8px;color:#999;margin-bottom:4px">${printDate}</p>
          <h1>LISTA DE COMPRAS</h1>
          <p style="font-size:10px;color:#555;margin-top:2px">APEX Food — Sistema de Gestão</p>
        </div>
        <div style="text-align:right">
          <div style="font-size:9px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:1px">Total da Lista</div>
          <div style="font-size:20px;font-weight:900;color:#059669">R$ ${fmtBRL(totalAll)}</div>
          <div style="font-size:9px;color:#888">${insRows.length + dispRows.length} itens selecionados</div>
        </div>
      </div>

      ${insRows.length > 0 ? `
      <div style="margin-bottom:20px">
        <div class="section-title" style="color:#7c3aed;border-left:3px solid #7c3aed">Insumos</div>
        <table>
          <colgroup>
            <col style="width:24%"><col style="width:14%"><col style="width:7%">
            <col style="width:5%"><col style="width:11%"><col style="width:11%">
            <col style="width:16%"><col style="width:12%">
          </colgroup>
          <thead><tr>
            <th style="${thStyle}left">Insumo</th>
            <th style="${thStyle}left">Categoria</th>
            <th style="${thStyle}center">Qtd</th>
            <th style="${thStyle}center">Un.</th>
            <th style="${thStyle}right">Preço Un.</th>
            <th style="${thStyle}right;color:#059669">Total</th>
            <th style="${thStyle}left">Fornecedor</th>
            <th style="${thStyle}left">Marca</th>
          </tr></thead>
          <tbody>${insRowsHtml}</tbody>
          <tfoot><tr>
            <td colspan="5" style="${rowStyle}text-align:right">Subtotal Insumos:</td>
            <td style="${rowStyle}text-align:right;color:#059669">R$ ${fmtBRL(totalIns)}</td>
            <td colspan="2" style="${rowStyle}"></td>
          </tr></tfoot>
        </table>
      </div>` : ''}

      ${dispRows.length > 0 ? `
      <div style="margin-bottom:20px">
        <div class="section-title" style="color:#d97706;border-left:3px solid #d97706">Talheres e Descartáveis</div>
        <table>
          <colgroup>
            <col style="width:28%"><col style="width:18%"><col style="width:7%">
            <col style="width:6%"><col style="width:12%"><col style="width:12%">
            <col style="width:17%">
          </colgroup>
          <thead><tr style="background:#fffbeb">
            <th style="${thStyle}left">Item</th>
            <th style="${thStyle}left">Categoria</th>
            <th style="${thStyle}center">Qtd</th>
            <th style="${thStyle}center">Un.</th>
            <th style="${thStyle}right">Preço Un.</th>
            <th style="${thStyle}right;color:#059669">Total</th>
            <th style="${thStyle}left">Fornecedor</th>
          </tr></thead>
          <tbody>${dispRowsHtml}</tbody>
          <tfoot><tr>
            <td colspan="5" style="${rowStyle}text-align:right">Subtotal Descartáveis:</td>
            <td style="${rowStyle}text-align:right;color:#059669">R$ ${fmtBRL(totalDisp)}</td>
            <td style="${rowStyle}"></td>
          </tr></tfoot>
        </table>
      </div>` : ''}

      <div class="total-box">
        <div class="label">Total Geral</div>
        <div class="value">R$ ${fmtBRL(totalAll)}</div>
      </div>
      <div class="footer">Gerado em ${printDate} · Marque os itens conforme for comprando</div>
    </body></html>`;

    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <>
    <div className="space-y-10 animate-fade-in max-w-[1600px] mx-auto">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Lista de Compras</h1>
          <p className="text-muted text-lg">Registre compras identificando <span className="text-emerald-400 font-bold">fornecedores</span> e atualize o estoque.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
           {belowMinStock.length > 0 && (
             <button
               onClick={autoFillMinStock}
               className="btn px-6 py-4 bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
             >
               <PackagePlus className="w-5 h-5 mr-2" />
               Repor Estoque Mínimo
               <span className="ml-2 bg-amber-500/20 text-amber-200 text-xs font-black px-2 py-0.5 rounded-full">{belowMinStock.length}</span>
             </button>
           )}
           {Object.keys(cart).length > 0 && (
             <button onClick={() => setCart({})} className="btn bg-white/5 border border-white/10 hover:bg-white/10 px-6 py-4">
               Esvaziar Carrinho
             </button>
           )}
           <button className="btn btn-primary px-8 py-4" onClick={handlePrint}>
             <Printer className="w-5 h-5 mr-2" />
             Imprimir Lista
           </button>
        </div>
      </header>

      <div className="glass-panel p-6 border-white/5">
         <div className="relative">
           <Search className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
           <input 
             className="input py-5 pl-14 text-lg w-full bg-white/5 border-transparent focus:border-primary/50" 
             placeholder="Buscar insumo ou categoria para adicionar ao carrinho..." 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
         <div className="lg:col-span-2 space-y-4">
            {filteredMaterials.length === 0 && !loading ? (
              <div className="glass-panel p-12 text-center border-dashed border-white/10">
                <ShoppingCart className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-slate-300">Nenhum insumo encontrado</h3>
                <p className="text-muted mt-2">Você ainda não cadastrou insumos ou a busca não retornou resultados.</p>
              </div>
            ) : (
              filteredMaterials.map((m) => {
                const lines = cart[m.id] || [];
                const isChecked = lines.length > 0;

                return (
                  <div 
                     key={m.id} 
                     className={cn(
                       "p-6 rounded-2xl border transition-all flex flex-col gap-4 group",
                       isChecked
                         ? "bg-primary/5 border-primary/30 shadow-[0_0_30px_-10px_rgba(139,92,246,0.15)]"
                         : m.min_stock > 0 && (m.stock_quantity ?? 0) < m.min_stock
                           ? "bg-rose-500/[0.03] border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/[0.06] cursor-pointer"
                           : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 cursor-pointer"
                     )}
                     onClick={() => {
                        if (!isChecked) toggleCheck(m.id, m.purchase_price);
                     }}
                  >
                     <div className="flex justify-between items-center">
                       <div className="flex items-center gap-6 cursor-pointer" onClick={(e) => {
                          if (isChecked) { e.stopPropagation(); toggleCheck(m.id, m.purchase_price); }
                       }}>
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0",
                            isChecked ? "bg-primary text-white" : "bg-slate-800 text-slate-500 group-hover:bg-slate-700"
                          )}>
                             {isChecked ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                          </div>
                          <div>
                             <div className="flex items-center gap-2 flex-wrap">
                               <h3 className={cn(
                                 "text-xl font-bold transition-all",
                                 isChecked ? "text-primary" : "text-white"
                               )}>{m.name}</h3>
                               {m.min_stock > 0 && (m.stock_quantity ?? 0) < m.min_stock && (
                                 <span className="flex items-center gap-1 text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-lg">
                                   <AlertTriangle className="w-3 h-3" />
                                   {((m.stock_quantity ?? 0)).toFixed(2)}/{m.min_stock.toFixed(2)} {m.purchase_unit}
                                 </span>
                               )}
                             </div>
                             <p className="text-sm font-black text-muted uppercase tracking-widest mt-1">{m.category}</p>
                          </div>
                       </div>
                       
                       {!isChecked && (
                         <div className="text-right">
                            <p className="text-2xl font-black text-slate-500">
                              R$ {m.purchase_price.toFixed(2)}
                            </p>
                            <p className="text-xs font-bold text-muted mt-1 uppercase">Preço Base ({m.purchase_unit})</p>
                         </div>
                       )}
                     </div>

                     {isChecked && (
                        <div className="pt-4 border-t border-primary/20 animate-fade-in space-y-4" onClick={e => e.stopPropagation()}>
                           {lines.map((line, index) => (
                             <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-black/20 p-4 rounded-xl relative group/line">
                                <div className="absolute -top-3 left-4 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                                   Compra {index + 1}
                                </div>
                                <div className="md:col-span-2">
                                   <label className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 flex items-center gap-1"><Truck className="w-3 h-3"/> Fornecedor</label>
                                   <select 
                                     className="input py-2 text-sm bg-slate-900 appearance-none w-full"
                                     value={line.supplier_id}
                                     onChange={e => updateCartLine(m.id, line.id, 'supplier_id', e.target.value)}
                                   >
                                      <option value="">Nenhum...</option>
                                      {suppliers.map(sup => (
                                        <option key={sup.id} value={sup.id}>{sup.name}</option>
                                      ))}
                                   </select>
                                </div>
                                <div className="md:col-span-2">
                                   <label className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">Marca</label>
                                   <select 
                                     className="input py-2 text-sm bg-slate-900 appearance-none w-full"
                                     value={line.brand}
                                     onChange={e => updateCartLine(m.id, line.id, 'brand', e.target.value)}
                                   >
                                      <option value="">Genérica (Sem Marca)</option>
                                      {brands.filter(b => b.status !== 'Reprovada').map(b => (
                                        <option key={b.id} value={b.name}>{b.name} {b.status === 'Em Teste' ? '(Teste)' : ''}</option>
                                      ))}
                                   </select>
                                </div>
                                <div className="md:col-span-3">
                                   <label className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">Qtd Comprada</label>
                                   <div className="flex items-center">
                                     <input 
                                       type="number" min="0" step="0.01"
                                       className="input py-2 text-sm bg-slate-900 w-full"
                                       value={line.quantity}
                                       onChange={e => updateCartLine(m.id, line.id, 'quantity', parseFloat(e.target.value) || 0)}
                                     />
                                     <span className="ml-2 text-xs font-bold text-muted uppercase">{m.purchase_unit}</span>
                                   </div>
                                </div>
                                <div className="md:col-span-2">
                                   <label className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">Preço Un. (R$)</label>
                                   <input
                                     type="number"
                                     min="0"
                                     step="0.01"
                                     className="input py-2 text-sm bg-slate-900 w-full"
                                     value={line.unit_price === 0 ? '' : line.unit_price}
                                     placeholder="0,00"
                                     onChange={e => updateCartLine(m.id, line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                   />
                                </div>
                                <div className="md:col-span-2">
                                   <label className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 block">Total (R$)</label>
                                   <input
                                     type="number"
                                     min="0"
                                     step="0.01"
                                     className="input py-2 text-sm bg-primary/10 border-primary/30 text-primary font-bold w-full"
                                     value={line.quantity * line.unit_price === 0 ? '' : parseFloat((line.quantity * line.unit_price).toFixed(2))}
                                     placeholder="0,00"
                                     onChange={e => updateCartLineTotal(m.id, line.id, parseFloat(e.target.value) || 0)}
                                   />
                                </div>
                                <div className="md:col-span-1 flex justify-end pb-1 md:pb-0">
                                   <button 
                                     onClick={() => removeCartItem(m.id, line.id)} 
                                     className="p-2 text-danger opacity-70 hover:opacity-100 transition-opacity bg-danger/10 hover:bg-danger/20 rounded-lg"
                                     title="Remover este item"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                </div>
                             </div>
                           ))}

                           <div className="flex justify-end pt-2 border-t border-dashed border-white/10">
                              <button 
                                className="text-xs flex items-center gap-1 font-bold text-emerald-400 hover:bg-emerald-400/10 px-3 py-1.5 rounded-lg transition-colors"
                                onClick={() => addSupplierRow(m.id, m.purchase_price)}
                              >
                                <Plus className="w-3.5 h-3.5" /> Adicionar outro fornecedor
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
                );
              })
            )}
            {/* Disposables Section */}
            {disposables.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                  <span className="w-2 h-8 rounded-full bg-amber-400 inline-block" />
                  Talheres e Descartáveis
                </h2>
                <div className="space-y-3">
                  {filteredDisposables.map((d) => {
                    const entry = dispCart[d.id];
                    const isChecked = !!entry;

                    return (
                      <div
                        key={d.id}
                        className={cn(
                          "p-5 rounded-2xl border transition-all flex flex-col gap-4 group",
                          isChecked
                            ? "bg-amber-500/5 border-amber-500/30 shadow-[0_0_30px_-10px_rgba(251,191,36,0.15)]"
                            : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 cursor-pointer"
                        )}
                        onClick={() => {
                          if (!isChecked) toggleDisp(d.id, d.unit_cost || 0);
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div
                            className="flex items-center gap-5 cursor-pointer"
                            onClick={(e) => {
                              if (isChecked) { e.stopPropagation(); toggleDisp(d.id, d.unit_cost || 0); }
                            }}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0",
                              isChecked ? "bg-amber-400 text-black" : "bg-slate-800 text-slate-500 group-hover:bg-slate-700"
                            )}>
                              {isChecked ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                            </div>
                            <div>
                              <h3 className={cn(
                                "text-lg font-bold transition-all",
                                isChecked ? "text-amber-400" : "text-white"
                              )}>{d.name}</h3>
                              <p className="text-xs font-black text-muted uppercase tracking-widest mt-0.5">{d.category} · {d.unit}</p>
                            </div>
                          </div>

                          {!isChecked && (
                            <div className="text-right">
                              <p className="text-xl font-black text-slate-500">
                                R$ {(d.unit_cost || 0).toFixed(2)}
                              </p>
                              <p className="text-xs font-bold text-muted mt-1 uppercase">Último preço</p>
                            </div>
                          )}
                        </div>

                        {isChecked && (
                          <div className="pt-4 border-t border-amber-500/20 animate-fade-in grid grid-cols-1 md:grid-cols-4 gap-4 items-end" onClick={e => e.stopPropagation()}>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 flex items-center gap-1"><Truck className="w-3 h-3"/> Fornecedor</label>
                              <select
                                className="input py-2 text-sm bg-slate-900 appearance-none w-full"
                                value={entry.supplier_id}
                                onChange={e => updateDisp(d.id, 'supplier_id', e.target.value)}
                              >
                                <option value="">Selecionar...</option>
                                {suppliers.map(sup => (
                                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">Quantidade</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number" min="0" step="1"
                                  className="input py-2 text-sm bg-slate-900 w-full"
                                  value={entry.qty}
                                  onChange={e => updateDisp(d.id, 'qty', parseFloat(e.target.value) || 0)}
                                />
                                <span className="text-xs font-bold text-muted uppercase whitespace-nowrap">{d.unit}</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">Preço Un. (R$)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="input py-2 text-sm bg-slate-900 w-full"
                                value={entry.unit_price === 0 ? '' : entry.unit_price}
                                placeholder="0,00"
                                onChange={e => updateDisp(d.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 block">Total (R$)</label>
                              <input
                                type="number"
                                className="input py-2 text-sm bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold w-full"
                                value={entry.qty * entry.unit_price === 0 ? '' : parseFloat((entry.qty * entry.unit_price).toFixed(2))}
                                readOnly
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
         </div>

         <div className="lg:col-span-1 glass-panel p-8 sticky top-8 bg-gradient-to-br from-amber-900/40 to-slate-900/80 border-indigo-500/20 shadow-2xl shadow-indigo-900/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-primary" />
              Resumo da Compra
            </h2>
            <div className="space-y-4 mb-8">
               <div className="flex justify-between items-center pb-4 border-b border-white/10">
                 <span className="text-muted font-bold">Insumos</span>
                 <span className="text-xl font-black text-white">{Object.keys(cart).length}</span>
               </div>
               <div className="flex justify-between items-center pb-4 border-b border-white/10">
                 <span className="text-muted font-bold">Descartáveis</span>
                 <span className="text-xl font-black text-amber-400">{Object.keys(dispCart).length}</span>
               </div>
               <div className="flex justify-between items-center pb-4 border-b border-white/10">
                 <span className="text-muted font-bold">Total Entradas</span>
                 <span className="text-xl font-black text-primary">
                   {Object.values(cart).reduce((acc, lines) => acc + lines.length, 0) + Object.keys(dispCart).length}
                 </span>
               </div>
            </div>

            <div className="pt-4">
              <p className="text-xs text-muted font-black tracking-[0.2em] uppercase mb-2">Valor Total Gasto</p>
              <p className="text-5xl font-black text-emerald-400 flex items-start gap-2">
                 <span className="text-2xl mt-1 opacity-50">R$</span>
                 {fmtBRL(totalCalculated)}
              </p>
            </div>

            <button
              onClick={handleSavePurchase}
              disabled={isSaving || (Object.keys(cart).length === 0 && Object.keys(dispCart).length === 0)}
              className="btn btn-primary w-full py-5 text-lg justify-center mt-10 shadow-lg shadow-orange-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
               {isSaving ? 'Registrando...' : 'Registrar Compra'}
               <Save className="w-5 h-5 ml-2" />
            </button>
            <p className="text-[10px] text-center text-muted font-bold uppercase mt-4">
              Ao registrar, os estoques e os preços serão atualizados.
            </p>
         </div>
      </div>
    </div>
    </>
  );
}
