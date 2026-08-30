export default async function handler(req, res) {
    // APP_TOKEN チェック廃止（2026/08/30）

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
