# sim-pos-sales — How to Trigger

The sim-pos-sales edge function (v4) generates realistic POS order history.
It CANNOT be triggered from Claude Code (requires an authenticated HQ user JWT).

## To trigger from the UI:
1. Open localhost:3000/hq
2. Navigate to HQ Command Centre -> Tenants tab
3. Find Metro Hardware -> click "RUN 30 DAYS"
4. Wait for completion toast
5. Find Medi Recreational -> click "RUN 30 DAYS"
6. Wait for completion toast

## Alternative: trigger via Supabase Edge Function invoke
In Supabase Studio -> Edge Functions -> sim-pos-sales -> Invoke:
Body: { "tenant_id": "57156762-deb8-4721-a1f3-0c6d7c2a67d8", "days": 30 }
Body: { "tenant_id": "b1bad266-ceb4-4558-bbc3-22cfeeeafe74", "days": 30 }

Note: This generates orders from today backwards 30 days.
For demo day (12 May), re-run on May 11 or 12 for realistic same-day data.
