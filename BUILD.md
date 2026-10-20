# Building the Abuse browser restoration

The browser build uses Emscripten **4.0.23**, Python 3 and the original upstream
tree at `9d1f66f57377859bae10e28eabebea0b9c750490`. Install that SDK using the
[official Emscripten instructions](https://emscripten.org/docs/getting_started/downloads.html).
Its initial SDL2 / SDL2_mixer port build needs network access.

Set `EMSDK` to the absolute path of the installed SDK, then run from this repository:

```sh
python browser/build-web.py web
python -m http.server 8080 --directory build/web --bind 127.0.0.1
```

Open `http://127.0.0.1:8080`. The build script stages the selected single-player
data and pinned replacement sounds; it does not download any game's audio.
The standalone runtime supports desktop keyboard/mouse input and starts muted.
The [hosted player](https://oldgamesarchive.org/games/abuse) supplies the touch
aiming pad, mute, fullscreen and lifecycle controls.

On PowerShell, set the SDK with `$env:EMSDK='C:\path\to\emsdk'`. On a POSIX
shell use `export EMSDK=/path/to/emsdk`. The script selects `wasm-opt.exe` on
Windows and `wasm-opt` elsewhere. This release was rebuilt and tested on
Windows; other host operating systems have not been separately validated.

## Source layout

- The upstream source, `AUTHORS`, `COPYING*`, data and full Git history remain.
- `browser/overrides/src/` contains three complete compilation units used by the
  browser build: `game.cpp`, `sdlport/event.cpp`, `sdlport/sound.cpp`.
  Other units come directly from `src/`. Keeping the browser-specific units
  separate avoids changing the native CMake build to require Emscripten.
- `browser/web/` contains the input bridge, persistence, lifecycle bridge and
  minimal runtime shell. New browser glue is GPL-2.0-or-later.
- `browser/replacement-data/` contains the exact replacement WAV files and
  Freedoom's BSD license, contributor credits and source-to-slot mapping.
- `browser/release-source.json` ties these files to the deployed corresponding
  source archive with individual SHA-256 values. Build outputs can differ with
  checkout paths and tool versions; this is not a bit-identical-build claim.

## Build decisions

The historical Lisp runtime uses null `this` pointers for nil. The browser build
retains its explicit checks with `-fno-delete-null-pointer-checks`. C++ stays at
**O1**: changing it to O2 exposed a separate GC memory error during testing.
After linking, `wasm-opt --coalesce-locals -g` reduces the large recursive Lisp
switch's frame size so baseline browser compilation can start the game.

Asyncify allows the original synchronous menus and game loop to yield. Its
stack is **65,536 bytes** so the nested original save-slot dialog fits.
`browser/web/persistence.js` mounts `/home/web_user/.abuse` in IDBFS before startup.
The game keeps its original save stations and 15 slots; this is not arbitrary
save-state support or compatibility with a DOS emulator's snapshots.

The build excludes the original `data/sfx` and `data/music`. It selects the core
art, levels, Lisp files and three root data files, then adds the 53 unchanged
Freedoom WAV files mapped to 73 effect slots. These are replacement effects,
not the original recordings. No original music or multiplayer server is supplied.

## Validation

Optional browser tests use Node.js, Google Chrome and the pinned Playwright:

```sh
npm install --prefix browser --ignore-scripts
node browser/smoke-cold-start.mjs web smoke-normal default 3
node browser/smoke-cold-start.mjs web smoke-baseline baseline 3
python browser/test-missing-sound.py src/sdlport/sound.cpp --output build/sound-test
```

Each smoke test creates a fresh muted headless browser, checks that original
input becomes ready, writes a JSON receipt and closes its browser/server.
Use a fresh evidence directory for another run. The baseline mode is a test of
Chrome's baseline WASM compiler, not a production setting or visitor requirement.

The sound regression test extracts the actual constructor/destructor/play
methods from the supplied source and links them with deterministic file and
mixer doubles. It poisons newly allocated object memory and covers disabled
audio, missing files, invalid WAV data and a successful load/play/free. It
requires no audio device. The unmodified upstream source fails the missing-file
case; the three-line upstream patch passes all four cases.

The hosted release additionally passed desktop/mobile viewport tests, movement
with simultaneous touch aiming/fire, cancellation, pause/resume, native save,
browser-close/reopen/load and mixer PCM/mute checks. These were automated,
muted tests. Full-campaign completion, subjective sound quality and real
Android/iOS validation of this Abuse port are not claimed.

## Embedding

The optional protocol is implemented in `browser/web/bridge.js`. It accepts
messages only from the expected parent window and an explicit allowed origin.
Use `index.html?embedded=1&host=<encoded-origin>`; localhost HTTP is allowed for
development. Do not replace the checks with `*`. The published site sends
keyboard events and normalized pointer coordinates through this bridge.

`controlsReady` means the intro can accept input; `gameInitialized` means the
constructor has finished. Pause/resume use queued original keys rather than
re-entering an Asyncify stack. Muting silences the mixer while leaving its clock
alive for fade and shutdown. Never ship relocation, state-probe or save-fixture
exports from a test build.

## Native builds

See [the original build instructions](BUILDING.md) and
[upstream README](README.upstream.md). This browser work does not replace them.
