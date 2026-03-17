import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: items, error } = await supabase
      .from('maintenances')
      .select('*, furniture(name), suppliers(name)')
      .eq('furniture_id', id)
      .order('maintenance_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const mapped = (items || []).map((m: any) => ({
      ...m,
      furniture_name: m.furniture?.name || null,
      supplier_name: m.suppliers?.name || null,
      furniture: undefined,
      suppliers: undefined,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar manutenções' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { description, type, cost, maintenance_date, technician, supplier_id } = body;

    if (!supplier_id) {
      return NextResponse.json({ error: 'Selecione um fornecedor para registrar a manutenção.' }, { status: 400 });
    }

    const { data: furniture, error: furnitureError } = await supabase
      .from('furniture')
      .select('*')
      .eq('id', id)
      .single();

    if (furnitureError || !furniture) return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 });

    // Create expense
    const expenseName = `Manutenção - ${furniture.name} (${type})`;
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({ name: expenseName, category: 'Equipamento', value: cost, period: 'Avulso' })
      .select()
      .single();

    if (expenseError || !expense) return NextResponse.json({ error: expenseError?.message || 'Erro ao criar despesa' }, { status: 500 });

    // Create maintenance record
    const { data: maintenance, error: maintenanceError } = await supabase
      .from('maintenances')
      .insert({
        furniture_id: id,
        description, type, cost, maintenance_date,
        technician: technician || null,
        supplier_id,
        expense_id: expense.id,
      })
      .select()
      .single();

    if (maintenanceError || !maintenance) return NextResponse.json({ error: maintenanceError?.message || 'Erro ao criar manutenção' }, { status: 500 });

    return NextResponse.json({ success: true, maintenanceId: maintenance.id, expenseId: expense.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar manutenção' }, { status: 500 });
  }
}
