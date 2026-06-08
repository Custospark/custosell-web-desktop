# Offline Inventory

Inventory offline support currently covers product and category creates, updates, and deletes through the shared mutation queue. This note documents the product-specific validation correction flow.

## Product Validation Failures

Offline product creates are saved locally and queued as `POST /products` mutations. If the queued create later reaches the server and fails validation, the sync engine stores the server validation message on the local product record.

Failed product rows stay visible in the product list with a red `Sync failed` badge. The badge title and edit drawer show the saved validation message so the user can correct the product details.

## Correcting Failed Products

Editing a pending or failed product create does not create a duplicate local product or queue row.

- When the app is online, the corrected create payload is posted directly to `/products`.
- If that direct server correction succeeds, the local failed product row and its queued mutation are removed, and product queries are invalidated.
- If the direct correction cannot reach the server, the existing local product row and the original queued mutation payload are updated in place, the error is cleared, and the mutation is requeued.
- If the server rejects the corrected payload again, the validation error is shown to the user and the existing failed row remains available for another edit.

Categories are intentionally unchanged by this correction UX.

## Residual Limitations

- Product failed-sync correction is scoped to queued creates. Pending updates and deletes still use the existing queued mutation behavior.
- The failed product remains tied to the original optimistic local id until the corrected create succeeds on the server.
