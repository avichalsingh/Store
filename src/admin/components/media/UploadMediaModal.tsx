"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminModal } from "@/admin/components/ui/AdminModal";
import { formatSizeBytes } from "@/admin/lib/mediaAdapter";
import { useAdmin } from "@/admin/store/AdminProvider";
import { cn } from "@/lib/utils";
import { CheckCircle2, Film, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type QueueItem = {
  key: string;
  file: File;
  phase: "queued" | "uploading" | "processing" | "done" | "failed";
  progress: number;
  assetId?: string;
  cancelled?: boolean;
};

function isVideoFile(file: File) {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|mov|webm|m4v)$/i.test(file.name)
  );
}

function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|avif)$/i.test(file.name)
  );
}

export function UploadMediaModal({
  open,
  onClose,
  onUploaded,
  replaceAssetId,
  mode = "video",
  /** Product Editor context — Storage path uses this id; Media Library uses "library". */
  productId,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded?: (ids: string[]) => void;
  /** When set, the first selected file replaces this asset's master. */
  replaceAssetId?: string;
  /** Upload still images or master videos into the Media Library. */
  mode?: "video" | "image";
  productId?: string;
}) {
  const {
    uploadMasterVideos,
    uploadMasterImages,
    replaceMasterVideo,
    mediaAssets,
  } = useAdmin();
  const isImageMode = mode === "image";
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );
  const cancelledKeys = useRef<Set<string>>(new Set());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Fresh CMS assets after await (enqueueFiles closure would otherwise be stale). */
  const mediaAssetsRef = useRef(mediaAssets);
  mediaAssetsRef.current = mediaAssets;

  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    progressTimers.current.forEach((t) => clearInterval(t));
    progressTimers.current.clear();
    clearAutoCloseTimer();
  }, [clearAutoCloseTimer]);

  useEffect(() => {
    if (!open) {
      // Abort any in-flight TUS uploads when the modal closes.
      abortControllers.current.forEach((c) => c.abort());
      abortControllers.current.clear();
      clearTimers();
      setQueue([]);
      cancelledKeys.current.clear();
      setDragging(false);
    }
  }, [open, clearTimers]);

  useEffect(() => {
    return () => {
      abortControllers.current.forEach((c) => c.abort());
      abortControllers.current.clear();
      clearTimers();
    };
  }, [clearTimers]);

  // Sync queue phases from CMS asset status (real TUS progress updates progress separately).
  useEffect(() => {
    setQueue((prev) =>
      prev.map((item) => {
        if (!item.assetId || item.cancelled) return item;
        const asset = mediaAssets.find((a) => a.id === item.assetId);
        if (!asset) return item;

        if (asset.processingStatus === "ready") {
          const t = progressTimers.current.get(item.key);
          if (t) {
            clearInterval(t);
            progressTimers.current.delete(item.key);
          }
          return { ...item, phase: "done", progress: 100 };
        }

        // Phase 5B: durable master confirmed — Master ready (not processing).
        if (asset.processingStatus === "uploaded" && !isImageMode) {
          const t = progressTimers.current.get(item.key);
          if (t) {
            clearInterval(t);
            progressTimers.current.delete(item.key);
          }
          return { ...item, phase: "done", progress: 100 };
        }

        if (asset.processingStatus === "failed") {
          const t = progressTimers.current.get(item.key);
          if (t) {
            clearInterval(t);
            progressTimers.current.delete(item.key);
          }
          return { ...item, phase: "failed", progress: item.progress };
        }

        if (asset.processingStatus === "uploading") {
          return {
            ...item,
            phase: "uploading",
            progress: Math.max(item.progress, 1),
          };
        }

        if (asset.processingStatus === "processing") {
          return {
            ...item,
            phase: "processing",
            progress: Math.max(item.progress, 70),
          };
        }

        // Images still use ready-at-end local path.
        if (isImageMode && asset.processingStatus === "uploaded") {
          return { ...item, phase: "done", progress: 100 };
        }

        return item;
      }),
    );
  }, [mediaAssets, isImageMode]);

  /** Auto-close only when every queued upload successfully reached done. */
  useEffect(() => {
    clearAutoCloseTimer();
    if (!open || queue.length === 0) return;

    const anyIncompleteOrFailed = queue.some((item) => item.phase !== "done");
    if (anyIncompleteOrFailed) return;

    autoCloseTimer.current = setTimeout(() => {
      autoCloseTimer.current = null;
      onClose();
    }, 750);

    return () => clearAutoCloseTimer();
  }, [open, queue, onClose, clearAutoCloseTimer]);

  const enqueueFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter(
      isImageMode ? isImageFile : isVideoFile,
    );
    if (!list.length) return;

    const items: QueueItem[] = list.map((file) => ({
      key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      phase: "queued",
      progress: 0,
    }));

    setQueue((prev) => [...prev, ...items]);

    // Image mode: keep lightweight indeterminate progress (small local work).
    // Video mode: real TUS progress via onProgress — no fake timers.
    if (isImageMode) {
      items.forEach((item) => {
        setQueue((prev) =>
          prev.map((q) =>
            q.key === item.key
              ? { ...q, phase: "uploading", progress: 8 }
              : q,
          ),
        );
        const timer = setInterval(() => {
          if (cancelledKeys.current.has(item.key)) return;
          setQueue((prev) =>
            prev.map((q) => {
              if (q.key !== item.key) return q;
              if (q.phase !== "uploading") return q;
              const next = Math.min(65, q.progress + 4 + Math.random() * 8);
              return { ...q, progress: next };
            }),
          );
        }, 180);
        progressTimers.current.set(item.key, timer);
      });
    } else {
      items.forEach((item) => {
        setQueue((prev) =>
          prev.map((q) =>
            q.key === item.key
              ? { ...q, phase: "uploading", progress: 0 }
              : q,
          ),
        );
      });
    }

    try {
      const activeItems = items.filter(
        (item) => !cancelledKeys.current.has(item.key),
      );
      const activeFiles = activeItems.map((item) => item.file);
      if (!activeFiles.length) return;

      if (replaceAssetId) {
        if (isImageMode) {
          const ids = await uploadMasterImages(activeFiles);
          onUploaded?.(ids);
          items.forEach((item, i) => {
            const t = progressTimers.current.get(item.key);
            if (t) {
              clearInterval(t);
              progressTimers.current.delete(item.key);
            }
            const assetId = ids[i];
            setQueue((prev) =>
              prev.map((q) =>
                q.key === item.key
                  ? { ...q, assetId, phase: "done", progress: 100 }
                  : q,
              ),
            );
          });
          return;
        }

        const file = activeFiles[0]!;
        const item = activeItems[0]!;
        const controller = new AbortController();
        abortControllers.current.set(item.key, controller);

        await replaceMasterVideo(replaceAssetId, file, {
          productId,
          abortSignal: controller.signal,
          onProgress: (pct) => {
            if (cancelledKeys.current.has(item.key)) return;
            setQueue((prev) =>
              prev.map((q) => {
                if (q.key !== item.key) return q;
                // Late TUS progress must not overwrite terminal states.
                if (
                  q.phase === "done" ||
                  q.phase === "failed" ||
                  q.cancelled
                ) {
                  return q;
                }
                return { ...q, phase: "uploading", progress: pct };
              }),
            );
          },
        });
        abortControllers.current.delete(item.key);

        if (cancelledKeys.current.has(item.key)) return;

        const replaced = mediaAssetsRef.current.find(
          (a) => a.id === replaceAssetId,
        );
        const replaceFailed = replaced?.processingStatus === "failed";
        setQueue((prev) =>
          prev.map((q) =>
            q.key === item.key
              ? {
                  ...q,
                  assetId: replaceAssetId,
                  phase: replaceFailed ? "failed" : "done",
                  progress: replaceFailed ? q.progress : 100,
                }
              : q,
          ),
        );
        if (!replaceFailed) onUploaded?.([replaceAssetId]);
        return;
      }

      if (isImageMode) {
        const ids = await uploadMasterImages(activeFiles);
        let idIndex = 0;
        const returnedIds: string[] = [];
        items.forEach((item) => {
          const t = progressTimers.current.get(item.key);
          if (t) {
            clearInterval(t);
            progressTimers.current.delete(item.key);
          }
          if (cancelledKeys.current.has(item.key)) return;
          const assetId = ids[idIndex++];
          returnedIds.push(assetId);
          setQueue((prev) =>
            prev.map((q) =>
              q.key === item.key
                ? { ...q, assetId, phase: "done", progress: 100 }
                : q,
            ),
          );
        });
        onUploaded?.(returnedIds);
        return;
      }

      // Video: durable TUS upload with per-file abort + real progress.
      const controllers = activeItems.map((item) => {
        const c = new AbortController();
        abortControllers.current.set(item.key, c);
        return c;
      });

      const keyToActiveIndex = new Map(
        activeItems.map((item, i) => [item.key, i]),
      );

      const ids = await uploadMasterVideos(activeFiles, {
        productId,
        abortSignals: controllers.map((c) => c.signal),
        onProgress: (fileIndex, pct) => {
          const item = activeItems[fileIndex];
          if (!item || cancelledKeys.current.has(item.key)) return;
          setQueue((prev) =>
            prev.map((q) => {
              if (q.key !== item.key) return q;
              // Late TUS progress must not overwrite terminal states.
              if (
                q.phase === "done" ||
                q.phase === "failed" ||
                q.cancelled
              ) {
                return q;
              }
              return { ...q, phase: "uploading", progress: pct };
            }),
          );
        },
      });

      activeItems.forEach((item) => {
        abortControllers.current.delete(item.key);
      });

      let idIndex = 0;
      const returnedIds: string[] = [];
      items.forEach((item) => {
        if (cancelledKeys.current.has(item.key)) return;
        if (!keyToActiveIndex.has(item.key)) return;
        const assetId = ids[idIndex++];
        if (!assetId) return;
        // ids may include failed uploads — only mark done when not failed.
        const asset = mediaAssetsRef.current.find((a) => a.id === assetId);
        const uploadFailed = asset?.processingStatus === "failed";
        if (!uploadFailed) returnedIds.push(assetId);
        setQueue((prev) =>
          prev.map((q) =>
            q.key === item.key
              ? {
                  ...q,
                  assetId,
                  phase: uploadFailed ? "failed" : "done",
                  progress: uploadFailed ? q.progress : 100,
                }
              : q,
          ),
        );
      });

      onUploaded?.(returnedIds);
    } catch {
      items.forEach((item) => {
        const t = progressTimers.current.get(item.key);
        if (t) {
          clearInterval(t);
          progressTimers.current.delete(item.key);
        }
        abortControllers.current.delete(item.key);
        if (cancelledKeys.current.has(item.key)) return;
        setQueue((prev) =>
          prev.map((q) =>
            q.key === item.key
              ? { ...q, phase: "failed", progress: q.progress }
              : q,
          ),
        );
      });
    }
  };

  const cancelItem = (key: string) => {
    cancelledKeys.current.add(key);
    const controller = abortControllers.current.get(key);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(key);
    }
    const t = progressTimers.current.get(key);
    if (t) {
      clearInterval(t);
      progressTimers.current.delete(key);
    }
    setQueue((prev) =>
      prev.map((q) =>
        q.key === key
          ? { ...q, cancelled: true, phase: "failed", progress: q.progress }
          : q,
      ),
    );
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) void enqueueFiles(e.dataTransfer.files);
  };

  const statusLabel = (item: QueueItem) => {
    if (item.cancelled) return "Cancelled";
    if (item.phase === "done") {
      return isImageMode ? "Ready" : "Master ready";
    }
    if (item.phase === "processing") return "Processing preview…";
    if (item.phase === "uploading") {
      return isImageMode ? "Uploading…" : "Uploading master…";
    }
    if (item.phase === "failed") {
      return isImageMode ? "Failed" : "Upload failed";
    }
    return "Queued";
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={
        isImageMode
          ? "Upload Images"
          : replaceAssetId
            ? "Replace video file"
            : "Upload Videos"
      }
      footer={
        <AdminButton variant="secondary" onClick={onClose}>
          Close
        </AdminButton>
      }
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition",
          dragging
            ? "border-[var(--admin-accent)] bg-[var(--admin-accent)]/5"
            : "border-[var(--admin-border)] bg-[var(--admin-surface-2)]",
        )}
        onClick={() => inputRef.current?.click()}
      >
        {isImageMode ? (
          <ImageIcon className="h-6 w-6 text-[var(--admin-muted)]" />
        ) : (
          <Film className="h-6 w-6 text-[var(--admin-muted)]" />
        )}
        <Upload className="h-6 w-6" />
        <p className="text-sm font-medium text-[var(--admin-text)]">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-[var(--admin-muted)]">
          {isImageMode
            ? "PNG, JPG, WEBP supported · Uploads go to Media Library"
            : "MP4 / MOV / WEBM · Direct durable upload to private Storage (max 500 MB)"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={isImageMode ? "image/*" : "video/*"}
          multiple={!replaceAssetId}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void enqueueFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {queue.length > 0 ? (
        <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {queue.map((item) => (
            <li
              key={item.key}
              className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {item.phase === "done" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--admin-success)]" />
                ) : item.phase === "failed" ? (
                  <X className="h-4 w-4 shrink-0 text-[var(--admin-danger)]" />
                ) : (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--admin-accent)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--admin-text)]">
                    {item.file.name}
                  </p>
                  <p className="text-[11px] text-[var(--admin-muted)]">
                    {formatSizeBytes(item.file.size)} · {statusLabel(item)}
                    {item.phase === "uploading" && !isImageMode
                      ? ` · ${item.progress}%`
                      : ""}
                  </p>
                </div>
                {item.phase === "uploading" || item.phase === "queued" ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--admin-muted)] hover:text-[var(--admin-danger)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelItem(item.key);
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
              {(item.phase === "uploading" || item.phase === "processing") && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--admin-surface-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--admin-accent)] transition-[width]"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </AdminModal>
  );
}
