import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
    }

    const toInsert = items.map((item: any) => ({
      name: item.name,
      category: item.category || 'Fixa',
      value: item.value || 0,
      period: item.period || 'Monthly',
    }));

    const { error } = await supabase.from('expenses').insert(toInsert);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Erro ao importar despesas' }, { status: 500 });
  }
}
