if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW failed', err));
    });
}

const API_BASE = "https://dragonball-api.com/api";
const GOKU_BASE = "IMG_0061.png";
const GOKU_SSJ = "IMG_0062.png";
const RANKS = ["BASE", "S", "SS", "SS2", "SS3", "SSG", "SSB", "UI", "MUI", "SSS", "SSS10"];
const RARITY_NAMES = {1:"B", 2:"R", 3:"L", 4:"S", 5:"SS", 6:"SSS"};

let apiData = { characters: [], planets: [] };
let player = {
    lvl: 1, rank: 0, xp: 0, nextXp: 100, coins: 500,
    bAtk: 40, bDef: 25, bHp: 500, hp: 500, charge: 0,
    inv: [], gear: { w: null, a: null }, selected: -1,
    lastCapsule: 0
};
let battle = { 
    stage: 1, 
    world: 1, 
    maxStage: 1, 
    active: false, 
    enemy: null,
    autoTimerId: null,
    pInterval: null,
    eInterval: null,
    cinematic: false 
};
window.GameState = {
    get gokuLevel() { return player.lvl; },
    get gokuPower() {
        return (player.bAtk + (player.rank * 400) + (player.gear.w?.val || 0));
    },
    get gokuHP() { return player.hp; },
    set gokuHP(v) { player.hp = v; },
    get gokuMaxHP() {
        return player.bHp + (player.rank * 2500) + (player.gear.a?.val || 0);
    },
    inBattle: false
};

async function initGame() {
    try {
        const charRes = await fetch(`${API_BASE}/characters?limit=58`);
        const charJson = await charRes.json();
        apiData.characters = charJson.items;
        const planRes = await fetch(`${API_BASE}/planets?limit=20`);
        const planJson = await planRes.json();
        apiData.planets = planJson.items;
        
        loadGame();
        
        document.getElementById('loader').style.display = 'none';
        syncUI();
        buildStageSelector();
        
        if(typeof initStrategy === 'function') initStrategy();
    
        setInterval(saveGame, 30000);
        setInterval(updateCapsuleBtn, 1000);
        
    } catch (e) {
        console.error("API Error", e);
        document.getElementById('loader').style.display = 'none';
    }
}

function showLevelUp(oldLvl, newLvl) {
    // Force Pause Battle
    if(battle.active) {
        battle.cinematic = true; // Pauses combat loops
    }

    document.getElementById('lvl-up-old').innerText = oldLvl;
    document.getElementById('lvl-up-new').innerText = newLvl;
    
    // Show Stats
    const maxHp = player.bHp + (player.rank * 2500) + (player.gear.a?.val || 0);
    const atk = player.bAtk + (player.rank * 400) + (player.gear.w?.val || 0);
    const def = player.bDef + (player.rank * 150) + (player.gear.a?.val || 0);

    document.getElementById('lvl-stats-hp').innerText = maxHp;
    document.getElementById('lvl-stats-atk').innerText = atk;
    document.getElementById('lvl-stats-def').innerText = def;

    const img = (player.rank >= 1) ? "IMG_0062.png" : "IMG_0061.png";
    document.getElementById('lvl-up-img').src = img;

    document.getElementById('levelup-modal').style.display = 'flex';
}

function closeLevelUp() {
    document.getElementById('levelup-modal').style.display = 'none';
    
    // Resume Battle if active
    if(GameState.inBattle && battle.active) {
        battle.cinematic = false;
    }
}

function checkLevelUp() {
    let leveledUp = false;
    const oldLvl = player.lvl;

    while(player.xp >= player.nextXp) {
        player.lvl++; 
        player.xp -= player.nextXp; 
        player.nextXp = Math.floor(player.nextXp * 1.3);
        
        player.bHp += 250; 
        player.bAtk += 5; 
        player.bDef += 2;
        
        const maxHp = player.bHp + (player.rank * 2500) + (player.gear.a?.val || 0);
        player.hp = maxHp;
        
        if(player.lvl >= 100) { player.lvl = 1; player.rank++; }
        leveledUp = true;
    }

    if(leveledUp) {
        showLevelUp(oldLvl, player.lvl);
        syncUI();
        saveGame();
    }
}

