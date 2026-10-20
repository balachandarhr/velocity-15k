#!/bin/sh
cd "$(dirname "$0")" && cat src/0-head.js src/1-core.js src/2-sprites.js src/3-world.js src/4-track.js src/5a-audio.js src/5-ui.js src/6-race.js src/7a-render2d.js src/7b1-models.js src/7b2-render3d.js src/7c-loop.js > game.js
