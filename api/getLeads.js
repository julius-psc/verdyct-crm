export default async function handler(req, res) {
  const { NOTION_TOKEN, NOTION_DATABASE_ID } = process.env;

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const query = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: { property: 'Lead Status', select: { equals: 'To Contact' } }
      })
    });

    const existing = await query.json();
    if (existing.object === 'error') {
      return res.status(500).json({ error: existing.message });
    }

    const leads = existing.results.map(page => {
      const nameProp = page.properties.Name;
      const urlProp = page.properties['LinkedIn URL'];
      
      const name = nameProp?.title?.[0]?.text?.content || 'Unknown';
      const url = urlProp?.url || '';

      return {
        id: page.id,
        name,
        url
      };
    }).filter(lead => lead.url !== '');

    return res.status(200).json({ leads });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
