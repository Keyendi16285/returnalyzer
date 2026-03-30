/**
 * Returnalyzer - Drivers Logic (Inline Edition with Cancel)
 */

// 1. SAFE HELPER FUNCTIONS
if (typeof formatUSD !== 'function') {
    window.formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}
if (typeof formatPercent !== 'function') {
    window.formatPercent = (val) => (val * 100).toFixed(2) + '%';
}

async function fetchDrivers() {
    const caseValuesTable = document.getElementById('case-values-body');
    const probabilityTable = document.getElementById('probability-drivers-body');

    try {
        const response = await fetch('/api/drivers');
        const drivers = await response.json();

        const renderRow = (d, isPercent) => `
            <tr class="hover:bg-blue-50/30 transition-colors border-b border-slate-100 group">
                <td class="p-4 text-sm text-slate-700 font-medium">
                    ${d.label}
                    <div class="text-[9px] text-slate-400 font-mono uppercase tracking-tighter">${d.name}</div>
                </td>
                <td class="p-4 text-right" id="container-${d.name}">
                    <div 
                        onclick="enableEditing('${d.name}', ${d.value}, ${isPercent})" 
                        class="cursor-pointer py-1 px-2 rounded hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-blue-200 transition-all font-mono font-bold ${isPercent ? 'text-green-700' : 'text-blue-700'}"
                        title="Click to edit"
                    >
                        ${isPercent ? formatPercent(d.value) : formatUSD(d.value)}
                    </div>
                </td>
            </tr>
        `;

        if (caseValuesTable) {
            caseValuesTable.innerHTML = drivers.filter(d => d.category === 'Case Values').map(d => renderRow(d, false)).join('');
        }
        if (probabilityTable) {
            probabilityTable.innerHTML = drivers.filter(d => d.category === 'Probability').map(d => renderRow(d, true)).join('');
        }

    } catch (error) {
        console.error('Error loading drivers:', error);
    }
}

// 2. TOGGLE TO EDIT MODE
window.enableEditing = function(name, currentValue, isPercent) {
    const container = document.getElementById(`container-${name}`);
    
    // Store the original HTML in case they hit cancel
    const originalHTML = container.innerHTML;

    container.innerHTML = `
        <div class="flex items-center justify-end gap-1">
            <input 
                type="number" 
                step="0.01" 
                id="input-${name}" 
                value="${currentValue}" 
                class="w-24 px-2 py-1 border-2 border-blue-500 rounded font-mono text-sm outline-none focus:bg-blue-50"
                onkeydown="handleKeydown(event, '${name}', ${currentValue}, ${isPercent})"
            >
            <button 
                onclick="saveDriverInline('${name}', ${isPercent})"
                class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[10px] font-bold shadow-sm"
                title="Save (Enter)"
            >
                SAVE
            </button>
            <button 
                onclick="cancelEditing('${name}', ${currentValue}, ${isPercent})"
                class="bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-500 px-2 py-1 rounded text-[10px] font-bold transition-colors"
                title="Cancel (Esc)"
            >
                ✕
            </button>
        </div>
    `;
    
    document.getElementById(`input-${name}`).focus();
};

// 3. KEYBOARD LISTENER (Enter to Save, Esc to Cancel)
window.handleKeydown = function(event, name, originalValue, isPercent) {
    if (event.key === 'Enter') {
        saveDriverInline(name, isPercent);
    } else if (event.key === 'Escape') {
        cancelEditing(name, originalValue, isPercent);
    }
};

// 4. CANCEL LOGIC
window.cancelEditing = function(name, originalValue, isPercent) {
    const container = document.getElementById(`container-${name}`);
    const formatted = isPercent ? formatPercent(originalValue) : formatUSD(originalValue);
    
    container.innerHTML = `
        <div 
            onclick="enableEditing('${name}', ${originalValue}, ${isPercent})" 
            class="cursor-pointer py-1 px-2 rounded hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-blue-200 transition-all font-mono font-bold ${isPercent ? 'text-green-700' : 'text-blue-700'}"
        >
            ${formatted}
        </div>
    `;
};

// 5. SAVE AND SWAP BACK
async function saveDriverInline(name, isPercent) {
    const input = document.getElementById(`input-${name}`);
    const newValue = parseFloat(input.value);

    try {
        const response = await fetch(`/api/drivers/${name}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: newValue })
        });

        if (response.ok) {
            const container = document.getElementById(`container-${name}`);
            const formatted = isPercent ? formatPercent(newValue) : formatUSD(newValue);
            
            container.innerHTML = `
                <div 
                    onclick="enableEditing('${name}', ${newValue}, ${isPercent})" 
                    class="cursor-pointer py-1 px-2 rounded bg-green-50 text-green-800 font-mono font-bold"
                >
                    ${formatted}
                </div>
            `;
            
            setTimeout(fetchDrivers, 800);
        }
    } catch (error) {
        console.error("Update failed:", error);
        alert("Failed to save value.");
    }
}

document.addEventListener('DOMContentLoaded', fetchDrivers);