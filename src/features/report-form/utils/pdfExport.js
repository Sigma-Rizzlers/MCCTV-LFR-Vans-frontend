import { getRequestStatus, requestStatusLabelMap } from "../constants/requestStatus";

const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;

function canUseFilePicker() {
  return Boolean(
    typeof window !== "undefined" &&
      window.isSecureContext &&
      window.self === window.top &&
      typeof window.showSaveFilePicker === "function"
  );
}

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

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxY, maxLines) {
  const value = String(text ?? "").replace(/\r\n/g, "\n");
  const paragraphs = value.split("\n");
  let nextY = y;
  const lines = [];

  for (const paragraph of paragraphs) {
    let currentLine = "";

    for (const char of paragraph || " ") {
      const candidate = currentLine + char;
      if (context.measureText(candidate).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = candidate;
      }
    }

    lines.push(currentLine || " ");
  }

  let renderedLines = 0;
  for (const line of lines) {
    if (maxLines && renderedLines >= maxLines) {
      break;
    }

    if (maxY && nextY > maxY) {
      context.fillText("...", x, maxY);
      return maxY + lineHeight;
    }

    if (maxLines && renderedLines === maxLines - 1 && lines.length > maxLines) {
      context.fillText(fitTextToWidth(context, `${line}...`, maxWidth), x, nextY);
      return nextY + lineHeight;
    }

    context.fillText(line, x, nextY);
    nextY += lineHeight;
    renderedLines += 1;
  }

  return nextY;
}

function formatSimpleDate(value, includeTime = false) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("km-KH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(date);
}

function normalizeText(value) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function fitTextToWidth(context, text, maxWidth) {
  const source = String(text ?? "");
  if (context.measureText(source).width <= maxWidth) {
    return source;
  }

  let trimmed = source;
  while (trimmed.length > 1 && context.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  return `${trimmed}...`;
}

function drawRoundedRectPath(context, x, y, width, height, radius) {
  const nextRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + nextRadius, y);
  context.lineTo(x + width - nextRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + nextRadius);
  context.lineTo(x + width, y + height - nextRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - nextRadius, y + height);
  context.lineTo(x + nextRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - nextRadius);
  context.lineTo(x, y + nextRadius);
  context.quadraticCurveTo(x, y, x + nextRadius, y);
  context.closePath();
}

function fillRoundedRect(context, x, y, width, height, radius, fillStyle) {
  context.fillStyle = fillStyle;
  drawRoundedRectPath(context, x, y, width, height, radius);
  context.fill();
}

function strokeRoundedRect(context, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  drawRoundedRectPath(context, x, y, width, height, radius);
  context.stroke();
}

function drawFieldRows(context, rows, x, startY, width, maxY) {
  let y = startY;

  for (const row of rows) {
    if (y > maxY - 24) {
      break;
    }

    context.fillStyle = row.labelColor || "#5f738d";
    context.font = "500 18px 'Noto Sans Khmer', 'Segoe UI', sans-serif";
    y = drawWrappedText(context, row.label, x, y, width, 22, maxY, 1);

    context.fillStyle = row.valueColor || "#163250";
    context.font = "600 24px 'Noto Sans Khmer', 'Segoe UI', sans-serif";
    y = drawWrappedText(context, row.value, x, y + 4, width, 30, maxY, row.maxLines ?? 2);
    y += 8;
  }

  return y;
}

function drawDataCard(context, config) {
  const { x, y, width, height, title, rows } = config;
  fillRoundedRect(context, x, y, width, height, 12, "#f7f9fc");
  strokeRoundedRect(context, x, y, width, height, 12, "#cad5e3");

  context.fillStyle = "#24476f";
  context.font = "700 30px 'Noto Serif Khmer', 'Noto Sans Khmer', sans-serif";
  context.fillText(fitTextToWidth(context, title, width - 40), x + 20, y + 42);

  context.strokeStyle = "#d6e0ec";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x + 20, y + 58);
  context.lineTo(x + width - 20, y + 58);
  context.stroke();

  drawFieldRows(context, rows, x + 20, y + 86, width - 40, y + height - 22);
}

