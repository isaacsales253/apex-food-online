import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    const body = await req.json();
    const {
      quantity, sale_date, channel,
      unit_sale_price, unit_ifood_fee, unit_tax, unit_profit,
      ifood_fee_percent, total_revenue, total_profit,
      collaborator_id,
    } = body;

    let collaborator_name: string | null = null;
    if (collaborator_id) {
      const { data: collabRow } = await supabase
        .from('collaborators')
        .select('name')
        .eq('id', collaborator_id)
        .single();
      collaborator_name = collabRow?.name || null;
    }

    const { error } = await supabase
      .from('sales')
      .update({
        quantity, sale_date, channel,
        unit_sale_price, ifood_fee_percent,
        unit_ifood_fee, unit_tax, unit_profit,
        total_revenue, total_profit,
        collaborator_id: collaborator_id || null,
        collaborator_name,
      })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao atualizar venda' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    const { payment_method, payment_received } = await req.json();
    const received = payment_received ? true : false;
    const received_at = received ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('sales')
      .update({
        payment_method: payment_method || null,
        payment_received: received,
        payment_received_at: received_at,
      })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao confirmar recebimento' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('sales').delete().eq('id', Number(id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao excluir venda' }, { status: 500 });
  }
}
