import json,sys,numpy as np
sys.path.insert(0,'/home/claude/w/tools'); import chartgen as c
from playwright.sync_api import sync_playwright
cat=json.loads(open('/home/claude/w/tuxhero_work/lib/tux-library/catalog.js').read().split('window.TUX_LIBRARY=',1)[1].rstrip().rstrip(';'))
JS="""async (src)=>{const r=await fetch(src);const buf=await r.arrayBuffer();const ac=new (window.AudioContext||window.webkitAudioContext)();
const d=await ac.decodeAudioData(buf);const L=d.getChannelData(0),R=d.numberOfChannels>1?d.getChannelData(1):L,sr=d.sampleRate;const x=new Float32Array(L.length);for(let i=0;i<L.length;i++)x[i]=(L[i]+R[i])/2;const H=Math.round(sr*0.005);const out=[];let prev=x[0];
for(let i=0;i+H<=x.length;i+=H){let s=0;for(let j=i;j<i+H;j++){const v=x[j];s+=v*v}out.push(Math.sqrt(s/H))}
return {sr,len:x.length,dur:d.duration,env:out}}"""
rows=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); pg=b.new_page(); pg.goto('http://127.0.0.1:8765/index.html')
    for s in cat:
        r=pg.evaluate(JS,s['src']); be=np.array(r['env'])
        x=c.decode('/home/claude/w/tuxhero_work/'+s['src']); H=int(round(c.SR*0.005))
        n=len(x)//H; d=x[:n*H].reshape(n,H); pe=np.sqrt((d**2).mean(axis=1))
        # correlação cruzada no log-envelope, janela ±200 ms
        f=lambda e:(np.log(e+1e-6)-np.log(e+1e-6).mean())
        m=min(len(be),len(pe)); A=f(be[:m]); B=f(pe[:m]); best=None
        for lag in range(-12,13):
            a=A[max(0,lag):m+min(0,lag)]; bb=B[max(0,-lag):m-max(0,lag)]; k=min(len(a),len(bb)); cc=np.dot(a[:k],bb[:k])/k
            if best is None or cc>best[1]: best=(lag,cc)
        rows.append((s['name'],round(r['dur'],3),round(len(x)/c.SR,3),best[0]*5,round(best[1]/ (A.std()*B.std()+1e-9),3)))
        print('%-36s browser %.3fs  offline %.3fs  defasagem %+d ms  corr %.3f'%(rows[-1][0][:36],rows[-1][1],rows[-1][2],rows[-1][3],rows[-1][4]),flush=True)
    b.close()
lags=[r[3] for r in rows]; print('defasagem máx |ms|:',max(abs(l) for l in lags),' média:',np.mean(lags))
json.dump(rows,open('/home/claude/w/test/sync_resultado.json','w'),ensure_ascii=False)
