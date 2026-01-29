// wwwroot/js/nav.js
(() => {
    const SELECTORS = {
        sidebar: '#appSidebar, .app-sidebar',
        overlay: '.nav-overlay',
        toggle: '[data-nav-toggle]',
        closeAny: '[data-nav-close]'
    };

    function getSidebar() { return document.querySelector(SELECTORS.sidebar); }
    function getOverlay() { return document.querySelector(SELECTORS.overlay); }
    function getToggleBtn() { return document.querySelector(SELECTORS.toggle); }

    function setOpen(open) {
        const aside = getSidebar();
        const overlay = getOverlay();
        const btn = getToggleBtn();
        if (!aside || !overlay) return;
        aside.classList.toggle('open', open);
        overlay.classList.toggle('show', open);
        if (btn) btn.setAttribute('aria-expanded', String(open));

        document.documentElement.classList.toggle('nav-open', open); // NEW
    }

    // Click: hamburger opens/closes
    document.addEventListener('click', (e) => {
        const toggle = e.target.closest(SELECTORS.toggle);
        if (toggle) {
            const isOpen = getSidebar()?.classList.contains('open');
            setOpen(!isOpen);
        }
    }, true);

    // Click: close on overlay, X button, or any element with data-nav-close
    document.addEventListener('click', (e) => {
        if (e.target.closest(SELECTORS.closeAny)) setOpen(false);
    }, true);

    // Esc closes
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setOpen(false);
    });

    // If the sidebar isn't in the DOM yet, watch for it
    function ensureWired() {
        const aside = getSidebar();
        const btn = getToggleBtn();
        if (aside && btn && !btn.hasAttribute('data-nav-ready')) {
            // set initial ARIA
            btn.setAttribute('aria-expanded', 'false');
            btn.setAttribute('data-nav-ready', 'true');
        }
    }

    // Run now, then observe changes (for Blazor SSR/hydration)
    ensureWired();

    const obs = new MutationObserver(() => ensureWired());
    obs.observe(document.documentElement, { childList: true, subtree: true });

    // Expose a tiny debugger (optional)
    window.__navdbg = () => ({
        sidebar: !!getSidebar(),
        overlay: !!getOverlay(),
        toggle: !!getToggleBtn(),
        open: !!getSidebar()?.classList.contains('open')
    });
})();
