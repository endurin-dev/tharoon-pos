export interface Category {
  id: number;
  name: string;
  sort_order: number;
}

export interface Item {
  id: number;
  category_id: number;
  name: string;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
  sort_order: number;
}

export interface Employee {
  id: number;
  name: string;
  nic: string;
  contact: string;
  is_active: boolean;
}

export interface Vehicle {
  id: number;
  vehicle_number: string;
  employee_id: number | null;
  employee_name?: string;
  is_active: boolean;
}

export interface EmployeeItemPrice {
  id: number;
  employee_id: number;
  item_id: number;
  cost_price: number | null;
  selling_price: number | null;
}

export interface IssueSession {
  id: number;
  session_date: string;
  employee_id: number;
  vehicle_id: number | null;
  session_type: 'morning' | 'full_day';
  payment_status: 'paid' | 'unpaid';
  total_cost: number;
  total_selling: number;
  notes: string;
}

export interface IssueItem {
  id: number;
  session_id: number;
  item_id: number;
  morning_qty: number;
  evening_qty: number;
  returned_qty: number;
  cost_price: number;
  selling_price: number;
  total_cost: number;
  total_selling: number;
}

export interface CategoryWithItems extends Category {
  items: ItemWithEntry[];
}

export interface ItemWithEntry extends Item {
  morning_qty: number;
  evening_qty: number;
  returned_qty: number;
  effective_cost: number;
  effective_selling: number;
  issue_item_id?: number;
}

export interface BillRow {
  id?: number;
  session_id?: number;
  description: string;
  qty: number;
  amount: number;
  sort_order: number;
}