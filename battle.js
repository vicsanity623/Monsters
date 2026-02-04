// Wrap in IIFE to protect scope
(function() {

    // --- UTILS ---
    function clearBattleTimers() {
        if (battle.pInterval) clearInterval(battle.pInterval);
        if (battle.eInterval) clearInterval(battle.eInterval);
        if (battle.autoTimerId) clearTimeout(battle.autoTimerId);
        
        battle.pInterval = null;
        battle.eInterval = null;
        battle.autoTimerId = null;
    }

    // --- DBZ VISUAL HELPERS ---
    
    // 1. Screen Shake Effect
    function triggerShake() {
        const arena = document.querySelector('.arena');
        if(arena) {
            arena.classList.remove('shake-screen');
            void arena.offsetWidth; // Force reflow
            arena.classList.add('shake-screen');
        }
    }

    // 2. Background Parallax (Simulate flying fast)
    function shiftBackground(direction) {
        const viewBattle = document.getElementById('view-battle');
        if(viewBattle) {
            // Get current pos or default to 50%
            let currentPos = viewBattle.style.backgroundPositionX || '50%';
            let currentVal = parseInt(currentPos) || 50;
            
            // Shift background opposite to hit direction
            let shift = direction === 'left' ? -5 : 5;
            viewBattle.style.backgroundPositionX = (currentVal + shift) + '%';
        }
    }

    // 3. Teleport Logic (The "Zwwip" effect)
    async function teleportVisual(element, targetX, targetY = 0) {
        return new Promise(resolve => {
            // Vanish
            element.classList.add('teleport-blur');
            element.style.opacity = '0';
            
            setTimeout(() => {
                // Move while invisible
                element.style.transform = `translate(${targetX}px, ${targetY}px)`;
                
                // Reappear
                setTimeout(() => {
                    element.style.opacity = '1';
                    element.classList.remove('teleport-blur');
                    resolve();
                }, 100);
            }, 150);
        });
    }

    // --- CORE BATTLE FUNCTIONS ---

    function buildStageSelector() {
        const container = document.getElementById('ui-stage-selector');
        if (!container) return;

        container.innerHTML = '';
        const fragment = document.createDocumentFragment();

        for(let i = 1; i <= 20; i++) {
            const dot = document.createElement('div');
            dot.className = 'stage-dot';
            if (i > battle.maxStage) dot.classList.add('locked');
            if (i === battle.stage) dot.classList.add('active');
            
            dot.innerText = i;
            dot.onclick = () => {
                // FIXED: Removed the "&& i !== battle.stage" check so you can start current stage
                if(i <= battle.maxStage) {
                    battle.stage = i;
                    document.getElementById('battle-menu').style.display = 'none';
                    clearBattleTimers();
                    startBattle();
                    buildStageSelector(); // Re-render to update active dot visually
                }
            };
            fragment.appendChild(dot);
        }
        container.appendChild(fragment);
    }

    function stopCombat() {
        battle.active = false;
        if (window.GameState) GameState.inBattle = false;
        clearBattleTimers();
    }

    function exitBattle() {
        const menu = document.getElementById('battle-menu');
        if (menu) menu.style.display = 'none';
        clearBattleTimers();
        if (typeof window.showTab === 'function') window.showTab('char');
    }

    function autoStartNext() {
        const menu = document.getElementById('battle-menu');
        if (menu) menu.style.display = 'none';
        clearBattleTimers();
        
        if(battle.stage === battle.maxStage && battle.maxStage < 20) {
            battle.maxStage++;
            battle.stage++;
        } else if(battle.stage === 20) {
            battle.stage = 1;
            battle.world++;
            battle.maxStage = 1;
        } else if (battle.stage < battle.maxStage) {
             battle.stage++;
        }
        startBattle();
    }

    function restartGame() {
        if (window.GameState) {
            player.hp = GameState.gokuMaxHP;
        } else {
            const maxHp = player.bHp + (player.rank * 2500) + (player.gear.a?.val || 0);
            player.hp = maxHp;
        }
        player.charge = 0;
        battle.stage = 1;
        document.getElementById('battle-menu').style.display = 'none';
        clearBattleTimers();
        startBattle();
    }

    async function startBattle() {
        stopCombat();
        battle.active = true;
        if (window.GameState) GameState.inBattle = true;
        
        document.getElementById('start-prompt').style.display = 'none';
        document.getElementById('battle-menu').style.display = 'none';
        
        const eImg = document.getElementById('e-img');
        if (eImg) {
            eImg.style.display = 'block';
            eImg.classList.remove('dead-anim');
            eImg.style.transform = 'translate(0,0)'; // Reset positions
        }
        const pBox = document.getElementById('p-box');
        if(pBox) pBox.style.transform = 'translate(0,0)';

        const log = document.getElementById('log');
        if (log) log.innerHTML = `Stage ${battle.stage}: Finding guardian...`;
        
        buildStageSelector();

        const viewBattle = document.getElementById('view-battle');
        if(apiData.planets.length > 0 && viewBattle) {
            const pIdx = (battle.world - 1) % apiData.planets.length;
            viewBattle.style.backgroundImage = `url('${apiData.planets[pIdx].image}')`;
            viewBattle.style.backgroundPositionX = '50%'; // Reset parallax
        }

        spawnPersistentEnemy();
        updateBars();
        
        const banner = document.getElementById('ready-msg');
        if (banner) {
            banner.style.display = "block";
            banner.innerText = "READY?";
            await new Promise(r => setTimeout(r, 1000));
            banner.innerText = "FIGHT!";
            await new Promise(r => setTimeout(r, 600));
            banner.style.display = "none";
        }
        
        if (log) log.innerHTML = `<div style="color:white">Battle Started!</div>`;
        
        // Player Loop
        battle.pInterval = setInterval(() => {
            if(!battle.active || battle.cinematic) return; 

            if (window.Skills) {
                // Auto skills (can be enhanced with visuals later)
                const dhDmg = Skills.useDoubleHit(battle);
                if (dhDmg > 0) {
                    battle.enemy.hp -= dhDmg;
                    popDamage(dhDmg, 'e-box', true);
                }
                Skills.useFocus();
                const kbDmg = Skills.useKameBlast();
                if (kbDmg > 0) {
                    battle.enemy.hp -= kbDmg;
                    popDamage(kbDmg, 'e-box', true);
                }
            }

            if(player.charge >= 100) {
                executeSpecial();
            } else {
                executeStrike('p');
            }
            updateBars();
        }, 500); // Slightly slower tick to allow animations to play out

        // Enemy Loop
        battle.eInterval = setInterval(() => {
            if(!battle.active || battle.cinematic) return; 
            executeStrike('e');
        }, 800);
    }

    function spawnPersistentEnemy() {
        const scale = Math.pow(1.8, battle.stage) * Math.pow(25, battle.world - 1);
        const charIdx = (battle.stage + (battle.world * 3)) % apiData.characters.length;
        
        let dat = { name: "Guardian", image: "" };
        if (apiData.characters && apiData.characters[charIdx]) {
            dat = apiData.characters[charIdx];
        }
        
        battle.enemy = { 
            name: dat.name, 
            hp: 250 * scale, 
            maxHp: 250 * scale, 
            atk: 30 * scale, 
            i: dat.image 
        };
        
        const eImg = document.getElementById('e-img');
        const eName = document.getElementById('e-name');

        if (eImg) eImg.src = battle.enemy.i;
        if (eName) eName.innerText = battle.enemy.name;
    }

    // --- THE NEW DYNAMIC COMBAT LOGIC ---
    async function executeStrike(side) {
        if(!battle.active) return;

        const isP = (side === 'p');
        const attackerBox = document.getElementById(isP ? 'p-box' : 'e-box');
        const victimBox = document.getElementById(isP ? 'e-box' : 'p-box');
        const victimImg = isP ? document.getElementById('e-img') : document.getElementById('btl-p-sprite');

        // Stats calculation
        const atkVal = isP ? (player.bAtk + (player.rank * 400) + (player.gear.w?.val || 0)) : battle.enemy.atk;
        const target = isP ? battle.enemy : player;
        const targetId = isP ? 'e-box' : 'p-box';
        
        if(isP) player.charge += 12; 
        if(player.charge > 100) player.charge = 100;

        // DBZ RANDOMIZATION: 
        // 1. Normal Hit, 2. Teleport Behind (Ambush)
        const isAmbush = Math.random() > 0.7; // 30% chance to teleport behind
        const dmg = Math.floor(atkVal * (0.7 + Math.random() * 0.6));
        
        // --- ANIMATION SEQUENCE ---

        if(isAmbush) {
            // TELEPORT SEQUENCE
            // 1. Attacker vanishes
            await teleportVisual(attackerBox, isP ? 100 : -100); 
            
            // 2. Ambush Hit logic
            target.hp -= (dmg * 1.2); // Bonus damage for ambush
            popDamage("CRIT!", targetId);
            popDamage(Math.floor(dmg * 1.2), targetId);

            // 3. Visual Impact
            triggerShake();
            victimImg.classList.add(isP ? 'knockback-right' : 'knockback-left');
            
            // 4. Reset positions after delay
            setTimeout(() => {
                victimImg.classList.remove('knockback-right', 'knockback-left');
                teleportVisual(attackerBox, 0); // Return to start
            }, 300);

        } else {
            // STANDARD BUT HEAVY SEQUENCE
            // 1. Dash forward (simulated by rapid translate)
            attackerBox.style.transition = "transform 0.1s";
            attackerBox.style.transform = isP ? 'translateX(120px)' : 'translateX(-120px)'; // Deep lunge

            setTimeout(() => {
                // 2. Impact
                target.hp -= dmg;
                popDamage(dmg, targetId);
                triggerShake();

                // 3. Knockback Effect & Background Scroll
                victimImg.classList.add(isP ? 'knockback-right' : 'knockback-left');
                shiftBackground(isP ? 'right' : 'left'); // Parallax movement

                // 4. Return to pos
                setTimeout(() => {
                    attackerBox.style.transform = 'translateX(0)';
                    victimImg.classList.remove('knockback-right', 'knockback-left');
                }, 250);

            }, 100);
        }
        
        updateBars();

        // Check Death
        if(battle.enemy.hp <= 0) {
            stopCombat();
            const eImg = document.getElementById('e-img');
            if (eImg) {
                // Death knockback
                eImg.style.transform = "rotate(90deg) scale(0.8)"; 
                eImg.classList.add('dead-anim');
            }
            setTimeout(handleWin, 800);
        } else if(player.hp <= 0) {
            stopCombat();
            handleDefeat();
        }
    }

    async function executeSpecial() {
        if(!battle.active || battle.cinematic) return; 
        
        battle.cinematic = true; 
        player.charge = 0; 
        updateBars();

        const cutInWrap = document.getElementById('cutin-overlay');
        const cutInImg = document.getElementById('cutin-img');
        
        if (cutInImg) cutInImg.src = (player.rank >= 1) ? 'charged_s.png' : 'charged_b.png';
        if (cutInWrap) cutInWrap.style.display = 'flex';

        await new Promise(r => setTimeout(r, 450)); 

        const beam = document.getElementById('fx-beam');
        if (beam) {
            // Beam visuals
            beam.style.opacity = '1';
            beam.style.width = '200%'; // Make beam huge
            triggerShake(); // Shake screen during beam
        }

        await new Promise(r => setTimeout(r, 200)); 
        if (cutInWrap) cutInWrap.style.display = 'none';

        if(!battle.active) { battle.cinematic = false; return; }
        
        const dmg = (player.bAtk + (player.rank * 400) + (player.gear.w?.val || 0)) * 6;
        battle.enemy.hp -= dmg;
        
        // Huge Impact Visuals
        popDamage("ULTIMATE!", 'e-box', true);
        popDamage(dmg, 'e-box', true);
        
        // Send enemy flying off screen
        const eImg = document.getElementById('e-img');
        if(eImg) {
            eImg.style.transition = "transform 0.5s";
            eImg.style.transform = "translateX(300px) rotate(45deg)";
        }
        
        updateBars();

        setTimeout(() => {
            if (beam) {
                beam.style.transition = "opacity 0.2s ease-out"; 
                beam.style.opacity = '0'; 
                
                setTimeout(() => {
                    beam.style.transition = "none"; 
                    beam.style.width = "0"; 
                    
                    // Reset Enemy Pos if alive
                    if(battle.enemy.hp > 0 && eImg) {
                         // Teleport enemy back to center (they recover)
                         teleportVisual(eImg.parentElement, 0); 
                         eImg.style.transform = "translateX(0)";
                    }

                    setTimeout(() => {
                        beam.style.transition = "width 0.2s cubic-bezier(0.1, 0.7, 1.0, 0.1), opacity 0.2s ease-in";
                    }, 50);

                    battle.cinematic = false; 
                }, 200);
            } else {
                battle.cinematic = false;
            }
        }, 500);

        if(battle.enemy.hp <= 0) {
            stopCombat();
            if (eImg) eImg.classList.add('dead-anim');
            setTimeout(handleWin, 600);
        }
    }

    // --- REWARDS & MENUS (Unchanged but ensuring scope is correct) ---
    function handleWin() {
        const tEl = document.getElementById('menu-title');
        if (tEl) {
            tEl.innerText = "STAGE CLEARED!";
            tEl.style.color = "var(--dbz-yellow)";
        }

        let startPct = (player.xp / player.nextXp) * 100;
        if(isNaN(startPct)) startPct = 0;
        let oldLvl = player.lvl; 

        const xpGain = 100 * battle.stage * battle.world;
        const coinGain = 250;
        player.xp += xpGain; 
        player.coins += coinGain;
            
        const log = document.getElementById('log');
        if (log) log.innerHTML = `<div style="color:cyan">> WON! +${xpGain} XP</div>`;
            
        let dropText = "NONE";
        let dropCount = 0;
        const qty = Math.floor(Math.random() * 4); 

        let dropRarity = Math.min(6, battle.world);
        let baseVal = 700;
        let baseName = "Saiyan Gear";

        if (dropRarity === 2) { baseVal = 1500; baseName = "Elite Gear"; }
        else if (dropRarity === 3) { baseVal = 3500; baseName = "Legendary Gear"; }
        else if (dropRarity === 4) { baseVal = 8500; baseName = "God Gear"; }
        else if (dropRarity === 5) { baseVal = 20000; baseName = "Angel Gear"; }
        else if (dropRarity === 6) { baseVal = 50000; baseName = "Omni Gear"; }

        for(let i = 0; i < qty; i++) {
            if (typeof window.addToInventory === 'function') {
                addToInventory({
                    n: baseName, 
                    type: Math.random() > 0.5 ? 'w' : 'a', 
                    val: baseVal, 
                    rarity: dropRarity 
                });
                dropCount++;
            }
        }

        if(dropCount > 0) {
            let rColor = "#fff";
            if(dropRarity === 2) rColor = "#00d2ff"; 
            if(dropRarity === 3) rColor = "#ff00ff"; 
            if(dropRarity >= 4) rColor = "#e74c3c";  
            dropText = `<span style="color:${rColor}">+${dropCount} ${baseName.toUpperCase()}</span>`;
        }

        if(typeof window.checkLevelUp === 'function') {
            checkLevelUp();
        } else {
            while(player.xp >= player.nextXp) {
                player.lvl++; 
                player.xp -= player.nextXp; 
                player.nextXp = Math.floor(player.nextXp * 1.3);
                player.bHp += 250; player.bAtk += 5; player.bDef += 2;
                player.hp = player.bHp + (player.rank * 2500) + (player.gear.a?.val || 0);
                if(player.lvl >= 100) { player.lvl = 1; player.rank++; }
            }
        }

        let leveledUp = (player.lvl > oldLvl);

        if (typeof window.syncUI === 'function') syncUI();
        if (window.Skills) Skills.autoBattleTick();

        document.getElementById('r-xp').innerText = xpGain;
        document.getElementById('r-coins').innerText = coinGain;
        document.getElementById('r-drops').innerHTML = dropText; 
        document.getElementById('r-lvl').innerText = player.lvl;
            
        const xpTextEl = document.getElementById('r-xp-text');
        if (xpTextEl) {
            if(leveledUp) {
                xpTextEl.innerText = "LEVEL UP!";
                xpTextEl.style.color = "#00ff00";
                xpTextEl.style.textShadow = "0 0 5px #00ff00";
            } else {
                xpTextEl.innerText = `${Math.floor(player.xp)} / ${Math.floor(player.nextXp)}`;
                xpTextEl.style.color = "white";
                xpTextEl.style.textShadow = "none";
            }
        }

        const menu = document.getElementById('battle-menu');
        if (menu) menu.style.display = 'flex';

        const rBar = document.getElementById('r-bar-xp');
        if (rBar) {
            let endPct = leveledUp ? 100 : (player.xp / player.nextXp) * 100;
            rBar.style.transition = 'none';
            rBar.style.width = startPct + "%";
            void rBar.offsetWidth;
            requestAnimationFrame(() => {
                rBar.style.transition = 'width 3s ease-out';
                rBar.style.width = endPct + "%";
            });
        }

        const btnNext = document.querySelector('#battle-menu .menu-btn:first-of-type');
        if (btnNext) {
            btnNext.innerText = "NEXT STAGE (3)";
            btnNext.onclick = autoStartNext; 
            
            let time = 3;
            btnNext.innerText = `NEXT STAGE (${time})`;
            battle.autoTimerId = setInterval(() => {
                time--;
                btnNext.innerText = `NEXT STAGE (${time})`;
                if(time <= 0) { 
                    clearBattleTimers(); 
                    autoStartNext(); 
                }
            }, 1000);
        }
    }

    function handleDefeat() {
        stopCombat();
        if (window.GameState) {
            player.hp = GameState.gokuMaxHP;
        } else {
            const maxHp = player.bHp + (player.rank * 2500) + (player.gear.a?.val || 0);
            player.hp = maxHp; 
        }

        if (typeof window.syncUI === 'function') syncUI();

        const tEl = document.getElementById('menu-title');
        if (tEl) {
            tEl.innerText = "DEFEATED";
            tEl.style.color = "#c0392b"; 
        }

        document.getElementById('r-lvl').innerText = player.lvl;
        document.getElementById('r-xp-text').innerText = `${Math.floor(player.xp)} / ${Math.floor(player.nextXp)}`;
        
        const xpPct = Math.min(100, (player.xp / player.nextXp) * 100);
        document.getElementById('r-bar-xp').style.width = xpPct + "%";

        document.getElementById('r-xp').innerText = "0";
        document.getElementById('r-coins').innerText = "0";
        document.getElementById('r-drops').innerText = "NONE";

        const btnNext = document.querySelector('#battle-menu .menu-btn:first-of-type');
        if (btnNext) {
            btnNext.onclick = restartGame; 
            let time = 5; 
            btnNext.innerText = `RESTART (STAGE 1) (${time})`;
            document.getElementById('battle-menu').style.display = 'flex';
            battle.autoTimerId = setInterval(() => {
                time--;
                btnNext.innerText = `RESTART (STAGE 1) (${time})`;
                if(time <= 0) { 
                    clearBattleTimers(); 
                    restartGame(); 
                }
            }, 1000);
        }
    }

    function updateBars() {
        let m = player.bHp + (player.rank * 2500) + (player.gear.a?.val || 0);
        
        const btlPHp = document.getElementById('btl-p-hp');
        const btlEHp = document.getElementById('btl-e-hp');
        const btlPCharge = document.getElementById('btl-p-charge');

        if (btlPHp) btlPHp.style.width = Math.max(0, (player.hp / m * 100)) + "%";
        if (btlEHp && battle.enemy) btlEHp.style.width = Math.max(0, (battle.enemy.hp / battle.enemy.maxHp * 100)) + "%";
        if (btlPCharge) btlPCharge.style.width = player.charge + "%";
    }

    // --- EXPOSE NECESSARY FUNCTIONS ---
    window.startBattle = startBattle;
    window.stopCombat = stopCombat;
    window.exitBattle = exitBattle;
    window.autoStartNext = autoStartNext;
    window.buildStageSelector = buildStageSelector;

})();
