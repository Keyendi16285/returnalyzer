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
 * Fetches cases from the Returnalyzer-specific API endpoint
 */
async function fetchCases() {
    const tableBody = document.getElementById('cases-table-body');
    const counter = document.getElementById('case-count');

    try {
        const response = await fetch('/api/cases');
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const cases = await response.json();
        
        // Update Counter
        if (counter) counter.innerText = cases.length;

        if (cases.length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="14" class="p-8 text-center text-slate-500">No records found in the shared database.</td></tr>
            `;
            return;
        }

        // Render Table Rows
        tableBody.innerHTML = cases.map(caseItem => renderCaseRow(caseItem)).join('');

    } catch (error) {
        console.error('Returnalyzer Error:', error);
        tableBody.innerHTML = `
            <tr><td colspan="14" class="p-8 text-center text-red-500 font-bold">Failed to load cases. Ensure the API is running correctly.</td></tr>
        `;
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
            
            <td class="p-3 text-slate-700 font-medium text-center">${c.sum_d_lit}</td>

            <td class="p-3 text-slate-700 font-medium text-center">${formatCurrency(c.discovery_raw)}</td>
            
            <td class="p-3 text-slate-700 font-medium text-center">${c.sum_d_discovery}</td>
            
            <td class="p-3 text-slate-700 font-medium text-center">${formatCurrency(c.casewide_settled)}</td>
            
            <td class="p-3 text-slate-700 font-medium text-center">${formatCurrency(c.casewide_discussion)}</td>

            <td class="p-3 text-slate-700 font-medium text-center">${formatCurrency(c.casewide_total)}</td>
            
            <td class="p-3 bg-blue-50/50 font-bold text-blue-900">${formatCurrency(c.gross_value)}</td>
            
            <td class="p-3 text-red-600 font-medium">${formatCurrency(c.costs)}</td>
            
            <td class="p-3 bg-green-50/50 font-bold text-green-800">${formatCurrency(c.net_value)}</td>
        </tr>
    `;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', fetchCases);