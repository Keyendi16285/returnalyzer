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
        const urlParams = new URLSearchParams(window.location.search);
        const filterStatus = urlParams.get('status');
        const filterClass = urlParams.get('case_class') || 'ALL';

        updateFilterButtonUI(filterClass);

        const apiUrl = filterClass === 'ALL' 
            ? '/api/defendants' 
            : `/api/defendants?case_class=${filterClass}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');

        const allData = await response.json();
        let displayData = allData;

        // Local status filter (for dashboard drill-down)
        if (filterStatus !== null) {
            displayData = allData.filter(d => String(d.litigation_status_id) === String(filterStatus));
        }

        if (counter) counter.innerText = displayData.length;

        tableBody.innerHTML = displayData.map(d => `
            <tr class="hover:bg-blue-50/30 border-b border-slate-100 text-sm">
                <td class="p-3 text-center text-slate-600">${d.id}</td>
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

window.filterByClass = function(className) {
    const url = new URL(window.location);
    url.searchParams.set('case_class', className);
    url.searchParams.delete('status'); 
    window.location.href = url.toString();
};

function updateFilterButtonUI(activeClass) {
    document.querySelectorAll('.class-filter-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('text-slate-400');
    });
    const activeBtn = document.getElementById(`btn-class-${activeClass.toLowerCase()}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-blue-600', 'text-white');
        activeBtn.classList.remove('text-slate-400');
    }
}

document.addEventListener('keydown', function(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    const key = event.key.toLowerCase();
    if (key === 'c') window.location.href = '/cases';
    if (key === 'd') window.location.href = '/defendants';
    if (key === 'v') window.location.href = '/drivers';
    if (key === 'h') window.location.href = '/';
});

document.addEventListener('DOMContentLoaded', fetchDefendants);