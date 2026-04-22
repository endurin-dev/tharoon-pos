import { NextRequest, NextResponse } from 'next/server';

// Simple password check - password stored in env var ADMIN_PASSWORD
// Falls back to "admin123" if not set (remind user to set it)
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (password === adminPassword) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'වැරදි මුරපදය' }, { status: 401 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
