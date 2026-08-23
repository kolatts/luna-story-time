"""Structural check for the Castle Life game data.

Catches the mistakes that only show up as a wedged player or a silent NPC:
a friend standing in a wall, two things on one tile, an island of map nobody
can walk to, a recipe nobody can unlock, a cutscene line with no voice clip,
a manifest pointing at a file that isn't there.

Pure stdlib, reads only. Prints every problem it finds and exits non-zero if
there are any.

Usage:
  python scripts/validate-game-world.py
"""
import json
import sys
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GAME = ROOT / "game"
WORLD = GAME / "world.json"
ART_MANIFEST = GAME / "assets" / "manifest.json"
VOICE_MANIFEST = GAME / "voices" / "manifest.json"

# Must match js/game.js
START_MAP, START_X, START_Y = "grounds", 9, 5
MIN_ASSET_BYTES = 1024
MIN_CLIP_BYTES = 4096

problems = []


def bad(msg):
    problems.append(msg)


def grid_of(area):
    return area.get("tiles", [])


def tile_at(area, x, y):
    rows = grid_of(area)
    if y < 0 or y >= len(rows):
        return None
    row = rows[y]
    if x < 0 or x >= len(row):
        return None
    return row[x]


def walkable(world, area, x, y):
    ch = tile_at(area, x, y)
    if ch is None:
        return False
    t = world["tileTypes"].get(ch)
    if t is None:
        return False
    return bool(t.get("walkable"))


def check_shapes(world):
    for kind, areas in (("map", world["maps"]), ("room", {r["id"]: r for r in world["rooms"]})):
        for aid, area in areas.items():
            rows = grid_of(area)
            if not rows:
                bad(f"{kind} {aid}: no tiles")
                continue
            widths = {len(r) for r in rows}
            if len(widths) != 1:
                bad(f"{kind} {aid}: rows are ragged ({sorted(widths)})")
            for y, row in enumerate(rows):
                for x, ch in enumerate(row):
                    if ch not in world["tileTypes"]:
                        bad(f"{kind} {aid} ({x},{y}): unknown tile {ch!r}")


def occupants(world, mid, area):
    """Every coordinate something claims on one map, with a label."""
    spots = []
    for r in area.get("resources", []):
        spots.append(((r["x"], r["y"]), f"resource {r['type']}"))
    for e in area.get("exits", []):
        spots.append(((e["x"], e["y"]), f"exit -> {e['to']}"))
    door = area.get("door")
    if door:
        spots.append(((door["x"], door["y"]), f"door -> {door['toRoom']}"))
    for cid in area.get("npcs", []):
        comp = world["companions"].get(cid)
        if comp:
            spots.append(((comp["x"], comp["y"]), f"companion {cid}"))
    if mid == START_MAP:
        spots.append(((START_X, START_Y), "player start"))
    return spots


def check_placement(world):
    for mid, area in world["maps"].items():
        for (x, y), what in occupants(world, mid, area):
            if tile_at(area, x, y) is None:
                bad(f"map {mid}: {what} at ({x},{y}) is out of bounds")
            elif not walkable(world, area, x, y):
                bad(f"map {mid}: {what} at ({x},{y}) is on a non-walkable tile "
                    f"{tile_at(area, x, y)!r}")
        seen = {}
        for pos, what in occupants(world, mid, area):
            if pos in seen:
                bad(f"map {mid}: {what} overlaps {seen[pos]} at {pos}")
            else:
                seen[pos] = what
        # exit targets must land somewhere real and walkable
        for e in area.get("exits", []):
            dest = world["maps"].get(e["to"])
            if dest is None:
                bad(f"map {mid}: exit at ({e['x']},{e['y']}) targets unknown map {e['to']!r}")
            elif not walkable(world, dest, e["tx"], e["ty"]):
                bad(f"map {mid}: exit to {e['to']} lands on a non-walkable tile "
                    f"({e['tx']},{e['ty']})")

    rooms = {r["id"]: r for r in world["rooms"]}
    for rid, room in rooms.items():
        for e in room.get("exits", []):
            if not walkable(world, room, e["x"], e["y"]):
                bad(f"room {rid}: exit tile ({e['x']},{e['y']}) is not walkable")
            dest = rooms.get(e["to"])
            if dest is None:
                bad(f"room {rid}: exit targets unknown room {e['to']!r}")
            elif not walkable(world, dest, e["tx"], e["ty"]):
                bad(f"room {rid}: exit to {e['to']} lands on a non-walkable tile")


