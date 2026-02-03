/**
 * GEAR.JS - Modern Inventory & Selling System
 */

const GearSystem = {
    selectedIdx: -1,

    // 1. Setup CSS (Styled to match your UI)
    injectStyles: function() {
        const css = `
            #gear-overlay {
                position: fixed; 
                top: 0; left: 0; 
                width: 100vw; height: 100vh;
                background: #f0f2f5; 
                z-index: 99999; /* Increased to stay on top of everything */
                display: none; 
                flex-direction: column; 
                font-family: 'Orbitron', sans-serif; 
                color: #333;
            }
            .g-header {
                background: #1a1a1a; 
                /* Fixed: Added Safe Area Inset for iPhone Notch/Clock */
                padding-top: env(safe-area-inset-top, 20px); 
                padding-bottom: 15px;
                padding-left: 20px;
                padding-right: 20px;
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                color: white;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            }
            .g-header h2 { 
                font-family: 'Bangers'; 
                margin: 0; 
                color: var(--dbz-yellow); 
                letter-spacing: 2px; 
                font-size: 1.8rem;
            }
            .g-close { 
                font-size: 1.8rem; 
                cursor: pointer; 
                color: #ff3e3e; 
                font-weight: bold; 
                padding: 5px;
            }

            .g-content { flex: 1; padding: 15px; overflow-y: auto; }
            .g-grid { 
                display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; 
                background: #fff; padding: 15px; border-radius: 12px; box-shadow: inset 0 0 10px rgba(0,0,0,0.05);
            }
            .g-slot {
                aspect-ratio: 1/1; background: #e0e4e8; border: 2px solid #ccc;
                border-radius: 8px; display: flex; flex-direction: column; 
                align-items: center; justify-content: center; position: relative;
            }
            .g-slot.selected { border-color: #3498db; background: #d6eaf8; transform: scale(1.05); }
            
            .g-type-icon { font-size: 1.4rem; }
            .g-tier { position: absolute; top: 2px; left: 4px; font-size: 0.6rem; font-weight: bold; color: #7f8c8d; }

            .g-footer { 
                background: white; 
                padding: 20px; 
                /* Fixed: Added bottom safe area for home bar */
                padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
                border-top: 1px solid #ddd;
                display: flex; flex-direction: column; gap: 10px;
            }
            .g-preview-box { background: #f8f9fa; padding: 10px; border-radius: 8px; border: 1px solid #eee; }
            .g-item-name { font-family: 'Bangers'; font-size: 1.2rem; color: #2c3e50; }
            .g-item-stats { font-size: 0.75rem; color: #7f8c8d; margin-top: 3px; }

            .g-btn-row { display: flex; gap: 10px; }
            .g-btn { 
                flex: 1; border: none; padding: 12px; border-radius: 8px; 
                font-family: 'Bangers'; font-size: 1.1rem; cursor: pointer; color: white;
            }
            .g-btn-blue { background: #3498db; }
            .g-btn-green { background: #2ecc71; }
            .g-btn:disabled { background: #bdc3c7; cursor: not-allowed; }

            #g-modal {
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 85%; background: white; border-radius: 15px; padding: 20px;
                z-index: 100000; display: none; box-shadow: 0 0 50px rgba(0,0,0,0.5);
                text-align: center; color: #333;
            }
        `;
        const styleSheet = document.createElement("style");
        styleSheet.innerText = css;
        document.head.appendChild(styleSheet);
    },

    // 2. Setup HTML
    injectHTML: function() {
        const html = `
            <div id="gear-overlay">
                <div class="g-header">
                    <h2>GEAR BACKPACK</h2>
                    <div class="g-close" onclick="GearSystem.close()">✕</div>
                </div>
                
                <div class="g-content">
                    <p style="font-size: 0.7rem; color: #888; margin-bottom: 10px;">Tap an item to manage...</p>
                    <div class="g-grid" id="gear-list"></div>
                </div>

                <div class="g-footer">
                    <div class="g-preview-box">
                        <div id="g-display-name" class="g-item-name">EMPTY SLOT</div>
                        <div id="g-display-stats" class="g-item-stats">Select item to view potential power...</div>
                    </div>
                    <div class="g-btn-row">
                        <button id="g-details-btn" class="g-btn g-btn-blue" disabled onclick="GearSystem.details()">DETAILS</button>
                        <button id="g-sell-btn" class="g-btn g-btn-green" disabled onclick="GearSystem.sell()">SELL ITEM</button>
                    </div>
                </div>
            </div>

            <div id="g-modal">
                <h3 id="gm-name" style="font-family:'Bangers'; color:#2c3e50; font-size:1.8rem;"></h3>
                <div id="gm-body" style="font-size:0.9rem; margin-bottom:20px;"></div>
                <div id="gm-price" style="color:#27ae60; font-weight:bold; margin-bottom:20px;"></div>
                <button class="g-btn g-btn-blue" style="width:100%" onclick="document.getElementById('g-modal').style.display='none'">GOT IT</button>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    init: function() {
        this.injectStyles();
        this.injectHTML();
    },

    open: function() {
        this.selectedIdx = -1;
        document.getElementById('gear-overlay').style.display = 'flex';
        this.render();
    },

    close: function() {
        document.getElementById('gear-overlay').style.display = 'none';
        document.getElementById('g-modal').style.display = 'none';
    },

    render: function() {
        const list = document.getElementById('gear-list');
        list.innerHTML = '';

        player.inv.forEach((item, i) => {
            const slot = document.createElement('div');
            slot.className = `g-slot ${this.selectedIdx === i ? 'selected' : ''}`;
            
            let emoji = item.type === 'w' ? '⚔️' : '🛡️';
            let tierLetter = item.val > 5000 ? 'R' : 'B'; // R for Rare, B for Basic

            slot.innerHTML = `
                <div class="g-tier" style="color: ${tierLetter === 'R' ? '#f39c12' : '#7f8c8d'}">${tierLetter}</div>
                <div class="g-type-icon">${emoji}</div>
            `;
            
            slot.onclick = () => this.select(i);
            list.appendChild(slot);
        });

        // Fill remaining 12 slots with empty boxes to look like a real inventory
        for(let i = player.inv.length; i < 12; i++) {
            const empty = document.createElement('div');
            empty.className = 'g-slot';
            empty.style.opacity = "0.4";
            list.appendChild(empty);
        }

        const hasItem = this.selectedIdx !== -1;
        document.getElementById('g-sell-btn').disabled = !hasItem;
        document.getElementById('g-details-btn').disabled = !hasItem;
    },

    select: function(i) {
        this.selectedIdx = i;
        const item = player.inv[i];
        document.getElementById('g-display-name').innerText = item.n;
        document.getElementById('g-display-stats').innerText = `Power Level: +${item.val.toLocaleString()} | Sell Value: 🪙 ${Math.floor(item.val / 5)}`;
        this.render();
    },

    sell: function() {
        if(this.selectedIdx === -1) return;
        const item = player.inv[this.selectedIdx];
        const price = Math.floor(item.val / 5);
        
        player.coins += price;
        player.inv.splice(this.selectedIdx, 1);
        
        this.selectedIdx = -1;
        document.getElementById('g-display-name').innerText = "ITEM SOLD";
        document.getElementById('g-display-stats').innerText = `You earned 🪙 ${price.toLocaleString()} coins!`;
        
        this.render();
        if(typeof syncUI === "function") syncUI();
    },

    details: function() {
        const item = player.inv[this.selectedIdx];
        const modal = document.getElementById('g-modal');
        
        document.getElementById('gm-name').innerText = item.n;
        document.getElementById('gm-body').innerHTML = `
            <b>Type:</b> ${item.type === 'w' ? 'Offensive Weapon' : 'Defensive Armor'}<br>
            <b>Stage Found:</b> World ${battle.world}<br><br>
            This item increases your base stats significantly. Keeping a varied inventory allows for strategy in later worlds.
        `;
        document.getElementById('gm-price').innerText = `Market Value: 🪙 ${Math.floor(item.val / 5)}`;
        
        modal.style.display = 'block';
    }
};

// Start system
GearSystem.init();