import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
    }

    // Pre-cache all technical sheets
    const { data: sheets } = await supabase.from('technical_sheets').select('id, name');
    const sheetMap = new Map((sheets || []).map((s: any) => [s.name.toLowerCase().trim(), s.id]));

    for (const meal of items) {
      const { data: mealData, error: mealError } = await supabase
        .from('meals')
        .insert({
          name: meal.name,
          sale_price: meal.sale_price || 0,
          ifood_fee_percent: meal.ifood_fee_percent || 0,
          tax_percent: meal.tax_percent || 0,
          packaging_cost: meal.packaging_cost || 0,
          cutlery_cost: meal.cutlery_cost || 0,
        })
        .select()
        .single();

      if (mealError || !mealData) continue;
      const mealId = mealData.id;

      const compsToInsert: any[] = [];
      for (const comp of (meal.components || [])) {
        const sheetId = sheetMap.get(comp.technical_sheet_name?.toLowerCase().trim());
        if (sheetId) {
          compsToInsert.push({ meal_id: mealId, menu_component_id: sheetId, quantity: comp.quantity || 1 });
        }
      }
      if (compsToInsert.length > 0) {
        await supabase.from('meal_compositions').insert(compsToInsert);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Erro ao importar itens do cardápio' }, { status: 500 });
  }
}
