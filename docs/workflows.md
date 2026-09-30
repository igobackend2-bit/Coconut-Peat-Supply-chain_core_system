# Coco Pith Factory — Workflows

**Status:** STUB — not yet written.

Must document the concrete step-by-step business workflows implementing
the end-to-end traceability chain from `product-requirements.md` §1:

`Supplier → Vehicle → Weighment → Raw Material Lot → Production Batch →
QC → Finished Product → Packing Lot → Warehouse → Sales Order →
Dispatch → Customer`

and the processing-stage flow from `product-requirements.md` §4.6
(Receiving → Cleaning → Fibre/pith separation → Screening → Washing →
Buffering → Drying → Sieving → Compression → Block/brick formation →
Packing → Finished-goods QC → Warehouse release).

## TODO

- [ ] Procure-to-pay workflow (PR → PO → Goods Receipt → Invoice → Payment)
- [ ] Gate-to-lot workflow (Gate Entry → Weighment → Raw Material Lot)
- [ ] Production workflow (Plan → Order → Batch → Stages → Output → Closure)
- [ ] QC workflow (Sampling → Testing → Decision → Release/Hold/Reject → CAPA)
- [ ] Order-to-cash workflow (Quotation → Sales Order → Packing → Dispatch →
      Invoice → Payment)
- [ ] Export workflow (Proforma → Commercial Invoice → Container → Shipment
      → Milestones)
- [ ] Each workflow diagram must show where an `audit_events` entry and,
      where applicable, an AI agent proposal/approval step occurs.
