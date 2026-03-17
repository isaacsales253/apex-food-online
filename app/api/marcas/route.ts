import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: brands, error } = await supabase
      .from('brands')
      .select('*')
      .order('name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(brands);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar marcas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, status } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome da marca obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('brands')
      .insert({ name, status: status || 'Aprovada' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe uma marca cadastrada com este nome.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, name: data.name, status: data.status });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao cadastrar marca' }, { status: 500 });
  }
}
