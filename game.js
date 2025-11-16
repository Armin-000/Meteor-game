const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const gameOverScreen = document.getElementById("gameOver");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const finalScoreEl = document.getElementById("finalScore");
const finalBestScoreEl = document.getElementById("finalBestScore");

let dpr = window.devicePixelRatio || 1;
let width, height;

let player;
let meteors = [];
let bullets = [];
let particles = [];
let stars = [];

let enemyBullets = [];
let enemyShip = null;

let maxHealth = 100;
let health = maxHealth;

let combo = 0;
let comboTimer = 0;
const COMBO_WINDOW = 2.5;

let logs = [];
let paused = false;

let wave = 1;
let killsThisWave = 0;
let bossActive = false;

let currentWeaponLevel = 1;
let damageMultiplier = 1;
let fireRateMultiplier = 1;

let gamePhase = "meteor";

let running = false;
let lastTime = 0;
let spawnTimer = 0;
let fireCooldown = 0;
let turretCooldown = 0;
let score = 0;
let bestScore = Number(localStorage.getItem("meteorVectorBest") || 0);

let shake = {
    time: 0,
    duration: 0,
    magnitude: 0
};

bestScoreEl.textContent = Math.floor(bestScore).toString();

let upgradeOverlay = null;

function getDifficultyFactor() {
    const base = 1 + (wave - 1) * 0.3;
    return Math.min(base, 3.5);
}

function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    width = canvas.width = window.innerWidth * dpr;
    height = canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function initStars() {
    stars = [];
    const count = Math.floor((window.innerWidth * window.innerHeight) / 9000);
    for (let i = 0; i < count; i++) {
        stars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            radius: Math.random() * 1.3 + 0.2,
            baseAlpha: Math.random() * 0.6 + 0.2,
            twinkleSpeed: Math.random() * 2 + 0.5,
            phase: Math.random() * Math.PI * 2
        });
    }
}
initStars();

function createUpgradeOverlay() {
    const wrapper = document.querySelector(".game-wrapper") || document.body;

    upgradeOverlay = document.createElement("div");
    upgradeOverlay.className = "overlay overlay-hidden";

    const panel = document.createElement("div");
    panel.className = "panel";

    const header = document.createElement("div");
    header.className = "panel-header";
    const h2 = document.createElement("h2");
    h2.textContent = "SYSTEM UPGRADE";
    const p = document.createElement("p");
    p.textContent = "Select one enhancement before the next engagement.";
    header.appendChild(h2);
    header.appendChild(p);

    const content = document.createElement("div");
    content.className = "panel-content";
    content.style.marginTop = "16px";
    content.style.display = "grid";
    content.style.gridTemplateColumns = "1fr";
    content.style.gap = "10px";

    function makeUpgradeButton(title, desc, type) {
        const btn = document.createElement("button");
        btn.style.width = "100%";
        btn.style.textAlign = "left";
        btn.style.display = "flex";
        btn.style.flexDirection = "column";
        btn.style.gap = "4px";
        btn.style.padding = "10px 14px";

        const t = document.createElement("span");
        t.textContent = title;
        t.style.fontSize = "12px";
        t.style.letterSpacing = "0.14em";

        const d = document.createElement("span");
        d.textContent = desc;
        d.style.fontSize = "11px";
        d.style.textTransform = "none";
        d.style.letterSpacing = "0";

        btn.appendChild(t);
        btn.appendChild(d);
        btn.addEventListener("click", () => applyUpgrade(type));
        return btn;
    }

    const btnHp = makeUpgradeButton(
        "REINFORCED HULL",
        "+ Max HP & partial repair.",
        "hp"
    );
    const btnDmg = makeUpgradeButton(
        "OVERCHARGED COILS",
        "+ Weapon damage.",
        "dmg"
    );
    const btnRof = makeUpgradeButton(
        "FIRE-CONTROL SUITE",
        "+ Fire rate.",
        "rof"
    );

    content.appendChild(btnHp);
    content.appendChild(btnDmg);
    content.appendChild(btnRof);

    panel.appendChild(header);
    panel.appendChild(content);
    upgradeOverlay.appendChild(panel);
    wrapper.appendChild(upgradeOverlay);
}

createUpgradeOverlay();

const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    shooting: false,
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2
};

window.addEventListener("keydown", (e) => {
    if (e.key === "w" || e.key === "ArrowUp") input.up = true;
    if (e.key === "s" || e.key === "ArrowDown") input.down = true;
    if (e.key === "a" || e.key === "ArrowLeft") input.left = true;
    if (e.key === "d" || e.key === "ArrowRight") input.right = true;
    if (e.code === "Space") input.shooting = true;

    if ((e.key === "Escape" || e.key === "p" || e.key === "P") && gamePhase !== "upgrade") {
        if (running) {
            paused = !paused;
            addLog(paused ? "Simulation paused." : "Simulation resumed.", "info");
        }
    }
});

window.addEventListener("keyup", (e) => {
    if (e.key === "w" || e.key === "ArrowUp") input.up = false;
    if (e.key === "s" || e.key === "ArrowDown") input.down = false;
    if (e.key === "a" || e.key === "ArrowLeft") input.left = false;
    if (e.key === "d" || e.key === "ArrowRight") input.right = false;
    if (e.code === "Space") input.shooting = false;
});

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - rect.left;
    input.mouseY = e.clientY - rect.top;
});

canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) input.shooting = true;
});

canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0) input.shooting = false;
});

function triggerShake(magnitude = 6, duration = 0.25) {
    shake.magnitude = magnitude;
    shake.duration = duration;
    shake.time = duration;
}

function getWeaponLevel() {
    if (score >= 900) return 4;
    if (score >= 500) return 3;
    if (score >= 200) return 2;
    return 1;
}

