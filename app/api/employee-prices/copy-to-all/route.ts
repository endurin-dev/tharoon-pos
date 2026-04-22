import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST: Copy all price overrides from one employee to ALL other employees
export async function POST(req: NextRequest) {
  try {
    const { source_employee_id } = await req.json();
    if (!source_employee_id) {
      return NextResponse.json({ error: 'source_employee_id අවශ්‍යයි' }, { status: 400 });
    }

    // Get all overrides for the source employee
    const overrides = await query(
      'SELECT item_id, cost_price, selling_price FROM employee_item_prices WHERE employee_id = $1',
      [source_employee_id]
    );

    if (!overrides.length) {
      return NextResponse.json({ error: 'මෙම සේවකයාට විශේෂ මිල ගණන් නොමැත' }, { status: 400 });
    }

    // Get all other employees
    const otherEmployees = await query(
      'SELECT id FROM employees WHERE id != $1',
      [source_employee_id]
    );

    if (!otherEmployees.length) {
      return NextResponse.json({ error: 'වෙනත් සේවකයන් නොමැත' }, { status: 400 });
    }

    // Bulk upsert: for every other employee, apply all source overrides
    for (const emp of otherEmployees) {
      for (const o of overrides) {
        await query(`
          INSERT INTO employee_item_prices (employee_id, item_id, cost_price, selling_price)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (employee_id, item_id) DO UPDATE SET
            cost_price = EXCLUDED.cost_price,
            selling_price = EXCLUDED.selling_price
        `, [emp.id, o.item_id, o.cost_price, o.selling_price]);
      }
    }

    return NextResponse.json({
      success: true,
      employees_updated: otherEmployees.length,
      prices_copied: overrides.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}