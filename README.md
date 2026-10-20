# Abuse — browser restoration

Play the restored single-player game in the
[Old Games Archive player](https://oldgamesarchive.org/games/abuse)
or read the [Chinese game page](https://oldgamesarchive.org/zh-cn/games/abuse).

Abuse was created by **Crack dot Com** in 1995. This is a browser adaptation of
the community SDL port maintained by **Anthony Kruize, Sam Hocevar,
Xenoveritas and the upstream contributors**. It is not a new game made by us.
The original [AUTHORS](AUTHORS), source notices, licenses and Git history
are preserved. Browser integration and the documented fixes are by
**Old Games Archive / CatBroDev**, 2026.

## What changed

- A WebAssembly build with fixes for cold startup in baseline browser compilers.
- Correct handling of quick mouse clicks and Escape, plus input release on
  cancellation/focus loss.
- Mouse aiming on desktop and simultaneous movement/aim/fire through the
  website's mobile controller.
- Original save-station slots persisted in this browser with IDBFS.
- Safe handling of absent sound files, working mute and licensed replacement
  sound effects from the **Freedoom contributors**.
- A parent-window/origin-checked player bridge for readiness, pause, sound
  and shutdown.

The effects are replacements, not Abuse's original recordings. Original music,
online multiplayer and DOS-emulator save-state migration are not included.
Saves belong to this browser and asset origin and are lost when its storage is
cleared. The current validation covers startup, gameplay controls, pause,
save/reopen/load and audio output/mute; it does not claim a complete campaign
playthrough or real-phone acceptance.

## Build and inspect

Read [BUILD.md](BUILD.md) for the pinned SDK, one-command build, source layout,
muted tests and integration protocol. The original native instructions remain
in [BUILDING.md](BUILDING.md) and [README.upstream.md](README.upstream.md).

The full restoration is on the default `master` branch and is also retained
on `codex/browser-restoration`. The small native
sound safety fix is isolated on `codex/missing-sound-chunk` and submitted as
[upstream PR #33](https://github.com/Xenoveritas/abuse/pull/33);
browser packaging and website integration are separate from that patch.

The deployed version's [corresponding source archive](https://assets.oldgamesarchive.org/games/native/abuse/bfc53c4c82300a4e5c94effca39fe9e93ff1c44375a5856e9105a24c8284604d/source.zip)
has SHA-256
`b2221fdd982a3e6a8aa408a73aef6178c6e26aa1a4edec9762a3a6400ede6553`.
[The source manifest](browser/release-source.json) records the exact port,
shell and replacement-audio files used in that release.

## Credits and licensing

This repository retains [the upstream license breakdown](COPYING): the
Crack dot Com core/data release, GPL-2.0-or-later SDL port and WTFPL components.
Original authors' notices apply to their respective files.
New browser glue is GPL-2.0-or-later. The unchanged replacement sound files are
BSD-3-Clause; [their mapping and full notices](browser/replacement-data/licenses/)
include Freedoom's contributors and fixed source revision. Dependency license
texts are in [browser/licenses](browser/licenses/).

Upstream: [Xenoveritas/abuse](https://github.com/Xenoveritas/abuse).