function getWeaponName(level) {
    switch (level) {
        case 1:
            return "MK-I Railgun";
        case 2:
            return "Twin Cannons";
        case 3:
            return "Tri-Beam Lasers";
        case 4:
            return "Tri-Beam + Auto Rockets";
        default:
            return "Unknown";
    }
}

function addLog(text, type = "info") {
    logs.push({ text, type, life: 6 });
    if (logs.length > 6) logs.shift();
}

function updateLogs(dt) {
    for (const log of logs) {
        log.life -= dt;
    }
    logs = logs.filter((l) => l.life > 0);
}

class Player {
    constructor() {
        this.radius = 18;
        this.x = window.innerWidth * 0.5;
        this.y = window.innerHeight * 0.7;
        this.speed = 260;
        this.angle = 0;
        this.recoil = 0;
    }

    update(dt) {
        let dx = 0;
        let dy = 0;
        if (input.left) dx -= 1;
        if (input.right) dx += 1;
        if (input.up) dy -= 1;
        if (input.down) dy += 1;

        const len = Math.hypot(dx, dy);
        if (len > 0) {
            dx /= len;
            dy /= len;
        }

        this.x += dx * this.speed * dt;
        this.y += dy * this.speed * dt;

        const margin = this.radius + 8;
        this.x = Math.max(margin, Math.min(window.innerWidth - margin, this.x));
        this.y = Math.max(margin, Math.min(window.innerHeight - margin, this.y));

        this.angle = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);

        if (this.recoil > 0) {
            this.recoil -= dt * 40;
            if (this.recoil < 0) this.recoil = 0;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const r = this.radius;

        ctx.translate(-this.recoil, 0);

        ctx.globalAlpha = 0.28;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(0, r + 8, r * 1.6, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        const hullGrad = ctx.createLinearGradient(-r * 1.4, 0, r * 1.4, 0);
        hullGrad.addColorStop(0, "#1e293b");
        hullGrad.addColorStop(0.3, "#9ca3af");
        hullGrad.addColorStop(0.7, "#e5e7eb");
        hullGrad.addColorStop(1, "#111827");

        ctx.fillStyle = hullGrad;
        ctx.beginPath();
        ctx.moveTo(r * 1.6, 0);
        ctx.lineTo(r * 0.3, -r * 1.1);
        ctx.lineTo(-r * 1.2, -r * 0.7);
        ctx.lineTo(-r * 1.4, 0);
        ctx.lineTo(-r * 1.2, r * 0.7);
        ctx.lineTo(r * 0.3, r * 1.1);
        ctx.closePath();
        ctx.fill();

        const plateGrad = ctx.createLinearGradient(-r, 0, r, 0);
        plateGrad.addColorStop(0, "#4b5563");
        plateGrad.addColorStop(0.5, "#e5e7eb");
        plateGrad.addColorStop(1, "#6b7280");

        ctx.fillStyle = plateGrad;
        ctx.beginPath();
        ctx.moveTo(r * 1.1, 0);
        ctx.lineTo(r * 0.1, -r * 0.9);
        ctx.lineTo(-r * 0.7, -r * 0.4);
        ctx.lineTo(-r * 0.9, 0);
        ctx.lineTo(-r * 0.7, r * 0.4);
        ctx.lineTo(r * 0.1, r * 0.9);
        ctx.closePath();
        ctx.fill();

        const cabGrad = ctx.createRadialGradient(
            r * 0.25,
            -r * 0.3,
            2,
            r * 0.05,
            -r * 0.1,
            r * 0.9
        );
        cabGrad.addColorStop(0, "rgba(255,255,255,0.98)");
        cabGrad.addColorStop(0.4, "rgba(191,219,254,0.95)");
        cabGrad.addColorStop(1, "rgba(30,64,175,0.9)");

        ctx.fillStyle = cabGrad;
        ctx.beginPath();
        ctx.ellipse(r * 0.25, -r * 0.1, r * 0.9, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(56,189,248,0.9)";
        ctx.beginPath();
        ctx.arc(r * 0.8, -r * 0.4, 2.4, 0, Math.PI * 2);
        ctx.arc(r * 0.8, r * 0.4, 2.4, 0, Math.PI * 2);
        ctx.fill();

        const engineBaseGrad = ctx.createLinearGradient(-r * 1.6, 0, -r * 0.6, 0);
        engineBaseGrad.addColorStop(0, "#020617");
        engineBaseGrad.addColorStop(1, "#1f2937");

        ctx.fillStyle = engineBaseGrad;
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, -r * 0.5);
        ctx.lineTo(-r * 1.4, -r * 0.2);
        ctx.lineTo(-r * 1.4, r * 0.2);
        ctx.lineTo(-r * 0.6, r * 0.5);
        ctx.closePath();
        ctx.fill();

        const flicker = 5 + Math.random() * 6;
        const flameGrad = ctx.createLinearGradient(
            -r * 1.5,
            0,
            -r * 1.5 - flicker,
            0
        );
        flameGrad.addColorStop(0, "rgba(255,255,255,0.95)");
        flameGrad.addColorStop(0.4, "rgba(251,191,36,0.95)");
        flameGrad.addColorStop(1, "rgba(185,28,28,0)");

        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-r * 1.4, -r * 0.35);
        ctx.lineTo(-r * 1.5 - flicker, 0);
        ctx.lineTo(-r * 1.4, r * 0.35);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, angle, options = {}) {
        this.x = x;
        this.y = y;
        this.speed = options.speed ?? 520;
        this.angle = angle;
        this.radius = options.radius ?? 3;
        this.life = options.life ?? 1.2;
        this.age = 0;
        this.damage = (options.damage ?? 1) * damageMultiplier;
        this.style = options.style ?? "normal";
    }

    update(dt) {
        this.age += dt;
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
    }

