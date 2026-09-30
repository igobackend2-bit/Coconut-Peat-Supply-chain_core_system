# Coco Pith Factory — AI Agents Specification

**Version:** 1.0

## 1. Agent Operating Principle

AI agents operate as controlled assistants inside the factory operating
system.

Every agent action must: 1. authenticate the agent identity, 2. create
an action/event ID, 3. record the requested intent, 4. record tools/data
accessed, 5. record the proposed action, 6. require approval when policy
requires it, 7. execute only authorized actions, 8. record the result,
9. store relevant memory, 10. link the event to the originating
conversation/session.

AI must never silently modify business data.

## 2. Agent Registry

### A01 — Factory Copilot

Purpose: General operational assistant.

Capabilities: - Answer factory questions - Search operational data -
Explain KPIs - Generate summaries - Create approved tasks - Navigate
workflows

### A02 — Production Planning Agent

Purpose: Optimize production planning.

Inputs: - Sales orders - Stock - Raw material availability - Machine
capacity - Labour - Delivery commitments - Historical production

Outputs: - Suggested production plan - Capacity conflicts - Material
shortages - Priority batches

Planning suggestions require human approval before creating production
orders.

### A03 — Procurement Agent

Purpose: Procurement intelligence.

Functions: - Detect shortages - Suggest purchase requirements - Compare
supplier rates - Monitor supplier performance - Predict stock-out risk -
Draft PR/PO

PO creation can require approval based on amount and policy.

### A04 — Inventory Agent

Functions: - Stock monitoring - Aging analysis - Negative-stock
detection - Slow-moving stock - Reorder alerts - Batch traceability

### A05 — QC Assistant

Functions: - Review test results - Identify out-of-specification
results - Compare against product specification - Draft QC reports -
Suggest investigation steps

AI cannot independently release a rejected/held batch unless explicitly
authorized by policy.

### A06 — Maintenance Agent

Functions: - Monitor breakdowns - Analyze downtime - Schedule preventive
maintenance - Identify recurring failures - Recommend spare parts

### A07 — Sales Agent

Functions: - Customer/order summaries - Quote drafting - Order status -
Pending payment alerts - Demand analysis

### A08 — Dispatch Agent

Functions: - Dispatch readiness - Loading checklist - Vehicle/document
checklist - Shipment tracking - Delay alerts

### A09 — Finance Assistant

Functions: - Cost analysis - Batch profitability - Receivable
summaries - Expense classification assistance - Reconciliation
assistance

Financial posting remains governed by accounting permissions.

### A10 — Management Reporting Agent

Functions: - Daily EOD report - Weekly factory report - Monthly
management report - Exception report - KPI commentary - CEO summary

### A11 — Compliance & Audit Agent

Functions: - Audit trail review - Missing approvals - Suspicious
changes - Segregation-of-duty exceptions - Document checklist

### A12 — Memory Agent

Purpose: Manage durable organizational memory.

Functions: - Extract approved facts from conversations - Link decisions
to projects - Store preferences/configuration - Track unresolved items -
Retrieve relevant historical context - Detect conflicting memories

Memory must distinguish:
`fact / decision / preference / assumption / observation / instruction / unresolved`

## 3. Agent Permissions

Agents use least privilege.

Permission levels: - READ - ANALYZE - DRAFT - REQUEST_APPROVAL -
EXECUTE - ADMIN

High-risk operations require approval: - financial posting - PO
approval - stock adjustment - batch release - batch rejection -
master-data deletion - user/role changes - permanent deletion -
configuration changes

## 4. Agent-to-Agent Communication

All agent communication must use a traceable message:

```json
{
  "message_id": "uuid",
  "conversation_id": "uuid",
  "source_agent": "production_agent",
  "target_agent": "inventory_agent",
  "purpose": "material_availability_check",
  "payload_reference": "uuid",
  "created_at": "timestamp",
  "status": "completed"
}
```

Never pass untraceable hidden state between agents.

## 5. Agent Memory

Each agent has: - short-term session context, - task memory, -
operational memory, - organization memory, - approved long-term memory.

Sensitive information must be access-controlled.

## 6. Human-in-the-Loop

The UI must clearly show: - AI proposed - Human approved - AI executed -
Human modified - System automatically executed

AI must not represent an unexecuted recommendation as a completed
transaction.

## 7. Agent Failure Handling

If an agent fails: - preserve the original request, - preserve tool
calls, - preserve partial results, - mark execution status, - avoid
duplicate transactions, - provide retry capability, - create an
incident/event if business impact exists.
