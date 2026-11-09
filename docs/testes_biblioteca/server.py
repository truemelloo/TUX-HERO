import http.server, os, re, sys
ROOT=sys.argv[1]; PORT=int(sys.argv[2])
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(s,*a): pass
    def send_head(s):
        rng=s.headers.get('Range'); path=s.translate_path(s.path)
        if rng and os.path.isfile(path):
            m=re.match(r'bytes=(\d*)-(\d*)',rng); size=os.path.getsize(path)
            a=int(m.group(1)) if m.group(1) else 0; b=int(m.group(2)) if m.group(2) else size-1; b=min(b,size-1)
            s.send_response(206); s.send_header('Content-Type',s.guess_type(path)); s.send_header('Accept-Ranges','bytes')
            s.send_header('Content-Range','bytes %d-%d/%d'%(a,b,size)); s.send_header('Content-Length',str(b-a+1)); s.end_headers()
            f=open(path,'rb'); f.seek(a); s._rem=b-a+1; return f
        s._rem=None; return super().send_head()
    def copyfile(s,src,dst):
        if getattr(s,'_rem',None) is None: return super().copyfile(src,dst)
        n=s._rem
        while n>0:
            d=src.read(min(65536,n))
            if not d: break
            dst.write(d); n-=len(d)
http.server.ThreadingHTTPServer(('127.0.0.1',PORT),H).serve_forever()
