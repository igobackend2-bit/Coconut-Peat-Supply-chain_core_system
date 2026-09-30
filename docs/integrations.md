# Coco Pith Factory — Integrations

**Status:** STUB — not yet written.

Must document each external integration listed in `architecture.md` §6:
IGO ERP, Accounting, GST/e-invoicing, Weighbridge, Barcode/QR scanners,
WhatsApp notifications, Email, Logistics APIs, IoT/machine telemetry,
Cloud storage.

Every integration must use integration IDs and retry-safe (idempotent)
APIs, per `architecture.md` §6.

## TODO

- [ ] IGO Central ERP / Accounts integration (sync model, direction,
      frequency, conflict resolution — see `product-requirements.md`
      §4.15: "Finance should integrate with the central IGO ERP rather
      than creating conflicting books")
- [ ] GST/e-invoicing service integration
- [ ] Weighbridge integration (protocol, how gross/tare/net weight reach
      Gate & Weighment module)
- [ ] Barcode/QR scanner integration (packing, dispatch, warehouse)
- [ ] WhatsApp/Email notification integration
- [ ] Logistics/carrier API integration
- [ ] IoT/machine telemetry integration (note: the legacy Go system
      already has an MQTT/HiveMQ sensor pipeline — see
      `config/sensor/sensor_topic.go` — evaluate whether to reuse that
      pattern or replace it)
- [ ] Cloud object storage for documents/photos
- [ ] Per-integration retry/idempotency and failure-handling contract
