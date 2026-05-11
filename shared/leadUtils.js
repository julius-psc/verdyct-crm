export function extractMarkdownUrl(rawValue = '') {
  const value = String(rawValue).trim();
  const match = value.match(/\[[^\]]*?\]\((.*?)\)/);
  return match ? match[1].trim() : value;
}

export function normalizeLeadName(rawName = '') {
  const name = String(rawName).trim();
  return name || 'Unknown';
}

export function normalizeLeadUrl(rawUrl = '') {
  const extracted = extractMarkdownUrl(rawUrl);
  if (!extracted) return '';

  const withProtocol = /^[a-z]+:\/\//i.test(extracted) ? extracted : `https://${extracted}`;

  try {
    const url = new URL(withProtocol);

    url.username = '';
    url.password = '';
    url.hash = '';
    url.search = '';
    url.hostname = url.hostname.toLowerCase();

    if (url.hostname.endsWith('.linkedin.com')) {
      url.hostname = 'linkedin.com';
      url.pathname = url.pathname.toLowerCase();
    }

    const normalizedPath = url.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
    url.pathname = normalizedPath || '/';

    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function normalizeLead(lead = {}) {
  return {
    name: normalizeLeadName(lead.name),
    url: normalizeLeadUrl(lead.url)
  };
}

export function getLeadStatus(properties = {}) {
  const status = properties['Lead Status'];
  return status?.select?.name || status?.status?.name || '';
}

export function isPageInTrash(page = {}) {
  return Boolean(page.in_trash || page.archived || page.is_archived);
}

export function compareLeadPages(a, b) {
  const aStatus = getLeadStatus(a.properties);
  const bStatus = getLeadStatus(b.properties);
  const aHasProgress = aStatus && aStatus !== 'To Contact';
  const bHasProgress = bStatus && bStatus !== 'To Contact';

  if (aHasProgress !== bHasProgress) {
    return aHasProgress ? -1 : 1;
  }

  const aCreated = Date.parse(a.created_time || 0);
  const bCreated = Date.parse(b.created_time || 0);

  if (aCreated !== bCreated) {
    return aCreated - bCreated;
  }

  return a.id.localeCompare(b.id);
}
