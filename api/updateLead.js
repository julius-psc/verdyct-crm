export default async function handler(req, res) {
  const { NOTION_TOKEN } = process.env;

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { id } = req.body;

  try {
    const update = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          'Lead Status': { select: { name: 'Contacted' } }
        }
      })
    });

    const result = await update.json();
    if (result.object === 'error') {
      return res.status(500).json({ error: result.message });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
