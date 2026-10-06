import { PageHeader } from '../components/ui';
import { ResourceListPage } from '../components/ResourceListPage';
import { Tabs } from '../components/Tabs';

export function GateWeighmentPage() {
  return (
    <section>
      <PageHeader title="Gate & Weighment" description="Vehicles, drivers and the weighbridge. A gate entry can only be weighed once; weighments feed Goods Receipts and raw-material traceability." />
      <Tabs
        tabs={[
          {
            label: 'Vehicles',
            content: (
              <ResourceListPage
                title="Vehicles"
                listPath="/vehicles"
                createPath="/vehicles"
                columns={[
                  { key: 'registrationNumber', label: 'Registration' },
                  { key: 'vehicleType', label: 'Type' },
                  { key: 'capacityKg', label: 'Capacity (kg)' },
                  { key: 'status', label: 'Status' },
                ]}
                createFields={[
                  { name: 'registrationNumber', label: 'Registration Number', type: 'text', required: true },
                  { name: 'vehicleType', label: 'Type', type: 'text' },
                  { name: 'capacityKg', label: 'Capacity (kg)', type: 'number' },
                ]}
              />
            ),
          },
          {
            label: 'Drivers',
            content: (
              <ResourceListPage
                title="Drivers"
                listPath="/drivers"
                createPath="/drivers"
                columns={[
                  { key: 'fullName', label: 'Name' },
                  { key: 'licenseNumber', label: 'License' },
                  { key: 'phone', label: 'Phone' },
                ]}
                createFields={[
                  { name: 'fullName', label: 'Full Name', type: 'text', required: true },
                  { name: 'licenseNumber', label: 'License Number', type: 'text' },
                  { name: 'phone', label: 'Phone', type: 'text' },
                ]}
              />
            ),
          },
          {
            label: 'Gate Entries',
            content: (
              <ResourceListPage
                title="Gate Entries"
                listPath="/gate-entries"
                createPath="/gate-entries"
                columns={[
                  { key: 'vehicleId', label: 'Vehicle' },
                  { key: 'direction', label: 'Direction' },
                  { key: 'status', label: 'Status' },
                  { key: 'entryTime', label: 'Entry Time' },
                ]}
                createFields={[
                  { name: 'vehicleId', label: 'Vehicle', type: 'reference', endpoint: '/vehicles', labelKey: 'registrationNumber', required: true },
                  { name: 'driverId', label: 'Driver', type: 'reference', endpoint: '/drivers', labelKey: 'fullName' },
                  { name: 'supplierId', label: 'Supplier', type: 'reference', endpoint: '/suppliers', labelKey: 'name' },
                  { name: 'purpose', label: 'Purpose', type: 'text' },
                ]}
              />
            ),
          },
          {
            label: 'Weighments',
            content: (
              <ResourceListPage
                title="Weighments"
                description="A gate entry can only be weighed once — the backend enforces this both at the database level and with a clear error here."
                listPath="/weighments"
                createPath="/weighments"
                columns={[
                  { key: 'gateEntryId', label: 'Gate Entry' },
                  { key: 'grossWeightKg', label: 'Gross (kg)' },
                  { key: 'tareWeightKg', label: 'Tare (kg)' },
                  { key: 'netWeightKg', label: 'Net (kg)' },
                ]}
                createFields={[
                  { name: 'gateEntryId', label: 'Gate Entry', type: 'reference', endpoint: '/gate-entries', labelKey: 'id', required: true },
                  { name: 'productId', label: 'Product', type: 'reference', endpoint: '/products', labelKey: 'sku' },
                  { name: 'grossWeightKg', label: 'Gross Weight (kg)', type: 'number', step: 0.01, required: true },
                  { name: 'tareWeightKg', label: 'Tare Weight (kg)', type: 'number', step: 0.01, required: true },
                ]}
              />
            ),
          },
        ]}
      />
    </section>
  );
}
