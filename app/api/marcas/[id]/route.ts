import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, status } = body;

    const { error } = await supabase
      .from('brands')
      .update({ name, status })
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe uma marca cadastrada com este nome.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Erro ao atualizar marca.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar marca.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: brand } = await supabase
      .from('brands')
      .select('name')
      .eq('id', id)
      .single();

    if (brand) {
      const { count: stockCount } = await supabase
        .from('raw_material_stock_by_brand')
        .select('*', { count: 'exact', head: true })
        .eq('brand', brand.name)
        .gt('stock_quantity', 0);

      if ((stockCount || 0) > 0) {
        return NextResponse.json(
          { error: 'Você tem estoque positivo desta marca. Por favor, zere o estoque antes de excluir a marca.' },
          { status: 400 }
        );
      }
    }

    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Erro interno ao excluir marca.' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno ao excluir marca.' }, { status: 500 });
  }
}
