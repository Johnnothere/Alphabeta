import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // One shared default so a transient Supabase blip does not leave the
        // page in an error state on first paint.
        retry: 1,
        staleTime: 60_000,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // Transfers the query cache from the server render to the client. Without
  // this, a route loader that prefetches data renders populated HTML on the
  // server while the client's first render sees an empty cache — React then
  // reports a hydration mismatch (error #418) and throws away the server HTML.
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
};
