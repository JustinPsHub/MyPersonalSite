// wwwroot/js/site.js
window.site = (function () {
    const KEY = "theme";

    /* =========================
       Theme
    ========================== */
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

    /* =========================
       Small UI helpers
    ========================== */
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

    let revealObserver;
    function revealOnScroll() {
        const items = Array.from(document.querySelectorAll(".reveal"));
        if (!items.length) return;

        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            items.forEach(el => el.classList.add("reveal-in"));
            return;
        }

        if (!revealObserver) {
            revealObserver = new IntersectionObserver((entries, obs) => {
                for (const e of entries) {
                    if (!e.isIntersecting) continue;
                    e.target.classList.add("reveal-in");
                    obs.unobserve(e.target);
                }
            }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
        }

        items.forEach(el => {
            if (el.dataset.revealBound) return;
            el.dataset.revealBound = "true";
            revealObserver.observe(el);
        });
    }

    /* =========================
       Export helpers (no CSP issues)
    ========================== */
    // Print a single element by selector (opens a new window with minimal styles)
    function printElement(selector, title = "Document") {
        const el = document.querySelector(selector);
        if (!el) { window.print(); return; }

        const win = window.open("", "_blank");
        if (!win) { window.print(); return; }

        const styles = `
      <style>
        @page { margin: 0.7in; }
        body { font-family: Segoe UI, Arial, sans-serif; line-height:1.35; }
        .d-print-none, .no-print, nav, aside, footer { display:none !important; }
        .chip{ border:0; background:#eee; padding:.15rem .4rem; border-radius:999px; font-weight:600; font-size:.85rem; }
        .exp{ border:1px solid #ddd; border-radius:8px; padding:10px; margin:8px 0; }
        .exp-head{ display:flex; justify-content:space-between; gap:.5rem; }
        .exp-bullets{ margin:.2rem 0 .2rem 1rem; }
        h1,h2,h3{ margin:.15rem 0 .35rem; }
      </style>
    `;

        win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${styles}</head><body>${el.outerHTML}</body></html>`);
        win.document.close();
        // Give the new window a beat to layout then print
        win.onload = () => { win.focus(); win.print(); win.close(); };
    }

    // Export selected element as a Word .doc
    function exportElementToWord(selector, filenameBase = "document") {
        const el = document.querySelector(selector);
        if (!el) return;

        const header =
            "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
            "xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'>" +
            "<style>@page{margin:0.7in;} body{font-family:Segoe UI,Arial,sans-serif;line-height:1.35} " +
            ".d-print-none,.no-print,nav,aside,footer{display:none!important} " +
            ".chip{border:0;background:#eee;padding:.15rem .4rem;border-radius:999px;font-weight:600;font-size:.85rem} " +
            ".exp{border:1px solid #ddd;border-radius:8px;padding:10px;margin:8px 0} " +
            ".exp-head{display:flex;justify-content:space-between;gap:.5rem} " +
            ".exp-bullets{margin:.2rem 0 .2rem 1rem} " +
            "h1,h2,h3{margin:.15rem 0 .35rem}" +
            "</style></head><body>";
        const footer = "</body></html>";
        const html = header + el.outerHTML + footer;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filenameBase}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function downloadFile(url, filename) {
        if (!url) return;
        const a = document.createElement("a");
        a.href = url;
        if (filename) a.download = filename;
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    return {
        initTheme, getTheme, setTheme,
        animateCount, revealOnScroll,
        printElement, exportElementToWord,
        downloadFile
    };
})();
