# Coco Pith Factory — Product Requirements Document

**Version:** 1.0\
**Date:** 2026-09-29\
**Product:** Coco Pith Factory Management & AI Operating System\
**Organization:** IGO Group

## 1. Product Vision

Build a complete digital operating system for a coco pith/coco peat
manufacturing factory covering procurement, raw-material receiving,
production, quality control, inventory, packing, sales, dispatch,
finance, maintenance, workforce, AI assistance, audit logging, and
organizational memory.

The system must provide end-to-end traceability:

`Supplier → Vehicle → Weighment → Raw Material Lot → Production Batch → QC → Finished Product → Packing Lot → Warehouse → Sales Order → Dispatch → Customer`

Every important human and AI action must generate an auditable event.

## 2. Goals

-   Digitize factory operations from gate entry to dispatch.
-   Track raw materials and finished products by lot/batch.
-   Track production quantity, yield, wastage, downtime, and machine
    utilization.
-   Capture QC results and release/reject decisions.
-   Maintain accurate stock across locations.
-   Support domestic and export sales.
-   Integrate accounting and statutory data with the central IGO ERP.
-   Provide real-time management dashboards.
-   Add AI agents for planning, monitoring, QC assistance, procurement,
    inventory, sales, maintenance, and reporting.
-   Maintain durable organizational memory and a complete action/change
    history.

## 3. User Roles

-   Super Admin
-   Factory Head
-   Production Manager
-   Procurement Manager
-   Store Manager
-   QC Manager
-   Packing Supervisor
-   Sales Manager
-   Export Manager
-   Dispatch Manager
-   Accounts User
-   Maintenance Manager
-   HR/Admin
-   Operator
-   Weighbridge Operator
-   QC Technician
-   Warehouse Staff
-   AI Agent
-   Auditor
-   CEO/Management Viewer

Access must be role-based and permission-based.

## 4. Core Modules

### 4.1 Master Data

-   Products
-   Product grades/specifications
-   Raw materials
-   Suppliers
-   Customers
-   Vendors
-   Machines
-   Warehouses
-   Storage locations
-   Units of measure
-   Packaging types
-   QC parameters
-   Employees
-   Departments
-   Tax configuration
-   Price lists

### 4.2 Procurement

-   Purchase requisition
-   Purchase order
-   Supplier quotation
-   Rate comparison
-   Supplier contract
-   Inbound scheduling
-   Purchase invoice
-   Supplier payment status
-   Supplier performance

### 4.3 Gate & Weighment

-   Vehicle registration
-   Driver details
-   Gate entry
-   Gross weight
-   Tare weight
-   Net weight
-   Material type
-   Supplier
-   Photos/documents
-   Duplicate weighment prevention

### 4.4 Raw Material Management

-   Raw-material receipt
-   Lot creation
-   Moisture/quality capture
-   Stock movement
-   Storage location
-   Aging
-   Consumption
-   Rejection
-   Conversion/yield tracking

### 4.5 Production

-   Production plan
-   Production order
-   Batch creation
-   Material issue
-   Machine assignment
-   Operator assignment
-   Processing stages
-   Output recording
-   Wastage recording
-   Rework
-   Downtime
-   Shift-wise production
-   Batch closure

### 4.6 Processing Stages

Configurable process flow: 1. Receiving 2. Cleaning 3. Fibre/pith
separation 4. Screening 5. Washing 6. Buffering 7. Drying 8. Sieving 9.
Compression 10. Block/brick formation 11. Packing 12. Finished-goods QC
13. Warehouse release

The exact flow must be configurable by product.

### 4.7 Quality Control

-   Incoming QC
-   In-process QC
-   Final QC
-   Sampling
-   Test results
-   pH
-   EC
-   Moisture
-   Expansion
-   Fibre content
-   Impurity
-   Particle size
-   Compression/density
-   Batch release
-   Batch rejection
-   Hold status
-   Corrective action

QC thresholds must be product/grade specific.

### 4.8 Inventory

-   Raw material stock
-   WIP
-   Finished goods
-   Packaging material
-   Consumables
-   Batch/lot tracking
-   Serial/QR tracking where required
-   Stock transfer
-   Stock adjustment
-   Cycle count
-   Stock reconciliation
-   Stock aging

### 4.9 Packing

-   Packing order
-   Packaging material issue
-   Product weight
-   Bag/brick/block count
-   Label generation
-   QR code
-   Batch number
-   Manufacturing date
-   QC status
-   Pallet/container tracking

### 4.10 Sales

-   Lead
-   Customer
-   Quotation
-   Sales order
-   Price list
-   Credit limit
-   Advance
-   Invoice
-   Payment
-   Returns
-   Claims

### 4.11 Dispatch & Logistics

-   Dispatch plan
-   Vehicle
-   Transporter
-   Loading
-   Delivery documents
-   E-way bill integration where applicable
-   Proof of delivery
-   Delivery status
-   Freight
-   Export container planning

### 4.12 Export

-   Export customer
-   Proforma invoice
-   Packing list
-   Commercial invoice
-   Container
-   Shipment
-   Documentation checklist
-   Freight
-   Customs-related document tracking
-   Shipment milestone tracking

### 4.13 Maintenance

-   Machine master
-   Preventive maintenance
-   Breakdown ticket
-   Spare parts
-   Technician assignment
-   Downtime
-   Maintenance cost
-   MTBF/MTTR
-   Maintenance history

### 4.14 Workforce

-   Employee master
-   Shift
-   Attendance
-   Task assignment
-   Production incentive
-   Labour allocation
-   Contractor/vendor labour
-   Safety checklist

### 4.15 Finance

-   Purchase accounting
-   Sales accounting
-   Expense management
-   Payments
-   Receipts
-   Bank
-   GST-related records
-   Cost center
-   Product cost
-   Batch cost
-   Profitability

Finance should integrate with the central IGO ERP rather than creating
conflicting books.

## 5. Dashboards

### CEO Dashboard

-   Revenue
-   Production
-   Sales
-   Gross margin
-   Stock
-   Pending orders
-   Dispatch
-   Cash/receivables
-   Factory efficiency
-   QC rejection
-   Major alerts
-   AI recommendations

### Factory Dashboard

-   Today's plan vs actual
-   Production by line
-   Yield
-   Wastage
-   Downtime
-   Machine utilization
-   QC holds
-   Packing
-   Dispatch readiness

### Procurement Dashboard

-   Pending PR/PO
-   Supplier rates
-   Incoming material
-   Stock coverage
-   Supplier performance

### QC Dashboard

-   Samples pending
-   Tests pending
-   Pass/fail
-   Holds
-   Rejections
-   CAPA

## 6. Non-Functional Requirements

-   Responsive web application
-   Mobile-friendly operational screens
-   Role-based access control
-   Multi-brand/multi-company ready
-   Multi-location ready
-   Full auditability
-   API-first design
-   PostgreSQL-compatible database
-   Secure authentication
-   Encryption in transit and at rest
-   Backup and recovery
-   Observability
-   Idempotent APIs
-   Transaction-safe stock operations
-   Offline-friendly mobile workflows where operationally necessary

## 7. Acceptance Principle

No critical transaction is considered complete unless it has: -
authenticated actor, - timestamp, - transaction ID, - relevant business
object, - before/after state where applicable, - source/interface, -
status, - audit event.
