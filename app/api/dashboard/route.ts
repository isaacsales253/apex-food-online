import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function toDateFilter(period: string, value: string) {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);
  const currentYear = today.substring(0, 4);

  if (period === 'day') {
    const day = value || today;
    const prev = new Date(day + 'T12:00:00');
    prev.setDate(prev.getDate() - 1);
    const prevDay = prev.toISOString().split('T')[0];
    const nextDay = new Date(day + 'T12:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    return {
      filterPrefix: day,
      prevFilterPrefix: prevDay,
      periodLabel: day,
      filterType: 'day' as const,
      tsStart: `${day}T00:00:00`,
      tsEnd: `${nextDay.toISOString().split('T')[0]}T00:00:00`,
      prevTsStart: `${prevDay}T00:00:00`,
      prevTsEnd: `${day}T00:00:00`,
    };
  } else if (period === 'year') {
    const yr = value || currentYear;
    const prevYr = String(parseInt(yr) - 1);
    return {
      filterPrefix: yr,
      prevFilterPrefix: prevYr,
      periodLabel: yr,
      filterType: 'year' as const,
      tsStart: `${yr}-01-01T00:00:00`,
      tsEnd: `${parseInt(yr) + 1}-01-01T00:00:00`,
      prevTsStart: `${prevYr}-01-01T00:00:00`,
      prevTsEnd: `${yr}-01-01T00:00:00`,
    };
  } else {
    const mo = value || currentMonth;
    const [y, m] = mo.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMo = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const nextDate = new Date(y, m, 1);
    const nextMo = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    return {
      filterPrefix: mo,
      prevFilterPrefix: prevMo,
      periodLabel: mo,
      filterType: 'month' as const,
      tsStart: `${mo}-01T00:00:00`,
      tsEnd: `${nextMo}-01T00:00:00`,
      prevTsStart: `${prevMo}-01T00:00:00`,
      prevTsEnd: `${mo}-01T00:00:00`,
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month';
    const value = searchParams.get('value') || '';
    const today = new Date().toISOString().split('T')[0];

    const { filterPrefix, prevFilterPrefix, periodLabel, tsStart, tsEnd, prevTsStart, prevTsEnd } = toDateFilter(period, value);

    // Parallel queries
    const [
      salesCur, salesPrev, expCur, expPrev, purCur,
      pendingExp, overdueExp,
      stockVal,
      mealsCount, suppliersCount, employeesCount, collabsCount, rmCount,
      trendSales, trendExp, trendPur,
      topMeals, topMealsAll,
      channelCur, channelAll,
      expCatCur, expCatAll,
      topSup,
      stockAlerts, zeroStock,
      recentSales,
      allMeals, allComps, allMCItems, allTSI, allRM, allSheets,
      payrollCur,
    ] = await Promise.all([
      supabase.from('sales').select('total_revenue, total_profit').ilike('sale_date', `${filterPrefix}%`),
      supabase.from('sales').select('total_revenue').ilike('sale_date', `${prevFilterPrefix}%`),
      supabase.from('expenses').select('value').gte('created_at', tsStart).lt('created_at', tsEnd).is('shopping_session_id', null),
      supabase.from('expenses').select('value').gte('created_at', prevTsStart).lt('created_at', prevTsEnd).is('shopping_session_id', null),
      supabase.from('shopping_sessions').select('total_cost').gte('date', tsStart).lt('date', tsEnd),
      supabase.from('expenses').select('value').eq('paid', false).is('shopping_session_id', null),
      supabase.from('expenses').select('id, name, value, due_date, supplier_id').eq('paid', false).not('due_date', 'is', null).lt('due_date', today).is('shopping_session_id', null).order('due_date').limit(10),
      supabase.from('raw_materials').select('stock_quantity, purchase_price').gt('stock_quantity', 0),
      supabase.from('meals').select('id', { count: 'exact', head: true }),
      supabase.from('suppliers').select('id', { count: 'exact', head: true }),
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'Ativo'),
      supabase.from('collaborators').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('raw_materials').select('id', { count: 'exact', head: true }),
      supabase.from('sales').select('sale_date, total_revenue, total_profit').gte('sale_date', new Date(Date.now() - 7 * 30 * 24 * 3600 * 1000).toISOString().split('T')[0]),
      supabase.from('expenses').select('created_at, value').gte('created_at', new Date(Date.now() - 7 * 30 * 24 * 3600 * 1000).toISOString()).is('shopping_session_id', null),
      supabase.from('shopping_sessions').select('date, total_cost').gte('date', new Date(Date.now() - 7 * 30 * 24 * 3600 * 1000).toISOString()),
      supabase.from('sales').select('meal_name, quantity, total_revenue, total_profit').ilike('sale_date', `${filterPrefix}%`),
      supabase.from('sales').select('meal_name, quantity, total_revenue, total_profit'),
      supabase.from('sales').select('channel, total_revenue, total_profit').ilike('sale_date', `${filterPrefix}%`),
      supabase.from('sales').select('channel, total_revenue, total_profit'),
      supabase.from('expenses').select('category, value, paid').gte('created_at', tsStart).lt('created_at', tsEnd).is('shopping_session_id', null),
      supabase.from('expenses').select('category, value, paid').is('shopping_session_id', null),
      supabase.from('shopping_session_items').select('supplier_id, session_id, raw_material_id, total_price').not('supplier_id', 'is', null),
      supabase.from('raw_materials').select('id, name, stock_quantity, min_stock, purchase_unit, purchase_price').gt('min_stock', 0),
      supabase.from('raw_materials').select('id, name, stock_quantity, purchase_unit').lte('stock_quantity', 0).limit(10),
      supabase.from('sales').select('meal_name, quantity, sale_date, total_revenue, total_profit, channel, collaborator_name').order('created_at', { ascending: false }).limit(12),
      supabase.from('meals').select('*'),
      supabase.from('meal_compositions').select('*'),
      supabase.from('menu_component_items').select('*'),
      supabase.from('technical_sheet_ingredients').select('*'),
      supabase.from('raw_materials').select('*'),
      supabase.from('technical_sheets').select('*'),
      supabase.from('expenses').select('value').eq('category', 'Mão de Obra').gte('created_at', tsStart).lt('created_at', tsEnd),
    ]);

    // ── Revenue ───────────────────────────────────────────────────────────────
    const revenue = (salesCur.data || []).reduce((a: number, s: any) => a + (s.total_revenue || 0), 0);
    const profit = (salesCur.data || []).reduce((a: number, s: any) => a + (s.total_profit || 0), 0);
    const salesCount = (salesCur.data || []).length;
    const prevRevenue = (salesPrev.data || []).reduce((a: number, s: any) => a + (s.total_revenue || 0), 0);
    const expensesTotal = (expCur.data || []).reduce((a: number, e: any) => a + (e.value || 0), 0);
    const prevExpenses = (expPrev.data || []).reduce((a: number, e: any) => a + (e.value || 0), 0);
    const purchasesTotal = (purCur.data || []).reduce((a: number, p: any) => a + (p.total_cost || 0), 0);

    const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;
    const expenseGrowth = prevExpenses > 0 ? ((expensesTotal - prevExpenses) / prevExpenses) * 100 : null;

    // ── Pending ───────────────────────────────────────────────────────────────
    const pendingTotal = (pendingExp.data || []).reduce((a: number, e: any) => a + (e.value || 0), 0);
    const pendingCount = (pendingExp.data || []).length;

    // ── Overdue ───────────────────────────────────────────────────────────────
    const overdueExpenses = overdueExp.data || [];
    // Enrich with supplier names
    const supplierIds = [...new Set(overdueExpenses.filter((e: any) => e.supplier_id).map((e: any) => e.supplier_id))];
    let supplierMap: Record<number, string> = {};
    if (supplierIds.length > 0) {
      const { data: sups } = await supabase.from('suppliers').select('id, name').in('id', supplierIds);
      supplierMap = Object.fromEntries((sups || []).map((s: any) => [s.id, s.name]));
    }
    const overdueWithSupplier = overdueExpenses.map((e: any) => ({ ...e, supplier_name: supplierMap[e.supplier_id] || null }));

    // ── Stock value ───────────────────────────────────────────────────────────
    const stockValue = (stockVal.data || []).reduce((a: number, r: any) => a + (r.stock_quantity || 0) * (r.purchase_price || 0), 0);

    // ── Counts ────────────────────────────────────────────────────────────────
    const counts = {
      meals: mealsCount.count || 0,
      suppliers: suppliersCount.count || 0,
      employees: employeesCount.count || 0,
      collaborators: collabsCount.count || 0,
      rawMaterials: rmCount.count || 0,
    };

    // ── Monthly trend ─────────────────────────────────────────────────────────
    const PT_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const revByMonth: Record<string, { revenue: number; profit: number; count: number }> = {};
    for (const s of (trendSales.data || [])) {
      const mo = (s.sale_date || '').substring(0, 7);
      if (!revByMonth[mo]) revByMonth[mo] = { revenue: 0, profit: 0, count: 0 };
      revByMonth[mo].revenue += s.total_revenue || 0;
      revByMonth[mo].profit += s.total_profit || 0;
      revByMonth[mo].count += 1;
    }
    const expByMonth: Record<string, number> = {};
    for (const e of (trendExp.data || [])) {
      const mo = (e.created_at || '').substring(0, 7);
      if (!expByMonth[mo]) expByMonth[mo] = 0;
      expByMonth[mo] += e.value || 0;
    }
    const purByMonth: Record<string, { total: number; count: number }> = {};
    for (const p of (trendPur.data || [])) {
      const mo = (p.date || '').substring(0, 7);
      if (!purByMonth[mo]) purByMonth[mo] = { total: 0, count: 0 };
      purByMonth[mo].total += p.total_cost || 0;
      purByMonth[mo].count += 1;
    }
    const allMonths = [...new Set([...Object.keys(revByMonth), ...Object.keys(expByMonth), ...Object.keys(purByMonth)])].sort();
    const monthlyTrend = allMonths.map(m => {
      const [y, mo] = m.split('-');
      const rev = revByMonth[m]?.revenue || 0;
      const exp = expByMonth[m] || 0;
      const pur = purByMonth[m]?.total || 0;
      return {
        month: m,
        label: `${PT_SHORT[parseInt(mo)-1]}/${y.slice(2)}`,
        revenue: rev, profit: revByMonth[m]?.profit || 0, salesCount: revByMonth[m]?.count || 0,
        expenses: exp, purchases: pur, sessions: purByMonth[m]?.count || 0,
        netResult: rev - exp, cashResult: rev - exp - pur,
      };
    });

    // ── Top meals ─────────────────────────────────────────────────────────────
    const mealAgg = (rows: any[]) => {
      const map: Record<string, any> = {};
      for (const s of rows) {
        if (!map[s.meal_name]) map[s.meal_name] = { name: s.meal_name, quantity: 0, revenue: 0, profit: 0 };
        map[s.meal_name].quantity += s.quantity || 0;
        map[s.meal_name].revenue += s.total_revenue || 0;
        map[s.meal_name].profit += s.total_profit || 0;
      }
      return Object.values(map).sort((a, b) => b.quantity - a.quantity).slice(0, 8);
    };
    const topMealsData = mealAgg(topMeals.data || []);
    const topMealsAllTime = mealAgg(topMealsAll.data || []);

    // ── Sales by channel ──────────────────────────────────────────────────────
    const chanAgg = (rows: any[]) => {
      const map: Record<string, any> = {};
      for (const s of rows) {
        const ch = s.channel || 'Outro';
        if (!map[ch]) map[ch] = { channel: ch, total_revenue: 0, total_profit: 0, count: 0 };
        map[ch].total_revenue += s.total_revenue || 0;
        map[ch].total_profit += s.total_profit || 0;
        map[ch].count += 1;
      }
      return Object.values(map).sort((a, b) => b.total_revenue - a.total_revenue);
    };
    const salesByChannel = chanAgg(channelCur.data || []);
    const salesByChannelAllTime = chanAgg(channelAll.data || []);

    // ── Expenses by category ──────────────────────────────────────────────────
    const catAgg = (rows: any[]) => {
      const map: Record<string, any> = {};
      for (const e of rows) {
        const cat = e.category || 'Outros';
        if (!map[cat]) map[cat] = { category: cat, total: 0, paid: 0, count: 0 };
        map[cat].total += e.value || 0;
        map[cat].paid += e.paid ? (e.value || 0) : 0;
        map[cat].count += 1;
      }
      return Object.values(map).sort((a, b) => b.total - a.total);
    };
    const expByCategory = catAgg(expCatCur.data || []);
    const expByCategoryAllTime = catAgg(expCatAll.data || []);

    // ── Top suppliers ─────────────────────────────────────────────────────────
    const supItems = topSup.data || [];
    const supAgg: Record<number, { supplier_id: number; total: number; sessions: Set<number>; items: Set<number> }> = {};
    for (const row of supItems) {
      const sid = row.supplier_id;
      if (!supAgg[sid]) supAgg[sid] = { supplier_id: sid, total: 0, sessions: new Set(), items: new Set() };
      supAgg[sid].total += row.total_price || 0;
      supAgg[sid].sessions.add(row.session_id);
      supAgg[sid].items.add(row.raw_material_id);
    }
    const supIds = Object.keys(supAgg).map(Number);
    let supNames: Record<number, string> = {};
    if (supIds.length > 0) {
      const { data: supData } = await supabase.from('suppliers').select('id, name').in('id', supIds);
      supNames = Object.fromEntries((supData || []).map((s: any) => [s.id, s.name]));
    }
    const topSuppliers = Object.values(supAgg)
      .map(s => ({ name: supNames[s.supplier_id] || '?', total: s.total, sessions: s.sessions.size, uniqueItems: s.items.size }))
      .sort((a, b) => b.total - a.total).slice(0, 8);

    // ── Stock alerts ──────────────────────────────────────────────────────────
    const stockAlertsData = ((stockAlerts.data || []) as any[])
      .filter((r: any) => r.stock_quantity <= r.min_stock)
      .sort((a: any, b: any) => (a.stock_quantity / a.min_stock) - (b.stock_quantity / b.min_stock))
      .slice(0, 12)
      .map((r: any) => ({ id: r.id, name: r.name, stock: r.stock_quantity, min_stock: r.min_stock, unit: r.purchase_unit, price: r.purchase_price }));

    const zeroStockData = (zeroStock.data || []).map((r: any) => ({ id: r.id, name: r.name, stock: r.stock_quantity, unit: r.purchase_unit }));

    // ── Menu ranking ──────────────────────────────────────────────────────────
    const meals = allMeals.data || [];
    const mealComps = allComps.data || [];
    const mcItems = allMCItems.data || [];
    const tsiRows = allTSI.data || [];
    const rms = allRM.data || [];
    const sheets = allSheets.data || [];

    const menuRanking = meals.map((meal: any) => {
      let foodCost = 0;
      mealComps.filter((mc: any) => mc.meal_id === meal.id).forEach((mc: any) => {
        let compCost = 0;
        mcItems.filter((mci: any) => mci.menu_component_id === mc.menu_component_id).forEach((mci: any) => {
          let sheetCost = 0;
          tsiRows.filter((tsi: any) => tsi.technical_sheet_id === mci.technical_sheet_id).forEach((ing: any) => {
            const raw = rms.find((r: any) => r.id === ing.raw_material_id);
            if (raw?.conversion_factor) {
              const unitP = raw.purchase_price / raw.conversion_factor;
              sheetCost += (ing.quantity / (ing.gain_coefficient || 1)) * (ing.loss_coefficient || 1) * unitP;
            }
          });
          const sheet = sheets.find((s: any) => s.id === mci.technical_sheet_id);
          compCost += (sheetCost / (sheet?.yield || 1)) * mci.quantity;
        });
        foodCost += compCost * mc.quantity;
      });
      const ifoodFee = (meal.sale_price * meal.ifood_fee_percent) / 100;
      const taxes = (meal.sale_price * meal.tax_percent) / 100;
      const cost = foodCost + (meal.packaging_cost || 0) + (meal.cutlery_cost || 0);
      const profitVal = meal.sale_price - ifoodFee - taxes - cost;
      const margin = meal.sale_price > 0 ? (profitVal / meal.sale_price) * 100 : 0;
      return { id: meal.id, name: meal.name, cost, price: meal.sale_price, profit: profitVal, margin, ifoodFee, taxes };
    }).sort((a: any, b: any) => b.margin - a.margin);

    // ── Payroll ───────────────────────────────────────────────────────────────
    const payrollTotal = (payrollCur.data || []).reduce((a: number, e: any) => a + (e.value || 0), 0);
    const payroll = { total: payrollTotal, count: (payrollCur.data || []).length };

    // ── Alerts ────────────────────────────────────────────────────────────────
    const alerts: any[] = [];
    stockAlertsData.slice(0, 5).forEach((rm: any) => alerts.push({
      type: 'warning', title: `Estoque Baixo: ${rm.name}`,
      desc: `${Number(rm.stock).toFixed(2)} ${rm.unit} restantes (mín: ${rm.min_stock})`,
    }));
    overdueWithSupplier.slice(0, 5).forEach((exp: any) => {
      const [y, m, d] = exp.due_date.split('-');
      alerts.push({ type: 'danger', title: `Vencida: ${exp.name}`,
        desc: `R$ ${Number(exp.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — ${d}/${m}/${y}` });
    });
    menuRanking.filter((m: any) => m.margin < 15).slice(0, 3).forEach((m: any) =>
      alerts.push({ type: 'danger', title: `Margem Crítica: ${m.name}`,
        desc: `Margem de ${m.margin.toFixed(1)}% — abaixo do recomendado` })
    );

    return NextResponse.json({
      period, periodLabel,
      currentMonth: {
        revenue, profit, salesCount,
        expenses: expensesTotal, expensesCount: (expCur.data || []).length,
        purchases: purchasesTotal, purchasesCount: (purCur.data || []).length,
        revenueGrowth, expenseGrowth,
      },
      counts, stockValue,
      pending: { total: pendingTotal, count: pendingCount },
      monthlyTrend, topMeals: topMealsData, topMealsAllTime,
      salesByChannel, salesByChannelAllTime,
      expByCategory, expByCategoryAllTime,
      topSuppliers, stockAlerts: stockAlertsData, zeroStock: zeroStockData,
      overdueExpenses: overdueWithSupplier,
      recentSales: recentSales.data || [],
      menuRanking, payroll, alerts,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 });
  }
}
