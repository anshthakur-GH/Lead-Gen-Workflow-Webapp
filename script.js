// State management
let currentView = 'new-search';
let leadsData = [];
let historyData = [];

// Elements
const navNewSearch = document.getElementById('nav-new-search');
const navOldLeads = document.getElementById('nav-old-leads');
const viewNewSearch = document.getElementById('view-new-search');
const viewOldLeads = document.getElementById('view-old-leads');

const leadForm = document.getElementById('lead-form');
const loadingState = document.getElementById('loading-state');
const resultsSection = document.getElementById('results-section');
const resultsTbody = document.getElementById('results-tbody');
const resultsCount = document.getElementById('results-count');

const historySearch = document.getElementById('history-search');
const historyContent = document.getElementById('history-content');
const historyEmpty = document.getElementById('history-empty');

const detailsModal = document.getElementById('details-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalBody = document.getElementById('modal-body');

const errorBanner = document.getElementById('error-banner');
const errorMessage = document.getElementById('error-message');

// Navigation
navNewSearch.addEventListener('click', () => switchView('new-search'));
navOldLeads.addEventListener('click', () => switchView('old-leads'));

function switchView(view) {
    if (currentView === view) return;
    
    // Update Nav
    navNewSearch.classList.toggle('active', view === 'new-search');
    navOldLeads.classList.toggle('active', view === 'old-leads');
    
    // Update View Containers with Fade
    const currentContainer = document.getElementById(`view-${currentView}`);
    const nextContainer = document.getElementById(`view-${view}`);
    
    currentContainer.classList.remove('active');
    setTimeout(() => {
        currentContainer.style.display = 'none';
        nextContainer.style.display = 'block';
        setTimeout(() => {
            nextContainer.classList.add('active');
        }, 50);
    }, 500);
    
    currentView = view;
    
    if (view === 'old-leads') {
        fetchHistory();
    }
}

// Tag Input Component
class TagInput {
    constructor(containerId, hiddenInputName, options = []) {
        this.container = document.getElementById(containerId);
        this.input = this.container.querySelector('.tag-input');
        this.suggestionsList = this.container.querySelector('.suggestions-list');
        this.hiddenInput = document.querySelector(`input[name="${hiddenInputName}"]`);
        this.options = options;
        this.tags = [];

        this.init();
    }

    init() {
        this.input.addEventListener('focus', () => this.showSuggestions());
        this.input.addEventListener('input', () => this.filterSuggestions());
        
        // Handle custom input
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const value = this.input.value.trim().replace(/,$/, '');
                if (value) this.addTag(value);
            }
        });

        // Close suggestions on click outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideSuggestions();
            }
        });

        this.renderSuggestions();
    }

    showSuggestions() {
        this.suggestionsList.classList.add('active');
        this.renderSuggestions();
    }

    hideSuggestions() {
        this.suggestionsList.classList.remove('active');
    }

    filterSuggestions() {
        const query = this.input.value.toLowerCase();
        const filtered = this.options.filter(opt => opt.toLowerCase().includes(query));
        this.renderSuggestions(filtered);
    }

    renderSuggestions(filteredOptions = this.options) {
        this.suggestionsList.innerHTML = '';
        filteredOptions.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            if (this.tags.includes(opt)) item.classList.add('selected');
            item.textContent = opt;
            item.onclick = () => this.addTag(opt);
            this.suggestionsList.appendChild(item);
        });
    }

    addTag(value) {
        if (this.tags.includes(value)) {
            this.input.value = '';
            this.hideSuggestions();
            return;
        }
        
        this.tags.push(value);
        this.renderTags();
        this.updateHiddenInput();
        this.input.value = '';
        this.hideSuggestions();
    }

    removeTag(value) {
        this.tags = this.tags.filter(t => t !== value);
        this.renderTags();
        this.updateHiddenInput();
    }

    renderTags() {
        // Remove existing tags from UI
        this.container.querySelectorAll('.tag').forEach(t => t.remove());
        
        // Add current tags before the input
        this.tags.forEach(tag => {
            const tagEl = document.createElement('div');
            tagEl.className = 'tag';
            tagEl.innerHTML = `
                ${tag}
                <span class="tag-remove">&times;</span>
            `;
            tagEl.querySelector('.tag-remove').onclick = (e) => {
                e.stopPropagation();
                this.removeTag(tag);
            };
            this.container.insertBefore(tagEl, this.input);
        });
    }

    updateHiddenInput() {
        this.hiddenInput.value = this.tags.join(', ');
        // Trigger validation check
        const group = this.container.closest('.form-group');
        if (this.tags.length > 0) {
            this.container.classList.remove('error');
        }
    }
}