    isDead() {
        return (
            this.age > this.life ||
            this.x < -80 ||
            this.x > window.innerWidth + 80 ||
            this.y < -80 ||
            this.y > window.innerHeight + 80
        );
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.style === "rocket") {
            ctx.fillStyle = "#e5e7eb";
            ctx.beginPath();
            ctx.roundRect(-8, -3, 14, 6, 3);
            ctx.fill();

            const flameGrad = ctx.createLinearGradient(-16, 0, -4, 0);
            flameGrad.addColorStop(0, "rgba(249,115,22,0)");
            flameGrad.addColorStop(0.4, "rgba(249,115,22,0.8)");
            flameGrad.addColorStop(1, "rgba(254,249,195,0.95)");

            ctx.fillStyle = flameGrad;
            ctx.beginPath();
            ctx.moveTo(-16, -2.5);
            ctx.lineTo(-4, -1);
            ctx.lineTo(-4, 1);
            ctx.lineTo(-16, 2.5);
            ctx.closePath();
            ctx.fill();
        } else if (this.style === "laser") {
            const grad = ctx.createLinearGradient(-16, 0, 10, 0);
            grad.addColorStop(0, "rgba(15,23,42,0)");
            grad.addColorStop(0.3, "rgba(56,189,248,0.5)");
            grad.addColorStop(1, "rgba(248,250,252,0.98)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-16, -1.3);
            ctx.lineTo(10, -1.7);
            ctx.lineTo(10, 1.7);
            ctx.lineTo(-16, 1.3);
            ctx.closePath();
            ctx.fill();
        } else {
            const grad = ctx.createLinearGradient(-10, 0, 6, 0);
            grad.addColorStop(0, "rgba(15,23,42,0)");
            grad.addColorStop(0.3, "rgba(156,163,175,0.4)");
            grad.addColorStop(1, "rgba(248,250,252,0.98)");

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-10, -1);
            ctx.lineTo(6, -1.5);
            ctx.lineTo(6, 1.5);
            ctx.lineTo(-10, 1);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}

class EnemyBullet {
    constructor(x, y, angle, options = {}) {
        this.x = x;
        this.y = y;
        this.speed = options.speed ?? 180;
        this.angle = angle;
        this.radius = options.radius ?? 5;
        this.life = options.life ?? 3;
        this.age = 0;
        this.damage = options.damage ?? 15;
        this.style = options.style ?? "shard";
        this.homing = options.homing ?? false;
        this.homingStrength = options.homingStrength ?? 2.0;
    }

    update(dt) {
        this.age += dt;

        if (this.homing && player) {
            const desired = Math.atan2(player.y - this.y, player.x - this.x);
            let diff = desired - this.angle;

            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;

            const maxTurn = this.homingStrength * dt;
            if (Math.abs(diff) > maxTurn) {
                this.angle += Math.sign(diff) * maxTurn;
            } else {
                this.angle = desired;
            }
        }

        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
    }

    isDead() {
        return (
            this.age > this.life ||
            this.x < -100 ||
            this.x > window.innerWidth + 100 ||
            this.y < -100 ||
            this.y > window.innerHeight + 100
        );
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.style === "shot") {
            const grad = ctx.createLinearGradient(-8, 0, 6, 0);
            grad.addColorStop(0, "rgba(248,113,113,0)");
            grad.addColorStop(0.3, "rgba(248,113,113,0.6)");
            grad.addColorStop(1, "rgba(248,250,252,0.9)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-8, -1.4);
            ctx.lineTo(6, -1.6);
            ctx.lineTo(6, 1.6);
            ctx.lineTo(-8, 1.4);
            ctx.closePath();
            ctx.fill();
        } else {
            const r = this.radius;
            const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.2, 0, 0, r);
            grad.addColorStop(0, "#fee2b3");
            grad.addColorStop(0.4, "#f97316");
            grad.addColorStop(1, "#111827");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class Meteor {
    constructor(speedBoost = 0, isBoss = false) {
        this.isBoss = isBoss;

        if (isBoss) {
            this.type = "boss";
            this.size = 80 + Math.random() * 24;
            this.hp = Math.floor(18 + (wave - 1) * 3);
            this.scoreValue = 600 + wave * 50;
            this.attackTimer = 2 + Math.random() * 1.5;
            this.time = 0;
        } else {
            const roll = Math.random();
            const diff = getDifficultyFactor();

            if (roll < 0.45) {
                this.type = "small";
                this.size = 18 + Math.random() * 10;
                this.hp = Math.floor(1 * diff);
                this.scoreValue = 15;
            } else if (roll < 0.8) {
                this.type = "medium";
                this.size = 30 + Math.random() * 14;
                this.hp = Math.floor(2 * diff);
                this.scoreValue = 30;
            } else {
                this.type = "large";
                this.size = 44 + Math.random() * 18;
                this.hp = Math.floor(3 * diff);
                this.scoreValue = 60;
            }
        }

        const spawnX = Math.random() * window.innerWidth;
        const spawnY = -this.size * 2;
        this.x = spawnX;
        this.y = spawnY;

        if (this.isBoss) {
            this.vx = 0;
            this.vy = 18 + Math.random() * 8;
        } else {
            const baseSpeed = (110 + Math.random() * 70 + speedBoost) * getDifficultyFactor();
            const targetY = window.innerHeight * (0.5 + Math.random() * 0.4);
            const targetX = window.innerWidth * (0.25 + Math.random() * 0.5);
            const angle =
                Math.atan2(targetY - spawnY, targetX - spawnX) +
                (Math.random() * 0.3 - 0.15);

            this.vx = Math.cos(angle) * baseSpeed;
            this.vy = Math.sin(angle) * baseSpeed;
        }

        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() * 2 - 1) * (this.isBoss ? 0.3 : 0.6);
        this.mass = this.size * (this.hp + 0.5);
    }

    update(dt) {
        if (this.isBoss) {
            this.time += dt;

            const driftX = Math.sin(this.time * 0.6) * 35;
            let targetVX = driftX;

            let closest = null;
            let closestDist = 260;
            for (const b of bullets) {
                const dx = b.x - this.x;
                const dy = b.y - this.y;
                const d = Math.hypot(dx, dy);
                if (d < closestDist) {
                    closestDist = d;
                    closest = b;
                }
            }

            if (closest) {
                const dirAway = -Math.sign(closest.x - this.x) || 1;
                targetVX += dirAway * 45;
            }

            this.vx += (targetVX - this.vx) * 0.9 * dt;

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            const marginX = this.size * 0.8;
            const minY = this.size * 1.2;
            const maxY = window.innerHeight * 0.65;

            if (this.x < marginX) {
                this.x = marginX;
                this.vx = Math.abs(this.vx);
            }
            if (this.x > window.innerWidth - marginX) {
                this.x = window.innerWidth - marginX;
                this.vx = -Math.abs(this.vx);
            }

            if (this.y < minY) {
                this.y = minY;
                this.vy = Math.abs(this.vy);
            }
            if (this.y > maxY) {
                this.y = maxY;
                this.vy = -Math.abs(this.vy) * 0.4;
            }
        } else {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }

        this.rotation += this.rotationSpeed * dt;

        if (this.isBoss) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                bossAttack(this);
                this.attackTimer = 2 + Math.random() * 2;
            }
        }
    }

