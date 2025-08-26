// wwwroot/js/site.js
(function () {
    // Mark that JS is active (lets CSS apply reveal only when JS works)
    document.documentElement.classList.add("js");

    const api = {
        getTheme() {
            try {
                return localStorage.getItem("theme")
                    || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
            } catch { return "light"; }
        },
        setTheme(t) {
            try { localStorage.setItem("theme", t); } catch { }
            document.documentElement.dataset.theme = t;
        },
        initTheme() { api.setTheme(api.getTheme()); },

        animateCount(selector, to, duration = 900) {
            const el = document.querySelector(selector);
            if (!el) return;
            const from = parseFloat(el.textContent || "0") || 0;
            const start = performance.now();
            const step = now => {
                const p = Math.min(1, (now - start) / duration);
                const v = Math.round(from + (to - from) * p);
                el.textContent = v.toLocaleString();
                if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        },

        revealOnScroll() {
            const els = document.querySelectorAll(".reveal");
            if (!("IntersectionObserver" in window)) {
                els.forEach(el => el.classList.add("reveal-in"));
                return;
            }
            const io = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    if (e.isIntersecting) { e.target.classList.add("reveal-in"); io.unobserve(e.target); }
                });
            }, { threshold: 0.12 });
            els.forEach(el => io.observe(el));
        }
    };

    // Auto-init on first load
    document.addEventListener("DOMContentLoaded", () => {
        try { api.initTheme(); api.revealOnScroll(); } catch { }
    });

    // Expose to Blazor
    window.site = api;
})();
