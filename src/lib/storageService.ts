/**
 * Nexovira Unified Persistent Storage Service
 * Handles uploading files (images, PDFs, documents, media) to durable server-side storage
 * and returning permanent, persistent URLs that survive restarts, refreshes, and redeployments.
 */

export interface StorageUploadResult {
  url: string;
  fileName: string;
  size: number;
  contentType: string;
}

/**
 * Upload a browser File object to persistent server storage
 */
export async function uploadFileToStorage(file: File, folder = 'general'): Promise<StorageUploadResult> {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const res = await fetch('/api/v1/storage/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            dataUrl: dataUrl,
            folder: folder
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned error ${res.status}`);
        }

        const data = await res.json();
        if (!data.url) {
          throw new Error('Storage response missing public URL.');
        }

        resolve({
          url: data.url,
          fileName: data.fileName || file.name,
          size: data.size || file.size,
          contentType: data.contentType || file.type
        });
      } catch (err: any) {
        console.error('[Storage Service Upload Error]:', err);
        reject(new Error(`Persistent upload failed: ${err.message || 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file for persistent upload.'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Upload a base64 or dataUrl directly to persistent storage
 */
export async function uploadDataUrlToStorage(
  dataUrl: string,
  filename: string,
  folder = 'general'
): Promise<string> {
  if (!dataUrl) {
    throw new Error('No data provided for upload.');
  }

  // If it's already an absolute URL or a local permanent /uploads/ path, no need to re-upload
  if (dataUrl.startsWith('/uploads/') || dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }

  try {
    const res = await fetch('/api/v1/storage/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        dataUrl,
        folder
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server returned error ${res.status}`);
    }

    const data = await res.json();
    return data.url;
  } catch (err: any) {
    console.warn('[Storage Service] Server upload failed, using optimized payload:', err);
    // If it's an image under 400KB, the dataUrl itself can act as a fallback
    if (dataUrl.startsWith('data:image/') && dataUrl.length < 500000) {
      return dataUrl;
    }
    throw new Error(`Failed to upload to persistent storage: ${err.message}`);
  }
}
