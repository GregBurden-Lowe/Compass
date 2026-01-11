import { Sidebar } from './Sidebar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-app text-text-primary">
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">{children}</div>
    </div>
  )
}

