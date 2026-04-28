export function openPrintPdf(options: {
  title: string;
  html: string;
  css?: string;
  autoPrint?: boolean;
}): void {
  const baseCss = `
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color: #0f172a; background: #ffffff; }
    .page { padding: 28px; }
    .brand { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
    .brand h1 { margin: 0; font-size: 18px; letter-spacing: -0.01em; }
    .brand .meta { text-align: right; color: #475569; font-size: 12px; display: grid; gap: 4px; }
    .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }
    .grid { display: grid; gap: 12px; }
    .grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
    .value { font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    th { text-align: left; color: #475569; font-weight: 600; background: #f8fafc; }
    .right { text-align: right; }
    .totals { display: grid; gap: 8px; justify-content: end; margin-top: 10px; }
    .totals .row { display: grid; grid-template-columns: 160px 140px; gap: 14px; align-items: center; }
    .totals .row strong { text-align: right; }
    .footer { margin-top: 18px; color: #64748b; font-size: 11px; display: flex; justify-content: space-between; gap: 12px; }
    .badge { display: inline-flex; align-items: center; padding: 4px 8px; border-radius: 999px; font-size: 11px; border: 1px solid #e2e8f0; color: #334155; background: #ffffff; }
    @media print {
      .no-print { display: none !important; }
      .page { padding: 0; }
      body { background: #fff; }
    }
  `;

  const extraCss = options.css ?? '';
  const doc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title)}</title>
    <style>${baseCss}\n${extraCss}</style>
  </head>
  <body>
    ${options.html}
  </body>
</html>`;

  const shouldPrint = options.autoPrint !== false;

  // Try opening a new tab first (nice UX). If blocked, fall back to an invisible iframe (no popups).
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (win) {
    win.document.open();
    win.document.write(doc);
    win.document.close();
    if (shouldPrint) {
      win.focus();
      setTimeout(() => {
        try {
          win.print();
        } catch {
          // ignore
        }
      }, 250);
    }
    return;
  }

  // Fallback: hidden iframe printing (works with popup blockers).
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.srcdoc = doc;
  document.body.appendChild(iframe);

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      // ignore
    }
  };

  iframe.onload = () => {
    if (!shouldPrint) return;
    // Print must run close to the user gesture; keep delay minimal.
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        // Remove after print dialog is opened.
        setTimeout(cleanup, 1000);
      }
    }, 0);
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