// Initialize Tag Inputs
const tagInputs = {
    geographies: new TagInput('container-geographies', 'Target Geographies', ['EU', 'US']),
    industries: new TagInput('container-industries', 'Target Industries', 
        ['SaaS', 'Marketing Agency', 'Finance', 'Fintech', 'E-commerce', 'Healthcare', 'Legal', 'Real Estate', 'Consulting', 'EdTech', 'Logistics']),
    jobRoles: new TagInput('container-job-roles', 'Job Role / Designation', 
        ['Directors', 'Presidents', 'Vice President', 'CXO', 'CFO', 'CEO', 'Plant Head', 'Strategy Head', 'Business Development Head', 'General Manager', 'Managing Partner'])
};

// Form Submission
leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validation
    const formData = new FormData(leadForm);
    let isValid = true;
    
    // Validate standard selects and TagInputs
    ['Target Geographies', 'Target Industries', 'Company Size (Employees)', 'Job Role / Designation', 'Contact Email Availability'].forEach(name => {
        const value = formData.get(name);
        const field = leadForm.querySelector(`[name="${name}"]`);
        
        if (!value) {
            isValid = false;
            if (field.type === 'hidden') {
                field.previousElementSibling.classList.add('error');
            } else {
                field.classList.add('error');
            }
        } else {
            if (field.type === 'hidden') {
                field.previousElementSibling.classList.remove('error');
            } else {
                field.classList.remove('error');
            }
        }
    });
    
    if (!isValid) return;
    
    // Show Loading State
    leadForm.style.display = 'none';
    loadingState.style.display = 'flex';
    document.querySelector('.card-subtitle').style.display = 'none';
    
    // POST to backend proxy (Parallel)
    const jsonBody = Object.fromEntries(formData.entries());
    const fetchPromise = fetch('/api/source-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonBody)
    });
    
    // Start 25s timer
    const timerPromise = new Promise(resolve => setTimeout(resolve, 25000));
    
    try {
        await Promise.all([fetchPromise, timerPromise]);
        
        // After 25s and fetch complete, call backend
        const response = await fetch('/api/leads/today');
        if (!response.ok) throw new Error('Failed to fetch today\'s leads');
        
        leadsData = await response.json();
        renderResults();
        
    } catch (error) {
        showError(`Error sourcing leads: ${error.message}`);
        // Reset view if failed
        leadForm.style.display = 'block';
        loadingState.style.display = 'none';
        document.querySelector('.card-subtitle').style.display = 'block';
    }
});

