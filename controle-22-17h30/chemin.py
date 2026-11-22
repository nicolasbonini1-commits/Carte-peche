# Chemin à pied réel : chemins OSM publics + marche sur la plage (trait de côte OSM), raccords sur le sable ≤ 150 m.
import sys, json, heapq, math
sys.path.insert(0,'/home/claude/scripts17'); from geo import *
D='/home/claude/donnees17/'
nodes,ways=charger([D+'passage-22-17h19/osm_nord.xml']+[D+f'passage-22-16h20/osm_map_{i}.xml' for i in range(5)])
def graphe(prive=False):
    G={}; typ={}
    def arete(a,b,kind):
        w=dist(nodes[a][:2],nodes[b][:2]); G.setdefault(a,[]).append((b,w,kind)); G.setdefault(b,[]).append((a,w,kind))
    for wid,(nds,t) in ways.items():
        nds=[n for n in nds if n in nodes]
        if 'highway' in t:
            if t.get('access') in ('private','no') and not prive: continue
            if t.get('foot')=='no': continue
            kind='prive:'+wid if t.get('access') in ('private','no') else 'chemin:'+wid
        elif t.get('natural')=='coastline': kind='plage:'+wid
        else: continue
        for a,b in zip(nds,nds[1:]): arete(a,b,kind)
    # raccords sur le sable : extrémités de chemins et nœuds de côte proches
    ks=list(G.keys()); pts=[(k,nodes[k][:2]) for k in ks]
    cote=set(); chem=set()
    for a,l in G.items():
        for b,w,k in l:
            (cote if k.startswith('plage') else chem).add(a)
    for a in chem:
        pa=nodes[a][:2]
        best=None
        for c in cote:
            d=dist(pa,nodes[c][:2])
            if d<=150 and (best is None or d<best[0]): best=(d,c)
        if best: G[a].append((best[1],best[0],'sable')); G[best[1]].append((a,best[0],'sable'))
    return G
def proche(G,p):
    return min(G, key=lambda k: dist(nodes[k][:2],p))
def dijkstra(G,s,t):
    D={s:0}; prev={}; h=[(0,s)]
    while h:
        d,u=heapq.heappop(h)
        if u==t: break
        if d>D[u]: continue
        for v,w,k in G[u]:
            if d+w<D.get(v,1e18): D[v]=d+w; prev[v]=(u,k,w); heapq.heappush(h,(D[v],v))
    if t not in D: return None
    path=[t]; segs=[]
    while path[-1]!=s:
        u,k,w=prev[path[-1]]; segs.append((k,w)); path.append(u)
    path.reverse(); segs.reverse()
    agg=[]
    for k,w in segs:
        if agg and agg[-1][0]==k: agg[-1][1]+=w
        else: agg.append([k,w])
    return D[t], [nodes[n][:2] for n in path], agg
