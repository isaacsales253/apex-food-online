import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(categories);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.message?.includes('unique') || error.code === '23505') {
        return NextResponse.json({ error: 'Categoria já existe' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, name: data.name });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
  }
}
