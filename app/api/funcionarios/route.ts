import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .order('name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(employees);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar funcionários' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, role, cpf, rg, pis, ctps_number, ctps_serie,
      admission_date, base_salary, transport_voucher, meal_voucher,
      health_plan, work_schedule, bank, bank_agency, bank_account,
      bank_pix, emergency_contact_name, emergency_contact_phone, address, notes
    } = body;

    if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });

    const { data, error } = await supabase
      .from('employees')
      .insert({
        name, role: role || 'Auxiliar',
        cpf: cpf || null, rg: rg || null, pis: pis || null,
        ctps_number: ctps_number || null, ctps_serie: ctps_serie || null,
        admission_date: admission_date || null,
        base_salary: base_salary || 0,
        transport_voucher: transport_voucher || 0,
        meal_voucher: meal_voucher || 0,
        health_plan: health_plan || 0,
        work_schedule: work_schedule || '08:00-17:00',
        bank: bank || null, bank_agency: bank_agency || null,
        bank_account: bank_account || null, bank_pix: bank_pix || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        address: address || null, notes: notes || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id, success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar funcionário' }, { status: 500 });
  }
}
