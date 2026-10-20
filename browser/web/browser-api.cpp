// Old Games Archive browser lifecycle glue, GPL-2.0-or-later, 2026.
// Read-only state query. State-changing input must go through the SDL queue:
// calling set_state() from JS while Asyncify is suspended can re-enter drawing.
#include <emscripten.h>
#include "common.h"
#include "game.h"
extern "C" EMSCRIPTEN_KEEPALIVE int oga_browser_state()
{
    return the_game ? the_game->state : -1;
}
extern "C" EMSCRIPTEN_KEEPALIVE void oga_browser_stop()
{
    if (the_game) the_game->end_session();
}
