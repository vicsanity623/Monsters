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
    let bgImage = new Image(); // Store image directly for better tiling control
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

    // Inputs
    const input = { x: 0, y: 0, charging: false, chargeVal: 0 };

    // --- MAIN FUNCTIONS ---

    function initExplore() {
        if(isRunning) return;
        
        // Sync Stats
        if(window.GameState) {
            player.maxHp = window.GameState.gokuMaxHP;
            player.hp = window.GameState.gokuMaxHP;
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
        player.x = 0; // Start at 0,0 world coordinates
        player.y = 0;
        enemies = [];
        bullets = [];
        particles = [];
        input.chargeVal = 0;
        input.charging = false;
        kills = 0;
        updateHUD();

        isRunning = true;
        requestAnimationFrame(loop);

        // Spawn Loop
        setInterval(() => {
            if(isRunning && enemies.length < 12) spawnEnemy();
        }, 1200);
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

        // Ensure Invisible Style
        joyZone.style.background = 'none';
        joyZone.style.border = 'none';
        joyZone.style.width = '50%'; // Restrict joystick to Left Half Only
        joyZone.style.height = '100%';
        joyZone.style.left = '0';
        joyZone.style.bottom = '0';
        joyZone.style.zIndex = '10'; 
        stick.style.opacity = '0'; 

        const handleStart = (e) => {
            e.preventDefault();
            // Only handle first touch in zone
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
                    const maxDist = 60; // Increased range
                    let dx = touch.clientX - startX;
                    let dy = touch.clientY - startY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if(dist > maxDist) {
                        dx = (dx/dist) * maxDist;
                        dy = (dy/dist) * maxDist;
                    }
                    
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

        // Buttons (Ensure they work)
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
        // Spawn randomly around player
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.max(canvas.width, canvas.height) * 0.8; // Distance
        
        const gPower = window.GameState ? window.GameState.gokuPower : 100;
        const isStrong = Math.random() > 0.85;
        
        // Pick Random Enemy from API
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
            size: isStrong ? 120 : 80, // Base size
            hp: isStrong ? gPower * 20 : gPower * 4, // More HP relative to player dmg
            maxHp: isStrong ? gPower * 20 : gPower * 4,
            atk: (window.GameState ? window.GameState.gokuMaxHP : 100) * (isStrong ? 0.15 : 0.05),
            speed: isStrong ? 3 : 5,
            img: eImg,
            isStrong: isStrong
        });
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
            life: 50, // Frames
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
            particles.push({
                x: player.x, y: player.y,
                vx: (Math.random()-0.5)*12, vy: (Math.random()-0.5)*12,
                life: 15, color: 'cyan'
            });
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
            for(let i=0; i<10; i++) {
                particles.push({
                    x: e.x, y: e.y,
                    vx: (Math.random()-0.5)*25, vy: (Math.random()-0.5)*25,
                    life: 30, color: 'orange'
                });
            }
        });
    }

    // --- LOOP ---
    function loop(timestamp) {
        if(!isRunning) return;
        const dt = timestamp - lastTime;
        lastTime = timestamp;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update
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

        // --- RENDER BACKGROUND (INFINITE TILING) ---
        // Calculate offset based on camera position
        const tileW = bgImage.width || 1024; // Fallback size
        const tileH = bgImage.height || 1024;
        
        // Find the top-left tile index that overlaps the camera
        const startCol = Math.floor(camera.x / tileW);
        const startRow = Math.floor(camera.y / tileH);
        
        // Draw 3x3 grid around camera to cover all movement
        for(let c = startCol - 1; c <= startCol + 2; c++) {
            for(let r = startRow - 1; r <= startRow + 2; r++) {
                if(bgImage.complete && bgImage.width > 0) {
                    ctx.drawImage(bgImage, c * tileW - camera.x, r * tileH - camera.y, tileW, tileH);
                } else {
                    ctx.fillStyle = '#2c3e50';
                    ctx.fillRect(c * tileW - camera.x, r * tileH - camera.y, tileW, tileH);
                }
            }
        }

        // --- RENDER WORLD ---
        ctx.save();
        ctx.translate(-camera.x, -camera.y);

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
                // Keep Aspect Ratio if possible, but fit in box
                ctx.drawImage(player.img, player.x - player.size/2, player.y - player.size/2, player.size, player.size);
            } else {
                ctx.fillStyle = 'orange';
                ctx.fillRect(player.x - 30, player.y - 30, 60, 60);
            }
        } catch(e) {}
        ctx.restore();

        // Enemies
        for(let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            let ang = Math.atan2(player.y - e.y, player.x - e.x);
            e.x += Math.cos(ang) * e.speed;
            e.y += Math.sin(ang) * e.speed;

            // --- DRAW ENEMY (Proportional Scaling) ---
            try {
                if(e.img.complete && e.img.naturalWidth > 0) {
                    const aspect = e.img.naturalWidth / e.img.naturalHeight;
                    let drawW = e.size;
                    let drawH = e.size;
                    
                    if (aspect > 1) { drawH = e.size / aspect; } 
                    else { drawW = e.size * aspect; }

                    ctx.drawImage(e.img, e.x - drawW/2, e.y - drawH/2, drawW, drawH);
                } else {
                    ctx.fillStyle = e.isStrong ? 'red' : 'purple';
                    ctx.fillRect(e.x - e.size/2, e.y - e.size/2, e.size, e.size);
                }
            } catch(err){}

            // HP Bar
            ctx.fillStyle = 'red'; ctx.fillRect(e.x - 30, e.y - 50, 60, 6);
            ctx.fillStyle = 'lime'; ctx.fillRect(e.x - 30, e.y - 50, 60 * Math.max(0, e.hp/e.maxHp), 6);

            // Bullet Collision
            for(let j = bullets.length - 1; j >= 0; j--) {
                let b = bullets[j];
                if(Math.hypot(b.x - e.x, b.y - e.y) < (e.size/2 + 10)) {
                    e.hp -= b.damage;
                    bullets.splice(j, 1);
                    particles.push({x: e.x, y:e.y, vx:(Math.random()-0.5)*5, vy:(Math.random()-0.5)*5, life:10, color:'white'});
                }
            }

            // Player Collision (Damage)
            if(Math.hypot(player.x - e.x, player.y - e.y) < (e.size/2 + 20)) {
                if(player.invincible <= 0) {
                    let dmg = input.charging ? e.atk * 2 : e.atk;
                    // Cap damage to prevent 1-shot (max 20% hp per hit)
                    const maxDmg = player.maxHp * 0.2;
                    if(dmg > maxDmg) dmg = maxDmg;
                    
                    player.hp -= dmg;
                    player.invincible = 30; 
                    updateHUD();
                }
            }

            if(e.hp <= 0) {
                enemies.splice(i, 1);
                kills++;
                if(window.player) {
                    window.player.coins += e.isStrong ? 500 : 100;
                    window.player.xp += e.isStrong ? 200 : 50;
                }
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

    // Expose
    window.initExplore = initExplore;
    window.stopExplore = stopExplore;

})();