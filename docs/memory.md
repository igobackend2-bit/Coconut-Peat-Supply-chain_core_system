# Coco Pith Factory — Full Memory System Specification

## 1. Purpose

The memory system provides durable organizational context across
conversations, users, agents, business records, documents, SOPs,
decisions, and historical events.

Memory is not a replacement for the transactional database.

Use: - Database → current business truth - Audit log → historical
actions/changes - Conversation store → conversational history - Memory →
durable context and reusable knowledge

## 2. Memory Layers

### L0 — Current Context

Temporary conversation/session context.

### L1 — Working Memory

Information needed during an active task.

### L2 — Operational Memory

Factory configuration, current processes, recurring operational
knowledge.

### L3 — Organizational Memory

Approved company facts, SOPs, product specifications, decisions,
policies.

### L4 — Historical Memory

Past decisions, projects, incidents, production lessons,
customer/supplier history.

## 3. Memory Types

Every memory must have a type:

-   FACT
-   DECISION
-   INSTRUCTION
-   PREFERENCE
-   CONFIGURATION
-   SOP
-   PRODUCT_KNOWLEDGE
-   SUPPLIER_KNOWLEDGE
-   CUSTOMER_KNOWLEDGE
-   INCIDENT
-   LESSON
-   ASSUMPTION
-   OBSERVATION
-   OPEN_ISSUE
-   TASK_CONTEXT

## 4. Memory Record

```json
{
  "memory_id": "uuid",
  "tenant_id": "uuid",
  "memory_type": "DECISION",
  "title": "Production batch approval policy",
  "content": "QC Manager approval is required before final batch release.",
  "status": "ACTIVE",
  "source_type": "CONVERSATION",
  "source_id": "uuid",
  "conversation_id": "uuid",
  "created_by": "uuid",
  "created_at": "timestamp",
  "last_verified_at": "timestamp",
  "confidence": 0.98,
  "importance": 0.95,
  "sensitivity": "INTERNAL",
  "valid_from": "timestamp",
  "valid_until": null,
  "version": 1,
  "supersedes_memory_id": null,
  "tags": ["QC", "approval"],
  "linked_entity_type": "policy",
  "linked_entity_id": "uuid"
}
```

## 5. Memory Creation Pipeline

```text
Conversation
    ↓
Candidate extraction
    ↓
Classification
    ↓
Deduplication
    ↓
Conflict detection
    ↓
Permission/sensitivity check
    ↓
Human approval when required
    ↓
Memory store
    ↓
Embedding/indexing
    ↓
Retrieval in future conversations
```

Do not automatically convert every sentence into long-term memory.

## 6. Memory Governance

Long-term memory should generally require one of: - explicit user
instruction, - approved company configuration, - verified system
event, - trusted document, - approved agent workflow.

Unverified AI assumptions must not become authoritative company facts.

## 7. Conflict Handling

If two memories conflict:

```text
Memory A: Product EC target = X
Memory B: Product EC target = Y
```

Create a conflict record instead of silently overwriting.

Required fields: - conflicting memories - detected date - affected
entity - severity - proposed resolution - resolver - resolution date

## 8. Memory Versioning

Never overwrite important memory without history.

Example:

```text
Version 1 — 2026-09-01
Version 2 — 2026-09-20
Version 3 — 2026-09-29
```

Each version stores the reason and source.

## 9. Conversation Memory

Each conversation/session should have:

-   conversation_id
-   participants
-   start/end time
-   messages
-   attachments
-   referenced records
-   actions
-   decisions
-   memory candidates
-   final outcome
-   unresolved issues

## 10. Retrieval

When a new request arrives:

```text
User request
   ↓
Identify intent
   ↓
Retrieve relevant:
  - current database facts
  - recent conversation context
  - approved memory
  - SOP/document knowledge
  - relevant audit history
   ↓
Permission filter
   ↓
AI response
```

Current transactional data should take precedence over stale memory.

## 11. Memory Expiration

Some memories should expire or require re-verification: - temporary
operational assumptions - temporary prices - temporary production
targets - temporary staffing - temporary policies

Permanent-looking company facts should still support versioning.

## 12. Privacy & Access

Memory must follow: - tenant isolation - role permissions - sensitivity
classification - minimum necessary retrieval - deletion/retention
policies - access audit

A memory should never be surfaced to a user who lacks permission to see
the underlying information.

## 13. "Full Memory" Principle

The system should remember relationships, not merely text:

`Conversation → Decision → Action → Business Record → Result → Lesson → Future Context`

Example:

```text
Conversation C-100
    ↓
Decision D-220
    ↓
Action A-901
    ↓
Production Batch PB-124
    ↓
QC Result Q-771
    ↓
Incident I-310
    ↓
Lesson M-450
    ↓
Future Production Planning
```

This creates a traceable organizational memory graph.

## 14. Memory APIs

Suggested endpoints:

-   `POST /memory/candidates`
-   `POST /memory`
-   `GET /memory/search`
-   `GET /memory/:id`
-   `POST /memory/:id/verify`
-   `POST /memory/:id/supersede`
-   `POST /memory/conflicts`
-   `GET /conversations/:id/memory`
-   `GET /conversations/:id/actions`

## 15. Golden Rule

The AI should never say:

> "I remember this, so it must still be true."

Instead it should determine whether the information is: - current, -
verified, - historical, - user-provided, - system-generated, - or
uncertain.
