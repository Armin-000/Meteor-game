# Meteor Vector

Meteor Vector is a fast-paced, arcade-style space shooter built with vanilla JavaScript and the HTML5 Canvas API.  
You pilot an advanced orbital defense ship and protect the planet from escalating meteor waves, boss meteors, and hostile enemy ace fighters.

## Gameplay Overview

Survive as long as possible by:

- Dodging physics-driven meteors
- Destroying enemies with upgradeable weapons
- Battling slow but powerful boss meteors with special attack patterns
- Fighting enemy ace ships in one-on-one duel encounters
- Selecting upgrades between waves to improve hull strength, fire rate, and weapon damage

Each wave increases in difficulty:
- More meteors  
- Faster enemy projectiles  
- Stronger opponents  
- Higher intensity and pressure

## Core Features

- Smooth WASD movement with mouse aiming  
- Three meteor classes: small (1 hit), medium (2 hits), large (3 hits)  
- Boss meteor with homing attacks and arena movement  
- Enemy ace ship with spread fire attacks  
- Weapon progression system:
  - Level 1: MK-I Railgun
  - Level 2: Twin Cannons
  - Level 3: Tri-Beam Lasers
  - Level 4: Tri-Beam + Auto Rocket Turret  
- Upgrade system between waves:
  - Reinforced Hull
  - Overcharged Coils
  - Fire-Control Suite
- Full HUD:
  - Score and best score (saved in localStorage)
  - Health bar
  - Weapon level indicator
  - Wave status (including boss and duel phases)
  - Combo multiplier
  - Mission log / event feed
- Visual polish:
  - Screen shake
  - Particle explosion effects
  - Animated starfield
  - Weapon recoil
  - Crosshair HUD
  - Pause overlay

## Controls

Movement  
W / A / S / D – Ship movement  
Arrow keys also supported  

Combat  
Mouse – Aim  
Left mouse button – Fire  
SPACE – Fire  

Game control  
ESC or P – Pause / Resume  
Click on buttons – Start / Restart / Apply upgrades

## Game Flow

1. Meteor Phase  
   Regular meteors spawn with increasing difficulty.

2. Boss Phase  
   Large meteor with movement AI and homing attacks.

3. Upgrade Phase  
   Choose one of three system upgrades.

4. Enemy Ace Duel  
   A hostile ship appears and must be destroyed to unlock the next wave.

5. Next Wave  
   Difficulty increases and the cycle continues.

## Technology

- HTML5  
- CSS3  
- JavaScript (ES6+)  
- Canvas 2D API  
- LocalStorage

## Installation

Clone the repository:

```bash
git clone https://github.com/Armin-000/Meteor-game.git
cd Meteor-game
