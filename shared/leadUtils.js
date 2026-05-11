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
