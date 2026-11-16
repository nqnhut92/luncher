# Decisions log

Non-obvious architectural and product choices recorded with their reasoning:

- **Separate internal `id` (UUID) and 6-character public `code` in `luncher_rooms`:** Keeps foreign keys and meal history intact without rewriting rows if public codes change, while keeping shared URLs short and rejecting legacy UUID URLs.
- **In-memory draw-without-replacement spin bag (`src/spin-bag.js`):** Prevents streaky repeats within a page visit without coupling spin randomness to confirmed meals, weekly exclusions, or server state.
- **`Asia/Ho_Chi_Minh` Monday–Sunday week for shared groups vs device local date for personal mode:** Ensures all group participants share identical day and week boundaries regardless of device timezone.
- **Optimistic concurrency (`revision`) with no automatic write retries:** Prevents stale confirmations from silently overwriting newer group choices and avoids duplicate writes if a timed-out request already committed.
- **No destructive undo action on shared meals:** Replacing a confirmed dish updates `luncher_meal_choices` and appends to `luncher_meal_events`, preserving an audit trail while leaving the previous choice intact if replacement is cancelled.
- **Network-only service worker (`/sw.js`) for group PWAs:** Avoids caching HTML or group API responses so daily meal decisions and change history always reflect live server state.
- **Fail-closed homepage-only Vercel Web Analytics (`src/analytics-privacy.js`):** Excludes `/g/<code>` routes, queries, fragments, and unsafe referrers so access-bearing group codes, names, and Grab links are never sent to analytics.
- **`active: false` entries retained in `src/foods.json`:** Hides retired dishes from new spins and the menu while keeping historical meals, journals, and older clients' API requests valid.
- **Fresh `?v=<token>` query on copied group links and QR metadata:** Encourages chat apps to fetch updated Open Graph previews on share without altering the underlying group.
