"""Plan, render, mix, and verify local story videos. Never uploads media."""
import argparse
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LUNA_CHANNEL_ID = 'UCjQzlYdsaZ5SGAORPidZ7PA'
spec = importlib.util.spec_from_file_location('story_video', ROOT/'scripts/render-story-video.py')
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


def catalog():
    return json.loads((ROOT/'books/series.json').read_text(encoding='utf-8'))['series']


def eligible(slug):
    for series in catalog():
        if series['id'] in renderer.ALLOWED:
            for book in series['books']:
                if book['slug'] == slug:
                    data = json.loads((ROOT/'books'/slug/'book.json').read_text(encoding='utf-8'))
                    if data.get('series') != series['id']:
                        raise ValueError('Book series does not match the authorized catalog')
                    return series, book
    raise ValueError(f'{slug}: book is not in an authorized series')


def next_book(series_id, archive):
    if series_id not in renderer.ALLOWED: raise ValueError('Series is not authorized')
    series = next(s for s in catalog() if s['id'] == series_id)
    for book in series['books']:
        folder = archive/book['slug']
        published = folder/'publishing.json'
        manifest = folder/'manifest.json'
        complete = False
        if published.is_file():
            record = json.loads(published.read_text(encoding='utf-8'))
            channel_id = record.get('channelId') or record.get('channel_id')
            video_id = record.get('videoId') or record.get('video_id')
            complete = (record.get('status') == 'published' and record.get('slug') == book['slug']
                        and channel_id == LUNA_CHANNEL_ID and isinstance(video_id, str)
                        and re.fullmatch(r'[A-Za-z0-9_-]{11}', video_id) is not None)
        if manifest.is_file():
            record = json.loads(manifest.read_text(encoding='utf-8'))
            source = json.loads((ROOT/'books'/book['slug']/'book.json').read_text(encoding='utf-8'))
            expected_pages = ['cover'] + [f"{spread['number']:02}" for spread in source['spreads']]
            assets = ('video.mp4', 'captions.srt')
            thumbnail = any((folder/name).is_file() and (folder/name).stat().st_size > 0
                            for name in ('thumbnail.jpg', 'thumbnail.png'))
            complete = complete or (record.get('slug') == book['slug'] and record.get('preview') is False
                                    and [p.get('page') for p in record.get('pages', [])] == expected_pages
                                    and thumbnail and all((folder/name).is_file() and (folder/name).stat().st_size > 0 for name in assets))
        if not complete: return book
    return None


def verify(slug, directory, decode=True):
    series, entry = eligible(slug)
    manifest = json.loads((directory/f'{slug}-manifest.json').read_text(encoding='utf-8'))
    if manifest['slug'] != slug or manifest['series'] != series['id'] or manifest['preview']:
        raise ValueError('Manifest does not describe the requested full book')
    bookdir = ROOT/'books'/slug
    book = json.loads((bookdir/'book.json').read_text(encoding='utf-8'))
    expected = [f"{book['title']}. {book['subtitle']}. Written with love by {renderer.author(book['authors'])}."]
    expected += [s['text']+(' … '+book['refrain'] if s.get('refrain') else '') for s in book['spreads']]
    if [p['spokenText'] for p in manifest['pages']] != expected: raise ValueError('Manifest text differs from manuscript')
    hashes = manifest.get('sourceHashes')
    if not hashes: raise ValueError('Manifest lacks source hashes')
    required = {'book.json', 'narration/timings.json'} | {book['cover']['image'], 'narration/cover.mp3'}
    required |= {s['image'] for s in book['spreads']} | {f"narration/{s['number']:02}.mp3" for s in book['spreads']}
    if set(hashes) != required: raise ValueError('Manifest source hash set is incomplete')
    for name, value in hashes.items():
        path = (bookdir/name).resolve()
        if not path.is_relative_to(bookdir.resolve()) or not path.is_file() or renderer.sha256(path) != value:
            raise ValueError(f'Source has changed or is missing: {name}')
    media = directory/f'{slug}.mp4'
    streams = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(media)],text=True))['streams']
    visual = next(s for s in streams if s['codec_type']=='video')
    sound = next(s for s in streams if s['codec_type']=='audio')
    if (visual['width'],visual['height']) != (1920,1080): raise ValueError('Video dimensions differ from 1920x1080')
    if abs(float(visual['duration'])-manifest['durationSeconds']) > .05 or abs(float(sound['duration'])-float(visual['duration'])) > .05:
        raise ValueError('Video, audio and manifest durations differ')
    blocks=(directory/f'{slug}.srt').read_text(encoding='utf-8').strip().split('\n\n')
    caption=' '.join(' '.join(block.splitlines()[2:]) for block in blocks)
    if re.sub(r'\s+','',caption)!=re.sub(r'\s+','',''.join(expected)): raise ValueError('Caption text differs from manuscript')
    if blocks[-1].splitlines()[1].split(' --> ')[1] != renderer.srt_time(manifest['durationSeconds']): raise ValueError('Caption end does not match duration')
    if not (directory/f'{slug}-thumbnail.png').is_file(): raise ValueError('Thumbnail missing')
    if decode: subprocess.run(['ffmpeg','-v','error','-xerror','-threads','2','-i',str(media),'-f','null','-'],check=True)
    return {'slug':slug,'durationSeconds':manifest['durationSeconds'],'pages':len(expected),'fullDecode':decode}


