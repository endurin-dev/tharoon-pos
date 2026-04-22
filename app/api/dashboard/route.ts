import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // 1. Sales by employee for the day
    const salesByEmployee = await query(`
      SELECT 
        e.name as employee_name,
        v.vehicle_number,
        s.session_type,
        s.payment_status,
        COALESCE(s.total_cost, 0) as total_cost,
        COALESCE(s.total_selling, 0) as total_selling,
        COALESCE(s.total_selling, 0) - COALESCE(s.total_cost, 0) as profit
      FROM issue_sessions s
      JOIN employees e ON e.id = s.employee_id
      LEFT JOIN vehicles v ON v.id = s.vehicle_id
      WHERE s.session_date = $1
      ORDER BY s.total_selling DESC NULLS LAST
    `, [date]);

    // 2. Items sold count by category for the day
    const soldByCategory = await query(`
      SELECT 
        c.name as category_name,
        c.sort_order,
        SUM(ii.morning_qty + ii.evening_qty - ii.returned_qty) as total_sold,
        SUM(ii.total_selling) as total_selling,
        SUM(ii.total_cost) as total_cost
      FROM issue_sessions s
      JOIN issue_items ii ON ii.session_id = s.id
      JOIN items i ON i.id = ii.item_id
      JOIN categories c ON c.id = i.category_id
      WHERE s.session_date = $1
      GROUP BY c.id, c.name, c.sort_order
      ORDER BY c.sort_order
    `, [date]);

    // 3. Top items sold today
    const topItems = await query(`
      SELECT 
        i.name as item_name,
        c.name as category_name,
        SUM(ii.morning_qty + ii.evening_qty - ii.returned_qty) as total_sold,
        SUM(ii.total_selling) as total_selling
      FROM issue_sessions s
      JOIN issue_items ii ON ii.session_id = s.id
      JOIN items i ON i.id = ii.item_id
      JOIN categories c ON c.id = i.category_id
      WHERE s.session_date = $1
      GROUP BY i.id, i.name, c.name
      ORDER BY total_sold DESC
      LIMIT 10
    `, [date]);

    // 4. Day totals summary
    const dayTotals = await query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(DISTINCT s.employee_id) as total_employees,
        COALESCE(SUM(s.total_cost), 0) as grand_cost,
        COALESCE(SUM(s.total_selling), 0) as grand_selling,
        COUNT(CASE WHEN s.payment_status = 'paid' THEN 1 END) as paid_sessions,
        COUNT(CASE WHEN s.payment_status = 'unpaid' THEN 1 END) as unpaid_sessions,
        COALESCE(SUM(CASE WHEN s.payment_status = 'unpaid' THEN s.total_selling ELSE 0 END), 0) as unpaid_amount
      FROM issue_sessions s
      WHERE s.session_date = $1
    `, [date]);

    // 5. Morning vs Evening breakdown
    const sessionBreakdown = await query(`
      SELECT
        SUM(ii.morning_qty) as total_morning,
        SUM(ii.evening_qty) as total_evening,
        SUM(ii.returned_qty) as total_returned,
        SUM(ii.morning_qty + ii.evening_qty - ii.returned_qty) as total_net_sold
      FROM issue_sessions s
      JOIN issue_items ii ON ii.session_id = s.id
      WHERE s.session_date = $1
    `, [date]);

    return NextResponse.json({
      date,
      salesByEmployee,
      soldByCategory,
      topItems,
      dayTotals: dayTotals[0] || {},
      sessionBreakdown: sessionBreakdown[0] || {},
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
