import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const employeeId = searchParams.get('employee_id');
    const sessionId = searchParams.get('session_id');

    // Get session with items
    if (sessionId) {
      const session = await queryOne('SELECT * FROM issue_sessions WHERE id=$1', [sessionId]);
      if (!session) return NextResponse.json({ session: null, items: [] });

      const items = await query(`
        SELECT ii.*, i.name as item_name, i.category_id,
               c.name as category_name
        FROM issue_items ii
        JOIN items i ON i.id = ii.item_id
        JOIN categories c ON c.id = i.category_id
        WHERE ii.session_id=$1
        ORDER BY c.sort_order, i.sort_order
      `, [sessionId]);

      return NextResponse.json({ session, items });
    }

    // Get session by date + employee
    if (date && employeeId) {
      const session = await queryOne(
        'SELECT * FROM issue_sessions WHERE session_date=$1 AND employee_id=$2',
        [date, employeeId]
      );

      if (!session) return NextResponse.json({ session: null, items: [] });

      const items = await query(`
        SELECT ii.*, i.name as item_name, i.category_id,
               c.name as category_name
        FROM issue_items ii
        JOIN items i ON i.id = ii.item_id
        JOIN categories c ON c.id = i.category_id
        WHERE ii.session_id=$1
        ORDER BY c.sort_order, i.sort_order
      `, [session.id]);

      return NextResponse.json({ session, items });
    }

    // List sessions
    const rows = await query(`
      SELECT s.*, e.name as employee_name, v.vehicle_number
      FROM issue_sessions s
      JOIN employees e ON e.id = s.employee_id
      LEFT JOIN vehicles v ON v.id = s.vehicle_id
      ${date ? 'WHERE s.session_date=$1' : ''}
      ORDER BY s.session_date DESC, e.name
    `, date ? [date] : []);

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { session, items } = await req.json();
    await client.query('BEGIN');

    // Upsert session
    const existing = await client.query(
      'SELECT id FROM issue_sessions WHERE session_date=$1 AND employee_id=$2',
      [session.session_date, session.employee_id]
    );

    let sessionId: number;
    if (existing.rows.length > 0) {
      sessionId = existing.rows[0].id;
      await client.query(
        `UPDATE issue_sessions SET vehicle_id=$1, session_type=$2, payment_status=$3, updated_at=NOW()
         WHERE id=$4`,
        [session.vehicle_id || null, session.session_type, session.payment_status, sessionId]
      );
    } else {
      const res = await client.query(
        `INSERT INTO issue_sessions (session_date, employee_id, vehicle_id, session_type, payment_status)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [session.session_date, session.employee_id, session.vehicle_id || null, session.session_type, session.payment_status || 'unpaid']
      );
      sessionId = res.rows[0].id;
    }

    // Upsert items
    for (const item of items) {
      if (item.morning_qty === 0 && item.evening_qty === 0 && item.returned_qty === 0) continue;
      await client.query(
        `INSERT INTO issue_items (session_id, item_id, morning_qty, evening_qty, returned_qty, cost_price, selling_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (session_id, item_id) DO UPDATE SET
           morning_qty=$3, evening_qty=$4, returned_qty=$5, cost_price=$6, selling_price=$7`,
        [sessionId, item.item_id, item.morning_qty || 0, item.evening_qty || 0, item.returned_qty || 0, item.cost_price, item.selling_price]
      );
    }

    // Recalculate totals
    await client.query(`
      UPDATE issue_sessions s SET
        total_cost = (SELECT COALESCE(SUM(total_cost),0) FROM issue_items WHERE session_id=s.id),
        total_selling = (SELECT COALESCE(SUM(total_selling),0) FROM issue_items WHERE session_id=s.id)
      WHERE s.id=$1
    `, [sessionId]);

    await client.query('COMMIT');

    const updatedSession = await queryOne('SELECT * FROM issue_sessions WHERE id=$1', [sessionId]);
    return NextResponse.json({ success: true, session: updatedSession });
  } catch (e: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { session_id, item_id } = await req.json();
    if (item_id) {
      await query('DELETE FROM issue_items WHERE session_id=$1 AND item_id=$2', [session_id, item_id]);
    } else {
      await query('DELETE FROM issue_sessions WHERE id=$1', [session_id]);
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
