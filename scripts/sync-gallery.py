#!/usr/bin/env python3
"""Stage and validate a product-specific catalogue before replacing managed resources."""
import argparse
import hashlib
import json
import os
import shutil
import tempfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--from", dest="source", type=Path, required=True)
parser.add_argument("--to", dest="target", type=Path, required=True)
parser.add_argument("--product", choices=("artbreeze", "waitwiki"), required=True)
args = parser.parse_args()
source, target = args.source.resolve(), args.target.resolve()
if source == target:
    raise SystemExit("Source and target must differ")
catalogue = json.loads((source / "scenes.json").read_text())
selected = catalogue["scenes"] if args.product == "artbreeze" else [s for s in catalogue["scenes"] if s["id"] == "bg-027"]
if len(selected) != (24 if args.product == "artbreeze" else 1):
    raise SystemExit("Unexpected product scene count")
target.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix=".gallery-stage-", dir=target.parent) as temporary:
    stage = Path(temporary) / "gallery"
    stage.mkdir()
    for file in source.iterdir():
        if file.is_file() and file.name not in ("scenes.json", "catalogue.js"):
            shutil.copy2(file, stage / file.name)
    (stage / "images").mkdir()
    for scene in selected:
        file = source.parent / scene["image"]
        if hashlib.sha256(file.read_bytes()).hexdigest() != scene["provenance"]["sha256"]:
            raise SystemExit("Source hash mismatch: " + scene["id"])
        shutil.copy2(file, stage / "images" / file.name)
    payload = {**catalogue, "version": 2, "product": args.product, "scenes": selected}
    serialized = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    (stage / "scenes.json").write_text(serialized)
    (stage / "catalogue.js").write_text(
        "// Generated product catalogue; no runtime source-project dependency.\n"
        "(function(root){const data=" + serialized.strip() +
        ";root.GalleryCatalogue=data;if(typeof module==='object'&&module.exports)module.exports=data;})(globalThis);\n")
    source_note = (stage / "SOURCES.md").read_text()
    (stage / "SOURCES.md").write_text(
        "# Distributed gallery assets\n\nThis product distributes exactly " + str(len(selected)) +
        " imagined exhibition environment(s). " +
        ("WaitWiki uses bg-027 only; no other scene is included.\n\n" if args.product == "waitwiki" else "ArtBreeze keeps its reviewed 24 scene IDs.\n\n") +
        "Original provenance is recorded per item in scenes.json. Source collection: ArtDuo, "
        "data/releases/2026-10-15-experience/background-scenes-01.json. "
        "These are generated environments, not photographs of named museums. "
        "Original paths and SHA-256 hashes are retained. Source ownership statements do not replace third-party content licences.\n")
    backup = Path(temporary) / "previous"
    if target.exists():
        os.replace(target, backup)
    try:
        os.replace(stage, target)
    except BaseException:
        if backup.exists():
            os.replace(backup, target)
        raise
print(args.product + ": " + str(len(selected)) + " verified gallery resource(s)")
