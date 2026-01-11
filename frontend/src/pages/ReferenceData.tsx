import { TopBar } from '../components/layout'
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui'

export default function ReferenceData() {
  return (
    <>
      <TopBar title="Reference Data" />
      <div className="px-10 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Reference Data Management</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-text-secondary mt-4">Reference data management - to be implemented</p>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
