import { selectArticles } from './news-utils.mjs';

const $ = selector => document.querySelector(selector);
const state = { data: null, sources: [], category: 'All', query: '', sort: 'newest', savedArchive: false };
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const dateLabel = date => new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
}).format(new Date(date));

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('#toast').hidden = true, 5000);
}

function renderNews() {
  if (!state.data) return;
  const articles = selectArticles(state.data.articles, state);
  $('#all-count').textContent = state.data.articles.length;
  $('#feed-title').textContent = `${articles.length} ${articles.length === 1 ? 'story' : 'stories'}`;
  $('#news-feed').innerHTML = articles.length ? articles.map(article => `
    <article class="news-card glass">
      <div class="card-top">
        <span class="category">${escapeHTML(article.category)}</span>
        <time class="card-date" datetime="${escapeHTML(article.date)}">${dateLabel(article.date)}</time>
      </div>
      <h3><a href="${escapeHTML(article.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(article.displayTitle || article.title)}<span class="sr-only"> (opens original article in a new tab)</span></a></h3>
      ${article.summary ? `<p>${escapeHTML(article.summary)}</p>` : ''}
      <div class="card-bottom">
        <span class="publisher-name">${escapeHTML(article.publisher)}</span>
        <span class="source-kind">${escapeHTML(article.review === 'curated' ? article.sourceType : 'Feed discovery')}</span>
        <span class="outbound" aria-hidden="true">↗</span>
      </div>
    </article>`).join('') : `
    <div class="glass empty-state"><h3>No matching stories</h3><p>Try another topic or a broader search.</p><button id="reset-filters">Clear filters</button></div>`;
  $('#news-feed').setAttribute('aria-busy', 'false');
  $('#reset-filters')?.addEventListener('click', () => {
    state.category = 'All'; state.query = ''; $('#search').value = '';
    updateFilters(); renderNews();
  });
  renderStatus();
}

function renderStatus() {
  if (!state.data) return;
  const { lastCheckedAt, feedStatus = [] } = state.data;
  const failures = feedStatus.filter(source => source.status !== 'ok').length;
  const messages = [];
  if (lastCheckedAt) {
    $('#check-status').textContent = `Sources checked ${new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(new Date(lastCheckedAt))}`;
    if (Date.now() - new Date(lastCheckedAt).getTime() > 12 * 3600000) messages.push('Source checks may be delayed.');
  } else {
    $('#check-status').textContent = 'Source check pending';
  }
  if (failures) messages.push(`${failures} source ${failures === 1 ? 'check unavailable' : 'checks unavailable'}.`);
  if (state.savedArchive || !navigator.onLine) messages.push('Connection unavailable. Showing the saved archive.');
  $('#check-detail').textContent = messages.join(' ');
  $('#check-detail').hidden = messages.length === 0;
}

function updateFilters() {
  document.querySelectorAll('.filter').forEach(button => {
    const active = button.dataset.filter === state.category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
}

function renderSources() {
  const feeds = state.data?.feedStatus || [];
  $('#sources-view').innerHTML = `
    <div class="page-heading"><h1 id="sources-title">Sources</h1></div>
    <p class="source-intro">News must cover Inde’s public work and have an accountable publisher and traceable evidence. A reputable publisher alone does not make every story suitable.</p>
    <div class="policy-grid">
      <section class="policy-card glass"><h2>Included</h2><ul>
        <li>Confirmed casting and production news.</li>
        <li>Releases, premieres, festivals, awards and attributed box-office reporting.</li>
        <li>Direct interviews about acting and filmmaking.</li>
        <li>Official studio, network and festival announcements, labeled as first-party material.</li>
      </ul></section>
      <section class="policy-card glass"><h2>Excluded</h2><ul>
        <li>Gossip, dating speculation, paparazzi and private-life coverage.</li>
        <li>Unconfirmed casting rumors, fan theories and unsourced “insider” claims.</li>
        <li>Clickbait, rankings, prediction pieces and incidental mentions.</li>
        <li>Misleading claims: a meeting is not a role; an awards campaign is not a nomination.</li>
      </ul></section>
    </div>
    <div class="directory-heading"><h2>Publishers</h2></div>
    <div class="source-directory">${state.sources.length ? state.sources.map(source => {
      const checks = feeds.filter(feed => feed.sourceId === source.id);
      const healthy = checks.length && checks.every(feed => feed.status === 'ok');
      const status = !source.feeds.length ? 'Individual review' : !checks.length ? 'Scheduled checks' : healthy ? 'Feed available' : 'Feed limited';
      return `<section class="source-row">
        <div class="source-identity"><a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.name)} <span aria-hidden="true">↗</span></a><span>${escapeHTML(source.type)}</span></div>
        <p>${escapeHTML(source.description)}</p>
        <span class="source-mode ${source.feeds.length ? 'automatic' : ''}">${status}</span>
      </section>`;
    }).join('') : '<p class="muted">Publisher list unavailable. Refresh to try again.</p>'}</div>
    <section class="methodology glass"><h2>Updates & review</h2>
      <h3>When the news updates</h3>
      <p>Source feeds are scanned every 6 hours. Each visit downloads the latest published archive. Returning to the tab or reconnecting also checks for a newer archive. This loads completed source checks; it does not start a new scan or update instantly when a story appears on Google News.</p>
      <h3>Reviewed articles and feed discoveries</h3>
      <p>The starting archive was reviewed on September 15, 2026. Reviewed entries have short original summaries and direct source links. Studio publicity and promotional interviews are labeled.</p>
      <p>Automatic checks use Variety, Deadline and The Hollywood Reporter’s dedicated Inde and recent-news feeds. A headline must name her, cover a career topic, link to the publisher’s domain and pass the rumor and gossip filter. New matches are labeled <strong>Feed discovery</strong>: they have not had a full individual article review and have no generated summary.</p>
      <h3>Coverage and offline access</h3>
      <p>Publication dates use UTC where a timestamp is available. Duplicate links and syndicated copies are filtered; different outlets can cover the same event. Feeds have limited history and checks can be delayed, so this archive cannot promise every story on the web. Downloaded entries work offline; original articles need a connection.</p>
      <a class="text-link" href="https://github.com/dev1niscool/IndeTracker/issues/new?title=Source%20correction" target="_blank" rel="noopener noreferrer">Suggest a source or correction <span aria-hidden="true">↗</span></a>
    </section>`;
}

