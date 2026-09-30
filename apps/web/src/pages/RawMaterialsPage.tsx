import { ResourceListPage } from '../components/ResourceListPage';

export function RawMaterialsPage() {
  return (
    <ResourceListPage
      title="Raw Material Lots"
      description="Created from a Goods Receipt (see Procurement) — product and supplier are derived from the receipt's Purchase Order, not entered here."
      listPath="/raw-material-lots"
      createPath="/raw-material-lots"
      columns={[
        { key: 'lotNumber', label: 'Lot Number' },
        { key: 'quantityKg', label: 'Quantity (kg)' },
        { key: 'moistureContentPercent', label: 'Moisture %' },
        { key: 'status', label: 'Status' },
      ]}
      createFields={[
        { name: 'goodsReceiptId', label: 'Goods Receipt', type: 'reference', endpoint: '/goods-receipts', labelKey: 'grnNumber', required: true },
        { name: 'quantityKg', label: 'Quantity (kg)', type: 'number', step: 0.01, required: true },
        { name: 'moistureContentPercent', label: 'Moisture %', type: 'number', step: 0.01 },
      ]}
    />
  );
}
