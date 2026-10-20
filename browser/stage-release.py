"""Package only the single-player core data and verified replacement effects."""
from pathlib import Path
import os
import shutil
import subprocess
import sys
lab = Path(__file__).resolve().parents[1]
build = lab / "build" / sys.argv[1]
data = build / "data-stage"
for p in sorted((lab / "data").rglob("*")):
    if not p.is_file():
        continue
    rel = p.relative_to(lab / "data")
    if rel.parts[0] not in {"art", "levels", "lisp"} and rel.as_posix() not in {"abuse.lsp", "hardness.lsp", "defaults.prp"}:
        continue
    target = data / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, target)
shutil.copytree(lab / "browser/replacement-data", data, dirs_exist_ok=True)
sdk = Path(os.environ["EMSDK"])
subprocess.run([sys.executable, str(sdk / "upstream/emscripten/tools/file_packager.py"),
                "assets.data", "--preload", str(data) + "@/data", "--js-output=assets.js"],
               cwd=build, check=True, timeout=90)
for name in ["index.html", "input.js", "persistence.js", "bridge.js"]:
    shutil.copy2(lab / "browser/web" / name, build / name)
print("Staged production shell and single-player data; no test UI or relocation exports.")

shutil.copy2(lab / "COPYING", build / "COPYING")
shutil.copy2(lab / "BUILD.md", build / "README.txt")
notices = [("Upstream", lab / "COPYING")]
notices += [(p.name, p) for p in sorted((lab / "browser/licenses").iterdir()) if p.is_file()]
(build / "notices.txt").write_text("\n\n".join(
    name + "\n" + p.read_text(encoding="utf-8") for name, p in notices), encoding="utf-8")
