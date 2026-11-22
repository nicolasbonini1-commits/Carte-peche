import math, xml.etree.ElementTree as ET, json, glob
def boite(lat, lon, km):
    dl = km/2/111.32; dL = km/2/(111.32*math.cos(math.radians(lat)))
    return [lat-dl, lon-dL, lat+dl, lon+dL]
def merc(lat, lon):
    return (math.radians(lon), math.log(math.tan(math.pi/4+math.radians(lat)/2)))
def pix(b, size, lat, lon):
    x0,y0=merc(b[0],b[1]); x1,y1=merc(b[2],b[3]); x,y=merc(lat,lon)
    return ((x-x0)/(x1-x0)*size[0], (y1-y)/(y1-y0)*size[1])
def dist(a,b):
    x=math.radians(b[1]-a[1])*math.cos(math.radians((a[0]+b[0])/2)); y=math.radians(b[0]-a[0]); return 6371000*math.hypot(x,y)
def charger(fichiers):
    nodes={}; ways={}
    for f in fichiers:
        r=ET.parse(f).getroot()
        for n in r.iter('node'): nodes[n.get('id')]=(float(n.get('lat')),float(n.get('lon')),{t.get('k'):t.get('v') for t in n.iter('tag')})
        for w in r.iter('way'): ways[w.get('id')]=([nd.get('ref') for nd in w.iter('nd')],{t.get('k'):t.get('v') for t in w.iter('tag')})
    return nodes, ways
