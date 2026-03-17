import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: purchaseRows, error: purchaseError } = await supabase
      .from('shopping_session_items')
      .select('unit_price, quantity, brand, supplier_id, session_id, suppliers(name), shopping_sessions(date)')
      .eq('raw_material_id', id)
      .order('session_id');

    if (purchaseError) return NextResponse.json({ error: purchaseError.message }, { status: 500 });

    const purchases = (purchaseRows || []).map((row: any) => ({
      unit_price: row.unit_price,
      quantity: row.quantity,
      brand: row.brand,
      supplier_name: row.suppliers?.name || null,
      purchase_date: row.shopping_sessions?.date || null,
    }));

    // NF list
    const { data: nfRows, error: nfError } = await supabase
      .from('shopping_session_items')
      .select('session_id')
      .eq('raw_material_id', id);

    let nfs: any[] = [];
    if (!nfError && nfRows && nfRows.length > 0) {
      const sessionIds = [...new Set(nfRows.map((r: any) => r.session_id))];
      const { data: expRows } = await supabase
        .from('expenses')
        .select('id, name, nf_number, nf_date, nf_notes, nf_key, nf_file, value, supplier_id, suppliers(name)')
        .in('shopping_session_id', sessionIds)
        .not('nf_number', 'is', null)
        .neq('nf_number', '')
        .order('nf_date', { ascending: false });

      nfs = (expRows || []).map((e: any) => ({
        id: e.id,
        expense_name: e.name,
        nf_number: e.nf_number,
        nf_date: e.nf_date,
        nf_notes: e.nf_notes,
        nf_key: e.nf_key,
        nf_file: e.nf_file,
        value: e.value,
        supplier_name: e.suppliers?.name || null,
      }));
    }

    return NextResponse.json({ purchases, nfs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 });
  }
}
