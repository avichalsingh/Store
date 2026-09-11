export interface StorageProvider {
  upload(file: File, path: string): Promise<{ url: string; sizeBytes: number }>;
  getPublicUrl(key: string): string;
  getProtectedUrl(key: string): string;
}

export class MockStorageProvider implements StorageProvider {
  async upload(file: File, path: string): Promise<{ url: string; sizeBytes: number }> {
    // Simulate network latency for demo uploads
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
    const url =
      typeof URL !== "undefined" && URL.createObjectURL
        ? URL.createObjectURL(file)
        : this.getProtectedUrl(path);
    return { url, sizeBytes: file.size };
  }

  getPublicUrl(key: string): string {
    if (key.startsWith("/") || key.startsWith("blob:") || key.startsWith("http")) {
      return key;
    }
    return `/media/${key.replace(/^\//, "")}`;
  }

  getProtectedUrl(key: string): string {
    if (key.startsWith("/") || key.startsWith("blob:") || key.startsWith("http")) {
      return key;
    }
    return `/media/protected/${key.replace(/^\//, "")}`;
  }
}

export const storageProvider: StorageProvider = new MockStorageProvider();
