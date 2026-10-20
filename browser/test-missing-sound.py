"""Exercise the actual sound_effect methods with deterministic SDL/file doubles.

The doubles avoid an audio device and let us cover missing/invalid WAV files.
No implementation of the methods under test is copied into this test.
"""
from pathlib import Path
import argparse
import os
import shutil
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
sdk = Path(os.environ["EMSDK"])
text = args.source.read_text(encoding="utf-8")
methods = text[text.index("sound_effect::sound_effect("):text.index("// Play music using SDL_Mixer")]
args.output.mkdir(parents=True, exist_ok=True)
harness = r'''
#include <cassert>
#include <cstdlib>
#include <cstring>
#include <new>
#include <cstdio>
static int sound_enabled = 1;
struct Mix_Chunk {};
struct SDL_RWops {};
static Mix_Chunk chunk;
static SDL_RWops rwops;
static bool missing = false, invalid = false;
static int played = 0, freed = 0, faded = 0;
struct jFILE {
    jFILE(const char *, const char *) {}
    bool open_failure() { return missing; }
    int file_size() { return 4; }
    void read(void *, int) {}
};
SDL_RWops *SDL_RWFromMem(void *, int) { return &rwops; }
Mix_Chunk *Mix_LoadWAV_RW(SDL_RWops *, int) { return invalid ? NULL : &chunk; }
int Mix_PlayChannel(int, Mix_Chunk *p, int) { assert(p == &chunk); ++played; return 0; }
void Mix_FreeChunk(Mix_Chunk *p) { assert(p == &chunk); ++freed; }
void Mix_FadeOutGroup(int, int) { ++faded; }
int Mix_Playing(int) { return 0; }
void SDL_Delay(int) {}
void Mix_Volume(int, int) {}
void Mix_SetPanning(int, int, int) {}
class sound_effect {
    Mix_Chunk *m_chunk;
public:
    sound_effect(const char *);
    ~sound_effect();
    void play(int, int, int);
};
'''
main = r'''
int main() {
    for (int scenario = 0; scenario < 4; ++scenario) {
        // Poison allocation so an uninitialized pointer cannot accidentally be null.
        void *storage = malloc(sizeof(sound_effect));
        memset(storage, 0xa5, sizeof(sound_effect));
        sound_enabled = scenario != 0;
        missing = scenario == 1;
        invalid = scenario == 2;
        played = freed = faded = 0;
        sound_effect *effect = new (storage) sound_effect("test.wav");
        effect->play(100, 0, 128);
        effect->~sound_effect();
        const int expected = scenario == 3 ? 1 : 0;
        assert(played == expected && freed == expected && faded == expected);
        free(storage);
    }
    puts("PASS: disabled audio, missing file, invalid WAV, valid WAV");
}
'''
cpp = args.output / "missing-sound.cpp"
cpp.write_text(harness + methods + main, encoding="utf-8")
js = args.output / "missing-sound.js"
temporary = args.output.resolve() / "tmp"
temporary.mkdir(exist_ok=True)
env = dict(os.environ, EM_CONFIG=str(sdk / ".emscripten"), EMSDK_PYTHON=sys.executable,
           TEMP=str(temporary), TMP=str(temporary), EMCC_TEMP_DIR=str(temporary))
subprocess.run([sys.executable, str(sdk / "upstream/emscripten/em++.py"), str(cpp),
                "-std=c++11", "-O0", "-sENVIRONMENT=node", "-sASSERTIONS=1",
                "-o", str(js)], env=env, check=True, timeout=90)
subprocess.run([shutil.which("node"), str(js)], check=True, timeout=20)
