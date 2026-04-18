import geopandas as gpd
import json, os

shp = gpd.read_file("cb_2020_us_zcta520_500k.zip")
shp = shp.rename(columns={"ZCTA5CE20": "ZCTA5CE10"})
shp = shp[["ZCTA5CE10", "geometry"]]
shp = shp.to_crs("EPSG:4326")

out = shp.__geo_interface__
with open("zip_polygons.json", "w") as f:
    json.dump(out, f, separators=(",", ":"))

size = os.path.getsize("zip_polygons.json") / 1024 / 1024
print(f"Done. {len(shp)} ZCTAs, {size:.1f} MB")