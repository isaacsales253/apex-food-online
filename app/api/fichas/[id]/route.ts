import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await supabase.from('technical_sheet_ingredients').delete().eq('technical_sheet_id', id);
    const { error } = await supabase.from('technical_sheets').delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Esta ficha técnica está sendo vinculada a um Item no Cardápio. Remova-a do cardápio primeiro.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno ao excluir ficha técnica' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, yield: recipeYield, yield_unit, ingredients } = body;

    const { error: updateError } = await supabase
      .from('technical_sheets')
      .update({ name, yield: recipeYield, yield_unit })
      .eq('id', id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await supabase.from('technical_sheet_ingredients').delete().eq('technical_sheet_id', id);

    if (ingredients && ingredients.length > 0) {
      const { error: ingError } = await supabase.from('technical_sheet_ingredients').insert(
        ingredients.map((ing: any) => ({
          technical_sheet_id: id,
          raw_material_id: ing.raw_material_id,
          quantity: ing.quantity,
          loss_coefficient: ing.loss_coefficient || 1.0,
          gain_coefficient: ing.gain_coefficient || 1.0,
        }))
      );
      if (ingError) return NextResponse.json({ error: ingError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao atualizar ficha técnica' }, { status: 500 });
  }
}
