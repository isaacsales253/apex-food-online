import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Check if used in recipes
    const { count: recipeCount } = await supabase
      .from('technical_sheet_ingredients')
      .select('*', { count: 'exact', head: true })
      .eq('raw_material_id', id);

    if ((recipeCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Este insumo está sendo utilizado em uma ou mais Fichas Técnicas. Remova-o delas antes de excluir.' },
        { status: 400 }
      );
    }

    // Check if used in purchase history
    const { count: purchaseCount } = await supabase
      .from('shopping_session_items')
      .select('*', { count: 'exact', head: true })
      .eq('raw_material_id', id);

    if ((purchaseCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Este insumo possui histórico de compras registrado. Se deseja realmente excluí-lo, você precisa primeiro limpar o histórico de compras onde ele aparece.' },
        { status: 400 }
      );
    }

    await supabase.from('raw_material_stock_by_brand').delete().eq('raw_material_id', id);
    const { error } = await supabase.from('raw_materials').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting material:', error);
    return NextResponse.json({ error: 'Erro interno ao excluir insumo.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { deductQuantity, brand, min_stock } = body;

    if (typeof min_stock === 'number') {
      const { error } = await supabase.from('raw_materials').update({ min_stock }).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (typeof deductQuantity !== 'number' || deductQuantity <= 0) {
      return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 });
    }

    if (brand) {
      const { data: brandStock } = await supabase
        .from('raw_material_stock_by_brand')
        .select('id, stock_quantity')
        .eq('raw_material_id', id)
        .eq('brand', brand)
        .maybeSingle();

      if (brandStock) {
        await supabase
          .from('raw_material_stock_by_brand')
          .update({ stock_quantity: Math.max(0, brandStock.stock_quantity - deductQuantity) })
          .eq('id', brandStock.id);
      }
    }

    const { data: rm } = await supabase.from('raw_materials').select('stock_quantity').eq('id', id).single();
    if (rm) {
      const { error } = await supabase
        .from('raw_materials')
        .update({ stock_quantity: Math.max(0, (rm.stock_quantity || 0) - deductQuantity) })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating stock:', error);
    return NextResponse.json({ error: 'Erro ao dar baixa no estoque.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category, purchase_unit, conversion_factor, converted_unit, min_stock } = body;

    const { error } = await supabase
      .from('raw_materials')
      .update({ name, category, purchase_unit, conversion_factor, converted_unit, min_stock: min_stock ?? 0 })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating material:', error);
    return NextResponse.json({ error: 'Erro ao atualizar insumo.' }, { status: 500 });
  }
}
