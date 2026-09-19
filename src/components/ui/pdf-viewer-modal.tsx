"use client";

interface PdfViewerModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

// Visionneuse PDF intégrée à l'app : le PDF est rendu par le moteur natif
// du navigateur dans un <iframe>, sans téléchargement forcé ni nouvel
// onglet, et sans dépendance ou service tiers.
export function PdfViewerModal({ url, title, onClose }: PdfViewerModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black/80" onClick={onClose}>
      <div
        className="flex items-center justify-between gap-3 border-b border-surface-border bg-background-elevated px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="truncate text-sm font-medium">{title}</p>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-white/10 hover:text-foreground"
          aria-label="Fermer"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 bg-white" onClick={(e) => e.stopPropagation()}>
        <iframe src={url} title={title} className="h-full w-full border-0" />
      </div>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
