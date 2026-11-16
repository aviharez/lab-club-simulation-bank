#!/usr/bin/env python3
"""Inspect an actor GLB without Blender: tris, bounds (Y-up), animations + durations, materials,
textures (size). Usage: glb_inspect.py file.glb [--json]"""
import json, struct, sys, io
from PIL import Image


def load(path):
    b = open(path, "rb").read()
    assert b[:4] == b"glTF"
    off = 12; js = None; binc = b""
    while off < len(b):
        ln, typ = struct.unpack_from("<II", b, off); off += 8
        chunk = b[off:off + ln]; off += ln
        if typ == 0x4E4F534A: js = json.loads(chunk)
        else: binc = chunk
    return js, binc


def inspect(path):
    g, binc = load(path)
    acc = g["accessors"]; tris = 0; mn = [1e9] * 3; mx = [-1e9] * 3; meshes = {}
    for m in g["meshes"]:
        t = 0
        for p in m["primitives"]:
            t += (acc[p["indices"]]["count"] if "indices" in p else acc[p["attributes"]["POSITION"]]["count"]) // 3
            pa = acc[p["attributes"]["POSITION"]]
            mn = [min(a, c) for a, c in zip(mn, pa["min"])]; mx = [max(a, c) for a, c in zip(mx, pa["max"])]
        meshes[m["name"]] = {"tris": t, "materials": [g["materials"][p["material"]]["name"] for p in m["primitives"] if "material" in p]}
        tris += t
    anims = {}
    for a in g.get("animations", []):
        d = 0
        for s in a["samplers"]:
            d = max(d, acc[s["input"]]["max"][0])
        anims[a["name"]] = round(d, 3)
    imgs = []
    for im in g.get("images", []):
        bv = g["bufferViews"][im["bufferView"]]
        data = binc[bv.get("byteOffset", 0): bv.get("byteOffset", 0) + bv["byteLength"]]
        imgs.append({"name": im.get("name"), "size": Image.open(io.BytesIO(data)).size, "kb": len(data) // 1024})
    mats = {}
    for m in g["materials"]:
        pbr = m.get("pbrMetallicRoughness", {})
        mats[m["name"]] = {"baseColorTex": "baseColorTexture" in pbr, "metallic": pbr.get("metallicFactor", 1),
                           "roughness": pbr.get("roughnessFactor", 1), "baseColorFactor": pbr.get("baseColorFactor"),
                           "emissiveTex": "emissiveTexture" in m, "emissiveFactor": m.get("emissiveFactor"),
                           "emissiveStrength": m.get("extensions", {}).get("KHR_materials_emissive_strength", {}).get("emissiveStrength"),
                           "doubleSided": m.get("doubleSided", False), "alphaMode": m.get("alphaMode", "OPAQUE")}
    skins = [{"joints": len(s["joints"])} for s in g.get("skins", [])]
    return {"tris": tris, "meshes": meshes, "bounds_min": [round(x, 3) for x in mn], "bounds_max": [round(x, 3) for x in mx],
            "height": round(mx[1] - mn[1], 3), "animations": anims, "materials": mats, "images": imgs, "skins": skins,
            "extensions": g.get("extensionsUsed", [])}


if __name__ == "__main__":
    r = inspect(sys.argv[1])
    print(json.dumps(r, indent=None if "--json" in sys.argv else 1))
