#!/usr/bin/env python3
"""Copy a reviewed gallery version between the two independent extension repos."""
import argparse
import json
import shutil
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--from", dest="source", type=Path, required=True)
parser.add_argument("--to", dest="target", type=Path)
args = parser.parse_args()
target = args.target or Path(__file__).resolve().parents[1] / "gallery"
source = args.source.resolve()
if source == target.resolve():
    raise SystemExit("Source and destination must differ")
catalogue = json.loads((source / "scenes.json").read_text())
if len(catalogue["scenes"]) != 24:
    raise SystemExit("Expected the reviewed 24-room catalogue")
shutil.copytree(source, target, dirs_exist_ok=True)
print(f"Synced gallery version {catalogue['version']} ({len(catalogue['scenes'])} rooms)")