    isOffscreen() {
        if (this.isBoss) return false;

        return (
            this.x < -300 ||
            this.x > window.innerWidth + 300 ||
            this.y > window.innerHeight + 300
        );
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        const r = this.size;

        if (this.isBoss) {
            const grad = ctx.createRadialGradient(
                -r * 0.2,
                -r * 0.2,
                r * 0.3,
                0,
                0,
                r
            );
            grad.addColorStop(0, "#fef9c3");
            grad.addColorStop(0.25, "#fed7aa");
            grad.addColorStop(0.55, "#fb923c");
            grad.addColorStop(1, "#111827");

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.95, r, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "rgba(248,250,252,0.8)";
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(-r * 0.5, -r * 0.2);
            ctx.bezierCurveTo(0, -r * 0.6, r * 0.4, -r * 0.1, r * 0.2, r * 0.4);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(-r * 0.2, -r * 0.6);
            ctx.bezierCurveTo(r * 0.3, -r * 0.4, r * 0.4, 0, -r * 0.1, r * 0.5);
            ctx.stroke();

            const auraGrad = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.5);
            auraGrad.addColorStop(0, "rgba(248,113,113,0.3)");
            auraGrad.addColorStop(1, "rgba(15,23,42,0)");
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 1.5, r * 1.6, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const grad = ctx.createRadialGradient(
                -r * 0.3,
                -r * 0.3,
                r * 0.3,
                0,
                0,
                r
            );
            grad.addColorStop(0, "#f9fafb");
            grad.addColorStop(0.3, "#d1d5db");
            grad.addColorStop(0.6, "#6b7280");
            grad.addColorStop(1, "#111827");

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.95, r, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "rgba(15,23,42,0.55)";
            for (let i = 0; i < 3 + this.hp; i++) {
                const cx = (Math.random() * 2 - 1) * r * 0.4;
                const cy = (Math.random() * 2 - 1) * r * 0.4;
                const cr = Math.random() * r * 0.25 + r * 0.12;
                ctx.beginPath();
                ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const maxHp = this.isBoss
            ? Math.floor(18 + (wave - 1) * 3)
            : this.type === "small"
            ? 1 * getDifficultyFactor()
            : this.type === "medium"
            ? 2 * getDifficultyFactor()
            : 3 * getDifficultyFactor();

        const hpRatio = Math.max(0, this.hp / maxHp);

        ctx.strokeStyle = this.isBoss
            ? `rgba(248,113,113,${0.25 + hpRatio * 0.5})`
            : `rgba(248,250,252,${0.25 + hpRatio * 0.4})`;
        ctx.lineWidth = this.isBoss ? 3 : 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2 * hpRatio);
        ctx.stroke();

        ctx.restore();
    }
}

function bossAttack(boss) {
    if (!player) return;

    const diff = getDifficultyFactor();
    const pattern = Math.random();

    if (pattern < 0.5) {
        const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);

        const count = 4 + Math.min(4, Math.floor((wave - 1) / 2));
        for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * 0.12;
            const angle = baseAngle + offset;
            enemyBullets.push(
                new EnemyBullet(boss.x, boss.y, angle, {
                    speed: 170 * (0.9 + diff * 0.25),
                    radius: 7,
                    damage: 14 + (wave - 1) * 1.5,
                    style: "homing",
                    homing: true,
                    homingStrength: 2.4 * (0.8 + diff * 0.35)
                })
            );
        }
        addLog("Boss: guided shard volley.", "warning");
    } else {
        let shots = 10 + (wave - 1) * 2;
        shots = Math.min(shots, 22);

        for (let i = 0; i < shots; i++) {
            const angle = (i / shots) * Math.PI * 2;
            enemyBullets.push(
                new EnemyBullet(boss.x, boss.y, angle, {
                    speed: 150 * (0.9 + diff * 0.25),
                    radius: 6,
                    damage: 10 + (wave - 1) * 1.2,
                    style: "homing",
                    homing: true,
                    homingStrength: 1.8 * (0.8 + diff * 0.3)
                })
            );
        }
        addLog("Boss: omni-directional tracking burst.", "warning");
    }

    spawnExplosion(boss.x, boss.y, 0.5, true);
    triggerShake(4 + diff * 1.2, 0.2 + diff * 0.03);
}

class EnemyShip {
    constructor(level) {
        this.level = level;
        const diff = 1 + (level - 1) * 0.3;

        this.baseHp = 30 + (level - 1) * 12;
        this.hp = this.baseHp * (0.9 + diff * 0.6);
        this.radius = 24;
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight * 0.25;
        this.speed = (80 + level * 5) * (0.9 + diff * 0.4);
        this.dir = 1;
        this.fireTimer = 1.5;
    }

