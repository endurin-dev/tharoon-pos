import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const employeeId = searchParams.get('employee_id');
    const sessionId = searchParams.get('session_id');

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

    const rows = await query(`
      SELECT s.*, e.name as employee_name, v.vehicle_number,
             COALESCE((
               SELECT SUM((ii.morning_qty - ii.morning_returned_qty + ii.evening_qty - ii.returned_qty) * ii.cost_price)
               FROM issue_items ii
               WHERE ii.session_id = s.id
             ), 0) as summary_total_cost,
             COALESCE((
               SELECT SUM((ii.morning_qty - ii.morning_returned_qty + ii.evening_qty - ii.returned_qty) * ii.selling_price)
               FROM issue_items ii
               WHERE ii.session_id = s.id
             ), 0) as summary_total_selling,
             COALESCE((
               SELECT SUM(br.qty * br.amount)
               FROM issue_bill_rows br
               WHERE br.session_id = s.id
             ), 0) as bill_rows_total
      FROM issue_sessions s
      JOIN employees e ON e.id = s.employee_id
      LEFT JOIN vehicles v ON v.id = s.vehicle_id
      ${date ? 'WHERE s.session_date=$1' : ''}
      ORDER BY s.session_date DESC, e.name
    `, date ? [date] : []);

    return NextResponse.json(rows);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'සැසි තොරතුරු ලබාගත නොහැක';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = Number(body.session_id);
    const paymentStatus = body.payment_status;

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: 'වලංගු සැසි අංකයක් අවශ්‍යයි' }, { status: 400 });
    }
    if (paymentStatus !== 'paid' && paymentStatus !== 'unpaid') {
      return NextResponse.json({ error: 'වලංගු ගෙවීම් තත්ත්වයක් තෝරන්න' }, { status: 400 });
    }

    const session = await queryOne<{ id: number; payment_status: string }>(
      `UPDATE issue_sessions
       SET payment_status=$1, updated_at=NOW()
       WHERE id=$2
       RETURNING id, payment_status`,
      [paymentStatus, sessionId]
    );
    if (!session) {
      return NextResponse.json({ error: 'සැසිය හමු නොවීය' }, { status: 404 });
    }

    return NextResponse.json({ success: true, session });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'ගෙවීම් තත්ත්වය යාවත්කාලීන කළ නොහැක';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { session, items } = await req.json();
    const extraSource = session.extra_source === 'sale' ? 'sale' : 'commission';
    await client.query(
      `ALTER TABLE issue_sessions
       ADD COLUMN IF NOT EXISTS extra_source VARCHAR(20) NOT NULL DEFAULT 'commission'`
    );
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM issue_sessions WHERE session_date=$1 AND employee_id=$2',
      [session.session_date, session.employee_id]
    );

    let sessionId: number;
    if (existing.rows.length > 0) {
      sessionId = existing.rows[0].id;
      await client.query(
        `UPDATE issue_sessions SET vehicle_id=$1, session_type=$2, payment_status=$3,
         extra_source=$4, updated_at=NOW() WHERE id=$5`,
        [session.vehicle_id || null, session.session_type, session.payment_status, extraSource, sessionId]
      );
    } else {
      const res = await client.query(
        `INSERT INTO issue_sessions
           (session_date, employee_id, vehicle_id, session_type, payment_status, extra_source)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [
          session.session_date, session.employee_id, session.vehicle_id || null,
          session.session_type, session.payment_status || 'unpaid', extraSource,
        ]
      );
      sessionId = res.rows[0].id;
    }

    for (const item of items) {
      if (
        item.morning_qty === 0 && item.morning_returned_qty === 0 &&
        item.evening_qty === 0 && item.returned_qty === 0
      ) continue;

      await client.query(
        `INSERT INTO issue_items
           (session_id, item_id, morning_qty, morning_returned_qty, evening_qty, returned_qty, cost_price, selling_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (session_id, item_id) DO UPDATE SET
           morning_qty=$3, morning_returned_qty=$4, evening_qty=$5,
           returned_qty=$6, cost_price=$7, selling_price=$8`,
        [
          sessionId, item.item_id,
          item.morning_qty || 0, item.morning_returned_qty || 0,
          item.evening_qty || 0, item.returned_qty || 0,
          item.cost_price, item.selling_price,
        ]
      );
    }

    await client.query(`
      UPDATE issue_sessions s SET
        total_cost = (
          SELECT COALESCE(SUM((morning_qty - morning_returned_qty + evening_qty - returned_qty) * cost_price), 0)
          FROM issue_items WHERE session_id=s.id
        ),
        total_selling = (
          SELECT COALESCE(SUM((morning_qty - morning_returned_qty + evening_qty - returned_qty) * selling_price), 0)
          FROM issue_items WHERE session_id=s.id
        )
      WHERE s.id=$1
    `, [sessionId]);

    await client.query('COMMIT');

    const updatedSession = await queryOne('SELECT * FROM issue_sessions WHERE id=$1', [sessionId]);
    return NextResponse.json({ success: true, session: updatedSession, session_id: sessionId });
  } catch (e: unknown) {
    await client.query('ROLLBACK');
    const message = e instanceof Error ? e.message : 'සැසිය සුරැකිය නොහැක';
    return NextResponse.json({ error: message }, { status: 500 });
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'සැසිය මකාදැමිය නොහැක';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}