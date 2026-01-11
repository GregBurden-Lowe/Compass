import { TopBar } from '../components/layout'
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui'

export default function AdminUsers() {
  return (
    <>
      <TopBar title="User Management" />
      <div className="px-10 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-text-secondary mt-4">User management interface - to be implemented</p>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
