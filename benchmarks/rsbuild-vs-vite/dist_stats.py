import os, sys, json
def stats(d):
    total=br=files=br_files=0
    largest=[]
    for root,_,fs in os.walk(d):
        for f in fs:
            p=os.path.join(root,f)
            try:
                sz=os.path.getsize(p)
            except OSError:
                continue
            if f.endswith('.br'):
                br+=sz; br_files+=1
            else:
                total+=sz; files+=1
                largest.append((sz,os.path.relpath(p,d)))
    largest.sort(reverse=True)
    return {
      'files': files,
      'raw_bytes': total,
      'br_files': br_files,
      'br_bytes': br,
      'top10': largest[:10],
    }
d=sys.argv[1]
s=stats(d)
print(json.dumps(s, indent=2))
