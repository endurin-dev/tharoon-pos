import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// GET: Fetch all item prices for a specific employee
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employee_id');
    if (!employeeId) return NextResponse.json({ error: 'employee_id අවශ්‍යයි' }, { status: 400 });

    // Return all items with employee-specific overrides merged in
    const rows = await query(`
      SELECT 
        i.id as item_id,
        i.name as item_name,
        c.name as category_name,
        c.sort_order as category_sort,
        i.sort_order as item_sort,
        i.cost_price as default_cost,
        i.selling_price as default_selling,
        COALESCE(ep.cost_price, i.cost_price) as cost_price,
        COALESCE(ep.selling_price, i.selling_price) as selling_price,
        ep.id as price_override_id
      FROM items i
      JOIN categories c ON c.id = i.category_id
      LEFT JOIN employee_item_prices ep ON ep.item_id = i.id AND ep.employee_id = $1
      WHERE i.is_active = true
      ORDER BY c.sort_order, i.sort_order
    `, [employeeId]);

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Upsert employee item price
export async function POST(req: NextRequest) {
  try {
    const { employee_id, item_id, cost_price, selling_price } = await req.json();
    const row = await queryOne(`
      INSERT INTO employee_item_prices (employee_id, item_id, cost_price, selling_price)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (employee_id, item_id) DO UPDATE SET
        cost_price = $3, selling_price = $4
      RETURNING *
    `, [employee_id, item_id, cost_price, selling_price]);
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: Remove an employee's price override (reverts to default)
export async function DELETE(req: NextRequest) {
  try {
    const { employee_id, item_id } = await req.json();
    await query(
      'DELETE FROM employee_item_prices WHERE employee_id=$1 AND item_id=$2',
      [employee_id, item_id]
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
