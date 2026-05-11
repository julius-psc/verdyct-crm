import {
  compareLeadPages,
  getLeadStatus,
  isPageInTrash,
  normalizeLeadUrl
} from '../shared/leadUtils.js';

async function fetchDatabasePages({ notionToken, databaseId }) {
  const pages = [];
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
      throw new Error(`Notion API Error: ${payload.message}`);
    }

    pages.push(...(payload.results || []));
    cursor = payload.has_more ? payload.next_cursor : null;
  } while (cursor);

  return pages;
}

async function trashPage({ notionToken, pageId }) {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${notionToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      archived: true
    })
  });

  const payload = await response.json();

  if (payload.object === 'error') {
    throw new Error(`Failed to trash duplicate page: ${payload.message}`);
  }
}

export default async function handler(req, res) {
  const { NOTION_TOKEN, NOTION_DATABASE_ID } = process.env;

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const pages = await fetchDatabasePages({
      notionToken: NOTION_TOKEN,
      databaseId: NOTION_DATABASE_ID
    });

    const groups = new Map();

    for (const page of pages) {
      if (isPageInTrash(page)) continue;

      const normalizedUrl = normalizeLeadUrl(page.properties?.['LinkedIn URL']?.url);
      if (!normalizedUrl) continue;

      const existing = groups.get(normalizedUrl) || [];
      existing.push(page);
      groups.set(normalizedUrl, existing);
    }

    const duplicateGroups = [...groups.entries()].filter(([, matches]) => matches.length > 1);
    const cleanedGroups = [];
    let removedCount = 0;

    for (const [normalizedUrl, matches] of duplicateGroups) {
      const ordered = [...matches].sort(compareLeadPages);
      const kept = ordered[0];
      const removed = ordered.slice(1);

      for (const page of removed) {
        await trashPage({ notionToken: NOTION_TOKEN, pageId: page.id });
      }

      removedCount += removed.length;
      cleanedGroups.push({
        normalized_url: normalizedUrl,
        kept: {
          id: kept.id,
          status: getLeadStatus(kept.properties),
          created_time: kept.created_time
        },
        removed: removed.map((page) => ({
          id: page.id,
          status: getLeadStatus(page.properties),
          created_time: page.created_time
        }))
      });
    }

    return res.status(200).json({
      duplicate_groups_found: duplicateGroups.length,
      removed_count: removedCount,
      cleaned_groups: cleanedGroups
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
