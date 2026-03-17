'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Utensils, Package, DollarSign, Percent, ChevronDown, ChevronUp, Save, ShieldAlert } from 'lucide-react';
import { cn, maskCurrency, unmaskCurrency } from '@/lib/utils';

interface MealPricing {
  id: number;
  name: string;
  sale_price: number;
  ifood_fee_percent: number;
  tax_percent: number;
  total_food_cost: number;
  packaging_cost: number;
}

export default function VendasPage() {
  const [meals, setMeals] = useState<MealPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Record<number, { sale_price: number; ifood_fee_percent: number; tax_percent: number }>>({});
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => { fetchMeals(); }, []);

  const fetchMeals = async () => {
    try {
      const res = await fetch('/api/cardapio', { cache: 'no-store' });
      const data = await res.json();
      setMeals(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const toggleExpand = (id: number, meal: MealPricing) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!editing[id]) {
        setEditing(prev => ({
          ...prev,
          [id]: { sale_price: meal.sale_price, ifood_fee_percent: meal.ifood_fee_percent, tax_percent: meal.tax_percent }
        }));
      }
    }
  };

  const updateField = (id: number, field: string, value: number) => {
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSave = async (id: number) => {
    setSaving(id);
    try {
      await fetch(`/api/vendas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing[id])
      });
      await fetchMeals();
      setExpandedId(null);
    } catch (e) { console.error(e); } finally { setSaving(null); }
  };

  const calcProfit = (meal: MealPricing, overrides?: { sale_price: number; ifood_fee_percent: number; tax_percent: number }) => {
    const sp = overrides?.sale_price ?? meal.sale_price;
    const ifood = overrides?.ifood_fee_percent ?? meal.ifood_fee_percent;
    const tax = overrides?.tax_percent ?? meal.tax_percent;
    const totalCost = (meal.total_food_cost || 0) + (meal.packaging_cost || 0);
    const ifoodFee = (sp * ifood) / 100;
    const netAfterCommission = sp - ifoodFee;
    const taxVal = (netAfterCommission * tax) / 100;
    const profit = sp - ifoodFee - taxVal - totalCost;
    const margin = sp > 0 ? (profit / sp) * 100 : 0;
    return { sp, ifoodFee, taxVal, netAfterCommission, totalCost, profit, margin };
  };

  const totalAvgProfit = meals.length > 0
    ? meals.reduce((acc, m) => acc + calcProfit(m).profit, 0) / meals.length
    : 0;

  return (
    <div className="space-y-10 animate-fade-in max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Precificação e Vendas</h1>
          <p className="text-muted text-lg">Configure <span className="text-emerald-400 font-bold">preços, comissões e impostos</span> e visualize a rentabilidade real de cada prato.</p>
        </div>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="p-3 bg-orange-500/20 rounded-xl"><Utensils className="w-6 h-6 text-orange-400" /></div>
          <div>
            <p className="text-xs text-muted font-bold uppercase tracking-widest">Pratos no Cardápio</p>
            <p className="text-2xl font-black text-white">{meals.length}</p>
          </div>
        </div>
        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl"><TrendingUp className="w-6 h-6 text-emerald-400" /></div>
          <div>
            <p className="text-xs text-muted font-bold uppercase tracking-widest">Lucro Médio / Prato</p>
            <p className={cn("text-2xl font-black", totalAvgProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
              R$ {totalAvgProfit.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 rounded-xl"><DollarSign className="w-6 h-6 text-amber-400" /></div>
          <div>
            <p className="text-xs text-muted font-bold uppercase tracking-widest">Pratos Precificados</p>
            <p className="text-2xl font-black text-white">{meals.filter(m => m.sale_price > 0).length} / {meals.length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-12 text-center text-muted">Carregando...</div>
      ) : meals.length === 0 ? (
        <div className="glass-panel p-16 text-center">
          <TrendingUp className="w-16 h-16 text-muted mx-auto mb-4 opacity-30" />
          <p className="text-muted text-lg">Nenhum prato cadastrado.</p>
          <p className="text-sm text-slate-600 mt-1">Cadastre pratos em <strong>Gestão de Cardápio</strong> primeiro.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meals.map((meal) => {
            const isExpanded = expandedId === meal.id;
            const ed = editing[meal.id];
            const { sp, ifoodFee, taxVal, netAfterCommission, totalCost, profit, margin } = calcProfit(meal, isExpanded && ed ? ed : undefined);
            const isPriced = meal.sale_price > 0;

            return (
              <div
                key={meal.id}
                className={cn(
                  "glass-panel border transition-all",
                  isExpanded ? "border-orange-500/40 bg-orange-500/5" : "border-white/5 hover:border-white/20"
                )}
              >
                {/* Header row */}
                <div
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 cursor-pointer"
                  onClick={() => toggleExpand(meal.id, meal)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-3 h-3 rounded-full shrink-0",
                      !isPriced ? "bg-slate-600" : margin >= 30 ? "bg-emerald-400" : margin >= 15 ? "bg-amber-400" : "bg-rose-400"
                    )} />
                    <div>
                      <h3 className="text-xl font-black text-white">{meal.name}</h3>
                      <p className="text-xs text-muted font-bold uppercase tracking-wider mt-0.5">
                        Custo Total: R$ {totalCost.toFixed(3)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 md:gap-10">
                    {isPriced ? (
                      <>
                        <div className="text-center">
                          <p className="text-[10px] text-muted font-bold uppercase">Preço iFood</p>
                          <p className="text-lg font-black text-slate-200">R$ {meal.sale_price.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted font-bold uppercase">Lucro</p>
                          <p className={cn("text-lg font-black", profit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                            R$ {profit.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted font-bold uppercase">Margem</p>
                          <span className={cn(
                            "text-sm font-black px-3 py-1 rounded-lg",
                            margin >= 30 ? "bg-emerald-500/10 text-emerald-400" : margin >= 15 ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                          )}>
                            {margin.toFixed(1)}%
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                        Aguardando precificação
                      </span>
                    )}
                    <div className="text-muted">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded pricing form */}
                {isExpanded && ed && (
                  <div className="px-6 pb-8 border-t border-white/10 pt-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Inputs */}
                      <div className="space-y-6">
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">Configurar Preços</h4>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                            <DollarSign className="w-3 h-3" /> Preço de Venda iFood (R$)
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold">R$</span>
                            <input
                              type="text"
                              className="input py-3 pl-12"
                              value={maskCurrency(ed.sale_price)}
                              onChange={e => updateField(meal.id, 'sale_price', unmaskCurrency(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                            <Percent className="w-3 h-3" /> Comissão iFood (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            className="input py-3"
                            value={ed.ifood_fee_percent}
                            onChange={e => updateField(meal.id, 'ifood_fee_percent', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                            <Percent className="w-3 h-3" /> Impostos (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            className="input py-3"
                            value={ed.tax_percent}
                            onChange={e => updateField(meal.id, 'tax_percent', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <button
                          onClick={() => handleSave(meal.id)}
                          disabled={saving === meal.id}
                          className="btn btn-primary w-full py-4 justify-center disabled:opacity-50"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {saving === meal.id ? 'Salvando...' : 'Salvar Precificação'}
                        </button>
                      </div>

                      {/* Live breakdown */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">Análise em Tempo Real</h4>
                        <div className="bg-white/5 rounded-2xl border border-white/5 p-5 space-y-3">
                          <BreakdownRow label="Preço de Venda" value={`R$ ${sp.toFixed(2)}`} />
                          <BreakdownRow label="(-) Comissão iFood" value={`- R$ ${ifoodFee.toFixed(2)}`} variant="danger" icon={ShieldAlert} />
                          <BreakdownRow label="Valor Líquido (base do imposto)" value={`R$ ${netAfterCommission.toFixed(2)}`} />
                          <BreakdownRow label={`(-) Impostos (sobre R$ ${netAfterCommission.toFixed(2)})`} value={`- R$ ${taxVal.toFixed(2)}`} variant="danger" icon={ShieldAlert} />
                          <BreakdownRow label="(-) Custo Insumos" value={`- R$ ${(meal.total_food_cost || 0).toFixed(3)}`} variant="warning" icon={Utensils} />
                          <BreakdownRow label="(-) Custo Embalagem" value={`- R$ ${(meal.packaging_cost || 0).toFixed(3)}`} variant="warning" icon={Package} />
                          <div className="pt-3 border-t border-white/10">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-black text-white text-sm uppercase tracking-wider">Lucro Líquido</span>
                              <span className={cn("text-2xl font-black", profit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                R$ {profit.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted font-bold uppercase">Margem</span>
                              <span className={cn(
                                "text-lg font-black px-3 py-0.5 rounded-lg",
                                margin >= 30 ? "bg-emerald-500/10 text-emerald-400" : margin >= 15 ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                              )}>
                                {margin.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted px-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />≥ 30% saudável &nbsp;
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />15–29% atenção &nbsp;
                          <span className="inline-block w-2 h-2 rounded-full bg-rose-400 mr-1" />&lt; 15% crítico
                        </div>
                      </div>
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

function BreakdownRow({ label, value, variant, icon: Icon }: { label: string; value: string; variant?: 'danger' | 'warning'; icon?: any }) {
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
