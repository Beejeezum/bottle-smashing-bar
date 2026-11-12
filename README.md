# The Bottle Smashing Bar

A first-person browser game. Walk into a dive bar, order a drink, finish it, then carry the empty into the warehouse next door and throw it at something cute.

The drunker you get, the harder it is to aim and the more every smash is worth.

## Play

It is a static site with no build step. Serve the folder and open it:

```bash
python3 -m http.server 8765
```

Then visit http://localhost:8765. It needs an internet connection, because Three.js and the fonts load from CDNs.

## Controls

- `W A S D` walk, `Shift` hustle, mouse to look
- `E` at the bar to order (number keys pick a drink)
- Hold click (or `F` / `Space`) to drink; with an empty in the range, hold to wind up and release to throw
- If mouse-look does not lock, hold right-click and drag, or use the arrow keys

## How it's made

There are no image, model or audio files.

- `js/textures.js` paints every surface and neon sign onto canvases at load
- `js/drinks.js` turns glassware on a lathe from 2D profiles
- `js/people.js` draws the bartender and regulars as animated neon-tube figures
- `js/world.js` builds the street, the bar room and the warehouse
- `js/targets.js` builds the Smash Range and everything breakable in it
- `js/fx.js` handles shards, sparks, score pop-ups and the drunk-vision shader
- `js/audio.js` synthesizes every sound and the jukebox with the Web Audio API
- `js/main.js` is the game loop, controls and HUD
