export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ===== 管理者認証: ADMIN_TOKEN と照合（未設定なら機能無効） =====
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return res.status(503).json({ error: 'ADMIN_TOKEN not configured' });
  }
  const sent = req.headers['x-admin-token'] || '';
  if (sent !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 軽量な認証確認用（データは返さない）
  if (req.query && req.query.ping) {
    return res.status(200).json({ ok: true });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  try {
    // 読取専用: 案件管理アプリの原価一覧と案件情報を SELECT するだけ（書き込みは一切しない）
    const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };
    const [rG, rA] = await Promise.all([
      fetch(`${url}/rest/v1/genka?select=id,anken_id,date,item,supplier,amount,pay_date&order=pay_date.asc.nullslast&limit=1000`, { headers }),
      fetch(`${url}/rest/v1/ankens?select=id,company,ip&limit=1000`, { headers })
    ]);
    if (!rG.ok) {
      const err = await rG.text();
      return res.status(rG.status).json({ error: err });
    }
    const rows = await rG.json();
    const ankens = rA.ok ? await rA.json() : [];
    const map = {};
    for (const a of ankens) map[a.id] = a;
    for (const g of rows) {
      const a = map[g.anken_id];
      g.anken_company = a ? a.company : '';
      g.anken_ip = a ? a.ip : '';
    }
    return res.status(200).json({ rows });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
