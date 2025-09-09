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
})();
