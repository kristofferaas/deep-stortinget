import type { User } from "@workos/authkit-tanstack-react-start";

import { Link } from "@tanstack/react-router";

export default function SignInButton({
  large,
  user,
  url,
}: {
  large?: boolean;
  user: User | null;
  url: string;
}) {
  if (user) {
    return (
      <Link to="/logout" reloadDocument>
        Sign Out
      </Link>
    );
  }

  return <a href={url}>Sign In{large && " with AuthKit"}</a>;
}
