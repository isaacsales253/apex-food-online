import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: items, error } = await supabase
      .from('disposables')
      .select('*')
      .order('category')
      .order('name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar descartáveis' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, category, unit } = await req.json();
    if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    const { data, error } = await supabase
      .from('disposables')
      .insert({ name, category: category || 'Outros', unit: unit || 'un', unit_cost: 0, stock_quantity: 0 })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cadastrar item' }, { status: 500 });
  }
}
