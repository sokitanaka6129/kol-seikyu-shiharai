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
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };
  const BUCKET = 'genka-docs';

  async function listDir(prefix) {
    const r = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST', headers,
      body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } })
    });
    if (!r.ok) return [];
    return await r.json();
  }
  async function signPath(path) {
    const r = await fetch(`${url}/storage/v1/object/sign/${BUCKET}/${path}`, {
      method: 'POST', headers, body: JSON.stringify({ expiresIn: 3600 })
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.signedURL ? `${url}/storage/v1${j.signedURL}` : null;
  }

  try {
    // ===== ?docs=<原価ID> : その原価に添付された書類の署名付きURL一覧 =====
    if (req.query && req.query.docs) {
      const gid = String(req.query.docs).replace(/[^a-zA-Z0-9_-]/g, '');
      const kinds = ['invoice', 'receipt', 'other'];
      const files = [];
      for (const kind of kinds) {
        const entries = await listDir(`genka/${gid}/${kind}`);
        for (const e of entries) {
          if (!e || !e.name || e.id === null) continue; // フォルダは除外
          const signed = await signPath(`genka/${gid}/${kind}/${e.name}`);
          if (signed) files.push({ name: e.name, kind, url: signed });
        }
      }
      return res.status(200).json({ files });
    }

    // ===== 通常: 原価一覧＋案件情報＋書類ありIDリスト（すべて読取専用） =====
    const [rG, rA, docs] = await Promise.all([
      fetch(`${url}/rest/v1/genka?select=id,anken_id,date,item,supplier,amount,pay_date&order=pay_date.asc.nullslast&limit=1000`, { headers }),
      fetch(`${url}/rest/v1/ankens?select=id,company,ip,lost&limit=1000`, { headers }),
      listDir('genka')
    ]);
    if (!rG.ok) {
      const err = await rG.text();
      return res.status(rG.status).json({ error: err });
    }
    let rows = await rG.json();
    const ankens = rA.ok ? await rA.json() : [];
    const map = {};
    for (const a of ankens) map[a.id] = a;
    // 失注(lost=true)案件の原価は除外（案件管理と完全連携）
    rows = rows.filter(g => {
      const a = map[g.anken_id];
      return !(a && a.lost === true);
    });
    for (const g of rows) {
      const a = map[g.anken_id];
      g.anken_company = a ? a.company : '';
      g.anken_ip = a ? a.ip : '';
    }
    // Storage直下のフォルダ名 = 書類が添付されている原価ID
    const doc_ids = (docs || []).filter(e => e && e.name).map(e => String(e.name));
    return res.status(200).json({ rows, doc_ids });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
