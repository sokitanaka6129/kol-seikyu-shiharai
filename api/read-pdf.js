export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { pdf_base64 } = req.body;
    if (!pdf_base64) {
      return res.status(400).json({ error: 'No PDF data' });
    }

    const prompt = `この請求書PDFから以下をJSON形式のみで返してください。JSON以外は不要。
{"name":"取引先名","date":"YYYY/MM/DD","invNum":"請求書番号","subject":"件名","subtotal":税抜金額数値,"tax_rate":税率数値,"withholding":源泉税数値orNull,"expenses":実費数値orNull,"expenses_taxed":実費に消費税がかかっているかbool,"deadline":"支払期限YYYY/MM/DDorEmpty","payBy":"入金希望日YYYY/MM/DDorEmpty","tNum":"適格番号orEmpty","bank":"銀行","branch":"支店","acType":"口座種別","acNum":"口座番号","acName":"口座名義","is_corp":法人かbool,"notes":"特記事項"}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 }
            },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.content.map(c => c.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
