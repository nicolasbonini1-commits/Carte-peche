import sys,json; sys.path.insert(0,'/home/claude/scripts17'); from geo import *
from PIL import Image, ImageDraw, ImageFont
F=lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)
nodes,ways=charger([f'../passage-22-16h20/osm_map_{i}.xml' for i in range(5)])
route=json.load(open('/home/claude/scripts17/route.json'))
pts={p['id']:p for p in json.load(open('../passage-22-17h19/points.json'))}
B=json.load(open('esri_ensemble.boite.json'))['boite']; base=Image.open('esri_ensemble.jpg').convert('RGB')
def P(lat,lon): return pix(B,base.size,lat,lon)
def T(d,xy,txt,col=(255,255,255),s=26): d.text(xy,txt,fill=col,font=F(s),stroke_width=3,stroke_fill=(0,0,0))
def marque(d,xy,lab,col,r=11,s=30,dx=14,dy=-16,barre=False):
    x,y=xy; d.ellipse((x-r,y-r,x+r,y+r),fill=col,outline=(0,0,0),width=2)
    if barre: d.line((x-r-4,y-r-4,x+r+4,y+r+4),fill=(0,0,0),width=4)
    T(d,(x+dx,y+dy),lab,s=s)
def panneau(b,large=1200):
    x0,y0=P(b[2],b[1]); x1,y1=P(b[0],b[3]); x0,y0=max(0,int(x0)),max(0,int(y0)); x1,y1=min(base.size[0],int(x1)),min(base.size[1],int(y1))
    im=base.crop((x0,y0,x1,y1)); s=large/im.size[0]; im=im.resize((large,int(im.size[1]*s)))
    return im, (lambda lat,lon: ((P(lat,lon)[0]-x0)*s,(P(lat,lon)[1]-y0)*s))
z,Z=panneau([43.3555,4.5795,43.3665,4.6028]); d=ImageDraw.Draw(z)
L=[Z(*nodes[n][:2]) for n in ways['727991528'][0] if n in nodes]
for i in range(0,len(L)-1,2): d.line([L[i],L[i+1]],fill=(255,150,0),width=4)
d.line([Z(a,b) for a,b in route['trace']],fill=(255,255,0),width=5)
T(d,Z(43.3641,4.5912),"grau de l'étang de Beauduc\n(chenal ≈ 70 m sur la photo)",(120,220,255),24)
T(d,Z(43.3582,4.5838),"ancienne digue = blocs en mer\n(tracé OSM « Digue des Pétroliers »)",(255,170,60),22)
marque(d,Z(43.36464,4.58454),'phare',(255,255,255),r=8,s=26)
for k in 'ab': marque(d,Z(pts[k]['lat'],pts[k]['lon']),k,(0,220,255),s=34)
marque(d,Z(pts['c']['lat'],pts['c']['lon']),'c écarté',(160,160,160),s=26,barre=True,dx=-150,dy=-50)
marque(d,Z(pts['P']['lat'],pts['P']['lon']),'P',(255,40,40),r=14,s=40)
a0=Z(43.3562,4.5800); a1=Z(43.3562,4.59); px=(a1[0]-a0[0])*200/dist((43.3562,4.58),(43.3562,4.59))
d.line((30,z.size[1]-30,30+px,z.size[1]-30),fill=(255,255,255),width=6); T(d,(30,z.size[1]-70),'200 m')
T(d,(20,15),'POSTE 17 — grau de Beauduc (photo Esri du 25 mars 2025)',s=28)
T(d,(200,z.size[1]-45),'jaune = trajet sur le trait de côte OSM (ancien, ± 50 m)',(255,255,0),20)
e,E=panneau([43.356,4.549,43.4105,4.6025]); d2=ImageDraw.Draw(e)
d2.line([E(a,b) for a,b in route['trace']],fill=(255,255,0),width=6)
cum=0; prev=None; m=1000
for a,b in route['trace']:
    if prev: cum+=dist(prev,(a,b))
    if cum>=m and m<=8000: marque(d2,E(a,b),f'{m//1000} km',(255,255,0),r=6,s=22,dx=10,dy=-10); m+=1000
    prev=(a,b)
marque(d2,E(43.40731,4.59691),'Parking (OSM)',(0,255,120),r=13,s=30,dx=-250)
marque(d2,E(43.36464,4.58454),'phare',(255,255,255),r=8,s=26,dx=-90,dy=-40)
marque(d2,E(pts['P']['lat'],pts['P']['lon']),'P',(255,40,40),r=14,s=40)
T(d2,(20,15),f"Chemin réel parking → P : ≈ {route['total_m']/1000:.1f} km\n(chemins OSM publics + plage)",s=30)
T(d2,(20,e.size[1]-40),'Photo Esri World Imagery · © contributeurs OpenStreetMap (ODbL)',s=20)
out=Image.new('RGB',(1200,z.size[1]+e.size[1]+10)); out.paste(z,(0,0)); out.paste(e,(0,z.size[1]+10))
out.save('/home/claude/controle_poste17.jpg',quality=85); z.save('/tmp/z.jpg'); print(out.size)
