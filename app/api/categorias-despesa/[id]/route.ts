import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: category, error: catError } = await supabase
      .from('expense_categories')
      .select('name')
      .eq('id', id)
      .single();

    if (catError || !category) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });

    const { count, error: countError } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('category', category.name);

    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir: ${count} despesa(s) vinculada(s) a esta categoria.` },
        { status: 409 }
      );
    }

    const { error } = await supabase.from('expense_categories').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 });
  }
}