def check_reachability(world):
    """Flood the whole connected world from the player's start tile."""
    start = ("map", START_MAP, START_X, START_Y)
    if not walkable(world, world["maps"][START_MAP], START_X, START_Y):
        bad(f"player start ({START_X},{START_Y}) on {START_MAP} is not walkable")
        return set()

    rooms = {r["id"]: r for r in world["rooms"]}

    def area_of(kind, aid):
        return world["maps"][aid] if kind == "map" else rooms[aid]

    seen = {start}
    q = deque([start])
    while q:
        kind, aid, x, y = q.popleft()
        area = area_of(kind, aid)
        links = []
        for e in area.get("exits", []):
            if e["x"] == x and e["y"] == y:
                links.append(("room" if e.get("room") else "map", e["to"], e["tx"], e["ty"]))
        door = area.get("door") if kind == "map" else None
        if door and door["x"] == x and door["y"] == y:
            links.append(("room", door["toRoom"], None, None))
        for lk, lid, tx, ty in links:
            target = area_of(lk, lid)
            if tx is None:  # castle door: any walkable tile of the room will do
                for yy, row in enumerate(grid_of(target)):
                    for xx in range(len(row)):
                        if walkable(world, target, xx, yy):
                            tx, ty = xx, yy
                            break
                    if tx is not None:
                        break
            node = (lk, lid, tx, ty)
            if node not in seen:
                seen.add(node)
                q.append(node)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if walkable(world, area, nx, ny) and (kind, aid, nx, ny) not in seen:
                seen.add((kind, aid, nx, ny))
                q.append((kind, aid, nx, ny))

    for mid, area in world["maps"].items():
        for (x, y), what in occupants(world, mid, area):
            if ("map", mid, x, y) not in seen:
                bad(f"map {mid}: {what} at ({x},{y}) is unreachable from the player start")
    return seen


def check_companions(world):
    recipes = {r["id"]: r for r in world["recipes"]}
    listed = {cid for m in world["maps"].values() for cid in m.get("npcs", [])}
    cutscene_ids = {c["id"] for c in world.get("cutscenes", [])}

    for cid, comp in world["companions"].items():
        if comp.get("map") not in world["maps"]:
            bad(f"companion {cid}: unknown map {comp.get('map')!r}")
        if cid not in listed:
            bad(f"companion {cid} is not listed in any map's npcs[]")
        if len(comp.get("dialogue", [])) != 4:
            bad(f"companion {cid}: expected 4 dialogue lines, got {len(comp.get('dialogue', []))}")
        if not comp.get("revisit"):
            bad(f"companion {cid}: no revisit line")
        after = comp.get("appearsAfter")
        if after and after not in cutscene_ids:
            bad(f"companion {cid}: appearsAfter {after!r} is not a cutscene id")
        rid = comp.get("unlocksRecipe")
        if rid not in recipes:
            bad(f"companion {cid}: unlocksRecipe {rid!r} is not a recipe")
            continue
        unlock = recipes[rid].get("unlock", {})
        if unlock.get("type") != "companion" or unlock.get("id") != cid:
            bad(f"recipe {rid} is unlocked by {cid} but its unlock is {unlock}")

    for cid in listed:
        if cid not in world["companions"]:
            bad(f"npcs[] lists {cid!r}, which is not a companion")


def check_recipes(world):
    seen = set()
    for r in world["recipes"]:
        if r["id"] in seen:
            bad(f"duplicate recipe id {r['id']!r}")
        seen.add(r["id"])
        for res, n in r.get("needs", {}).items():
            if res not in world["resources"]:
                bad(f"recipe {r['id']}: needs unknown resource {res!r}")
            if not isinstance(n, int) or not 1 <= n <= 5:
                bad(f"recipe {r['id']}: {res} count {n} is outside 1-5")
        if not r.get("flavor"):
            bad(f"recipe {r['id']}: no flavor text")
        u = r.get("unlock", {})
        if u.get("type") not in ("start", "gathered", "crafted", "companion"):
            bad(f"recipe {r['id']}: unknown unlock type {u.get('type')!r}")
    # every resource type placed on a map must be declared, and vice versa
    placed = {res["type"] for m in world["maps"].values() for res in m.get("resources", [])}
    for t in placed - set(world["resources"]):
        bad(f"map places undeclared resource {t!r}")
    for t in set(world["resources"]) - placed:
        bad(f"resource {t!r} is declared but never placed on a map")


