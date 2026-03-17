import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: logs, error: logsError } = await supabase
      .from('production_logs')
      .select('id, technical_sheet_name, quantity_produced, yield_unit, notes, produced_at')
      .order('produced_at', { ascending: false })
      .limit(50);

    if (logsError) return NextResponse.json({ error: logsError.message }, { status: 500 });

    const { data: allItems } = await supabase
      .from('production_log_items')
      .select('production_log_id, raw_material_name, quantity_deducted, purchase_unit');

    const logsWithItems = (logs || []).map((log: any) => {
      const items = (allItems || []).filter((item: any) => item.production_log_id === log.id);
      return { ...log, items };
    });

    return NextResponse.json(logsWithItems);
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao buscar histórico de produção' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { technical_sheet_id, quantity_produced, notes, produced_at } = body;

    if (!quantity_produced || quantity_produced <= 0) {
      return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 });
    }

    // Manual production (no sheet)
    if (!technical_sheet_id) {
      const manual_items: any[] = body.manual_items || [];
      if (manual_items.length === 0) return NextResponse.json({ error: 'Nenhum item informado' }, { status: 400 });

      const { data: log, error: logError } = await supabase
        .from('production_logs')
        .insert({
          technical_sheet_name: 'Avulsa',
          quantity_produced,
          yield_unit: 'un',
          notes: notes || null,
          produced_at: produced_at || new Date().toISOString(),
        })
        .select()
        .single();

      if (logError || !log) return NextResponse.json({ error: logError?.message || 'Erro ao criar log' }, { status: 500 });
      const logId = log.id;

      for (const item of manual_items) {
        await supabase.from('production_log_items').insert({
          production_log_id: logId,
          raw_material_id: item.raw_material_id || null,
          raw_material_name: item.raw_material_name,
          quantity_deducted: item.quantity_deducted,
          purchase_unit: item.purchase_unit,
        });

        if (item.raw_material_id) {
          const { data: rm } = await supabase.from('raw_materials').select('stock_quantity').eq('id', item.raw_material_id).single();
          if (rm) {
            await supabase.from('raw_materials')
              .update({ stock_quantity: Math.max(0, (rm.stock_quantity || 0) - item.quantity_deducted) })
              .eq('id', item.raw_material_id);
          }
        }
      }

      return NextResponse.json({ success: true, id: logId });
    }

    // Recipe-based production
    const { data: sheet, error: sheetError } = await supabase
      .from('technical_sheets')
      .select('id, name, yield, yield_unit')
      .eq('id', technical_sheet_id)
      .single();

    if (sheetError || !sheet) return NextResponse.json({ error: 'Ficha técnica não encontrada' }, { status: 404 });

    const { data: ingredients } = await supabase
      .from('technical_sheet_ingredients')
      .select('raw_material_id, quantity, loss_coefficient, gain_coefficient, raw_materials(name, purchase_unit, conversion_factor, stock_quantity)')
      .eq('technical_sheet_id', technical_sheet_id);

    const multiplier = quantity_produced / (sheet.yield || 1);

    const deductions = (ingredients || []).map((ing: any) => {
      const deductConverted = ing.quantity * multiplier * ((ing.loss_coefficient || 1) / (ing.gain_coefficient || 1));
      const deductPurchase = deductConverted / ((ing.raw_materials?.conversion_factor) || 1);
      return {
        raw_material_id: ing.raw_material_id,
        raw_material_name: ing.raw_materials?.name || '',
        quantity_deducted: deductPurchase,
        purchase_unit: ing.raw_materials?.purchase_unit || '',
        stock_quantity: ing.raw_materials?.stock_quantity || 0,
      };
    });

    const { data: log, error: logError } = await supabase
      .from('production_logs')
      .insert({
        technical_sheet_id,
        technical_sheet_name: sheet.name,
        quantity_produced,
        yield_unit: sheet.yield_unit || 'un',
        notes: notes || null,
        produced_at: produced_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (logError || !log) return NextResponse.json({ error: logError?.message || 'Erro ao criar log' }, { status: 500 });
    const logId = log.id;

    for (const d of deductions) {
      await supabase.from('production_log_items').insert({
        production_log_id: logId,
        raw_material_id: d.raw_material_id,
        raw_material_name: d.raw_material_name,
        quantity_deducted: d.quantity_deducted,
        purchase_unit: d.purchase_unit,
      });

      const { data: rm } = await supabase.from('raw_materials').select('stock_quantity').eq('id', d.raw_material_id).single();
      if (rm) {
        await supabase.from('raw_materials')
          .update({ stock_quantity: Math.max(0, (rm.stock_quantity || 0) - d.quantity_deducted) })
          .eq('id', d.raw_material_id);
      }
    }

    return NextResponse.json({ success: true, deductions });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao registrar produção' }, { status: 500 });
  }
}
