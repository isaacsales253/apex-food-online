import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
    }

    // Pre-cache all raw materials
    const { data: materials } = await supabase.from('raw_materials').select('id, name');
    const materialMap = new Map((materials || []).map((m: any) => [m.name.toLowerCase().trim(), m.id]));

    for (const recipe of items) {
      const { data: sheet, error: sheetError } = await supabase
        .from('technical_sheets')
        .insert({ name: recipe.name, yield: recipe.yield || 1, yield_unit: recipe.yield_unit || 'porção' })
        .select()
        .single();

      if (sheetError || !sheet) continue;
      const sheetId = sheet.id;

      const ingsToInsert: any[] = [];
      for (const ing of (recipe.ingredients || [])) {
        const matId = materialMap.get(ing.material_name?.toLowerCase().trim());
        if (matId) {
          ingsToInsert.push({
            technical_sheet_id: sheetId,
            raw_material_id: matId,
            quantity: ing.quantity || 0,
            loss_coefficient: ing.loss_coefficient || 1.0,
            gain_coefficient: ing.gain_coefficient || 1.0,
          });
        }
      }
      if (ingsToInsert.length > 0) {
        await supabase.from('technical_sheet_ingredients').insert(ingsToInsert);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Erro ao importar fichas técnicas' }, { status: 500 });
  }
}