function navigate() {
  const sources = location.hash === '#sources';
  $('#news-view').hidden = sources;
  $('#sources-view').hidden = !sources;
  document.querySelectorAll('.nav-item').forEach(link => {
    const active = (link.dataset.view === 'sources') === sources;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  document.title = sources ? 'Sources — Inde' : 'Inde — News tracker';
}

let loading = null;
let lastArchiveAttempt = 0;
function loadNews(notify = false) {
  if (loading) return loading;
  lastArchiveAttempt = Date.now();
  $('#refresh-button').disabled = true;
  loading = (async () => {
    try {
      // The minute key avoids serving an older Pages CDN copy; the worker stores one canonical copy.
      const stamp = Math.floor(Date.now() / 60000);
      const [response, sourceResponse] = await Promise.all([
        fetch(`./data/news.json?v=${stamp}`, { cache: 'no-store' }),
        fetch(`./data/sources.json?v=${stamp}`, { cache: 'no-store' }).catch(() => null)
      ]);
      if (!response.ok) throw new Error('Archive unavailable');
      const data = await response.json();
      if (!Array.isArray(data.articles)) throw new Error('Invalid archive');
      if (sourceResponse?.ok) {
        try {
          const sources = await sourceResponse.json();
          if (Array.isArray(sources)) state.sources = sources;
        } catch { /* Keep the last publisher list if this response is malformed. */ }
      }
      state.savedArchive = response.headers.get('X-Inde-Saved-Archive') === 'true';
      state.data = data;
      renderNews(); renderSources();
      if (notify) toast(state.savedArchive || !navigator.onLine ? 'Connection unavailable. Showing the saved archive.' : 'Latest published archive loaded.');
    } catch {
      if (state.data) {
        state.savedArchive = true;
        renderStatus();
        if (notify) toast('Unable to refresh. Showing the saved archive.');
      } else {
        $('#news-feed').innerHTML = '<div class="glass empty-state"><h3>News unavailable</h3><p>Check your connection, then use the refresh button to try again.</p></div>';
        $('#news-feed').setAttribute('aria-busy', 'false');
        $('#check-status').textContent = 'Could not load news';
      }
    } finally {
      $('#refresh-button').disabled = false;
      loading = null;
    }
  })();
  return loading;
}

function refreshOnReturn() {
  if (document.visibilityState === 'visible' && Date.now() - lastArchiveAttempt >= 30000) loadNews();
}

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  state.category = button.dataset.filter; updateFilters(); renderNews();
}));
$('#search').addEventListener('input', event => { state.query = event.target.value; renderNews(); });
$('#sort').addEventListener('change', event => { state.sort = event.target.value; renderNews(); });
$('#refresh-button').addEventListener('click', () => loadNews(true));
window.addEventListener('hashchange', () => { navigate(); window.scrollTo({ top: 0, behavior: 'instant' }); });
// These only download published data; credentials or source-scanning endpoints are never sent to visitors.
window.addEventListener('focus', refreshOnReturn);
window.addEventListener('pageshow', event => { if (event.persisted) refreshOnReturn(); });
document.addEventListener('visibilitychange', refreshOnReturn);
window.addEventListener('online', () => loadNews());
window.addEventListener('offline', renderStatus);

let installPrompt;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event; $('#native-install').hidden = false;
});
$('#install-button').addEventListener('click', () => $('#install-dialog').showModal());
$('#close-dialog').addEventListener('click', () => $('#install-dialog').close());
$('#install-dialog').addEventListener('click', event => {
  if (event.target !== $('#install-dialog')) return;
  const bounds = event.target.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close();
});
$('#native-install').addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  const choice = await installPrompt.userChoice;
  installPrompt = null; $('#native-install').hidden = true;
  if (choice.outcome === 'accepted') $('#install-dialog').close();
});
window.addEventListener('appinstalled', () => { $('#install-dialog').close(); toast('Inde is installed.'); });

renderSources(); navigate(); loadNews();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {
  $('.install-instructions').insertAdjacentHTML('beforeend', '<p>Offline storage is unavailable in this browser session.</p>');
});
