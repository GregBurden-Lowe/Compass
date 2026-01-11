import React from 'react'

interface TableProps {
  children: React.ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-hidden rounded-card border border-border bg-surface ${className}`}>
      <table className="w-full table-auto">{children}</table>
    </div>
  )
}

interface TableHeaderProps {
  children: React.ReactNode
}

export function TableHeader({ children }: TableHeaderProps) {
  return <thead className="bg-app">{children}</thead>
}

interface TableBodyProps {
  children: React.ReactNode
}

export function TableBody({ children }: TableBodyProps) {
  return <tbody>{children}</tbody>
}

interface TableRowProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export function TableRow({ children, onClick, className = '' }: TableRowProps) {
  const interactiveClasses = onClick
    ? 'cursor-pointer hover:bg-app/60'
    : 'hover:bg-app/60'

  return (
    <tr
      className={`border-t border-border ${interactiveClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

interface TableHeadProps {
  children: React.ReactNode
  className?: string
}

export function TableHead({ children, className = '' }: TableHeadProps) {
  return (
    <th className={`h-10 px-4 text-left text-xs font-semibold text-text-secondary ${className}`}>
      {children}
    </th>
  )
}

interface TableCellProps {
  children: React.ReactNode
  className?: string
}

export function TableCell({ children, className = '' }: TableCellProps) {
  return <td className={`h-12 px-4 text-sm text-text-primary ${className}`}>{children}</td>
}

