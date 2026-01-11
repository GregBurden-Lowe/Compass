import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon'
  size?: 'sm' | 'md'
  children?: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:opacity-40 disabled:pointer-events-none'

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
  }

  const variantClasses = {
    primary: 'bg-brand text-white hover:opacity-90 active:translate-y-px',
    secondary:
      'bg-surface text-text-primary border border-border hover:bg-app active:translate-y-px',
    ghost: 'bg-transparent text-text-primary hover:bg-app active:translate-y-px',
    icon: 'h-10 w-10 p-0 rounded-full hover:bg-app active:translate-y-px',
  }

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

