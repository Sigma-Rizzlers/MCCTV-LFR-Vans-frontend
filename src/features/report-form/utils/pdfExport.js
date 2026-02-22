const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;

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

export async function requestPdfFileHandle(fileName) {
  if (!("showSaveFilePicker" in window)) {
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

  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
