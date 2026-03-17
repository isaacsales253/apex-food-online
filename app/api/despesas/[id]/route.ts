import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !expense) {
      return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 });
    }

    // Delete expense first
    const { error: delError } = await supabase.from('expenses').delete().eq('id', id);
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

    if (expense.shopping_session_id) {
      const sessionId = expense.shopping_session_id;
      const { data: items } = await supabase
        .from('shopping_session_items')
        .select('*')
        .eq('session_id', sessionId);

      for (const item of (items || [])) {
        // Deduct stock
        const { data: rm } = await supabase.from('raw_materials').select('stock_quantity').eq('id', item.raw_material_id).single();
        if (rm) {
          await supabase.from('raw_materials')
            .update({ stock_quantity: Math.max(0, (rm.stock_quantity || 0) - item.quantity) })
            .eq('id', item.raw_material_id);
        }

        // Recalculate average price from remaining purchases (excluding this session)
        const { data: stats } = await supabase
          .from('shopping_session_items')
          .select('quantity, total_price')
          .eq('raw_material_id', item.raw_material_id)
          .neq('session_id', sessionId);

        const totalQty = (stats || []).reduce((a: number, r: any) => a + r.quantity, 0);
        const totalSpent = (stats || []).reduce((a: number, r: any) => a + r.total_price, 0);
        if (totalQty > 0) {
          await supabase.from('raw_materials')
            .update({ purchase_price: totalSpent / totalQty })
            .eq('id', item.raw_material_id);
        }
      }

      await supabase.from('shopping_session_items').delete().eq('session_id', sessionId);
      await supabase.from('shopping_sessions').delete().eq('id', sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Erro ao excluir despesa' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, category, value, period, nf_number, nf_date, nf_notes, nf_key, due_date } = body;

    const { error } = await supabase
      .from('expenses')
      .update({
        name, category, value, period,
        nf_number: nf_number ?? null,
        nf_date: nf_date ?? null,
        nf_notes: nf_notes ?? null,
        nf_key: nf_key ?? null,
        due_date: due_date ?? null,
      })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar despesa' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updates: Record<string, any> = {};

    if ('paid' in body) {
      updates.paid = body.paid ? true : false;
    }
    if ('nf_number' in body || 'nf_date' in body || 'nf_notes' in body || 'nf_key' in body) {
      updates.nf_number = body.nf_number ?? null;
      updates.nf_date = body.nf_date ?? null;
      updates.nf_notes = body.nf_notes ?? null;
      updates.nf_key = body.nf_key ?? null;
    }

    const { error } = await supabase.from('expenses').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar despesa' }, { status: 500 });
  }
}
