import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplierId = parseInt(id);

    // Get all shopping session items for this supplier
    const { data: ssiRows, error: ssiError } = await supabase
      .from('shopping_session_items')
      .select('id, session_id, raw_material_id, quantity, unit_price, total_price, raw_materials(name, purchase_unit), shopping_sessions(date)')
      .eq('supplier_id', supplierId);

    if (ssiError) return NextResponse.json({ error: ssiError.message }, { status: 500 });
    const ssi = ssiRows || [];

    // Summary
    const sessionSet = new Set(ssi.map((r: any) => r.session_id));
    const itemSet = new Set(ssi.map((r: any) => r.raw_material_id));
    const totalSpent = ssi.reduce((a: number, r: any) => a + (r.total_price || 0), 0);
    const totalSessions = sessionSet.size;
    const uniqueItems = itemSet.size;

    // Get expenses
    const sessionIds = [...sessionSet];
    let expensesData: any[] = [];
    if (sessionIds.length > 0) {
      const { data: expFromSession } = await supabase
        .from('expenses')
        .select('id, name, category, value, period, paid, due_date, nf_number, nf_date, nf_notes, nf_file, created_at')
        .in('shopping_session_id', sessionIds)
        .order('created_at', { ascending: false });
      expensesData = expFromSession || [];
    }
    const { data: expDirect } = await supabase
      .from('expenses')
      .select('id, name, category, value, period, paid, due_date, nf_number, nf_date, nf_notes, nf_file, created_at')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    const expAllIds = new Set<number>();
    const expenses: any[] = [];
    for (const e of [...expensesData, ...(expDirect || [])]) {
      if (!expAllIds.has(e.id)) { expAllIds.add(e.id); expenses.push(e); }
    }

    const totalExpenses = expenses.reduce((a, e) => a + (e.value || 0), 0);
    const paidExpenses = expenses.filter(e => e.paid).reduce((a, e) => a + (e.value || 0), 0);
    const pendingExpenses = expenses.filter(e => !e.paid).reduce((a, e) => a + (e.value || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const overdueExpenses = expenses.filter(e => !e.paid && e.due_date && e.due_date < today).reduce((a, e) => a + (e.value || 0), 0);

    // By month
    const byMonthMap: Record<string, { month: string; totalSpent: number; sessions: Set<number>; lines: number }> = {};
    for (const row of ssi) {
      const date = (row.shopping_sessions as any)?.date || '';
      const month = date.substring(0, 7);
      if (!byMonthMap[month]) byMonthMap[month] = { month, totalSpent: 0, sessions: new Set(), lines: 0 };
      byMonthMap[month].totalSpent += row.total_price || 0;
      byMonthMap[month].sessions.add(row.session_id);
      byMonthMap[month].lines += 1;
    }
    const byMonth = Object.values(byMonthMap)
      .map(m => ({ month: m.month, totalSpent: m.totalSpent, sessions: m.sessions.size, lines: m.lines }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Top items
    const itemAgg: Record<number, any> = {};
    for (const row of ssi) {
      const rid = row.raw_material_id;
      if (!itemAgg[rid]) {
        itemAgg[rid] = {
          raw_material_id: rid,
          raw_material_name: (row.raw_materials as any)?.name || null,
          purchase_unit: (row.raw_materials as any)?.purchase_unit || null,
          totalQty: 0, totalSpent: 0, sessions: new Set<number>(),
          prices: [] as number[],
        };
      }
      itemAgg[rid].totalQty += row.quantity || 0;
      itemAgg[rid].totalSpent += row.total_price || 0;
      itemAgg[rid].sessions.add(row.session_id);
      itemAgg[rid].prices.push(row.unit_price);
    }
    const topItems = Object.values(itemAgg).map((item: any) => ({
      raw_material_id: item.raw_material_id,
      raw_material_name: item.raw_material_name,
      purchase_unit: item.purchase_unit,
      totalQty: item.totalQty,
      totalSpent: item.totalSpent,
      sessions: item.sessions.size,
      avgPrice: item.prices.reduce((a: number, p: number) => a + p, 0) / (item.prices.length || 1),
      minPrice: Math.min(...item.prices),
      maxPrice: Math.max(...item.prices),
    })).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 30);

    // Price history
    const priceHistoryMap: Record<number, { name: string; unit: string; points: { date: string; price: number }[] }> = {};
    for (const row of ssi) {
      const rid = row.raw_material_id;
      const date = ((row.shopping_sessions as any)?.date || '').substring(0, 10);
      if (!priceHistoryMap[rid]) {
        priceHistoryMap[rid] = {
          name: (row.raw_materials as any)?.name || null,
          unit: (row.raw_materials as any)?.purchase_unit || null,
          points: [],
        };
      }
      priceHistoryMap[rid].points.push({ date, price: row.unit_price });
    }
    const priceHistoryGrouped = Object.values(priceHistoryMap).filter(v => v.points.length > 1);

    // Recent sessions
    const sessionAgg: Record<number, { id: number; date: string; sessionTotal: number; itemCount: number }> = {};
    for (const row of ssi) {
      const sid = row.session_id;
      const date = ((row.shopping_sessions as any)?.date || '').substring(0, 10);
      if (!sessionAgg[sid]) sessionAgg[sid] = { id: sid, date, sessionTotal: 0, itemCount: 0 };
      sessionAgg[sid].sessionTotal += row.total_price || 0;
      sessionAgg[sid].itemCount += 1;
    }
    const recentSessionsList = Object.values(sessionAgg).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

    const sessionItemsMap: Record<number, any[]> = {};
    for (const row of ssi) {
      if (recentSessionsList.find(s => s.id === row.session_id)) {
        const sid = row.session_id;
        if (!sessionItemsMap[sid]) sessionItemsMap[sid] = [];
        sessionItemsMap[sid].push({
          session_id: sid,
          raw_material_name: (row.raw_materials as any)?.name || null,
          purchase_unit: (row.raw_materials as any)?.purchase_unit || null,
          quantity: row.quantity,
          unit_price: row.unit_price,
          total_price: row.total_price,
        });
      }
    }
    const recentSessions = recentSessionsList.map(s => ({ ...s, items: sessionItemsMap[s.id] || [] }));

    return NextResponse.json({
      summary: {
        totalSessions, totalSpent, uniqueItems,
        avgTicket: totalSessions > 0 ? totalSpent / totalSessions : 0,
        totalExpenses, pendingExpenses, overdueExpenses, paidExpenses,
        totalExpenseCount: expenses.length,
      },
      byMonth, topItems, priceHistory: priceHistoryGrouped, recentSessions, expenses,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao carregar dashboard do fornecedor' }, { status: 500 });
  }
}