// Render Results Table
function renderResults() {
    loadingState.style.display = 'none';
    resultsSection.style.display = 'block';
    
    resultsCount.textContent = `${leadsData.length} leads sourced`;
    resultsTbody.innerHTML = '';
    
    leadsData.forEach(lead => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${lead.full_name}</td>
            <td>${lead.title}</td>
            <td>${lead.company_name}</td>
            <td>${lead.email || 'N/A'}</td>
            <td><span class="badge badge-${lead.status}">${lead.status}</span></td>
            <td>${lead.seniority}</td>
            <td>${lead.country}</td>
            <td><a href="${lead.linkedin_url}" target="_blank" class="link">Link</a></td>
            <td><button class="btn-sm btn-view" onclick="viewDetails('${lead.lead_id}')">View Details</button></td>
        `;
        resultsTbody.appendChild(tr);
    });
}

// Reset New Search
document.getElementById('btn-new-search-reset').addEventListener('click', () => {
    resultsSection.style.display = 'none';
    leadForm.style.display = 'block';
    document.querySelector('.card-subtitle').style.display = 'block';
    leadForm.reset();
    
    // Clear TagInputs
    Object.values(tagInputs).forEach(ti => {
        ti.tags = [];
        ti.renderTags();
        ti.updateHiddenInput();
    });
});

// History Logic
async function fetchHistory() {
    try {
        const response = await fetch('/api/leads?sort=sourced_at&order=desc');
        if (!response.ok) throw new Error('Failed to fetch lead history');
        
        historyData = await response.json();
        renderHistory();
    } catch (error) {
        showError(`Error fetching history: ${error.message}`);
    }
}

function renderHistory(filter = '') {
    historyContent.innerHTML = '';
    
    const filteredLeads = historyData.filter(lead => 
        lead.full_name.toLowerCase().includes(filter.toLowerCase()) || 
        lead.email.toLowerCase().includes(filter.toLowerCase())
    );
    
    if (filteredLeads.length === 0) {
        historyEmpty.style.display = 'block';
        return;
    } else {
        historyEmpty.style.display = 'none';
    }
    
    // Group by date
    const groups = {};
    filteredLeads.forEach(lead => {
        const dateStr = new Date(lead.sourced_at).toLocaleDateString(undefined, { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(lead);
    });
    
    Object.keys(groups).forEach(date => {
        const group = groups[date];
        const section = document.createElement('div');
        section.className = 'date-section';
        
        section.innerHTML = `
            <div class="date-header active" onclick="toggleDateSection(this)">
                <span>${date} (${group.length} leads)</span>
                <span class="arrow-icon">▼</span>
            </div>
            <div class="date-content active">
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>LinkedIn</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.map(lead => `
                                <tr>
                                    <td>${lead.full_name}</td>
                                    <td>${lead.email || 'N/A'}</td>
                                    <td><a href="${lead.linkedin_url}" target="_blank" class="link">Link</a></td>
                                    <td><button class="btn-sm btn-view" onclick="viewDetails('${lead.lead_id}', true)">View Details</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        historyContent.appendChild(section);
    });
}

function toggleDateSection(header) {
    header.classList.toggle('active');
    const content = header.nextElementSibling;
    content.classList.toggle('active');
}

// Modal Logic
function viewDetails(leadId, fromHistory = false) {
    const dataSource = fromHistory ? historyData : leadsData;
    const lead = dataSource.find(l => l.lead_id === leadId);
    
    if (!lead) return;
    
    modalBody.innerHTML = `
        <div class="details-grid">
            ${renderDetailItem('Lead ID', lead.lead_id)}
            ${renderDetailItem('First Name', lead.first_name)}
            ${renderDetailItem('Last Name', lead.last_name)}
            ${renderDetailItem('Full Name', lead.full_name)}
            ${renderDetailItem('Email', lead.email)}
            ${renderDetailItem('Email Status', lead.email_status)}
            ${renderDetailItem('Title', lead.title)}
            ${renderDetailItem('Seniority', lead.seniority)}
            ${renderDetailItem('LinkedIn', `<a href="${lead.linkedin_url}" target="_blank" class="link">${lead.linkedin_url}</a>`)}
            ${renderDetailItem('Website', `<a href="${lead.company_website}" target="_blank" class="link">${lead.company_website}</a>`)}
            ${renderDetailItem('City', lead.city)}
            ${renderDetailItem('State', lead.state)}
            ${renderDetailItem('Country', lead.country)}
            ${renderDetailItem('Company Name', lead.company_name)}
            ${renderDetailItem('Company Industry', lead.company_industry)}
            ${renderDetailItem('Company Size', lead.company_size)}
            ${renderDetailItem('ICP Geography', lead.icp_geography)}
            ${renderDetailItem('ICP Industry', lead.icp_industry)}
            ${renderDetailItem('ICP Size', lead.icp_company_size)}
            ${renderDetailItem('ICP Role', lead.icp_job_role)}
            ${renderDetailItem('ICP Email Filter', lead.icp_email_filter)}
            ${renderDetailItem('Sourced At', new Date(lead.sourced_at).toLocaleString())}
            <div class="detail-item">
                <label>Status</label>
                <span class="badge badge-${lead.status}">${lead.status}</span>
            </div>
        </div>
        <div style="margin-top: 1.5rem;">
            ${renderPillList('Departments', lead.departments)}
            ${renderPillList('Sub-departments', lead.subdepartments)}
            ${renderPillList('Functions', lead.functions)}
        </div>
    `;
    
    detailsModal.style.display = 'flex';
}

function renderDetailItem(label, value) {
    return `
        <div class="detail-item">
            <label>${label}</label>
            <div class="detail-value">${value || 'N/A'}</div>
        </div>
    `;
}

function renderPillList(label, items) {
    if (!items || !items.length) return '';
    return `
        <div style="margin-bottom: 1rem;">
            <label style="color: var(--muted-text); font-size: 0.85rem; display: block; margin-bottom: 0.5rem;">${label}</label>
            <div class="pill-container">
                ${items.map(item => `<span class="pill">${item}</span>`).join('')}
            </div>
        </div>
    `;
}

// Close Modal
modalCloseBtn.onclick = () => detailsModal.style.display = 'none';
window.onclick = (e) => { if (e.target == detailsModal) detailsModal.style.display = 'none'; };
window.onkeydown = (e) => { if (e.key === 'Escape') detailsModal.style.display = 'none'; };

// Search filter
historySearch.addEventListener('input', (e) => {
    renderHistory(e.target.value);
});

// Error handling
function showError(msg) {
    errorMessage.textContent = msg;
    errorBanner.style.display = 'flex';
    setTimeout(hideError, 5000);
}

function hideError() {
    errorBanner.style.display = 'none';
}

// Initial view check
window.addEventListener('load', () => {
    // History check if needed
});

// Global assignment for onclick handlers
window.viewDetails = viewDetails;
window.toggleDateSection = toggleDateSection;
window.hideError = hideError;
