#!/usr/bin/env python3
"""Deterministic store ZIP with an explicit runtime allowlist."""
import hashlib
import json
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / "manifest.json").read_text())
reading = "WaitWiki" in manifest["name"]
slug = "waitwiki" if reading else "artbreeze"
catalogue = json.loads((root / "gallery/scenes.json").read_text())
assert len(catalogue["scenes"]) == (1 if reading else 24)
assert {p.name for p in (root / "gallery/images").iterdir()} == {Path(s["image"]).name for s in catalogue["scenes"]}
for scene in catalogue["scenes"]:
    assert hashlib.sha256((root / scene["image"]).read_bytes()).hexdigest() == scene["provenance"]["sha256"]
files = [root / n for n in ("manifest.json", "content.js", "background.js", "providers.js", "styles.css", "popup.html", "popup.js", "options.html", "options.js", "privacy.md", "privacy.html")]
files += [root / n for n in sorted(set(manifest["icons"].values()) | set(manifest["action"]["default_icon"].values()))]
files += sorted(p for p in (root / "gallery").rglob("*") if p.is_file())
if reading:
    files += [root / n for n in ("local-content.json", "datafacts.csv", "gathas.csv")]
out = root / "dist" / f"{slug}-{manifest['version']}.zip"
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in files:
        info = zipfile.ZipInfo(path.relative_to(root).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, path.read_bytes())
print(f"{out.name}: {len(files)} files, {out.stat().st_size:,} bytes")
