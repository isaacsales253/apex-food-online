import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function deriveConvertedUnit(purchaseUnit: string): string {
  const map: Record<string, string> = {
    'kg': 'g',
    'l': 'ml',
    'litro': 'ml',
    'litros': 'ml',
    'dúzia': 'un',
    'duzia': 'un',
  };
  return map[purchaseUnit.toLowerCase()] || purchaseUnit;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
    }

    const toInsert = items.map((item: any) => {
      const pu = item.purchase_unit || 'un';
      return {
        name: item.name,
        category: item.category || 'Materia-prima',
        purchase_price: 0,
        purchase_unit: pu,
        conversion_factor: item.conversion_factor || 1,
        converted_unit: deriveConvertedUnit(pu),
      };
    });

    const { error } = await supabase.from('raw_materials').insert(toInsert);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Erro ao importar insumos' }, { status: 500 });
  }
}
