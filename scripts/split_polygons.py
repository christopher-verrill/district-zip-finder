import json, os

INPUT = "public/data/zip_polygons.json"
OUT1  = "public/data/zip_polygons_1.json"
OUT2  = "public/data/zip_polygons_2.json"

print("Loading...")
with open(INPUT) as f:
    data = json.load(f)

features = data["features"]
mid = len(features) // 2

chunk1 = {"type": "FeatureCollection", "features": features[:mid]}
chunk2 = {"type": "FeatureCollection", "features": features[mid:]}

with open(OUT1, "w") as f:
    json.dump(chunk1, f, separators=(",",":"))
with open(OUT2, "w") as f:
    json.dump(chunk2, f, separators=(",",":"))

s1 = os.path.getsize(OUT1) / 1024 / 1024
s2 = os.path.getsize(OUT2) / 1024 / 1024
print(f"Chunk 1: {len(chunk1['features'])} features, {s1:.1f} MB")
print(f"Chunk 2: {len(chunk2['features'])} features, {s2:.1f} MB")