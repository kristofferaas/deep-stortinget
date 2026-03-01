import { createFileRoute } from "@tanstack/react-router";
import { getAuth, getSignInUrl } from "@workos/authkit-tanstack-react-start";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";

import SignInButton from "../components/sign-in-button";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => {
    const { user } = await getAuth();
    const url = await getSignInUrl();
    return { user, url };
  },
});

function Home() {
  const { user, url } = Route.useLoaderData();

  const viewer = useQuery(api.myFunction.getViewer);

  return (
    <div>
      <SignInButton user={user} url={url} />
      <code>
        <pre>{JSON.stringify(viewer, null, 2)}</pre>
      </code>
    </div>
  );
}