function claimSupply() {
    const now = Date.now();
    const cooldown = 60000; 
    
    if(!player.lastCapsule) player.lastCapsule = 0;
    const diff = now - player.lastCapsule;
    
    if(diff < cooldown) {
        const rem = Math.ceil((cooldown - diff) / 1000);
        alert(`Supply Capsule recharging... ${rem}s remaining.`);
        return;
    }
    
    player.lastCapsule = now;
    
    const base = 50 * (player.lvl || 1);
    const xpGain = Math.floor(base * (0.8 + Math.random() * 0.4));
    const coinGain = Math.floor(base * 0.5);
    
    player.xp += xpGain;
    player.coins += coinGain;
    
    let msg = `SUPPLY DROP RECEIVED!\n\n+${xpGain} XP\n+${coinGain} Coins`;
    
    if(Math.random() < 0.3) {
        const item = {
            n: "Capsule Gear", 
            type: Math.random() > 0.5 ? 'w' : 'a', 
            val: 700, 
            rarity: 1 
        };
        addToInventory(item);
        msg += `\n+1 Saiyan Gear`;
    }
    
    checkLevelUp();
    syncUI();
    saveGame();
    
    // Only alert if NO level up happened (to avoid double popup)
    if(document.getElementById('levelup-modal').style.display === 'none') {
        alert(msg);
    }
    updateCapsuleBtn();
}

function updateCapsuleBtn() {
    const btn = document.getElementById('btn-supply');
    if(!btn) return;
    
    const now = Date.now();
    const cooldown = 60000;
    const diff = now - (player.lastCapsule || 0);
    
    if(diff >= cooldown) {
        btn.innerHTML = "<i>🎁</i> Supply Ready!";
        btn.classList.add('btn-ready');
        btn.style.color = "#fff";
    } else {
        const rem = Math.ceil((cooldown - diff) / 1000);
        btn.innerHTML = `<i>⏳</i> ${rem}s`;
        btn.classList.remove('btn-ready');
        btn.style.color = "#777";
    }
}

function tapTrain() {
    const xpGain = Math.ceil(player.lvl / 2);
    const coinGain = 1;
    
    player.xp += xpGain;
    player.coins += coinGain;
    
    popDamage(`+${xpGain} XP`, 'view-char', true);
    
    checkLevelUp();
    syncUI();
}

function saveGame() {
    player.lastSave = Date.now(); 
    const saveData = {
        player: player,
        battle: { stage: battle.stage, world: battle.world, maxStage: battle.maxStage }
    };
    localStorage.setItem('dbz_gacha_save', JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem('dbz_gacha_save');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if(parsed.player) player = parsed.player;
            if(parsed.battle) {
                battle.stage = parsed.battle.stage || 1;
                battle.world = parsed.battle.world || 1;
                battle.maxStage = parsed.battle.maxStage || 1;
            }
            player.inv.forEach(i => { if(!i.qty) i.qty = 1; });
        } catch (e) { console.error("Save file corrupted", e); }
    }
}

window.addEventListener('beforeunload', () => saveGame());

function showTab(t) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('view-' + t).classList.add('active-screen');
    document.getElementById('tab-' + t).classList.add('active');
    
    if(t === 'battle') {
        if(!battle.active) {
            document.getElementById('start-prompt').style.display = 'block';
            document.getElementById('e-img').style.display = 'none';
            document.getElementById('e-name').innerText = "";
        }
    } else {
        stopCombat();
        document.getElementById('battle-menu').style.display = 'none';
    }
    syncUI();
}

function addToInventory(item) {
    const found = player.inv.find(i => i.n === item.n && i.type === item.type && i.val === item.val && i.rarity === item.rarity && i.qty < 99);
    if(found) {
        found.qty++;
    } else {
        item.qty = 1;
        player.inv.push(item);
    }
}

