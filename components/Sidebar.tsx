'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  BookOpen,
  Utensils,
  Banknote,
  HardDrive,
  Tags,
  Package,
  ChefHat,
  Truck,
  UtensilsCrossed,
  TrendingUp,
  ShoppingBag,
  Users,
  Wifi,
  WifiOff,
  AlertTriangle,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  // ── Visão geral ──────────────────────────────────────
  { name: 'Painel Geral',            icon: LayoutDashboard, href: '/' },

  // ── Operação diária ──────────────────────────────────
  { name: 'Vendas',                  icon: ShoppingBag,     href: '/lancamentos' },
  { name: 'Despesas',                icon: Banknote,        href: '/despesas' },

  // ── Cadeia de compras ────────────────────────────────
  { name: 'Lista de Compras',        icon: ShoppingCart,    href: '/compras' },
  { name: 'Fornecedores',            icon: Truck,           href: '/fornecedores' },
  { name: 'Controle de Insumos',     icon: Package,         href: '/insumos' },
  { name: 'Marcas',                  icon: Tags,            href: '/marcas' },

  // ── Cardápio e produção ──────────────────────────────
  { name: 'Fichas Técnicas',         icon: BookOpen,        href: '/fichas' },
  { name: 'Gestão de Cardápio',      icon: Utensils,        href: '/cardapio' },
  { name: 'Precificação',            icon: TrendingUp,      href: '/vendas' },
  { name: 'Talheres e Descartáveis', icon: UtensilsCrossed, href: '/descartaveis' },

  // ── Gestão de equipe e patrimônio ────────────────────
  { name: 'Equipe & Pessoas',        icon: Users,           href: '/pessoas' },
  { name: 'Mobiliário e Ativos',     icon: HardDrive,       href: '/mobiliario' },
];

type ServerStatus = 'online' | 'instability' | 'offline' | 'checking';

function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>('checking');
  const [latency, setLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [failCount, setFailCount] = useState(0);

  const check = async () => {
    const start = performance.now();
    try {
      const res = await fetch('/api/dashboard?period=month', {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      const ms = Math.round(performance.now() - start);
      setLatency(ms);
      setLastChecked(new Date());
      if (!res.ok) {
        setFailCount(prev => prev + 1);
        setStatus('instability');
      } else {
        setFailCount(0);
        setStatus(ms > 2000 ? 'instability' : 'online');
      }
    } catch {
      const ms = Math.round(performance.now() - start);
      setLatency(ms);
      setLastChecked(new Date());
      setFailCount(prev => {
        const next = prev + 1;
        setStatus(next >= 2 ? 'offline' : 'instability');
        return next;
      });
    }
  };

  useEffect(() => {
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, latency, lastChecked };
}

export default function Sidebar() {
  const pathname = usePathname();
  const { status, latency, lastChecked } = useServerStatus();
  const [isOpen, setIsOpen] = useState(false);

  // Close drawer on route change (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const statusConfig = {
    checking: {
      label: 'Verificando...',
      sub: 'aguardando resposta',
      dot: 'bg-slate-500',
      ring: 'ring-slate-500/30',
      text: 'text-slate-400',
      bg: 'bg-slate-500/8 border-slate-500/20',
      icon: Wifi,
      pulse: true,
    },
    online: {
      label: 'Sistema Online',
      sub: latency ? `${latency}ms de latência` : 'operando normalmente',
      dot: 'bg-emerald-400',
      ring: 'ring-emerald-400/30',
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/8 border-emerald-500/20',
      icon: Wifi,
      pulse: false,
    },
    instability: {
      label: 'Instabilidade',
      sub: latency ? `${latency}ms — resposta lenta` : 'possível lentidão',
      dot: 'bg-amber-400',
      ring: 'ring-amber-400/30',
      text: 'text-amber-400',
      bg: 'bg-amber-500/8 border-amber-500/20',
      icon: AlertTriangle,
      pulse: true,
    },
    offline: {
      label: 'Servidor Offline',
      sub: 'sem conexão com o servidor',
      dot: 'bg-red-500',
      ring: 'ring-red-500/30',
      text: 'text-red-400',
      bg: 'bg-red-500/8 border-red-500/20',
      icon: WifiOff,
      pulse: true,
    },
  } as const;

  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  return (
    <>
      {/* ── Mobile top header bar ───────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center px-4 gap-3
                      bg-[#0D1825]/95 backdrop-blur-xl border-b border-white/8 shadow-lg">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/30 shrink-0">
          <ChefHat className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-black text-white leading-none">APEX Food</h1>
          <p className="text-[9px] text-orange-400 font-bold uppercase tracking-widest">Sistema de Gestão</p>
        </div>
        {/* Status dot on mobile header */}
        <div className="ml-auto flex items-center gap-1.5">
          <div className={cn("w-2 h-2 rounded-full", cfg.dot, cfg.pulse && "animate-pulse")} />
          <span className={cn("text-[10px] font-bold hidden sm:block", cfg.text)}>{cfg.label}</span>
        </div>
      </div>

      {/* ── Mobile overlay backdrop ─────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Sidebar / Drawer ────────────────────────────────────────────────── */}
      <aside className={cn(
        "fixed z-50 flex flex-col overflow-hidden shadow-2xl",
        "bg-[#0D1825]/95 backdrop-blur-xl border-white/8",
        "transition-transform duration-300 ease-in-out",

        // Mobile/Tablet: full-height drawer from the left
        "top-0 left-0 h-full w-[280px] border-r rounded-none",

        // Desktop: floating rounded panel with margin
        "lg:top-6 lg:left-6 lg:h-[calc(100vh-3rem)] lg:w-72 lg:rounded-2xl lg:border",

        // Visibility: slide in/out on mobile, always shown on desktop
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
      )}>

        {/* Brand header */}
        <div className="p-6 border-b border-white/5 flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white leading-none">APEX Food</h1>
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mt-0.5">Sistema de Gestão</p>
              </div>
            </div>
            <div className="h-0.5 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-transparent rounded-full" />
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/8 transition-colors shrink-0 mt-1"
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 flex-1 overflow-y-auto space-y-0.5 py-4 scroll-smooth
                        [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-orange-500/15 [&::-webkit-scrollbar-thumb]:rounded-full">
          {menuItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                  active
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-900/30"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/60 rounded-r-full" />}
                <item.icon className={cn(
                  "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  active ? "text-white" : "group-hover:text-orange-400"
                )} />
                <span className="font-semibold text-sm tracking-tight truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Server status widget */}
        <div className="p-4 border-t border-white/5">
          <div className={cn(
            "p-4 rounded-2xl border relative overflow-hidden transition-all duration-500",
            cfg.bg
          )}>
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <div className={cn("w-2.5 h-2.5 rounded-full", cfg.dot, cfg.pulse && "animate-pulse")} />
                {status === 'online' && (
                  <div className={cn("absolute inset-0 rounded-full animate-ping opacity-60", cfg.dot)} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Icon className={cn("w-4 h-4 shrink-0", cfg.text)} />
                <p className={cn("text-sm font-black", cfg.text)}>{cfg.label}</p>
              </div>
              <p className="text-xs text-slate-400">{cfg.sub}</p>
              {lastChecked && (
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  verificado às {lastChecked.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
