# Coco Pith Factory — Product & UI/UX Design Specification

## 1. Design Direction

The interface should feel like an industrial operations platform rather
than a generic ERP.

Design principles: - Clean - Data-dense but readable - Fast for factory
operators - Mobile-friendly - Strong status visibility - Minimal clicks
for repetitive work - Clear human/AI distinction - Full traceability

## 2. Application Shell

### Desktop

-   Left navigation
-   Top global search
-   Factory/location selector
-   Notification center
-   AI Copilot
-   User/profile menu
-   Breadcrumbs
-   Main workspace

### Mobile

-   Bottom navigation for frequent operations
-   Scan button
-   AI assistant
-   Tasks
-   Alerts
-   Profile

## 3. Main Navigation

1.  Dashboard
2.  Procurement
3.  Gate & Weighment
4.  Raw Materials
5.  Production
6.  Quality
7.  Inventory
8.  Packing
9.  Sales
10. Dispatch
11. Export
12. Maintenance
13. Workforce
14. Finance
15. Reports
16. AI Agents
17. Audit & Activity
18. Memory
19. Settings

## 4. Dashboard Design

Use KPI cards: - Today's Production - Production Target - Yield -
Wastage - QC Pass Rate - Stock - Pending Orders - Dispatch Ready -
Machine Downtime - Revenue

Use: - trend charts, - production funnel, - batch status, - exception
list, - AI insights.

## 5. Batch Screen

Header: - Batch ID - Product - Grade - Status - Production date - QC
status

Sections: - Raw material lots - Process stages - Machine - Operators -
Input quantity - Output quantity - Wastage - QC results - Packing -
Warehouse movement - Sales/dispatch linkage - Audit timeline

## 6. Audit Timeline UI

Every record should have an Activity tab:

```text
09:32  User created production batch
09:34  AI Production Agent checked material availability
09:35  Supervisor approved production plan
10:02  Operator started batch
11:45  QC result entered
11:46  QC Agent flagged EC deviation
11:51  QC Manager placed batch on HOLD
12:10  Production Manager added corrective action
```

Each event opens: - actor, - actor type, - timestamp, - action, - old
value, - new value, - reason, - source, - conversation ID, - approval
ID.

## 7. AI Interaction Design

AI panel must show:

**Request** > "Prepare today's production plan."

**AI Proposal** - 4 batches - 18,000 kg raw material - estimated 12,600
kg output

**Reasoning Summary** - Based on orders, stock and machine availability.

**Actions** - Review - Approve - Edit - Reject

Do not expose hidden chain-of-thought. Show concise decision factors and
evidence instead.

## 8. Memory UI

Memory categories: - Company Facts - Factory Configuration - Product
Specifications - Supplier Knowledge - Customer Knowledge - Decisions -
SOPs - User Preferences - Open Issues - Historical Context

Each memory should show: - memory ID, - type, - value, - source, -
confidence/status, - created date, - last verified date, - linked
conversation, - linked business records.

## 9. Accessibility

-   Keyboard navigation
-   Clear labels
-   Large touch targets
-   High contrast
-   Error messages with corrective instructions
-   Localization-ready
-   Tamil/English-ready interface
