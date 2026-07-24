/**
 * Client-Side Audio Caching Engine using IndexedDB.
 * Prevents redundant Gemini TTS requests and saves token / quota consumption.
 */

const DB_NAME = "auracast_audio_cache_db";
const DB_VERSION = 1;
const STORE_NAME = "audio_chunks";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "cacheKey" });
      }
    };
  });
}

/**
 * Computes a fast deterministic cache key from line text and voice name
 */
export function generateAudioCacheKey(text: string, voiceName: string): string {
  const normalizedText = text.trim().toLowerCase().replace(/\s+/g, " ");
  let hash = 0;
  const str = `${voiceName}:${normalizedText}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `tts_${voiceName}_${Math.abs(hash)}`;
}

/**
 * Retrieves cached Base64 audio if it exists in IndexedDB
 */
export async function getAudioFromCache(text: string, voiceName: string): Promise<string | null> {
  try {
    const db = await openDB();
    const cacheKey = generateAudioCacheKey(text, voiceName);

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        if (request.result && request.result.audioBase64) {
          resolve(request.result.audioBase64);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("Failed to read audio cache:", err);
    return null;
  }
}

/**
 * Saves Base64 audio to IndexedDB cache
 */
export async function saveAudioToCache(text: string, voiceName: string, audioBase64: string): Promise<void> {
  try {
    const db = await openDB();
    const cacheKey = generateAudioCacheKey(text, voiceName);

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({
        cacheKey,
        text,
        voiceName,
        audioBase64,
        timestamp: Date.now(),
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn("Failed to write to audio cache:", err);
  }
}

/**
 * Clears all cached audio chunks
 */
export async function clearAudioCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn("Failed to clear audio cache:", err);
  }
}

/**
 * Returns cache usage statistics
 */
export async function getAudioCacheStats(): Promise<{ count: number; totalKB: number }> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result || [];
        let totalBytes = 0;
        records.forEach((r) => {
          if (r.audioBase64) {
            totalBytes += r.audioBase64.length;
          }
        });
        resolve({
          count: records.length,
          totalKB: Math.round(totalBytes / 1024),
        });
      };

      request.onerror = () => resolve({ count: 0, totalKB: 0 });
    });
  } catch (err) {
    return { count: 0, totalKB: 0 };
  }
}
