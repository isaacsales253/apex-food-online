import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*, suppliers(name)')
      .order('category')
      .order('name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const mapped = (expenses || []).map((e: any) => ({
      ...e,
      supplier_name: e.suppliers?.name || null,
      suppliers: undefined,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar despesas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, value, period, nf_number, nf_date, nf_notes, nf_key, due_date } = body;

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        name, category, value, period,
        nf_number: nf_number ?? null,
        nf_date: nf_date ?? null,
        nf_notes: nf_notes ?? null,
        nf_key: nf_key ?? null,
        due_date: due_date ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cadastrar despesa' }, { status: 500 });
  }
}
