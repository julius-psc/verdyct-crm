import { isPageInTrash, normalizeLead } from '../shared/leadUtils.js';

async function fetchExistingLeadUrls({ notionToken, databaseId }) {
  const urls = new Set();
  let cursor;

  do {
    const query = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {})
      })
    });

    const payload = await query.json();

    if (payload.object === 'error') {
      throw new Error(`Notion API Error: ${payload.message}\n(Double-check your Token and Database ID)`);
    }

    for (const page of payload.results || []) {
      if (isPageInTrash(page)) continue;

      const rawUrl = page.properties?.['LinkedIn URL']?.url;
      const normalizedUrl = normalizeLead({ url: rawUrl }).url;
      if (normalizedUrl) urls.add(normalizedUrl);
    }

    cursor = payload.has_more ? payload.next_cursor : null;
  } while (cursor);

  return urls;
}

// Vercel Serverless Function
export default async function handler(req, res) {
  const { NOTION_TOKEN, NOTION_DATABASE_ID } = process.env;

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { leads } = req.body; // Array of {name, url}

  try {
    const results = [];
    const existingUrls = await fetchExistingLeadUrls({
      notionToken: NOTION_TOKEN,
      databaseId: NOTION_DATABASE_ID
    });
    const batchUrls = new Set();

    for (const rawLead of leads) {
      const lead = normalizeLead(rawLead);

      if (!lead.url) {
        results.push({
          name: lead.name,
          status: 'invalid_url'
        });
        continue;
      }

      if (batchUrls.has(lead.url) || existingUrls.has(lead.url)) {
        results.push({
          name: lead.name,
          status: 'duplicate',
          normalized_url: lead.url
        });
        continue;
      }

      batchUrls.add(lead.url);

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

      if (newPage.object === 'error') {
        results.push({ name: lead.name, status: 'error', error: newPage.message });
      } else {
        existingUrls.add(lead.url);
        results.push({ name: lead.name, status: 'added', url: newPage.url });
      }
    }

    return res.status(200).json({ results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
