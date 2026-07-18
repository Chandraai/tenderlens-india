"use client";

const dbName = "tenderlens-original-documents";
const storeName = "documents";
const dbVersion = 1;

export type StoredOriginalDocument = {
  analysisId: string;
  fileName: string;
  type: string;
  size: number;
  blob: Blob;
  savedAt: string;
};

export async function saveOriginalDocument(analysisId: string, file: File) {
  const db = await openDb();
  await requestToPromise(
    db.transaction(storeName, "readwrite").objectStore(storeName).put({
      analysisId,
      fileName: file.name,
      type: file.type || "application/pdf",
      size: file.size,
      blob: file,
      savedAt: new Date().toISOString()
    } satisfies StoredOriginalDocument)
  );
  db.close();
}

export async function getOriginalDocument(analysisId: string): Promise<StoredOriginalDocument | null> {
  const db = await openDb();
  const document = await requestToPromise<StoredOriginalDocument | undefined>(
    db.transaction(storeName, "readonly").objectStore(storeName).get(analysisId)
  );
  db.close();
  return document || null;
}

export async function deleteOriginalDocuments(analysisIds: string[]) {
  if (!analysisIds.length) return;
  const db = await openDb();
  const store = db.transaction(storeName, "readwrite").objectStore(storeName);
  await Promise.all(analysisIds.map((analysisId) => requestToPromise(store.delete(analysisId))));
  db.close();
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "analysisId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open original document store"));
  });
}

function requestToPromise<T = unknown>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}
