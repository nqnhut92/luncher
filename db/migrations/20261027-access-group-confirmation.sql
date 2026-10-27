-- User-supplied historical confirmation time: 09:37 on 27 October 2026 (Vietnam).
-- Upgrade only this group's migration snapshot. Re-running leaves real events intact.
UPDATE luncher_meal_events
SET action = 'confirm', occurred_at = '2026-10-27T09:37:00+07:00'::timestamptz
WHERE room_id = 'f75bfda7-b815-46bc-b3f9-dc237617c8a0'::uuid
  AND meal_date = '2026-10-27'::date AND food_id = 'mi-quang'
  AND action = 'snapshot';