def metadata(slug, channel_path):
    series, entry = eligible(slug)
    channel=json.loads(channel_path.read_text(encoding='utf-8'))
    channel_id=channel.get('channel_id') or channel.get('channelId')
    if channel_id != LUNA_CHANNEL_ID:
        raise ValueError('video/channel.json must contain the exact Luna channel ID')
    playlist = channel.get('playlists', {}).get(series['id'])
    if not isinstance(playlist, dict) or not all(isinstance(playlist.get(k),str) and playlist[k] for k in ('id','title','url')):
        raise ValueError(f"Missing playlist metadata for {series['id']}")
    return {'channelId':channel_id,'title':entry['title'],'description':entry.get('subtitle',''),
            'privacyStatus':'private','madeForKids':True,'containsSyntheticMedia':True,
            'playlist':playlist,'slug':slug,'uploadPerformed':False}


def main():
    parser=argparse.ArgumentParser(description=__doc__); sub=parser.add_subparsers(dest='action',required=True)
    p=sub.add_parser('next'); p.add_argument('--series',required=True); p.add_argument('--archive',type=Path,default=ROOT/'video/books')
    p=sub.add_parser('plan'); p.add_argument('--slug',required=True)
    p=sub.add_parser('render'); p.add_argument('--slug',required=True); p.add_argument('--out',type=Path,required=True); p.add_argument('--work',type=Path,required=True); p.add_argument('--preview',type=int,default=0); p.add_argument('--music',type=Path)
    p=sub.add_parser('mix'); p.add_argument('--video',type=Path,required=True); p.add_argument('--music',type=Path,required=True); p.add_argument('--out',type=Path,required=True)
    p=sub.add_parser('verify'); p.add_argument('--slug',required=True); p.add_argument('--dir',type=Path,required=True); p.add_argument('--skip-decode',action='store_true')
    p=sub.add_parser('metadata'); p.add_argument('--slug',required=True); p.add_argument('--channel',type=Path,default=ROOT/'video/channel.json'); p.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    if args.action=='next': result=next_book(args.series,args.archive)
    elif args.action=='plan':
        series, book=eligible(args.slug); result={'series':series['id'],'book':book,'source':str(ROOT/'books'/args.slug),'archive':str(ROOT/'video/books'/args.slug)}
    elif args.action=='render':
        eligible(args.slug); cmd=[sys.executable,str(ROOT/'scripts/render-story-video.py'),'--slug',args.slug,'--out',str(args.out),'--work',str(args.work)]
        if args.preview: cmd += ['--preview',str(args.preview)]
        if args.music: cmd += ['--music',str(args.music)]
        subprocess.run(cmd,check=True); return
    elif args.action=='mix': renderer.mix_video(args.video,args.music,args.out); return
    elif args.action=='verify': result=verify(args.slug,args.dir,not args.skip_decode)
    else:
        result=metadata(args.slug,args.channel); args.out.parent.mkdir(parents=True,exist_ok=True); args.out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,indent=2,ensure_ascii=False))


if __name__=='__main__':
    try: main()
    except (ValueError,FileNotFoundError,subprocess.CalledProcessError,KeyError,StopIteration) as e: sys.exit(str(e))
