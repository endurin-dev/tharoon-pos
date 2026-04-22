import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import pool from '@/lib/db';

export async function POST() {
  const client = await pool.connect();
  try {
    const sql = readFileSync(join(process.cwd(), 'lib/schema.sql'), 'utf8');
    await client.query(sql);
    return NextResponse.json({ success: true, message: 'Database initialized successfully' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    client.release();
  }
}
