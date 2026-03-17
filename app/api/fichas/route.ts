import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: sheets, error: sheetsError } = await supabase
      .from('technical_sheets')
      .select('id, name, yield, yield_unit')
      .order('name');

    if (sheetsError) return NextResponse.json({ error: sheetsError.message }, { status: 500 });

    const { data: allIngredients, error: ingError } = await supabase
      .from('technical_sheet_ingredients')
      .select('id, technical_sheet_id, raw_material_id, quantity, loss_coefficient, gain_coefficient, raw_materials(name, purchase_price, conversion_factor, converted_unit)');

    if (ingError) return NextResponse.json({ error: ingError.message }, { status: 500 });

    const { data: allRMs } = await supabase.from('raw_materials').select('id, purchase_price, conversion_factor');
    const rmMap = Object.fromEntries((allRMs || []).map((r: any) => [r.id, r]));

    const sheetsWithIngredients = (sheets || []).map((sheet: any) => {
      const ingredients = (allIngredients || [])
        .filter((ing: any) => ing.technical_sheet_id === sheet.id)
        .map((ing: any) => ({
          id: ing.id,
          raw_material_id: ing.raw_material_id,
          quantity: ing.quantity,
          loss_coefficient: ing.loss_coefficient,
          gain_coefficient: ing.gain_coefficient,
          name: ing.raw_materials?.name || null,
          purchase_price: ing.raw_materials?.purchase_price || 0,
          conversion_factor: ing.raw_materials?.conversion_factor || 1,
          converted_unit: ing.raw_materials?.converted_unit || null,
        }));

      const total_cost = ingredients.reduce((sum: number, ing: any) => {
        const rm = rmMap[ing.raw_material_id];
        if (!rm?.conversion_factor) return sum;
        return sum + ((ing.quantity / (ing.gain_coefficient || 1)) * (ing.loss_coefficient || 1) * (rm.purchase_price / rm.conversion_factor));
      }, 0);

      return { ...sheet, total_cost, ingredients };
    });

    return NextResponse.json(sheetsWithIngredients);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar fichas técnicas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, yield: recipeYield, yield_unit, ingredients } = body;

    const { data: sheet, error: sheetError } = await supabase
      .from('technical_sheets')
      .insert({ name, yield: recipeYield, yield_unit })
      .select()
      .single();

    if (sheetError) return NextResponse.json({ error: sheetError.message }, { status: 500 });
    const sheetId = sheet.id;

    if (ingredients && ingredients.length > 0) {
      const { error: ingError } = await supabase.from('technical_sheet_ingredients').insert(
        ingredients.map((ing: any) => ({
          technical_sheet_id: sheetId,
          raw_material_id: ing.raw_material_id,
          quantity: ing.quantity,
          loss_coefficient: ing.loss_coefficient || 1.0,
          gain_coefficient: ing.gain_coefficient || 1.0,
        }))
      );
      if (ingError) return NextResponse.json({ error: ingError.message }, { status: 500 });
    }

    return NextResponse.json({ id: sheetId });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cadastrar ficha técnica' }, { status: 500 });
  }
}
