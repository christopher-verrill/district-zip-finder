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

pairs = [
    ('Elmira (Corning) NY', 'Elmira, NY'),
    ('Minot-Bismarck-Dickinson ND', 'Minot-Bismarck-Dickinson(Williston), ND'),
    ('Phoenix (Prescott) AZ', 'Phoenix, AZ'),
]

for a, b in pairs:
    na, nb = norm(a), norm(b)
    print(f'A: {repr(na)}')
    print(f'B: {repr(nb)}')
    print(f'Match: {na==nb or na.startswith(nb) or nb.startswith(na)}')
    print()