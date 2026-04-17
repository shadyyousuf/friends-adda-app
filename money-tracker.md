

# SYSTEM PROMPT / FEATURE SPECIFICATION: Group Fund Tracking Module


## 1. Data Model Adaptation
*Assuming the existing app has a `Users` table.* Create a new entity/table for **Payments/Contributions**.

**Table/Model: `GroupPayments`**
*   `id` (UUID/CUID)
*   `user_id` (Foreign Key -> Users table)
*   `amount` (Numeric/Integer)
*   `month` (Integer 1-12)
*   `year` (Integer)
*   `status` (Enum: `'paid' | 'pending'`) *(Note: Pending is usually derived if no record exists for the month, but keeping it as a status allows explicit pending records).*
*   `created_at` (Timestamp)

**Constants Required:**
*   `DEFAULT_MONTHLY_AMOUNT`: (e.g., `3000`) can be set when creating the event
*   `MONTH_NAMES`: Array of 12 month strings (Jan-Dec).

---

## 2. Core Business Logic & State

### A. Dashboard Global State
*   **Selected Period:** `selectedMonth` (default: Current Month), `selectedYear` (default: Current Year).
*   **Total Fund Calculation:** Sum of `amount` where `status === 'paid'` across *all* time.
*   **Members Array Mapping:** For the `selectedPeriod`, map ALL existing users against the `GroupPayments` table. 
    *   If a payment exists for that user/month/year: `{ user, payment: paymentData }`
    *   If no payment exists: `{ user, payment: null }` (Treated as Pending).

### B. Sorting Algorithms
*   **Dashboard List Sorting:** Pending members first, Paid members second.
*   **Members Leaderboard Sorting:** Sorted descending by total `amount` paid across all time.
*   **Timeline Sorting:** Sorted descending by `year`, then descending by `month`.

### C. Monthly Progress Calculation
*   `paidCount` = Number of users with `status === 'paid'` for the selected month/year.
*   `totalMembers` = Total active users in the group.
*   `percentage` = `(paidCount / totalMembers) * 100`

---

## 3. UI Components to Build

The UI requires a **Mobile-First Glassmorphism** design. Wrap the feature in a `max-w-md mx-auto min-h-screen` container.

### Component 1: Total Fund Card (`TotalFundCard`)
*   **Visuals:** Gradient background card (`linear-gradient`).
*   **Data:** Displays the all-time Total Fund sum formatted as currency.
*   **Subtext:** Shows total member count and the default monthly amount.

### Component 2: Monthly Progress Bar (`MonthlyProgress`)
*   **Visuals:** A horizontal progress bar. Green if 100%, Indigo/Primary color if < 100%.
*   **Data:** Displays `Selected Month Year`, `Paid/Total fraction`, and `Percentage`.

### Component 3: Payment Status List (`PaymentStatusList`)
*   **Visuals:** A list of users with avatars.
*   **Pending Item:** Yellow/Warning text, Clock Icon. 
    *   *If User is Admin:* Show a button displaying the `DEFAULT_MONTHLY_AMOUNT` to trigger the "Mark as Paid" action.
*   **Paid Item:** Green/Success text, Checkmark Icon, shows exact amount paid.

### Component 4: Leaderboard List (`MembersPage`)
*   **Visuals:** List of users showing Total Paid (All time) and "Months Paid" count.
*   **UX:** Rank #1 gets a Crown icon overlay on their avatar.
*   **Interaction:** Clicking a member opens the **Member History Drawer**.

### Component 5: Contribution Timeline (`Timeline`)
*   **Visuals:** Vertical timeline with a line connecting dots.
*   **Items:** Cards showing Month, Year, Amount, Date, and Status badge (Paid/Pending). Left border colored green for Paid, grey for Pending.

---

## 4. UX Flows & Interactions

### Flow 1: Month Navigation (Swipe & Dropdown)
*   **UI:** A dropdown button showing the currently selected month/year.
*   **Dropdown:** Shows the last 12 months as selectable options.
*   **Swipe Gesture:** Implement `onTouchStart`, `onTouchMove`, `onTouchEnd` on the dashboard container.
    *   Swipe Left (> 50px) -> Navigate to Next Month.
    *   Swipe Right (< -50px) -> Navigate to Previous Month.

### Flow 2: Admin "Mark as Paid" Drawer (Bottom Sheet)
*   **Trigger:** Admin clicks "Pending" button next to a user.
*   **UI:** A bottom-sheet drawer slides up (do not use a standard centered modal).
*   **Content:**
    *   Shows User Avatar, Name, and Target Month/Year.
    *   A large number input field defaulting to `DEFAULT_MONTHLY_AMOUNT`.
    *   Validation: Cannot submit if input < `DEFAULT_MONTHLY_AMOUNT`.
*   **Action:** Upserts a `GroupPayments` record with `status: 'paid'` and the custom entered amount. Invalidates/Refetches data immediately.

### Flow 3: Member History Drawer (Bottom Sheet)
*   **Trigger:** Clicking a user in the Members Leaderboard.
*   **UI:** Bottom-sheet drawer slides up.
*   **Content:** 
    *   Top: User info + Admin badge (if applicable).
    *   Summary Stats: "Total Paid" block and "Months Paid" block.
    *   List: Re-uses the `Timeline` component filtered for this specific user.

---

## 5. Styling & Animation Specs

Tell your CSS/Tailwind engine to implement the following utility concepts:

**1. Glass Cards (`.glass-card`)**
*   Background: `rgba(30, 41, 59, 0.6)` (Slate 800 at 60% opacity)
*   Backdrop Filter: `blur(16px)`
*   Border: `1px solid rgba(148, 163, 184, 0.1)`
*   Border Radius: `16px`

**2. Drawers (Bottom Sheets)**
*   Overlay: Fixed, `inset: 0`, black with 60% opacity and 4px blur.
*   Content Box: Fixed to `bottom: 0`, `max-width: 448px` (matches mobile container), border-radius `24px 24px 0 0`.
*   Handle: A small grey rounded pill at the top center of the drawer.

**3. Avatars (`getAvatarColor` logic)**
*   Generate deterministic background gradients for avatars based on the hash of the user's string name so users always have the same colors.

**4. Animations (Required)**
*   `fade-in-up`: Use on dashboard load to slide cards up by 16px while fading in. Stagger children (Card 1: 0.05s delay, Card 2: 0.1s delay, etc.).
*   `count-up`: The Total Fund number should quickly animate from 0 to the target number.
*   `drawer-slide-up`: Bottom sheets must smoothly translate from `Y: 100%` to `Y: 0`.