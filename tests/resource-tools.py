"""Optional source-asset regeneration checks; ordinary builds need no ArtDuo checkout."""
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

root = pathlib.Path(__file__).resolve().parents[1]
source, output = map(pathlib.Path, sys.argv[1:3])
checks = []


def check(value, label):
    checks.append({"pass": bool(value), "label": label})
    if not value:
        raise AssertionError(label)


def digest(folder):
    return {str(f.relative_to(folder)): hashlib.sha256(f.read_bytes()).hexdigest()
            for f in folder.rglob("*") if f.is_file()}


def run(script, args, success=True):
    result = subprocess.run([sys.executable, str(root / "scripts" / script), *map(str, args)], capture_output=True, text=True)
    if success and result.returncode:
        raise RuntimeError(result.stderr)
    return result


try:
    with tempfile.TemporaryDirectory(prefix="gallery-assets-validation-") as temporary:
        temp = pathlib.Path(temporary)
        for product, count in [("artbreeze", 24), ("waitwiki", 1)]:
            target = temp / product
            if product == "waitwiki":
                shutil.copytree(root / "gallery", target)
            run("prepare-gallery.py", ["--artduo", source, "--out", target, "--product", product])
            data = json.loads((target / "scenes.json").read_text())
            check(data["version"] == 2 and data["product"] == product and len(data["scenes"]) == count, product + ": regenerated catalogue is product-specific v2")
            check(len(list((target / "images").iterdir())) == count, product + ": regeneration removes stale scenes")
            before = digest(target)
            result = run("prepare-gallery.py", ["--artduo", temp / "absent", "--out", target, "--product", product], False)
            check(result.returncode != 0 and digest(target) == before, product + ": failed regeneration preserves previous target")
            sync = temp / ("sync-" + product)
            args = ["--from", root / "gallery", "--to", sync, "--product", product]
            run("sync-gallery.py", args)
            before = digest(sync)
            run("sync-gallery.py", args)
            check(digest(sync) == before, product + ": repeated sync is identical")
            corrupt = temp / ("bad-" + product)
            shutil.copytree(root / "gallery", corrupt)
            (corrupt / ("images/bg-005.webp" if product == "artbreeze" else "images/bg-027.webp")).write_bytes(b"corrupt")
            result = run("sync-gallery.py", ["--from", corrupt, "--to", sync, "--product", product], False)
            check(result.returncode != 0 and digest(sync) == before, product + ": source hash failure leaves target intact")
finally:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"checks": checks}, indent=2))
    print(json.dumps({"checks": checks}, indent=2))
