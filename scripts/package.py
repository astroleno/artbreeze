#!/usr/bin/env python3
"""Create a store-upload ZIP from an explicit runtime allowlist (no research datasets)."""
import json
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / "manifest.json").read_text())
slug = "waitwiki" if "WaitWiki" in manifest["name"] else "artbreeze"
files = [root / name for name in ("manifest.json", "content.js", "background.js", "styles.css", "popup.html", "popup.js", "privacy.md")]
files += [root / name for name in sorted(set(manifest["icons"].values()) | set(manifest["action"]["default_icon"].values()))]
files += sorted(path for path in (root / "gallery").rglob("*") if path.is_file())
if slug == "waitwiki":
    files += [root / "datafacts.csv", root / "gathas.csv"]
out = root / "dist" / f"{slug}-{manifest['version']}.zip"
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in files:
        # Stable timestamps make reviewed releases reproducible.
        info = zipfile.ZipInfo(path.relative_to(root).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, path.read_bytes())
print(f"{out.name}: {len(files)} files, {out.stat().st_size:,} bytes")
