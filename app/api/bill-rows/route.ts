import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// GET: fetch all bill rows for a session
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return NextResponse.json({ error: 'session_id අවශ්‍යයි' }, { status: 400 });

    const rows = await query(
      'SELECT * FROM issue_bill_rows WHERE session_id = $1 ORDER BY sort_order, id',
      [sessionId]
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: upsert a bill row
export async function POST(req: NextRequest) {
  try {
    const { session_id, id, description, qty, amount, sort_order } = await req.json();
    if (!session_id || !description) {
      return NextResponse.json({ error: 'session_id සහ description අවශ්‍යයි' }, { status: 400 });
    }
    let row;
    if (id) {
      row = await queryOne(
        `UPDATE issue_bill_rows SET description=$1, qty=$2, amount=$3, sort_order=$4
         WHERE id=$5 AND session_id=$6 RETURNING *`,
        [description, qty ?? 1, amount ?? 0, sort_order ?? 0, id, session_id]
      );
    } else {
      row = await queryOne(
        `INSERT INTO issue_bill_rows (session_id, description, qty, amount, sort_order)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [session_id, description, qty ?? 1, amount ?? 0, sort_order ?? 0]
      );
    }
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: remove a bill row
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await query('DELETE FROM issue_bill_rows WHERE id=$1', [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}