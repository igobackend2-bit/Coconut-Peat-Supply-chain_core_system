# Coco Pith Factory — Actions & Change Log Specification

## 1. Purpose

`actions.md` defines the immutable activity/audit model for every
meaningful human, AI, system, and integration action.

The system must never rely on chat history alone as the audit record.

Chat/conversation data and audit events are separate but linked.

## 2. Actor Types

-   USER
-   AI_AGENT
-   SYSTEM
-   INTEGRATION
-   ADMIN

## 3. Action Lifecycle

```text
REQUESTED
   ↓
AUTHORIZED
   ↓
PROPOSED
   ↓
APPROVED / REJECTED
   ↓
EXECUTING
   ↓
COMPLETED / FAILED / PARTIAL
```

Not every action requires approval.

## 4. Mandatory Action Record

```json
{
  "action_id": "uuid",
  "tenant_id": "uuid",
  "actor_id": "uuid",
  "actor_type": "USER",
  "actor_name": "example",
  "action_type": "UPDATE",
  "module": "PRODUCTION",
  "entity_type": "production_batch",
  "entity_id": "uuid",
  "operation": "change_quantity",
  "status": "COMPLETED",
  "timestamp": "2026-09-29T10:00:00+05:30",
  "request_id": "uuid",
  "correlation_id": "uuid",
  "conversation_id": "uuid",
  "session_id": "uuid",
  "source": "WEB",
  "reason": "Production correction",
  "before": {},
  "after": {},
  "diff": {},
  "approval_id": null,
  "tool_name": null,
  "ip_hash": null,
  "metadata": {}
}
```

## 5. Actions to Log

At minimum: - Login/logout - View sensitive records - Create - Read
sensitive data - Update - Delete/void - Approve - Reject - Submit -
Cancel - Export - Print - Upload - Download - AI recommendation - AI
tool call - AI execution - AI approval - AI rejection - Configuration
change - Permission change - Master-data change - Stock adjustment -
Production change - QC decision - Financial action - Integration
request/result - Failed action - Retry

## 6. Change Log

Business records should maintain a human-readable change history:

```text
Production Batch PB-2026-00124

10:21 — Created by Vignesh
10:28 — Quantity changed 5,000 → 5,500 kg
       Reason: revised production plan
       Approved by Factory Manager

11:02 — Machine changed M-02 → M-03
       Reason: maintenance on M-02

12:17 — QC status changed PENDING → HOLD
       Reason: EC outside configured range
```

## 7. Immutable Audit Rules

-   Audit events are append-only.
-   Normal users cannot edit audit events.
-   AI agents cannot delete audit events.
-   Corrections create a new event.
-   Administrative access is itself audited.
-   Retention policy must be configurable.
-   Critical events should be stored in durable storage/backups.

## 8. Conversation Linkage

Every AI or user operation originating from a conversation must store: -
conversation_id - message_id - session_id - action_id

The conversation should link to actions, but actions remain
independently queryable.

## 9. Audit Queries

Management should be able to ask:

-   Who changed this batch?
-   What changed today?
-   What did the AI do?
-   Which AI actions were approved by humans?
-   Which records were modified by a specific user?
-   Which changes happened after QC rejection?
-   What actions failed?
-   What data came from an external integration?

## 10. AI Safety Rule

An AI response saying "done" is not evidence of completion.

Completion must be proven by: `action.status = COMPLETED` plus a
corresponding business transaction/event.
