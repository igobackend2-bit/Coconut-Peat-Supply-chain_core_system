import { ActionButton } from '../components/ActionButton';
import { ResourceListPage } from '../components/ResourceListPage';
import { Tabs } from '../components/Tabs';
import { PageHeader } from '../components/ui';
import { money, when } from '../lib/format';
import { apiPost } from '../lib/api';
import { useLookup } from '../lib/useLookup';

interface Customer { id: string; code: string; name: string; country: string; email: string | null }
interface Proforma { id: string; invoiceNumber: string; exportCustomerId: string; currency: string; totalAmount: string; status: string }
interface Commercial { id: string; invoiceNumber: string; exportCustomerId: string; currency: string; totalAmount: string; status: string; issuedAt: string }
interface Container { id: string; containerNumber: string; commercialInvoiceId: string; destinationPort: string | null; sealNumber: string | null; status: string }
interface Item { id: string; productId: string; quantity: string; unitPrice: string; lineTotal: string }
interface Milestone { id: string; milestone: string; notes: string | null; occurredAt: string }

const MILESTONES = ['LOADED', 'GATED_OUT', 'DEPARTED', 'ARRIVED', 'CUSTOMS_CLEARED', 'DELIVERED'];

export function ExportPage() {
  const customer = useLookup('/export-customers', (r) => `${r.name} (${r.country})`);
  const sku = useLookup('/products', (r) => String(r.sku));
  const invoice = useLookup('/commercial-invoices', (r) => String(r.invoiceNumber));

  return (
    <section>
      <PageHeader
        title="Export"
        description="Proforma → commercial invoice → container → shipment milestones. Each step only opens once the previous one is complete, and milestones can only move forward."
      />
      <Tabs
        tabs={[
          {
            label: 'Proforma invoices',
            content: (
              <ResourceListPage<Proforma>
                title="Proforma invoices"
                description="Draft the offer, add line items, issue it, then convert it into the commercial invoice. A converted proforma can't be invoiced twice."
                listPath="/proforma-invoices"
                createPath="/proforma-invoices"
                createLabel="New proforma"
                createFields={[
                  { name: 'exportCustomerId', label: 'Export customer', type: 'reference', endpoint: '/export-customers', labelKey: 'name', labelFn: (c) => `${c.name} (${c.country})`, required: true },
                  { name: 'currency', label: 'Currency', type: 'text', defaultValue: 'USD', hint: '3-letter code, e.g. USD, EUR' },
                ]}
                columns={[
                  { key: 'invoiceNumber', label: 'Number', mono: true },
                  { key: 'exportCustomerId', label: 'Customer', render: (r) => customer(r.exportCustomerId) },
                  { key: 'currency', label: 'Cur.' },
                  { key: 'totalAmount', label: 'Total', align: 'right', render: (r) => money(r.totalAmount) },
                  { key: 'status', label: 'Status' },
                ]}
                rowActions={(r, reload) => (
                  <>
                    {r.status === 'DRAFT' && <ActionButton label="Issue" tone="primary" run={() => apiPost(`/proforma-invoices/${r.id}/issue`)} onDone={reload} />}
                    {r.status === 'ISSUED' && <ActionButton label="Convert to invoice" tone="primary" run={() => apiPost(`/proforma-invoices/${r.id}/convert`)} onDone={reload} />}
                    {(r.status === 'DRAFT' || r.status === 'ISSUED') && <ActionButton label="Cancel" tone="danger" run={() => apiPost(`/proforma-invoices/${r.id}/cancel`)} onDone={reload} />}
                  </>
                )}
                detailLabel="Line items"
                renderDetail={(r, reload) => (
                  <ResourceListPage<Item>
                    variant="nested"
                    title="Line items"
                    description={r.status === 'DRAFT' ? undefined : 'Items are locked once the proforma is issued.'}
                    listPath={`/proforma-invoices/${r.id}/items`}
                    createPath={`/proforma-invoices/${r.id}/items`}
                    createLabel="Add item"
                    onChanged={reload}
                    createFields={
                      r.status === 'DRAFT'
                        ? [
                            { name: 'productId', label: 'Product', type: 'reference', endpoint: '/products', labelKey: 'sku', required: true },
                            { name: 'quantity', label: 'Quantity', type: 'number', required: true, min: 0 },
                            { name: 'unitPrice', label: 'Unit price', type: 'number', step: 0.01, required: true, min: 0 },
                          ]
                        : undefined
                    }
                    columns={[
                      { key: 'productId', label: 'Product', render: (i) => sku(i.productId) },
                      { key: 'quantity', label: 'Quantity', align: 'right' },
                      { key: 'unitPrice', label: 'Unit price', align: 'right', render: (i) => money(i.unitPrice) },
                      { key: 'lineTotal', label: 'Line total', align: 'right', render: (i) => money(i.lineTotal) },
                    ]}
                  />
                )}
              />
            ),
          },
          {
            label: 'Commercial invoices',
            content: (
              <ResourceListPage<Commercial>
                title="Commercial invoices"
                description="Created by converting an issued proforma — there's no manual create. Mark paid once the remittance lands."
                listPath="/commercial-invoices"
                emptyHint="Issue a proforma invoice and convert it, and the commercial invoice appears here."
                columns={[
                  { key: 'invoiceNumber', label: 'Number', mono: true },
                  { key: 'exportCustomerId', label: 'Customer', render: (r) => customer(r.exportCustomerId) },
                  { key: 'currency', label: 'Cur.' },
                  { key: 'totalAmount', label: 'Total', align: 'right', render: (r) => money(r.totalAmount) },
                  { key: 'issuedAt', label: 'Issued', render: (r) => when(r.issuedAt) },
                  { key: 'status', label: 'Status' },
                ]}
                rowActions={(r, reload) =>
                  r.status === 'ISSUED' ? <ActionButton label="Mark paid" run={() => apiPost(`/commercial-invoices/${r.id}/mark-paid`)} onDone={reload} /> : null
                }
              />
            ),
          },
          {
            label: 'Containers',
            content: (
              <ResourceListPage<Container>
                title="Containers"
                description="Book a container against a commercial invoice, then record milestones as it moves. The container's status follows its latest milestone."
                listPath="/containers"
                createPath="/containers"
                createLabel="Book container"
                createFields={[
                  { name: 'commercialInvoiceId', label: 'Commercial invoice', type: 'reference', endpoint: '/commercial-invoices', labelKey: 'invoiceNumber', filter: (i) => i.status !== 'CANCELLED', required: true },
                  { name: 'containerNumber', label: 'Container number', type: 'text', required: true },
                  { name: 'sealNumber', label: 'Seal number', type: 'text' },
                  { name: 'destinationPort', label: 'Destination port', type: 'text' },
                ]}
                columns={[
                  { key: 'containerNumber', label: 'Container', mono: true },
                  { key: 'commercialInvoiceId', label: 'Invoice', render: (r) => invoice(r.commercialInvoiceId) },
                  { key: 'destinationPort', label: 'Destination' },
                  { key: 'sealNumber', label: 'Seal', mono: true },
                  { key: 'status', label: 'Status' },
                ]}
                detailLabel="Milestones"
                renderDetail={(r, reload) => {
                  const closed = r.status === 'DELIVERED' || r.status === 'CANCELLED';
                  return (
                    <ResourceListPage<Milestone>
                      variant="nested"
                      title="Shipment trail"
                      description={closed ? `Container is ${r.status.toLowerCase()} — no further milestones.` : 'Milestones only move forward; a step already passed can’t be recorded again.'}
                      listPath={`/containers/${r.id}/milestones`}
                      createPath={`/containers/${r.id}/milestones`}
                      createLabel="Record milestone"
                      onChanged={reload}
                      createFields={
                        closed
                          ? undefined
                          : [
                              { name: 'milestone', label: 'Milestone', type: 'select', required: true, options: MILESTONES.map((m) => ({ value: m, label: m.replaceAll('_', ' ').toLowerCase() })) },
                              { name: 'notes', label: 'Notes', type: 'text' },
                            ]
                      }
                      columns={[
                        { key: 'milestone', label: 'Milestone', badge: true },
                        { key: 'occurredAt', label: 'When', render: (m) => when(m.occurredAt) },
                        { key: 'notes', label: 'Notes' },
                      ]}
                    />
                  );
                }}
              />
            ),
          },
          {
            label: 'Customers',
            content: (
              <ResourceListPage<Customer>
                title="Export customers"
                description="Overseas buyers, kept separate from domestic customers because they carry a country and are invoiced in a foreign currency."
                listPath="/export-customers"
                createPath="/export-customers"
                createLabel="New customer"
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                  { name: 'country', label: 'Country', type: 'text', required: true },
                  { name: 'contactName', label: 'Contact', type: 'text' },
                  { name: 'email', label: 'Email', type: 'email' },
                  { name: 'phone', label: 'Phone', type: 'text' },
                  { name: 'address', label: 'Address', type: 'textarea' },
                ]}
                columns={[
                  { key: 'code', label: 'Code', mono: true },
                  { key: 'name', label: 'Name' },
                  { key: 'country', label: 'Country' },
                  { key: 'email', label: 'Email' },
                ]}
              />
            ),
          },
        ]}
      />
    </section>
  );
}
