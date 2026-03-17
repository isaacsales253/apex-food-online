import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const periodo = searchParams.get('periodo') || '';

    const { data: collab, error: collabError } = await supabase
      .from('collaborators')
      .select('*')
      .eq('id', id)
      .single();

    if (collabError || !collab) return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });

    let salesQuery = supabase
      .from('sales')
      .select('*')
      .eq('collaborator_id', id)
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (periodo) {
      salesQuery = salesQuery.ilike('sale_date', `${periodo}%`);
    }

    const { data: sales, error: salesError } = await salesQuery;
    if (salesError) return NextResponse.json({ error: salesError.message }, { status: 500 });

    const salesArr: any[] = sales || [];

    const totalSales = salesArr.length;
    const totalUnits = salesArr.reduce((a, s) => a + (s.quantity || 0), 0);
    const totalRevenue = salesArr.reduce((a, s) => a + (s.total_revenue || 0), 0);
    const totalProfit = salesArr.reduce((a, s) => a + (s.total_profit || 0), 0);
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    const avgUnitsPerSale = totalSales > 0 ? totalUnits / totalSales : 0;

    const commissionBase = (s: any) => {
      const sp = s.unit_sale_price || 0;
      const ifoodFee = s.unit_ifood_fee || 0;
      const tax = s.unit_tax || 0;
      const foodCost = s.unit_food_cost || 0;
      const packCost = s.unit_packaging_cost || 0;
      const qty = s.quantity || 1;
      if (collab.commission_type === 'total') return sp * qty;
      if (collab.commission_type === 'net') return (sp - ifoodFee - tax) * qty;
      if (collab.commission_type === 'profit') return (sp - ifoodFee - tax - foodCost - packCost) * qty;
      return sp * qty;
    };

    const totalCommissionBase = salesArr.reduce((a, s) => a + commissionBase(s), 0);
    const totalCommission = totalCommissionBase * (collab.commission_percent / 100);
    const netCommission = totalCommission * (1 - (collab.aliquota_percent || 0) / 100);

    const byMealMap: Record<string, any> = {};
    for (const s of salesArr) {
      const key = s.meal_name;
      if (!byMealMap[key]) byMealMap[key] = { meal_name: key, count: 0, units: 0, revenue: 0, profit: 0, commission_base: 0 };
      byMealMap[key].count += 1;
      byMealMap[key].units += s.quantity || 0;
      byMealMap[key].revenue += s.total_revenue || 0;
      byMealMap[key].profit += s.total_profit || 0;
      byMealMap[key].commission_base += commissionBase(s);
    }
    const byMeal = Object.values(byMealMap)
      .map(m => ({ ...m, commission: m.commission_base * (collab.commission_percent / 100) }))
      .sort((a, b) => b.revenue - a.revenue);

    const byChannelMap: Record<string, any> = {};
    for (const s of salesArr) {
      const ch = s.channel || 'Outro';
      if (!byChannelMap[ch]) byChannelMap[ch] = { channel: ch, count: 0, units: 0, revenue: 0, profit: 0 };
      byChannelMap[ch].count += 1;
      byChannelMap[ch].units += s.quantity || 0;
      byChannelMap[ch].revenue += s.total_revenue || 0;
      byChannelMap[ch].profit += s.total_profit || 0;
    }
    const byChannel = Object.values(byChannelMap).sort((a, b) => b.revenue - a.revenue);

    const byMonthMap: Record<string, any> = {};
    for (const s of salesArr) {
      if (!s.sale_date) continue;
      const [year, month] = s.sale_date.split('-');
      const key = `${month}/${year}`;
      if (!byMonthMap[key]) byMonthMap[key] = { month: key, sort_key: `${year}-${month}`, count: 0, units: 0, revenue: 0, profit: 0, commission: 0 };
      byMonthMap[key].count += 1;
      byMonthMap[key].units += s.quantity || 0;
      byMonthMap[key].revenue += s.total_revenue || 0;
      byMonthMap[key].profit += s.total_profit || 0;
      byMonthMap[key].commission += commissionBase(s) * (collab.commission_percent / 100);
    }
    const byMonth = Object.values(byMonthMap).sort((a, b) => b.sort_key.localeCompare(a.sort_key));

    return NextResponse.json({
      collaborator: {
        id: collab.id, name: collab.name, role: collab.role,
        commission_type: collab.commission_type, commission_percent: collab.commission_percent,
        aliquota_percent: collab.aliquota_percent || 0, precificacao: collab.precificacao || 'Todas',
      },
      summary: { totalSales, totalUnits, totalRevenue, totalProfit, avgTicket, avgUnitsPerSale, totalCommissionBase, totalCommission, netCommission },
      byMeal, byChannel, byMonth,
      recentSales: salesArr.slice(0, 20),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar vendas do colaborador' }, { status: 500 });
  }
}
