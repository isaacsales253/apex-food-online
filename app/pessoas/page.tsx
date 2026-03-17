'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserCheck, Plus, Edit3, Trash2, Save, X, Percent,
  TrendingUp, Briefcase, Phone, CreditCard, Calendar,
  Shield, AlertTriangle, Check, ChevronDown, ChevronUp, Building2,
  Heart, Bus, Utensils, FileText, CheckCircle2, XCircle, Clock, Receipt,
  BarChart2, ShoppingBag, Award, Target, Search, Filter, DollarSign,
  SendToBack, Loader2
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Meal {
  id: number;
  name: string;
  sale_price: number;
  total_food_cost: number;
  packaging_cost: number;
  ifood_fee_percent: number;
  tax_percent: number;
}

interface Collaborator {
  id: number;
  name: string;
  role: string;
  contact: string | null;
  cpf: string | null;
  cnpj: string | null;
  commission_type: 'total' | 'profit' | 'net';
  commission_percent: number;
  allowed_meals: string | null; // JSON array of meal IDs, null = todos
  active: number;
  notes: string | null;
}

interface Employee {
  id: number;
  name: string;
  role: string;
  cpf: string | null;
  rg: string | null;
  pis: string | null;
  ctps_number: string | null;
  ctps_serie: string | null;
  admission_date: string | null;
  dismissal_date: string | null;
  base_salary: number;
  transport_voucher: number;
  meal_voucher: number;
  health_plan: number;
  work_schedule: string | null;
  bank: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_pix: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address: string | null;
  status: string;
  notes: string | null;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const defaultCollab = (): Omit<Collaborator, 'id'> => ({
  name: '',
  role: 'Colaborador',
  contact: '',
  cpf: '',
  cnpj: '',
  commission_type: 'total',
  commission_percent: 0,
  allowed_meals: null,
  active: 1,
  notes: '',
});

const defaultEmployee = (): Omit<Employee, 'id'> => ({
  name: '',
  role: 'Auxiliar',
  cpf: '',
  rg: '',
  pis: '',
  ctps_number: '',
  ctps_serie: '',
  admission_date: '',
  dismissal_date: '',
  base_salary: 0,
  transport_voucher: 0,
  meal_voucher: 0,
  health_plan: 0,
  work_schedule: '08:00-17:00',
  bank: '',
  bank_agency: '',
  bank_account: '',
  bank_pix: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  address: '',
  status: 'Ativo',
  notes: '',
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcMealValues(meal: Meal) {
  const sp = meal.sale_price || 0;
  const fee = (sp * (meal.ifood_fee_percent || 0)) / 100;
  const net = sp - fee;
  const tax = (net * (meal.tax_percent || 0)) / 100;
  const cost = (meal.total_food_cost || 0) + (meal.packaging_cost || 0);
  const profit = sp - fee - tax - cost;
  return { total: sp, net: net - tax, profit };
}

function getCommissionBase(meal: Meal, type: string) {
  const vals = calcMealValues(meal);
  if (type === 'total') return vals.total;
  if (type === 'net') return vals.net;
  if (type === 'profit') return vals.profit;
  return vals.total;
}

const COMMISSION_LABELS: Record<string, string> = {
  total: 'Valor Total da Venda',
  net:   'Valor Líquido (após taxas)',
  profit: 'Lucro Líquido',
};

const COMMISSION_COLORS: Record<string, string> = {
  total:  'bg-sky-500/10 text-sky-300 border-sky-500/20',
  net:    'bg-amber-500/10 text-amber-300 border-amber-500/20',
  profit: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
};

// — CLT cost breakdown —
function calcCLT(emp: Employee | Omit<Employee, 'id'>) {
  const sal = emp.base_salary || 0;
  const inss = sal >= 7786.02 ? sal * 0.14 : sal * 0.12; // simplified
  const fgts = sal * 0.08;
  const ferias = sal / 12;
  const decimoTerceiro = sal / 12;
  const totalEmployer = sal + fgts + ferias + decimoTerceiro;
  const totalBenefits = (emp.transport_voucher || 0) + (emp.meal_voucher || 0) + (emp.health_plan || 0);
  const totalMonthly = totalEmployer + totalBenefits;
  return { sal, inss, fgts, ferias, decimoTerceiro, totalEmployer, totalBenefits, totalMonthly };
}

// ─── Main Component ──────────────────────────────────────────────────────────

type Tab = 'colaboradores' | 'funcionarios';

export default function PessoasPage() {
  const [activeTab, setActiveTab] = useState<Tab>('colaboradores');

  // Meals (for commission calc)
  const [meals, setMeals] = useState<Meal[]>([]);

  // Collaborators
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const [collabForm, setCollabForm] = useState<Omit<Collaborator, 'id'>>(defaultCollab());
  const [editingCollabId, setEditingCollabId] = useState<number | null>(null);
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [expandedCollabId, setExpandedCollabId] = useState<number | null>(null);

  // Employees
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empForm, setEmpForm] = useState<Omit<Employee, 'id'>>(defaultEmployee());
  const [editingEmpId, setEditingEmpId] = useState<number | null>(null);
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [expandedEmpId, setExpandedEmpId] = useState<number | null>(null);

  // Folha de Pagamento modal
  const [folhaEmployee, setFolhaEmployee] = useState<Employee | null>(null);
  const [folhaSaving, setFolhaSaving] = useState(false);
  const [folhaLedger, setFolhaLedger] = useState<Record<string, { ids: number[]; confirmed: boolean; rubricas: Record<string, number>; total: number }>>({});
  const getFolhaKey = (empId: number, comp: string) => `${empId}-${comp}`;

  // Payment history per employee
  const [folhaHistorico, setFolhaHistorico] = useState<Record<number, { groups: any[]; grandTotal: number; count: number } | null>>({});
  const [loadingHistorico, setLoadingHistorico] = useState<Record<number, boolean>>({});

  // Collaborator sales modal
  const [vendaCollabId, setVendaCollabId] = useState<number | null>(null);
  const [vendaData, setVendaData] = useState<any | null>(null);
  const [vendaLoading, setVendaLoading] = useState(false);
  // Modal period filter
  const [vendaFilterMode, setVendaFilterMode] = useState<'dia' | 'mes' | 'ano' | 'tudo'>('mes');
  const [vendaFilterValue, setVendaFilterValue] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  // Modal commission payment
  const [vendaComSending, setVendaComSending] = useState(false);
  // null = idle, number = pending confirmation (expense created, awaiting confirm/cancel), -1 = confirmed
  const [vendaComExpenseId, setVendaComExpenseId] = useState<number | null>(null);
  const vendaComSuccess = vendaComExpenseId === -1;
  // Ledger: persists commission state across modal open/close — key: `${collabId}-${mode}-${value}`
  const [commissionLedger, setCommissionLedger] = useState<Record<string, number>>({});
  const getLedgerKey = (collabId: number, mode: string, value: string) => `${collabId}-${mode}-${value}`;

  // Filter state for colaboradores list
  const [collabSearch, setCollabSearch] = useState('');
  const [collabStatusFilter, setCollabStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const fetchFolhaHistorico = async (empId: number) => {
    setLoadingHistorico(prev => ({ ...prev, [empId]: true }));
    try {
      const res = await fetch(`/api/funcionarios/${empId}/folha-historico`, { cache: 'no-store' });
      const data = await res.json();
      setFolhaHistorico(prev => ({ ...prev, [empId]: data }));
    } catch {
      setFolhaHistorico(prev => ({ ...prev, [empId]: null }));
    } finally {
      setLoadingHistorico(prev => ({ ...prev, [empId]: false }));
    }
  };

  const doFetchVenda = async (collabId: number, mode: string, value: string) => {
    setVendaData(null);
    setVendaLoading(true);
    // Restore commission state from ledger (persists across modal open/close)
    setVendaComExpenseId(prev => {
      const key = getLedgerKey(collabId, mode, value);
      const ledgerVal = commissionLedger[key];
      return ledgerVal !== undefined ? ledgerVal : null;
    });
    try {
      const periodo = mode === 'tudo' ? '' : value;
      const qs = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
      const res = await fetch(`/api/colaboradores/${collabId}/vendas${qs}`, { cache: 'no-store' });
      const data = await res.json();
      setVendaData(data);
    } catch { setVendaData(null); }
    setVendaLoading(false);
  };

  const fetchVendaCollab = (collabId: number) => {
    setVendaCollabId(collabId);
    doFetchVenda(collabId, vendaFilterMode, vendaFilterValue);
  };

  const handleVendaFilterMode = (mode: 'dia' | 'mes' | 'ano' | 'tudo') => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    let val = vendaFilterValue;
    if (mode === 'dia') val = today;
    else if (mode === 'mes') val = today.substring(0, 7);
    else if (mode === 'ano') val = String(now.getFullYear());
    else val = '';
    setVendaFilterMode(mode);
    setVendaFilterValue(val);
    if (vendaCollabId !== null) doFetchVenda(vendaCollabId, mode, val);
  };

  const handleVendaFilterValue = (val: string) => {
    setVendaFilterValue(val);
    if (vendaCollabId !== null) doFetchVenda(vendaCollabId, vendaFilterMode, val);
  };

  const sendModalCommission = async () => {
    if (!vendaData || vendaCollabId === null) return;
    const commission = vendaData.summary?.totalCommission || 0;
    if (commission <= 0) return;
    setVendaComSending(true);
    try {
      const periodLabel =
        vendaFilterMode === 'tudo' ? 'Histórico completo' :
        vendaFilterMode === 'dia'  ? vendaFilterValue :
        vendaFilterMode === 'mes'  ? (() => { const [y,m] = vendaFilterValue.split('-'); return `${m}/${y}`; })() :
        vendaFilterValue;
      const res = await fetch('/api/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Comissão — ${vendaData.collaborator.name} (${periodLabel})`,
          category: 'Mão de Obra',
          value: parseFloat(commission.toFixed(2)),
          period: 'Variável',
        }),
      });
      const data = await res.json();
      const expId: number = data.id ?? -1;
      // Store in ledger so state persists when modal closes/reopens
      const key = getLedgerKey(vendaCollabId, vendaFilterMode, vendaFilterValue);
      setCommissionLedger(prev => ({ ...prev, [key]: expId }));
      setVendaComExpenseId(expId);
    } catch (e) { console.error(e); }
    setVendaComSending(false);
  };

  const cancelModalCommission = async () => {
    if (vendaCollabId === null) return;
    const key = getLedgerKey(vendaCollabId, vendaFilterMode, vendaFilterValue);
    // If there's a real expense ID (not -1 = confirmed), delete it from the DB
    if (vendaComExpenseId && vendaComExpenseId !== -1) {
      try { await fetch(`/api/despesas/${vendaComExpenseId}`, { method: 'DELETE' }); }
      catch (e) { console.error(e); }
    }
    // Remove from ledger and reset state
    setCommissionLedger(prev => { const n = { ...prev }; delete n[key]; return n; });
    setVendaComExpenseId(null);
  };

  const confirmModalCommission = () => {
    if (vendaCollabId === null) return;
    const key = getLedgerKey(vendaCollabId, vendaFilterMode, vendaFilterValue);
    // Record as confirmed (-1) in the ledger
    setCommissionLedger(prev => ({ ...prev, [key]: -1 }));
    setVendaComExpenseId(-1);
  };

  const now = new Date();
  const defaultCompetencia = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const [folhaForm, setFolhaForm] = useState({
    competencia: defaultCompetencia,
    salario: '',
    horas_extras: '',
    decimo_terceiro: '',
    ferias: '',
    vale_transporte: '',
    cesta_basica: '',
    plano_saude: '',
    auxilio_familia: '',
    vale_alimentacao: '',
  });

  const openFolha = (emp: Employee) => {
    setFolhaEmployee(emp);
    setFolhaForm({
      competencia: defaultCompetencia,
      salario: emp.base_salary > 0 ? emp.base_salary.toFixed(2) : '',
      horas_extras: '',
      decimo_terceiro: '',
      ferias: '',
      vale_transporte: emp.transport_voucher > 0 ? emp.transport_voucher.toFixed(2) : '',
      cesta_basica: '',
      plano_saude: emp.health_plan > 0 ? emp.health_plan.toFixed(2) : '',
      auxilio_familia: '',
      vale_alimentacao: emp.meal_voucher > 0 ? emp.meal_voucher.toFixed(2) : '',
    });
  };

  const submitFolha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folhaEmployee) return;
    setFolhaSaving(true);
    try {
      const rubricas: Record<string, number> = {};
      for (const [key, val] of Object.entries(folhaForm)) {
        if (key === 'competencia') continue;
        const num = parseFloat(val as string);
        if (!isNaN(num) && num > 0) rubricas[key] = num;
      }
      const res = await fetch('/api/funcionarios/folha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: folhaEmployee.id,
          employee_name: folhaEmployee.name,
          competencia: folhaForm.competencia,
          rubricas,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const ids: number[] = data.inserted || [];
        const rubricas: Record<string, number> = {};
        for (const [key, val] of Object.entries(folhaForm)) {
          if (key === 'competencia') continue;
          const num = parseFloat(val as string);
          if (!isNaN(num) && num > 0) rubricas[key] = num;
        }
        const total = Object.values(rubricas).reduce((a, b) => a + b, 0);
        const key = getFolhaKey(folhaEmployee.id, folhaForm.competencia);
        setFolhaLedger(prev => ({ ...prev, [key]: { ids, confirmed: false, rubricas, total } }));
        setFolhaHistorico(prev => { const n = { ...prev }; delete n[folhaEmployee!.id]; return n; });
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao lançar folha');
      }
    } catch (e) { console.error(e); }
    setFolhaSaving(false);
  };

  const cancelFolha = async () => {
    if (!folhaEmployee) return;
    const key = getFolhaKey(folhaEmployee.id, folhaForm.competencia);
    const entry = folhaLedger[key];
    if (entry && entry.ids.length > 0) {
      try {
        await Promise.all(entry.ids.map(id => fetch(`/api/despesas/${id}`, { method: 'DELETE' })));
      } catch (e) { console.error(e); }
    }
    setFolhaLedger(prev => { const n = { ...prev }; delete n[key]; return n; });
    setFolhaHistorico(prev => { const n = { ...prev }; delete n[folhaEmployee!.id]; return n; });
  };

  const confirmFolha = () => {
    if (!folhaEmployee) return;
    const key = getFolhaKey(folhaEmployee.id, folhaForm.competencia);
    setFolhaLedger(prev => ({ ...prev, [key]: { ...prev[key], confirmed: true } }));
  };

  const [loading, setLoading] = useState(true);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, cRes, eRes] = await Promise.all([
        fetch('/api/cardapio', { cache: 'no-store' }),
        fetch('/api/colaboradores', { cache: 'no-store' }),
        fetch('/api/funcionarios', { cache: 'no-store' }),
      ]);
      const mData = await mRes.json();
      const cData = await cRes.json();
      const eData = await eRes.json();
      setMeals(Array.isArray(mData) ? mData : []);
      setCollabs(Array.isArray(cData) ? cData : []);
      setEmployees(Array.isArray(eData) ? eData : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Collaborator CRUD ────────────────────────────────────────────────────────

  const saveCollab = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingCollabId ? `/api/colaboradores/${editingCollabId}` : '/api/colaboradores';
    const method = editingCollabId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collabForm),
    });
    if (res.ok) {
      setShowCollabForm(false);
      setEditingCollabId(null);
      setCollabForm(defaultCollab());
      fetchAll();
    } else {
      const err = await res.json();
      alert(err.error || 'Erro ao salvar colaborador');
    }
  };

  const editCollab = (c: Collaborator) => {
    setCollabForm({ name: c.name, role: c.role, contact: c.contact || '', cpf: c.cpf || '', cnpj: c.cnpj || '', commission_type: c.commission_type, commission_percent: c.commission_percent, allowed_meals: c.allowed_meals || null, active: c.active, notes: c.notes || '' });
    setEditingCollabId(c.id);
    setShowCollabForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteCollab = async (id: number) => {
    if (!confirm('Excluir este colaborador?')) return;
    await fetch(`/api/colaboradores/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  // ── Employee CRUD ────────────────────────────────────────────────────────────

  const saveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingEmpId ? `/api/funcionarios/${editingEmpId}` : '/api/funcionarios';
    const method = editingEmpId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(empForm),
    });
    if (res.ok) {
      setShowEmpForm(false);
      setEditingEmpId(null);
      setEmpForm(defaultEmployee());
      fetchAll();
    } else {
      const err = await res.json();
      alert(err.error || 'Erro ao salvar funcionário');
    }
  };

  const editEmployee = (emp: Employee) => {
    setEmpForm({
      name: emp.name, role: emp.role, cpf: emp.cpf || '', rg: emp.rg || '', pis: emp.pis || '',
      ctps_number: emp.ctps_number || '', ctps_serie: emp.ctps_serie || '',
      admission_date: emp.admission_date || '', dismissal_date: emp.dismissal_date || '',
      base_salary: emp.base_salary, transport_voucher: emp.transport_voucher,
      meal_voucher: emp.meal_voucher, health_plan: emp.health_plan,
      work_schedule: emp.work_schedule || '08:00-17:00',
      bank: emp.bank || '', bank_agency: emp.bank_agency || '', bank_account: emp.bank_account || '',
      bank_pix: emp.bank_pix || '', emergency_contact_name: emp.emergency_contact_name || '',
      emergency_contact_phone: emp.emergency_contact_phone || '', address: emp.address || '',
      status: emp.status, notes: emp.notes || '',
    });
    setEditingEmpId(emp.id);
    setShowEmpForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteEmployee = async (id: number) => {
    if (!confirm('Excluir este funcionário?')) return;
    await fetch(`/api/funcionarios/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  // ── Filter state ──────────────────────────────────────────────────────────────

  const filteredCollabs = collabs.filter(c => {
    const q = collabSearch.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q);
    const matchStatus =
      collabStatusFilter === 'all' ||
      (collabStatusFilter === 'active' ? c.active === 1 : c.active === 0);
    return matchSearch && matchStatus;
  });

  // ── Summary Stats ────────────────────────────────────────────────────────────

  const activeCollabs = collabs.filter(c => c.active);
  const activeEmployees = employees.filter(e => e.status === 'Ativo');

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-fade-in max-w-[1600px] mx-auto">

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">
            Equipe &amp; Pessoas
          </h1>
          <p className="text-muted text-lg">
            Gestão de <span className="text-violet-400 font-bold">colaboradores</span> comissionados e{' '}
            <span className="text-cyan-400 font-bold">funcionários</span> CLT.
          </p>
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <SummaryCard icon={Users} color="violet" label="Colaboradores Ativos" value={activeCollabs.length.toString()} />
        <SummaryCard icon={Briefcase} color="cyan" label="Funcionários CLT" value={activeEmployees.length.toString()} />
        <SummaryCard icon={TrendingUp} color="amber" label="Total na Equipe" value={(collabs.length + employees.length).toString()} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <TabBtn active={activeTab === 'colaboradores'} onClick={() => setActiveTab('colaboradores')} icon={Percent} color="violet">
          Colaboradores ({collabs.length})
        </TabBtn>
        <TabBtn active={activeTab === 'funcionarios'} onClick={() => setActiveTab('funcionarios')} icon={Shield} color="cyan">
          Funcionários CLT ({employees.length})
        </TabBtn>
      </div>

      {loading ? (
        <div className="glass-panel p-16 text-center text-muted">Carregando...</div>
      ) : (
        <>
          {/* ══════════════ COLABORADORES ══════════════ */}
          {activeTab === 'colaboradores' && (
            <div className="space-y-6">

              {/* Add/Edit form */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (showCollabForm) { setShowCollabForm(false); setEditingCollabId(null); setCollabForm(defaultCollab()); }
                    else setShowCollabForm(true);
                  }}
                  className="btn btn-primary"
                >
                  {showCollabForm ? <><X className="w-4 h-4 mr-2" />Cancelar</> : <><Plus className="w-4 h-4 mr-2" />Novo Colaborador</>}
                </button>
              </div>

              {showCollabForm && (
                <div className="glass-panel p-8 border-violet-500/20 bg-violet-500/5 animate-fade-in">
                  <h2 className="text-lg font-black text-violet-300 mb-6 uppercase tracking-widest flex items-center gap-2">
                    <Percent className="w-5 h-5" />
                    {editingCollabId ? 'Editar Colaborador' : 'Cadastrar Colaborador'}
                  </h2>
                  <form onSubmit={saveCollab} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <Field label="Nome *">
                      <input className="input" required value={collabForm.name} onChange={e => setCollabForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: João Silva" />
                    </Field>
                    <Field label="Função / Cargo">
                      <input className="input" value={collabForm.role} onChange={e => setCollabForm(p => ({ ...p, role: e.target.value }))} placeholder="Ex: Vendedor" />
                    </Field>
                    <Field label="Contato (Telefone / Email)">
                      <input className="input" value={collabForm.contact || ''} onChange={e => setCollabForm(p => ({ ...p, contact: e.target.value }))} placeholder="(85) 99999-9999" />
                    </Field>
                    <Field label="CPF">
                      <input className="input" value={collabForm.cpf || ''} onChange={e => setCollabForm(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" />
                    </Field>
                    <Field label="CNPJ">
                      <input className="input" value={collabForm.cnpj || ''} onChange={e => setCollabForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
                    </Field>

                    {/* Commission settings */}
                    <Field label="Base do Cálculo de Comissão">
                      <select className="input" value={collabForm.commission_type} onChange={e => setCollabForm(p => ({ ...p, commission_type: e.target.value as any }))}>
                        <option value="total">Valor Total da Venda</option>
                        <option value="net">Valor Líquido (após taxas)</option>
                        <option value="profit">Lucro Líquido</option>
                      </select>
                    </Field>
                    <Field label="Percentual de Comissão (%)">
                      <div className="relative">
                        <input
                          type="number" step="0.01" min="0" max="100" className="input pr-10"
                          value={collabForm.commission_percent}
                          onChange={e => setCollabForm(p => ({ ...p, commission_percent: parseFloat(e.target.value) || 0 }))}
                        />
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      </div>
                    </Field>
                    <Field label="Status">
                      <select className="input" value={collabForm.active} onChange={e => setCollabForm(p => ({ ...p, active: parseInt(e.target.value) }))}>
                        <option value={1}>Ativo</option>
                        <option value={0}>Inativo</option>
                      </select>
                    </Field>

                    {/* Itens do cardápio permitidos */}
                    <div className="md:col-span-2 lg:col-span-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                            <Utensils className="w-3.5 h-3.5" />
                            Itens do Cardápio que este Colaborador trabalha
                          </label>
                          {(() => {
                            const allowed: number[] = (() => { try { return JSON.parse(collabForm.allowed_meals || '[]'); } catch { return []; } })();
                            return allowed.length > 0 ? (
                              <button type="button" onClick={() => setCollabForm(p => ({ ...p, allowed_meals: null }))}
                                className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors font-bold flex items-center gap-1">
                                <X className="w-3 h-3" /> Limpar seleção
                              </button>
                            ) : null;
                          })()}
                        </div>
                        {meals.length === 0 ? (
                          <p className="text-xs text-muted italic px-1">Nenhum prato cadastrado no cardápio ainda.</p>
                        ) : (
                          <>
                            <p className="text-[11px] text-slate-500">Deixe todos desmarcados para permitir todos os itens.</p>
                            <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                              {meals.map((m, idx) => {
                                const allowed: number[] = (() => { try { return JSON.parse(collabForm.allowed_meals || '[]'); } catch { return []; } })();
                                const checked = allowed.includes(m.id);
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      const current: number[] = (() => { try { return JSON.parse(collabForm.allowed_meals || '[]'); } catch { return []; } })();
                                      const next = checked ? current.filter(id => id !== m.id) : [...current, m.id];
                                      setCollabForm(p => ({ ...p, allowed_meals: next.length > 0 ? JSON.stringify(next) : null }));
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 transition-all text-left ${checked ? 'bg-violet-500/10' : idx % 2 === 0 ? 'bg-white/0 hover:bg-white/3' : 'bg-white/2 hover:bg-white/5'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-violet-500 border-violet-500' : 'border-white/20'}`}>
                                        {checked && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <span className={`text-sm font-bold transition-colors ${checked ? 'text-white' : 'text-slate-400'}`}>{m.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <span className="text-xs text-muted font-bold">R$ {m.sale_price.toFixed(2)}</span>
                                      {checked && (
                                        <span className="text-[10px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                                          Selecionado
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            {(() => {
                              const allowed: number[] = (() => { try { return JSON.parse(collabForm.allowed_meals || '[]'); } catch { return []; } })();
                              return allowed.length > 0 ? (
                                <p className="text-[11px] text-violet-400 font-bold px-1">
                                  {allowed.length} de {meals.length} item(ns) selecionado(s)
                                </p>
                              ) : (
                                <p className="text-[11px] text-emerald-400/70 font-bold px-1">Todos os itens permitidos</p>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2 lg:col-span-3">
                      <Field label="Observações">
                        <textarea className="input min-h-[80px] resize-none" value={collabForm.notes || ''} onChange={e => setCollabForm(p => ({ ...p, notes: e.target.value }))} placeholder="Informações adicionais..." />
                      </Field>
                    </div>
                    <div className="lg:col-span-3 flex justify-end">
                      <button type="submit" className="btn btn-primary px-10">
                        <Save className="w-4 h-4 mr-2" /> Salvar Colaborador
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── Filter bar ── */}
              {collabs.length > 0 && (
                <div className="glass-panel p-4 border-violet-500/15 bg-violet-500/3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                      <input
                        className="input pl-9 w-full"
                        placeholder="Buscar por nome ou cargo..."
                        value={collabSearch}
                        onChange={e => setCollabSearch(e.target.value)}
                      />
                      {collabSearch && (
                        <button onClick={() => setCollabSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {/* Status filter */}
                    <div className="flex gap-1.5 shrink-0">
                      {(['all', 'active', 'inactive'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setCollabStatusFilter(s)}
                          className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                            collabStatusFilter === s
                              ? s === 'all'    ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                              : s === 'active' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                               : 'bg-slate-500/20 border-slate-500/40 text-slate-300'
                              : 'bg-white/3 border-white/10 text-muted hover:border-white/20'
                          }`}
                        >
                          {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : 'Inativos'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(collabSearch || collabStatusFilter !== 'all') && (
                    <p className="text-[11px] text-violet-400/70 font-bold mt-2 pl-1">
                      {filteredCollabs.length} de {collabs.length} colaborador(es)
                    </p>
                  )}
                </div>
              )}

              {/* Collaborators list */}
              {collabs.length === 0 ? (
                <div className="glass-panel p-16 text-center text-muted italic">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  Nenhum colaborador cadastrado.
                </div>
              ) : filteredCollabs.length === 0 ? (
                <div className="glass-panel p-12 text-center text-muted italic">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  Nenhum colaborador encontrado com os filtros aplicados.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCollabs.map(c => {
                    const isExpanded = expandedCollabId === c.id;
                    return (
                      <div key={c.id} className={`glass-panel border transition-all ${isExpanded ? 'border-violet-500/30' : 'border-white/5 hover:border-white/15'}`}>
                        {/* Row */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                              <span className="text-xl font-black text-violet-400">{c.name[0].toUpperCase()}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-white">{c.name}</span>
                                {c.active ? (
                                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Ativo
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black text-slate-400 bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> Inativo
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted font-bold uppercase tracking-wider mt-0.5">{c.role}</p>
                              {c.contact && <p className="text-xs text-slate-500 mt-1">{c.contact}</p>}
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-[10px] text-muted font-bold uppercase">Base</p>
                              <span className={`text-xs font-black px-2 py-1 rounded-lg border ${COMMISSION_COLORS[c.commission_type]}`}>
                                {COMMISSION_LABELS[c.commission_type]}
                              </span>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-muted font-bold uppercase">Comissão</p>
                              <p className="text-2xl font-black text-violet-400">{c.commission_percent}%</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setExpandedCollabId(isExpanded ? null : c.id)} className="btn bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 text-violet-300 text-xs px-3">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => fetchVendaCollab(c.id)}
                                className="p-2.5 hover:bg-emerald-500/10 rounded-xl text-emerald-400 transition-colors"
                                title="Ver Vendas e Comissões"
                              >
                                <BarChart2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => editCollab(c)} className="p-2.5 hover:bg-white/5 rounded-xl text-primary transition-colors">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button onClick={() => deleteCollab(c.id)} className="p-2.5 hover:bg-danger/10 rounded-xl text-danger transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Commission table preview */}
                        {isExpanded && (
                          <div className="px-6 pb-6 border-t border-white/5 pt-5 animate-fade-in">
                            {/* Info badges */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {c.cpf && <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-slate-400">CPF: {c.cpf}</span>}
                              {c.cnpj && <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-slate-400">CNPJ: {c.cnpj}</span>}
                              {(() => {
                                const allowed: number[] = (() => { try { return JSON.parse(c.allowed_meals || '[]'); } catch { return []; } })();
                                const allowedMeals = allowed.length > 0 ? meals.filter(m => allowed.includes(m.id)) : [];
                                return allowedMeals.length > 0 ? allowedMeals.map(m => (
                                  <span key={m.id} className="text-[10px] font-bold bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-lg text-violet-300 flex items-center gap-1">
                                    <Utensils className="w-2.5 h-2.5" /> {m.name}
                                  </span>
                                )) : (
                                  <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-400">Todos os itens</span>
                                );
                              })()}
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-violet-400 mb-4 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" /> Projeção de Comissão por Prato do Cardápio
                            </h4>
                            {meals.length === 0 ? (
                              <p className="text-muted text-sm italic text-center py-6 border border-dashed border-white/10 rounded-2xl">
                                Nenhum prato no cardápio cadastrado.
                              </p>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-white/5">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-white/10 bg-white/3">
                                      <th className="text-left py-3 px-4 text-muted font-bold uppercase tracking-wider">Prato</th>
                                      <th className="text-right py-3 px-4 text-muted font-bold uppercase tracking-wider">Preço Venda</th>
                                      <th className="text-right py-3 px-4 text-muted font-bold uppercase tracking-wider">Val. Líquido</th>
                                      <th className="text-right py-3 px-4 text-muted font-bold uppercase tracking-wider">Lucro</th>
                                      <th className="text-right py-3 px-4 text-violet-400 font-bold uppercase tracking-wider">Base ({COMMISSION_LABELS[c.commission_type]})</th>
                                      <th className="text-right py-3 px-4 text-violet-400 font-bold uppercase tracking-wider">Comissão ({c.commission_percent}%)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(() => {
                                      const allowed: number[] = (() => { try { return JSON.parse(c.allowed_meals || '[]'); } catch { return []; } })();
                                      return meals
                                        .filter(m => allowed.length === 0 || allowed.includes(m.id))
                                        .map(m => {
                                          const vals = calcMealValues(m);
                                          const base = getCommissionBase(m, c.commission_type);
                                          const commission = (base * c.commission_percent) / 100;
                                          return (
                                            <tr key={m.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                              <td className="py-2.5 px-4 font-bold text-slate-200">{m.name}</td>
                                              <td className="py-2.5 px-4 text-right text-slate-300">R$ {vals.total.toFixed(2)}</td>
                                              <td className="py-2.5 px-4 text-right text-amber-300">R$ {vals.net.toFixed(2)}</td>
                                              <td className={`py-2.5 px-4 text-right font-bold ${vals.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>R$ {vals.profit.toFixed(2)}</td>
                                              <td className="py-2.5 px-4 text-right text-violet-300 font-bold">R$ {base.toFixed(2)}</td>
                                              <td className="py-2.5 px-4 text-right font-black text-white">R$ {commission.toFixed(2)}</td>
                                            </tr>
                                          );
                                        });
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {c.notes && (
                              <div className="mt-4 bg-white/3 border border-white/10 rounded-xl p-4">
                                <p className="text-xs text-muted italic">{c.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}


            </div>
          )}

          {/* ══════════════ FUNCIONÁRIOS CLT ══════════════ */}
          {activeTab === 'funcionarios' && (
            <div className="space-y-6">

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (showEmpForm) { setShowEmpForm(false); setEditingEmpId(null); setEmpForm(defaultEmployee()); }
                    else setShowEmpForm(true);
                  }}
                  className="btn btn-primary"
                >
                  {showEmpForm ? <><X className="w-4 h-4 mr-2" />Cancelar</> : <><Plus className="w-4 h-4 mr-2" />Novo Funcionário CLT</>}
                </button>
              </div>

              {showEmpForm && (
                <div className="glass-panel p-8 border-cyan-500/20 bg-cyan-500/5 animate-fade-in">
                  <h2 className="text-lg font-black text-cyan-300 mb-6 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    {editingEmpId ? 'Editar Funcionário' : 'Cadastrar Funcionário CLT'}
                  </h2>

                  <form onSubmit={saveEmployee} className="space-y-8">
                    {/* Section: Dados Pessoais */}
                    <FormSection title="Dados Pessoais" icon={Users} color="cyan">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <Field label="Nome Completo *">
                          <input className="input" required value={empForm.name} onChange={e => setEmpForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do funcionário" />
                        </Field>
                        <Field label="Cargo / Função">
                          <input className="input" value={empForm.role} onChange={e => setEmpForm(p => ({ ...p, role: e.target.value }))} placeholder="Ex: Cozinheiro" />
                        </Field>
                        <Field label="Status">
                          <select className="input" value={empForm.status} onChange={e => setEmpForm(p => ({ ...p, status: e.target.value }))}>
                            <option value="Ativo">Ativo</option>
                            <option value="Férias">Férias</option>
                            <option value="Afastado">Afastado</option>
                            <option value="Demitido">Demitido</option>
                          </select>
                        </Field>
                        <Field label="CPF"><input className="input" value={empForm.cpf || ''} onChange={e => setEmpForm(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" /></Field>
                        <Field label="RG"><input className="input" value={empForm.rg || ''} onChange={e => setEmpForm(p => ({ ...p, rg: e.target.value }))} placeholder="0000000" /></Field>
                        <Field label="PIS / PASEP"><input className="input" value={empForm.pis || ''} onChange={e => setEmpForm(p => ({ ...p, pis: e.target.value }))} placeholder="000.00000.00-0" /></Field>
                        <Field label="N° CTPS"><input className="input" value={empForm.ctps_number || ''} onChange={e => setEmpForm(p => ({ ...p, ctps_number: e.target.value }))} placeholder="Número da CTPS" /></Field>
                        <Field label="Série CTPS"><input className="input" value={empForm.ctps_serie || ''} onChange={e => setEmpForm(p => ({ ...p, ctps_serie: e.target.value }))} placeholder="Ex: 001" /></Field>
                      </div>
                    </FormSection>

                    {/* Section: Contrato */}
                    <FormSection title="Contrato e Remuneração" icon={FileText} color="emerald">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <Field label="Data de Admissão"><input type="date" className="input" value={empForm.admission_date || ''} onChange={e => setEmpForm(p => ({ ...p, admission_date: e.target.value }))} /></Field>
                        <Field label="Data de Demissão"><input type="date" className="input" value={empForm.dismissal_date || ''} onChange={e => setEmpForm(p => ({ ...p, dismissal_date: e.target.value }))} /></Field>
                        <Field label="Salário Base (R$)">
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">R$</span>
                            <input type="number" step="0.01" min="0" className="input pl-12" value={empForm.base_salary} onChange={e => setEmpForm(p => ({ ...p, base_salary: parseFloat(e.target.value) || 0 }))} />
                          </div>
                        </Field>
                        <Field label="Vale-Transporte (R$/mês)">
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">R$</span>
                            <input type="number" step="0.01" min="0" className="input pl-12" value={empForm.transport_voucher} onChange={e => setEmpForm(p => ({ ...p, transport_voucher: parseFloat(e.target.value) || 0 }))} />
                          </div>
                        </Field>
                        <Field label="Vale-Refeição (R$/mês)">
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">R$</span>
                            <input type="number" step="0.01" min="0" className="input pl-12" value={empForm.meal_voucher} onChange={e => setEmpForm(p => ({ ...p, meal_voucher: parseFloat(e.target.value) || 0 }))} />
                          </div>
                        </Field>
                        <Field label="Plano de Saúde (R$/mês)">
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">R$</span>
                            <input type="number" step="0.01" min="0" className="input pl-12" value={empForm.health_plan} onChange={e => setEmpForm(p => ({ ...p, health_plan: parseFloat(e.target.value) || 0 }))} />
                          </div>
                        </Field>
                      </div>
                    </FormSection>

                    {/* Section: Dados Bancários */}
                    <FormSection title="Dados Bancários" icon={CreditCard} color="amber">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <Field label="Banco"><input className="input" value={empForm.bank || ''} onChange={e => setEmpForm(p => ({ ...p, bank: e.target.value }))} placeholder="Ex: Caixa Econômica" /></Field>
                        <Field label="Agência"><input className="input" value={empForm.bank_agency || ''} onChange={e => setEmpForm(p => ({ ...p, bank_agency: e.target.value }))} placeholder="0000-0" /></Field>
                        <Field label="Conta"><input className="input" value={empForm.bank_account || ''} onChange={e => setEmpForm(p => ({ ...p, bank_account: e.target.value }))} placeholder="000000-0" /></Field>
                        <Field label="Chave PIX"><input className="input" value={empForm.bank_pix || ''} onChange={e => setEmpForm(p => ({ ...p, bank_pix: e.target.value }))} placeholder="CPF, e-mail, telefone..." /></Field>
                      </div>
                    </FormSection>

                    {/* Section: Contato Emergência */}
                    <FormSection title="Contato de Emergência e Endereço" icon={Heart} color="rose">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Nome do Contato"><input className="input" value={empForm.emergency_contact_name || ''} onChange={e => setEmpForm(p => ({ ...p, emergency_contact_name: e.target.value }))} placeholder="Nome familiar" /></Field>
                        <Field label="Telefone de Emergência"><input className="input" value={empForm.emergency_contact_phone || ''} onChange={e => setEmpForm(p => ({ ...p, emergency_contact_phone: e.target.value }))} placeholder="(85) 99999-9999" /></Field>
                        <div className="md:col-span-2">
                          <Field label="Endereço Completo">
                            <input className="input" value={empForm.address || ''} onChange={e => setEmpForm(p => ({ ...p, address: e.target.value }))} placeholder="Rua, número, bairro, cidade, CEP" />
                          </Field>
                        </div>
                      </div>
                    </FormSection>

                    <Field label="Observações Gerais">
                      <textarea className="input min-h-[80px] resize-none" value={empForm.notes || ''} onChange={e => setEmpForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observações, advertências, elogios..." />
                    </Field>

                    <div className="flex justify-end">
                      <button type="submit" className="btn btn-primary px-10">
                        <Save className="w-4 h-4 mr-2" /> Salvar Funcionário
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Employee list */}
              {employees.length === 0 ? (
                <div className="glass-panel p-16 text-center text-muted italic">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  Nenhum funcionário CLT cadastrado.
                </div>
              ) : (
                <div className="space-y-4">
                  {employees.map(emp => {
                    const isExpanded = expandedEmpId === emp.id;
                    const clt = calcCLT(emp);
                    const statusColors: Record<string, string> = {
                      Ativo: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                      Férias: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                      Afastado: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
                      Demitido: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                    };
                    return (
                      <div key={emp.id} className={`glass-panel border transition-all ${isExpanded ? 'border-cyan-500/30' : 'border-white/5 hover:border-white/15'}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                              <span className="text-xl font-black text-cyan-400">{emp.name[0].toUpperCase()}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-lg font-black text-white">{emp.name}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusColors[emp.status] || statusColors['Ativo']}`}>
                                  {emp.status}
                                </span>
                              </div>
                              <p className="text-xs text-muted font-bold uppercase tracking-wider mt-0.5">{emp.role}</p>
                              {emp.admission_date && (
                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Admitido em {new Date(emp.admission_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-[10px] text-muted font-bold uppercase">Salário Base</p>
                              <p className="text-xl font-black text-cyan-400">R$ {emp.base_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const newId = isExpanded ? null : emp.id;
                                  setExpandedEmpId(newId);
                                  if (newId && !folhaHistorico[newId]) fetchFolhaHistorico(newId);
                                }}
                                className="btn bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-300 text-xs px-3"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => openFolha(emp)}
                                className="p-2.5 hover:bg-emerald-500/10 rounded-xl text-emerald-400 transition-colors"
                                title="Lançar Folha de Pagamento"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                              <button onClick={() => editEmployee(emp)} className="p-2.5 hover:bg-white/5 rounded-xl text-primary transition-colors">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button onClick={() => deleteEmployee(emp.id)} className="p-2.5 hover:bg-danger/10 rounded-xl text-danger transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded CLT details */}
                        {isExpanded && (
                          <div className="px-6 pb-6 border-t border-white/5 pt-5 animate-fade-in space-y-4">

                            {/* Documentos + Dados Bancários — sempre lado a lado */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white/3 border border-white/5 rounded-2xl p-5 space-y-3">
                                <h5 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                                  <FileText className="w-3.5 h-3.5" /> Documentos
                                </h5>
                                <DetailRow label="CPF" value={emp.cpf} />
                                <DetailRow label="RG" value={emp.rg} />
                                <DetailRow label="PIS / PASEP" value={emp.pis} />
                                <DetailRow label="CTPS" value={emp.ctps_number ? `${emp.ctps_number} / Série ${emp.ctps_serie || '–'}` : null} />
                              </div>

                              <div className="bg-white/3 border border-white/5 rounded-2xl p-5 space-y-3">
                                <h5 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                                  <CreditCard className="w-3.5 h-3.5" /> Dados Bancários
                                </h5>
                                <DetailRow label="Banco" value={emp.bank} />
                                <DetailRow label="Agência" value={emp.bank_agency} />
                                <DetailRow label="Conta" value={emp.bank_account} />
                                <DetailRow label="PIX" value={emp.bank_pix} />
                              </div>
                            </div>

                            {/* Emergência — linha completa, só se preenchida */}
                            {(emp.emergency_contact_name || emp.address) && (
                              <div className="bg-white/3 border border-white/5 rounded-2xl p-5 space-y-3">
                                <h5 className="text-xs font-black uppercase tracking-widest text-rose-400 flex items-center gap-2">
                                  <Heart className="w-3.5 h-3.5" /> Contato de Emergência
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
                                  <DetailRow label="Contato" value={emp.emergency_contact_name} />
                                  <DetailRow label="Telefone" value={emp.emergency_contact_phone} />
                                  <DetailRow label="Endereço" value={emp.address} />
                                </div>
                              </div>
                            )}

                            {emp.notes && (
                              <div className="bg-white/3 border border-dashed border-white/10 rounded-xl p-4">
                                <p className="text-xs text-muted italic">{emp.notes}</p>
                              </div>
                            )}

                            {/* Histórico de Pagamentos */}
                            <div className="bg-white/3 border border-white/5 rounded-2xl p-5">
                              <h5 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center justify-between mb-4">
                                <span className="flex items-center gap-2">
                                  <Receipt className="w-3.5 h-3.5" /> Histórico de Pagamentos
                                </span>
                                {folhaHistorico[emp.id] && (
                                  <span className="text-slate-500 font-normal normal-case tracking-normal">
                                    {folhaHistorico[emp.id]!.count} lançamento(s) · Total pago: <span className="text-emerald-400 font-bold">R$ {folhaHistorico[emp.id]!.grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </span>
                                )}
                              </h5>

                              {loadingHistorico[emp.id] && (
                                <p className="text-center text-muted text-xs py-4 animate-pulse">Carregando histórico...</p>
                              )}

                              {!loadingHistorico[emp.id] && folhaHistorico[emp.id] && folhaHistorico[emp.id]!.groups.length === 0 && (
                                <p className="text-center text-muted text-xs py-4 italic">Nenhuma folha lançada para este funcionário ainda.</p>
                              )}

                              {!loadingHistorico[emp.id] && folhaHistorico[emp.id] && folhaHistorico[emp.id]!.groups.length > 0 && (
                                <div className="space-y-3">
                                  {folhaHistorico[emp.id]!.groups.map((g, gi) => (
                                    <div key={gi} className="border border-white/8 rounded-xl overflow-hidden">
                                      <div className="bg-white/5 px-4 py-2.5 flex justify-between items-center">
                                        <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">{g.competencia}</span>
                                        <span className="text-sm font-black text-emerald-400">R$ {g.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                      </div>
                                      <div className="px-4 py-2 space-y-1.5">
                                        {g.itens.map((item: any, ii: number) => (
                                          <div key={ii} className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">{item.rubrica}</span>
                                            <span className="text-xs font-bold text-slate-300">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════ MODAL VENDAS DO COLABORADOR ══════════════ */}
      {vendaCollabId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => { setVendaCollabId(null); setVendaData(null); }}
        >
          <div
            className="glass-panel w-full max-w-5xl max-h-[92vh] overflow-y-auto border-emerald-500/30 bg-slate-900/98 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start p-8 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/15 rounded-xl border border-emerald-500/20">
                  <BarChart2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    {vendaData ? vendaData.collaborator?.name : 'Carregando...'}
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    {vendaData ? `${vendaData.collaborator?.role} · ${vendaData.collaborator?.commission_percent}% comissão (${COMMISSION_LABELS[vendaData.collaborator?.commission_type] || ''})` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => { setVendaCollabId(null); setVendaData(null); }} className="p-2 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Period filter bar ── */}
            <div className="px-8 py-4 border-b border-white/5 bg-white/2 flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-black text-muted uppercase tracking-widest shrink-0">Período:</span>
              {/* Mode pills */}
              <div className="flex gap-1">
                {([
                  { id: 'dia',  label: 'Dia' },
                  { id: 'mes',  label: 'Mês' },
                  { id: 'ano',  label: 'Ano' },
                  { id: 'tudo', label: 'Tudo' },
                ] as const).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleVendaFilterMode(id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                      vendaFilterMode === id
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/3 border-white/10 text-muted hover:border-white/20'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Value input */}
              {vendaFilterMode === 'dia' && (
                <input type="date" className="input text-xs h-8 px-3 w-40"
                  value={vendaFilterValue}
                  onChange={e => handleVendaFilterValue(e.target.value)}
                />
              )}
              {vendaFilterMode === 'mes' && (
                <input type="month" className="input text-xs h-8 px-3 w-40"
                  value={vendaFilterValue}
                  onChange={e => handleVendaFilterValue(e.target.value)}
                />
              )}
              {vendaFilterMode === 'ano' && (
                <input type="number" className="input text-xs h-8 px-3 w-24"
                  value={vendaFilterValue}
                  min="2020" max="2099"
                  onChange={e => handleVendaFilterValue(e.target.value)}
                />
              )}
              {vendaLoading && (
                <span className="flex items-center gap-1.5 text-[11px] text-muted ml-auto">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Atualizando...
                </span>
              )}
            </div>

            {vendaLoading && (
              <div className="p-16 text-center text-muted animate-pulse">Carregando dados de vendas...</div>
            )}

            {!vendaLoading && vendaData && (
              <div className="p-8 space-y-8">

                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Lançamentos', value: vendaData.summary.totalSales, color: 'text-white', sub: `${vendaData.summary.totalUnits} un. vendidas` },
                    { label: 'Receita Total', value: `R$ ${(vendaData.summary.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-sky-400', sub: `Lucro: R$ ${(vendaData.summary.totalProfit || 0).toFixed(2)}` },
                    { label: 'Ticket Médio', value: `R$ ${(vendaData.summary.avgTicket || 0).toFixed(2)}`, color: 'text-amber-400', sub: `${(vendaData.summary.avgUnitsPerSale || 0).toFixed(1)} un./lançamento` },
                    { label: 'Comissão Total', value: `R$ ${(vendaData.summary.totalCommission || 0).toFixed(2)}`, color: 'text-violet-400', sub: `Base: R$ ${(vendaData.summary.totalCommissionBase || 0).toFixed(2)}` },
                  ].map((card, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">{card.label}</p>
                      <p className={`text-xl font-black ${card.color}`}>{card.value}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{card.sub}</p>
                    </div>
                  ))}
                </div>

                {vendaData.summary.totalSales === 0 ? (
                  <div className="text-center py-16 text-muted border border-dashed border-white/10 rounded-2xl">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-bold">Nenhuma venda vinculada a este colaborador.</p>
                    <p className="text-sm mt-1">Ao registrar vendas em Lançamentos, selecione este colaborador.</p>
                  </div>
                ) : (
                  <>
                    {/* By Meal table */}
                    {vendaData.byMeal?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-violet-400 mb-3 flex items-center gap-2">
                          <Utensils className="w-4 h-4" /> Vendas por Prato
                        </h3>
                        <div className="overflow-x-auto rounded-xl border border-white/5">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-white/10 bg-white/3">
                                <th className="text-left py-2.5 px-4 text-muted font-bold uppercase tracking-wider">Prato</th>
                                <th className="text-center py-2.5 px-4 text-muted font-bold uppercase tracking-wider">Lançtos</th>
                                <th className="text-center py-2.5 px-4 text-muted font-bold uppercase tracking-wider">Un.</th>
                                <th className="text-right py-2.5 px-4 text-muted font-bold uppercase tracking-wider">Receita</th>
                                <th className="text-right py-2.5 px-4 text-muted font-bold uppercase tracking-wider">Lucro</th>
                                <th className="text-right py-2.5 px-4 text-violet-400 font-bold uppercase tracking-wider">Comissão</th>
                              </tr>
                            </thead>
                            <tbody>
                              {vendaData.byMeal.map((m: any, i: number) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/3">
                                  <td className="py-2.5 px-4 font-bold text-slate-200">{m.meal_name}</td>
                                  <td className="py-2.5 px-4 text-center text-muted">{m.count}</td>
                                  <td className="py-2.5 px-4 text-center text-slate-300">{m.units}</td>
                                  <td className="py-2.5 px-4 text-right text-sky-300">R$ {m.revenue.toFixed(2)}</td>
                                  <td className={`py-2.5 px-4 text-right font-bold ${m.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>R$ {m.profit.toFixed(2)}</td>
                                  <td className="py-2.5 px-4 text-right font-black text-violet-400">R$ {(m.commission || 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* By Channel + By Month side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* By Channel */}
                      {vendaData.byChannel?.length > 0 && (
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4" /> Por Canal de Venda
                          </h3>
                          <div className="space-y-2">
                            {vendaData.byChannel.map((ch: any, i: number) => {
                              const pct = vendaData.summary.totalRevenue > 0 ? (ch.revenue / vendaData.summary.totalRevenue * 100) : 0;
                              return (
                                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-sm font-black text-white">{ch.channel}</span>
                                    <span className="text-xs font-bold text-amber-400">{pct.toFixed(1)}%</span>
                                  </div>
                                  <div className="h-1.5 bg-white/10 rounded-full mb-2">
                                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                  <div className="flex justify-between text-[10px] text-muted font-bold">
                                    <span>{ch.count} lançtos · {ch.units} un.</span>
                                    <span className="text-sky-300">R$ {ch.revenue.toFixed(2)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* By Month */}
                      {vendaData.byMonth?.length > 0 && (
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Por Mês
                          </h3>
                          <div className="space-y-2">
                            {vendaData.byMonth.slice(0, 6).map((mo: any, i: number) => (
                              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between items-center">
                                <div>
                                  <span className="text-sm font-black text-white">{mo.month}</span>
                                  <p className="text-[10px] text-muted mt-0.5">{mo.count} lançtos · {mo.units} un.</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-sky-300">R$ {mo.revenue.toFixed(2)}</p>
                                  <p className="text-[10px] text-violet-400 font-bold">Comissão: R$ {(mo.commission || 0).toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recent sales */}
                    {vendaData.recentSales?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                          <Award className="w-4 h-4" /> Últimos Lançamentos
                        </h3>
                        <div className="space-y-2">
                          {vendaData.recentSales.slice(0, 10).map((s: any, i: number) => {
                            const margin = s.unit_sale_price > 0 ? (s.unit_profit / s.unit_sale_price) * 100 : 0;
                            const [y, mo, d] = (s.sale_date || '').split('-');
                            return (
                              <div key={i} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-3 hover:bg-white/8">
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${margin >= 30 ? 'bg-emerald-400' : margin >= 15 ? 'bg-amber-400' : 'bg-rose-400'}`} />
                                  <div>
                                    <p className="text-sm font-bold text-slate-200">{s.meal_name}</p>
                                    <p className="text-[10px] text-muted font-bold">{d}/{mo}/{y} · {s.channel} · {s.quantity}x @ R$ {s.unit_sale_price?.toFixed(2)}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-sky-300">R$ {s.total_revenue?.toFixed(2)}</p>
                                  <p className="text-[10px] text-violet-400 font-bold">Comissão: R$ {((s.unit_sale_price || 0) * (s.quantity || 1) * (vendaData.collaborator?.commission_percent || 0) / 100).toFixed(2)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Pagar Comissão ── */}
                {vendaData.summary.totalCommission > 0 && (
                  <div className={`rounded-2xl border p-5 transition-all ${
                    vendaComSuccess
                      ? 'bg-emerald-500/8 border-emerald-500/25'
                      : vendaComExpenseId !== null
                        ? 'bg-amber-500/8 border-amber-500/25'
                        : 'bg-violet-500/5 border-violet-500/20'
                  }`}>

                    {/* ── Estado 3: Confirmado ── */}
                    {vendaComSuccess ? (
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-black text-emerald-300">Lançamento confirmado!</p>
                          <p className="text-xs text-emerald-400/70 mt-0.5">
                            Despesa registrada em <strong>Mão de Obra</strong>. Para refazer, cancele e lance novamente.
                          </p>
                        </div>
                        <button
                          onClick={cancelModalCommission}
                          title="Cancelar lançamento e excluir a despesa"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all shrink-0"
                        >
                          <X className="w-3.5 h-3.5" /> Cancelar Lançamento
                        </button>
                      </div>

                    /* ── Estado 2: Lançado, aguardando confirmação ── */
                    ) : vendaComExpenseId !== null ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-amber-500/20 rounded-xl shrink-0 mt-0.5">
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-black text-amber-300">Despesa criada — aguardando confirmação</p>
                            <p className="text-xs text-amber-400/70 mt-1">
                              Uma despesa de <strong className="text-white">R$ {(vendaData.summary.totalCommission || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> foi registrada.
                              Confirme para mantê-la, ou cancele para excluí-la.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={confirmModalCommission}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Confirmar Lançamento
                          </button>
                          <button
                            onClick={cancelModalCommission}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                          >
                            <X className="w-4 h-4" /> Cancelar e Excluir
                          </button>
                        </div>
                      </div>

                    /* ── Estado 1: Idle ── */
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                          <p className="text-xs font-black text-violet-300 uppercase tracking-widest mb-1">Pagar Comissão do Período</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-white">
                              R$ {(vendaData.summary.totalCommission || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-muted">
                              ({vendaData.collaborator?.commission_percent}% sobre{' '}
                              R$ {(vendaData.summary.totalCommissionBase || 0).toFixed(2)})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Será criada uma despesa na categoria <strong>Mão de Obra</strong>
                          </p>
                        </div>
                        <button
                          onClick={sendModalCommission}
                          disabled={vendaComSending}
                          className="btn btn-primary px-6 shrink-0 disabled:opacity-50 flex items-center gap-2"
                        >
                          {vendaComSending ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Lançando...</>
                          ) : (
                            <><SendToBack className="w-4 h-4" /> Lançar nas Despesas</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ MODAL FOLHA DE PAGAMENTO ══════════════ */}
      {folhaEmployee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => { if (!folhaSaving) setFolhaEmployee(null); }}
        >
          <div
            className="glass-panel w-full max-w-2xl max-h-[92vh] overflow-y-auto border-emerald-500/30 bg-slate-900/98 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start p-8 border-b border-white/5">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-emerald-500/15 rounded-xl border border-emerald-500/20">
                    <Receipt className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-black text-white">Lançar Folha de Pagamento</h2>
                </div>
                <p className="text-sm text-muted ml-12">
                  <span className="text-emerald-400 font-bold">{folhaEmployee.name}</span> — {folhaEmployee.role}
                </p>
              </div>
              <button onClick={() => setFolhaEmployee(null)} className="p-2 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const folhaKey = getFolhaKey(folhaEmployee.id, folhaForm.competencia);
              const folhaEntry = folhaLedger[folhaKey];

              // ── STATE: CONFIRMED (competência encerrada) ──────────────────────
              if (folhaEntry?.confirmed) {
                return (
                  <div className="p-8 space-y-6">
                    <div className="bg-emerald-500/8 border border-emerald-500/25 rounded-2xl p-6 flex items-center gap-4">
                      <div className="w-14 h-14 bg-emerald-500/15 border-2 border-emerald-500/30 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-0.5">Competência Encerrada</p>
                        <p className="text-lg font-black text-white">{folhaForm.competencia}</p>
                        <p className="text-xs text-muted mt-0.5">Folha lançada e confirmada — não pode ser relançada</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-widest text-muted">Rubricas lançadas</p>
                      <div className="space-y-1.5">
                        {Object.entries(folhaEntry.rubricas).map(([key, val]) => {
                          const labels: Record<string, string> = {
                            salario: 'Salário', horas_extras: 'Horas Extras', decimo_terceiro: '13º Salário',
                            ferias: 'Férias + 1/3', vale_transporte: 'Vale Transporte', cesta_basica: 'Cesta Básica',
                            plano_saude: 'Plano de Saúde', auxilio_familia: 'Auxílio Família', vale_alimentacao: 'Vale Alimentação',
                          };
                          return (
                            <div key={key} className="flex justify-between items-center bg-white/3 border border-white/6 rounded-xl px-4 py-2.5">
                              <span className="text-sm text-slate-300">{labels[key] || key}</span>
                              <span className="text-sm font-black text-emerald-400">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between items-center bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3 mt-2">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-300">Total</span>
                        <span className="text-xl font-black text-emerald-400">R$ {folhaEntry.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-between pt-2">
                      <button
                        onClick={() => openFolha(folhaEmployee)}
                        className="btn bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
                      >
                        Lançar Outro Mês
                      </button>
                      <button onClick={() => setFolhaEmployee(null)} className="btn btn-primary">Fechar</button>
                    </div>
                  </div>
                );
              }

              // ── STATE: PENDING CONFIRMATION ───────────────────────────────────
              if (folhaEntry && !folhaEntry.confirmed) {
                return (
                  <div className="p-8 space-y-6">
                    <div className="bg-amber-500/8 border border-amber-500/25 rounded-2xl p-5 flex items-start gap-4">
                      <div className="w-10 h-10 bg-amber-500/15 border border-amber-500/30 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">Aguardando Confirmação</p>
                        <p className="text-sm text-slate-300">
                          A folha de <span className="text-white font-bold">{folhaForm.competencia}</span> foi enviada para Despesas mas ainda não foi confirmada.
                          Confirme para encerrar a competência ou cancele para desfazer.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-widest text-muted">Rubricas enviadas</p>
                      <div className="space-y-1.5">
                        {Object.entries(folhaEntry.rubricas).map(([key, val]) => {
                          const labels: Record<string, string> = {
                            salario: 'Salário', horas_extras: 'Horas Extras', decimo_terceiro: '13º Salário',
                            ferias: 'Férias + 1/3', vale_transporte: 'Vale Transporte', cesta_basica: 'Cesta Básica',
                            plano_saude: 'Plano de Saúde', auxilio_familia: 'Auxílio Família', vale_alimentacao: 'Vale Alimentação',
                          };
                          return (
                            <div key={key} className="flex justify-between items-center bg-white/3 border border-white/6 rounded-xl px-4 py-2.5">
                              <span className="text-sm text-slate-300">{labels[key] || key}</span>
                              <span className="text-sm font-black text-emerald-400">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between items-center bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3 mt-2">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-300">Total</span>
                        <span className="text-xl font-black text-emerald-400">R$ {folhaEntry.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                      <button
                        type="button"
                        onClick={cancelFolha}
                        className="btn bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-sm"
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Cancelar Lançamento
                      </button>
                      <button
                        type="button"
                        onClick={confirmFolha}
                        className="btn bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 px-8"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar e Encerrar
                      </button>
                    </div>
                  </div>
                );
              }

              // ── STATE: IDLE (form) ────────────────────────────────────────────
              return (
                <form onSubmit={submitFolha} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-emerald-400">Competência (Mês/Ano)</label>
                    <input
                      className="input w-48"
                      placeholder="MM/AAAA"
                      value={folhaForm.competencia}
                      onChange={e => setFolhaForm(p => ({ ...p, competencia: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-muted mb-4">
                      Rubricas — deixe em branco as que não se aplicam
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {([
                        { key: 'salario',          label: 'Salário',           dot: 'bg-cyan-400' },
                        { key: 'horas_extras',     label: 'Horas Extras',      dot: 'bg-amber-400' },
                        { key: 'decimo_terceiro',  label: '13º Salário',       dot: 'bg-amber-400' },
                        { key: 'ferias',           label: 'Férias + 1/3',      dot: 'bg-amber-400' },
                        { key: 'vale_transporte',  label: 'Vale Transporte',   dot: 'bg-sky-400' },
                        { key: 'cesta_basica',     label: 'Cesta Básica',      dot: 'bg-sky-400' },
                        { key: 'plano_saude',      label: 'Plano de Saúde',    dot: 'bg-rose-400' },
                        { key: 'auxilio_familia',  label: 'Auxílio Família',   dot: 'bg-violet-400' },
                        { key: 'vale_alimentacao', label: 'Vale Alimentação',  dot: 'bg-emerald-400' },
                      ] as { key: string; label: string; dot: string }[]).map(({ key, label, dot }) => (
                        <div key={key} className="space-y-1">
                          <label className="text-xs font-bold text-muted flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${dot}`} />{label}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">R$</span>
                            <input
                              type="number" step="0.01" min="0"
                              className="input pl-9"
                              placeholder="0,00"
                              value={(folhaForm as any)[key]}
                              onChange={e => setFolhaForm(p => ({ ...p, [key]: e.target.value }))}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const total = Object.entries(folhaForm)
                      .filter(([k]) => k !== 'competencia')
                      .reduce((acc, [, v]) => acc + (parseFloat(v as string) || 0), 0);
                    return total > 0 ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex justify-between items-center">
                        <span className="text-sm font-black text-emerald-300 uppercase tracking-wider">Total a Lançar</span>
                        <span className="text-2xl font-black text-emerald-400">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ) : null;
                  })()}

                  <div className="bg-sky-500/5 border border-sky-500/15 rounded-xl p-4 flex items-start gap-3">
                    <FileText className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-sky-300">
                      Cada rubrica com valor será criada como uma <strong>Despesa</strong> na categoria <strong>Mão de Obra</strong>, identificada com o nome do funcionário e a competência.
                    </p>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button type="button" onClick={() => setFolhaEmployee(null)} className="btn bg-white/5 border border-white/10 hover:bg-white/10">
                      Cancelar
                    </button>
                    <button type="submit" disabled={folhaSaving} className="btn btn-primary px-8 disabled:opacity-50">
                      {folhaSaving ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Lançando...
                        </span>
                      ) : (
                        <><Receipt className="w-4 h-4 mr-2" /> Lançar nas Despesas</>
                      )}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  const colors: Record<string, string> = {
    violet: 'bg-violet-500/15 border-violet-500/20 text-violet-400',
    cyan: 'bg-cyan-500/15 border-cyan-500/20 text-cyan-400',
    emerald: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/15 border-amber-500/20 text-amber-400',
  };
  return (
    <div className="glass-panel p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl border ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-muted font-bold uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, color, children }: any) {
  const colors: Record<string, string> = {
    violet: active ? 'text-violet-400 border-violet-500' : 'text-muted border-transparent hover:text-slate-300',
    cyan: active ? 'text-cyan-400 border-cyan-500' : 'text-muted border-transparent hover:text-slate-300',
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${colors[color]}`}>
      <Icon className="w-4 h-4" /> {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-muted">{label}</label>
      {children}
    </div>
  );
}

function FormSection({ title, icon: Icon, color, children }: any) {
  const colors: Record<string, string> = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
  };
  return (
    <div>
      <h3 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${colors[color]}`}>
        <Icon className="w-4 h-4" /> {title}
      </h3>
      {children}
    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted font-bold flex items-center gap-1">{icon}{label}</span>
      <span className="text-xs text-slate-300 font-medium text-right">{value}</span>
    </div>
  );
}

function CLTRow({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted flex items-center gap-1">{icon}{label}</span>
      <span className={`text-xs font-bold ${color || 'text-slate-300'}`}>R$ {value.toFixed(2)}</span>
    </div>
  );
}
