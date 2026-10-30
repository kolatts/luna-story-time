import argparse, json, re, subprocess, sys, math, hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ALLOWED = {'castle-everstair', 'ruby-and-the-dragon-bonds'}
W,H = 1920,1080
FONT = Path('C:/Windows/Fonts/georgia.ttf')
BOLD = Path('C:/Windows/Fonts/georgiab.ttf')

def run(args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL)

def duration(path):
    return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)], text=True).strip())


def sha256(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024*1024), b''): h.update(block)
    return h.hexdigest()

def mix_video(video, music, output):
    """Apply the approved pilot narration/score mix without re-encoding video."""
    if not video.is_file() or not music.is_file(): raise FileNotFoundError('Video and score must exist')
    if video.resolve() == output.resolve(): raise ValueError('Output must differ from input')
    if duration(music) + 0.05 < duration(video): raise ValueError('Score is shorter than video')
    output.parent.mkdir(parents=True, exist_ok=True)
    graph=('[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[voice][control];'
           '[1:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=90,volume=0.2[music];'
           '[music][control]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=500[duck];'
           '[voice][duck]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.84:level=false[a]')
    run(['ffmpeg','-hide_banner','-loglevel','error','-xerror','-y','-i',str(video),'-i',str(music),
         '-filter_complex',graph,'-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k',
         '-movflags','+faststart','-shortest',str(output)])

def author(a):
    return ' and '.join(a) if len(a)<=2 else ', '.join(a[:-1])+', and '+a[-1]

def srt_time(t):
    ms=round(t*1000); h,ms=divmod(ms,3600000); m,ms=divmod(ms,60000); s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'

def chunks(text, timings, font):
    # Keep manuscript line breaks and divide longer stanzas at line boundaries.
    spans=[]
    for stanza in re.finditer(r'[^\n]+(?:\n[^\n]+)*',text):
        lines=list(re.finditer(r'[^\n]+',stanza.group()))
        for line in lines:
            a=stanza.start()+line.start(); b=stanza.start()+line.end()
            words=list(re.finditer(r'\S+',text[a:b]))
            if not words: continue
            begin=a+words[0].start(); previous=begin
            for word in words:
                end=a+word.end()
                if len(layout(text,begin,end,font,720))>2 and previous>begin:
                    spans.append((begin,previous)); begin=a+word.start()
                previous=end
            spans.append((begin,b))
    # Merge adjacent original lines when the resulting card remains compact.
    merged=[]
    for a,b in spans:
        if merged and '\n\n' not in text[merged[-1][1]:a] and len(layout(text,merged[-1][0],b,font,720))<=5:
            merged[-1]=(merged[-1][0],b)
        else: merged.append((a,b))
    spans=merged
    # Timing coverage is used for both visual pages and subtitles.
    groups=[]
    for a,b in spans:
        hits=[j for j,(_,o,l) in enumerate(timings) if a <= o < b]
        if hits: groups.append((a,b,hits[0],hits[-1]))
    return groups

def layout(text, start, end, font, width):
    lines=[]
    for match in re.finditer(r'[^\n]+',text[start:end]):
        line=[]; x=0
        for tok in re.finditer(r'\S+',match.group()):
            word=tok.group(); off=start+match.start()+tok.start(); size=font.getlength(word+' ')
            if line and x+size>width: lines.append(line); line=[]; x=0
            line.append((word,off,x)); x+=size
        lines.append(line)
    return lines

def render(base, text, span, current, font):
    img=base.copy(); d=ImageDraw.Draw(img); lines=layout(text,*span,font,720)
    lineheight=69; y=420-max(0,(len(lines)-2))*lineheight//2
    for line in lines:
        for word,off,x in line:
            active=current is not None and off <= current < off+len(word)
            if active:
                box=d.textbbox((0,0),word,font=font); d.rounded_rectangle((1046+x-7,y+2,1046+x+box[2]+7,y+57),radius=12,fill='#f0d995')
            d.text((1046+x,y),word,font=font,fill='#342953')
        y+=lineheight
    return img

