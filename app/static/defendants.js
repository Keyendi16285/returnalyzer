/**
 * Returnalyzer - Defendants Logic
 * Handles fetching shared database data for the new dashboard
 */

// Configuration: Status ID to Label Mapping
const litigationStatusMap = {
    3: "Complaint Filed",
    4: "Demandinator Sent",
    6: "Served",
    7: "Motion to Dismiss",
    8: "Answer",
    9: "At Issue",
    11: "MSJ",
    12: "Fee Petition",
    14: "Judgement",
    15: "Resolved",
    16: "Closed",
    17: "Settlement Dismissed"
};

/**
 * Helper to format numbers as currency
 */
function formatCurrency(val) {
    if (val === "--") return val;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(val);
}

async function fetchDefendants() {
    const tableBody = document.getElementById('defendants-table-body');
    const counter = document.getElementById('defendant-count');

    try {
        // 1. Get status from URL
        const urlParams = new URLSearchParams(window.location.search);
        const filterStatus = urlParams.get('status');

        const response = await fetch('/api/defendants');
        if (!response.ok) throw new Error('Network response was not ok');

        const allData = await response.json();
        let displayData = allData;

        // 2. Filter by the individual defendant's litigation status
        if (filterStatus !== null) {
            displayData = allData.filter(d => String(d.litigation_status) === String(filterStatus));
            
            // 3. UI Feedback: Show "Clear Filter" link if filtered
            if (counter && !document.getElementById('clear-filter-link')) {
                counter.insertAdjacentHTML('afterend', `
                    <a id="clear-filter-link" href="/defendants" class="ml-4 text-[10px] uppercase font-black text-blue-600 hover:text-blue-800 tracking-wider">✕ Clear Filter</a>
                `);
            }
        }

        // 4. Update Counter
        if (counter) counter.innerText = displayData.length;

        // 5. Render rows
        if (displayData.length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="12" class="p-12 text-center text-slate-400 italic">No defendants match this status.</td></tr>
            `;
            return;
        }

        tableBody.innerHTML = displayData.map(d => `
            <tr class="hover:bg-blue-50/30 border-b border-slate-100 text-sm">
                <td class="p-3 font-bold text-slate-800">${d.name}</td>
                <td class="p-3 text-center text-slate-600">${d.number}</td>
                <td class="p-3 text-slate-700">${d.case_name}</td>
                <td class="p-3 font-mono text-xs text-slate-500">${d.case_number}</td>
                <td class="p-3 italic text-slate-600">${d.location}</td>
                <td class="p-3">
                    <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                        ${litigationStatusMap[d.litigation_status] || d.litigation_status}
                    </span>
                </td>
                <td class="p-3 text-slate-600">${d.service_status || 'None'}</td>
                <td class="p-3 text-slate-600">${d.settlement_status || 'None'}</td>
                <td class="p-3 text-center text-slate-600">${d.discovery_status || 'None'}</td>
                <td class="p-3 font-medium text-slate-800">${formatCurrency(d.settlement_amount)}</td>
                <td class="p-3 text-center text-slate-800 font-medium">${formatCurrency(d.lit_val)}</td>
                <td class="p-3 text-center text-slate-800 font-medium">${formatCurrency(d.disc_val)}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Returnalyzer Fetch Error:', error);
        tableBody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-red-500 font-bold">Error loading filtered defendants.</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', fetchDefendants);