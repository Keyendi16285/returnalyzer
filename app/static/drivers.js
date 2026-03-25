/**
 * Returnalyzer - Drivers Logic
 * Handles fetching global coefficients for case value and probability formulas.
 */

// Helper to format currency
const formatUSD = (val) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(val);
};

// Helper to format percentages
const formatPercent = (val) => {
    // If val is 0.80, this makes it 80.00%
    return (val * 100).toFixed(2) + '%';
};

async function fetchDrivers() {
    const caseValuesTable = document.getElementById('case-values-body');
    const probabilityTable = document.getElementById('probability-drivers-body');

    try {
        const response = await fetch('/api/drivers');
        if (!response.ok) throw new Error('Failed to fetch drivers');
        
        const drivers = await response.json();

        // Separate drivers by category
        const caseValues = drivers.filter(d => d.category === 'Case Values');
        const probabilities = drivers.filter(d => d.category === 'Probability');

        // Render Case Values Table
        if (caseValues.length > 0) {
            caseValuesTable.innerHTML = caseValues.map(d => `
                <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <td class="p-4 text-sm text-slate-700 font-medium">${d.label}</td>
                    <td class="p-4 text-sm text-right font-bold text-blue-700 font-mono">
                        ${formatUSD(d.value)}
                    </td>
                </tr>
            `).join('');
        } else {
            caseValuesTable.innerHTML = `<tr><td colspan="2" class="p-8 text-center text-slate-400">No case values found.</td></tr>`;
        }

        // Render Probability Drivers Table
        if (probabilities.length > 0) {
            probabilityTable.innerHTML = probabilities.map(d => `
                <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <td class="p-4 text-sm text-slate-700 font-medium">${d.label}</td>
                    <td class="p-4 text-sm text-right font-bold text-green-700 font-mono">
                        ${formatPercent(d.value)}
                    </td>
                </tr>
            `).join('');
        } else {
            probabilityTable.innerHTML = `<tr><td colspan="2" class="p-8 text-center text-slate-400">No probability drivers found.</td></tr>`;
        }

    } catch (error) {
        console.error('Error loading drivers:', error);
        const errorMsg = `<tr><td colspan="2" class="p-8 text-center text-red-500 font-bold">Error loading driver data.</td></tr>`;
        caseValuesTable.innerHTML = errorMsg;
        probabilityTable.innerHTML = errorMsg;
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', fetchDrivers);