"""Build the verified browser port with Emscripten 4.0.23."""
from pathlib import Path
import os
import re
import subprocess
import sys

lab = Path(__file__).resolve().parents[1]
source = lab
browser = lab / "browser"
if not os.environ.get("EMSDK"):
    raise SystemExit("Set EMSDK to your Emscripten 4.0.23 SDK directory.")
sdk = Path(os.environ["EMSDK"])
build_name = sys.argv[1] if len(sys.argv) > 1 else "web"
if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]*", build_name):
    raise SystemExit("Use a simple build directory name, e.g. web.")
out = lab / "build" / build_name
out.mkdir(parents=True, exist_ok=True)
temporary = out / "tmp"
temporary.mkdir(exist_ok=True)
config = (source / "config.h.in").read_text(encoding="utf-8")
enabled = {"HAVE_ATEXIT", "HAVE_DIRENT_H", "HAVE_FCNTL_H", "HAVE_GETTIMEOFDAY",
           "HAVE_INTTYPES_H", "HAVE_MALLOC_H", "HAVE_MEMORY_H", "HAVE_STDINT_H",
           "HAVE_STDLIB_H", "HAVE_STRINGS_H", "HAVE_STRING_H", "HAVE_STRSTR",
           "HAVE_SYS_STAT_H", "HAVE_SYS_TIME_H", "HAVE_SYS_TYPES_H",
           "HAVE_UNISTD_H", "STDC_HEADERS"}
config = re.sub(r"^#cmakedefine01 HAVE_NETWORK$", "#define HAVE_NETWORK 0", config, flags=re.M)
config = re.sub(r"^#cmakedefine (\w+)$",
                lambda m: "#define " + m[1] + " 1" if m[1] in enabled else "/* " + m[1] + " unset */",
                config, flags=re.M)
(out / "config.h").write_text(config, encoding="utf-8")
sources = sorted(p for p in (source / "src").rglob("*.cpp") if "tool" not in p.relative_to(source).parts)
sources = [browser / "overrides" / p.relative_to(source)
           if (browser / "overrides" / p.relative_to(source)).is_file() else p for p in sources]
sources.append(browser / "web/browser-api.cpp")
command = [sys.executable, str(sdk / "upstream/emscripten/em++.py"),
           *map(str, sources), "-std=gnu++98", "-O1", "-DHAVE_CONFIG_H", "-DNO_CHECK",
           '-DASSETDIR="/data"', '-DPACKAGE_NAME="abuse"', '-DPACKAGE_VERSION="0.9.1"',
           *["-I" + str(p) for p in [out, source / "src", source / "src/imlib", source / "src/lisp", source / "src/net", source / "src/sdlport"]],
           "-sUSE_SDL=2", "-sUSE_SDL_MIXER=2", '-sSDL2_MIXER_FORMATS=["mod"]',
           "-sASYNCIFY", "-sALLOW_MEMORY_GROWTH=1", "-sENVIRONMENT=web",
           "-sEXIT_RUNTIME=1", "-sASSERTIONS=1", "-sFORCE_FILESYSTEM=1",
           "--emit-symbol-map",
           "-lidbfs.js", '-sEXPORTED_RUNTIME_METHODS=["FS","IDBFS","addRunDependency","removeRunDependency"]',
           "-o", str(out / "abuse.js")]
# Preserve the Lisp runtime's explicit nil checks; give nested save menus room.
command += ["-fno-delete-null-pointer-checks", "-sASYNCIFY_STACK_SIZE=65536"]
env = dict(os.environ, EM_CONFIG=str(sdk / ".emscripten"),
           EMSDK_PYTHON=sys.executable, EMCC_CORES="4", TEMP=str(temporary), TMP=str(temporary), EMCC_TEMP_DIR=str(temporary))
print("Compiling", len(sources), "C++ files with the verified browser overrides", flush=True)
code = subprocess.run(command, cwd=source, env=env, timeout=480).returncode
if code == 0:
    # Keep legacy C++ at O1; O2 exposes a separate historical GC aliasing issue.
    # Coalescing WASM locals preserves behavior while reducing baseline browser
    # stack frames in the large, recursive Lisp switch interpreter.
    compact = out / "compact.wasm"
    subprocess.run([str(sdk / "upstream/bin" / ("wasm-opt.exe" if os.name == "nt" else "wasm-opt")), str(out / "abuse.wasm"),
                    "--coalesce-locals", "-g", "-o", str(compact)],
                   env=env, check=True, timeout=120)
    (out / "abuse.wasm").write_bytes(compact.read_bytes())
if code:
    raise SystemExit(code)
subprocess.run([sys.executable, str(browser / "stage-release.py"), out.name], check=True)

