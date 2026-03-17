import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: rows, error } = await supabase
      .from('expenses')
      .select('id, name, value, created_at')
      .eq('employee_id', id)
      .eq('category', 'Mão de Obra')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ groups: [], grandTotal: 0, count: 0 });

    const parsed = (rows || []).map(r => {
      const match = r.name.match(/^(.+?)\s*—\s*.+?\((.+?)\)$/);
      return {
        id: r.id,
        name: r.name,
        rubrica: match ? match[1].trim() : r.name,
        competencia: match ? match[2].trim() : '—',
        value: r.value,
        created_at: r.created_at,
      };
    });

    const groups: Record<string, { competencia: string; itens: typeof parsed; total: number }> = {};
    for (const p of parsed) {
      if (!groups[p.competencia]) {
        groups[p.competencia] = { competencia: p.competencia, itens: [], total: 0 };
      }
      groups[p.competencia].itens.push(p);
      groups[p.competencia].total += p.value;
    }

    const sorted = Object.values(groups).sort((a, b) => {
      const [ma, ya] = a.competencia.split('/').map(Number);
      const [mb, yb] = b.competencia.split('/').map(Number);
      return (yb * 12 + mb) - (ya * 12 + ma);
    });

    const grandTotal = (rows || []).reduce((acc, r) => acc + r.value, 0);
    return NextResponse.json({ groups: sorted, grandTotal, count: (rows || []).length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ groups: [], grandTotal: 0, count: 0 });
  }
}