function drawStatusBand(context, x, y, width, height, status) {
  const normalizedStatus = getRequestStatus(status);
  const bandTheme =
    normalizedStatus === "approved"
      ? { background: "#d8e4d7", border: "#b7c9b6", text: "#1e5b30", badge: "#2e9348" }
      : normalizedStatus === "rejected"
        ? { background: "#f4dddc", border: "#dcbab7", text: "#7f231d", badge: "#b3261e" }
        : { background: "#f2e8cf", border: "#decdaa", text: "#6f5310", badge: "#8e6b10" };

  fillRoundedRect(context, x, y, width, height, 12, bandTheme.background);
  strokeRoundedRect(context, x, y, width, height, 12, bandTheme.border);

  context.fillStyle = bandTheme.text;
  context.font = "700 30px 'Noto Serif Khmer', 'Noto Sans Khmer', sans-serif";
  context.fillText("ស្ថានភាពសំណើបេសកកម្ម", x + 20, y + 44);

  const badgeText = requestStatusLabelMap[normalizedStatus];
  context.font = "700 24px 'Noto Sans Khmer', 'Segoe UI', sans-serif";
  const badgePaddingX = 20;
  const badgeWidth = context.measureText(badgeText).width + badgePaddingX * 2;
  const badgeHeight = 42;
  const badgeX = x + width - badgeWidth - 18;
  const badgeY = y + (height - badgeHeight) / 2;
  fillRoundedRect(context, badgeX, badgeY, badgeWidth, badgeHeight, 21, bandTheme.badge);

  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2 + 1);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
}

