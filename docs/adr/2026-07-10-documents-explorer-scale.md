# ADR: Documents Explorer Scale And Enterprise Readiness

**Date:** 2026-07-10  
**Status:** Accepted  
**Context:** Custosell Documents vault targets multi-department businesses. Oscar asked whether the current VS Code-style explorer can handle **millions** of files/folders across functional units.

## Decision

The current explorer is **production-ready for small-to-mid vaults** (roughly up to tens of thousands of visible items per business with good UX). It is **not yet ready for millions of nodes** without additional architecture.

We ship incremental enterprise features now (access editing, activity feed, folder counts) and document a phased scale roadmap.

## Current capabilities (what works today)

| Capability | Implementation |
|------------|----------------|
| Lazy folder tree | Children loaded on expand via `GET /documents/folders/children` (paginated, max 200/page) |
| Folder contents | `GET /documents/folders/{id}/contents` with paginated documents |
| Root file list | `root_only` + pagination on `GET /documents` |
| Search | Server-side `q` + `tag` filters — preferred path for large vaults |
| ACL | Per-folder/file visibility with inheritance |
| Activity | `document_activity_logs.cabinet_id` + `GET /documents/activity?cabinet_id=` (paginated, per cabinet) |

## Limits at very large scale (millions)

| Risk | Why |
|------|-----|
| Full tree load | `GET /documents/folders/tree` loads entire tree — avoid for large vaults; explorer uses lazy children instead |
| Deep expand paths | Each expanded folder triggers API calls; very deep/wide trees increase latency |
| DOM size | All expanded nodes render in React — no virtualization yet |
| Activity log | Unpartitioned table will grow; needs retention/archival policy |
| Functional units | No first-class “department root” entity yet — flat folder hierarchy only |

## Roadmap (when scale demands it)

1. **Virtualized explorer** — windowed rows (`@tanstack/react-virtual`) for tree + flat search results  
2. **Cursor pagination** — replace offset pagination for folders/documents/activity at high page numbers  
3. **Department roots** — top-level folders tagged by unit (`HR`, `Finance`) with scoped search default  
4. **Search-first mode** — hide full tree by default above N items; command palette navigation  
5. **Activity partitioning** — monthly partitions or archive to cold storage  
6. **Aggregate counts** — materialized `document_count` / `subfolder_count` on folders (currently computed per request)

## Functional units (company departments)

Until department roots exist, model units as **top-level folders** with color accents and access ACLs. Search + breadcrumbs remain the primary navigation for cross-unit discovery.

## Consequences

- Product and support should set expectations: millions of files require roadmap items above.  
- Engineers should not call `folders/tree` from the main explorer path.  
- New features (activity, access edits) must stay paginated and invalidation-scoped.

## Related

- [documents-module.md](../documents-module.md)
- [2026-07-10-documents-acl-and-folder-model](./2026-07-10-documents-acl-and-folder-model.md)
