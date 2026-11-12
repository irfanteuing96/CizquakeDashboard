import crypto from 'node:crypto';
import { q, q1, Row } from './db';
import { DEFAULT_BRANCHES } from './schema';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const COOKIE = 'ciz_session';
const SESSION_DAYS = 30;
export const CHANNELS = ['shopee', 'grab', 'gofood', 'offline', 'upselling', 'repeat'] as const;
export const MONEY_KEYS = ['upselling', 'offline', 'repeat', 'gift'] as const;
const LEVELS = ['habis', 'sedikit', 'sedang'];

type Ctx = {
  body: any;
  query: URLSearchParams;
  user: Row | null;
  branchId: number | null;
  tokenHash: string | null;
  setToken: (t: string | null) => void;
};
type Handler = (c: Ctx) => Promise<any>;

// ---------- helpers ----------
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const int = (v: any) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100_000_000) : 0;
};
const str = (v: any, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isDate = (s: any): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const todayWIB = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const TZ = `AT TIME ZONE 'Asia/Jakarta'`;

function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16);
  return salt.toString('hex') + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');
}
function checkPassword(pw: string, stored: string) {
  const [s, h] = stored.split(':');
  if (!s || !h) return false;
  const a = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 32);
  const b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function validUsername(u: string) {
  if (!/^[a-z0-9._-]{3,30}$/.test(u)) throw new HttpError(400, 'Username 3-30 karakter: huruf kecil, angka, titik, strip.');
}
function validPassword(p: any) {
  if (typeof p !== 'string' || p.length < 6 || p.length > 100) throw new HttpError(400, 'Password minimal 6 karakter.');
}
async function userBranches(userId: number) {
  return q(
    `SELECT b.id, b.name, b.is_pusat FROM branches b JOIN user_branches ub ON ub.branch_id = b.id
     WHERE ub.user_id = $1 AND b.active ORDER BY b.is_pusat DESC, b.name`,
    [userId]
  );
}
async function startSession(c: Ctx, user: Row) {
  const token = crypto.randomBytes(32).toString('hex');
  const branches = user.role === 'admin' ? [] : await userBranches(user.id);
  await q(`INSERT INTO sessions (token_hash, user_id, branch_id, expires_at) VALUES ($1,$2,$3, now() + interval '${SESSION_DAYS} days')`, [
    sha(token),
    user.id,
    branches.length === 1 ? branches[0].id : null,
  ]);
  c.setToken(token);
}
async function logStock(branchId: number, userId: number | null, kind: string, note = '') {
  await q(
    `INSERT INTO stock_logs (branch_id, user_id, kind, mini, medium, note)
     SELECT id, $2, $3, mini, medium, $4 FROM branches WHERE id = $1`,
    [branchId, userId, kind, note]
  );
}
function needUser(c: Ctx) {
  if (!c.user) throw new HttpError(401, 'Silakan login dulu.');
  return c.user;
}
function needAdmin(c: Ctx) {
  if (needUser(c).role !== 'admin') throw new HttpError(403, 'Khusus admin.');
  return c.user!;
}
function needBranch(c: Ctx) {
  needUser(c);
  if (!c.branchId) throw new HttpError(409, 'Pilih cabang dulu.');
  return c.branchId;
}
function cleanRestock(v: any) {
  if (!Array.isArray(v)) return [];
  return v
    .map((r) => ({ item: str(r?.item, 60), level: LEVELS.includes(r?.level) ? r.level : 'habis' }))
    .filter((r) => r.item)
    .slice(0, 40);
}
function cleanQty(v: any) {
  const out: Record<string, { mini: number; medium: number }> = {};
  for (const k of CHANNELS) out[k] = { mini: int(v?.[k]?.mini), medium: int(v?.[k]?.medium) };
  return out;
}
function cleanMoney(v: any) {
  const out: Record<string, { qris: number; cash: number }> = {};
  for (const k of MONEY_KEYS) out[k] = { qris: int(v?.[k]?.qris), cash: int(v?.[k]?.cash) };
  return out;
}
function cleanKas(v: any) {
  const wallet = (w: any) => ({
    awal: int(w?.awal),
    items: (Array.isArray(w?.items) ? w.items : [])
      .map((i: any) => ({ desc: str(i?.desc, 100), amount: int(i?.amount), type: i?.type === 'in' ? 'in' : 'out' }))
      .filter((i: any) => i.desc && i.amount)
      .slice(0, 30),
  });
  return { enabled: !!v?.enabled, cash: wallet(v?.cash), gopay: wallet(v?.gopay) };
}

