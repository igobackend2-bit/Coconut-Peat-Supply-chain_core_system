# Coco Pith Factory — Configuration

**Status:** STUB — not yet written.

Must document all runtime-configurable business behavior (as distinct
from environment/secrets, which live in `environment.md`): approval
policy thresholds, QC parameter thresholds per product/grade, processing
stage flow per product, and similar factory-configuration data.

## TODO

- [ ] Approval policy configuration (amount thresholds, approver roles —
      see `permissions.md` and `MASTER_PROMPT.md` §18)
- [ ] QC parameter/threshold configuration per product/grade (pH, EC,
      moisture, expansion, fibre content, impurity, particle size,
      density — see `product-requirements.md` §4.7)
- [ ] Configurable processing-stage flow per product (see
      `product-requirements.md` §4.6)
- [ ] Tax configuration
- [ ] Price list configuration
- [ ] Who can change configuration, and how those changes are audited
      (configuration changes are a logged action type per `actions.md` §5)
