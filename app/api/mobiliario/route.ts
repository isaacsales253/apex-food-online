import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: furniture, error: furnitureError } = await supabase
      .from('furniture')
      .select('*')
      .order('category')
      .order('name');

    if (furnitureError) return NextResponse.json({ error: furnitureError.message }, { status: 500 });

    const { data: maintenances } = await supabase
      .from('maintenances')
      .select('cost');

    const totalMaintenance = (maintenances || []).reduce((a: number, m: any) => a + (m.cost || 0), 0);

    return NextResponse.json({ items: furniture || [], totalMaintenance });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar mobiliário' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, quantity, unit_price, purchase_date, condition, annual_depreciation_percent } = body;

    const { data, error } = await supabase
      .from('furniture')
      .insert({ name, category, quantity, unit_price, purchase_date, condition, annual_depreciation_percent: annual_depreciation_percent ?? 10.0 })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao cadastrar mobiliário' }, { status: 500 });
  }
}