const SHIP_SELECT = `
  SELECT s.id, s.from_branch_id, s.to_branch_id, s.mini, s.medium, s.items, s.note, s.status, s.created_at,
         s.received_mini, s.received_medium, s.received_at, s.receive_note, s.created_by,
         fb.name AS from_name, tb.name AS to_name, cu.name AS created_name, ru.name AS received_name
  FROM shipments s
  LEFT JOIN branches fb ON fb.id = s.from_branch_id
  JOIN branches tb ON tb.id = s.to_branch_id
  LEFT JOIN users cu ON cu.id = s.created_by
  LEFT JOIN users ru ON ru.id = s.received_by`;
const ATT_SELECT = `
  SELECT a.id, a.user_id, a.branch_id, a.work_date::text AS work_date, a.shift, a.check_in, a.check_out, a.note,
         u.name AS user_name, b.name AS branch_name
  FROM attendance a JOIN users u ON u.id = a.user_id JOIN branches b ON b.id = a.branch_id`;
const REP_SELECT = `
  SELECT r.id, r.branch_id, r.user_id, r.work_date::text AS work_date, r.shift, r.awal_mini, r.awal_medium,
         r.masuk_mini, r.masuk_medium, r.sales, r.money, r.kas, r.sold_mini, r.sold_medium, r.rev_qris, r.rev_cash,
         r.sisa_mini, r.sisa_medium, r.note, r.updated_at, u.name AS user_name, b.name AS branch_name
  FROM reports r LEFT JOIN users u ON u.id = r.user_id JOIN branches b ON b.id = r.branch_id`;
const BRANCH_COLS = `id, name, is_pusat, active, mini, medium, stock_updated_at, stock_updated_by, restock, restock_updated_at`;

function range(c: Ctx) {
  const to = isDate(c.query.get('to')) ? c.query.get('to')! : todayWIB();
  const from = isDate(c.query.get('from')) ? c.query.get('from')! : to;
  const b = int(c.query.get('branch'));
  return { from, to, branch: b || null };
}

