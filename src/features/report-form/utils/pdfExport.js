const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;

function supportsDownloadAttribute() {
  const anchor = document.createElement("a");
  return typeof anchor.download !== "undefined";
}

function isSafariLikeBrowser() {
  const userAgent = navigator.userAgent;
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent);
  return isSafari || isIOS;
}

function triggerAnchorDownload(url, fileName) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function mergeUint8Arrays(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function dataUrlToBytes(dataUrl) {
  const binary = atob(dataUrl.split(",")[1] ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function buildPdfFromJpeg(jpegBytes, imageWidth, imageHeight) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let byteOffset = 0;

  function pushBytes(bytes) {
    chunks.push(bytes);
    byteOffset += bytes.length;
  }
  function pushText(text) {
    pushBytes(encoder.encode(text));
  }
  function beginObject(index, content) {
    offsets[index] = byteOffset;
    pushText(content);
  }

  const imageRatio = imageWidth / imageHeight;
  const pageRatio = PDF_PAGE_WIDTH / PDF_PAGE_HEIGHT;
  let drawWidth = PDF_PAGE_WIDTH;
  let drawHeight = PDF_PAGE_HEIGHT;
  let drawX = 0;
  let drawY = 0;
  if (imageRatio > pageRatio) {
    drawHeight = PDF_PAGE_WIDTH / imageRatio;
    drawY = (PDF_PAGE_HEIGHT - drawHeight) / 2;
  } else {
    drawWidth = PDF_PAGE_HEIGHT * imageRatio;
    drawX = (PDF_PAGE_WIDTH - drawWidth) / 2;
  }

  const pageContent = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(
    2
  )} cm\n/Im0 Do\nQ\n`;
  const pageContentBytes = encoder.encode(pageContent);

  pushText("%PDF-1.4\n");
  beginObject(1, "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  beginObject(2, "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  beginObject(
    3,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );
  offsets[4] = byteOffset;
  pushText(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${Math.max(
      1,
      Math.round(imageWidth)
    )} /Height ${Math.max(
      1,
      Math.round(imageHeight)
    )} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushText("\nendstream\nendobj\n");
  offsets[5] = byteOffset;
  pushText(`5 0 obj\n<< /Length ${pageContentBytes.length} >>\nstream\n`);
  pushBytes(pageContentBytes);
  pushText("endstream\nendobj\n");

  const xrefStart = byteOffset;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  pushText(xref);

  return mergeUint8Arrays(chunks);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to render PDF image."));
    image.src = url;
  });
}

function canvasLooksBlank(canvas) {
  const context = canvas.getContext("2d");
  if (!context) {
    return true;
  }

  const { width, height } = canvas;
  const stepX = Math.max(1, Math.floor(width / 120));
  const stepY = Math.max(1, Math.floor(height / 120));
  const pixels = context.getImageData(0, 0, width, height).data;

  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const i = (y * width + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      const isWhite = r > 248 && g > 248 && b > 248;
      if (a > 0 && !isWhite) {
        return false;
      }
    }
  }

  return true;
}

function inlineComputedStyles(sourceNode, targetNode) {
  if (!(sourceNode instanceof Element) || !(targetNode instanceof Element)) {
    return;
  }

  const computed = window.getComputedStyle(sourceNode);
  const styleText = Array.from(computed)
    .map((property) => `${property}:${computed.getPropertyValue(property)};`)
    .join("");
  targetNode.setAttribute("style", styleText);

  const sourceChildren = Array.from(sourceNode.children);
  const targetChildren = Array.from(targetNode.children);
  for (let i = 0; i < sourceChildren.length; i += 1) {
    inlineComputedStyles(sourceChildren[i], targetChildren[i]);
  }
}

function buildSvgMarkupFromElement(element) {
  const clone = element.cloneNode(true);
  inlineComputedStyles(element, clone);
  const { width, height } = element.getBoundingClientRect();
  const exportWidth = Math.max(1, Math.round(width));
  const exportHeight = Math.max(1, Math.round(height));
  const xhtml = new XMLSerializer().serializeToString(clone);

  return {
    exportWidth,
    exportHeight,
    svgMarkup: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${xhtml}</div>
        </foreignObject>
      </svg>
    `
  };
}

