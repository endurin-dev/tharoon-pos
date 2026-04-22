-- බේකරි කළමනාකරණ පද්ධතිය - දත්ත සමුදා ව්‍යූහය

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  nic VARCHAR(50) UNIQUE,
  contact VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  vehicle_number VARCHAR(50) NOT NULL UNIQUE,
  employee_id INT REFERENCES employees(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_item_prices (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  cost_price NUMERIC(10,2),
  selling_price NUMERIC(10,2),
  UNIQUE(employee_id, item_id)
);

CREATE TABLE IF NOT EXISTS issue_sessions (
  id SERIAL PRIMARY KEY,
  session_date DATE NOT NULL,
  employee_id INT NOT NULL REFERENCES employees(id),
  vehicle_id INT REFERENCES vehicles(id),
  session_type VARCHAR(20) NOT NULL DEFAULT 'full_day',
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  total_cost NUMERIC(10,2) DEFAULT 0,
  total_selling NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_date, employee_id)
);

CREATE TABLE IF NOT EXISTS issue_items (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES issue_sessions(id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES items(id),
  morning_qty INT DEFAULT 0,
  evening_qty INT DEFAULT 0,
  returned_qty INT DEFAULT 0,
  cost_price NUMERIC(10,2) NOT NULL,
  selling_price NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(10,2) GENERATED ALWAYS AS ((morning_qty + evening_qty - returned_qty) * cost_price) STORED,
  total_selling NUMERIC(10,2) GENERATED ALWAYS AS ((morning_qty + evening_qty - returned_qty) * selling_price) STORED,
  UNIQUE(session_id, item_id)
);

-- බීජ දත්ත (සිංහල)
INSERT INTO categories (name, sort_order) VALUES
  ('පාන්', 1),
  ('අර්ධ පාන්', 2),
  ('රොස්ට් පාන්', 3),
  ('මාළු කමෝ', 4),
  ('සීනි කමෝ', 5),
  ('පේස්ට්‍රි', 6),
  ('ඩ්‍රම් ස්ටික්', 7),
  ('වඩේ', 8)
ON CONFLICT DO NOTHING;

INSERT INTO items (category_id, name, cost_price, selling_price, sort_order) VALUES
  (1, 'තාටි පාන්', 0, 0, 1),
  (1, 'අච්චු පාන්', 0, 0, 2),
  (1, 'සැන්ඩ්විච් පාන්', 0, 0, 3),
  (2, 'අර්ධ පාන්', 104.00, 120.00, 1),
  (3, 'රොස්ට් පාන්', 67.00, 80.00, 1),
  (4, 'මාළු පාන්', 79.00, 100.00, 1),
  (4, 'සීනිසම්බාල් පාන්', 0, 0, 2),
  (4, 'බිත්තර පාන්', 0, 0, 3),
  (4, 'සාමන් පාන්', 0, 0, 4),
  (4, 'සොසේජස් පාන්', 0, 0, 5),
  (4, 'රෝල්ස්', 0, 0, 6),
  (4, 'ක්‍රීම් බන්', 0, 0, 7),
  (5, 'ජෑම් පාන්', 51.00, 70.00, 1),
  (5, 'කිඹුලා බන්', 0, 0, 2),
  (5, 'සීනි බන්', 45.00, 60.00, 3),
  (6, 'පේස්ට්‍රි', 45.00, 60.00, 1),
  (6, 'බර්ගර්', 0, 0, 2),
  (7, 'ඩ්‍රම් ස්ටික්', 76.00, 90.00, 1),
  (7, 'වඩේ', 92.00, 110.00, 2),
  (8, 'වඩේ', 50.00, 60.00, 1)
ON CONFLICT DO NOTHING;

INSERT INTO employees (name, nic, contact) VALUES
  ('රොෂාන්', 'NIC001', '0771234567'),
  ('කමල්', 'NIC002', '0779876543'),
  ('නිමල්', 'NIC003', '0770011223')
ON CONFLICT DO NOTHING;

INSERT INTO vehicles (vehicle_number, employee_id) VALUES
  ('006', 1),
  ('007', 2),
  ('008', 3)
ON CONFLICT DO NOTHING;
