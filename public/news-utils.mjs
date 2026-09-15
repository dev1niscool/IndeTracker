export function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\bx[\s-]*men\b/g, 'xmen')
    .replace(/\bnavarette\b/g, 'navarrette')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function selectArticles(articles, { category = 'All', query = '', sort = 'newest' } = {}) {
  const terms = normalizeSearch(query).split(' ').filter(Boolean);
  return articles.filter(article => {
    const matchesCategory = category === 'All' || article.category === category ||
      (category === 'Interview' && /interview/i.test(article.sourceType));
    const text = normalizeSearch([
      article.title, article.displayTitle, article.summary, article.publisher,
      ...(article.tags || [])
    ].join(' '));
    return matchesCategory && terms.every(term => text.includes(term));
  }).sort((a, b) => sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
}
