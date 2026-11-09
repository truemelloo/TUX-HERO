#!/usr/bin/env python3
"""TUX HERO — gerador offline de charts a partir do áudio (detecção de ataques + estimativa de BPM).
Os charts são APROXIMAÇÕES rítmicas: cada nota fica sobre um ataque real medido no áudio decodificado.
"""
import subprocess, numpy as np, json, sys
from scipy.signal import medfilt
from scipy.ndimage import maximum_filter1d, uniform_filter1d

SR = 22050
N_FFT = 1024
HOP = 256            # 11,6 ms
FINE_HOP = 64        # 2,9 ms (refino do instante do ataque)

def decode(path):
    p = subprocess.run(['ffmpeg','-v','error','-i',path,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True)
    return np.frombuffer(p.stdout,dtype=np.float32).astype(np.float64)

def stft_mag(x):
    win = np.hanning(N_FFT)
    pad = N_FFT//2
    xp = np.pad(x,(pad,pad))
    n = 1 + (len(xp)-N_FFT)//HOP
    idx = np.arange(N_FFT)[None,:] + HOP*np.arange(n)[:,None]
    fr = xp[idx]*win
    return np.abs(np.fft.rfft(fr,axis=1))          # tempo do quadro i = i*HOP/SR (centro da janela)

def band_edges():
    f = np.geomspace(60,9000,25)
    return np.round(f/(SR/N_FFT)).astype(int)

def onset_env(mag):
    e = band_edges()
    bands = np.stack([mag[:,e[i]:max(e[i+1],e[i]+1)].sum(axis=1) for i in range(len(e)-1)],axis=1)
    lb = np.log1p(30*bands/ (bands.max()+1e-9) *10)
    d = np.maximum(0, np.diff(lb,axis=0,prepend=lb[:1]))
    return d.sum(axis=1)

def fine_envelope(x):
    # energia em passo de 2,9 ms, usada só para refinar o instante exato do ataque
    n = len(x)//FINE_HOP
    seg = x[:n*FINE_HOP].reshape(n,FINE_HOP)
    # filtro passa-alta simples (diferença) realça ataques de bateria/palhetada
    hp = np.diff(x,prepend=x[0])[:n*FINE_HOP].reshape(n,FINE_HOP)
    env = np.sqrt((hp**2).mean(axis=1))+1e-9
    return np.log(env)

def estimate_tempo(env, fps):
    e = env - uniform_filter1d(env, int(fps*0.6))
    e = np.maximum(e,0)
    ac = np.correlate(e,e,mode='full')[len(e)-1:]
    lags = np.arange(len(ac))
    best=None
    cands=[]
    for bpm in np.arange(60,200.01,0.5):
        lag = fps*60.0/bpm
        i0=int(lag); fr=lag-i0
        if i0+1>=len(ac): continue
        v = ac[i0]*(1-fr)+ac[i0+1]*fr
        # considera também 2x o lag (compasso de 2 tempos) para estabilizar
        j=lag*2; j0=int(j); jf=j-j0
        v2 = (ac[j0]*(1-jf)+ac[j0+1]*jf) if j0+1<len(ac) else 0
        prior = np.exp(-0.5*(np.log2(bpm/118)/0.9)**2)
        cands.append((bpm,(v+0.5*v2)*prior))
    cands.sort(key=lambda c:-c[1])
    bpm=cands[0][0]
    conf = cands[0][1]/(np.mean([c[1] for c in cands])+1e-9)
    # fase da grade: maximiza a soma do envelope nas posições de tempo
    period = fps*60.0/bpm
    sc=[]
    for ph in np.arange(0,period,0.5):
        pos = np.arange(ph,len(e)-1,period)
        sc.append(np.interp(pos,np.arange(len(e)),e).sum())
    ph = np.argmax(sc)*0.5
    return float(bpm), float(ph/fps), float(conf)

def pick_onsets(env, fps, min_gap=0.14):
    # limiar adaptativo: mediana local (1 s) + k * desvio absoluto mediano global
    w = int(fps*1.0)|1
    med = medfilt(env, w)
    mad = np.median(np.abs(env-np.median(env)))+1e-9
    thr = med + 1.2*mad*1.4826
    loc = (env==maximum_filter1d(env,size=int(fps*0.06)|1)) & (env>thr)
    idx = np.where(loc)[0]
    return idx, env[idx]-thr[idx]

def refine(idx_time, fine, fps_fine, win=0.045):
    out=[]
    ds = np.diff(fine,prepend=fine[0])
    for t in idx_time:
        c=int(t*fps_fine); a=max(0,c-int(win*fps_fine)); b=min(len(ds),c+int(win*fps_fine)+1)
        if b<=a: out.append(t); continue
        k=a+int(np.argmax(ds[a:b]))
        out.append(k/fps_fine)
    return np.array(out)

def lane_features(mag, t_idx):
    freqs = np.fft.rfftfreq(N_FFT,1/SR)
    cents=[]
    for i in t_idx:
        a=min(i,len(mag)-1); b=min(i+4,len(mag))
        m=mag[a:b].mean(axis=0)
        cents.append((m*freqs).sum()/(m.sum()+1e-9))
    return np.array(cents)

def build_chart(path, target_nps=3.4, start=1.2):
    x = decode(path); dur=len(x)/SR
    mag = stft_mag(x); fps=SR/HOP
    env = onset_env(mag)
    bpm, offset, conf = estimate_tempo(env,fps)
    idx, strength = pick_onsets(env,fps)
    times = idx/fps
    fine = fine_envelope(x)
    times = refine(times, fine, SR/FINE_HOP)
    keep=(times>=start)&(times<=dur-1.2)
    times, strength, idx = times[keep], strength[keep], idx[keep]
    # limita densidade local (janelas de 2 s) mantendo os ataques mais fortes
    sel=np.zeros(len(times),bool); W=2.0; cap=int(round(target_nps*W))
    for w0 in np.arange(0,dur,W):
        m=np.where((times>=w0)&(times<w0+W))[0]
        if len(m)==0: continue
        top=m[np.argsort(-strength[m])[:cap]]
        sel[top]=True
    times,strength,idx=times[sel],strength[sel],idx[sel]
    # espaçamento mínimo
    order=np.argsort(times); times,strength,idx=times[order],strength[order],idx[order]
    ok=[0]
    for i in range(1,len(times)):
        if times[i]-times[ok[-1]]>=0.13: ok.append(i)
        elif strength[i]>strength[ok[-1]]: ok[-1]=i
    times,strength,idx=times[ok],strength[ok],idx[ok]
    cents=lane_features(mag,idx)
    qs=np.quantile(cents,[.2,.4,.6,.8]) if len(cents)>5 else [0,0,0,0]
    lanes=np.searchsorted(qs,cents).astype(int)
    # variedade e jogabilidade: sem 4 iguais seguidas, saltos ≤2 em notas rápidas
    out=[]
    for i,(t,l) in enumerate(zip(times,lanes)):
        if out:
            p=out[-1]
            if t-p['t']<0.25 and abs(l-p['lane'])>2: l=p['lane']+(2 if l>p['lane'] else -2)
            if len(out)>=3 and all(o['lane']==l for o in out[-3:]): l=min(4,l+1) if l<4 else 3
        out.append({'t':round(float(t),3),'lane':int(l),'dur':0.0})
    # notas longas: ataque forte seguido de som sustentado e vão grande até a próxima nota
    rms = np.sqrt(np.maximum(uniform_filter1d(x**2,int(SR*0.05)),0))
    nh=0; maxh=max(1,len(out)//10)
    for i,n in enumerate(out[:-1]):
        gap=out[i+1]['t']-n['t']
        if gap>=0.75 and nh<maxh:
            a=int(n['t']*SR); L=min(gap-0.25,1.5)
            at=rms[a:a+int(SR*0.12)].max(); su=rms[a+int(SR*0.15):a+int(SR*(0.15+L))].mean() if L>0.2 else 0
            if at>0 and su/at>0.55:
                n['dur']=round(float(L),3); nh+=1
    nps=len(out)/dur
    return dict(duration=round(dur,3),bpm=round(bpm,1),offset=round(offset,3),bpmConfidence=round(conf,2),notes=out,nps=round(nps,2),holds=nh)

if __name__=='__main__':
    r=build_chart(sys.argv[1]); print({k:v for k,v in r.items() if k!='notes'}, len(r['notes']))
