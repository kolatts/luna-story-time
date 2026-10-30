"""Source-contract checks for the read-along renderer; no media generation."""
import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

spec = importlib.util.spec_from_file_location("story_video", Path(__file__).with_name("render-story-video.py"))
video = importlib.util.module_from_spec(spec)
spec.loader.exec_module(video)
conv_spec = importlib.util.spec_from_file_location('conversion', Path(__file__).with_name('convert-story-video.py'))
conversion = importlib.util.module_from_spec(conv_spec)
conv_spec.loader.exec_module(conversion)


class StoryVideoContract(unittest.TestCase):
    @unittest.skipUnless(os.environ.get("STORY_VIDEO_OUTPUT_DIR"), "Set STORY_VIDEO_OUTPUT_DIR to validate finished pilots")
    def test_finished_pilots(self):
        output = Path(os.environ["STORY_VIDEO_OUTPUT_DIR"])
        for slug in os.environ.get("STORY_VIDEO_SLUGS", "princess-moon-and-the-nevershine-lantern,ruby-and-the-egg-nobody-owned").split(","):
            with self.subTest(book=slug):
                manifest = json.loads((output / f"{slug}-manifest.json").read_text(encoding="utf-8"))
                self.assertFalse(manifest["preview"])
                self.assertEqual(len(manifest["pages"]), 17)
                probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(output / f"{slug}.mp4")], text=True))
                visual = next(s for s in probe["streams"] if s["codec_type"] == "video")
                audio = next(s for s in probe["streams"] if s["codec_type"] == "audio")
                self.assertEqual((visual["width"], visual["height"]), (1920, 1080))
                self.assertLess(abs(float(visual["duration"]) - manifest["durationSeconds"]), 0.05)
                self.assertLess(abs(float(audio["duration"]) - float(visual["duration"])), 0.05)
                blocks = (output / f"{slug}.srt").read_text(encoding="utf-8").strip().split("\n\n")
                caption_text = " ".join(" ".join(block.splitlines()[2:]) for block in blocks)
                spoken_text = " ".join(page["spokenText"] for page in manifest["pages"])
                self.assertEqual(re.findall(r"\w+", caption_text), re.findall(r"\w+", spoken_text))
                last_end = blocks[-1].splitlines()[1].split(" --> ")[1]
                self.assertEqual(last_end, video.srt_time(manifest["durationSeconds"]))

    def test_catalog_text_and_timing_coverage(self):
        catalog = json.loads((video.ROOT / "books/series.json").read_text(encoding="utf-8"))
        font = video.ImageFont.truetype(str(video.FONT), 46)
        checked = 0
        for series in catalog["series"]:
            if series["id"] not in video.ALLOWED:
                continue
            for entry in series["books"]:
                folder = video.ROOT / "books" / entry["slug"]
                book = json.loads((folder / "book.json").read_text(encoding="utf-8"))
                timings = json.loads((folder / "narration/timings.json").read_text(encoding="utf-8"))
                pages = [("cover", f"{book['title']}. {book['subtitle']}. Written with love by {video.author(book['authors'])}.")]
                pages += [(f"{s['number']:02d}", s["text"] + (" … " + book["refrain"] if s.get("refrain") else "")) for s in book["spreads"]]
                for key, text in pages:
                    with self.subTest(book=entry["slug"], page=key):
                        boundaries = timings[key]
                        groups = video.chunks(text, boundaries, font)
                        covered = [i for _, _, first, last in groups for i in range(first, last + 1)]
                        self.assertEqual(covered, list(range(len(boundaries))))
                        actual = " ".join(text[a:b] for a, b, _, _ in groups)
                        self.assertEqual(re.findall(r"\w+", actual), re.findall(r"\w+", text))
                        for a, b, _, _ in groups:
                            lines = video.layout(text, a, b, font, 720)
                            self.assertLessEqual(len(lines), 5)
                            for line in lines:
                                self.assertTrue(all(x + font.getlength(word) <= 720 for word, _, x in line))
                        self.assertTrue((folder / "narration" / f"{key}.mp3").is_file())
                checked += 1
        self.assertGreater(checked, 0)

    def test_catalog_next_and_authorization(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp)
            for series_id in video.ALLOWED:
                series = next(s for s in conversion.catalog() if s['id'] == series_id)
                first, second = series['books'][:2]
                self.assertEqual(conversion.next_book(series_id, archive)['slug'], first['slug'])
                folder = archive/first['slug']; folder.mkdir()
                manifest = folder/'manifest.json'
                manifest.write_text(json.dumps({'slug':first['slug'],'preview':False,'pages':[{},{}]}), encoding='utf-8')
                self.assertEqual(conversion.next_book(series_id, archive)['slug'], first['slug'])
                book=json.loads((video.ROOT/'books'/first['slug']/'book.json').read_text(encoding='utf-8'))
                pages=[{'page':'cover'}]+[{'page':f"{s['number']:02}"} for s in book['spreads']]
                manifest.write_text(json.dumps({'slug':first['slug'],'preview':False,'pages':pages}),encoding='utf-8')
                self.assertEqual(conversion.next_book(series_id, archive)['slug'], first['slug'])
                for name in ('video.mp4','captions.srt','thumbnail.jpg'): (folder/name).write_bytes(b'x')
                self.assertEqual(conversion.next_book(series_id, archive)['slug'], second['slug'])
                manifest.unlink()
                ledger=folder/'publishing.json'
                ledger.write_text(json.dumps({'status':'published','slug':first['slug'],'channel_id':'UC'+'a'*22,'video_id':'abc12345678'}),encoding='utf-8')
                self.assertEqual(conversion.next_book(series_id, archive)['slug'], first['slug'])
                ledger.write_text(json.dumps({'status':'published','slug':first['slug'],'channel_id':conversion.LUNA_CHANNEL_ID,'video_id':'abc12345678'}),encoding='utf-8')
                self.assertEqual(conversion.next_book(series_id, archive)['slug'], second['slug'])
            with self.assertRaises(ValueError): conversion.eligible('hairs-and-the-growl-that-meant-please')

    def test_metadata_requires_exact_channel_identity(self):
        series=next(s for s in conversion.catalog() if s['id'] == 'castle-everstair')
        slug=series['books'][0]['slug']
        with tempfile.TemporaryDirectory() as tmp:
            config=Path(tmp)/'channel.json'
            channel={'channel_id':'UC'+'a'*22, 'playlists':{series['id']:{'id':'playlist-id','title':'Series','url':'https://example.com/playlist'}}}
            config.write_text(json.dumps(channel), encoding='utf-8')
            with self.assertRaises(ValueError): conversion.metadata(slug,config)
            channel['channel_id']=conversion.LUNA_CHANNEL_ID
            config.write_text(json.dumps(channel), encoding='utf-8')
            result=conversion.metadata(slug,config)
            self.assertEqual(result['channelId'],conversion.LUNA_CHANNEL_ID)
            self.assertEqual(result['playlist'],channel['playlists'][series['id']])
            self.assertTrue(result['containsSyntheticMedia'])
            self.assertFalse(result['uploadPerformed'])

    def test_manifest_paths_are_portable_and_verified(self):
        slug = 'ruby-sparks-and-crackle'
        bookdir = video.ROOT/'books'/slug
        book = json.loads((bookdir/'book.json').read_text(encoding='utf-8'))
        pages = [{'spokenText':f"{book['title']}. {book['subtitle']}. Written with love by {video.author(book['authors'])}."}]
        pages += [{'spokenText':s['text'] + (' … ' + book['refrain'] if s.get('refrain') else '')} for s in book['spreads']]
        sources = [bookdir/'book.json', bookdir/'narration/timings.json',bookdir/book['cover']['image'], bookdir/'narration/cover.mp3']
        sources += [bookdir/s['image'] for s in book['spreads']]
        sources += [bookdir/'narration'/f"{s['number']:02}.mp3" for s in book['spreads']]
        hashes={path.relative_to(bookdir).as_posix():video.sha256(path) for path in sources}
        self.assertIn('narration/timings.json', hashes)
        self.assertFalse(any('\\' in key for key in hashes))
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)
            manifest={'slug':slug,'series':book['series'],'preview':False,'durationSeconds':10,'pages':pages,'sourceHashes':hashes}
            file=out/f'{slug}-manifest.json'; file.write_text(json.dumps(manifest),encoding='utf-8')
            (out/f'{slug}.srt').write_text('1\n00:00:00,000 --> 00:00:10,000\n'+' '.join(p['spokenText'].replace('\n',' ') for p in pages)+'\n',encoding='utf-8')
            (out/f'{slug}-thumbnail.png').write_bytes(b'placeholder')
            streams={'streams':[{'codec_type':'video','width':1920,'height':1080,'duration':'10'}, {'codec_type':'audio','duration':'10'}]}
            with patch.object(conversion.subprocess,'check_output',return_value=json.dumps(streams)):
                self.assertEqual(conversion.verify(slug,out,False)['slug'],slug)
                manifest['sourceHashes']={key.replace('/','\\'):value for key,value in hashes.items()}
                file.write_text(json.dumps(manifest),encoding='utf-8')
                with self.assertRaisesRegex(ValueError,'hash set'): conversion.verify(slug,out,False)

    def test_user_submissions_are_rejected_before_output(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "output"
            result = subprocess.run([sys.executable, str(Path(__file__).with_name("render-story-video.py")),
                                     "--slug", "hairs-and-the-growl-that-meant-please", "--out", str(output),
                                     "--work", str(Path(folder) / "work")], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("not authorized", result.stderr)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