async function loadImageSafely(url) {
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

async function createSimpleReportJpeg(report) {
  if (typeof document === "undefined") {
    throw new Error("មិនអាចបង្កើតឯកសារ PDF នៅក្នុងបរិស្ថាននេះបានទេ។");
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  const width = 1240;
  const height = 1754;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("មិនអាចបង្កើតផ្ទាំងសម្រាប់ PDF បានទេ។");
  }

  const pageMargin = 62;
  const contentX = pageMargin;
  const contentWidth = width - pageMargin * 2;
  const gridGap = 18;
  const cardWidth = (contentWidth - gridGap) / 2;
  const cardHeight = 372;

  context.fillStyle = "#e6ebf2";
  context.fillRect(0, 0, width, height);

  fillRoundedRect(context, 30, 20, width - 60, height - 40, 12, "#f5f7fa");

  const reportData = report ?? {};
  const formData = reportData.formData ?? {};
  const members = Array.isArray(reportData.members) ? reportData.members : [];
  const requestStatus = getRequestStatus(reportData.approvalStatus);
  const pdfTitleText =
    requestStatus === "approved"
      ? "បង្កាន់ដៃអនុម័តសំណើរថយន្តបេសកកម្ម"
      : requestStatus === "rejected"
        ? "បង្កាន់ដៃមិនអនុម័តសំណើរថយន្តបេសកកម្ម"
        : "បង្កាន់ដៃសំណើរថយន្តបេសកកម្ម";

  let y = 56;
  const headerHeight = 166;
  fillRoundedRect(context, contentX, y, contentWidth, headerHeight, 12, "#174a81");

  const logo = await loadImageSafely("/mcctv-logo.jpg");
  const logoSize = 72;
  const logoX = contentX + 20;
  const logoY = y + 24;
  fillRoundedRect(context, logoX, logoY, logoSize, logoSize, logoSize / 2, "#0f2f53");
  if (logo) {
    context.save();
    drawRoundedRectPath(context, logoX, logoY, logoSize, logoSize, logoSize / 2);
    context.clip();
    context.drawImage(logo, logoX, logoY, logoSize, logoSize);
    context.restore();
  }
  strokeRoundedRect(context, logoX, logoY, logoSize, logoSize, logoSize / 2, "rgba(255,255,255,0.45)", 2);

  context.fillStyle = "#ffffff";
  context.font = "700 44px 'Noto Serif Khmer', 'Noto Sans Khmer', sans-serif";
  drawWrappedText(context, pdfTitleText, contentX + 112, y + 60, contentWidth - 430, 50, y + 132, 2);

  context.fillStyle = "#d8e8ff";
  context.font = "500 25px 'Noto Sans Khmer', 'Segoe UI', sans-serif";
  drawWrappedText(
    context,
    "អង្គភាពប្រតិបត្តិការ MCCTV - ប្រព័ន្ធគ្រប់គ្រងកញ្ចប់រថយន្ត",
    contentX + 112,
    y + 106,
    contentWidth - 430,
    30,
    y + 152,
    2
  );

  context.fillStyle = "#d6e7fd";
  context.font = "600 22px 'Noto Sans Khmer', 'Segoe UI', sans-serif";
  context.textAlign = "right";
  context.fillText("លេខសំណើ", contentX + contentWidth - 18, y + 44);

  context.fillStyle = "#ffffff";
  context.font = "700 37px 'Noto Sans Khmer', 'Segoe UI', sans-serif";
  context.fillText(fitTextToWidth(context, normalizeText(reportData.requestId), 360), contentX + contentWidth - 18, y + 88);

  context.fillStyle = "#d9eaff";
  context.font = "500 24px 'Noto Sans Khmer', 'Segoe UI', sans-serif";
  context.fillText(`បង្កើត ${formatSimpleDate(reportData.submittedAt, true)}`, contentX + contentWidth - 18, y + 126);
  context.textAlign = "left";

  y += headerHeight + 18;
  drawStatusBand(context, contentX, y, contentWidth, 74, requestStatus);

  y += 92;
  drawDataCard(context, {
    x: contentX,
    y,
    width: cardWidth,
    height: cardHeight,
    title: "ព័ត៌មានបេសកកម្ម",
    rows: [
      { label: "ឈ្មោះបេសកកម្ម", value: normalizeText(formData.missionTitle) },
      { label: "ថ្ងៃចេញ", value: formatSimpleDate(formData.departureDate), maxLines: 1 },
      { label: "ថ្ងៃត្រឡប់", value: formatSimpleDate(formData.returnDate), maxLines: 1 },
      { label: "ទីកន្លែងបេសកកម្ម", value: normalizeText(formData.missionPlace), maxLines: 2 },
      { label: "គោលបំណង", value: normalizeText(formData.mission), maxLines: 2 }
    ]
  });  drawDataCard(context, {
    x: contentX + cardWidth + gridGap,
    y,
    width: cardWidth,
    height: cardHeight,
    title: "Member List",
    rows: (members.length ? members : [{ name: "-", phone: "-", role: "-" }]).slice(0, 5).map((member, index) => ({
      label: `Member ${index + 1}`,
      value: `${normalizeText(member.name)} | ${normalizeText(member.phone)} | ${normalizeText(member.role)}`,
      maxLines: 1
    }))
  });

  y += cardHeight + 18;
  drawDataCard(context, {
    x: contentX,
    y,
    width: cardWidth,
    height: cardHeight,
    title: "ព័ត៌មានអ្នកស្នើសុំ",
    rows: [
      { label: "គោត្តនាម", value: normalizeText(formData.name), maxLines: 1 },
      { label: "លេខទូរស័ព្ទ", value: normalizeText(formData.phone), maxLines: 1 },
      { label: "តួនាទី", value: normalizeText(formData.role), maxLines: 1 },
      { label: "ឯកសារភ្ជាប់", value: normalizeText(reportData.supportFileName), maxLines: 2 },
      { label: "សមាជិកបន្ថែម", value: `${members.length} នាក់`, maxLines: 1 }
    ]
  });    drawDataCard(context, {
    x: contentX + cardWidth + gridGap,
    y,
    width: cardWidth,
    height: cardHeight,
    title: "Approval",
    rows: [
      {
        label: "Status",
        value: requestStatusLabelMap[requestStatus],
        valueColor: requestStatus === "approved" ? "#1e7d37" : requestStatus === "rejected" ? "#b3261e" : "#8e6b10",
        maxLines: 1
      },
      { label: "Reviewed by", value: requestStatus === "pending" ? "-" : "MCCTV Mission Request System", maxLines: 2 },
      { label: "Reviewed at", value: formatSimpleDate(reportData.submittedAt, true), maxLines: 1 },
      { label: "Signature", value: "______________________________", maxLines: 1 }
    ]
  });

  y += cardHeight + 18;
  const noteHeight = 126;
  drawDataCard(context, {
    x: contentX,
    y,
    width: contentWidth,
    height: noteHeight,
    title: "សំណូមពរ និងតម្រូវការបន្ថែម",
    rows: [{ label: "មាតិកា", value: normalizeText(formData.requestNote), maxLines: 2 }]
  });  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  return { dataUrl, width, height };
}

function mergeUint8Arrays(chunks) {
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalSize);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes;
}

