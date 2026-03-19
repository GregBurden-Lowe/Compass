/**
 * EmailPreviewModal
 *
 * Renders a parsed EML / MSG email in a wide modal without requiring the user
 * to download the file and open it in a desktop mail client.
 *
 * HTML email bodies are rendered inside a sandboxed <iframe> using the
 * `srcdoc` attribute. The iframe has no `allow-scripts` permission, so any
 * JavaScript embedded in the email cannot execute.
 */

import { useEffect, useRef } from 'react'
import { EmailPreview } from '../types'

interface EmailPreviewModalProps {
  open: boolean
  onClose: () => void
  /** Original filename, shown in the modal header (e.g. "complaint-chain.eml"). */
  fileName: string
  /** True while the API call is in progress. */
  loading: boolean
  /** Null until loaded, or if parsing failed. */
  data: EmailPreview | null
  /** Static download URL for the original file (/attachments/…). */
  downloadUrl: string
}

export function EmailPreviewModal({
  open,
  onClose,
  fileName,
  loading,
  data,
  downloadUrl,
}: EmailPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Lock body scroll while open (mirrors the existing Modal component)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  /**
   * After the iframe loads, resize it to fit the email body height so the
   * outer modal scroll handles overflow (not a scrollbar inside a fixed-height
   * iframe). Capped at 600 px to prevent extremely long emails from pushing
   * modal controls off screen.
   */
  const handleIframeLoad = () => {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (doc?.body) {
        const h = Math.min(doc.body.scrollHeight + 20, 600)
        iframe.style.height = `${h}px`
      }
    } catch {
      // Cross-origin sandbox may block access in some browsers — fall back to
      // the default height set via the style attribute.
    }
  }

  if (!open) return null

  // ── Header rows helper ───────────────────────────────────────────────────
  const HeaderRow = ({ label, value }: { label: string; value?: string }) => {
    if (!value) return null
    return (
      <div className="flex gap-3 text-sm py-1.5 border-b border-border last:border-0">
        <span className="w-16 flex-shrink-0 text-text-muted font-medium text-xs uppercase tracking-wide pt-0.5">
          {label}
        </span>
        <span className="text-text-primary break-all">{value}</span>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Modal panel — wider than the standard Modal (max 900 px) */}
      <div
        className="fixed left-1/2 top-1/2 w-[min(900px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-modal border border-border bg-surface shadow-xl z-50 max-h-[90vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={`Email preview: ${fileName}`}
      >
        {/* ── Title bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Envelope icon */}
            <svg
              className="h-4 w-4 text-text-muted flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            <h2 className="text-sm font-semibold text-text-primary truncate">{fileName}</h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-app hover:text-text-primary transition"
            aria-label="Close preview"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable content area ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <svg
                className="animate-spin h-8 w-8 text-brand"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm text-text-secondary">Parsing email…</p>
            </div>
          )}

          {/* Error / parse failure */}
          {!loading && !data && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <svg
                className="h-10 w-10 text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">Could not parse email file</p>
                <p className="mt-1 text-xs text-text-secondary">The file may be corrupted or in an unsupported format.</p>
              </div>
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary hover:bg-app transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download original
              </a>
            </div>
          )}

          {/* Parsed email content */}
          {!loading && data && (
            <>
              {/* Email header strip */}
              <div className="px-5 py-3 border-b border-border bg-app/40">
                <HeaderRow label="Subject" value={data.subject || '(no subject)'} />
                <HeaderRow label="From" value={data.from_} />
                <HeaderRow label="To" value={data.to} />
                {data.cc && <HeaderRow label="CC" value={data.cc} />}
                <HeaderRow label="Date" value={data.date} />
              </div>

              {/* Email body */}
              <div className="p-0">
                {data.has_html && data.html_body ? (
                  <iframe
                    ref={iframeRef}
                    // srcdoc renders the HTML inside the iframe without a network
                    // request. sandbox prevents script execution while allowing
                    // CSS rendering and external links (allow-popups).
                    srcdoc={data.html_body}
                    sandbox="allow-same-origin allow-popups"
                    title="Email body"
                    className="w-full border-0 block"
                    style={{ height: '500px', minHeight: '200px' }}
                    onLoad={handleIframeLoad}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-text-primary leading-relaxed overflow-auto max-h-[600px] p-5">
                    {data.plain_body || '(No message body)'}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border flex-shrink-0">
          <a
            href={downloadUrl}
            download
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-text-primary hover:bg-app transition"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download original
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-border bg-surface text-xs text-text-primary hover:bg-app transition"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}
