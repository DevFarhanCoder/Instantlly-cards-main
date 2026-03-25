

## Integrate Spam Flags into Reviews Section

### What Changes

Remove the standalone spam flags system as a separate admin feature. Instead, merge spam detection results directly into the **Reviews tab** in the Admin Dashboard, and add a new **"Flagged Reviews"** section in the **Business Dashboard** so business owners can also see flagged reviews on their listings.

---

### 1. Enhance Admin ReviewsTab with Spam Flags

**File**: `src/pages/AdminDashboard.tsx` (ReviewsTab component, ~line 742)

- Import `useAdminSpamFlags` and `useResolveSpamFlag` from `useAdminData`
- Add a tabbed view within ReviewsTab: **All Reviews** | **Flagged** | **Spam Detected**
- "Spam Detected" sub-tab shows `spam_flags` where `entity_type = 'review'` with resolve/dismiss actions
- "Flagged" sub-tab shows reviews with `is_flagged = true` (existing behavior)
- "All Reviews" shows everything (existing)
- Add spam flag details (reason, severity badge) inline with each flagged review
- Add "Run Spam Scan" button that triggers the `detect-spam` edge function

### 2. Add Business Owner Review Moderation

**File**: `src/pages/BusinessDashboard.tsx` or create `src/components/business/ReviewModeration.tsx`

- New component showing reviews for the business owner's listings
- Display flagged reviews with a prominent warning badge
- Business owners can:
  - Reply to reviews (existing capability)
  - Flag suspicious reviews for admin attention (sets `is_flagged = true`)
  - View spam flag reasons if their reviews were auto-flagged
- Uses existing `useReviews` hook filtered by the business owner's cards

### 3. Update useAdminData Hooks

**File**: `src/hooks/useAdminData.ts`

- Keep `useAdminSpamFlags` but add a filter parameter for `entity_type`
- Add `useReviewSpamFlags()` — returns only spam flags where `entity_type = 'review'`
- Keep `useResolveSpamFlag` as-is

### 4. Add Business-Side Spam Flag Visibility

**File**: `src/hooks/useReviews.ts`

- Extend to optionally fetch associated spam flags for reviews on the business owner's listings
- New hook `useBusinessReviewFlags(businessId)` that queries `spam_flags` where `entity_id` matches review IDs for that business

### 5. Database: RLS Policy Update

**Migration**: Allow business owners to read spam flags for reviews on their own businesses

```sql
CREATE POLICY "Business owners can view spam flags for their reviews"
ON public.spam_flags FOR SELECT TO authenticated
USING (
  entity_type = 'review' AND
  EXISTS (
    SELECT 1 FROM reviews r
    JOIN business_cards bc ON bc.id::text = r.business_id
    WHERE r.id::text = spam_flags.entity_id
    AND bc.user_id = auth.uid()
  )
);
```

### 6. Remove Standalone Spam Flags References

- Remove any standalone "Spam Flags" section from admin overview/quick actions if present
- The spam detection pipeline (edge function, table) stays — only the UI access point moves into Reviews

---

### Files Modified/Created

| File | Action |
|------|--------|
| `src/pages/AdminDashboard.tsx` | Enhance ReviewsTab with spam flags sub-tabs |
| `src/hooks/useAdminData.ts` | Add `useReviewSpamFlags` hook |
| `src/hooks/useReviews.ts` | Add `useBusinessReviewFlags` hook |
| `src/components/business/ReviewModeration.tsx` | New component for business owners |
| `src/pages/BusinessDashboard.tsx` | Add ReviewModeration tab/section |
| `supabase/migrations/` | RLS policy for business owner spam flag read access |

