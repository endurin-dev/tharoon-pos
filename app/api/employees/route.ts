import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM employees WHERE is_active=true ORDER BY name');
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, nic, contact } = await req.json();
    const row = await queryOne(
      'INSERT INTO employees (name, nic, contact) VALUES ($1,$2,$3) RETURNING *',
      [name, nic, contact]
    );
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, name, nic, contact, is_active } = await req.json();
    const row = await queryOne(
      'UPDATE employees SET name=$1, nic=$2, contact=$3, is_active=$4 WHERE id=$5 RETURNING *',
      [name, nic, contact, is_active, id]
    );
    return NextResponse.json(row);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await query('UPDATE employees SET is_active=false WHERE id=$1', [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