function syncUI() {
    const sprite = (player.rank >= 1) ? GOKU_SSJ : GOKU_BASE;
    document.getElementById('ui-sprite').src = sprite;
    document.getElementById('btl-p-sprite').src = sprite;
    document.getElementById('ui-aura').style.display = (player.rank >= 1) ? "block" : "none";
    
    const maxHp = player.bHp + (player.rank * 2500) + (player.gear.a?.val || 0);
    const atk = player.bAtk + (player.rank * 400) + (player.gear.w?.val || 0);
    const def = player.bDef + (player.rank * 150) + (player.gear.a?.val || 0);

    document.getElementById('ui-rank-badge').innerText = RANKS[player.rank].substring(0,2);
    document.getElementById('ui-name').innerText = player.rank > 0 ? "Goku " + RANKS[player.rank] : "Goku";
    document.getElementById('ui-lvl').innerText = player.lvl;
    document.getElementById('ui-atk').innerText = atk;
    document.getElementById('ui-def').innerText = def;
    document.getElementById('ui-coins').innerText = player.coins;
    document.getElementById('ui-hp-txt').innerText = `${Math.floor(player.hp)}`;
    document.getElementById('ui-power').innerText = (atk * 30 + maxHp).toLocaleString();
    
    const xpPct = (player.xp / player.nextXp) * 100;
    document.getElementById('bar-xp').style.width = xpPct + "%";
    
    const grid = document.getElementById('inv-grid');
    grid.innerHTML = '';
    
    let mergeBtn = document.getElementById('btn-merge');
    let equipBtn = document.getElementById('btn-action');
    mergeBtn.style.display = 'none';
    equipBtn.style.display = 'flex'; 

    player.inv.forEach((item, i) => {
        const d = document.createElement('div');
        let rClass = 'item-basic';
        if(item.rarity === 2) rClass = 'item-rare';
        if(item.rarity === 3) rClass = 'item-legendary';
        if(item.rarity === 4) rClass = 'item-s';
        if(item.rarity === 5) rClass = 'item-ss';
        if(item.rarity === 6) rClass = 'item-sss';
        
        d.className = `inv-item ${rClass} ${player.selected === i ? 'selected' : ''}`;
        let rName = RARITY_NAMES[item.rarity] || "B";
        
        let qtyHtml = item.qty > 1 ? `<div class="qty-badge">x${item.qty}</div>` : '';
        
        d.innerHTML = `<span>${item.type === 'w' ? '⚔️' : '🛡️'}</span><span>${rName}</span>${qtyHtml}`;
        d.onclick = () => { player.selected = i; syncUI(); };
        grid.appendChild(d);
    });

    updateVisualSlot('w', 'slot-w');
    updateVisualSlot('a', 'slot-a');

    if(player.selected !== -1) {
        const sItem = player.inv[player.selected];
        
        let totalCount = 0;
        player.inv.forEach(i => {
            if(i.n === sItem.n && i.type === sItem.type && i.rarity === sItem.rarity) {
                totalCount += i.qty;
            }
        });

        if(totalCount >= 3 && sItem.rarity < 6) {
            mergeBtn.style.display = 'flex';
            equipBtn.style.display = 'none';
            mergeBtn.innerHTML = `<span>⬆️ MERGE (3) - $${sItem.rarity * 500}</span>`;
        } else {
            equipBtn.innerHTML = `<span>EQUIP ${sItem.type === 'w' ? 'WEAPON' : 'ARMOR'}</span>`;
        }
    } else {
        equipBtn.innerHTML = `<span>SELECT GEAR</span>`;
    }
}

function updateVisualSlot(type, id) {
    const el = document.getElementById(id);
    const item = player.gear[type];
    if(item) {
        el.className = 'slot-box slot-filled';
        let rColor = '#333';
        if(item.rarity === 2) rColor = '#00d2ff';
        if(item.rarity === 3) rColor = '#ff00ff';
        if(item.rarity === 4) rColor = '#e74c3c';
        if(item.rarity === 5) rColor = '#f1c40f';
        if(item.rarity === 6) rColor = '#00ffff';

        el.style.borderColor = rColor;
        el.innerHTML = `<span>${type === 'w' ? '⚔️' : '🛡️'}</span><div class="slot-label" style="color:${rColor}">${item.val}</div>`;
    } else {
        el.className = 'slot-box';
        el.style.borderColor = '#b2bec3';
        el.innerHTML = `<span>${type === 'w' ? '⚔️' : '🛡️'}</span><div class="slot-label">${type === 'w' ? 'WEAPON' : 'ARMOR'}</div>`;
    }
}

