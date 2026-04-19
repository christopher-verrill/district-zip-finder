import json

with open('public/data/dma_boundaries.json') as f:
    d = json.load(f)

def swap(coords):
    if isinstance(coords[0], list):
        return [swap(c) for c in coords]
    return [coords[1], coords[0]]

for f in d['features']:
    f['geometry']['coordinates'] = swap(f['geometry']['coordinates'])

with open('public/data/dma_boundaries.json', 'w') as f:
    json.dump(d, f, separators=(',', ':'))

print('Done')