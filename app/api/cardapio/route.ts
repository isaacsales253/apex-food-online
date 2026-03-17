import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('id, name, sale_price, ifood_fee_percent, tax_percent, packaging_cost, cutlery_cost')
      .order('name');

    if (mealsError) return NextResponse.json({ error: mealsError.message }, { status: 500 });

    const [
      { data: allComps },
      { data: allDisposables },
      { data: allSheetIngredients },
      { data: allRawMaterials },
      { data: allSheets },
      { data: allMealDisposables },
      { data: allDisposableItems },
    ] = await Promise.all([
      supabase.from('meal_compositions').select('meal_id, menu_component_id, quantity'),
      supabase.from('meal_disposables').select('meal_id, disposable_id, quantity'),
      supabase.from('technical_sheet_ingredients').select('technical_sheet_id, raw_material_id, quantity, gain_coefficient, loss_coefficient'),
      supabase.from('raw_materials').select('id, purchase_price, conversion_factor'),
      supabase.from('technical_sheets').select('id, yield'),
      supabase.from('meal_disposables').select('meal_id, disposable_id, quantity'),
      supabase.from('disposables').select('id, name, unit, unit_cost, category'),
    ]);

    const mealsWithDetails = (meals || []).map((meal: any) => {
      const components = (allComps || [])
        .filter((mc: any) => mc.meal_id === meal.id)
        .map((mc: any) => ({ technical_sheet_id: mc.menu_component_id, quantity: mc.quantity }));

      const disposables = (allMealDisposables || [])
        .filter((md: any) => md.meal_id === meal.id)
        .map((md: any) => {
          const d = (allDisposableItems || []).find((di: any) => di.id === md.disposable_id);
          return d ? { disposable_id: md.disposable_id, quantity: md.quantity, name: d.name, unit: d.unit, unit_cost: d.unit_cost, category: d.category } : null;
        })
        .filter(Boolean);

      // Calculate total_food_cost
      let total_food_cost = 0;
      for (const comp of components) {
        const sheetIngredients = (allSheetIngredients || []).filter((tsi: any) => tsi.technical_sheet_id === comp.technical_sheet_id);
        const sheet = (allSheets || []).find((s: any) => s.id === comp.technical_sheet_id);
        const sheetYield = sheet?.yield || 1;
        let sheetCost = 0;
        for (const ing of sheetIngredients) {
          const rm = (allRawMaterials || []).find((r: any) => r.id === ing.raw_material_id);
          if (rm?.conversion_factor) {
            sheetCost += ((ing.quantity / (ing.gain_coefficient || 1)) * (ing.loss_coefficient || 1) * (rm.purchase_price / rm.conversion_factor));
          }
        }
        total_food_cost += (sheetCost / sheetYield) * comp.quantity;
      }

      // packaging_cost from meal_disposables
      const packaging_cost = (allMealDisposables || [])
        .filter((md: any) => md.meal_id === meal.id)
        .reduce((sum: number, md: any) => {
          const d = (allDisposableItems || []).find((di: any) => di.id === md.disposable_id);
          return sum + (d ? md.quantity * d.unit_cost : 0);
        }, 0);

      return { ...meal, total_food_cost, packaging_cost, components, disposables };
    });

    return NextResponse.json(mealsWithDetails);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar cardápio' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, components, disposables } = body;

    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .insert({ name, sale_price: 0, ifood_fee_percent: 0, tax_percent: 0, packaging_cost: 0, cutlery_cost: 0 })
      .select()
      .single();

    if (mealError) return NextResponse.json({ error: mealError.message }, { status: 500 });

    const mealId = meal.id;

    if (components && components.length > 0) {
      const { error: compError } = await supabase.from('meal_compositions').insert(
        components.map((comp: any) => ({ meal_id: mealId, menu_component_id: comp.technical_sheet_id, quantity: comp.quantity }))
      );
      if (compError) return NextResponse.json({ error: compError.message }, { status: 500 });
    }

    if (disposables && disposables.length > 0) {
      const { error: dispError } = await supabase.from('meal_disposables').insert(
        disposables.map((d: any) => ({ meal_id: mealId, disposable_id: d.disposable_id, quantity: d.quantity }))
      );
      if (dispError) return NextResponse.json({ error: dispError.message }, { status: 500 });
    }

    return NextResponse.json({ id: mealId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao cadastrar meal' }, { status: 500 });
  }
}
