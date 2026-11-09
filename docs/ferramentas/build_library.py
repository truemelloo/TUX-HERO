#!/usr/bin/env python3
"""Monta a biblioteca do TUX HERO: copia os MP3 para assets/musicas/, grava os charts e o catálogo.
Metadados: SOMENTE o que está nos nomes dos arquivos do pacote (os MP3 não têm tags ID3).
artist=None => o arquivo não informa o artista (a interface mostra 'Artista não informado')."""
import os, re, json, shutil, glob, sys, unicodedata
SRC='/home/claude/w/musicas'; PROJ='/home/claude/w/tuxhero_work'
RAW=json.load(open('/home/claude/w/charts_raw.json'))
def uni(s): return re.sub(r'#U([0-9a-fA-F]{4})',lambda m:chr(int(m.group(1),16)),s)
# arquivo -> (título, artista) — conforme o nome do arquivo, sem rótulos de vídeo "(Lyrics)", "(Official ...)"
META={
 '505 - Arctic Monkeys':('505','Arctic Monkeys'),
 'AC⧸DC - Back In Black':('Back In Black','AC/DC'),
 'Beat It - Michael Jackson (Lyrics)':('Beat It','Michael Jackson'),
 'Black Pantera -  Padrão É O Caralho (Lyric Vídeo)':('Padrão É O Caralho','Black Pantera'),
 'Blink 182 - First Date':('First Date','Blink 182'),
 'COMO TUDO DEVE SER':('Como Tudo Deve Ser',None),
 'Charlie Brown Jr - Zóio de lula':('Zóio de Lula','Charlie Brown Jr'),
 'Deftones - Change (In The House Of Flies)':('Change (In The House Of Flies)','Deftones'),
 'Deftones - Cherry waves':('Cherry Waves','Deftones'),
 'Franz Ferdinand - Take Me Out':('Take Me Out','Franz Ferdinand'),
 'HIM - Join Me In Death':('Join Me In Death','HIM'),
 'Mamonas Assassinas - Debil Metal (Lyric Video)':('Debil Metal','Mamonas Assassinas'),
 'Master of Puppets (Remastered)':('Master of Puppets (Remastered)',None),
 'Nirvana - Smells Like Teen Spirit (Official Music Video)':('Smells Like Teen Spirit','Nirvana'),
 'Os Barões da Pisadinha - Já Que Me Ensinou a Beber (Áudio Oficial)':('Já Que Me Ensinou a Beber','Os Barões da Pisadinha'),
 'Os Barões da Pisadinha - Tá Rocheda (Pseudo Video)':('Tá Rocheda','Os Barões da Pisadinha'),
 'Pierce The Veil - So Far So Fake (Visualizer)':('So Far So Fake','Pierce The Veil'),
 'Pitty - Admirável Chip Novo':('Admirável Chip Novo','Pitty'),
 'Pitty - Me Adora (Official Audio)':('Me Adora','Pitty'),
 'Pitty - Na Sua Estante (Clipe Oficial)':('Na Sua Estante','Pitty'),
 'Radiohead - Creep':('Creep','Radiohead'),
 'Slow Ride- Foghat':('Slow Ride','Foghat'),
 'System of a Down - Lonely Day':('Lonely Day','System of a Down'),
 'Te Levar Daqui':('Te Levar Daqui',None),
 'Tempo Perdido':('Tempo Perdido',None),
 "The Cure - Boys Don't Cry (lyrics)":("Boys Don't Cry",'The Cure'),
 'The Killers - Mr Brightside':('Mr Brightside','The Killers'),
 'Todos Iguais':('Todos Iguais',None),
 'charlie brown jr -papo reto':('Papo Reto','Charlie Brown Jr'),
}
def slug(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')
os.makedirs(PROJ+'/assets/musicas',exist_ok=True)
os.makedirs(PROJ+'/lib/tux-library/charts',exist_ok=True)
cat=[]
for raw_name,chart in RAW.items():
    key=uni(raw_name)[:-4]
    assert key in META,('sem metadado',key)
    title,artist=META[key]
    sid=slug(title+('-'+artist if artist else ''))
    shutil.copy2(SRC+'/'+raw_name,PROJ+'/assets/musicas/'+sid+'.mp3')
    notes=chart['notes']; nps=chart['nps']
    level='MEDIUM' if nps<2.75 else ('HARD' if nps<3.1 else 'EXPERT')
    js='window.TUX_LIBRARY_CHARTS=window.TUX_LIBRARY_CHARTS||{};window.TUX_LIBRARY_CHARTS[%s]=%s;\n'%(json.dumps(sid),json.dumps([[n['t'],n['lane'],n['dur']] for n in notes],separators=(',',':')))
    open(PROJ+'/lib/tux-library/charts/%s.js'%sid,'w').write(js)
    cat.append(dict(id=sid,name=title,artist=artist,duration=chart['duration'],src='assets/musicas/%s.mp3'%sid,chart='lib/tux-library/charts/%s.js'%sid,bpm=chart['bpm'],level=level,notes=len(notes),nps=nps,chartSource='gerado a partir do áudio (detecção de ataques)'))
cat.sort(key=lambda c:c['name'].lower())
open(PROJ+'/lib/tux-library/catalog.js','w').write('/* Catálogo das músicas oficiais adicionadas ao TUX HERO. Metadados vêm dos nomes dos arquivos do pacote musicas.zip; artist:null = não informado no arquivo. */\nwindow.TUX_LIBRARY='+json.dumps(cat,ensure_ascii=False,indent=1)+';\n')
print(len(cat),'músicas');print(sum(1 for c in cat if c['artist'] is None),'sem artista informado')
