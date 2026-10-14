import { isServer, QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';

// ----------------------------------------------------------------------
// Official TanStack Query App Router setup:
// https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
//
// Server: a fresh QueryClient per request (never share caches between users).
// Browser: a lazy singleton, so React suspense re-renders don't recreate it.

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Above 0 so client-side hydration doesn't instantly refetch
        // data that was just prefetched on the server.
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      dehydrate: {
        // Include pending queries so streamed prefetches hydrate too.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}
