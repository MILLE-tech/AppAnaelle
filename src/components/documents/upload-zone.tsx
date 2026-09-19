"use client";

import { useRef, useState } from "react";
import { clsx } from "@/lib/utils/clsx";

interface UploadZoneProps {
  onFilesSelected: (files: File[], keepOriginal: boolean) => void;
  disabled: boolean;
  progressLabel: string | null;
}

export function UploadZone({ onFilesSelected, disabled, progressLabel }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [keepOriginal, setKeepOriginal] = useState(true);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onFilesSelected(Array.from(fileList), keepOriginal);
  }

  return (
    <div className="glass-card p-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors",
          dragActive ? "border-accent bg-accent-soft" : "border-surface-border",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <UploadIcon className="h-8 w-8 text-muted" />
        {progressLabel ? (
          <p className="text-sm font-medium text-foreground">{progressLabel}</p>
        ) : (
          <>
            <p className="text-sm font-medium">Dépose tes PDF ou photos de cours ici</p>
            <p className="text-xs text-muted">ou clique pour parcourir — PDF, JPG, PNG</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={keepOriginal}
          onChange={(e) => setKeepOriginal(e.target.checked)}
          disabled={disabled}
          className="h-3.5 w-3.5 rounded border-surface-border accent-accent"
        />
        Conserver le fichier original après extraction (permet de le rouvrir depuis la
        matière — décoche pour économiser l&apos;espace de stockage)
      </label>
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 15V4m0 0 4 4m-4-4-4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
