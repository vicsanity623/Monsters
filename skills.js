/* ============================
   SKILLS.JS – SELF CONTAINED
   RPG SKILL SYSTEM
   ============================ */

(() => {

    /* -------------------------
       GLOBAL EXPORT
    ------------------------- */
    window.Skills = {};

    /* -------------------------
       INTERNAL STATE
    ------------------------- */
    const now = () => Date.now();

    const STORAGE_KEY = 'GOKU_SKILLS_V1';

    const defaultSkills = {
        doubleHit: {
            id: 'doubleHit',
            name: 'Double Hit',
            level: 1,
            xp: 0,
            xpToNext: 100,
            unlocked: false,
            cooldown: 3000,
            lastUsed: 0
        },
        focus: {
            id: 'focus',
            name: 'Focus',
            level: 1,
            xp: 0,
            xpToNext: 120,
            unlocked: false,
            cooldown: 7000,
            lastUsed: 0
        },
        kameBlast: {
            id: 'kameBlast',
            name: 'Kame Blast',
            level: 1,
            xp: 0,
            xpToNext: 150,
            unlocked: false,
            cooldown: 12000,
            lastUsed: 0
        }
    };

    let skills = JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(defaultSkills);

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
    }

    /* -------------------------
       UNLOCK CHECKS
    ------------------------- */
    function updateUnlocks() {
        if (GameState.gokuLevel >= 30) skills.doubleHit.unlocked = true;
        if (GameState.gokuLevel >= 50) skills.focus.unlocked = true;
        if (GameState.gokuLevel >= 70) skills.kameBlast.unlocked = true;
        save();
    }

    /* -------------------------
       XP & LEVEL UP
    ------------------------- */
    function gainXP(skill, amount) {
        skill.xp += amount;
        if (skill.xp >= skill.xpToNext) {
            skill.xp -= skill.xpToNext;
            skill.level++;
            skill.xpToNext = Math.floor(skill.xpToNext * 1.25);

            if (skill.id === 'doubleHit') {
                skill.cooldown = Math.max(1000, skill.cooldown - 150);
            }
            if (skill.id === 'focus') {
                skill.cooldown = Math.max(2000, skill.cooldown - 300);
            }
            if (skill.id === 'kameBlast') {
                skill.cooldown = Math.max(4000, skill.cooldown - 500);
            }
        }
        save();
    }

    /* -------------------------
       COOLDOWN CHECK
    ------------------------- */
    function canUse(skill) {
        return now() - skill.lastUsed >= skill.cooldown;
    }

    /* -------------------------
       SKILL LOGIC
    ------------------------- */

    Skills.useDoubleHit = function (battleRef) {
        const s = skills.doubleHit;
        // Check if unlocked, off cooldown, and if battle is valid
        if (!s.unlocked || !canUse(s) || !battleRef || !battleRef.active) return 0;

        s.lastUsed = now();
        gainXP(s, 15);

        // 1. Show "Double HIT!" Text
        const floatText = document.createElement('div');
        floatText.className = 'pop'; // Reuse existing pop class for animation
        floatText.innerText = "DOUBLE HIT!";
        floatText.style.color = '#ff9900'; // Orange color
        floatText.style.fontSize = '2.5rem';
        floatText.style.left = '50%';
        floatText.style.top = '25%';
        floatText.style.zIndex = 100;
        // Text Shadow for readability
        floatText.style.textShadow = '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
        document.body.appendChild(floatText);
        setTimeout(() => floatText.remove(), 1000);

        // 2. Rapid Fire Logic (Non-stop for 3 seconds)
        const duration = 3000; 
        const hitsPerSecond = 10; // Very fast
        const intervalTime = 1000 / hitsPerSecond;
        
        // Damage per rapid hit (Total damage / number of hits approx)
        // Let's make each rapid hit deal 40% of normal power
        const dmgPerHit = Math.ceil(GameState.gokuPower * 0.4); 

        const rapidInterval = setInterval(() => {
            // Stop if battle ends or enemy dies
            if (!GameState.inBattle || !battleRef.active || battleRef.enemy.hp <= 0) {
                clearInterval(rapidInterval);
                return;
            }

            // Apply Damage
            battleRef.enemy.hp -= dmgPerHit;
            
            // Visual Pop for damage
            if (window.popDamage) window.popDamage(dmgPerHit, 'e-box');

        }, intervalTime);

        // Stop after 3 seconds
        setTimeout(() => clearInterval(rapidInterval), duration);

        save();
        return 0; // Return 0 so index.html doesn't apply instant damage on top
    };

    Skills.useFocus = function () {
        const s = skills.focus;
        if (!s.unlocked || !canUse(s)) return 0;

        s.lastUsed = now();
        gainXP(s, 12);

        const healPercent = Math.min(100, 12 + s.level * 4);
        const healAmount = GameState.gokuMaxHP * (healPercent / 100);

        GameState.gokuHP = Math.min(GameState.gokuMaxHP, GameState.gokuHP + healAmount);

        save();
        return healAmount;
    };

    Skills.useKameBlast = function () {
        const s = skills.kameBlast;
        if (!s.unlocked || !canUse(s)) return 0;

        s.lastUsed = now();
        gainXP(s, 20);

        triggerKameVisual();

        const damage = GameState.gokuPower * 10;
        save();
        return damage;
    };

    /* -------------------------
       AUTO BATTLE HANDLER
    ------------------------- */
    Skills.autoBattleTick = function () {
        updateUnlocks();
        if (!GameState.inBattle) return;

        if (skills.doubleHit.unlocked && canUse(skills.doubleHit)) {
            Skills.useDoubleHit();
        }

        if (skills.focus.unlocked && canUse(skills.focus) && GameState.gokuHP < GameState.gokuMaxHP * 0.6) {
            Skills.useFocus();
        }

        if (skills.kameBlast.unlocked && canUse(skills.kameBlast)) {
            Skills.useKameBlast();
        }
    };

    /* -------------------------
       UI – SKILLS SCREEN
    ------------------------- */
    Skills.openSkillScreen = function () {
        updateUnlocks();

        let overlay = document.getElementById('skillsOverlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'skillsOverlay';
        overlay.style = `
            position:fixed; inset:0;
            background:rgba(0,0,0,0.9);
            z-index:9999;
            color:#fff;
            font-family:Arial;
            overflow-y:auto;
        `;

        overlay.innerHTML = `
            <h1 style="text-align:center;margin:20px;">🔥 Goku Skills 🔥</h1>
            <div style="max-width:900px;margin:auto;">
                ${renderSkillCard(skills.doubleHit, 'Level 30')}
                ${renderSkillCard(skills.focus, 'Level 50')}
                ${renderSkillCard(skills.kameBlast, 'Level 70')}
            </div>
            <button style="display:block;margin:30px auto;padding:15px 30px;font-size:18px;" onclick="document.getElementById('skillsOverlay').remove()">Close</button>
        `;

        document.body.appendChild(overlay);
    };

    function renderSkillCard(skill, unlockText) {
        const locked = !skill.unlocked;
        const cd = (skill.cooldown / 1000).toFixed(1);

        return `
        <div style="
            background:#111;
            border:2px solid ${locked ? '#444' : '#f5c542'};
            border-radius:14px;
            padding:20px;
            margin:20px;
            box-shadow:0 0 20px rgba(255,215,0,0.15);
        ">
            <h2>${skill.name} ${locked ? '🔒' : ''}</h2>
            <p>${locked ? `Unlocks at ${unlockText}` : `Level ${skill.level}`}</p>
            <div style="background:#333;height:14px;border-radius:7px;">
                <div style="
                    width:${Math.min(100, (skill.xp / skill.xpToNext) * 100)}%;
                    height:100%;
                    background:linear-gradient(90deg,#ffcc00,#ff6600);
                    border-radius:7px;
                "></div>
            </div>
            <p>XP: ${skill.xp} / ${skill.xpToNext}</p>
            <p>Cooldown: ${cd}s</p>
        </div>
        `;
    }

    /* -------------------------
       KAME BLAST VISUAL
    ------------------------- */
    function triggerKameVisual() {
        const beam = document.createElement('div');
        beam.style = `
            position:fixed;
            inset:0;
            background:radial-gradient(circle,#00ccff 0%,#0044ff 40%,#000 70%);
            animation:flash 0.3s infinite;
            z-index:9998;
        `;

        document.body.appendChild(beam);

        setTimeout(() => beam.remove(), 3000);

        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes flash {
                0% { opacity:0.4 }
                50% { opacity:1 }
                100% { opacity:0.4 }
            }
        `;
        document.head.appendChild(style);
    }

})();
