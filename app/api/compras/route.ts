import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { total_cost, items, disposable_items } = body;

    if ((!items || items.length === 0) && (!disposable_items || disposable_items.length === 0)) {
      return NextResponse.json({ error: 'Nenhum item na compra' }, { status: 400 });
    }

    // Create shopping session
    const { data: session, error: sessionError } = await supabase
      .from('shopping_sessions')
      .insert({ total_cost })
      .select()
      .single();
    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });
    const sessionId = session.id;

    const dateStr = new Date().toLocaleString('pt-BR');

    // Group items by supplier
    const supplierGroups = new Map<number | null, { total: number; name: string | null }>();
    for (const item of (items || [])) {
      const key = item.supplier_id || null;
      if (!supplierGroups.has(key)) {
        let supName: string | null = null;
        if (key) {
          const { data: sup } = await supabase.from('suppliers').select('name').eq('id', key).single();
          supName = sup?.name || null;
        }
        supplierGroups.set(key, { total: 0, name: supName });
      }
      supplierGroups.get(key)!.total += item.total_price;
    }

    // Insert expenses per supplier
    if ((items || []).length === 0 && total_cost > 0) {
      await supabase.from('expenses').insert({
        name: `Compra de Insumos - ${dateStr}`,
        category: 'Variável / Insumos',
        value: total_cost,
        period: 'Avulso',
        shopping_session_id: sessionId,
        supplier_id: null,
      });
    } else {
      for (const [supplierId, group] of supplierGroups) {
        const expName = group.name ? `Compra - ${group.name} - ${dateStr}` : `Compra de Insumos - ${dateStr}`;
        await supabase.from('expenses').insert({
          name: expName,
          category: 'Variável / Insumos',
          value: group.total,
          period: 'Avulso',
          shopping_session_id: sessionId,
          supplier_id: supplierId,
        });
      }
    }

    // Insert shopping session items and update stock/prices
    for (const item of (items || [])) {
      await supabase.from('shopping_session_items').insert({
        session_id: sessionId,
        raw_material_id: item.raw_material_id,
        supplier_id: item.supplier_id || null,
        brand: item.brand || 'Genérica',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      });

      // Upsert brand stock
      const { data: existingBrand } = await supabase
        .from('raw_material_stock_by_brand')
        .select('id, stock_quantity')
        .eq('raw_material_id', item.raw_material_id)
        .eq('brand', item.brand || 'Genérica')
        .maybeSingle();

      if (existingBrand) {
        await supabase
          .from('raw_material_stock_by_brand')
          .update({ stock_quantity: existingBrand.stock_quantity + item.quantity })
          .eq('id', existingBrand.id);
      } else {
        await supabase.from('raw_material_stock_by_brand').insert({
          raw_material_id: item.raw_material_id,
          brand: item.brand || 'Genérica',
          stock_quantity: item.quantity,
        });
      }

      // Calculate new weighted average price
      const { data: stats } = await supabase
        .from('shopping_session_items')
        .select('quantity, total_price')
        .eq('raw_material_id', item.raw_material_id);

      const totalQty = (stats || []).reduce((a: number, r: any) => a + r.quantity, 0);
      const totalSpent = (stats || []).reduce((a: number, r: any) => a + r.total_price, 0);
      const newAvgPrice = totalQty > 0 ? totalSpent / totalQty : item.unit_price;

      // Update raw material stock and price
      const { data: rm } = await supabase.from('raw_materials').select('stock_quantity').eq('id', item.raw_material_id).single();
      await supabase
        .from('raw_materials')
        .update({
          purchase_price: newAvgPrice,
          last_purchase_price: item.unit_price,
          stock_quantity: (rm?.stock_quantity || 0) + item.quantity,
        })
        .eq('id', item.raw_material_id);
    }

    // Process disposables
    for (const d of (disposable_items || [])) {
      const { data: disp } = await supabase.from('disposables').select('stock_quantity').eq('id', d.disposable_id).single();
      await supabase
        .from('disposables')
        .update({
          unit_cost: d.unit_price,
          stock_quantity: (disp?.stock_quantity || 0) + d.quantity,
        })
        .eq('id', d.disposable_id);
    }

    return NextResponse.json({ success: true, sessionId });
  } catch (error) {
    console.error('Error saving purchase:', error);
    return NextResponse.json({ error: 'Erro ao salvar a lista de compras' }, { status: 500 });
  }
}
