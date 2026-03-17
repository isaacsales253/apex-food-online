import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Este fornecedor possui compras vinculadas a ele. Remova-as antes de excluir.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'Erro interno ao excluir fornecedor.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno ao excluir fornecedor.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, contact, cnpj, address } = body;

    const { error } = await supabase
      .from('suppliers')
      .update({ name, contact, cnpj, address })
      .eq('id', id);

    if (error) return NextResponse.json({ error: 'Erro ao atualizar fornecedor.' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar fornecedor.' }, { status: 500 });
  }
}
