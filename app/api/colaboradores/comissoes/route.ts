import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodo = searchParams.get('periodo') || '';

    const { data: collabs, error: collabError } = await supabase
      .from('collaborators')
      .select('*')
      .eq('active', true);

    if (collabError) return NextResponse.json({ error: collabError.message }, { status: 500 });
    if (!collabs || collabs.length === 0) return NextResponse.json([]);

    let salesQuery = supabase
      .from('sales')
      .select('*')
      .not('collaborator_id', 'is', null)
      .order('sale_date', { ascending: true });

    if (periodo) {
      salesQuery = salesQuery.ilike('sale_date', `${periodo}%`);
    }

    const { data: sales, error: salesError } = await salesQuery;
    if (salesError) return NextResponse.json({ error: salesError.message }, { status: 500 });

    const salesByCollab: Record<number, any[]> = {};
    for (const s of (sales || [])) {
      const cid = s.collaborator_id;
      if (!salesByCollab[cid]) salesByCollab[cid] = [];
      salesByCollab[cid].push(s);
    }

    const commissionBase = (s: any, commissionType: string) => {
      const sp = s.unit_sale_price || 0;
      const ifoodFee = s.unit_ifood_fee || 0;
      const tax = s.unit_tax || 0;
      const foodCost = s.unit_food_cost || 0;
      const packCost = s.unit_packaging_cost || 0;
      const qty = s.quantity || 1;
      if (commissionType === 'total') return sp * qty;
      if (commissionType === 'net') return (sp - ifoodFee - tax) * qty;
      if (commissionType === 'profit') return (sp - ifoodFee - tax - foodCost - packCost) * qty;
      return sp * qty;
    };

    const result = collabs.map(c => {
      const collabSales = salesByCollab[c.id] || [];
      const totalSales = collabSales.length;
      const totalUnits = collabSales.reduce((a: number, s: any) => a + (s.quantity || 0), 0);
      const totalRevenue = collabSales.reduce((a: number, s: any) => a + (s.total_revenue || 0), 0);
      const totalProfit = collabSales.reduce((a: number, s: any) => a + (s.total_profit || 0), 0);
      const totalCommissionBase = collabSales.reduce((a: number, s: any) => a + commissionBase(s, c.commission_type), 0);
      const totalCommission = totalCommissionBase * ((c.commission_percent || 0) / 100);

      return {
        collab_id: c.id, name: c.name, role: c.role,
        commission_type: c.commission_type, commission_percent: c.commission_percent,
        totalSales, totalUnits, totalRevenue, totalProfit, totalCommissionBase, totalCommission,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao calcular comissões' }, { status: 500 });
  }
}
