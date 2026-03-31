// Map of Status IDs to Names (Ensure these match your database exactly)
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

const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(val);
};

async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();

        // 1. Set Financials
        document.getElementById('disposed-val').textContent = formatCurrency(data.financials.disposed);
        document.getElementById('pending-val').textContent = formatCurrency(data.financials.pending);

        // 2. Set Totals
        document.getElementById('case-total').textContent = `${data.cases.total} TOTAL CASES`;
        document.getElementById('def-total').textContent = `${data.defendants.total} TOTAL DEFENDANTS`;

        // 3. Render Case Grid
        const caseGrid = document.getElementById('case-grid');
        caseGrid.innerHTML = Object.entries(data.cases.breakdown).map(([id, count]) => `
            <a href="/cases?status=${id}" class="stat-card bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400">
                <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">${statusNames[id] || 'Status ' + id}</p>
                <p class="text-2xl font-black text-slate-800">${count}</p>
            </a>
        `).join('');

        // 4. Render Defendant Grid
        const defGrid = document.getElementById('def-grid');
        defGrid.innerHTML = Object.entries(data.defendants.breakdown).map(([id, count]) => `
            <a href="/defendants?status=${id}" class="stat-card bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-green-400">
                <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">${statusNames[id] || 'Status ' + id}</p>
                <p class="text-2xl font-black text-slate-800">${count}</p>
            </a>
        `).join('');

    } catch (error) {
        console.error("Dashboard Load Error:", error);
    }
}

/**
 * Returnalyzer Global Hotkeys
 * C = Cases, D = Defendants, V = Values/Drivers, H = Home
 */
document.addEventListener('keydown', function(event) {
    // Prevent shortcuts from triggering if you are typing in a search box or input
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    const key = event.key.toLowerCase();

    switch(key) {
        case 'c':
            window.location.href = '/cases';
            break;
        case 'd':
            window.location.href = '/defendants';
            break;
        case 'v':
            window.location.href = '/drivers';
            break;
        case 'h':
            window.location.href = '/';
            break;
    }
});

const CASETRACKER_URL = "https://casetracker.massfoiac.com"; // Change to your actual Casetracker URL

(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    // 1. If Casetracker just sent us back with a token
    if (tokenFromUrl) {
        localStorage.setItem('access_token', tokenFromUrl);
        // Clean the URL so the token isn't sitting in the address bar
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Check if we have a token now
    const token = localStorage.getItem('access_token');

    if (!token) {
        // Redirect to Casetracker with a redirect_url parameter 
        // so Casetracker knows where to send the user after login
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `${CASETRACKER_URL}?redirect_url=${returnUrl}`;
    }
})();

document.addEventListener('DOMContentLoaded', loadDashboard);