import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, role, contact, cpf, cnpj, commission_type, commission_percent, allowed_meals, active, notes } = body;

    const { error } = await supabase
      .from('collaborators')
      .update({
        name, role,
        contact: contact || null,
        cpf: cpf || null,
        cnpj: cnpj || null,
        commission_type,
        commission_percent,
        allowed_meals: allowed_meals || null,
        active: active ? true : false,
        notes: notes || null,
      })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao atualizar colaborador' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('collaborators').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao excluir colaborador' }, { status: 500 });
  }
}