def main():
    p=argparse.ArgumentParser(description='Render a narrated Luna storybook video.')
    p.add_argument('--slug',required=True); p.add_argument('--out',required=True,type=Path); p.add_argument('--work',required=True,type=Path); p.add_argument('--music',type=Path); p.add_argument('--preview',type=int,default=0,help='Include cover and this many story pages')
    a=p.parse_args(); bookdir=ROOT/'books'/a.slug
    if Path(a.slug).name != a.slug: raise ValueError('Invalid slug')
    book=json.loads((bookdir/'book.json').read_text(encoding='utf-8'))
    if book.get('series') not in ALLOWED: raise ValueError('This series is not authorized for rendering')
    timings=json.loads((bookdir/'narration/timings.json').read_text(encoding='utf-8'))
    pages=[('cover',book['cover'],f"{book['title']}. {book['subtitle']}. Written with love by {author(book['authors'])}.")]
    for s in book['spreads']:
        text=s['text'] + (' … '+book['refrain'] if s.get('refrain') else '')
        pages.append((f"{s['number']:02}",s,text))
    if a.preview: pages=pages[:a.preview+1]
    if not FONT.exists() or not BOLD.exists(): raise FileNotFoundError('Georgia fonts required')
    a.out.mkdir(parents=True,exist_ok=True); work=a.work/a.slug; work.mkdir(parents=True,exist_ok=True)
    if a.music and not a.music.is_file(): raise FileNotFoundError(a.music)
    if a.music and duration(a.music)<=0: raise ValueError('Music has no duration')
    # Validate every requested asset and every offset before producing output.
    for key,page,text in pages:
        for path in (bookdir/page['image'],bookdir/'narration'/f'{key}.mp3'):
            if not path.is_file(): raise FileNotFoundError(path)
        if key not in timings or not timings[key]: raise ValueError(f'{key}: missing timings')
        last=-1
        for ms,off,length in timings[key]:
            if ms<last or off<0 or length<=0 or off+length>len(text) or not text[off:off+length].strip(): raise ValueError(f'{key}: invalid boundary {(ms,off,length)}')
            last=ms
    clips=[]; audio_clips=[]; captions=[]; elapsed=0.; manifest=[]
    for key,page,text in pages:
        print(f'Rendering {a.slug} {key}',flush=True)
        sound=bookdir/'narration'/f'{key}.mp3'; dur=duration(sound); cliptotal=math.ceil((dur+0.8)*24)/24; boundaries=timings[key]
        if boundaries[-1][0]/1000 > dur+0.1: raise ValueError(f'{key}: timings exceed audio')
        font=ImageFont.truetype(str(FONT),46)
        groups=chunks(text,boundaries,font)
        if not groups: raise ValueError(f'{key}: no timed text')
        base=Image.new('RGB',(W,H),'#191a39'); d=ImageDraw.Draw(base)
        for x,y,r in [(83,115,3),(876,100,4),(1850,152,3),(98,969,4),(1800,966,3)]: d.ellipse((x-r,y-r,x+r,y+r),fill='#e7c77c')
        d.rounded_rectangle((50,45,968,1035),radius=30,fill='#ece1c9')
        art=ImageOps.contain(Image.open(bookdir/page['image']).convert('RGB'),(870,940),method=Image.Resampling.LANCZOS); base.paste(art,(74+(870-art.width)//2,70+(940-art.height)//2))
        d.rounded_rectangle((1002,70,1870,1010),radius=30,fill='#fcf6e9')
        d.text((1046,125),"LUNA'S STORY TIME",font=ImageFont.truetype(str(BOLD),25),fill='#8b7294')
        d.text((1046,913),''+('COVER' if key=='cover' else f'PAGE {int(key):02}  /  {len(book["spreads"]):02}'),font=ImageFont.truetype(str(FONT),26),fill='#8b7294')
        font=ImageFont.truetype(str(FONT),46)
        # Split on each word boundary; images are cached when text does not change.
        events=[0.0]+[min(dur,ms/1000) for ms,_,_ in boundaries]+[cliptotal]
        events=sorted(set(events)); frames=work/key; frames.mkdir(exist_ok=True); concat=[]
        for i,(start,stop) in enumerate(zip(events,events[1:])):
            if stop-start<0.001: continue
            active=max((j for j,t in enumerate(boundaries) if t[0]/1000<=start+0.0001),default=0)
            g=next((g for g in groups if g[2]<=active<=g[3]),None)
            if g is None: g=next((g for g in groups if g[2]>active),groups[-1])
            img=render(base,text,(g[0],g[1]),boundaries[active][1] if start>=boundaries[0][0]/1000 else None,font)
            frame=frames/f'{i:04}.png'; img.save(frame,optimize=False,compress_level=1)
            concat.extend([f"file '{frame.as_posix()}'", "option framerate 1000", f'duration {stop-start:.6f}'])
        concat.extend([f"file '{frame.as_posix()}'", "option framerate 1000"])
        listing=work/f'{key}.txt'; listing.write_text('\n'.join(concat)+'\n',encoding='utf-8')
        clip=work/f'{key}.mp4'
        run(['ffmpeg','-hide_banner','-loglevel','error','-xerror','-y','-threads','1','-f','concat','-safe','0','-i',str(listing),'-vf','fps=24','-t',str(cliptotal),'-threads','2','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p',str(clip)])
        audio_clip=work/f'{key}.wav'
        run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(sound),'-af','apad','-t',str(cliptotal),'-ar','48000','-ac','1','-c:a','pcm_s16le',str(audio_clip)])
        audio_clips.append(audio_clip)
        clips.append(clip)
        for n,g in enumerate(groups):
            start=0 if n==0 else boundaries[g[2]][0]/1000
            end=cliptotal if n==len(groups)-1 else boundaries[groups[n+1][2]][0]/1000
            captions.append((elapsed+start,elapsed+end,text[g[0]:g[1]]))
        manifest.append({'page':key,'startSeconds':round(elapsed,3),'durationSeconds':round(cliptotal,3),'image':page['image'],'audio':f'narration/{key}.mp3','spokenText':text})
        elapsed+=cliptotal
        if key=='cover':
            thumb=base.copy(); td=ImageDraw.Draw(thumb); titlefont=ImageFont.truetype(str(BOLD),50); subtitlefont=ImageFont.truetype(str(FONT),30)
            for i,line in enumerate(layout(book['title'],0,len(book['title']),titlefont,720)):
                for word,off,x in line: td.text((1046+x,350+i*70),word,font=titlefont,fill='#342953')
            for i,line in enumerate(layout(book['subtitle'],0,len(book['subtitle']),subtitlefont,720)):
                for word,off,x in line: td.text((1046+x,650+i*48),word,font=subtitlefont,fill='#725f80')
            thumb.save(a.out/f'{a.slug}-thumbnail.png')
    listing=work/'clips.txt'; listing.write_text(''.join(f"file '{c.as_posix()}'\n" for c in clips),encoding='utf-8')
    audio_listing=work/'audio.txt'; audio_listing.write_text(''.join(f"file '{c.as_posix()}'\n" for c in audio_clips),encoding='utf-8')
    audio=work/'narration.wav'
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(audio_listing),'-c','copy',str(audio)])
    output=a.out/f'{a.slug}.mp4'
    unmixed=work/'unmixed.mp4' if a.music else output
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(listing),'-i',str(audio),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','128k','-movflags','+faststart','-shortest',str(unmixed)])
    if a.music: mix_video(unmixed,a.music,output)
    (a.out/f'{a.slug}.srt').write_text(''.join(f'{i}\n{srt_time(start)} --> {srt_time(end)}\n{txt}\n\n' for i,(start,end,txt) in enumerate(captions,1)),encoding='utf-8')
    (a.out/f'{a.slug}-manifest.json').write_text(json.dumps({'title':book['title'],'subtitle':book['subtitle'],'authors':book['authors'],'slug':a.slug,'series':book['series'],'preview':bool(a.preview),'durationSeconds':round(elapsed,3),'sourceHashes':{path.relative_to(bookdir).as_posix():sha256(path) for path in [bookdir/'book.json', bookdir/'narration/timings.json'] + [bookdir/page['image'] for _,page,_ in pages] + [bookdir/'narration'/f'{key}.mp3' for key,_,_ in pages]},'musicSha256':sha256(a.music) if a.music else None,'pages':manifest},ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Wrote {output}',flush=True)

if __name__=='__main__':
    try: main()
    except (ValueError,FileNotFoundError,subprocess.CalledProcessError) as e: sys.exit(str(e))
