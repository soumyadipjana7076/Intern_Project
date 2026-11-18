# 🐔 Chicken Run — Temple Escape Edition

A playable **2.5D pseudo-3D endless runner** built with pure **Frontend (HTML5, CSS3, Vanilla JavaScript)** and a **Core Java backend** using `com.sun.net.httpserver.HttpServer`.

**Zero external dependencies, frameworks, or databases** — high scores are stored and managed exclusively in **in-memory Java Arrays** (`ScoreRecord[]`) with array insertion-sort logic.

---

## 🌟 Key Highlights & Features

### 1. 🎨 Frontend (HTML5, CSS3, JavaScript)

- **Pure Native Stack**: No React, Vite, Webpack, or Node.js required. Runs directly in any web browser or served through the Java server.
- **2.5D Pseudo-3D Perspective**: Moving cobblestone road with lane markers, atmospheric parallax sky, ancient temple pyramids, jungle mountains, and roadside torch-lit stone pillars.
- **Procedural Animated Chicken**:
  - Running leg cycle and foot stride.
  - Wobbly red comb, head bobbing, and wing flapping (flutters rapidly during jumps).
  - Parabolic jump arc with ground shadow scaling.
  - Low ducking slide animation with motion dust trails.
  - Particle systems for jump feathers, slide dust, gold coin sparkles, and collision explosions.
- **Dynamic Obstacles & Collectibles**:
  - **Temple Boulders / Rocks**: Jump over or switch lanes.
  - **Hanging Temple Beams**: Slide under or switch lanes.
  - **3D Spinning Gold Coins**: Collect for score multipliers and coin count.
  - **Golden Egg Power-ups**: Rare glowing eggs granting massive point boosts.
- **Built-in Web Audio API Synthesizer**: Retro arcade audio generated entirely in browser memory (jump whoosh, slide swoosh, coin chime, egg fanfare, crash thud). Includes toggleable mute switch persisted in `localStorage`.
- **Responsive & Touch Friendly**: Includes desktop keyboard controls and on-screen touch/swipe gestures for mobile and tablet play.

### 2. ☕ Core Java Backend

- **Standard Library Only**: Powered by standard `com.sun.net.httpserver.HttpServer` with a multi-threaded fixed thread pool (`Executors.newFixedThreadPool(8)`).
- **Dual Engine**:
  - Serves REST API endpoints (`/api/*`).
  - Acts as a built-in static web server serving `index.html`, `style.css`, and `game.js` directly on `http://localhost:8080/`.
- **Full CORS Support**: `Access-Control-Allow-Origin: *` enabled across all endpoints for seamless cross-origin requests.

### 3. 📦 Database: Pure Java Array Storage

- **Requirement Fulfilled**: Storage is handled exclusively using native Java arrays (`ScoreRecord[]`).
- **Array Mechanics Demonstrated**:
  - Fixed capacity array: `private static final ScoreRecord[] scoreDatabase = new ScoreRecord[50];`
  - Descending insertion-sort: When a score is submitted, the array searches for the appropriate insertion index and shifts trailing elements right (`scoreDatabase[i] = scoreDatabase[i - 1]`).
  - Pre-seeded championship scores for instant competition.
  - Thread-safe synchronization via monitor lock.

---

## 🚀 Quick Start Guide

### Option A: One-Click Launch (Windows)

Double-click `run-backend.bat`. It will automatically:

1. Compile `Main.java` into `backend/bin/`.
2. Start the Core Java server on port `8080`.
3. Open your browser directly to `http://localhost:8080/`.

---

### Option B: Command Line (Any OS)

#### 1. Compile & Start Core Java Backend

```bash
# Navigate to the project root
javac -d backend/bin backend/src/Main.java
java -cp backend/bin Main 8080
```

#### 2. Play the Game

Open your web browser and go to:

```
http://localhost:8080/
```

_(Alternatively, you can open `frontend/index.html` directly in your browser or with VS Code Live Server — it automatically connects to the backend API!)_

---

## 🎮 Controls

| Action              | Keyboard              | Touch / Mobile             |
| :------------------ | :-------------------- | :------------------------- |
| **Move Left**       | `A` or `←`            | Swipe Left or Tap `◀`      |
| **Move Right**      | `D` or `→`            | Swipe Right or Tap `▶`     |
| **Jump**            | `W` or `↑` or `Space` | Swipe Up or Tap `▲`        |
| **Slide**           | `S` or `↓`            | Swipe Down or Tap `▼`      |
| **Pause / Resume**  | `P` or `Esc`          | Pause button               |
| **Start / Restart** | `Enter`               | Tap Start / Restart button |

---

## 📡 REST API Reference

| Method   | Endpoint           | Description                                     | Sample Response                                                                                   |
| :------- | :----------------- | :---------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| **GET**  | `/api/health`      | Server health & array capacity check            | `{"status":"UP","port":8080,"database":"Pure Java Array Storage","arrayCapacity":50}`             |
| **GET**  | `/api/leaderboard` | Returns top ranking runners from array          | `{"success":true,"count":5,"scores":[{"rank":1,"player":"TempleKing","score":15420,"coins":68}]}` |
| **POST** | `/api/score`       | Submits score, inserts into array, returns rank | `{"saved":true,"rank":2,"player":"Runner","score":14200,"coins":55,"leaderboard":{...}}`          |
| **POST** | `/api/reset`       | Resets array to default champion scores         | `{"reset":true,"leaderboard":{...}}`                                                              |

---

## 📁 Project Structure

```text
chicken-run-temple/
├── run-backend.bat         # 1-Click compiler and launcher script
├── README.md               # Complete project documentation
├── backend/
│   ├── bin/                # Compiled Java .class files
│   └── src/
│       └── Main.java       # Core Java HTTP server + Array database engine
└── frontend/
    ├── index.html          # Semantic HTML5 layout, HUD & modal overlays
    ├── style.css           # Arcade & Temple Run theme with CSS keyframe animations
    └── game.js             # Canvas 2.5D game loop, physics, sound FX & API client
```