function buildPdfFromJpeg(jpegBytes, imageWidth, imageHeight) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let byteOffset = 0;

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
  for (let index = 1; index <= 5; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  pushText(xref);

  return mergeUint8Arrays(chunks);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("មិនអាចបង្កើតរូបភាពសម្រាប់ PDF បានទេ។"));
    image.src = url;
  });
}

function collectStyles() {
  const styleBlocks = [];

  for (const styleSheet of Array.from(document.styleSheets)) {
    try {
      const cssRules = styleSheet.cssRules;
      for (const cssRule of Array.from(cssRules)) {
        styleBlocks.push(cssRule.cssText);
      }
    } catch {
      // Ignore cross-origin stylesheets that do not expose cssRules.
    }
  }

  return styleBlocks.join("\n");
}

async function captureElementAsJpeg(element) {
  if (!element) {
    throw new Error("មិនអាចរកឃើញទម្រង់ PDF សម្រាប់រក្សាទុកបានទេ។");
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const { width, height } = element.getBoundingClientRect();
  const exportWidth = Math.max(1, Math.round(width));
  const exportHeight = Math.max(1, Math.round(height));

  const serializedNode = new XMLSerializer().serializeToString(element.cloneNode(true));
  const styles = collectStyles();

  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <style>${styles}</style>
          ${serializedNode}
        </div>
      </foreignObject>
    </svg>
  `;

  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(exportWidth * scale));
    canvas.height = Math.max(1, Math.round(exportHeight * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("មិនអាចបង្កើតផ្ទាំងរូបភាពសម្រាប់ PDF បានទេ។");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: canvas.width,
      height: canvas.height
    };
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

export async function exportReportToPdfBlob(report) {
  const screenshot = await createSimpleReportJpeg(report);
  const jpegBytes = dataUrlToBytes(screenshot.dataUrl);
  const pdfBytes = buildPdfFromJpeg(jpegBytes, screenshot.width, screenshot.height);
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export async function requestPdfFileHandle(fileName) {
  if (!canUseFilePicker()) {
    return { cancelled: false, handle: null };
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: fileName,
      types: [
        {
          description: "PDF Document",
          accept: { "application/pdf": [".pdf"] }
        }
      ]
    });
    return { cancelled: false, handle };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { cancelled: true, handle: null };
    }

    if (error?.name === "SecurityError" || error?.name === "NotAllowedError" || error?.name === "TypeError") {
      return { cancelled: false, handle: null };
    }

    throw error;
  }
}

export async function saveBlobToFile(blob, fileName, handle) {
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(blob);
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

    // Safari/WebView often ignore the download attribute; open PDF tab as a fallback.
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


