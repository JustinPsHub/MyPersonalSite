// wwwroot/js/site.js
window.site = (function () {
    const KEY = "theme";

    function applyTheme(theme) {
        const t = theme === "dark" ? "dark" : "light";
        const root = document.documentElement;
        root.setAttribute("data-theme", t);
        try { localStorage.setItem(KEY, t); } catch { }
        return t;
    }



    function getTheme() {
        try {
            const saved = localStorage.getItem(KEY);
            if (saved === "dark" || saved === "light") return saved;
        } catch { }
        return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
            ? "dark" : "light";
    }

    function setTheme(theme) { return applyTheme(theme); }
    function initTheme() { document.documentElement.classList.add("js"); return applyTheme(getTheme()); }

    function animateCount(selector, value, durationMs = 700) {
        const el = document.querySelector(selector);
        if (!el) return;
        const start = Number(el.textContent || 0) || 0;
        const diff = value - start;
        if (diff === 0) { el.textContent = String(value); return; }
        const t0 = performance.now();
        function step(t) {
            const p = Math.min(1, (t - t0) / durationMs);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(start + diff * eased));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function revealOnScroll() {
        const items = Array.from(document.querySelectorAll(".reveal"));
        if (!items.length) return;
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) if (e.isIntersecting) { e.target.classList.add("reveal-in"); io.unobserve(e.target); }
        }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
        items.forEach(el => io.observe(el));
    }

    return { initTheme, getTheme, setTheme, animateCount, revealOnScroll };
})();
