# Velocity 15K: accessible motorbike racing

Live: https://balachandarhr.github.io/velocity-15k/

**Real 3D (Three.js r186, vendored in `vendor/`, no CDN).** Low/mid-poly 3D bikes with riders (lean, spinning wheels) for all 10 garage types; a 3D road with curves, hills, lane markings and kerbs; 3D buildings (procedural facades), city landmarks, traffic, trees, palms and street lights; gradient sky with fog, sun and shadows, PBR materials, boost glow (bloom) and exhaust particles; a chase camera with a speed FOV kick; and a turning 3D bike preview in the Garage.
**Graphics quality:** Settings → Graphics quality: Auto (default), Low, Medium or High. Auto picks Low for small, low-memory or software-rendered devices, Medium for other phones and tablets, and High for desktops. It also steps down if the frame rate stays under about 30 fps.

| Quality | Pixel ratio | Shadows | Bloom | Materials | View distance |
|---|---|---|---|---|---|
| Low | 1× | off | off | Lambert/Phong | ~380 m |
| Medium | 1.5× | 1024 map | off | PBR | ~560 m |
| High | 2× | 2048 map | on | PBR | ~760 m |

If WebGL isn't available, the game falls back to the original 2D renderer. ES modules need a web server, so run `python3 -m http.server` in this folder; opening `index.html` straight from disk (file://) won't load.

- **Garage:** 10 bikes (scooter, commuter, electric, café racer, street naked, superbike, motocross, adventure, cruiser, tourer) in 10 colours. Each has its own top speed, acceleration, handling, boost time and off-road grip. The standard bike does 100 km/h, and every boost adds +20 km/h.
- **Race types:** a 15 km sprint, or a circuit with 1, 3, 5 or 10 laps (2.4 km per lap) with lap counter and lap times.
- **Locations:** World Tour (5 zones), Mumbai, Tokyo (night), Paris, New York, Dubai, London, Countryside and Sunset Coast. Each has its own colours, time of day, buildings and landmark skyline.
- **Traffic:** None, Light, Medium or Heavy. Cars, taxis, trucks, buses, double-deckers and auto-rickshaws drive in the lanes and change lanes, and hitting one slows you down.
- **Time scale:** the game clock runs 3× faster than real time. Speeds and distances are real.

Controls: arrows or WASD (Space also accelerates), P/Esc to pause, M for sound, H for high contrast, I to announce your status. Touch buttons appear on phones.
Accessibility options are auto-steer, one-button mode, auto-accelerate, game speed 50 to 125%, high contrast, reduced motion and live screen-reader announcements. Every screen works with the keyboard (arrow keys move through the garage choices).
Source is split into src/*.js and concatenated into game.js by `./build.sh` (an ES module; `0-head.js` holds the Three.js imports).
