import { QueryClient } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import {
  AuthKitProvider,
  getAuthAction,
  useAccessToken,
  useAuth,
} from "@workos/authkit-tanstack-react-start/client";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useCallback, useState } from "react";

import "../styles.css";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
  }),
  loader: async () => {
    // getAuthAction() returns auth state without accessToken, safe for client
    // Pass to AuthKitProvider as initialAuth to avoid loading flicker
    const auth = await getAuthAction();
    return {
      auth,
    };
  },
  component: RootComponent,
  notFoundComponent: () => <div>Not Found</div>,
});

function RootComponent() {
  const { auth } = Route.useLoaderData();

  const [convex] = useState(() => {
    const convexUrl = import.meta.env.VITE_CONVEX_URL;
    return new ConvexReactClient(convexUrl);
  });

  return (
    <RootDocument>
      <AuthKitProvider initialAuth={auth}>
        <ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuthKit}>
          <main>
            <Outlet />
          </main>
          <TanStackRouterDevtools position="bottom-right" />
        </ConvexProviderWithAuth>
      </AuthKitProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function useAuthFromAuthKit() {
  const { user, loading: isLoading } = useAuth();
  const { getAccessToken, refresh } = useAccessToken();

  const isAuthenticated = !!user;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken?: boolean } = {}) => {
      if (!user) {
        return null;
      }

      try {
        if (forceRefreshToken) {
          return (await refresh()) ?? null;
        }

        return (await getAccessToken()) ?? null;
      } catch (error) {
        console.error("Failed to get access token:", error);
        return null;
      }
    },
    [user, refresh, getAccessToken],
  );

  return {
    isLoading,
    isAuthenticated,
    fetchAccessToken,
  };
}
