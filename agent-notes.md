# Agent Notes: Recurring Monthly Transactions Filter Feature

## Recurring Monthly Transactions Filter

### Overview

- This feature will allow users to filter recurring monthly transactions by
  detecting transactions with the same merchant and amount that occur at least
  twice in the last two months.

### Goals

- Use the existing transactions route for UI updates.
- Update the UI in the existing layout transactions file (e.g.,
  `_layout.transactions.tsx`) to present the filter options.
- Remove any reference to or creation of a new transactions file.
- **New:** Implement a sorting dropdown to allow sorting transactions by Name
  (A-to-Z, Z-to-A) and Amount (Ascending, Descending).

### Tasks

- Update the recurring transactions filter function as needed.
- Modify the existing layout transactions file to add controls (like toggle or
  links) for filtering.
- **Add a sorting dropdown** with the following options:
  - Name A-to-Z (sortBy: 'name', sortOrder: 'asc')
  - Name Z-to-A (sortBy: 'name', sortOrder: 'desc')
  - Amount Ascending (sortBy: 'amount', sortOrder: 'asc')
  - Amount Descending (sortBy: 'amount', sortOrder: 'desc')
- Ensure that the loader in the existing route works correctly with the filter
  and sort parameters.
- Clean up any old or unused transactions file that was created in error.

### Implementation Notes

- We are using the existing transactions view (from the layout file) rather than
  creating a new route.
- All UI changes will be made in the existing layout transactions file. Any new
  transactions route file created earlier should be removed.
- The sorting dropdown will update the URL search parameters, which the loader
  will use to sort the transactions accordingly.
- Future Enhancement: Integrate amount variance logic in the recurring
  transactions filter. For example, group transactions with matching names and
  amounts within a 3% variance together to handle minor pricing discrepancies.

### Integration Plan for Amount Variance

- Update the getRecurringMonthlyTransactions function in
  app/utils/transactions-filter.ts to accept an optional variance parameter
  (default 0%) and utilize a helper function (e.g., isWithinVariance) to group
  transactions with amounts within a 3% variance.
- Allow the variance threshold to be configurable, optionally via a dedicated
  filter parameter (e.g., "filter=recurring-variance").
- Update the transactions route loader in app/routes/\_layout.transactions.tsx
  to invoke the enhanced logic when the filter is set.
- Update the UI to indicate when transactions are grouped using the variance
  strategy, such as via tooltips on the filter links.
- Testing for this integration will be conducted manually.

### Conclusion

- This approach maintains a clean route structure and leverages the existing UI
  for consistent user experience. The new sorting dropdown provides flexible
  ways to view transactions.
