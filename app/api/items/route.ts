import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');
    const withCategories = searchParams.get('with_categories');

    if (withCategories) {
      const rows = await query(`
        SELECT c.id as category_id, c.name as category_name, c.sort_order as category_sort,
               i.id, i.name, i.cost_price, i.selling_price, i.is_active, i.sort_order
        FROM categories c
        LEFT JOIN items i ON i.category_id = c.id AND i.is_active = true
        ORDER BY c.sort_order, c.name, i.sort_order, i.name
      `);
      return NextResponse.json(rows);
    }

    if (categoryId) {
      const rows = await query(
        'SELECT * FROM items WHERE category_id=$1 AND is_active=true ORDER BY sort_order, name',
        [categoryId]
      );
      return NextResponse.json(rows);
    }

    const rows = await query('SELECT * FROM items WHERE is_active=true ORDER BY category_id, sort_order, name');
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { category_id, name, cost_price, selling_price, sort_order = 0 } = await req.json();
    const row = await queryOne(
      'INSERT INTO items (category_id, name, cost_price, selling_price, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [category_id, name, cost_price, selling_price, sort_order]
    );
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, category_id, name, cost_price, selling_price, sort_order, is_active } = await req.json();
    const row = await queryOne(
      `UPDATE items SET category_id=$1, name=$2, cost_price=$3, selling_price=$4, 
       sort_order=$5, is_active=$6 WHERE id=$7 RETURNING *`,
      [category_id, name, cost_price, selling_price, sort_order, is_active, id]
    );
    return NextResponse.json(row);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await query('UPDATE items SET is_active=false WHERE id=$1', [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
