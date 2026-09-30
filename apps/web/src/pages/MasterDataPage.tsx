import { ResourceListPage } from '../components/ResourceListPage';
import { Tabs } from '../components/Tabs';

export function MasterDataPage() {
  return (
    <section>
      <h1>Master Data</h1>
      <Tabs
        tabs={[
          {
            label: 'Products',
            content: (
              <ResourceListPage
                title="Products"
                listPath="/products"
                createPath="/products"
                columns={[
                  { key: 'sku', label: 'SKU' },
                  { key: 'name', label: 'Name' },
                  { key: 'category', label: 'Category' },
                  { key: 'status', label: 'Status' },
                ]}
                createFields={[
                  { name: 'sku', label: 'SKU', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                  {
                    name: 'category',
                    label: 'Category',
                    type: 'select',
                    required: true,
                    options: [
                      { value: 'RAW_MATERIAL', label: 'Raw Material' },
                      { value: 'FINISHED_GOOD', label: 'Finished Good' },
                      { value: 'PACKAGING', label: 'Packaging' },
                      { value: 'CONSUMABLE', label: 'Consumable' },
                    ],
                  },
                ]}
              />
            ),
          },
          {
            label: 'Suppliers',
            content: (
              <ResourceListPage
                title="Suppliers"
                listPath="/suppliers"
                createPath="/suppliers"
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Name' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'status', label: 'Status' },
                ]}
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                  { name: 'phone', label: 'Phone', type: 'text' },
                  { name: 'email', label: 'Email', type: 'email' },
                ]}
              />
            ),
          },
          {
            label: 'Vendors',
            content: (
              <ResourceListPage
                title="Vendors"
                description="Service providers (transport, maintenance, contract labour) — distinct from raw-material Suppliers."
                listPath="/vendors"
                createPath="/vendors"
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Name' },
                  { key: 'vendorType', label: 'Type' },
                  { key: 'status', label: 'Status' },
                ]}
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                  {
                    name: 'vendorType',
                    label: 'Type',
                    type: 'select',
                    options: [
                      { value: 'TRANSPORT', label: 'Transport' },
                      { value: 'MAINTENANCE', label: 'Maintenance' },
                      { value: 'CONTRACT_LABOUR', label: 'Contract Labour' },
                      { value: 'OTHER', label: 'Other' },
                    ],
                  },
                  { name: 'contactName', label: 'Contact Name', type: 'text' },
                  { name: 'phone', label: 'Phone', type: 'text' },
                  { name: 'email', label: 'Email', type: 'email' },
                ]}
              />
            ),
          },
          {
            label: 'Customers',
            content: (
              <ResourceListPage
                title="Customers"
                listPath="/customers"
                createPath="/customers"
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Name' },
                  { key: 'creditLimit', label: 'Credit Limit' },
                  { key: 'status', label: 'Status' },
                ]}
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                  { name: 'email', label: 'Email', type: 'email' },
                  { name: 'creditLimit', label: 'Credit Limit', type: 'number', step: 0.01 },
                ]}
              />
            ),
          },
          {
            label: 'Warehouses',
            content: (
              <ResourceListPage
                title="Warehouses"
                listPath="/warehouses"
                createPath="/warehouses"
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Name' },
                  { key: 'type', label: 'Type' },
                  { key: 'status', label: 'Status' },
                ]}
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                  {
                    name: 'type',
                    label: 'Type',
                    type: 'select',
                    options: [
                      { value: 'RAW_MATERIAL', label: 'Raw Material' },
                      { value: 'FINISHED_GOODS', label: 'Finished Goods' },
                      { value: 'PACKAGING', label: 'Packaging' },
                      { value: 'GENERAL', label: 'General' },
                    ],
                  },
                ]}
              />
            ),
          },
          {
            label: 'Departments',
            content: (
              <ResourceListPage
                title="Departments"
                listPath="/departments"
                createPath="/departments"
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Name' },
                  { key: 'status', label: 'Status' },
                ]}
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                ]}
              />
            ),
          },
          {
            label: 'Employees',
            content: (
              <ResourceListPage
                title="Employees"
                listPath="/employees"
                createPath="/employees"
                columns={[
                  { key: 'employeeCode', label: 'Code' },
                  { key: 'fullName', label: 'Name' },
                  { key: 'designation', label: 'Designation' },
                  { key: 'status', label: 'Status' },
                ]}
                createFields={[
                  { name: 'employeeCode', label: 'Employee Code', type: 'text', required: true },
                  { name: 'fullName', label: 'Full Name', type: 'text', required: true },
                  { name: 'departmentId', label: 'Department', type: 'reference', endpoint: '/departments', labelKey: 'name' },
                  { name: 'designation', label: 'Designation', type: 'text' },
                  { name: 'phone', label: 'Phone', type: 'text' },
                  { name: 'email', label: 'Email', type: 'email' },
                ]}
              />
            ),
          },
          {
            label: 'Locations',
            content: (
              <ResourceListPage
                title="Locations"
                listPath="/locations"
                createPath="/locations"
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Name' },
                  { key: 'type', label: 'Type' },
                  { key: 'status', label: 'Status' },
                ]}
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                  { name: 'warehouseId', label: 'Warehouse', type: 'reference', endpoint: '/warehouses', labelKey: 'name' },
                  {
                    name: 'type',
                    label: 'Type',
                    type: 'select',
                    options: [
                      { value: 'STORAGE', label: 'Storage' },
                      { value: 'BAY', label: 'Bay' },
                      { value: 'RACK', label: 'Rack' },
                      { value: 'YARD', label: 'Yard' },
                      { value: 'DOCK', label: 'Dock' },
                    ],
                  },
                ]}
              />
            ),
          },
          {
            label: 'Machines',
            content: (
              <ResourceListPage
                title="Machines"
                listPath="/machines"
                createPath="/machines"
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Name' },
                  { key: 'capacityPerHour', label: 'Capacity/hr' },
                  { key: 'status', label: 'Status' },
                ]}
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                  { name: 'machineType', label: 'Type', type: 'text' },
                  { name: 'locationId', label: 'Location', type: 'reference', endpoint: '/locations', labelKey: 'name' },
                  { name: 'capacityPerHour', label: 'Capacity per Hour', type: 'number', step: 0.01 },
                ]}
              />
            ),
          },
          {
            label: 'Units of Measure',
            content: (
              <ResourceListPage
                title="Units of Measure"
                listPath="/units-of-measure"
                createPath="/units-of-measure"
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Name' },
                  { key: 'category', label: 'Category' },
                ]}
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                  {
                    name: 'category',
                    label: 'Category',
                    type: 'select',
                    options: [
                      { value: 'WEIGHT', label: 'Weight' },
                      { value: 'COUNT', label: 'Count' },
                      { value: 'VOLUME', label: 'Volume' },
                      { value: 'AREA', label: 'Area' },
                      { value: 'OTHER', label: 'Other' },
                    ],
                  },
                ]}
              />
            ),
          },
          {
            label: 'Packaging Types',
            content: (
              <ResourceListPage
                title="Packaging Types"
                listPath="/packaging-types"
                createPath="/packaging-types"
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Name' },
                  { key: 'capacityValue', label: 'Capacity' },
                ]}
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                  { name: 'capacityValue', label: 'Capacity Value', type: 'number', step: 0.01 },
                  { name: 'capacityUnitId', label: 'Capacity Unit', type: 'reference', endpoint: '/units-of-measure', labelKey: 'code' },
                ]}
              />
            ),
          },
          {
            label: 'QC Parameters',
            content: (
              <ResourceListPage
                title="QC Parameters"
                description="Referenced by product_grade_qc_specs (see docs/database-schema.md) and by Quality's Add Result form."
                listPath="/qc-parameters"
                createPath="/qc-parameters"
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Name' },
                  { key: 'dataType', label: 'Data Type' },
                ]}
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                  {
                    name: 'dataType',
                    label: 'Data Type',
                    type: 'select',
                    options: [
                      { value: 'NUMERIC', label: 'Numeric' },
                      { value: 'TEXT', label: 'Text' },
                      { value: 'BOOLEAN', label: 'Boolean' },
                    ],
                  },
                  { name: 'unitId', label: 'Unit', type: 'reference', endpoint: '/units-of-measure', labelKey: 'code' },
                ]}
              />
            ),
          },
        ]}
      />
    </section>
  );
}
