import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: expense } = await supabase
      .from('expenses')
      .select('shopping_session_id, supplier_id')
      .eq('id', id)
      .single();

    if (!expense?.shopping_session_id) return NextResponse.json([]);

    let query = supabase
      .from('shopping_session_items')
      .select('id, raw_material_id, brand, quantity, unit_price, total_price, supplier_id, raw_materials(name, purchase_unit), suppliers(name)')
      .eq('session_id', expense.shopping_session_id)
      .order('raw_material_id');

    // Filter by supplier if expense belongs to a specific supplier
    if (expense.supplier_id) {
      query = query.eq('supplier_id', expense.supplier_id);
    }

    const { data: items, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const mapped = (items || []).map((item: any) => ({
      id: item.id,
      raw_material_id: item.raw_material_id,
      brand: item.brand,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      raw_material_name: item.raw_materials?.name || null,
      purchase_unit: item.raw_materials?.purchase_unit || null,
      supplier_name: item.suppliers?.name || null,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { items } = await req.json() as { items: { id: number; quantity: number; unit_price: number }[] };

    const { data: expense } = await supabase
      .from('expenses')
      .select('shopping_session_id, supplier_id')
      .eq('id', id)
      .single();

    if (!expense?.shopping_session_id) return NextResponse.json({ error: 'Sem sessão de compra' }, { status: 400 });
    const sessionId = expense.shopping_session_id;

    for (const item of items) {
      const { data: old } = await supabase
        .from('shopping_session_items')
        .select('*')
        .eq('id', item.id)
        .single();

      if (!old) continue;

      const newTotal = item.quantity * item.unit_price;
      const qtyDelta = item.quantity - old.quantity;

      await supabase
        .from('shopping_session_items')
        .update({ quantity: item.quantity, unit_price: item.unit_price, total_price: newTotal })
        .eq('id', item.id);

      if (qtyDelta !== 0) {
        const { data: rm } = await supabase.from('raw_materials').select('stock_quantity').eq('id', old.raw_material_id).single();
        if (rm) {
          await supabase.from('raw_materials')
            .update({ stock_quantity: Math.max(0, (rm.stock_quantity || 0) + qtyDelta) })
            .eq('id', old.raw_material_id);
        }

        const { data: brandStock } = await supabase
          .from('raw_material_stock_by_brand')
          .select('id, stock_quantity')
          .eq('raw_material_id', old.raw_material_id)
          .eq('brand', old.brand)
          .maybeSingle();

        if (brandStock) {
          await supabase
            .from('raw_material_stock_by_brand')
            .update({ stock_quantity: Math.max(0, brandStock.stock_quantity + qtyDelta) })
            .eq('id', brandStock.id);
        }
      }

      // Recalculate weighted average purchase price
      const { data: stats } = await supabase
        .from('shopping_session_items')
        .select('quantity, total_price')
        .eq('raw_material_id', old.raw_material_id);

      const totalQty = (stats || []).reduce((a: number, r: any) => a + r.quantity, 0);
      const totalSpent = (stats || []).reduce((a: number, r: any) => a + r.total_price, 0);
      if (totalQty > 0) {
        await supabase.from('raw_materials')
          .update({ purchase_price: totalSpent / totalQty, last_purchase_price: item.unit_price })
          .eq('id', old.raw_material_id);
      }
    }

    // Recalculate total only for THIS expense's supplier items
    let totalQuery = supabase
      .from('shopping_session_items')
      .select('total_price')
      .eq('session_id', sessionId);

    if (expense.supplier_id) {
      totalQuery = totalQuery.eq('supplier_id', expense.supplier_id);
    }

    const { data: supplierItems } = await totalQuery;
    const newExpenseTotal = (supplierItems || []).reduce((a: number, r: any) => a + r.total_price, 0);

    // Update this expense with its own supplier's total
    await supabase.from('expenses').update({ value: newExpenseTotal }).eq('id', id);

    // Update session total_cost with ALL items
    const { data: allSessionItems } = await supabase
      .from('shopping_session_items')
      .select('total_price')
      .eq('session_id', sessionId);

    const sessionTotal = (allSessionItems || []).reduce((a: number, r: any) => a + r.total_price, 0);
    await supabase.from('shopping_sessions').update({ total_cost: sessionTotal }).eq('id', sessionId);

    return NextResponse.json({ success: true, newTotal: newExpenseTotal });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao atualizar itens' }, { status: 500 });
  }
}
