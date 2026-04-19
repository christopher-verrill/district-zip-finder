import json

def decode_arc(arc):
    x, y = 0, 0
    coords = []
    for point in arc:
        x += point[0]
        y += point[1]
        coords.append([x, y])
    return coords

def arc_coords(arc_index, arcs, scale, translate):
    reverse = False
    if arc_index < 0:
        arc_index = ~arc_index
        reverse = True
    coords = decode_arc(arcs[arc_index])
    coords = [[c[0] * scale[0] + translate[0], c[1] * scale[1] + translate[1]] for c in coords]
    if reverse:
        coords.reverse()
    return coords

def convert_ring(ring, arcs, scale, translate):
    coords = []
    for i in ring:
        coords.extend(arc_coords(i, arcs, scale, translate))
    return coords

def convert_geometry(feat, arcs, scale, translate):
    t = feat['type']
    if t == 'Polygon':
        return {
            'type': 'Polygon',
            'coordinates': [convert_ring(ring, arcs, scale, translate) for ring in feat['arcs']]
        }
    elif t == 'MultiPolygon':
        return {
            'type': 'MultiPolygon',
            'coordinates': [[convert_ring(ring, arcs, scale, translate) for ring in polygon] for polygon in feat['arcs']]
        }
    return None

print("Loading nielsentopo.json...")
with open('scripts/source/nielsentopo.json') as f:
    topo = json.load(f)

scale = topo['transform']['scale']
translate = topo['transform']['translate']
arcs = topo['arcs']
features = topo['objects']['nielsen_dma']['geometries']

geojson = {'type': 'FeatureCollection', 'features': []}
for feat in features:
    geo = convert_geometry(feat, arcs, scale, translate)
    if geo:
        geojson['features'].append({
            'type': 'Feature',
            'properties': feat.get('properties', {}),
            'geometry': geo
        })

with open('public/data/dma_boundaries.json', 'w') as f:
    json.dump(geojson, f, separators=(',', ':'))

print("Done.", len(geojson['features']), "DMA features written.")
print("Sample coordinate:", geojson['features'][0]['geometry']['coordinates'][0][0])
print("Sample properties:", geojson['features'][0]['properties'])