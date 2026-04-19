import json
import re

def norm(s):
    s = re.sub(r',([a-zA-Z])', r' \1', s)
    s = s.replace(',', '').replace('(', ' ').replace(')', '').replace('-', ' ')
    s = re.sub(r'&', 'and', s)
    s = re.sub(r'\band\b', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\bplus\b', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\bfort\b', 'ft', s, flags=re.IGNORECASE)
    s = re.sub(r'\bft\.', 'ft', s, flags=re.IGNORECASE)
    s = re.sub(r'\s+', ' ', s)
    return s.strip().lower()

def matches(a, b):
    if a == b: return True
    if a.startswith(b) or b.startswith(a): return True
    # Check if all words of the shorter are contained in the longer
    words_a = set(a.split())
    words_b = set(b.split())
    shorter = words_a if len(words_a) < len(words_b) else words_b
    longer = words_a if len(words_a) >= len(words_b) else words_b
    # First word must match (city name)
    if a.split()[0] != b.split()[0]: return False
    return shorter.issubset(longer)

cw = json.load(open('public/data/congressional_dma_crosswalk.json'))
bd = json.load(open('public/data/dma_boundaries.json'))

geo = set(norm(f['properties'].get('dma1', '')) for f in bd['features'])
names = set(d['dma_name'] for dmas in cw.values() for d in dmas)

unmatched = [n for n in sorted(names) if not any(matches(norm(n), g) for g in geo)]

print('Unmatched:', len(unmatched))
for n in unmatched:
    print(' ', n)