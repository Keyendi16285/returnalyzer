/**
 * Returnalyzer - Cases Logic
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
 * Main Fetch Function
 * Orchestrates API calls and table rendering
 */
async function fetchCases() {
    const tableBody = document.getElementById('cases-table-body');
    const counter = document.getElementById('case-count');

    try {
        // 1. Parse URL Parameters
        const urlParams = new URLSearchParams(window.location.search);
        const filterStatus = urlParams.get('status');
        const filterClass = urlParams.get('case_class') || 'ALL'; // Default to ALL

        // 2. Sync Filter Button UI
        updateFilterButtonUI(filterClass);

        // 3. Construct API URL with Case Class filter
        const apiUrl = filterClass === 'ALL' 
            ? '/api/cases' 
            : `/api/cases?case_class=${filterClass}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const allCases = await response.json();
        let displayCases = allCases;

        // 4. Local Status Filtering (to support Dashboard drill-downs)
        if (filterStatus !== null) {
            displayCases = allCases.filter(c => String(c.status) === String(filterStatus));
            
            // Optional: Update page title/badge to show which status is filtered
            const statusLabel = litigationStatusMap[filterStatus] || `Status ${filterStatus}`;
            console.log(`Filtering for Status: ${statusLabel}`);
        }

        // 5. Update UI
        if (counter) counter.innerText = displayCases.length;
        
        tableBody.innerHTML = displayCases.length === 0 
            ? `<tr><td colspan="16" class="p-12 text-center text-slate-400 italic">No cases found matching these filters.</td></tr>`
            : displayCases.map(caseItem => renderCaseRow(caseItem)).join('');

    } catch (error) {
        console.error('Returnalyzer Fetch Error:', error);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="16" class="p-8 text-center text-red-500 font-bold">Error loading cases. Please check console.</td></tr>`;
        }
    }
}

/**
 * Helper: Triggers page reload with new Case Class filter
 */
window.filterByClass = function(className) {
    const url = new URL(window.location);
    url.searchParams.set('case_class', className);
    
    // Reset status filter when changing class to avoid empty results
    url.searchParams.delete('status'); 
    
    window.location.href = url.toString();
};

/**
 * Helper: Updates CSS classes for the filter buttons
 */
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

/**
 * Generates HTML for a single table row matching the spreadsheet image
 */
function renderCaseRow(c) {
    const statusLabel = litigationStatusMap[c.status] || `Status ${c.status}`;

    return `
        <tr class="hover:bg-blue-50/30 transition-colors border-b border-slate-100 text-sm">
            <td class="p-3 font-bold text-slate-800">${c.name}</td>
            
            <td class="p-3 text-slate-600 font-mono text-xs">${c.number}</td>
            
            <td class="p-3 text-slate-600 italic">${c.location}</td>
            
            <td class="p-3 text-center text-slate-700">${c.defendants}</td>
            
            <td class="p-3">
                <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                    ${statusLabel}
                </span>
            </td>
            
            <td class="p-3 text-center text-slate-600">${c.discovery_ok}</td>
            
            <td class="p-3 text-slate-700 font-medium text-center">${formatCurrency(c.lit_status_raw)}</td>
            
            <td class="p-3 text-slate-700 font-medium text-center">${formatCurrency(c.sum_d_lit)}</td>

            <td class="p-3 text-slate-700 font-medium text-center">${formatCurrency(c.discovery_raw)}</td>
            
            <td class="p-3 text-slate-700 font-medium text-center">${formatCurrency(c.sum_d_discovery)}</td>
            
            <td class="p-3 text-slate-700 font-medium text-center">${formatCurrency(c.casewide_settled)}</td>
            
            <td class="p-3 text-slate-700 font-medium text-center">${formatCurrency(c.casewide_discussion)}</td>

            <td class="p-3 text-slate-700 font-medium text-center">${formatCurrency(c.sum_case_values)}</td>
            
            <td class="p-3 bg-blue-50/50 font-bold text-blue-900">${formatCurrency(c.gross_value)}</td>
            
            <td class="p-3 text-red-600 font-medium">${formatCurrency(c.costs)}</td>
            
            <td class="p-3 bg-green-50/50 font-bold text-green-800">${formatCurrency(c.net_value)}</td>
        </tr>
    `;
}

/**
 * Global Hotkeys
 */
document.addEventListener('keydown', function(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    const key = event.key.toLowerCase();
    if (key === 'c') window.location.href = '/cases';
    if (key === 'd') window.location.href = '/defendants';
    if (key === 'v') window.location.href = '/drivers';
    if (key === 'h') window.location.href = '/';
});

// Initialize on load
document.addEventListener('DOMContentLoaded', fetchCases);