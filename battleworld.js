(function() {
    // --- ASSETS & CONFIG ---
    const ASSETS = {
        BG: "https://i.imgur.com/sji5KLp.jpg", 
        ENEMY_FALLBACK: "https://dragonball-api.com/transformations/frieza-final.png" 
    };

    const canvas = document.getElementById('explore-canvas');
    const ctx = canvas.getContext('2d');

    // Game State
    let isRunning = false;
    let lastTime = 0;
    let camera = { x: 0, y: 0 };
    let bgImage = new Image(); 
    let kills = 0;

    // Entities
    let player = { 
        x: 0, y: 0, size: 70, speed: 8, 
        hp: 100, maxHp: 100, 
        faceRight: true,
        invincible: 0,
        img: new Image()
    };
    let enemies = [];
    let bullets = [];
    let particles = [];
    let loots = []; // NEW: Loot Array

    // Inputs
    const input = { x: 0, y: 0, charging: false, chargeVal: 0 };

    // --- MAIN FUNCTIONS ---

    function initExplore() {
        if(isRunning) return;
        
        // Sync Stats - FORCE REFRESH
        if(window.GameState) {
            player.maxHp = window.GameState.gokuMaxHP;
            player.hp = window.GameState.gokuMaxHP; // Start FULL health
        } else {
            // Fallback if GameState isn't ready
            player.maxHp = 100; player.hp = 100;
        }
        
        // Load Player Sprite
        const hudSprite = document.getElementById('ui-sprite');
        if(hudSprite && hudSprite.src) {
            player.img.src = hudSprite.src;
        } else {
            player.img.src = "IMG_0061.png"; 
        }

        resize();
        window.addEventListener('resize', resize);
        setupControls();

        // Load BG Image
        bgImage.crossOrigin = "Anonymous";
        bgImage.src = ASSETS.BG;

        // Reset World
        player.x = 0; 
        player.y = 0;
        enemies = [];
        bullets = [];
        particles = [];
        loots = []; // Reset Loot
        input.chargeVal = 0;
        input.charging = false;
        kills = 0;
        
        // Force update HUD immediately
        updateHUD();

        isRunning = true;
        requestAnimationFrame(loop);

        // Spawn Loop - REDUCED RATE
        setInterval(() => {
            // Max 6 enemies at once to prevent swarm
            if(isRunning && enemies.length < 6) spawnEnemy();
        }, 2000); // Slower spawn (2s)
    }

    function stopExplore() {
        isRunning = false;
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // --- CONTROLS ---
    function setupControls() {
        const joyZone = document.getElementById('joy-zone');
        const stick = document.getElementById('joy-stick');
        let startX, startY;
        let activeTouchId = null;

        joyZone.style.background = 'none';
        joyZone.style.border = 'none';
        joyZone.style.width = '50%'; 
        joyZone.style.height = '100%';
        joyZone.style.left = '0';
        joyZone.style.bottom = '0';
        joyZone.style.zIndex = '10'; 
        stick.style.opacity = '0'; 

        const handleStart = (e) => {
            e.preventDefault();
            if (activeTouchId !== null) return;
            const touch = e.changedTouches[0];
            activeTouchId = touch.identifier;
            startX = touch.clientX;
            startY = touch.clientY;
            stick.style.transition = 'none';
            stick.style.opacity = '0.6';
            stick.style.left = startX + 'px';
            stick.style.top = startY + 'px';
            stick.style.transform = `translate(-50%, -50%)`;
        };

        const handleMove = (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === activeTouchId) {
                    const touch = e.changedTouches[i];
                    const maxDist = 60; 
                    let dx = touch.clientX - startX;
                    let dy = touch.clientY - startY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if(dist > maxDist) { dx = (dx/dist) * maxDist; dy = (dy/dist) * maxDist; }
                    stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                    input.x = dx / maxDist;
                    input.y = dy / maxDist;
                    break;
                }
            }
        };

        const handleEnd = (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === activeTouchId) {
                    activeTouchId = null;
                    input.x = 0; input.y = 0;
                    stick.style.opacity = '0';
                    break;
                }
            }
        };

        joyZone.addEventListener('touchstart', handleStart, {passive: false});
        joyZone.addEventListener('touchmove', handleMove, {passive: false});
        joyZone.addEventListener('touchend', handleEnd);

        const btnAtk = document.getElementById('btn-ex-attack');
        if(btnAtk) btnAtk.onclick = () => { if(!input.charging) shoot(); };
        const btnDodge = document.getElementById('btn-ex-dodge');
        if(btnDodge) btnDodge.onclick = () => { if(!input.charging) dodge(); };
        const btnCharge = document.getElementById('btn-ex-charge');
        if(btnCharge) {
            const startCharge = (e) => { e.preventDefault(); input.charging = true; };
            const endCharge = (e) => { 
                e.preventDefault(); 
                if(input.chargeVal >= 100) unleashUltimate();
                input.charging = false; 
                input.chargeVal = 0;
                const overlay = document.getElementById('ex-charge-overlay');
                if(overlay) overlay.style.display = 'none';
            };
            btnCharge.addEventListener('touchstart', startCharge);
            btnCharge.addEventListener('touchend', endCharge);
            btnCharge.addEventListener('mousedown', startCharge);
            btnCharge.addEventListener('mouseup', endCharge);
        }
    }

    // --- GAMEPLAY ---

    function spawnEnemy() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.max(canvas.width, canvas.height) * 0.8; 
        const gPower = window.GameState ? window.GameState.gokuPower : 100;
        const isStrong = Math.random() > 0.85;
        
        let enemySrc = ASSETS.ENEMY_FALLBACK;
        if(window.apiData && window.apiData.characters && window.apiData.characters.length > 0) {
            const rIdx = Math.floor(Math.random() * window.apiData.characters.length);
            const char = window.apiData.characters[rIdx];
            if(char && char.image) enemySrc = char.image;
        }

        const eImg = new Image();
        eImg.src = enemySrc;

        enemies.push({
            x: player.x + Math.cos(angle) * radius,
            y: player.y + Math.sin(angle) * radius,
            size: isStrong ? 120 : 80, 
            hp: isStrong ? gPower * 20 : gPower * 4, 
            maxHp: isStrong ? gPower * 20 : gPower * 4,
            atk: (window.GameState ? window.GameState.gokuMaxHP : 100) * (isStrong ? 0.15 : 0.05),
            speed: isStrong ? 3 : 5,
            img: eImg,
            isStrong: isStrong
        });
    }

    function spawnLoot(x, y, isStrong) {
        // Drop 1-3 coins/xp orbs
        const count = isStrong ? 5 : 1;
        for(let i=0; i<count; i++) {
            loots.push({
                x: x + (Math.random()-0.5)*40,
                y: y + (Math.random()-0.5)*40,
                type: Math.random() > 0.5 ? 'coin' : 'xp',
                val: isStrong ? 500 : 100,
                vx: (Math.random()-0.5)*10,
                vy: (Math.random()-0.5)*10
            });
        }
    }

    function shoot() {
        let vx = input.x; let vy = input.y;
        if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) {
            let nearest = null; let minD = Infinity;
            enemies.forEach(e => {
                let d = Math.hypot(e.x - player.x, e.y - player.y);
                if (d < minD) { minD = d; nearest = e; }
            });
            if (nearest) {
                let angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
                vx = Math.cos(angle); vy = Math.sin(angle);
            } else {
                vx = player.faceRight ? 1 : -1; vy = 0;
            }
        }
        player.faceRight = vx > 0;

        bullets.push({
            x: player.x, y: player.y,
            vx: vx * 22, vy: vy * 22,
            life: 50, 
            damage: window.GameState ? window.GameState.gokuPower : 50
        });
    }

    function dodge() {
        let dx = input.x || (player.faceRight ? 1 : -1);
        let dy = input.y || 0;
        let len = Math.sqrt(dx*dx + dy*dy);
        if(len === 0) len = 1;
        player.x += (dx/len) * 300;
        player.y += (dy/len) * 300;
        for(let i=0; i<6; i++) {
            particles.push({x: player.x, y: player.y, vx:(Math.random()-0.5)*12, vy:(Math.random()-0.5)*12, life:15, color:'cyan'});
        }
    }

    function unleashUltimate() {
        const overlay = document.getElementById('view-explore');
        const flash = document.createElement('div');
        flash.className = 'flash-screen';
        overlay.appendChild(flash);
        setTimeout(() => flash.remove(), 2500);

        enemies.forEach(e => {
            e.hp = 0;
            for(let i=0; i<10; i++) particles.push({x: e.x, y: e.y, vx:(Math.random()-0.5)*25, vy:(Math.random()-0.5)*25, life:30, color:'orange'});
        });
    }

    // --- LOOP ---
    function loop(timestamp) {
        if(!isRunning) return;
        const dt = timestamp - lastTime;
        lastTime = timestamp;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update Player
        if(input.charging) {
            input.chargeVal += 1.2; 
            if(input.chargeVal > 100) input.chargeVal = 100;
            const hud = document.getElementById('ex-charge-overlay');
            if(hud) {
                hud.style.display = 'block';
                const fill = document.getElementById('ex-charge-fill');
                if(fill) fill.style.width = input.chargeVal + '%';
            }
            player.x += (Math.random()-0.5)*6;
            player.y += (Math.random()-0.5)*6;
        } else {
            player.x += input.x * player.speed;
            player.y += input.y * player.speed;
            if(input.x > 0) player.faceRight = true;
            if(input.x < 0) player.faceRight = false;
        }

        camera.x = player.x - canvas.width/2;
        camera.y = player.y - canvas.height/2;

        // Render BG
        ctx.save();
        ctx.translate(-camera.x % canvas.width, -camera.y % canvas.height);
        if(bgImage.complete && bgImage.width > 0) {
            for(let i=-1; i<=1; i++) {
                for(let j=-1; j<=1; j++) {
                    ctx.drawImage(bgImage, i*canvas.width, j*canvas.height, canvas.width, canvas.height);
                }
            }
        } else {
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.restore();

        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        // Loot Logic (Magnet)
        for(let i = loots.length - 1; i >= 0; i--) {
            let l = loots[i];
            // Slow down physics
            l.x += l.vx; l.y += l.vy;
            l.vx *= 0.9; l.vy *= 0.9;

            // Magnet
            const d = Math.hypot(player.x - l.x, player.y - l.y);
            if(d < 200) { // Magnet Range
                const ang = Math.atan2(player.y - l.y, player.x - l.x);
                l.x += Math.cos(ang) * 15; // Fly to player
                l.y += Math.sin(ang) * 15;
            }

            // Collect
            if(d < 40) {
                if(window.player) {
                    if(l.type === 'coin') window.player.coins += l.val;
                    else window.player.xp += l.val;
                }
                loots.splice(i, 1);
                continue;
            }

            // Draw Loot
            ctx.beginPath();
            ctx.arc(l.x, l.y, 8, 0, Math.PI*2);
            ctx.fillStyle = l.type === 'coin' ? 'gold' : 'cyan';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Bullets
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff';
        for(let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.x += b.vx; b.y += b.vy; b.life--;
            ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI*2); ctx.fill();
            if(b.life <= 0) bullets.splice(i, 1);
        }
        ctx.shadowBlur = 0;

        // Player
        ctx.save();
        if(!player.faceRight) {
            ctx.translate(player.x + player.size/2, player.y);
            ctx.scale(-1, 1);
            ctx.translate(-(player.x + player.size/2), -player.y);
        }
        if(input.charging) { ctx.shadowColor = 'white'; ctx.shadowBlur = 25; }
        
        try {
            if(player.img.complete) {
                ctx.drawImage(player.img, player.x - player.size/2, player.y - player.size/2, player.size, player.size);
            } else {
                ctx.fillStyle = 'orange'; ctx.fillRect(player.x - 30, player.y - 30, 60, 60);
            }
        } catch(e) {}
        ctx.restore();

        // Enemies
        for(let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            let ang = Math.atan2(player.y - e.y, player.x - e.x);
            e.x += Math.cos(ang) * e.speed;
            e.y += Math.sin(ang) * e.speed;

            try {
                if(e.img.complete && e.img.naturalWidth > 0) {
                    const aspect = e.img.naturalWidth / e.img.naturalHeight;
                    let drawW = e.size; let drawH = e.size;
                    if (aspect > 1) drawH = e.size / aspect; else drawW = e.size * aspect;
                    ctx.drawImage(e.img, e.x - drawW/2, e.y - drawH/2, drawW, drawH);
                } else {
                    ctx.fillStyle = e.isStrong ? 'red' : 'purple';
                    ctx.fillRect(e.x - e.size/2, e.y - e.size/2, e.size, e.size);
                }
            } catch(err){}

            ctx.fillStyle = 'red'; ctx.fillRect(e.x - 30, e.y - 50, 60, 6);
            ctx.fillStyle = 'lime'; ctx.fillRect(e.x - 30, e.y - 50, 60 * Math.max(0, e.hp/e.maxHp), 6);

            for(let j = bullets.length - 1; j >= 0; j--) {
                let b = bullets[j];
                if(Math.hypot(b.x - e.x, b.y - e.y) < (e.size/2 + 10)) {
                    e.hp -= b.damage;
                    bullets.splice(j, 1);
                    particles.push({x: e.x, y:e.y, vx:(Math.random()-0.5)*5, vy:(Math.random()-0.5)*5, life:10, color:'white'});
                }
            }

            if(Math.hypot(player.x - e.x, player.y - e.y) < (e.size/2 + 20)) {
                if(player.invincible <= 0) {
                    let dmg = input.charging ? e.atk * 2 : e.atk;
                    const maxDmg = player.maxHp * 0.2;
                    if(dmg > maxDmg) dmg = maxDmg;
                    player.hp -= dmg;
                    player.invincible = 30; 
                    updateHUD();
                }
            }

            if(e.hp <= 0) {
                // Drop Loot before removing
                spawnLoot(e.x, e.y, e.isStrong);
                enemies.splice(i, 1);
                kills++;
                updateHUD();
            }
        }

        // Particles
        for(let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx; p.y += p.vy; p.life--;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life/20;
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
            if(p.life<=0) particles.splice(i, 1);
        }
        ctx.globalAlpha = 1;

        ctx.restore();

        if(player.invincible > 0) player.invincible--;

        if(player.hp <= 0) {
            alert("GOKU DEFEATED!");
            stopExplore();
            if(typeof window.showTab === 'function') window.showTab('char');
        }

        requestAnimationFrame(loop);
    }

    function updateHUD() {
        const kc = document.getElementById('hud-kill-count');
        if(kc) kc.innerText = kills;
        const hpBar = document.getElementById('hud-hp-bar');
        if(hpBar) {
            const pct = Math.max(0, (player.hp / player.maxHp) * 100);
            hpBar.style.width = pct + "%";
        }
    }

    window.initExplore = initExplore;
    window.stopExplore = stopExplore;

})();