import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const RUBRICA_CATEGORY: Record<string, string> = {
  salario:          'Mão de Obra',
  horas_extras:     'Mão de Obra',
  decimo_terceiro:  'Mão de Obra',
  ferias:           'Mão de Obra',
  vale_transporte:  'Mão de Obra',
  cesta_basica:     'Mão de Obra',
  plano_saude:      'Mão de Obra',
  auxilio_familia:  'Mão de Obra',
  vale_alimentacao: 'Mão de Obra',
};

const RUBRICA_LABEL: Record<string, string> = {
  salario:          'Salário',
  horas_extras:     'Horas Extras',
  decimo_terceiro:  '13º Salário',
  ferias:           'Férias + 1/3',
  vale_transporte:  'Vale Transporte',
  cesta_basica:     'Cesta Básica',
  plano_saude:      'Plano de Saúde',
  auxilio_familia:  'Auxílio Família',
  vale_alimentacao: 'Vale Alimentação',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employee_name, employee_id, competencia, rubricas } = body;

    if (!employee_name || !rubricas || !competencia) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const toInsert: any[] = [];
    for (const [key, value] of Object.entries(rubricas)) {
      const val = parseFloat(value as string) || 0;
      if (val <= 0) continue;

      const label = RUBRICA_LABEL[key] || key;
      const category = RUBRICA_CATEGORY[key] || 'Mão de Obra';
      const name = `${label} — ${employee_name} (${competencia})`;
      toInsert.push({ name, category, value: val, period: 'Mensal', employee_id });
    }

    const { data, error } = await supabase.from('expenses').insert(toInsert).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const inserted = (data || []).map((r: any) => r.id);
    return NextResponse.json({ success: true, inserted });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao lançar folha' }, { status: 500 });
  }
}
