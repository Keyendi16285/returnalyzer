/**
 * Returnalyzer - Dashboard Logic
 * High-performance dashboard with dynamic Case Class filtering.
 */

const statusNames = {
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

// Global State
let currentClass = 'ALL';

const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(val || 0);
};

/**
 * 1. Load Data from Backend
 * Fetches statistics filtered by the selected Case Class.
 */
async function loadDashboard() {
    try {
        // Construct URL with the class filter
        const url = currentClass === 'ALL' 
            ? '/api/dashboard/stats' 
            : `/api/dashboard/stats?case_class=${currentClass}`;

        const response = await fetch(url);
        const data = await response.json();

        updateUI(data);
    } catch (error) {
        console.error("Dashboard Load Error:", error);
    }
}

/**
 * 2. Update UI Elements
 * Refreshes all numbers and grids based on the API response.
 */
function updateUI(data) {
    // A. Update Financials (Pending/Disposed)
    document.getElementById('disposed-val').textContent = formatCurrency(data.financials.disposed);
    document.getElementById('pending-val').textContent = formatCurrency(data.financials.pending);

    // B. Update Header Totals
    document.getElementById('case-total').textContent = `${data.cases.total} TOTAL CASES`;
    document.getElementById('def-total').textContent = `${data.defendants.total} TOTAL DEFENDANTS`;

    // C. Render Grids
    renderGrid('case-grid', data.cases.breakdown, 'blue', '/cases');
    renderGrid('def-grid', data.defendants.breakdown, 'green', '/defendants');

    // D. Update Bottom "Quick Jump" and Top "View All" Links
    const classQuery = currentClass !== 'ALL' ? `?case_class=${currentClass}` : '';
    
    // Update the "View Cases" and "View Defendants" small links if they exist in your header
    const viewCasesLink = document.getElementById('view-cases-nav');
    const viewDefsLink = document.getElementById('view-defs-nav');
    if (viewCasesLink) viewCasesLink.href = `/cases${classQuery}`;
    if (viewDefsLink) viewDefsLink.href = `/defendants${classQuery}`;
}

/**
 * 3. Render Status Grids
 * Generates the clickable cards for Cases and Defendants.
 */
function renderGrid(containerId, breakdown, color, baseUrl) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Sort by status ID numerically
    const sortedEntries = Object.entries(breakdown).sort((a, b) => a[0] - b[0]);

    const classQuery = currentClass !== 'ALL' ? `&case_class=${currentClass}` : '';

    container.innerHTML = sortedEntries.map(([id, count]) => `
        <a href="${baseUrl}?status=${id}${classQuery}" 
           class="stat-card bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-${color}-400 transition-all">
            <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">${statusNames[id] || 'Status ' + id}</p>
            <p class="text-2xl font-black text-slate-800">${count}</p>
        </a>
    `).join('');
}

/**
 * 4. Global Class Filter Trigger
 * Attached to the window so HTML onclick="setGlobalClass('JS')" works.
 */
window.setGlobalClass = function(className) {
    currentClass = className;

    // Update Button Styling
    document.querySelectorAll('.class-filter-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('text-slate-400', 'hover:bg-slate-100');
    });
    
    const activeBtn = document.getElementById(`btn-class-${className.toLowerCase()}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-blue-600', 'text-white');
        activeBtn.classList.remove('text-slate-400', 'hover:bg-slate-100');
    }

    // Re-fetch data for the selected class
    loadDashboard();
};

/**
 * 5. Global Hotkeys
 */
document.addEventListener('keydown', function(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    
    const key = event.key.toLowerCase();
    if (key === 'c') window.location.href = '/cases';
    if (key === 'd') window.location.href = '/defendants';
    if (key === 'v') window.location.href = '/drivers';
    if (key === 'h') window.location.href = '/';
});

// Initial Init
document.addEventListener('DOMContentLoaded', loadDashboard);