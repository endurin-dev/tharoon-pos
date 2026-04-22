import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query(`
      SELECT v.*, e.name as employee_name 
      FROM vehicles v 
      LEFT JOIN employees e ON e.id = v.employee_id
      WHERE v.is_active=true ORDER BY v.vehicle_number
    `);
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { vehicle_number, employee_id } = await req.json();
    const row = await queryOne(
      'INSERT INTO vehicles (vehicle_number, employee_id) VALUES ($1,$2) RETURNING *',
      [vehicle_number, employee_id || null]
    );
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, vehicle_number, employee_id, is_active } = await req.json();
    const row = await queryOne(
      'UPDATE vehicles SET vehicle_number=$1, employee_id=$2, is_active=$3 WHERE id=$4 RETURNING *',
      [vehicle_number, employee_id || null, is_active, id]
    );
    return NextResponse.json(row);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await query('UPDATE vehicles SET is_active=false WHERE id=$1', [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
