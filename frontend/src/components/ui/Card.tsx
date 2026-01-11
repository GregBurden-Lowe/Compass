import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  selected?: boolean
  inverse?: boolean
}

export function Card({ children, className = '', onClick, selected, inverse }: CardProps) {
  const baseClasses = 'rounded-card border shadow-card p-4'
  
  const variantClasses = inverse
    ? 'bg-brand text-white border-transparent'
    : 'bg-surface text-text-primary border-border'
  
  const selectedClasses = selected ? 'ring-2 ring-brand/15' : ''
  
  const interactiveClasses = onClick
    ? 'cursor-pointer hover:shadow-sm active:translate-y-px transition'
    : ''

  return (
    <div
      className={`${baseClasses} ${variantClasses} ${selectedClasses} ${interactiveClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`flex items-start justify-between gap-3 ${className}`}>{children}</div>
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
  inverse?: boolean
}

export function CardTitle({ children, className = '', inverse }: CardTitleProps) {
  const colorClass = inverse ? 'text-white' : 'text-text-primary'
  return <h3 className={`text-sm font-semibold ${colorClass} ${className}`}>{children}</h3>
}

interface CardBodyProps {
  children: React.ReactNode
  className?: string
  inverse?: boolean
}

export function CardBody({ children, className = '', inverse }: CardBodyProps) {
  const colorClass = inverse ? 'text-white/80' : 'text-text-secondary'
  return <div className={`mt-2 text-xs leading-relaxed ${colorClass} ${className}`}>{children}</div>
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-4 flex items-center justify-between text-xs text-text-muted ${className}`}>
      {children}
    </div>
  )
}

