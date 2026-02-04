/**
 * GEAR.JS - Modern Inventory & Selling System
 * Optimized: Logic Only (HTML and CSS are external)
 */

(function() {

    // --- CONFIG ---
    const CONFIG = {
        SELL_DIVISOR: 5,
        GRID_SIZE: 12
    };

    // --- HELPER FUNCTIONS ---
    function getSellPrice(item) {
        if (!item || !item.val) return 0;
        return Math.floor(item.val / CONFIG.SELL_DIVISOR);
    }

    const GearSystem = {
        selectedIdx: -1,

        init: function() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.bindEvents());
            } else {
                this.bindEvents();
            }
        },

        bindEvents: function() {
            const closeBtn = document.getElementById('g-close-btn');
            const detailsBtn = document.getElementById('g-details-btn');
            const sellBtn = document.getElementById('g-sell-btn');
            const modalClose = document.getElementById('g-modal-close');
            const list = document.getElementById('gear-list');

            if (closeBtn) closeBtn.onclick = () => this.close();
            if (detailsBtn) detailsBtn.onclick = () => this.details();
            if (sellBtn) sellBtn.onclick = () => this.sell();
            if (modalClose) modalClose.onclick = () => {
                const m = document.getElementById('g-modal');
                if(m) m.style.display = 'none';
            };

            // Event Delegation for Grid
            if (list) {
                list.addEventListener('click', (e) => {
                    const slot = e.target.closest('.g-slot');
                    if (slot && slot.dataset.index !== undefined) {
                        this.select(parseInt(slot.dataset.index));
                    }
                });
            }
        },

        open: function() {
            this.selectedIdx = -1;
            const overlay = document.getElementById('gear-overlay');
            if(overlay) overlay.style.display = 'flex';
            this.render();
        },

        close: function() {
            const overlay = document.getElementById('gear-overlay');
            const modal = document.getElementById('g-modal');
            if(overlay) overlay.style.display = 'none';
            if(modal) modal.style.display = 'none';
        },

        render: function() {
            const list = document.getElementById('gear-list');
            if(!list) return;

            list.innerHTML = '';
            const fragment = document.createDocumentFragment();

            const inventory = (typeof player !== 'undefined' && player.inv) ? player.inv : [];

            inventory.forEach((item, i) => {
                const slot = document.createElement('div');
                slot.className = `g-slot ${this.selectedIdx === i ? 'selected' : ''}`;
                slot.dataset.index = i; 
                
                let emoji = item.type === 'w' ? '⚔️' : '🛡️';
                let tierLetter = item.val > 5000 ? 'R' : 'B'; 

                slot.innerHTML = `
                    <div class="g-tier" style="color: ${tierLetter === 'R' ? '#f39c12' : '#7f8c8d'}">${tierLetter}</div>
                    <div class="g-type-icon">${emoji}</div>
                `;
                
                fragment.appendChild(slot);
            });

            // Fill empty slots
            for(let i = inventory.length; i < CONFIG.GRID_SIZE; i++) {
                const empty = document.createElement('div');
                empty.className = 'g-slot';
                empty.style.opacity = "0.4";
                empty.style.cursor = "default";
                fragment.appendChild(empty);
            }

            list.appendChild(fragment);

            const hasItem = this.selectedIdx !== -1;
            const sellBtn = document.getElementById('g-sell-btn');
            const detailsBtn = document.getElementById('g-details-btn');
            
            if(sellBtn) sellBtn.disabled = !hasItem;
            if(detailsBtn) detailsBtn.disabled = !hasItem;
        },

        select: function(i) {
            this.selectedIdx = i;
            if (typeof player === 'undefined' || !player.inv[i]) return;

            const item = player.inv[i];
            const nameEl = document.getElementById('g-display-name');
            const statsEl = document.getElementById('g-display-stats');
            
            if(nameEl) nameEl.innerText = item.n;
            if(statsEl) statsEl.innerText = `Power Level: +${item.val.toLocaleString()} | Sell Value: 🪙 ${getSellPrice(item)}`;
            
            this.render();
        },

        sell: function() {
            if(this.selectedIdx === -1 || typeof player === 'undefined') return;
            
            const item = player.inv[this.selectedIdx];
            const price = getSellPrice(item);
            
            player.coins += price;
            player.inv.splice(this.selectedIdx, 1);
            
            this.selectedIdx = -1;
            
            const nameEl = document.getElementById('g-display-name');
            const statsEl = document.getElementById('g-display-stats');

            if(nameEl) nameEl.innerText = "ITEM SOLD";
            if(statsEl) statsEl.innerText = `You earned 🪙 ${price.toLocaleString()} coins!`;
            
            this.render();
            
            if(typeof window.syncUI === "function") window.syncUI();
        },

        details: function() {
            if (this.selectedIdx === -1 || typeof player === 'undefined') return;

            const item = player.inv[this.selectedIdx];
            const modal = document.getElementById('g-modal');
            
            if(modal) {
                const worldNum = (typeof battle !== 'undefined') ? battle.world : 1;

                document.getElementById('gm-name').innerText = item.n;
                document.getElementById('gm-body').innerHTML = `
                    <b>Type:</b> ${item.type === 'w' ? 'Offensive Weapon' : 'Defensive Armor'}<br>
                    <b>Stage Found:</b> World ${worldNum}<br><br>
                    This item increases your base stats significantly. Keeping a varied inventory allows for strategy in later worlds.
                `;
                document.getElementById('gm-price').innerText = `Market Value: 🪙 ${getSellPrice(item)}`;
                
                modal.style.display = 'block';
            }
        }
    };

    window.GearSystem = {
        open: () => GearSystem.open(),
        close: () => GearSystem.close()
    };

    GearSystem.init();

})();