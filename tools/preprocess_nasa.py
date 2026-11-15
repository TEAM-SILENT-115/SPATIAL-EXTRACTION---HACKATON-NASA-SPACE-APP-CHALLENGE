"""Build offline slope crops from the team's uncompressed float32 GeoTIFFs.
Python standard library only. Reject unfamiliar TIFF layouts instead of guessing.
"""
import hashlib
import heapq
import json
import math
from pathlib import Path
import statistics
import struct

ROOT = Path(__file__).resolve().parents[1]

def read_tiff(path):
    raw = path.read_bytes()
    endian = '<' if raw[:2] == b'II' else '>'
    assert struct.unpack_from(endian+'H', raw, 2)[0] == 42, 'Classic TIFF required'
    offset = struct.unpack_from(endian+'I', raw, 4)[0]
    count = struct.unpack_from(endian+'H', raw, offset)[0]
    tags = {}
    formats = {2: ('s', 1), 3: ('H', 2), 4: ('I', 4), 12: ('d', 8)}
    for i in range(count):
        pos = offset+2+i*12
        key, typ, n, address = struct.unpack_from(endian+'HHII', raw, pos)
        if typ not in formats:
            continue
        fmt, size = formats[typ]
        start = pos+8 if n*size <= 4 else address
        tags[key] = (raw[start:start+n].decode().strip('\x00') if typ == 2
                     else list(struct.unpack_from(endian+str(n)+fmt, raw, start)))
    assert tags[259] == [1] and tags[258] == [32] and tags[339] == [3]
    assert tags[277] == [1] and tags[278] == [1]
    w, h = tags[256][0], tags[257][0]
    rows = [struct.unpack_from(endian+str(w)+'f', raw, a) for a in tags[273]]
    return tags, rows, hashlib.sha256(raw).hexdigest()

def path(grid, start, end, energy=False):
    h, w = len(grid), len(grid[0])
    q, dist, prev = [(0, start)], {start: 0}, {}
    while q:
        cost, p = heapq.heappop(q)
        if cost != dist[p]:
            continue
        if p == end:
            result = [p]
            while p in prev:
                p = prev[p]
                result.append(p)
            return result[::-1]
        x, y = p
        for nx, ny in [(x+1,y),(x,y+1),(x-1,y),(x,y-1)]:
            if not (0 <= nx < w and 0 <= ny < h):
                continue
            v = grid[ny][nx]
            if v is None or v > 27:
                continue
            step = (1+(v+grid[y][x])/30)**2 if energy else 1
            nc = cost+step
            if nc < dist.get((nx,ny), float('inf')):
                dist[nx,ny] = nc
                prev[nx,ny] = (x,y)
                heapq.heappush(q,(nc,(nx,ny)))
    return []

def build(site, name):
    filename = site+'_final_adj_5mpp_slp.tif'
    tags, rows, sha = read_tiff(ROOT/'data/nasa/raw'/filename)
    nodata = float(tags.get(42113, 'nan'))
    best = None
    # Choose a reproducible crop with varied slopes and two connected routes.
    for oy in range(700, 2500, 300):
        for ox in range(700, 2500, 300):
            grid = []
            for y in range(30):
                row = []
                for x in range(40):
                    vals = [rows[oy+y*4+dy][ox+x*4+dx] for dy in range(4) for dx in range(4)]
                    valid = all(math.isfinite(v) and v != nodata and 0 <= v <= 90 for v in vals)
                    row.append(round(sum(vals)/16, 2) if valid else None)
                grid.append(row)
            start, end = (5,15), (34,15)
            if any(grid[y][x] is None or grid[y][x] > 27 for x,y in [start,end]):
                continue
            direct = path(grid,start,end)
            gentle = path(grid,start,end,True)
            if not direct or not gentle or len(direct)>65:
                continue
            vals = [v for row in grid for v in row if v is not None]
            def route_cost(route):
                return sum((1+(grid[a[1]][a[0]]+grid[b[1]][b[0]])/30)**2
                           for a,b in zip(route,route[1:]))
            # Prefer a measurable engineering tradeoff, not merely different polylines.
            advantage = (route_cost(direct)-route_cost(gentle))/route_cost(direct)
            score = 100*advantage + statistics.pstdev(vals)*0.2
            if best is None or score > best[0]:
                best = (score,ox,oy,grid,start,end,gentle)
    assert best, 'No connected crop found'
    _, ox, oy, grid, start, end, gentle = best
    sx, sy, _ = tags[33550]
    i,j,k,x,y,z = tags[33922]
    origin = [x+(ox-i)*sx, y-(oy-j)*sy]
    # Optional science point on the same connected component.
    extra = gentle[max(1,len(gentle)-7)]
    near = gentle[min(10,len(gentle)//3)]
    return dict(id=site,name=name,width=40,height=30,cellMeters=sx*4,slopes=grid,
                module=start,target=end,nearModule=near,extra=extra,
                source=filename,sha256=sha,sourcePixelMeters=[sx,sy],sourceSize=[len(rows[0]),len(rows)],
                cropPixelWindow=[ox,oy,160,120],originMeters=origin,nodata=tags.get(42113),
                geoKeys=tags[34735],geoDoubles=tags[34736],geoAscii=tags[34737],
                sourceTiepoint=tags[33922],sourceModelPixelScale=tags[33550],
                aggregation='Mean of 4x4 valid slope pixels; any missing value blocks the cell',
                sourceURL='https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/'+filename)

if __name__ == '__main__':
    maps = [build('Site04','Borde de Shackleton'),build('Site01','Connecting Ridge'),build('Site11','Borde de Gerlache')]
    out = ROOT/'data/nasa/processed'
    out.mkdir(parents=True,exist_ok=True)
    (out/'maps.js').write_text('/* Generated by tools/preprocess_nasa.py; NASA slopes, game placements. */\nvar MAPAS_NASA = '+json.dumps(maps,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
    for m in maps:
        print(m['id'],m['cropPixelWindow'],m['originMeters'],m['cellMeters'],'m/cell')
