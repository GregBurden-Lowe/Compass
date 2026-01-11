import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  leadingIcon?: React.ReactNode
}

export function Input({ error, leadingIcon, className = '', ...props }: InputProps) {
  const baseClasses =
    'w-full h-10 rounded-lg border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition'

  const stateClasses = error
    ? 'border-semantic-error focus:border-semantic-error focus:ring-2 focus:ring-semantic-error/15'
    : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/15'

  const paddingClass = leadingIcon ? 'pl-10' : 'px-3'

  return (
    <div className="relative">
      {leadingIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted">
          {leadingIcon}
        </div>
      )}
      <input
        className={`${baseClasses} ${stateClasses} ${paddingClass} ${className}`}
        {...props}
      />
    </div>
  )
}

