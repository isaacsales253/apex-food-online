import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: sales, error } = await supabase
      .from('sales')
      .select('*, collaborators(name)')
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const mapped = (sales || []).map((s: any) => ({
      ...s,
      collaborator_name_ref: s.collaborators?.name || null,
      collaborators: undefined,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar vendas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      meal_id, meal_name, quantity, sale_date, channel,
      unit_sale_price, unit_food_cost, unit_packaging_cost,
      ifood_fee_percent, tax_percent,
      unit_ifood_fee, unit_tax, unit_profit,
      total_revenue, total_profit,
      collaborator_id,
      payment_method,
    } = body;

    let collaborator_name: string | null = null;
    if (collaborator_id) {
      const { data: collabRow } = await supabase
        .from('collaborators')
        .select('name')
        .eq('id', collaborator_id)
        .single();
      collaborator_name = collabRow?.name || null;
    }

    const payment_received = payment_method ? true : false;
    const payment_received_at = payment_method ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from('sales')
      .insert({
        meal_id, meal_name, quantity, sale_date, channel,
        unit_sale_price, unit_food_cost, unit_packaging_cost,
        ifood_fee_percent, tax_percent,
        unit_ifood_fee, unit_tax, unit_profit,
        total_revenue, total_profit,
        collaborator_id: collaborator_id || null,
        collaborator_name,
        payment_method: payment_method || null,
        payment_received,
        payment_received_at,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar venda' }, { status: 500 });
  }
}
