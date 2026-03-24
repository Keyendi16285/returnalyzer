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

async function fetchDefendants() {
    const tableBody = document.getElementById('defendants-table-body');
    const counter = document.getElementById('defendant-count');

    try {
        const response = await fetch('/api/defendants');

        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();

        // --- UPDATE COUNTER ---
        if (counter) {
            counter.innerText = data.length;
        }

        if (data.length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="12" class="p-8 text-center text-slate-500">No defendant records found.</td></tr>
            `;
            return;
        }

        // Render Table Rows
        tableBody.innerHTML = data.map(d => `
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
                <td class="p-3 font-medium text-slate-800">$${d.settlement_amount.toLocaleString()}</td>
                <td class="p-3 text-center text-slate-400">${d.lit_val}</td>
                <td class="p-3 text-center text-slate-800 font-medium">
                ${typeof d.disc_val === 'number' ? '$' + d.disc_val.toLocaleString() : d.disc_val}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Returnalyzer Error:', error);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr><td colspan="12" class="p-8 text-center text-red-500 font-bold">Failed to load defendants.</td></tr>
            `;
        }
    }
}

document.addEventListener('DOMContentLoaded', fetchDefendants);