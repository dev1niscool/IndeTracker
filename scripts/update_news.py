"""Fetch publisher-owned RSS feeds; add only conservative career-news matches."""
from __future__ import annotations
import concurrent.futures
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
import hashlib
import html
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'public/data/news.json'
NAME = re.compile(r'\bInde\s+Navar+rette\b|\bInde\s+Navarette\b', re.I)
CAREER = re.compile(r'\b(cast|casting|star|stars|starring|film|movie|series|television|tv|interview|performance|role|actress|actor|actors|director|acting|premiere|festival|release|trailer|award|awards|oscar|emmy|box.office|obsession|superman|13 reasons why)\b', re.I)
REJECT = re.compile(r'\b(rumou?r\w*|reportedly|unconfirmed|speculat\w*|fan.?cast\w*|in talks|eyed for|eyeing|circling|open to|met with|meeting with|would love to|hopes? to play|wants? to play|might|could|may play|wish.?list|predictions?|review|odds|best dressed|dating|boyfriend|girlfriend|romance|relationship|paparazzi|pregnant|pregnancy|bikini|net worth|scandal|plastic surgery|looks? like|fans think|fans want|su(?:es|ed|ing)|lawsuit|allegedly)\b', re.I)

def clean(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', value or ''))).strip()

def canonical_url(value, domains):
    url = urlsplit((value or '').strip())
    host = (url.hostname or '').lower()
    if url.scheme != 'https' or url.username or url.password or url.port not in (None,443):
        raise ValueError('Non-public HTTPS article link')
    if not any(host == domain or host.endswith('.'+domain) for domain in domains):
        raise ValueError('Article host is outside the publisher allowlist')
    return urlunsplit(('https',url.netloc.lower(),url.path.rstrip('/')+'/', '', ''))

def matching_article(item, source, now):
    title = clean(item.findtext('title'))
    description = clean(item.findtext('description'))
    # The name must be in the headline: incidental mentions do not qualify.
    if not NAME.search(title) or not CAREER.search(title) or REJECT.search(title+' '+description):
        return None
    try:
        url = canonical_url(item.findtext('link'),source['domains'])
        date = parsedate_to_datetime(item.findtext('pubDate') or '')
        if date.tzinfo is None: date = date.replace(tzinfo=timezone.utc)
        if date > now + timedelta(minutes=10): return None
    except (ValueError,TypeError,AttributeError):
        return None
    category = 'Music video' if re.search(r'music video',title,re.I) else 'Interview' if re.search(r'\b(interview|talks|discusses|dish|dishes|conversation|on why|on how)\b',title,re.I) else 'Television' if re.search(r'\b(superman|television|tv|series|13 reasons why)\b',title,re.I) else 'Film'
    return {'id':'feed-'+hashlib.sha256(url.encode()).hexdigest()[:14], 'title':title, 'url':url, 'date':date.astimezone(timezone.utc).date().isoformat(), 'publisher':source['name'], 'category':category, 'sourceType':'Trade reporting', 'review':'feed', 'summary':'', 'discoveredAt':now.isoformat()}

def read_feed(source, url, now):
    status = {'sourceId':source['id'],'publisher':source['name'],'url':url,'checkedAt':now.isoformat()}
    try:
        req = Request(url,headers={'User-Agent':'IndeTracker/1.0 (+https://github.com/dev1niscool/IndeTracker)','Accept':'application/rss+xml,application/xml,text/xml'})
        with urlopen(req,timeout=25) as response:
            canonical_url(response.url,source['domains'])
            raw = response.read(2_000_001)
        if len(raw) > 2_000_000: raise ValueError('Feed exceeds size limit')
        root = ET.fromstring(raw)
        if root.tag not in ('rss','RDF','{http://www.w3.org/1999/02/22-rdf-syntax-ns#}RDF'): raise ValueError('Not an RSS feed')
        items = root.findall('.//item')
        matches = [a for item in items if (a := matching_article(item,source,now))]
        status.update(status='ok',itemsChecked=len(items),matches=len(matches))
        return status,matches
    except Exception as error:
        status.update(status='unavailable',error=str(error)[:160])
        return status,[]

def update():
    now = datetime.now(timezone.utc)
    data = json.loads(DATA.read_text())
    # Reapply the current headline rules to previously discovered entries.
    data['articles'] = [a for a in data['articles'] if a['review'] == 'curated' or (NAME.search(a['title']) and CAREER.search(a['title']) and not REJECT.search(a['title']))]
    sources = json.loads((ROOT/'public/data/sources.json').read_text())
    jobs = [(s,url) for s in sources for url in s['feeds']]
    known = {a['url'].rstrip('/').lower() for a in data['articles']}
    titles = {clean(a['title']).casefold() for a in data['articles']}
    # Licensed Variety editions can share an article slug; preserve curated copy.
    slugs = {re.sub(r'-\d+$','',urlsplit(a['url']).path.rstrip('/').split('/')[-1]) for a in data['articles']}
    statuses=[]
    added=0
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures=[pool.submit(read_feed,source,url,now) for source,url in jobs]
        for future in futures:
            status,articles=future.result();statuses.append(status)
            for article in articles:
                key=article['url'].rstrip('/').lower(); title=clean(article['title']).casefold()
                slug=re.sub(r'-\d+$','',urlsplit(article['url']).path.rstrip('/').split('/')[-1])
                if key in known or title in titles or slug in slugs: continue
                data['articles'].append(article);known.add(key);titles.add(title);slugs.add(slug);added+=1
    data['lastCheckedAt']=now.isoformat()
    data['feedStatus']=statuses
    successful=sum(s['status']=='ok' for s in statuses)
    if successful: data['lastSuccessfulCheckAt']=now.isoformat()
    data['articles'].sort(key=lambda a:a['date'],reverse=True)
    temporary=DATA.with_suffix('.tmp');temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');temporary.replace(DATA)
    print(f'{successful}/{len(jobs)} feeds available; {added} new articles; {len(data["articles"])} total.')
    for s in statuses:
        if s['status']!='ok':print(f'Unavailable: {s["publisher"]} ({s["url"]})')
    return 0 if successful else 1

if __name__=='__main__':sys.exit(update())
