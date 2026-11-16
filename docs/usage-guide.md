# Usage guide

Luncher has two main experiences: the lunch picker (`/`) with personal and shared-group modes, and the afternoon drink picker (`/chieunayuonggi`).

## Spinning and food catalog

- **Vertical food reel:** A slot-machine picker displays three rows with food illustrations on the left and centered horizontal names (with *Bún chả / Bún thịt nướng* formatted on two lines). Spin using the button or the side lever (both keyboard accessible). Reduced-motion mode skips the reel animation.
- **Filters:** Filter between rice and noodle dishes before spinning.
- **No streaky spins:** Both reels share a draw-without-replacement picker (`src/spin-bag.js`). Within a single page visit, every eligible option appears once before any repeats, and a new round does not start with the previous pick. Drawn state lives in memory only and resets on page reload; it is separate from confirmed meals, weekly exclusions, and group data.
- **Afternoon drinks (`/chieunayuonggi`):** A personal-only reel for picking a milk-tea or tea shop. It has no groups, confirmations, history, weekly rules, or persistence—reloading clears the result. The header links between the lunch and drink pages (hidden when launched as an installed standalone app).

## Personal mode

- Confirmed daily choices and their change journal are stored together in browser `localStorage` under `luncher-personal-v2` (older local history is migrated without deletion).
- Personal mode uses the device's local calendar date.
- Personal history stays on the current browser; it is not copied into shared groups, synced across devices, or recovered if browser storage is cleared.

## Shared groups

1. Enter a group name on the home page to create a group.
2. Use **Copy group link** and pin it in your group chat. Each copy appends a fresh 4-character `?v=<token>` query parameter to `/g/<code>` (for example `/g/Ab3xY9?v=k7q2`) to help avoid cached chat previews; all tokens open the same group.
3. Spin privately to explore options—spinning does not alter the group's meal.
4. Confirm a dish to save it for everyone. The wheel locks for the day and the confirmed dish card leads the layout while the full menu collapses.
5. To change a confirmed meal, select **Change today’s meal**. The existing choice remains confirmed until a replacement is saved; cancelling leaves it untouched.
6. Open **Change history** to view timestamped confirmations and replacements. There is no destructive undo action.

### Group rules and calendar

- **Group codes:** Six case-sensitive ASCII alphanumeric characters (for example `/g/Ab3xY9`). Legacy UUID URLs are not accepted. Group names can be edited without changing the link.
- **Calendar:** Weeks run Monday–Sunday. Shared groups use **Asia/Ho_Chi_Minh** so all members share the same day and week boundaries. Confirmed dishes are excluded for the rest of the week unless repeats are explicitly enabled, and previous weeks' dishes become eligible again automatically.
- **Concurrency & sync:** Optimistic concurrency checks (`revision`) prevent stale confirmations from silently overwriting newer decisions. Use **Refresh results** or switch back to the browser tab to fetch updates; Luncher does not push real-time updates. Failed group requests never fall back to local storage, and timed-out writes are not retried automatically.
- **Access model:** Anyone with the `/g/<code>` link can view, rename the group, confirm, or replace meals, and manage the Grab link. There are no owners, passwords, or recovery accounts.

### Returning to a group

- The home page lists up to **10 recently visited groups** stored in `localStorage` (not a public database directory).
- Opening a group saves its name; subsequent reads or renames update the saved label.
- Desktop shows up to two rows; narrow screens use a horizontal scroller (one row on mobile).
- Removing a card only forgets the local browser shortcut; the group's link, meals, and journal remain in Neon. Reopening the link adds the shortcut back.

## Grab group orders and link previews

In a shared group, any participant can save, update, or clear a Grab group-order link. Clearing the link removes the QR code without affecting meals or the journal.

- **Accepted URLs:** HTTPS links on `grab.com`, subdomains of `grab.com`, or `grab.onelink.me`, with no embedded credentials and a maximum length of 500 characters.
- **Server-side metadata fetch:** On save, the server follows HTTPS redirects on allowed Grab hosts (4-second timeout, 256 KB limit) to read a title (up to 120 characters) and a share image hosted on `grab.com` (which contains the store name, address, and rating). If reading fails, the link is still saved.
- **Group card & Open Graph previews:** The group page displays the share image, a QR code, and an **Open Grab order** button. `/g/<code>` serves server-rendered Open Graph metadata naming today's confirmed dish, confirmation time, and Grab title, while `/api/qr?id=<code>` serves a centered 1200×630 QR PNG. Chat apps may cache previews or choose not to show images.
- **Limitations:** Saved Grab links do not auto-reset daily; replace or clear them when an order ends. Luncher does not create Grab orders, track expiry or order status, or collect individual orders.

## Installable group PWA and Web Share Target

- **Per-group installation:** `/g/<code>` provides a per-group Web App Manifest at `/api/manifest?id=<code>` so browsers can install a specific group directly to the home screen (separate from the static manifests on `/` and `/chieunayuonggi`).
- **Network-only service worker:** Installed apps use `/sw.js`, which does not cache HTML or group API responses so daily decisions and history stay live.
- **Android Web Share Target:** On Android (Chrome / Chromium), an installed group app appears in Android's share sheet:
  1. Tap **Share** on an active group order in the Grab app and pick the installed Luncher group app.
  2. Luncher extracts the first valid Grab link from `text` or `url`, strips share query parameters from the address bar, pre-fills the Grab form, and focuses **Lưu link** (alerting if a link is already saved, or showing an error if none is found).
  3. Links are never auto-saved; you must click **Lưu link**.
- **Platform limitations:** Web Share Target works only for installed PWAs on Android Chrome/Chromium (not iOS/iPadOS Safari or desktop Grab). Each group installs as a separate icon and appears separately in Android's share sheet.

## Appearance and accessibility

- **Themes:** The header theme button cycles **System → Light → Dark → System**, persists across reloads, syncs across tabs, and works in the current tab even if storage is blocked.
- **Liquid Glass & accessibility:** Capsule controls, translucent cards, and a glass slot reel with denser glass behind text for WCAG AA contrast. Touch targets are at least 44px. Surfaces fall back to opaque fills when backdrop filters are unavailable or reduced transparency is requested; reduced-motion preferences skip reel animations.
- **Scrollbars:** Scrollable regions preserve native wheel, touch, keyboard, and thumb scrolling with thin, theme-aware scrollbars and transparent tracks.

## Current scope

The current version does not include custom food editing, JSON import/export, voting, individual order collection, or live push updates.
