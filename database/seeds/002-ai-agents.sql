-- AI agent registry (docs/agents.md §2). analyzer_key is set only for agents
-- that have a real, rule-based implementation in apps/api/src/modules/ai —
-- the rest are specified but cannot be run (they need an LLM or planning
-- engine that is not connected). Idempotent.

INSERT INTO ai_agents (code, name, purpose, permission_level, analyzer_key) VALUES
  ('A01', 'Factory Copilot', 'General operational assistant: answer factory questions, search data, explain KPIs, navigate workflows.', 'READ', NULL),
  ('A02', 'Production Planning Agent', 'Suggest production plans from orders, stock, material availability and machine capacity.', 'DRAFT', NULL),
  ('A03', 'Procurement Agent', 'Flag purchase orders stuck awaiting approval or never received.', 'ANALYZE', 'procurement'),
  ('A04', 'Inventory Agent', 'Detect negative stock from the stock ledger.', 'ANALYZE', 'inventory'),
  ('A05', 'QC Assistant', 'Surface batches held for QC decisions.', 'ANALYZE', 'quality'),
  ('A06', 'Maintenance Agent', 'Overdue maintenance, open breakdowns and spare parts at reorder level.', 'ANALYZE', 'maintenance'),
  ('A07', 'Sales Agent', 'Customer/order summaries, quote drafting, demand analysis.', 'DRAFT', NULL),
  ('A08', 'Dispatch Agent', 'Confirmed orders awaiting dispatch and dispatches stuck in PENDING.', 'ANALYZE', 'dispatch'),
  ('A09', 'Finance Assistant', 'Customers over credit limit and expenses awaiting approval.', 'ANALYZE', 'finance'),
  ('A10', 'Management Reporting Agent', 'Daily operations summary.', 'ANALYZE', 'reporting'),
  ('A11', 'Compliance & Audit Agent', 'Repeated access denials and approvals pending too long.', 'ANALYZE', 'compliance'),
  ('A12', 'Memory Agent', 'Extract approved facts from conversations and detect conflicting memories.', 'DRAFT', NULL)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, purpose = EXCLUDED.purpose, permission_level = EXCLUDED.permission_level, analyzer_key = EXCLUDED.analyzer_key;
