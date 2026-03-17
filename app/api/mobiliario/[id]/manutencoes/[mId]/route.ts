import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; mId: string }> }
) {
  try {
    const { mId } = await params;

    const { data: maintenance, error: fetchError } = await supabase
      .from('maintenances')
      .select('*')
      .eq('id', mId)
      .single();

    if (fetchError || !maintenance) return NextResponse.json({ error: 'Manutenção não encontrada' }, { status: 404 });

    const { error: delError } = await supabase.from('maintenances').delete().eq('id', mId);
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

    if (maintenance.expense_id) {
      await supabase.from('expenses').delete().eq('id', maintenance.expense_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir manutenção' }, { status: 500 });
  }
}
