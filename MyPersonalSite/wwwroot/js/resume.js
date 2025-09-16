// wwwroot/js/resume.js
window.resume = (function () {
    // Print only a target element (e.g., ".resume-container" or "#resume-summary")
    function printResume(selector) {
        const el = document.querySelector(selector);
        if (!el) { window.print(); return; }

        const printClass = "print-solo-active";
        document.body.classList.add(printClass);

        const clone = el.cloneNode(true);
        clone.id = "print-root";
        // If the source is visually hidden (display:none), undo that on the clone
        clone.classList.remove("d-none", "sr-only-screen");
        Object.assign(clone.style, {
            position: "absolute", left: "0", top: "0", width: "100%", display: "block"
        });
        document.body.appendChild(clone);

        setTimeout(() => {
            window.print();
            document.body.classList.remove(printClass);
            document.getElementById("print-root")?.remove();
        }, 10);
    }

    // Export a section to a .doc that opens in Word
    function exportWord(selector, filenameBase) {
        const el = document.querySelector(selector);
        if (!el) return;

        // Minimal CSS so the 1-pager grid renders correctly in Word
        const styles = `
@page{margin:0.75in;}
body{font-family:Segoe UI,Arial,sans-serif;line-height:1.35;color:#111;}
.d-print-none,.no-print,.btn,nav,aside,header.site,footer.site{display:none!important}
.rs{background:#fff;font-size:.95rem}
.rs-header{display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;border-bottom:1px solid #ddd;padding-bottom:.2rem;margin-bottom:.35rem}
.rs-name{font-weight:800;font-size:1.25rem;margin:0}
.rs-role{font-variant-caps:all-small-caps;letter-spacing:.06em;font-weight:700}
.rs-tag{margin:.2rem 0 0;color:#444}
.rs-contact{text-align:right;white-space:nowrap;color:#333;font-size:.9rem}
.rs-grid{display:grid;grid-template-columns:34% 1fr;gap:.6rem .8rem}
.rs-label{font-variant-caps:all-small-caps;letter-spacing:.06em;font-weight:700;color:#222;margin:0 0 .25rem 0}
.rs-left .rs-block + .rs-block{margin-top:.5rem}
.rs-list{list-style:none;padding:0;margin:0}
.rs-list li{margin:.15rem 0}
.rs-edu-title{font-weight:700}
.rs-edu-org{color:#555}
.rs-edu-dates{color:#666;font-size:.9rem}
.rs-right .rs-block + .rs-block{margin-top:.6rem}
.rs-job + .rs-job{margin-top:.5rem}
.rs-job-head{display:flex;justify-content:space-between;gap:.5rem;border-bottom:1px solid #eee;padding-bottom:.15rem;margin-bottom:.2rem}
.rs-job-title{font-weight:700}
.rs-job-org{color:#555;font-size:.95rem}
.rs-job-dates{color:#666;font-size:.9rem;white-space:nowrap}
.rs-job-desc{color:#444;margin-bottom:.2rem}
.rs-bullets{margin:.2rem 0 0 .95rem}
.rs-bullets li{margin:.15rem 0}
`;

        const header =
            "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
            "xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'>" +
            "<style>" + styles + "</style>" +
            "</head><body>";

        const footer = "</body></html>";

        // Clone so we can unhide if needed
        const clone = el.cloneNode(true);
        clone.classList.remove("d-none", "sr-only-screen");
        const html = header + clone.innerHTML + footer;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filenameBase || 'resume'}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return { printResume, exportWord };

    function initExportDropdowns() {
        const dds = document.querySelectorAll('.export-dd');
        dds.forEach(dd => {
            dd.addEventListener('toggle', () => {
                const menu = dd.querySelector('.menu');
                if (!menu) return;

                if (dd.open) {
                    const summary = dd.querySelector('summary');
                    const r = summary.getBoundingClientRect();
                    const gutter = 8;
                    const maxW = Math.min(280, window.innerWidth - gutter * 2);
                    const left = Math.max(gutter, Math.min(window.innerWidth - maxW - gutter, r.left));
                    const top = Math.min(window.innerHeight - gutter, r.bottom + gutter);

                    // Pin the dropdown to the viewport so parents can't clip it
                    Object.assign(menu.style, {
                        position: 'fixed',
                        left: `${left}px`,
                        top: `${top}px`,
                        minWidth: `${Math.max(220, maxW)}px`,
                        maxHeight: '60vh',
                        overflowY: 'auto',
                        zIndex: 4000,
                        display: 'block'
                    });

                    // Close on outside click / resize / scroll
                    const closeOnOutside = (ev) => { if (!dd.contains(ev.target)) dd.open = false; };
                    const reset = () => {
                        document.removeEventListener('click', closeOnOutside, true);
                        window.removeEventListener('resize', reset);
                        window.removeEventListener('scroll', reset, true);
                        menu.removeAttribute('style');   // back to CSS defaults
                    };

                    document.addEventListener('click', closeOnOutside, true);
                    window.addEventListener('resize', reset);
                    window.addEventListener('scroll', reset, true);
                    dd.addEventListener('toggle', () => { if (!dd.open) reset(); }, { once: true });
                } else {
                    menu.removeAttribute('style');
                }
            });
        });
    }

    // expose the new function too
    return { printResume, exportWord, initExportDropdowns };

    function bindExportDropdowns() {
        const dds = document.querySelectorAll('.export-dd');
        dds.forEach(dd => {
            const summary = dd.querySelector('summary');
            const menu = dd.querySelector('.menu');
            if (!summary || !menu) return;

            const place = () => {
                if (!dd.open) return;
                const r = summary.getBoundingClientRect();
                const gutter = 8;
                const menuW = Math.max(220, Math.min(280, window.innerWidth - gutter * 2));
                const left = Math.max(gutter, Math.min(window.innerWidth - menuW - gutter, r.left));
                const top = Math.min(window.innerHeight - gutter, r.bottom + gutter);

                menu.style.setProperty('--export-left', left + 'px');
                menu.style.setProperty('--export-top', top + 'px');
                menu.style.right = 'auto';      // kill any stylesheet 'right: 0'
                menu.style.bottom = 'auto';
                menu.style.minWidth = menuW + 'px';
                menu.style.display = 'block';
            };

            // Reposition when opened and while viewport changes
            dd.addEventListener('toggle', place);
            summary.addEventListener('click', () => setTimeout(place, 0));
            window.addEventListener('resize', () => dd.open && place());
            window.addEventListener('scroll', () => dd.open && place(), true);
        });
    }

    return { printResume, exportWord, initExportDropdowns: bindExportDropdowns };

})();
