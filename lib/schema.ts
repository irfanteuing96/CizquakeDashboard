// Skema database. Dijalankan otomatis saat server pertama kali menyala (idempoten).
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_pusat BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  mini INTEGER NOT NULL DEFAULT 0,
  medium INTEGER NOT NULL DEFAULT 0,
  stock_updated_at TIMESTAMPTZ,
  stock_updated_by TEXT,
  restock JSONB NOT NULL DEFAULT '[]'::jsonb,
  restock_updated_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_branches (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, branch_id)
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  shift INTEGER NOT NULL DEFAULT 1,
  check_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out TIMESTAMPTZ,
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance (work_date);
CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  from_branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  to_branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  mini INTEGER NOT NULL DEFAULT 0,
  medium INTEGER NOT NULL DEFAULT 0,
  items TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sent',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_mini INTEGER,
  received_medium INTEGER,
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ,
  receive_note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS stock_logs (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  mini INTEGER NOT NULL,
  medium INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  work_date DATE NOT NULL,
  shift INTEGER NOT NULL DEFAULT 1,
  awal_mini INTEGER NOT NULL DEFAULT 0,
  awal_medium INTEGER NOT NULL DEFAULT 0,
  masuk_mini INTEGER NOT NULL DEFAULT 0,
  masuk_medium INTEGER NOT NULL DEFAULT 0,
  sales JSONB NOT NULL DEFAULT '{}'::jsonb,
  money JSONB NOT NULL DEFAULT '{}'::jsonb,
  kas JSONB NOT NULL DEFAULT '{}'::jsonb,
  sold_mini INTEGER NOT NULL DEFAULT 0,
  sold_medium INTEGER NOT NULL DEFAULT 0,
  rev_qris INTEGER NOT NULL DEFAULT 0,
  rev_cash INTEGER NOT NULL DEFAULT 0,
  sisa_mini INTEGER NOT NULL DEFAULT 0,
  sisa_medium INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, work_date, shift)
);
`;

export const DEFAULT_BRANCHES: [string, boolean][] = [
  ['Propelat', true],
  ['Graber', false],
  ['Cicadas', false],
  ['Baleendah', false],
  ['Setiabudhi', false],
  ['Pasteur', false],
];
