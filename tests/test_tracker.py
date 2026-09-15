import importlib.util
import json
from datetime import datetime,timezone
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('update_news',ROOT/'scripts/update_news.py')
news=importlib.util.module_from_spec(spec);spec.loader.exec_module(news)
SOURCE={'name':'Variety','domains':['variety.com']}
NOW=datetime(2026,9,15,tzinfo=timezone.utc)

def item(title,description='',url='https://variety.com/2026/film/news/test/',date='Mon, 14 Sep 2026 12:00:00 +0000'):
    element=ET.Element('item')
    for key,value in [('title',title),('description',description),('link',url),('pubDate',date)]:ET.SubElement(element,key).text=value
    return element

class SourceFilterTests(unittest.TestCase):
    def test_confirmed_career_news(self):
        for name in ['Inde Navarrette','Inde Navarette']:
            self.assertIsNotNone(news.matching_article(item(name+' to Star in New Film'),SOURCE,NOW))
    def test_gossip_and_speculation_are_excluded(self):
        for title in ['Inde Navarrette Could Play Rogue in X-Men','Inde Navarrette Dating Film Star','Inde Navarrette Open to Marvel Role','Inde Navarrette Rumored for New Film','Fans Want Inde Navarrette Cast in Film','Inde Navarrette Confirms Meeting With X-Men Director and Would Love to Play Mystique','Obsession Review: Inde Navarrette Stars in Horror Film']:
            self.assertIsNone(news.matching_article(item(title),SOURCE,NOW),title)
        self.assertIsNone(news.matching_article(item('Inde Navarrette Cast in Film','An unconfirmed report claims she is in talks.'),SOURCE,NOW))
    def test_incidental_mentions_excluded(self):
        self.assertIsNone(news.matching_article(item('Film Festival Announces Lineup','Inde Navarrette attended last year.'),SOURCE,NOW))
    def test_spoofed_domains_and_scripts_excluded(self):
        for url in ['https://variety.com.evil.test/story','https://evil.test/?variety.com','javascript:alert(1)','http://variety.com/story','https://user:pass@variety.com/story']:
            self.assertIsNone(news.matching_article(item('Inde Navarrette Cast in Film',url=url),SOURCE,NOW))
    def test_future_and_invalid_dates_excluded(self):
        for date in ['Wed, 16 Sep 2026 12:00:00 +0000','not a date']:
            self.assertIsNone(news.matching_article(item('Inde Navarrette Cast in Film',date=date),SOURCE,NOW))
    def test_tracking_parameters_removed(self):
        result=news.matching_article(item('Inde Navarrette Cast in Film',url='https://variety.com/news/item/?utm_source=rss#fragment'),SOURCE,NOW)
        self.assertEqual(result['url'],'https://variety.com/news/item/')
    def test_no_generated_summary_or_verification_claim(self):
        result=news.matching_article(item('Inde Navarrette Cast in Film'),SOURCE,NOW)
        self.assertEqual(result['review'],'feed');self.assertEqual(result['summary'],'')

class SiteIntegrityTests(unittest.TestCase):
    def test_archive_links_and_unique_ids(self):
        data=json.loads((ROOT/'public/data/news.json').read_text())
        sources=json.loads((ROOT/'public/data/sources.json').read_text())
        domains=[domain for source in sources for domain in source['domains']]
        self.assertEqual(len(data['articles']),len({a['id'] for a in data['articles']}))
        for a in data['articles']:
            news.canonical_url(a['url'],domains)
            datetime.fromisoformat(a['date'])
            self.assertIn(a['review'],['curated','feed'])
    def test_pwa_assets_and_relative_scope(self):
        manifest=json.loads((ROOT/'public/manifest.webmanifest').read_text())
        self.assertEqual(manifest['scope'],'./');self.assertEqual(manifest['start_url'],'./')
        for icon in manifest['icons']:self.assertTrue((ROOT/'public'/icon['src']).is_file())
        self.assertTrue((ROOT/'public/sw.js').is_file())
        self.assertTrue((ROOT/'public/icons/apple-touch-icon.png').is_file())

if __name__=='__main__':unittest.main()
