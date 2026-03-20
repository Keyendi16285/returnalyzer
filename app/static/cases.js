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
        // This should point to your new FastAPI route in the Returnalyzer repo
        const response = await fetch('/api/cases');
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const cases = await response.json();
        
        // Update Counter
        counter.innerText = cases.length;

        if (cases.length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="7" class="p-8 text-center text-slate-500">No records found in the shared database.</td></tr>
            `;
            return;
        }

        // Render Table Rows
        tableBody.innerHTML = cases.map(caseItem => renderCaseRow(caseItem)).join('');

    } catch (error) {
        console.error('Returnalyzer Error:', error);
        tableBody.innerHTML = `
            <tr><td colspan="7" class="p-8 text-center text-red-500 font-bold">Failed to load cases. Ensure the API is running on Port 8001.</td></tr>
        `;
    }
}

/**
 * Generates HTML for a single table row
 */
function renderCaseRow(c) {
    const statusLabel = litigationStatusMap[c.status] || `Status ${c.status}`;
    
    return `
        <tr class="hover:bg-blue-50/50 transition-colors group border-b border-slate-50">
            <td class="p-4 text-slate-400 font-mono text-xs">${c.id}</td>
            <td class="p-4">
                <div class="font-bold text-slate-800 group-hover:text-blue-700">${c.name}</div>
            </td>
            <td class="p-4 text-slate-600 font-medium">${c.number || '---'}</td>
            <td class="p-4">
                <span class="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                    ${statusLabel}
                </span>
            </td>
            <td class="p-4 text-slate-600 text-sm italic">${c.location}</td>
            <td class="p-4 text-slate-600 text-sm font-medium">${c.class || 'N/A'}</td>
            <td class="p-4 text-slate-500 text-sm uppercase tracking-tighter">${c.type || 'N/A'}</td>
        </tr>
    `;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', fetchCases);