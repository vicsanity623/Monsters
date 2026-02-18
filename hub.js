/* ============================
   HUB.JS - Hub Horde Battle
   ============================ */

(function () {

    const HubBattle = {
        running: false,
        container: null,
        enemies: [],
        playerEl: null,
        killCount: 0,
        spawnInterval: null,
        animFrame: null,

        // Settings
        spawnRate: 250, // ms
        speed: 3,

        init: function () {
            this.container = document.getElementById('hub-arena');
            if (!this.container) return;

            // Clear container just in case
            this.container.innerHTML = '';

            // Create Mini Goku
            this.playerEl = document.createElement('img');

            // Use current player rank sprite if available, else default
            const currentSprite = (window.player && window.player.rank >= 1) ? "IMG_0081.png" : "IMG_0061.png";
            this.playerEl.src = currentSprite;

            this.playerEl.className = "hub-goku";
            this.container.appendChild(this.playerEl);

            this.start();
        },

        // Allow game.js to update the sprite when transforming
        updateSprite: function (src) {
            if (this.playerEl && src) {
                this.playerEl.src = src;
            }
        },

        start: function () {
            if (this.running) return;
            this.running = true;
            this.killCount = 0;
            this.enemies = [];

            // Start Loop
            this.loop();
            this.spawnInterval = setInterval(() => this.spawnEnemy(), this.spawnRate);
        },

        stop: function () {
            this.running = false;
            clearInterval(this.spawnInterval);
            cancelAnimationFrame(this.animFrame);

            // Clear enemies
            const enemies = document.querySelectorAll('.hub-enemy');
            enemies.forEach(e => e.remove());
            this.enemies = [];
        },

        spawnEnemy: function () {
            if (!this.running || document.hidden) return;

            const el = document.createElement('img');
            el.src = "IMG_0206.png";
            el.className = "hub-enemy";
            el.onerror = function () { this.style.display = 'none'; };

            // Random Y Position
            const maxY = this.container.clientHeight - 60;
            const y = Math.floor(Math.random() * maxY);

            el.style.top = y + "px";
            el.style.left = "100%"; // Start off screen right

            this.container.appendChild(el);

            this.enemies.push({
                el: el,
                x: this.container.clientWidth,
                y: y,
                hp: 1, // 1 hit kill
                state: 'move'
            });
        },

        loop: function () {
            if (!this.running) return;

            // Move Enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const e = this.enemies[i];
                e.x -= this.speed;
                e.el.style.left = e.x + "px";

                // Auto-Attack Logic (Goku Teleport)
                if (e.x < 250 && e.state === 'move') {
                    this.gokuAttack(e);
                }

                // Cleanup off-screen
                if (e.x < -50) {
                    e.el.remove();
                    this.enemies.splice(i, 1);
                }
            }

            this.animFrame = requestAnimationFrame(() => this.loop());
        },

        gokuAttack: function (enemy) {
            enemy.state = 'dying';

            // Teleport Visual
            this.playerEl.style.transition = 'none';
            this.playerEl.style.top = (enemy.y - 10) + "px";
            this.playerEl.style.left = (enemy.x - 40) + "px";
            this.playerEl.classList.add('hub-flash');
            this.playerEl.style.transform = "scale(1.2)";

            // Impact
            setTimeout(() => {
                this.playerEl.style.transform = "scale(1)";
                this.playerEl.classList.remove('hub-flash');

                // Kill Enemy
                enemy.el.classList.add('hub-die');
                setTimeout(() => {
                    enemy.el.remove();
                    const idx = this.enemies.indexOf(enemy);
                    if (idx > -1) this.enemies.splice(idx, 1);
                }, 300);

                // Rewards
                this.handleReward();

            }, 100);
        },

        handleReward: function () {
            this.killCount++;

            // --- DYNAMIC REWARD CALCULATION ---
            
            // 1. Get current Max XP (The size of the bar)
            const maxXP = window.player.nextXp || 100;
            const currentLvl = window.GameState.gokuLevel || 1;

            // 2. XP FORMULA: Percentage of Bar
            // 0.05 = 5% of the bar per kill (approx 20 kills to level up)
            // We use Math.max(10, ...) to ensure a Level 1 player gets at least 10 XP
            const xpReward = Math.max(10, Math.floor(maxXP * 0.05));

            // ALTERNATIVE: If you prefer the "Math Power" method you asked for:
            // This creates a curve (10 -> 300 -> 9000...)
            // const xpReward = Math.floor(10 * Math.pow(currentLvl, 2.2));

            // 3. GOLD FORMULA: Scale gold linearly by level
            // Level 1 = 5g, Level 10 = 30g, Level 90 = 230g
            const goldReward = Math.floor(5 + (currentLvl * 2.5));

            // ----------------------------------

            // Apply to Player State
            window.player.xp += xpReward;
            window.player.coins += goldReward;

            // --- THIS IS THE FIX ---
            // Trigger the global level-up check from game.js
            if (window.checkLevelUp) {
                window.checkLevelUp();
            }
            // -----------------------

            // Souls Logic: 5 kills = 2 souls
            if (this.killCount % 5 === 0) {
                if (window.SoulSystem) {
                    window.SoulSystem.gainSoul();
                    window.SoulSystem.gainSoul();
                    this.showFloat("+2 SOULS", "#00ffff");
                }
            } else {
                // Show floating text with the dynamic gold amount
                this.showFloat(`+${goldReward} G`, "#f1c40f");
                
                // Optional: You could also show the XP gained
                // this.showFloat(`+${window.formatNumber(xpReward)} XP`, "#ffffff");
            }

            // Update UI Bars directly for smoothness
            const xpBar = document.getElementById('bar-xp');
            if (xpBar) {
                // Use updated window.player.nextXp (in case checkLevelUp changed it)
                const currentNextXp = window.player.nextXp; 
                const xpPct = (window.player.xp / currentNextXp) * 100;
                xpBar.style.width = xpPct + "%";
            }
            const xpText = document.getElementById('hub-xp-text');
            if (xpText) {
                xpText.innerText = `${window.formatNumber ? window.formatNumber(window.player.xp) : window.player.xp} / ${window.formatNumber ? window.formatNumber(window.player.nextXp) : window.player.nextXp}`;
            }
            const coinEl = document.getElementById('ui-coins');
            if (coinEl) {
                coinEl.innerText = window.formatNumber ? window.formatNumber(window.player.coins) : window.player.coins;
            }
        },

    window.HubBattle = HubBattle;

})();
