import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ConvexClientProvider } from "../components/convex-provider";
import "../styles/globals.css";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ConvexClientProvider>
      <Outlet />
    </ConvexClientProvider>
  );
}