    update(dt) {
        this.x += this.dir * this.speed * dt;
        if (this.x < 80) {
            this.x = 80;
            this.dir *= -1;
        }
        if (this.x > window.innerWidth - 80) {
            this.x = window.innerWidth - 80;
            this.dir *= -1;
        }

        const diff = getDifficultyFactor();
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            this.fireTimer = (1 + Math.random() * 0.7) / Math.min(2.8, diff + 0.7);
            enemyShipFire(this);
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        const r = this.radius;

        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(0, r + 6, r * 1.4, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        const grad = ctx.createLinearGradient(-r, 0, r, 0);
        grad.addColorStop(0, "#111827");
        grad.addColorStop(0.3, "#4b5563");
        grad.addColorStop(1, "#111827");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.1);
        ctx.lineTo(-r * 1.2, -r * 0.1);
        ctx.lineTo(-r * 0.7, r * 0.9);
        ctx.lineTo(r * 0.7, r * 0.9);
        ctx.lineTo(r * 1.2, -r * 0.1);
        ctx.closePath();
        ctx.fill();

        const cabGrad = ctx.createRadialGradient(
            0,
            -r * 0.3,
            2,
            0,
            -r * 0.1,
            r * 0.9
        );
        cabGrad.addColorStop(0, "rgba(248,250,252,0.95)");
        cabGrad.addColorStop(0.4, "rgba(148,163,184,0.95)");
        cabGrad.addColorStop(1, "rgba(15,23,42,0.9)");
        ctx.fillStyle = cabGrad;
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.2, r * 0.8, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(-r * 0.8, 0, 2.4, 0, Math.PI * 2);
        ctx.arc(r * 0.8, 0, 2.4, 0, Math.PI * 2);
        ctx.fill();

        const hpRatio = Math.max(0, this.hp / this.baseHp);
        const barW = r * 2;
        const barH = 4;
        ctx.fillStyle = "rgba(15,23,42,0.9)";
        ctx.fillRect(-barW / 2, -r * 1.4, barW, barH);
        ctx.fillStyle = "#f97316";
        ctx.fillRect(-barW / 2, -r * 1.4, barW * hpRatio, barH);

        ctx.restore();
    }
}

function enemyShipFire(ship) {
    if (!player) return;
    const diff = getDifficultyFactor();

    const baseAngle = Math.atan2(player.y - ship.y, player.x - ship.x);
    const count = 3 + Math.min(2, Math.floor((wave - 1) / 3));

    for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * 0.08;
        const angle = baseAngle + offset;
        enemyBullets.push(
            new EnemyBullet(ship.x, ship.y, angle, {
                speed: 260 * (0.9 + diff * 0.35),
                radius: 4,
                damage: 14 + (wave - 1) * 1.3,
                style: "shot"
            })
        );
    }
    spawnExplosion(ship.x, ship.y + ship.radius * 0.4, 0.25, false);
}

class Particle {
    constructor(x, y, color, options = {}) {
        this.x = x;
        this.y = y;
        const angle = options.angle ?? Math.random() * Math.PI * 2;
        const speed = options.speed ?? (60 + Math.random() * 220);

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.friction = options.friction ?? 0.86;
        this.gravity = options.gravity ?? 35;

        this.life = options.life ?? (0.5 + Math.random() * 0.7);
        this.age = 0;
        this.size = options.size ?? (1.5 + Math.random() * 3.5);
        this.color = color;
    }