// ---------- routes ----------
const routes: Record<string, Handler> = {
  'GET setup': async () => {
    const r = await q1(`SELECT count(*)::int AS n FROM users`);
    return { needsSetup: r!.n === 0 };
  },

  'POST setup': async (c) => {
    const r = await q1(`SELECT count(*)::int AS n FROM users`);
    if (r!.n > 0) throw new HttpError(403, 'Aplikasi sudah disiapkan.');
    const username = str(c.body.username, 30).toLowerCase();
    const name = str(c.body.name, 60) || username;
    validUsername(username);
    validPassword(c.body.password);
    const user = await q1(`INSERT INTO users (username, name, pass_hash, role) VALUES ($1,$2,$3,'admin') RETURNING *`, [
      username,
      name,
      hashPassword(c.body.password),
    ]);
    for (const [bn, pusat] of DEFAULT_BRANCHES) {
      await q(`INSERT INTO branches (name, is_pusat) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING`, [bn, pusat]);
    }
    await startSession(c, user!);
    return { ok: true };
  },

  'POST login': async (c) => {
    const username = str(c.body.username, 30).toLowerCase();
    const user = await q1(`SELECT * FROM users WHERE username = $1 AND active`, [username]);
    if (!user || typeof c.body.password !== 'string' || !checkPassword(c.body.password, user.pass_hash)) {
      await new Promise((r) => setTimeout(r, 600));
      throw new HttpError(401, 'Username atau password salah.');
    }
    await startSession(c, user);
    return { ok: true, role: user.role };
  },

  'POST logout': async (c) => {
    if (c.tokenHash) await q(`DELETE FROM sessions WHERE token_hash = $1`, [c.tokenHash]);
    c.setToken(null);
    return { ok: true };
  },

  'GET me': async (c) => {
    const u = needUser(c);
    const branches = u.role === 'admin' ? [] : await userBranches(u.id);
    return { user: { id: u.id, name: u.name, username: u.username, role: u.role }, branches, branchId: c.branchId };
  },

  'POST me/branch': async (c) => {
    const u = needUser(c);
    const id = int(c.body.branchId);
    const ok = (await userBranches(u.id)).some((b) => b.id === id);
    if (!ok) throw new HttpError(403, 'Kamu tidak terdaftar di cabang itu.');
    await q(`UPDATE sessions SET branch_id = $1 WHERE token_hash = $2`, [id, c.tokenHash]);
    return { ok: true };
  },

  'POST me/password': async (c) => {
    const u = needUser(c);
    if (typeof c.body.old !== 'string' || !checkPassword(c.body.old, u.pass_hash)) throw new HttpError(400, 'Password lama salah.');
    validPassword(c.body.new);
    await q(`UPDATE users SET pass_hash = $1 WHERE id = $2`, [hashPassword(c.body.new), u.id]);
    await q(`DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2`, [u.id, c.tokenHash]);
    return { ok: true };
  },

  // ----- karyawan -----
  'GET home': async (c) => {
    const bid = needBranch(c);
    const today = todayWIB();
    const [branch, open, onDuty, pending, reports, others] = await Promise.all([
      q1(`SELECT ${BRANCH_COLS} FROM branches WHERE id = $1`, [bid]),
      q1(`${ATT_SELECT} WHERE a.user_id = $1 AND a.check_out IS NULL ORDER BY a.check_in DESC LIMIT 1`, [c.user!.id]),
      q(`${ATT_SELECT} WHERE a.branch_id = $1 AND (a.work_date = $2::date OR a.check_out IS NULL) ORDER BY a.check_in DESC LIMIT 20`, [bid, today]),
      q(`${SHIP_SELECT} WHERE s.to_branch_id = $1 AND s.status = 'sent' ORDER BY s.created_at`, [bid]),
      q(`${REP_SELECT} WHERE r.branch_id = $1 AND r.work_date = $2::date ORDER BY r.shift`, [bid, today]),
      q(`SELECT id, name, is_pusat FROM branches WHERE active AND id <> $1 ORDER BY is_pusat DESC, name`, [bid]),
    ]);
    return { today, branch, open, onDuty, pending, reports, others };
  },

  'POST attendance/in': async (c) => {
    const bid = needBranch(c);
    const open = await q1(`SELECT id FROM attendance WHERE user_id = $1 AND check_out IS NULL`, [c.user!.id]);
    if (open) throw new HttpError(400, 'Kamu masih check in. Check out dulu.');
    const shift = Math.min(Math.max(int(c.body.shift), 1), 3);
    await q(`INSERT INTO attendance (user_id, branch_id, work_date, shift, note) VALUES ($1,$2,$3::date,$4,$5)`, [
      c.user!.id,
      bid,
      todayWIB(),
      shift,
      str(c.body.note, 200),
    ]);
    return { ok: true };
  },

  'POST attendance/out': async (c) => {
    needUser(c);
    const r = await q(`UPDATE attendance SET check_out = now() WHERE user_id = $1 AND check_out IS NULL RETURNING id`, [c.user!.id]);
    if (!r.length) throw new HttpError(400, 'Kamu belum check in.');
    return { ok: true };
  },

  'GET attendance/mine': async (c) => {
    needUser(c);
    return { rows: await q(`${ATT_SELECT} WHERE a.user_id = $1 ORDER BY a.check_in DESC LIMIT 31`, [c.user!.id]) };
  },

  'POST stock': async (c) => {
    const u = needUser(c);
    const bid = u.role === 'admin' ? int(c.body.branchId) : needBranch(c);
    if (!bid) throw new HttpError(400, 'Cabang tidak valid.');
    const hasRestock = Array.isArray(c.body.restock);
    const r = await q(
      `UPDATE branches SET mini = $2, medium = $3, stock_updated_at = now(), stock_updated_by = $4,
         restock = CASE WHEN $5::boolean THEN $6::jsonb ELSE restock END,
         restock_updated_at = CASE WHEN $5::boolean THEN now() ELSE restock_updated_at END
       WHERE id = $1 RETURNING id`,
      [bid, int(c.body.mini), int(c.body.medium), u.name, hasRestock, JSON.stringify(cleanRestock(c.body.restock))]
    );
    if (!r.length) throw new HttpError(404, 'Cabang tidak ditemukan.');
    await logStock(bid, u.id, 'update', str(c.body.note, 200));
    return { ok: true };
  },

  'GET stock/logs': async (c) => {
    const u = needUser(c);
    const bid = u.role === 'admin' ? int(c.query.get('branch')) : needBranch(c);
    return {
      rows: await q(
        `SELECT l.id, l.kind, l.mini, l.medium, l.note, l.created_at, u.name AS user_name
         FROM stock_logs l LEFT JOIN users u ON u.id = l.user_id WHERE l.branch_id = $1 ORDER BY l.id DESC LIMIT 30`,
        [bid]
      ),
    };
  },

  'GET shipments': async (c) => {
    const u = needUser(c);
    if (u.role === 'admin') {
      const { from, to, branch } = range(c);
      const rows = await q(
        `${SHIP_SELECT} WHERE (s.status = 'sent' OR (s.created_at ${TZ})::date BETWEEN $1::date AND $2::date)
           AND ($3::int IS NULL OR s.to_branch_id = $3 OR s.from_branch_id = $3)
         ORDER BY (s.status = 'sent') DESC, s.created_at DESC LIMIT 300`,
        [from, to, branch]
      );
      return { rows };
    }
    const bid = needBranch(c);
    return { rows: await q(`${SHIP_SELECT} WHERE s.to_branch_id = $1 OR s.from_branch_id = $1 ORDER BY s.created_at DESC LIMIT 40`, [bid]) };
  },

  'POST shipments': async (c) => {
    const u = needUser(c);
    const from = u.role === 'admin' ? int(c.body.fromBranchId) || null : needBranch(c);
    const to = int(c.body.toBranchId);
    const mini = int(c.body.mini);
    const medium = int(c.body.medium);
    const items = str(c.body.items, 500);
    if (!to || to === from) throw new HttpError(400, 'Pilih cabang tujuan.');
    if (!mini && !medium && !items) throw new HttpError(400, 'Isi jumlah atau barang yang dikirim.');
    if (!(await q1(`SELECT id FROM branches WHERE id = $1 AND active`, [to]))) throw new HttpError(400, 'Cabang tujuan tidak ditemukan.');
    await q(`INSERT INTO shipments (from_branch_id, to_branch_id, mini, medium, items, note, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
      from,
      to,
      mini,
      medium,
      items,
      str(c.body.note, 300),
      u.id,
    ]);
    if (from && (mini || medium)) {
      await q(
        `UPDATE branches SET mini = GREATEST(mini - $2, 0), medium = GREATEST(medium - $3, 0), stock_updated_at = now(), stock_updated_by = $4 WHERE id = $1`,
        [from, mini, medium, u.name]
      );
      await logStock(from, u.id, 'kirim', `Kirim ${mini} mini, ${medium} medium`);
    }
    return { ok: true };
  },

  'POST shipments/receive': async (c) => {
    const u = needUser(c);
    const id = int(c.body.id);
    const mini = int(c.body.mini);
    const medium = int(c.body.medium);
    const cond = u.role === 'admin' ? '' : 'AND to_branch_id = $6';
    const params: any[] = [id, mini, medium, u.id, str(c.body.note, 300)];
    if (u.role !== 'admin') params.push(needBranch(c));
    const s = await q1(
      `UPDATE shipments SET status = 'received', received_mini = $2, received_medium = $3, received_by = $4, received_at = now(), receive_note = $5
       WHERE id = $1 AND status = 'sent' ${cond} RETURNING to_branch_id`,
      params
    );
    if (!s) throw new HttpError(400, 'Kiriman tidak ditemukan atau sudah diterima.');
    await q(`UPDATE branches SET mini = mini + $2, medium = medium + $3, stock_updated_at = now(), stock_updated_by = $4 WHERE id = $1`, [
      s.to_branch_id,
      mini,
      medium,
      u.name,
    ]);
    await logStock(s.to_branch_id, u.id, 'terima', `Terima ${mini} mini, ${medium} medium`);
    return { ok: true };
  },

  'POST shipments/cancel': async (c) => {
    const u = needUser(c);
    const id = int(c.body.id);
    const cond = u.role === 'admin' ? '' : 'AND created_by = $2';
    const s = await q1(
      `UPDATE shipments SET status = 'cancelled' WHERE id = $1 AND status = 'sent' ${cond} RETURNING from_branch_id, mini, medium`,
      u.role === 'admin' ? [id] : [id, u.id]
    );
    if (!s) throw new HttpError(400, 'Kiriman tidak bisa dibatalkan.');
    if (s.from_branch_id && (s.mini || s.medium)) {
      await q(`UPDATE branches SET mini = mini + $2, medium = medium + $3, stock_updated_at = now(), stock_updated_by = $4 WHERE id = $1`, [
        s.from_branch_id,
        s.mini,
        s.medium,
        u.name,
      ]);
      await logStock(s.from_branch_id, u.id, 'batal', 'Kiriman dibatalkan');
    }
    return { ok: true };
  },

  'GET reports': async (c) => {
    const bid = needBranch(c);
    return { rows: await q(`${REP_SELECT} WHERE r.branch_id = $1 ORDER BY r.work_date DESC, r.shift DESC LIMIT 30`, [bid]) };
  },

  'GET reports/prefill': async (c) => {
    const bid = needBranch(c);
    const date = isDate(c.query.get('date')) ? c.query.get('date')! : todayWIB();
    const shift = Math.min(Math.max(int(c.query.get('shift')), 1), 3);
    const existing = await q1(`${REP_SELECT} WHERE r.branch_id = $1 AND r.work_date = $2::date AND r.shift = $3`, [bid, date, shift]);
    const [prev, masuk, branch] = await Promise.all([
      q1(
        `SELECT sisa_mini, sisa_medium FROM reports WHERE branch_id = $1 AND (work_date, shift) < ($2::date, $3::int)
         ORDER BY work_date DESC, shift DESC LIMIT 1`,
        [bid, date, shift]
      ),
      q1(
        `SELECT COALESCE(sum(received_mini),0)::int AS mini, COALESCE(sum(received_medium),0)::int AS medium FROM shipments
         WHERE to_branch_id = $1 AND status = 'received' AND (received_at ${TZ})::date = $2::date`,
        [bid, date]
      ),
      q1(`SELECT mini, medium, restock FROM branches WHERE id = $1`, [bid]),
    ]);
    // Kiriman yang sudah dihitung di laporan shift lain pada hari yang sama tidak dihitung dua kali.
    const counted = await q1(
      `SELECT COALESCE(sum(masuk_mini),0)::int AS mini, COALESCE(sum(masuk_medium),0)::int AS medium FROM reports
       WHERE branch_id = $1 AND work_date = $2::date AND shift <> $3::int`,
      [bid, date, shift]
    );
    masuk!.mini = Math.max(masuk!.mini - counted!.mini, 0);
    masuk!.medium = Math.max(masuk!.medium - counted!.medium, 0);
    return { date, shift, existing: existing || null, prev: prev || null, masuk, branch };
  },

  'POST reports': async (c) => {
    const bid = needBranch(c);
    const u = c.user!;
    const date = c.body.date;
    if (!isDate(date)) throw new HttpError(400, 'Tanggal tidak valid.');
    if (date > todayWIB()) throw new HttpError(400, 'Tanggal laporan tidak boleh di masa depan.');
    const shift = Math.min(Math.max(int(c.body.shift), 1), 3);
    const sales = cleanQty(c.body.sales);
    const money = cleanMoney(c.body.money);
    const kas = cleanKas(c.body.kas);
    const soldMini = CHANNELS.reduce((s, k) => s + sales[k].mini, 0);
    const soldMedium = CHANNELS.reduce((s, k) => s + sales[k].medium, 0);
    const qris = MONEY_KEYS.reduce((s, k) => s + money[k].qris, 0);
    const cash = MONEY_KEYS.reduce((s, k) => s + money[k].cash, 0);
    const sisaMini = int(c.body.sisaMini);
    const sisaMedium = int(c.body.sisaMedium);
    await q(
      `INSERT INTO reports (branch_id, user_id, work_date, shift, awal_mini, awal_medium, masuk_mini, masuk_medium, sales, money, kas,
         sold_mini, sold_medium, rev_qris, rev_cash, sisa_mini, sisa_medium, note)
       VALUES ($1,$2,$3::date,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (branch_id, work_date, shift) DO UPDATE SET
         user_id = EXCLUDED.user_id, awal_mini = EXCLUDED.awal_mini, awal_medium = EXCLUDED.awal_medium,
         masuk_mini = EXCLUDED.masuk_mini, masuk_medium = EXCLUDED.masuk_medium, sales = EXCLUDED.sales, money = EXCLUDED.money,
         kas = EXCLUDED.kas, sold_mini = EXCLUDED.sold_mini, sold_medium = EXCLUDED.sold_medium, rev_qris = EXCLUDED.rev_qris,
         rev_cash = EXCLUDED.rev_cash, sisa_mini = EXCLUDED.sisa_mini, sisa_medium = EXCLUDED.sisa_medium, note = EXCLUDED.note,
         updated_at = now()`,
      [bid, u.id, date, shift, int(c.body.awalMini), int(c.body.awalMedium), int(c.body.masukMini), int(c.body.masukMedium),
        JSON.stringify(sales), JSON.stringify(money), JSON.stringify(kas), soldMini, soldMedium, qris, cash, sisaMini, sisaMedium, str(c.body.note, 1000)]
    );
    // Sisa stok di laporan terbaru menjadi stok terkini cabang.
    const newer = await q1(`SELECT 1 AS x FROM reports WHERE branch_id = $1 AND (work_date, shift) > ($2::date, $3::int) LIMIT 1`, [bid, date, shift]);
    if (!newer) {
      const hasRestock = Array.isArray(c.body.restock);
      await q(
        `UPDATE branches SET mini = $2, medium = $3, stock_updated_at = now(), stock_updated_by = $4,
           restock = CASE WHEN $5::boolean THEN $6::jsonb ELSE restock END,
           restock_updated_at = CASE WHEN $5::boolean THEN now() ELSE restock_updated_at END
         WHERE id = $1`,
        [bid, sisaMini, sisaMedium, u.name, hasRestock, JSON.stringify(cleanRestock(c.body.restock))]
      );
      await logStock(bid, u.id, 'laporan', `Laporan ${date} shift ${shift}`);
    }
    return { ok: true };
  },

  // ----- admin -----
  'GET admin/dashboard': async (c) => {
    needAdmin(c);
    const date = isDate(c.query.get('date')) ? c.query.get('date')! : todayWIB();
    const [branches, attendance, reports, shipments] = await Promise.all([
      q(`SELECT ${BRANCH_COLS} FROM branches WHERE active ORDER BY is_pusat DESC, name`),
      q(`${ATT_SELECT} WHERE a.work_date = $1::date OR (a.check_out IS NULL AND $1::date = $2::date) ORDER BY a.check_in`, [date, todayWIB()]),
      q(`${REP_SELECT} WHERE r.work_date = $1::date ORDER BY r.shift`, [date]),
      q(`${SHIP_SELECT} WHERE s.status = 'sent' ORDER BY s.created_at`),
    ]);
    return { date, today: todayWIB(), branches, attendance, reports, shipments };
  },

  'GET admin/attendance': async (c) => {
    needAdmin(c);
    const { from, to, branch } = range(c);
    return {
      from,
      to,
      rows: await q(
        `${ATT_SELECT} WHERE a.work_date BETWEEN $1::date AND $2::date AND ($3::int IS NULL OR a.branch_id = $3)
         ORDER BY a.check_in DESC LIMIT 2000`,
        [from, to, branch]
      ),
    };
  },

  'POST admin/attendance': async (c) => {
    needAdmin(c);
    const id = int(c.body.id);
    if (c.body.delete) {
      await q(`DELETE FROM attendance WHERE id = $1`, [id]);
      return { ok: true };
    }
    const ci = new Date(c.body.checkIn);
    const co = c.body.checkOut ? new Date(c.body.checkOut) : null;
    if (isNaN(+ci) || (co && isNaN(+co))) throw new HttpError(400, 'Jam tidak valid.');
    if (co && co < ci) throw new HttpError(400, 'Jam keluar harus setelah jam masuk.');
    await q(`UPDATE attendance SET check_in = $2, check_out = $3, work_date = ($2::timestamptz ${TZ})::date WHERE id = $1`, [
      id,
      ci.toISOString(),
      co ? co.toISOString() : null,
    ]);
    return { ok: true };
  },

  'GET admin/reports': async (c) => {
    needAdmin(c);
    const { from, to, branch } = range(c);
    return {
      from,
      to,
      rows: await q(
        `${REP_SELECT} WHERE r.work_date BETWEEN $1::date AND $2::date AND ($3::int IS NULL OR r.branch_id = $3)
         ORDER BY r.work_date DESC, b.name, r.shift LIMIT 3000`,
        [from, to, branch]
      ),
    };
  },

  'POST admin/reports/delete': async (c) => {
    needAdmin(c);
    await q(`DELETE FROM reports WHERE id = $1`, [int(c.body.id)]);
    return { ok: true };
  },

  'GET admin/branches': async (c) => {
    needAdmin(c);
    return { rows: await q(`SELECT ${BRANCH_COLS} FROM branches ORDER BY active DESC, is_pusat DESC, name`) };
  },

  'POST admin/branches': async (c) => {
    needAdmin(c);
    const name = str(c.body.name, 40);
    if (!name) throw new HttpError(400, 'Nama cabang wajib diisi.');
    const id = int(c.body.id);
    const dup = await q1(`SELECT id FROM branches WHERE lower(name) = lower($1) AND id <> $2`, [name, id]);
    if (dup) throw new HttpError(400, 'Nama cabang sudah dipakai.');
    if (id) {
      await q(`UPDATE branches SET name = $2, is_pusat = $3, active = $4 WHERE id = $1`, [id, name, !!c.body.isPusat, c.body.active !== false]);
    } else {
      await q(`INSERT INTO branches (name, is_pusat) VALUES ($1,$2)`, [name, !!c.body.isPusat]);
    }
    return { ok: true };
  },

  'POST admin/restock/clear': async (c) => {
    needAdmin(c);
    await q(`UPDATE branches SET restock = '[]'::jsonb, restock_updated_at = now() WHERE id = $1`, [int(c.body.branchId)]);
    return { ok: true };
  },

  'GET admin/users': async (c) => {
    needAdmin(c);
    return {
      rows: await q(
        `SELECT u.id, u.username, u.name, u.role, u.active,
           COALESCE((SELECT json_agg(ub.branch_id) FROM user_branches ub WHERE ub.user_id = u.id), '[]'::json) AS branch_ids
         FROM users u ORDER BY u.active DESC, u.role, u.name`
      ),
    };
  },

  'POST admin/users': async (c) => {
    const me = needAdmin(c);
    const id = int(c.body.id);
    const username = str(c.body.username, 30).toLowerCase();
    const name = str(c.body.name, 60);
    const role = c.body.role === 'admin' ? 'admin' : 'staff';
    const active = c.body.active !== false;
    const branchIds: number[] = Array.isArray(c.body.branchIds) ? [...new Set<number>(c.body.branchIds.map(int).filter(Boolean))] : [];
    validUsername(username);
    if (!name) throw new HttpError(400, 'Nama wajib diisi.');
    if (role === 'staff' && !branchIds.length) throw new HttpError(400, 'Pilih minimal satu cabang untuk karyawan.');
    if (await q1(`SELECT id FROM users WHERE username = $1 AND id <> $2`, [username, id])) throw new HttpError(400, 'Username sudah dipakai.');
    let uid = id;
    if (id) {
      if (id === me.id && (role !== 'admin' || !active)) throw new HttpError(400, 'Tidak bisa menonaktifkan atau menurunkan akun sendiri.');
      await q(`UPDATE users SET username = $2, name = $3, role = $4, active = $5 WHERE id = $1`, [id, username, name, role, active]);
      if (c.body.password) {
        validPassword(c.body.password);
        await q(`UPDATE users SET pass_hash = $2 WHERE id = $1`, [id, hashPassword(c.body.password)]);
      }
      if (c.body.password || !active) await q(`DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2`, [id, c.tokenHash]);
    } else {
      validPassword(c.body.password);
      const u = await q1(`INSERT INTO users (username, name, pass_hash, role) VALUES ($1,$2,$3,$4) RETURNING id`, [
        username,
        name,
        hashPassword(c.body.password),
        role,
      ]);
      uid = u!.id;
    }
    await q(`DELETE FROM user_branches WHERE user_id = $1`, [uid]);
    if (role === 'staff') {
      for (const b of branchIds) {
        await q(`INSERT INTO user_branches (user_id, branch_id) SELECT $1, id FROM branches WHERE id = $2 ON CONFLICT DO NOTHING`, [uid, b]);
      }
      await q(`UPDATE sessions SET branch_id = NULL WHERE user_id = $1 AND branch_id IS NOT NULL AND branch_id <> ALL($2::int[])`, [uid, branchIds]);
    }
    return { ok: true };
  },
};

// ---------- dispatcher ----------
export async function dispatch(req: Request, path: string[], cookieToken: string | undefined) {
  let newToken: string | null | undefined;
  try {
    const handler = routes[`${req.method} ${path.join('/')}`];
    if (!handler) throw new HttpError(404, 'Tidak ditemukan.');
    if (req.method === 'POST') {
      // Tolak permintaan lintas situs (CSRF).
      const origin = req.headers.get('origin');
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
      if (origin && host && new URL(origin).host !== host) throw new HttpError(403, 'Asal permintaan tidak diizinkan.');
    }
    let body: any = {};
    if (req.method === 'POST') body = (await req.json().catch(() => ({}))) || {};
    const ctx: Ctx = {
      body,
      query: new URL(req.url).searchParams,
      user: null,
      branchId: null,
      tokenHash: null,
      setToken: (t) => (newToken = t),
    };
    if (cookieToken) {
      const th = sha(cookieToken);
      const s = await q1(
        `SELECT u.*, s.branch_id AS session_branch FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active`,
        [th]
      );
      if (s) {
        ctx.user = s;
        ctx.tokenHash = th;
        if (s.role !== 'admin' && s.session_branch) {
          const ok = await q1(
            `SELECT 1 AS x FROM user_branches ub JOIN branches b ON b.id = ub.branch_id WHERE ub.user_id = $1 AND ub.branch_id = $2 AND b.active`,
            [s.id, s.session_branch]
          );
          if (ok) ctx.branchId = s.session_branch;
        }
        if (s.role !== 'admin' && !ctx.branchId) {
          // Karyawan dengan satu cabang langsung masuk ke cabang itu.
          const bs = await userBranches(s.id);
          if (bs.length === 1) {
            ctx.branchId = bs[0].id;
            await q(`UPDATE sessions SET branch_id = $1 WHERE token_hash = $2`, [bs[0].id, th]);
          }
        }
      }
    }
    const data = await handler(ctx);
    return { status: 200, data, newToken };
  } catch (e: any) {
    if (e instanceof HttpError) return { status: e.status, data: { error: e.message }, newToken };
    console.error(e);
    return { status: 500, data: { error: 'Terjadi kesalahan di server. Coba lagi.' }, newToken };
  }
}
