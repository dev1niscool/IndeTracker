import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectArticles } from '../public/news-utils.mjs';

const { articles } = JSON.parse(await readFile(new URL('../public/data/news.json', import.meta.url)));

test('XMen, X-Men, and X Men all find the confirmed casting story', () => {
  for (const query of ['XMen', 'X-Men', 'X Men', 'variety xmen']) {
    assert.ok(selectArticles(articles, { query }).some(article => article.id === 'x-men-rogue-casting-2026'), query);
  }
});

test('Waffle House Index coverage stays available', () => {
  const results = selectArticles(articles, { query: 'waffle house index' });
  assert.ok(results.some(article => article.id === 'waffle-house-index-casting-2026'));
  assert.ok(results.some(article => article.publisher === 'The Hollywood Reporter'));
});

test('name spelling aliases and mixed search terms work', () => {
  assert.deepEqual(selectArticles(articles, { query: 'Navarette' }), selectArticles(articles, { query: 'Navarrette' }));
  assert.ok(selectArticles(articles, { query: 'Deadline Waffle' }).every(article => article.publisher === 'Deadline'));
  assert.equal(selectArticles(articles, { query: 'zzznomatch' }).length, 0);
});

test('interviews include television interviews, sorting does not mutate the archive', () => {
  const originalIds = articles.map(article => article.id);
  assert.ok(selectArticles(articles, { category: 'Interview' }).some(article => article.id === 'superman-lois-humanity-2021'));
  assert.equal(selectArticles(articles, { sort: 'oldest' })[0].date, '2020-06-19');
  assert.deepEqual(articles.map(article => article.id), originalIds);
});
