// Vercel Serverless Function
export default async function handler(req, res) {
  const { NOTION_TOKEN, NOTION_DATABASE_ID } = process.env;

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { leads } = req.body; // Array of {name, url}

  try {
    const results = [];

    for (const lead of leads) {
      // 1. Check for duplicate URL (more reliable than Name)
      const query = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: { property: 'LinkedIn URL', url: { equals: lead.url } }
        })
      });

      const existing = await query.json();

      if (existing.object === 'error') {
        throw new Error(`Notion API Error: ${existing.message}\n(Double-check your Token and Database ID)`);
      }

      if (existing.results && existing.results.length === 0) {
        // 2. Add to Notion if new
        const create = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parent: { database_id: NOTION_DATABASE_ID },
            properties: {
              Name: { title: [{ text: { content: lead.name } }] },
              'LinkedIn URL': { url: lead.url },
              'Lead Status': { select: { name: 'To Contact' } }
            }
          })
        });
        const newPage = await create.json();
        results.push({ name: lead.name, status: 'added', url: newPage.url });
      } else {
        results.push({ name: lead.name, status: 'duplicate' });
      }
    }

    return res.status(200).json({ results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
