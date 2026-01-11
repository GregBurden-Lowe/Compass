import { Input } from '../ui'

interface TopBarProps {
  title?: string
  actions?: React.ReactNode
}

export function TopBar({ title, actions }: TopBarProps) {
  return (
    <div className="h-16 px-10 flex items-center justify-between gap-6 bg-app border-b border-border">
      {title ? (
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
      ) : (
        <div className="w-full max-w-md">
          <Input
            type="search"
            placeholder="Search complaints..."
            leadingIcon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        </div>
      )}
      <div className="flex items-center gap-3">{actions}</div>
    </div>
  )
}

