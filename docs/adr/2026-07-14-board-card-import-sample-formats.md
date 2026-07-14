# ADR: Board card import sample formats

**Date:** 2026-07-14  
**Status:** Accepted  
**Scope:** Pipeline / Estimates board Excel card import

## Context

Users uploading board cards hit validation errors from unclear date, priority, and email formats. Assignee email felt required even though the API treats it as optional.

## Decision

1. Template **sample row** includes realistic values: title, stage, contact, phone, value `150000`, due date `2026-07-14` (text), priority `medium`, **blank Assignee Email**.
2. Template **hint row** documents formats and states Assignee Email + Contact Email are optional; assignee must match a team login email when set.
3. Import modal lists the same format rules in plain language.

## Related

- Service: `Backend/app/Services/Pipeline/PipelineLeadImportService.php`
- UI: `src/renderer/modules/pipeline/ui/BoardCardImportModal.tsx`
