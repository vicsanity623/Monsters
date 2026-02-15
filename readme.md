# 🐉 Goku: Saiyan Ascension - Experimental RPG

> **Status:** Experimental / Active Development  
> **Type:** Browser-based Idle/Action RPG

## 📖 About The Project

This repository is an experimental project designed to explore the fusion of **Idle/Incremental mechanics** with **Action RPG gameplay** using pure, vanilla Web Technologies (HTML, CSS, and JavaScript).

The goal was to build a lightweight, mobile-responsive game engine that runs entirely in the browser without the need for heavy game engines (like Unity or Godot). It features persistent save states (local storage), complex stat calculations, and multiple game modes ranging from auto-battlers to open-world exploration.

---

## 🎨 A Note on Assets & Theming

**Current Theme: Dragon Ball Z**  
Currently, the project utilizes placeholders assets, sprites, and naming conventions inspired by the *Dragon Ball* universe (Goku, Ki, Saiyans, etc.) to demonstrate the engine's capabilities.

**Modular Design**  
The codebase is designed to be **theme-agnostic**. The core logic handles stats, collision, inventory, and progression independently of the visuals. This means the entire game can be "reskinned" for custom storylines (e.g., a Medieval Knight RPG, a Cyberpunk shooter, or a Fantasy Wizard game) simply by:
1. Replacing the `.png` assets in the root folder.
2. Updating the `ASSETS` configuration objects in the JavaScript files.
3. Renaming text strings (e.g., changing "Ki" to "Mana").

---

## 🌟 Key Features

### 1. The Hub (Idle Mechanics)
*   **Resource Management:** Train stats (Attack, Defense) using Gold.
*   **Gear System:** Inventory management, equipping items, and an **Auto-Merge** system to upgrade gear tiers.
*   **Batch Selling:** Sell entire stacks of redundant gear at once with the "Sell Stack" feature.
*   **Soul System:** A secondary progression system to gain permanent multipliers based on kill counts.
*   **Offline Progression:** Automatic supply drops and rewards calculated for time spent away.
*   **Real-time HUD:** XP bars and level text update instantly during idle combat.

### 2. Battle Stages (API-Driven Auto-Battler)
*   **Stage Progression:** 20 stages per world across infinite worlds.
*   **API Integration:** Dynamically fetches planet backgrounds and enemy character sprites from the *Dragon Ball API*.
*   **Combat Logic:** Auto-attacks with critical hits, evasion, Zenkai boosts, and cinematic "Ultimate" beam attacks.

### 3. Boss Rush / Dungeons (Local Content)
*   **Dungeon Keys:** Earn keys through gameplay to enter high-stakes Boss Rush mode.
*   **Visual Fidelity:** Custom particle explosion effects triggered on defeat.
*   **Boss Mechanics:** Face iconic villains like Frieza, Cell, and Majin Buu with unique scaling.
*   **Local Assets:** Uses preloaded local `.png` assets for maximum reliability and offline play.

### 4. Explore Mode (Open World RPG)
*   **Engine:** A custom 2D Canvas rendering engine (`battleworld.js`).
*   **Open World:** A massive, tiled scrolling map with procedural generation (Trees, Houses, NPCs).
*   **Action Combat:** Virtual joystick movement, manual attacking, dodging, and charging mechanics.
*   **Loot Magnetism:** Loot drops from enemies automagically pull toward the player.

---

## 🛠️ Tech Stack & Customizations

*   **HTML5 / CSS3 / JS:** 100% Vanilla implementation.
*   **Modular Scripts:** 
    *   `game.js`: Core state & Save/Load (Local Storage).
    *   `dungeons.js`: Physics-based boss encounters.
    *   `battle.js`: API-driven stage progression.
    *   `gear.js`: Stackable inventory & selling logic.
    *   `sw.js`: Service Worker for PWA/Offline support.
*   **Quick Start:** New players begin at **Level 5** to jump straight into the action without menu bombardment.
*   **Asset Management:** Robust preloading system for local sprites and cross-origin handling for API assets.

---

## 🚀 How to Run

1.  **Clone the repo:** `git clone https://github.com/vicsanity623/Monsters.git`
2.  **Run:** Open `index.html` in any modern browser. No build steps (Vite/Webpack) required.
3.  **PWA:** Add to home screen for a full-screen mobile app experience.

---

## ⚠️ Disclaimer

This is a non-profit, educational experiment. All Dragon Ball Z sprites and names are the property of **Toei Animation** and **Akira Toriyama**. They are used here strictly as placeholders for development purposes. If you fork this repo for commercial use, you **must** replace these assets with your own original content.
