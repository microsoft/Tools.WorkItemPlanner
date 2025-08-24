// Simple first run guided tooltip experience
// Stores completion flag in localStorage so user sees it only once unless they reset manually

(function () {
    const STORAGE_KEY = 'wip_first_run_completed_v1';
    const ALWAYS_SHOW_TOUR = true; // Force showing tour on every load
    if (typeof Storage === 'undefined') return;

    function hasCompleted() {
        if (ALWAYS_SHOW_TOUR) return false;
        return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    function setCompleted() {
        if (ALWAYS_SHOW_TOUR) return; // Do not persist completion
        localStorage.setItem(STORAGE_KEY, 'true');
    }

    // Public API (global) so main.js can trigger once data/population done
    window.FirstRunGuide = {
        maybeStart: function () {
            // Always show (ignores stored completion when ALWAYS_SHOW_TOUR)
            setTimeout(runTour, 800);
        },
        reset: function () { localStorage.removeItem(STORAGE_KEY); }
    };

    function buildSteps() {
        // Each step: selector, title, body
        return [
            {
                selector: '#organization-select',
                title: 'Pick Organization',
                body: 'Start by choosing your Azure DevOps organization. (<i>The list is filtered to those you can access.</i>)'
            },
            {
                selector: '#project-select',
                title: 'Select Project',
                body: 'Next choose your project. (<i>The list is filtered to those you can access.</i>)'
            },
            {
                selector: '#team-select',
                title: 'Choose Team',
                body: 'Select your Team to load Iterations & Area Paths.'
            },
            {
                selector: '#feature-id',
                title: 'Parent Work Item',
                body: 'Enter the existing parent Work Item (e.g. Feature) under which new Work Items will be created.'
            },
            {
                selector: '#assigned-to-select',
                title: 'Assignee',
                body: 'Pick who will be assigned to the created Work Items.'
            },
            {
                selector: '#work-item-type-select',
                title: 'Work Item Type',
                body: 'Select the type for new Work Items (e.g. User Story, Bug).'
            },
            {
                selector: '#deliverable-prefix',
                title: 'Title Prefix (Optional)',
                body: 'Enter a prefix that will automatically prepend each new Work Item title (e.g. Sprint Tag, Feature Acronym). Leave blank if not needed.'
            },
            {
                // Use :first-of-type (':first' is invalid in querySelector)
                selector: '#deliverables-container .deliverable-item:first-of-type .deliverable-title',
                title: 'New Work Item Title',
                body: 'Provide a clear concise title. Add more Work Items with the \'+ Work Item\' button.'
            },
            {
                selector: '#deliverables-container .deliverable-item:first-of-type .task-item:first-of-type .task-title',
                title: 'Tasks',
                body: 'Add Tasks under this Work Item.'
            },
            {
                selector: '#add-deliverable',
                title: 'Add More Work Items',
                body: 'Use this to add more Work Items.'
            },
            {
                selector: 'button[type="submit"]',
                title: 'Save to Azure DevOps',
                body: 'When ready, submit to create the Work Items in Azure DevOps.'
            }
        ];
    }

    function runTour() {
        const steps = buildSteps();
        let current = 0;

        // Skip if any critical first element missing
        if (!document.querySelector('#organization-select')) return;

        function showStep(index) {
            cleanup();
            if (index >= steps.length) {
                setCompleted();
                return;
            }
            const step = steps[index];
            const el = document.querySelector(step.selector);
            if (!el) {
                // If element not present (maybe not enabled yet) retry shortly a limited number of times
                if (step._retries === undefined) step._retries = 0;
                if (step._retries < 10) {
                    step._retries++;
                    setTimeout(() => showStep(index), 400);
                } else {
                    // Skip this step
                    showStep(index + 1);
                }
                return;
            }
            // If this is a Select2-enhanced select, use the visible container instead of the hidden original element.
            let highlightEl = el;
            if (el.tagName === 'SELECT' && el.classList.contains('select2-hidden-accessible')) {
                const maybeContainer = el.nextElementSibling; // Select2 injects the container right after the select
                if (maybeContainer && maybeContainer.classList.contains('select2')) {
                    highlightEl = maybeContainer;
                }
            }
            const rect = highlightEl.getBoundingClientRect();
            // Create overlay & tooltip
            const overlay = document.createElement('div');
            overlay.className = 'frg-overlay';
            const tooltip = document.createElement('div');
            tooltip.className = 'frg-tooltip';
            tooltip.innerHTML = '<h4>' + step.title + '</h4><p>' + step.body + '</p>' +
                '<div class="frg-actions">' +
                (index > 0 ? '<button type="button" class="frg-btn frg-prev">Back</button>' : '') +
                '<button type="button" class="frg-btn frg-next">' + (index === steps.length - 1 ? 'Done' : 'Next') + '</button>' +
                '<button type="button" class="frg-skip" title="Skip">Skip</button>' +
                '</div>';

            document.body.appendChild(overlay);
            document.body.appendChild(tooltip);

            // Highlight target
            highlightEl.classList.add('frg-highlight');

            positionTooltip(tooltip, rect);

            tooltip.querySelector('.frg-next').addEventListener('click', () => { current++; showStep(current); });
            const prevBtn = tooltip.querySelector('.frg-prev');
            if (prevBtn) prevBtn.addEventListener('click', () => { current--; showStep(current); });
            tooltip.querySelector('.frg-skip').addEventListener('click', () => { setCompleted(); cleanup(true); });

            // Scroll into view if needed
            highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        function positionTooltip(tooltip, rect) {
            const margin = 12;
            let top = rect.bottom + window.scrollY + margin;
            let left = rect.left + window.scrollX;
            // If off right edge, adjust
            if (left + tooltip.offsetWidth > window.innerWidth - 20) {
                left = window.innerWidth - tooltip.offsetWidth - 20;
            }
            // If off bottom, place above
            if (top + tooltip.offsetHeight > window.scrollY + window.innerHeight - 20) {
                top = rect.top + window.scrollY - tooltip.offsetHeight - margin;
            }
            if (top < window.scrollY) {
                top = window.scrollY + 10;
            }
            tooltip.style.top = top + 'px';
            tooltip.style.left = left + 'px';
        }

        function cleanup(end) {
            document.querySelectorAll('.frg-overlay, .frg-tooltip').forEach(n => n.remove());
            document.querySelectorAll('.frg-highlight').forEach(n => n.classList.remove('frg-highlight'));
            if (end) {
                // Nothing else
            }
        }

        window.addEventListener('resize', () => {
            const tt = document.querySelector('.frg-tooltip');
            const hl = document.querySelector('.frg-highlight');
            if (tt && hl) {
                positionTooltip(tt, hl.getBoundingClientRect());
            }
        });

        showStep(current);
    }
})();