def check_cutscenes(world, voices):
    clips = (voices or {}).get("cutscenes", {})
    for scene in world.get("cutscenes", []):
        sid = scene.get("id")
        if scene.get("map") not in world["maps"]:
            bad(f"cutscene {sid}: unknown map {scene.get('map')!r}")
        trig = scene.get("trigger", {})
        if trig.get("type") not in ("gathered", "crafted", "companion", "start"):
            bad(f"cutscene {sid}: unknown trigger type {trig.get('type')!r}")
        steps = scene.get("steps", [])
        if not 5 <= len(steps) <= 7:
            bad(f"cutscene {sid}: {len(steps)} steps (spec asks for 5-7)")
        scene_clips = clips.get(sid, [])
        if len(scene_clips) != len(steps):
            bad(f"cutscene {sid}: {len(steps)} steps but {len(scene_clips)} voice clips")
        for i, step in enumerate(steps, start=1):
            sp = step.get("speaker")
            if sp != "narrator" and sp not in world["companions"] and sp not in SPEAKER_SPRITES:
                bad(f"cutscene {sid} step {i}: speaker {sp!r} is neither a companion nor narrator")
            if not step.get("text"):
                bad(f"cutscene {sid} step {i}: no text")
            at = step.get("at")
            if sp == "narrator" and at:
                bad(f"cutscene {sid} step {i}: narrator steps must not place anyone")
            if sp != "narrator" and not at:
                bad(f"cutscene {sid} step {i}: {sp} has no 'at' offset, so nobody appears")


def check_manifests(world):
    art = json.loads(ART_MANIFEST.read_text(encoding="utf-8"))
    for group, entries in art.items():
        if not isinstance(entries, dict):
            continue
        for key, rel in entries.items():
            p = GAME / "assets" / rel
            if not p.exists():
                bad(f"art manifest {group}.{key}: missing file {rel}")
            elif p.stat().st_size < MIN_ASSET_BYTES:
                bad(f"art manifest {group}.{key}: {rel} is only {p.stat().st_size}B")
    for cid in world["companions"]:
        if cid not in art.get("characters", {}):
            bad(f"art manifest has no sprite for companion {cid!r}")
    for scene in world.get("cutscenes", []):
        for step in scene.get("steps", []):
            sp = step.get("speaker")
            if sp != "narrator" and sp not in art.get("characters", {}):
                bad(f"art manifest has no sprite for cutscene speaker {sp!r}")

    if not VOICE_MANIFEST.exists():
        bad("no game/voices/manifest.json")
        return None
    voices = json.loads(VOICE_MANIFEST.read_text(encoding="utf-8"))
    paths = []
    paths += list(voices.get("narrator", {}).get("lines", {}).values())
    for cid, entry in voices.get("companions", {}).items():
        paths += entry.get("lines", [])
        if entry.get("revisit"):
            paths.append(entry["revisit"])
        comp = world["companions"].get(cid)
        if comp and len(entry.get("lines", [])) != len(comp.get("dialogue", [])):
            bad(f"voice manifest {cid}: {len(entry.get('lines', []))} clips for "
                f"{len(comp.get('dialogue', []))} dialogue lines")
    for sid, clips in voices.get("cutscenes", {}).items():
        paths += clips
    for cid in world["companions"]:
        if cid not in voices.get("companions", {}):
            bad(f"voice manifest has no entry for companion {cid!r}")
    for rel in paths:
        p = GAME / "voices" / rel
        if not p.exists():
            bad(f"voice manifest: missing clip {rel}")
        elif p.stat().st_size < MIN_CLIP_BYTES:
            bad(f"voice manifest: {rel} is only {p.stat().st_size}B")
    return voices


# Cutscene walk-ons who leave again are not companions; they only need a sprite.
SPEAKER_SPRITES = {"evilest", "beedlist", "shock", "leeblebeest"}


def main():
    world = json.loads(WORLD.read_text(encoding="utf-8"))
    check_shapes(world)
    check_placement(world)
    check_reachability(world)
    check_companions(world)
    check_recipes(world)
    voices = check_manifests(world)
    check_cutscenes(world, voices)

    print(f"maps: {len(world['maps'])}  rooms: {len(world['rooms'])}  "
          f"resources: {len(world['resources'])}  recipes: {len(world['recipes'])}  "
          f"companions: {len(world['companions'])}  cutscenes: {len(world.get('cutscenes', []))}")
    if problems:
        for p in problems:
            print(f"  FAIL  {p}")
        sys.exit(f"{len(problems)} problem(s)")
    print("world.json and both manifests are structurally clean.")


if __name__ == "__main__":
    main()
