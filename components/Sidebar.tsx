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
    const id = setInterval(check, 30_000); // every 30s
    return () => clearInterval(id);
  }, []);

  return { status, latency, lastChecked };
}

export default function Sidebar() {
  const pathname = usePathname();
  const { status, latency, lastChecked } = useServerStatus();

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
    <aside className="w-72 fixed h-[calc(100vh-48px)] m-6 z-50 flex flex-col overflow-hidden bg-[#0D1825]/90 backdrop-blur-xl border border-white/8 shadow-2xl rounded-2xl">

      {/* Brand header */}
      <div className="p-7 border-b border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white leading-none">APEX Food</h1>
            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mt-0.5">Sistema de Gestão</p>
          </div>
        </div>
        <div className="h-0.5 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-transparent rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="px-3 flex-1 overflow-y-auto space-y-0.5 py-4 scroll-smooth">
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
          {/* Animated dot + label centered */}
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

      <style jsx>{`
        nav::-webkit-scrollbar { width: 4px; }
        nav::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.15); border-radius: 10px; }
      `}</style>
    </aside>
  );
}