    update(dt) {
        this.age += dt;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity * dt;

        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    draw() {
        const t = 1 - this.age / this.life;
        if (t <= 0) return;

        ctx.globalAlpha = t;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    isDead() {
        return this.age >= this.life;
    }
}

function spawnExplosion(x, y, scale = 1, hot = true) {
    const baseCount = Math.floor(60 * scale);
    const colors = hot
        ? ["#ffffff", "#fee2b3", "#fed7aa", "#f97316", "#ea580c", "#4b5563"]
        : ["#e5e7eb", "#9ca3af", "#6b7280", "#374151"];

    for (let i = 0; i < baseCount; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 * scale + Math.random() * 260 * scale;
        const size = 1.5 * scale + Math.random() * 3.5 * scale;

        particles.push(
            new Particle(x, y, color, {
                angle,
                speed,
                life: 0.6 + Math.random() * 0.7,
                size,
                gravity: 45
            })
        );
    }
}

function drawStars(time) {
    for (const s of stars) {
        const tw = Math.sin(time * 0.001 * s.twinkleSpeed + s.phase) * 0.5 + 0.5;
        const alpha = s.baseAlpha * (0.6 + tw * 0.6);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#e5e7eb";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawCrosshair() {
    const x = input.mouseX;
    const y = input.mouseY;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "rgba(148,163,184,0.9)";
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(-6, 0);
    ctx.moveTo(6, 0);
    ctx.lineTo(16, 0);
    ctx.moveTo(0, -16);
    ctx.lineTo(0, -6);
    ctx.moveTo(0, 6);
    ctx.lineTo(0, 16);
    ctx.stroke();

    ctx.restore();
}

function drawHealthBar() {
    const barWidth = 180;
    const barHeight = 10;
    const x = 20;
    const y = 52;
    const ratio = Math.max(0, health / maxHealth);

    ctx.save();
    ctx.fillStyle = "rgba(15,23,42,0.9)";
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.strokeStyle = "rgba(148,163,184,0.7)";
    ctx.strokeRect(x, y, barWidth, barHeight);

    const grad = ctx.createLinearGradient(x, y, x + barWidth, y);
    grad.addColorStop(0, "#22c55e");
    grad.addColorStop(0.5, "#eab308");
    grad.addColorStop(1, "#ef4444");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barWidth * ratio, barHeight);

    ctx.font = "11px 'Inter', system-ui, sans-serif";
    ctx.fillStyle = "#e5e7eb";
    ctx.textBaseline = "bottom";
    ctx.fillText(`HULL ${Math.round(ratio * 100)}%`, x, y - 4);

    ctx.restore();
}

function drawCombo() {
    if (combo <= 1 || comboTimer <= 0) return;
    ctx.save();
    ctx.font = "12px 'Inter', system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(56,189,248,0.95)";
    ctx.fillText(`COMBO x${combo}`, window.innerWidth - 20, 52);
    ctx.restore();
}

function drawPauseOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(15,23,42,0.65)";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.font = "12px 'Inter', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText("PAUSED", window.innerWidth / 2, window.innerHeight / 2 - 10);
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(
        "Press ESC or P to resume",
        window.innerWidth / 2,
        window.innerHeight / 2 + 10
    );
    ctx.restore();
}

function drawWeaponHUD() {
    const lvl = getWeaponLevel();
    const name = getWeaponName(lvl);

    ctx.save();
    ctx.font = "11px 'Inter', system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(`WEAPON LVL ${lvl}`, window.innerWidth - 20, 24);
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(name, window.innerWidth - 20, 38);
    ctx.restore();
}

function drawWaveHUD() {
    ctx.save();
    ctx.font = "11px 'Inter', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = bossActive || gamePhase === "duel" ? "#f97316" : "#9ca3af";

    let label = `WAVE ${wave}`;
    if (bossActive) label += " – BOSS INBOUND";
    if (gamePhase === "duel") label = `WAVE ${wave} – ENEMY ACE ENGAGED`;

    ctx.fillText(label, window.innerWidth / 2, 26);
    ctx.restore();
}

function drawLogs() {
    if (!logs.length) return;

    const visible = logs.slice(-3);
    const paddingX = 16;
    const paddingY = 6;
    const lineHeight = 14;
    const boxHeight = paddingY * 2 + visible.length * lineHeight + 4;
    const boxWidth = Math.min(420, window.innerWidth - 40);
    const x = 20;
    const y = window.innerHeight - boxHeight - 16;

    ctx.save();
    ctx.fillStyle = "rgba(15,23,42,0.85)";
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.strokeStyle = "rgba(148,163,184,0.5)";
    ctx.strokeRect(x, y, boxWidth, boxHeight);

    ctx.font = "11px 'Inter', system-ui, sans-serif";
    ctx.textBaseline = "top";

    visible.forEach((log, i) => {
        const alpha = Math.min(1, log.life / 1.5);
        ctx.globalAlpha = Math.max(0.15, alpha);
        ctx.fillStyle =
            log.type === "warning"
                ? "#f97316"
                : log.type === "danger"
                ? "#fca5a5"
                : "#e5e7eb";
        ctx.fillText(log.text, x + paddingX, y + paddingY + i * lineHeight);
    });

    ctx.restore();
    ctx.globalAlpha = 1;
}

function handleMeteorCollisions() {
    for (let i = 0; i < meteors.length; i++) {
        for (let j = i + 1; j < meteors.length; j++) {
            const a = meteors[i];
            const b = meteors[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            const minDist = a.size * 0.7 + b.size * 0.7;

            if (dist > 0 && dist < minDist) {
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;

                a.x -= nx * overlap * (b.mass / (a.mass + b.mass));
                a.y -= ny * overlap * (b.mass / (a.mass + b.mass));
                b.x += nx * overlap * (a.mass / (a.mass + b.mass));
                b.y += ny * overlap * (a.mass / (a.mass + b.mass));

                const tx = a.vx;
                const ty = a.vy;
                a.vx = b.vx;
                a.vy = b.vy;
                b.vx = tx;
                b.vy = ty;

                spawnExplosion((a.x + b.x) / 2, (a.y + b.y) / 2, 0.35, false);
            }
        }
    }
}

function killsRequiredForWave(w) {
    return 18 + (w - 1) * 9;
}

function registerKill(meteor) {
    if (!meteor.isBoss) {
        killsThisWave += 1;
        const needed = killsRequiredForWave(wave);
        if (!bossActive && killsThisWave >= needed && gamePhase === "meteor") {
            spawnBoss();
        }
    } else {
        bossActive = false;
        addLog(`Boss meteor neutralized. Preparing upgrade phase.`, "info");
        openUpgradeMenu();
    }
}

function spawnBoss() {
    bossActive = true;
    const bossMeteor = new Meteor(score * 4, true);
    meteors.push(bossMeteor);
    addLog(`Wave ${wave} boss detected. Threat level critical.`, "danger");
    triggerShake(8, 0.4);
}

function openUpgradeMenu() {
    gamePhase = "upgrade";
    paused = true;
    upgradeOverlay.classList.remove("overlay-hidden");
}

function applyUpgrade(type) {
    upgradeOverlay.classList.add("overlay-hidden");
    paused = false;

    if (type === "hp") {
        maxHealth += 25;
        health = Math.min(maxHealth, health + 50);
        addLog("Upgrade applied: reinforced hull plating.", "info");
    } else if (type === "dmg") {
        damageMultiplier += 0.3;
        addLog("Upgrade applied: overcharged weapon coils.", "info");
    } else if (type === "rof") {
        fireRateMultiplier += 0.25;
        addLog("Upgrade applied: fire-control optimization.", "info");
    }

    startDuel();
}

function startDuel() {
    meteors = [];
    enemyBullets = [];
    enemyShip = new EnemyShip(wave);
    gamePhase = "duel";
    addLog("Enemy ace entered the sector. Engage and destroy.", "warning");
}

function finishDuel() {
    enemyShip = null;
    enemyBullets = [];
    gamePhase = "meteor";
    wave += 1;
    killsThisWave = 0;
    addLog(`Enemy ace destroyed. Wave ${wave} incoming.`, "info");
}

function resetGame() {
    player = new Player();
    meteors = [];
    bullets = [];
    particles = [];
    enemyBullets = [];
    enemyShip = null;

    score = 0;
    spawnTimer = 0;
    fireCooldown = 0;
    turretCooldown = 0;
    combo = 0;
    comboTimer = 0;
    logs = [];
    health = 100;
    maxHealth = 100;
    paused = false;
    currentWeaponLevel = 1;
    wave = 1;
    killsThisWave = 0;
    bossActive = false;
    damageMultiplier = 1;
    fireRateMultiplier = 1;
    gamePhase = "meteor";
    shake.time = 0;

    lastTime = performance.now();
    initStars();
    scoreEl.textContent = "0";

    addLog("Simulation online. All systems nominal.", "info");
    addLog("Wave 1: incoming debris field detected.", "info");
    addLog("Protect orbital perimeter at all costs.", "info");
}

function startGame() {
    resetGame();
    overlay.classList.add("overlay-hidden");
    gameOverScreen.classList.add("overlay-hidden");
    running = true;
    requestAnimationFrame(loop);
}

function endGame() {
    running = false;
    const displayScore = Math.floor(score);
    finalScoreEl.textContent = displayScore.toString();

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("meteorVectorBest", bestScore.toString());
    }

    bestScoreEl.textContent = Math.floor(bestScore).toString();
    finalBestScoreEl.textContent = Math.floor(bestScore).toString();

    addLog("Hull breach detected. Simulation terminated.", "danger");

    gameOverScreen.classList.remove("overlay-hidden");
}

function tryFire(dt) {
    fireCooldown -= dt;
    if (fireCooldown < 0) fireCooldown = 0;
    if (!input.shooting || fireCooldown > 0) return;

    const weaponLevel = getWeaponLevel();
    const baseRate = weaponLevel >= 3 ? 0.11 : 0.14;
    const finalRate = baseRate / (1 + fireRateMultiplier * 0.7);
    fireCooldown = finalRate;

    const baseAngle = player.angle;
    const muzzleDist = player.radius * 1.3;

    function spawnPlayerBullet(angleOffset) {
        const angle = baseAngle + angleOffset;
        const mx = player.x + Math.cos(angle) * muzzleDist;
        const my = player.y + Math.sin(angle) * muzzleDist;

        const opts = {};
        if (weaponLevel >= 3) {
            opts.style = "laser";
            opts.speed = 620;
            opts.damage = 1.2;
            opts.life = 1.4;
        }

        bullets.push(new Bullet(mx, my, angle, opts));
        spawnExplosion(mx, my, 0.12, true);
    }

    if (weaponLevel === 1) {
        spawnPlayerBullet(0);
    } else if (weaponLevel === 2) {
        spawnPlayerBullet(0.06);
        spawnPlayerBullet(-0.06);
    } else {
        spawnPlayerBullet(0);
        spawnPlayerBullet(0.09);
        spawnPlayerBullet(-0.09);
    }

    player.recoil = 7;
    triggerShake(2.5, 0.1);
}

function handleTurret(dt) {
    const weaponLevel = getWeaponLevel();
    if (weaponLevel < 4 || gamePhase === "upgrade") return;
    turretCooldown -= dt;
    if (turretCooldown > 0) return;

    turretCooldown = 0.7;

    let target = null;
    let bestDist = Infinity;
    const candidates = [];

    if (gamePhase === "duel" && enemyShip) {
        candidates.push(enemyShip);
    } else {
        candidates.push(...meteors);
    }

    if (!candidates.length) return;

    for (const m of candidates) {
        const dx = m.x - player.x;
        const dy = m.y - player.y;
        const d = Math.hypot(dx, dy);
        if (d < bestDist) {
            bestDist = d;
            target = m;
        }
    }
    if (!target) return;

    const angle = Math.atan2(target.y - player.y, target.x - player.x);
    const spawnDist = player.radius * 1.1;
    const bx = player.x + Math.cos(angle) * spawnDist;
    const by = player.y + Math.sin(angle) * spawnDist;

    bullets.push(
        new Bullet(bx, by, angle, {
            style: "rocket",
            speed: 380,
            damage: 2.5,
            radius: 4,
            life: 2
        })
    );
}

function loop(timestamp) {
    if (!running) return;
    let dt = Math.min((timestamp - lastTime) / 1000, 0.04);
    lastTime = timestamp;

    const newLevel = getWeaponLevel();
    if (newLevel !== currentWeaponLevel) {
        currentWeaponLevel = newLevel;
        if (newLevel === 2) addLog("Weapon upgrade: twin cannons online.", "info");
        if (newLevel === 3) addLog("Weapon upgrade: tri-beam lasers online.", "info");
        if (newLevel === 4) addLog("Auto-turret engaged. Rocket support active.", "info");
    }

    let offsetX = 0;
    let offsetY = 0;
    if (!paused && shake.time > 0) {
        shake.time -= dt;
        const progress = shake.time / shake.duration;
        const intensity = Math.max(0, progress);
        const maxOffset = shake.magnitude * intensity;
        offsetX = (Math.random() * 2 - 1) * maxOffset;
        offsetY = (Math.random() * 2 - 1) * maxOffset;
    }

    ctx.save();
    ctx.translate(offsetX, offsetY);

    ctx.fillStyle = "rgba(2,6,23,0.94)";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    drawStars(timestamp);

    if (!paused && gamePhase !== "upgrade") {
        if (gamePhase === "meteor") {
            const difficultyBoost = Math.min(score * 6 + wave * 50, 800);
            const diff = getDifficultyFactor();

            if (!bossActive) {
                spawnTimer -= dt;
                if (spawnTimer <= 0) {
                    meteors.push(new Meteor(difficultyBoost, false));
                    const baseInterval = 0.8;
                    const minInterval = 0.14;
                    spawnTimer =
                        (Math.max(minInterval, baseInterval - score * 0.02) / diff) *
                        (0.8 + Math.random() * 0.5);
                }
            }
        }

        player.update(dt);
        tryFire(dt);
        handleTurret(dt);

        meteors.forEach((m) => m.update(dt));
        meteors = meteors.filter((m) => !m.isOffscreen());
        handleMeteorCollisions();

        bullets.forEach((b) => b.update(dt));
        bullets = bullets.filter((b) => !b.isDead());

        enemyBullets.forEach((eb) => eb.update(dt));
        enemyBullets = enemyBullets.filter((eb) => !eb.isDead());

        particles.forEach((p) => p.update(dt));
        particles = particles.filter((p) => !p.isDead());

        if (comboTimer > 0) {
            comboTimer -= dt;
            if (comboTimer <= 0) {
                combo = 0;
            }
        }

        updateLogs(dt);

        if (gamePhase === "meteor") {
            for (let i = meteors.length - 1; i >= 0; i--) {
                const m = meteors[i];
                for (let j = bullets.length - 1; j >= 0; j--) {
                    const b = bullets[j];
                    const dx = m.x - b.x;
                    const dy = m.y - b.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist < m.size * 0.7 + b.radius) {
                        bullets.splice(j, 1);

                        const impactScale = b.style === "rocket" ? 0.45 : 0.25;
                        spawnExplosion(b.x, b.y, impactScale, true);
                        if (b.style === "rocket") triggerShake(8, 0.28);

                        m.hp -= b.damage;

                        if (m.hp <= 0) {
                            if (comboTimer > 0) combo += 1;
                            else combo = 1;
                            comboTimer = COMBO_WINDOW;

                            let comboMult = 1 + (combo - 1) * 0.15;
                            if (comboMult > 2.5) comboMult = 2.5;

                            const killScale =
                                (m.size / 32) * (b.style === "rocket" ? 1.2 : 1);
                            spawnExplosion(m.x, m.y, killScale, true);
                            if (killScale > 1.2 || m.isBoss) triggerShake(10, 0.35);

                            score += m.scoreValue * comboMult;
                            if (combo === 5) addLog("Combo x5 – nice shooting.", "info");
                            if (combo === 10) addLog("Combo x10 – firing solution optimal.", "info");

                            registerKill(m);
                            meteors.splice(i, 1);
                        }
                        break;
                    }
                }
            }
        }

        if (gamePhase === "duel" && enemyShip) {
            enemyShip.update(dt);

            for (let j = bullets.length - 1; j >= 0; j--) {
                const b = bullets[j];
                const dx = enemyShip.x - b.x;
                const dy = enemyShip.y - b.y;
                const dist = Math.hypot(dx, dy);
                if (dist < enemyShip.radius + b.radius) {
                    bullets.splice(j, 1);
                    spawnExplosion(b.x, b.y, 0.2, true);
                    enemyShip.hp -= b.damage * 1.2;

                    if (enemyShip.hp <= 0) {
                        spawnExplosion(enemyShip.x, enemyShip.y, 1.4, true);
                        triggerShake(12, 0.4);
                        addLog("Enemy ace destroyed.", "info");
                        score += 200;
                        finishDuel();
                        break;
                    }
                }
            }
        }

        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const eb = enemyBullets[i];
            const dx = eb.x - player.x;
            const dy = eb.y - player.y;
            const dist = Math.hypot(dx, dy);
            if (dist < eb.radius + player.radius * 0.7) {
                enemyBullets.splice(i, 1);
                spawnExplosion(player.x, player.y, 0.5, true);
                triggerShake(7, 0.25);

                health -= eb.damage;
                addLog(
                    `Incoming fire hit. Hull integrity at ${Math.max(
                        0,
                        Math.round(health)
                    )}%.`,
                    "warning"
                );

                if (health <= 0) {
                    health = 0;
                    spawnExplosion(player.x, player.y, 1.5, true);
                    triggerShake(14, 0.5);
                    ctx.restore();
                    endGame();
                    return;
                }
            }
        }

