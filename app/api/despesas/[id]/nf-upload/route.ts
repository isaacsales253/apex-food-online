import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

// ── POST: upload a PDF file for this expense's NF ────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Apenas PDF, JPG ou PNG são permitidos' }, { status: 400 });
    }

    const extMap: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extMap[file.type] ?? '.pdf';

    // Ensure upload directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'nf');
    await mkdir(uploadsDir, { recursive: true });

    // Delete old file if exists
    const { data: existing } = await supabase.from('expenses').select('nf_file').eq('id', id).single();
    if (existing?.nf_file) {
      try {
        await unlink(path.join(uploadsDir, existing.nf_file));
      } catch {}
    }

    // Save new file with a unique name
    const filename = `nf-${id}-${Date.now()}${ext}`;
    const filepath = path.join(uploadsDir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Persist filename in the database
    const { error } = await supabase.from('expenses').update({ nf_file: filename }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao salvar arquivo' }, { status: 500 });
  }
}

// ── DELETE: remove the attached file ─────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: existing } = await supabase.from('expenses').select('nf_file').eq('id', id).single();
    if (existing?.nf_file) {
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'nf');
        await unlink(path.join(uploadsDir, existing.nf_file));
      } catch {}
    }

    const { error } = await supabase.from('expenses').update({ nf_file: null }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao remover arquivo' }, { status: 500 });
  }
}
