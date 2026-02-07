/* ============================
   SOUL.JS – SOUL LEVEL SYSTEM
   ============================ */

(function() {

    const SoulSystem = {
        
        // Calculate souls needed for next level: 100 * (Level)
        // Lvl 1->2: 100, Lvl 2->3: 100, Lvl 3->4: 200...
        getSoulsNeeded: function() {
            const lvl = window.player.soulLevel || 1;
            if (lvl === 1) return 100;
            return 100 * (lvl - 1);
        },

        // Calculate Multiplier: 100% per level (Level * 1.0)
        getMultiplier: function() {
            const lvl = window.player.soulLevel || 1;
            return 1 + (lvl * 1.0); // e.g., Lvl 1 = 2x stats (100% boost)
        },

        gainSoul: function() {
            if (!window.player.soulLevel) window.player.soulLevel = 1;
            if (!window.player.souls) window.player.souls = 0;

            const needed = this.getSoulsNeeded();
            
            // Cap at max
            if (window.player.souls < needed) {
                window.player.souls++;
                this.updateBtnUI();
            }
        },

        updateBtnUI: function() {
            const btnPct = document.getElementById('soul-btn-pct');
            const btnLvl = document.getElementById('soul-btn-lvl');
            const ring = document.getElementById('soul-ring');

            if (!btnPct) return;

            const lvl = window.player.soulLevel || 1;
            const cur = window.player.souls || 0;
            const max = this.getSoulsNeeded();
            const pct = Math.min(100, Math.floor((cur / max) * 100));

            btnPct.innerText = `${pct}%`;
            btnLvl.innerText = `Lv.${lvl}`;

            // Update Progress Ring color
            const color = pct >= 100 ? '#00ffff' : '#00d2ff';
            ring.style.background = `conic-gradient(${color} ${pct}%, transparent ${pct}%)`;
            
            // Glow effect if ready
            const btn = document.getElementById('btn-soul');
            if (pct >= 100) {
                btn.style.borderColor = '#00ffff';
                btn.style.boxShadow = '0 0 10px #00ffff';
            } else {
                btn.style.borderColor = '#555';
                btn.style.boxShadow = 'none';
            }
        },

        openModal: function() {
            const modal = document.getElementById('soul-modal');
            modal.style.display = 'flex';
            this.refreshModal();
        },

        closeModal: function() {
            document.getElementById('soul-modal').style.display = 'none';
        },

        refreshModal: function() {
            const lvl = window.player.soulLevel || 1;
            const cur = window.player.souls || 0;
            const max = this.getSoulsNeeded();
            const pct = Math.min(100, Math.floor((cur / max) * 100));
            const multPct = (lvl * 100).toLocaleString();

            document.getElementById('sm-level').innerText = `Lv.${lvl}`;
            document.getElementById('sm-pct').innerText = `${pct}%`;
            document.getElementById('sm-pct').style.color = pct >= 100 ? '#00ffff' : 'white';

            // Stats Display
            const statsHTML = `
                <div>⚔️ Total Attack: +${multPct}%</div>
                <div>🛡️ Armor Defense: +${multPct}%</div>
                <div>⚡ Charge Might: +${(lvl * 10).toLocaleString()}%</div>
                <div>❤️ HP Boost: +${multPct}%</div>
            `;
            document.getElementById('sm-stats').innerHTML = statsHTML;

            // Button State
            const btn = document.getElementById('btn-liberate');
            const req = document.getElementById('sm-req');
            
            if (pct >= 100) {
                btn.classList.add('ready');
                btn.disabled = false;
                btn.innerText = "SOUL LIBERATION";
                req.innerText = "Ready to Ascend!";
                req.style.color = "#00ff00";
            } else {
                btn.classList.remove('ready');
                btn.disabled = true;
                btn.innerText = "GATHER MORE SOULS";
                req.innerText = `Requires ${max - cur} more Souls`;
                req.style.color = "#555";
            }
        },

        liberate: function() {
            const lvl = window.player.soulLevel || 1;
            const cur = window.player.souls || 0;
            const max = this.getSoulsNeeded();

            if (cur >= max) {
                // Level Up
                window.player.soulLevel++;
                window.player.souls = 0; // Reset souls
                
                // Visual Effect
                if (window.popDamage) window.popDamage("SOUL LEVEL UP!", 'view-char', true);
                
                this.updateBtnUI();
                this.refreshModal();
                
                if(typeof window.syncUI === 'function') window.syncUI();
                window.isDirty = true;
            }
        }
    };

    // Expose
    window.SoulSystem = SoulSystem;

})();
