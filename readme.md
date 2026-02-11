# 🐉 Goku: Saiyan Ascension - Experimental RPG

> **Status:** Experimental / Active Development  
> **Type:** Browser-based Idle/Action RPG

## 📖 About The Project

This repository is an experimental project designed to explore the fusion of **Idle/Incremental mechanics** with **Action RPG gameplay** using pure, vanilla Web Technologies (HTML, CSS, and JavaScript).

The goal was to build a lightweight, mobile-responsive game engine that runs entirely in the browser without the need for heavy game engines (like Unity or Godot). It features persistent save states (local storage), complex stat calculations, and multiple game modes ranging from auto-battlers to open-world exploration.

---

## 🎨 A Note on Assets & Theming

**Current Theme: Dragon Ball Z**  
Currently, the project utilizes placeholder assets, sprites, and naming conventions inspired by the *Dragon Ball* universe (Goku, Ki, Saiyans, etc.) to demonstrate the engine's capabilities.

**Modular Design**  
The codebase is designed to be **theme-agnostic**. The core logic handles stats, collision, inventory, and progression independently of the visuals. This means the entire game can be "reskinned" for custom storylines (e.g., a Medieval Knight RPG, a Cyberpunk shooter, or a Fantasy Wizard game) simply by:
1. Replacing the `.png` assets in the root folder.
2. Updating the `ASSETS` configuration objects in the JavaScript files.
3. Renaming text strings (e.g., changing "Ki" to "Mana").

---

## 🌟 Key Features

### 1. The Hub (Idle Mechanics)
*   **Resource Management:** Train stats (Attack, Defense) using Gold.
*   **Gear System:** Inventory management, equipping items, and an "Auto-Merge" system to upgrade gear tiers.
*   **Soul System:** A prestige mechanic to reset progress for permanent multipliers.
*   **Offline Progression:** Calculates rewards earned while the player was away.

### 2. Battle Stages (Auto-Battler)
*   **Stage Progression:** Climb through increasingly difficult levels.
*   **Boss Fights:** Unique boss encounters (e.g., Frieza, Cell) with massive HP pools.
*   **Combat Logic:** Turn-based auto-attacks with critical hits, evasion, and special beam attacks.

### 3. Explore Mode (Open World RPG)
*   **Engine:** A custom 2D Canvas rendering engine (`battleworld.js`).
*   **Open World:** A massive, tiled scrolling map with procedural generation (Trees, Houses, NPCs).
*   **Action Combat:** Real-time movement using a virtual joystick, manual attacking, dodging, and charging mechanics.
*   **Loot & AI:** Enemies spawn dynamically, chase the player using basic pathfinding, and drop loot (Coins/XP) that can be magnetically collected.

---

## 🛠️ Tech Stack

*   **HTML5:** Structure and Canvas rendering.
*   **CSS3:** Responsive UI, Animations, and Flexbox layouts.
*   **JavaScript (ES6+):** Core game logic.
    *   No external libraries or frameworks.
    *   State management via a global `GameState` object.
    *   Modular architecture (`battle.js`, `gear.js`, `skills.js`, etc.).

---

## 🚀 How to Run

Because this project uses vanilla web technologies, no build step (npm/yarn) is required.

1.  **Clone the repo:**
    ```bash
    git clone https://github.com/vicsanity623/Monsters.git
    ```
2.  **Open:** Simply double-click `index.html` in your browser.
3.  **Host:** Works perfectly on GitHub Pages (Settings -> Pages -> Select Branch).

---

## 📂 File Structure Overview

*   `index.html`: The main entry point and UI container.
*   `game.js`: Core initialization, save/load logic, and global state management.
*   `hub.js`: Logic for the main idle screen.
*   `battle.js`: Logic for the stage-based auto-battler.
*   `battleworld.js`: The canvas-based open-world exploration engine.
*   `gear.js` / `advance.js`: Inventory and equipment upgrade systems.
*   `style.css`: All visual styling and UI animations.

---

## ⚠️ Disclaimer

This is a non-profit, educational experiment. All Dragon Ball Z sprites and names are the property of **Toei Animation** and **Akira Toriyama**. They are used here strictly as placeholders for development purposes. If you fork this repo for commercial use, you **must** replace these assets with your own original content.