        if (gamePhase === "meteor") {
            for (let i = meteors.length - 1; i >= 0; i--) {
                const m = meteors[i];
                const dx = m.x - player.x;
                const dy = m.y - player.y;
                const dist = Math.hypot(dx, dy);

                if (dist < m.size * 0.7 + player.radius * 0.8) {
                    let dmg;
                    if (m.isBoss) dmg = 80;
                    else if (m.type === "small") dmg = 25;
                    else if (m.type === "medium") dmg = 40;
                    else dmg = 65;

                    health -= dmg;

                    spawnExplosion(player.x, player.y, m.isBoss ? 1.3 : 0.9, true);
                    triggerShake(m.isBoss ? 12 : 9, m.isBoss ? 0.45 : 0.3);
                    addLog(
                        `Impact detected. Hull integrity at ${Math.max(
                            0,
                            Math.round(health)
                        )}%.`,
                        "warning"
                    );

                    meteors.splice(i, 1);

                    if (health <= 0) {
                        health = 0;
                        spawnExplosion(player.x, player.y, 1.5, true);
                        triggerShake(14, 0.5);
                        ctx.restore();
                        endGame();
                        return;
                    }
                }
            }
        }

        score += dt * 8;
        scoreEl.textContent = Math.floor(score).toString();
    }

    player.draw();
    meteors.forEach((m) => m.draw());
    if (enemyShip) enemyShip.draw();
    bullets.forEach((b) => b.draw());
    enemyBullets.forEach((eb) => eb.draw());
    particles.forEach((p) => p.draw());

    ctx.restore();

    drawCrosshair();
    drawHealthBar();
    drawCombo();
    drawWeaponHUD();
    drawWaveHUD();
    drawLogs();
    if (paused && gamePhase !== "upgrade") drawPauseOverlay();

    requestAnimationFrame(loop);
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
