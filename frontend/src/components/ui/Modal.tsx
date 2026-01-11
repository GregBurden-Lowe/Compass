import React, { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ open, onClose, children }: ModalProps) {
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

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 w-[min(560px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-modal border border-border bg-surface p-6 shadow-xl z-50">
        {children}
      </div>
    </>
  )
}

interface ModalHeaderProps {
  children: React.ReactNode
  onClose?: () => void
}

export function ModalHeader({ children, onClose }: ModalHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-text-primary">{children}</h2>
      {onClose && (
        <button
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-app hover:text-text-primary transition"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

interface ModalBodyProps {
  children: React.ReactNode
}

export function ModalBody({ children }: ModalBodyProps) {
  return <div className="text-sm text-text-secondary">{children}</div>
}

interface ModalFooterProps {
  children: React.ReactNode
}

export function ModalFooter({ children }: ModalFooterProps) {
  return <div className="mt-6 flex justify-end gap-3">{children}</div>
}