async function captureElementAsJpeg(element) {
  if (!element) {
    throw new Error("Cannot find PDF template element.");
  }
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const { svgMarkup, exportWidth, exportHeight } = buildSvgMarkupFromElement(element);
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = Math.max(1, Math.round(exportWidth * scale));
    canvas.height = Math.max(1, Math.round(exportHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Cannot create canvas for PDF.");
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    if (canvasLooksBlank(canvas)) {
      throw new Error("Rendered PDF image is blank.");
    }
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.95), width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function exportElementToPdfBlob(element) {
  const screenshot = await captureElementAsJpeg(element);
  const jpegBytes = dataUrlToBytes(screenshot.dataUrl);
  const pdfBytes = buildPdfFromJpeg(jpegBytes, screenshot.width, screenshot.height);
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export async function exportReportToPdfBlob(_report, options = {}) {
  const sourceElement = options.element ?? document.getElementById(options.elementId ?? "pdfTemplate");
  return exportElementToPdfBlob(sourceElement);
}

export async function saveBlobToFile(blob, fileName, handle) {
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(new Uint8Array(await blob.arrayBuffer()));
    await writable.close();
    return;
  }

  if (typeof navigator !== "undefined" && typeof navigator.msSaveOrOpenBlob === "function") {
    navigator.msSaveOrOpenBlob(blob, fileName);
    return;
  }

  const url = URL.createObjectURL(blob);
  try {
    triggerAnchorDownload(url, fileName);
    if (!supportsDownloadAttribute() || isSafariLikeBrowser()) {
      const popup = window.open(url, "_blank", "noopener,noreferrer");
      if (!popup) {
        window.location.href = url;
      }
    }
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

const PRINT_CSS = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0; background: #fff;
    font-family: 'Hanuman', 'Noto Sans Khmer', 'Khmer OS', sans-serif;
  }
  .pdf-document {
    display: block !important; width: auto !important; max-width: none !important;
    min-height: auto !important; height: auto !important;
    margin: 0 !important; padding: 0 !important;
    border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
    background: #fff !important;
  }
  .pdf-grid { display: block !important; }
  .pdf-panel { margin-bottom: 10px !important; page-break-inside: avoid; break-inside: avoid; }
  .pdf-panel-full { grid-column: auto !important; }
  .pdf-member-table { page-break-inside: auto; break-inside: auto; width: 100%; border-collapse: collapse; }
  .pdf-member-table tr { page-break-inside: avoid; break-inside: avoid; }
  .pdf-member-table th, .pdf-member-table td { padding: 5px 8px; border: 1px solid #ccc; font-size: 12px; }
  .pdf-document-footer { page-break-inside: avoid; break-inside: avoid; }
  .pdf-preview-actions { display: none !important; }
  img { max-width: 100%; }
  h3 { font-size: 13px; margin: 8px 0 4px; }
`;

function collectPageStylesheets() {
  return Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((r) => r.cssText).join("\n");
      } catch {
        // cross-origin sheet — link it instead
        return sheet.href ? `@import url("${sheet.href}");` : "";
      }
    })
    .join("\n");
}

export function openPrintFallbackFromElement(element, title = "PDF Export") {
  if (!element || typeof document === "undefined" || typeof window === "undefined") {
    return false;
  }

  const printRootId = "pdf-print-root";
  const printStyleId = "pdf-print-style";
  const existingRoot = document.getElementById(printRootId);
  const existingStyle = document.getElementById(printStyleId);
  if (existingRoot) existingRoot.remove();
  if (existingStyle) existingStyle.remove();

  const printRoot = document.createElement("div");
  printRoot.id = printRootId;
  printRoot.setAttribute("aria-hidden", "true");
  printRoot.innerHTML = element.outerHTML;

  const printStyle = document.createElement("style");
  printStyle.id = printStyleId;
  printStyle.textContent = `
    @page { size: A4; margin: 12mm; }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      body > *:not(#${printRootId}):not(#${printStyleId}) { display: none !important; }
      #${printRootId} {
        display: block !important; position: static; inset: auto; z-index: auto;
        overflow: visible; background: #fff; padding: 0; margin: 0; width: 100% !important;
      }
      #${printRootId} .pdf-document {
        display: block !important; width: auto !important; max-width: none !important;
        min-height: auto !important; height: auto !important;
        margin: 0 !important; padding: 0 !important;
        border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
      }
      #${printRootId} .pdf-grid { display: block !important; grid-template-columns: 1fr !important; gap: 0 !important; }
      #${printRootId} .pdf-panel { margin-bottom: 10px !important; page-break-inside: avoid; break-inside: avoid; }
      #${printRootId} .pdf-panel-full { grid-column: auto !important; }
      #${printRootId} .pdf-member-table { page-break-inside: auto; break-inside: auto; }
      #${printRootId} .pdf-member-table tr { page-break-inside: avoid; break-inside: avoid; }
      #${printRootId} .pdf-document-footer { page-break-inside: avoid; break-inside: avoid; }
    }
  `;

  document.title = title;
  document.head.appendChild(printStyle);
  document.body.appendChild(printRoot);

  setTimeout(() => {
    window.focus();
    window.print();
    setTimeout(() => {
      printRoot.remove();
      printStyle.remove();
    }, 300);
  }, 50);

  return true;
}

/**
 * Captures the element with html2canvas then packages it into a real PDF
 * file using jsPDF and triggers a browser download — no print dialog.
 */
export async function downloadAsPdf(element, fileName = "report.pdf") {
  if (!element) throw new Error("No element to capture");

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 in pt: 595.28 x 841.89
  const pageWidthPt = 595.28;
  const pageHeightPt = 841.89;
  const marginPt = 28; // ~10mm

  const usableWidth = pageWidthPt - marginPt * 2;
  const pxPerPt = imgWidth / usableWidth;
  const usableHeight = pageHeightPt - marginPt * 2;

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  let yOffset = 0;
  let pageNum = 0;

  while (yOffset < imgHeight) {
    if (pageNum > 0) pdf.addPage();

    const sliceHeightPx = usableHeight * pxPerPt;
    const remaining = imgHeight - yOffset;
    const slicePx = Math.min(sliceHeightPx, remaining);
    const slicePt = slicePx / pxPerPt;

    // crop the slice from the full canvas
    const slice = document.createElement("canvas");
    slice.width = imgWidth;
    slice.height = slicePx;
    const ctx = slice.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, yOffset, imgWidth, slicePx, 0, 0, imgWidth, slicePx);

    const sliceData = slice.toDataURL("image/jpeg", 0.95);
    pdf.addImage(sliceData, "JPEG", marginPt, marginPt, usableWidth, slicePt);

    yOffset += slicePx;
    pageNum += 1;
  }

  pdf.save(fileName);
}
