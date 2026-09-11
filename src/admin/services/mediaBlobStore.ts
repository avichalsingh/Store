/**
 * Persist uploaded video Files in IndexedDB.
 * localStorage holds metadata only — never blob: URLs as permanent sources.
 *
 * Keys:
 *   {assetId}:original  — master / downloadable source
 *   {assetId}:preview   — generated preview (optional; may be absent in prototype)
 *   {assetId}:thumb     — thumbnail still (optional)
 */

const DB_NAME = "rhythm-admin-media-blobs-v1";
const STORE = "files";
const DB_VERSION = 1;

export type MediaBlobKind = "original" | "preview" | "thumb";

type StoredBlob = {
  id: string; // `${assetId}:${kind}`
  assetId: string;
  kind: MediaBlobKind;
  blob: Blob;
  mimeType: string;
  fileName: string;
  updatedAt: string;
};

function blobKey(assetId: string, kind: MediaBlobKind): string {
  return `${assetId}:${kind}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

export async function saveMediaBlob(
  assetId: string,
  file: Blob,
  fileName: string,
  kind: MediaBlobKind = "original",
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({
      id: blobKey(assetId, kind),
      assetId,
      kind,
      blob: file,
      mimeType: file.type || "video/mp4",
      fileName,
      updatedAt: new Date().toISOString(),
    } satisfies StoredBlob);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB put failed"));
  });
  db.close();
}

export async function loadMediaBlob(
  assetId: string,
  kind: MediaBlobKind = "original",
): Promise<StoredBlob | null> {
  try {
    const db = await openDb();
    const row = await new Promise<StoredBlob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(blobKey(assetId, kind));
      req.onsuccess = () => resolve((req.result as StoredBlob) ?? null);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB get failed"));
    });
    db.close();
    return row;
  } catch {
    return null;
  }
}

export async function deleteMediaBlobs(assetId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const kind of ["original", "preview", "thumb"] as MediaBlobKind[]) {
        store.delete(blobKey(assetId, kind));
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
    });
    db.close();
  } catch {
    /* ignore */
  }
  revokeSessionObjectUrl(assetId, "original");
  revokeSessionObjectUrl(assetId, "preview");
  revokeSessionObjectUrl(assetId, "thumb");
}

/** Session object URLs keyed by `${assetId}:${kind}` */
const sessionUrls = new Map<string, string>();

export function getSessionObjectUrl(
  assetId: string,
  kind: MediaBlobKind = "original",
): string | undefined {
  return sessionUrls.get(blobKey(assetId, kind));
}

export function setSessionObjectUrl(
  assetId: string,
  url: string,
  kind: MediaBlobKind = "original",
) {
  const key = blobKey(assetId, kind);
  const prev = sessionUrls.get(key);
  if (prev && prev !== url) {
    try {
      URL.revokeObjectURL(prev);
    } catch {
      /* ignore */
    }
  }
  sessionUrls.set(key, url);
}

export function revokeSessionObjectUrl(
  assetId: string,
  kind: MediaBlobKind = "original",
) {
  const key = blobKey(assetId, kind);
  const prev = sessionUrls.get(key);
  if (prev) {
    try {
      URL.revokeObjectURL(prev);
    } catch {
      /* ignore */
    }
    sessionUrls.delete(key);
  }
}

/**
 * Load blob from IndexedDB and create a fresh object URL for this session.
 * Reuses an existing session URL if still valid.
 */
export async function restoreObjectUrl(
  assetId: string,
  kind: MediaBlobKind = "original",
): Promise<string | null> {
  const cached = getSessionObjectUrl(assetId, kind);
  if (cached) return cached;
  const stored = await loadMediaBlob(assetId, kind);
  if (!stored?.blob) return null;
  const url = URL.createObjectURL(stored.blob);
  setSessionObjectUrl(assetId, url, kind);
  return url;
}

/**
 * Persist original upload and return a session object URL for immediate playback.
 */
export async function persistOriginalUpload(
  assetId: string,
  file: File | Blob,
  fileName: string,
): Promise<string> {
  await saveMediaBlob(assetId, file, fileName, "original");
  const existing = getSessionObjectUrl(assetId, "original");
  if (existing) {
    try {
      URL.revokeObjectURL(existing);
    } catch {
      /* ignore */
    }
  }
  const url = URL.createObjectURL(file);
  setSessionObjectUrl(assetId, url, "original");
  return url;
}

/**
 * Resolve a session object URL for admin tools.
 * Prefers the MASTER (`original`) blob — never substitutes the customer preview
 * when the master exists.
 */
export async function resolvePlayableObjectUrl(
  assetId: string,
): Promise<{ url: string; source: "preview" | "original" } | null> {
  const original = await restoreObjectUrl(assetId, "original");
  if (original) return { url: original, source: "original" };
  const preview = await restoreObjectUrl(assetId, "preview");
  if (preview) return { url: preview, source: "preview" };
  return null;
}
