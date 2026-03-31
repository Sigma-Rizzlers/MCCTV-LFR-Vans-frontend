const adminMissionFileDatabaseName = "mcctv-admin-mission-files";
const adminMissionFileStoreName = "mission-files";

function openAdminMissionFileDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(adminMissionFileDatabaseName, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(adminMissionFileStoreName)) {
        database.createObjectStore(adminMissionFileStoreName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open mission file storage."));
  });
}

async function runMissionFileRequest(mode, operation) {
  const database = await openAdminMissionFileDatabase();
  if (!database) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(adminMissionFileStoreName, mode);
    const store = transaction.objectStore(adminMissionFileStoreName);
    let request;

    try {
      request = operation(store);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }

    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error || new Error("Unable to complete mission file request."));
    transaction.oncomplete = () => {
      database.close();
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("Mission file transaction aborted."));
    };
  });
}

export function createAdminMissionFileKey() {
  return `request-plan-file-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function saveAdminMissionFile(file, key) {
  if (!file || !key) {
    return null;
  }

  await runMissionFileRequest("readwrite", (store) => store.put(file, key));

  return {
    key,
    name: file.name ?? "",
    type: file.type ?? ""
  };
}

export async function loadAdminMissionFile(key) {
  if (!key) {
    return null;
  }

  const file = await runMissionFileRequest("readonly", (store) => store.get(key));
  return file instanceof Blob ? file : null;
}

export async function clearAdminMissionFile(key) {
  if (!key) {
    return null;
  }

  return runMissionFileRequest("readwrite", (store) => store.delete(key));
}
