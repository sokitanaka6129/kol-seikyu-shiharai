export default async function handler(req, res) {
  // ===== 簡易認証: APP_TOKEN が設定されていれば合言葉を照合 =====
  const appToken = process.env.APP_TOKEN;
  if (appToken) {
    const sent = req.headers['x-app-token'] || '';
    if (sent !== appToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const url = process.env.SUPABASE_URL;
  // service_role キーを優先（RLSをバイパスしサーバーのみアクセス可能）
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Supabase未設定: クラウド保存不可であることを明示的に返す
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  const endpoint = `${url}/rest/v1/app_data?id=eq.main`;
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${endpoint}&select=data`, { headers });
      if (!r.ok) {
        const err = await r.text();
        return res.status(r.status).json({ error: err });
      }
      const rows = await r.json();
      if (rows && rows.length > 0) {
        return res.status(200).json({ data: rows[0].data });
      }
      return res.status(200).json({ data: null });

    } else if (req.method === 'POST') {
      const { data } = req.body;
      // Upsert
      const r = await fetch(`${url}/rest/v1/app_data`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ id: 'main', data, updated_at: new Date().toISOString() })
      });
      if (!r.ok) {
        const err = await r.text();
        return res.status(r.status).json({ error: err });
      }
      return res.status(200).json({ ok: true });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
