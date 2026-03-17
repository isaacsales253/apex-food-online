import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: materials, error: rmError } = await supabase
      .from('raw_materials')
      .select('*')
      .order('category')
      .order('name');

    if (rmError) return NextResponse.json({ error: rmError.message }, { status: 500 });

    const { data: brandsStock } = await supabase
      .from('raw_material_stock_by_brand')
      .select('*')
      .gt('stock_quantity', 0);

    const result = (materials || []).map(m => {
      const mb = (brandsStock || []).filter((b: any) => b.raw_material_id === m.id);
      return { ...m, brands: mb.map((b: any) => ({ brand: b.brand, quantity: b.stock_quantity })) };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar insumos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, purchase_unit, conversion_factor, converted_unit } = body;

    const { data, error } = await supabase
      .from('raw_materials')
      .insert({ name, category, purchase_price: 0, purchase_unit, conversion_factor, converted_unit })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cadastrar insumo' }, { status: 500 });
  }
}
