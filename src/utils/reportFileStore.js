const reportFileDatabaseName = "mcctv-report-files";
const reportFileStoreName = "report-files";

function openReportFileDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(reportFileDatabaseName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(reportFileStoreName)) {
        database.createObjectStore(reportFileStoreName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open report file storage."));
  });
}

async function runReportFileRequest(mode, operation) {
  const database = await openReportFileDatabase();
  if (!database) return null;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(reportFileStoreName, mode);
    const store = transaction.objectStore(reportFileStoreName);
    let request;
    try {
      request = operation(store);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error || new Error("Unable to complete report file request."));
    transaction.oncomplete = () => { database.close(); };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("Report file transaction aborted."));
    };
  });
}

export const REPORT_FILE_FIELDS = ["support", "lodging", "breakfast", "lunch", "dinner", "implementation"];

function makeKey(requestId, fieldName) {
  return `${requestId}:${fieldName}`;
}

export async function saveReportFile(requestId, fieldName, file) {
  if (!requestId || !fieldName || !file) return null;
  await runReportFileRequest("readwrite", (store) => store.put(file, makeKey(requestId, fieldName)));
  return { key: makeKey(requestId, fieldName), name: file.name ?? "", type: file.type ?? "" };
}

export async function loadReportFile(requestId, fieldName) {
  if (!requestId || !fieldName) return null;
  const file = await runReportFileRequest("readonly", (store) => store.get(makeKey(requestId, fieldName)));
  return file instanceof Blob ? file : null;
}

export async function loadReportFiles(requestId, fieldNames = REPORT_FILE_FIELDS) {
  const entries = await Promise.all(
    fieldNames.map(async (fieldName) => {
      const file = await loadReportFile(requestId, fieldName);
      return [fieldName, file];
    })
  );
  return Object.fromEntries(entries);
}

export async function clearReportFiles(requestId) {
  await Promise.all(
    REPORT_FILE_FIELDS.map((fieldName) =>
      runReportFileRequest("readwrite", (store) => store.delete(makeKey(requestId, fieldName)))
    )
  );
}
