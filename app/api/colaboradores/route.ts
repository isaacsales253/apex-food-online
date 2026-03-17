import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: collaborators, error } = await supabase
      .from('collaborators')
      .select('*')
      .order('name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(collaborators);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar colaboradores' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, role, contact, cpf, cnpj, commission_type, commission_percent, allowed_meals, notes } = body;

    if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });

    const { data, error } = await supabase
      .from('collaborators')
      .insert({
        name,
        role: role || 'Colaborador',
        contact: contact || null,
        cpf: cpf || null,
        cnpj: cnpj || null,
        commission_type: commission_type || 'total',
        commission_percent: commission_percent || 0,
        allowed_meals: allowed_meals || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id, success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar colaborador' }, { status: 500 });
  }
}
