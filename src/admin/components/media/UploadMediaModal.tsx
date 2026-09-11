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
}: {
  open: boolean;
  onClose: () => void;
  onUploaded?: (ids: string[]) => void;
  /** When set, the first selected file replaces this asset's master and regenerates preview. */
  replaceAssetId?: string;
  /** Upload still images or master videos into the Media Library. */
  mode?: "video" | "image";
}) {
  const { uploadMasterVideos, uploadMasterImages, replaceMasterVideo, mediaAssets } = useAdmin();
  const isImageMode = mode === "image";
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const cancelledKeys = useRef<Set<string>>(new Set());

  const clearTimers = useCallback(() => {
    progressTimers.current.forEach((t) => clearInterval(t));
    progressTimers.current.clear();
  }, []);

  useEffect(() => {
    if (!open) {
      clearTimers();
      setQueue([]);
      cancelledKeys.current.clear();
      setDragging(false);
    }
  }, [open, clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    setQueue((prev) =>
      prev.map((item) => {
        if (!item.assetId || item.cancelled) return item;
        const asset = mediaAssets.find((a) => a.id === item.assetId);
        if (!asset) return item;
        if (asset.processingStatus === "ready") {
          return { ...item, phase: "done", progress: 100 };
        }
        if (asset.processingStatus === "failed") {
          return { ...item, phase: "failed", progress: item.progress };
        }
        if (
          asset.processingStatus === "processing" ||
          asset.processingStatus === "uploaded"
        ) {
          return {
            ...item,
            phase: "processing",
            progress: Math.max(item.progress, 70),
          };
        }
        return item;
      }),
    );
  }, [mediaAssets]);

  const enqueueFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter(isImageMode ? isImageFile : isVideoFile);
    if (!list.length) return;

    const items: QueueItem[] = list.map((file) => ({
      key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      phase: "queued",
      progress: 0,
    }));

    setQueue((prev) => [...prev, ...items]);

    items.forEach((item) => {
      setQueue((prev) =>
        prev.map((q) => (q.key === item.key ? { ...q, phase: "uploading", progress: 8 } : q)),
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

    try {
      const activeFiles = items
        .filter((item) => !cancelledKeys.current.has(item.key))
        .map((item) => item.file);

      if (!activeFiles.length) return;

      if (replaceAssetId) {
        if (isImageMode) {
          // Image replace not supported in this modal — upload as new assets instead.
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
        const file = activeFiles[0];
        const item = items[0];
        await replaceMasterVideo(replaceAssetId, file);
        const t = progressTimers.current.get(item.key);
        if (t) {
          clearInterval(t);
          progressTimers.current.delete(item.key);
        }
        setQueue((prev) =>
          prev.map((q) =>
            q.key === item.key
              ? {
                  ...q,
                  assetId: replaceAssetId,
                  phase: "processing",
                  progress: Math.max(q.progress, 70),
                }
              : q,
          ),
        );
        onUploaded?.([replaceAssetId]);
        return;
      }

      const ids = isImageMode
        ? await uploadMasterImages(activeFiles)
        : await uploadMasterVideos(activeFiles);
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
              ? {
                  ...q,
                  assetId,
                  phase: isImageMode ? "done" : "processing",
                  progress: isImageMode ? 100 : Math.max(q.progress, 70),
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
        if (cancelledKeys.current.has(item.key)) return;
        setQueue((prev) =>
          prev.map((q) =>
            q.key === item.key ? { ...q, phase: "failed", progress: q.progress } : q,
          ),
        );
      });
    }
  };

  const cancelItem = (key: string) => {
    cancelledKeys.current.add(key);
    const t = progressTimers.current.get(key);
    if (t) {
      clearInterval(t);
      progressTimers.current.delete(key);
    }
    setQueue((prev) =>
      prev.map((q) =>
        q.key === key ? { ...q, cancelled: true, phase: "failed", progress: q.progress } : q,
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
    if (item.phase === "done") return "Ready";
    if (item.phase === "processing")
      return isImageMode ? "Saving…" : "Processing preview…";
    if (item.phase === "uploading") return "Uploading…";
    if (item.phase === "failed") return "Failed";
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
      wide
      footer={
        <>
          <AdminButton variant="secondary" onClick={onClose}>
            Continue in background
          </AdminButton>
          <AdminButton variant="primary" onClick={() => inputRef.current?.click()}>
            Browse Files
          </AdminButton>
        </>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept={
          isImageMode
            ? "image/png,image/jpeg,image/webp,image/gif,image/avif,.png,.jpg,.jpeg,.webp,.gif,.avif"
            : "video/mp4,video/webm,video/quicktime,video/*,.mp4,.mov,.webm,.m4v"
        }
        multiple={!replaceAssetId}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void enqueueFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center transition",
          dragging
            ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]"
            : "border-[var(--admin-border)] bg-[var(--admin-surface-2)]",
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-[var(--admin-shadow-sm)]">
          <Upload className="h-6 w-6" />
        </span>
        <div>
          <p className="text-base font-semibold text-[var(--admin-text)]">
            {isImageMode ? "DROP IMAGES HERE" : "DROP MASTER VIDEOS HERE"}
          </p>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">or Browse Files</p>
          <p className="mt-2 text-xs text-[var(--admin-muted)]">
            {isImageMode
              ? "PNG, JPG, WEBP supported · Uploads go to Media Library"
              : "MP4 and MOV supported · Single or bulk upload"}
          </p>
        </div>
        <AdminButton variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          Browse Files
        </AdminButton>
      </div>

      {queue.length ? (
        <ul className="mt-5 max-h-72 space-y-3 overflow-y-auto">
          {queue.map((item) => (
            <li
              key={item.key}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-surface-2)] text-[var(--admin-muted)]">
                    {isImageMode ? (
                      <ImageIcon className="h-4 w-4" />
                    ) : (
                      <Film className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--admin-text)]">
                      {item.file.name}
                    </p>
                    <p className="text-[11px] text-[var(--admin-muted)]">
                      {formatSizeBytes(item.file.size)} · {statusLabel(item)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.phase === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--admin-success)]" />
                  ) : item.phase === "failed" || item.cancelled ? (
                    <X className="h-4 w-4 text-[var(--admin-danger)]" />
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--admin-accent)]" />
                      {(item.phase === "queued" || item.phase === "uploading") && (
                        <button
                          type="button"
                          onClick={() => cancelItem(item.key)}
                          className="rounded-md p-1 text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-danger)]"
                          aria-label="Cancel upload"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--admin-surface-2)]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    item.phase === "failed" || item.cancelled
                      ? "bg-[var(--admin-danger)]"
                      : item.phase === "done"
                        ? "bg-[var(--admin-success)]"
                        : "bg-[var(--admin-accent)]",
                  )}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </AdminModal>
  );
}