function mergeItems() {
    if(player.selected === -1) return;
    const sItem = player.inv[player.selected];
    const cost = sItem.rarity * 500;
    
    if(player.coins < cost) { alert("Not enough coins!"); return; }

    let totalCount = 0;
    player.inv.forEach(i => {
        if(i.n === sItem.n && i.type === sItem.type && i.rarity === sItem.rarity) totalCount += i.qty;
    });

    if(totalCount >= 3) {
        player.coins -= cost;
        
        let needed = 3;
        for(let i = player.inv.length - 1; i >= 0; i--) {
            if(needed <= 0) break;
            let item = player.inv[i];
            if(item.n === sItem.n && item.type === sItem.type && item.rarity === sItem.rarity) {
                if(item.qty >= needed) {
                    item.qty -= needed;
                    needed = 0;
                    if(item.qty === 0) player.inv.splice(i, 1);
                } else {
                    needed -= item.qty;
                    player.inv.splice(i, 1);
                }
            }
        }

        const newRarity = sItem.rarity + 1;
        let newVal = 0;
        let newName = "Saiyan Gear";

        if (newRarity === 2) { newVal = 1500; newName = "Elite Gear"; }      
        else if (newRarity === 3) { newVal = 3500; newName = "Legendary Gear"; } 
        else if (newRarity === 4) { newVal = 8500; newName = "God Gear"; }       
        else if (newRarity === 5) { newVal = 20000; newName = "Angel Gear"; }    
        else if (newRarity === 6) { newVal = 50000; newName = "Omni Gear"; }     
        else { newVal = Math.floor(sItem.val * 2); } 

        addToInventory({ n: newName, type: sItem.type, val: newVal, rarity: newRarity });
        
        player.selected = -1;
        syncUI();
    }
}

function train(s) {
    if(player.coins >= 100) {
        player.coins -= 100;
        if(s === 'atk') player.bAtk += 20; else player.bDef += 10;
        syncUI();
    } else {
        alert("Need 100 Coins to Train!");
    }
}

function doEquip() {
    if(player.selected === -1) return;
    
    const stackItem = player.inv[player.selected]; 
    const itemToEquip = { 
        n: stackItem.n, 
        type: stackItem.type, 
        val: stackItem.val, 
        rarity: stackItem.rarity,
        qty: 1 
    };

    const old = player.gear[stackItem.type]; 
    player.gear[stackItem.type] = itemToEquip;
    stackItem.qty--;
    if(stackItem.qty <= 0) {
        player.inv.splice(player.selected, 1);
    }
    if(old) {
        addToInventory(old);
    }
    player.selected = -1;
    syncUI();
}

function popDamage(dmg, id, isSpecial = false) {
    const d = document.createElement('div');
    d.className = 'pop';
    
    if (typeof dmg === 'string') {
        d.innerText = dmg; 
        d.style.color = '#00ff00'; 
        d.style.fontSize = '1.5rem';
    } else {
        d.innerText = "-" + Math.floor(dmg);
        if(isSpecial) {
            d.style.color = 'cyan';
            d.style.fontSize = '3rem';
            d.style.zIndex = 30;
        }
    }

    const randomX = (Math.random() * 40) - 20; 
    const randomY = (Math.random() * 40) - 20;
    
    if(id === 'view-char') {
            d.style.left = `50%`;
            d.style.top = `40%`;
    } else {
            d.style.left = `calc(50% + ${randomX}px)`;
            d.style.top = `calc(20% + ${randomY}px)`;
    }

    const container = document.getElementById(id);
    if(container) container.appendChild(d);
    
    setTimeout(() => d.remove(), 600);
}