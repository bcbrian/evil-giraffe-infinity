import {
  type RouteConfig,
  index,
  route,
  layout,
  prefix,
} from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("home", "routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("signup", "routes/signup.tsx"),
  route("callback", "routes/callback.tsx"),
  route("confirm-signup/:token", "routes/confirm-signup.$token.tsx"),
  route("protected", "routes/protected.tsx"),

  // API routes
  ...prefix("api", [
    route("create-link-token", "routes/api.create-link-token.ts"),
    route("sync-transactions", "routes/api.sync-transactions.ts"),
  ]),

  // Main layout with nested routes
  layout("routes/_layout.tsx", [
    // Dashboard section
    ...prefix("dashboard", [index("routes/_layout.dashboard.tsx")]),

    // Transactions section
    ...prefix("transactions", [index("routes/_layout.transactions.tsx")]),

    // Linked accounts section
    ...prefix("linked-accounts", [index("routes/_layout.linked-accounts.tsx")]),

    // Budgets section
    ...prefix("budgets", [
      index("routes/_layout.budgets.tsx"),
      route("new", "routes/_layout.budgets.new.tsx"),
      route(":budgetId", "routes/_layout.budgets.budgetId.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
