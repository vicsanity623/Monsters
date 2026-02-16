(function () {
    const RIVALS = [
        { name: "Vegeta", baseMult: 0.95, color: "#3498db" },
        { name: "Broly", baseMult: 1.05, color: "#2ecc71" },
        { name: "Jiren", baseMult: 1.20, color: "#e74c3c" }
    ];

    const Ranks = {
        init: function () {
            // No init logic needed for static display, 
            // but we keep this hook just in case.
        },

        openModal: function () {
            const modal = document.getElementById('ranks-modal');
            if (!modal) return;
            
            // 1. GATHER DATA
            const p = window.player;
            const s = window.GameState;
            
            // Calculate Highest Damage (Approximate based on power + crit)
            const highestDmg = Math.floor(s.gokuPower * (p.critDamage || 1.5) * 2); // Estimate max hit
            
            // Count Unlocked Skills
            const skillsUnlocked = window.Skills ? window.Skills.getUnlockedCount() : 0;
            const skillsTotal = 8; // Based on skills.js list

            // Dungeon Progress
            const dLvl = p.dungeonLevel || { buu: 1, frieza: 1, cell: 1 };
            const avgDungeon = Math.floor((dLvl.buu + dLvl.frieza + dLvl.cell) / 3);

            // Gear Rarity Names
            const wRarity = p.gear.w ? (window.RARITY_NAMES ? window.RARITY_NAMES[p.gear.w.rarity] : "B") : "None";
            const aRarity = p.gear.a ? (window.RARITY_NAMES ? window.RARITY_NAMES[p.gear.a.rarity] : "B") : "None";

            // 2. BUILD HTML STRUCTURE
            const container = document.getElementById('ranks-list');
            container.innerHTML = `
                <!-- PROFILE HEADER -->
                <div style="text-align:center; margin-bottom:20px; position:relative;">
                    <div style="width:100px; height:100px; border-radius:50%; border:3px solid ${p.rank >= 1 ? 'gold' : 'white'}; margin:0 auto; overflow:hidden; background:#000; box-shadow:0 0 20px ${p.rank >= 1 ? 'gold' : '#333'};">
                        <img src="${document.getElementById('ui-sprite').src}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div style="font-family:'Bangers'; font-size:2rem; color:white; margin-top:10px;">GOKU <span style="font-size:1rem; color:#aaa;">LV.${p.lvl}</span></div>
                    <div style="font-family:'Orbitron'; font-size:0.8rem; color:#f1c40f;">${window.RANKS ? window.RANKS[p.rank] : "Warrior"} Class</div>
                </div>

                <!-- MAIN STATS GRID -->
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px;">
                    <div class="stat-box" style="background:rgba(255,0,0,0.1); border:1px solid #ff3e3e;">
                        <div style="color:#ff3e3e; font-size:0.7rem;">TOTAL POWER</div>
                        <div style="font-size:1rem; color:white;">${window.formatNumber(s.gokuPower)}</div>
                    </div>
                    <div class="stat-box" style="background:rgba(0,255,0,0.1); border:1px solid #2ecc71;">
                        <div style="color:#2ecc71; font-size:0.7rem;">MAX HP</div>
                        <div style="font-size:1rem; color:white;">${window.formatNumber(s.gokuMaxHP)}</div>
                    </div>
                    <div class="stat-box" style="background:rgba(0,200,255,0.1); border:1px solid #00d2ff;">
                        <div style="color:#00d2ff; font-size:0.7rem;">HIGHEST HIT</div>
                        <div style="font-size:1rem; color:white;">${window.formatNumber(highestDmg)}</div>
                    </div>
                    <div class="stat-box" style="background:rgba(255,215,0,0.1); border:1px solid gold;">
                        <div style="color:gold; font-size:0.7rem;">SOULS</div>
                        <div style="font-size:1rem; color:white;">${window.formatNumber(p.souls)}</div>
                    </div>
                </div>

                <!-- DETAILED PROGRESS LIST -->
                <div style="background:#222; border-radius:10px; padding:15px; font-family:'Orbitron'; font-size:0.8rem; color:#ccc; margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #444; padding:5px 0;">
                        <span>🌍 Battle Stage</span> <span style="color:white">World ${window.battle.world} - ${window.battle.maxStage}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #444; padding:5px 0;">
                        <span>💀 Dungeon Avg Lvl</span> <span style="color:white">${avgDungeon}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #444; padding:5px 0;">
                        <span>⚔️ Explore Kills</span> <span style="color:white">${window.formatNumber(p.exploreKills || 0)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #444; padding:5px 0;">
                        <span>✨ Skills Mastered</span> <span style="color:gold">${skillsUnlocked} / ${skillsTotal}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #444; padding:5px 0;">
                        <span>⬆️ Gear Advance</span> <span style="color:#00ff00">Lv.${p.advanceLevel}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:5px 0;">
                        <span>🎒 Best Gear</span> <span style="color:#e74c3c">W:${wRarity} / A:${aRarity}</span>
                    </div>
                </div>

                <!-- RIVAL LEADERBOARD (FOOTER) -->
                <div style="border-top:2px solid #555; padding-top:15px;">
                    <div style="font-family:'Bangers'; color:#777; text-align:center; margin-bottom:10px;">GALACTIC RANKINGS</div>
                    ${this.renderRivals(s.gokuPower)}
                </div>
            `;

            modal.style.display = 'flex';
        },

        renderRivals: function (playerPower) {
            let html = '';
            // Sort rivals relative to player
            const list = RIVALS.map(r => {
                const pwr = Math.floor(playerPower * r.baseMult);
                return { ...r, pwr: pwr };
            });
            
            // Add Player to list for comparison
            list.push({ name: "YOU", pwr: playerPower, color: "gold", isPlayer: true });
            
            // Sort high to low
            list.sort((a, b) => b.pwr - a.pwr);

            list.forEach((r, i) => {
                const bg = r.isPlayer ? "background:rgba(255,215,0,0.1); border:1px solid gold;" : "background:transparent; border-bottom:1px solid #333;";
                html += `
                <div style="display:flex; justify-content:space-between; padding:8px; font-family:'Orbitron'; font-size:0.8rem; align-items:center; ${bg}">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <span style="color:#555; width:20px;">#${i + 1}</span>
                        <span style="color:${r.color}; font-weight:bold;">${r.name}</span>
                    </div>
                    <div style="color:#aaa;">⚡ ${window.formatNumber(r.pwr)}</div>
                </div>`;
            });
            return html;
        },

        closeModal: function () {
            document.getElementById('ranks-modal').style.display = 'none';
        }
    };

    window.Ranks = Ranks;

})();
