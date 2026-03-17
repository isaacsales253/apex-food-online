import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await supabase.from('meal_compositions').delete().eq('meal_id', id);
    await supabase.from('meal_disposables').delete().eq('meal_id', id);
    const { error } = await supabase.from('meals').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir item do cardápio' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, components, disposables } = body;

    const { error: updateError } = await supabase
      .from('meals')
      .update({ name, packaging_cost: 0, cutlery_cost: 0 })
      .eq('id', id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await supabase.from('meal_compositions').delete().eq('meal_id', id);
    await supabase.from('meal_disposables').delete().eq('meal_id', id);

    if (components && components.length > 0) {
      await supabase.from('meal_compositions').insert(
        components.map((comp: any) => ({ meal_id: id, menu_component_id: comp.technical_sheet_id, quantity: comp.quantity }))
      );
    }

    if (disposables && disposables.length > 0) {
      await supabase.from('meal_disposables').insert(
        disposables.map((d: any) => ({ meal_id: id, disposable_id: d.disposable_id, quantity: d.quantity }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao atualizar item do cardápio' }, { status: 500 });
  }
}
