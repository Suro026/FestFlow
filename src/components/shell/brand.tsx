import Link from "next/link";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/site";

/**
 * The wordmark. Nocturne's header brand is plain text at 18px/500; the role
 * label beside it ("ADMIN", "VOLUNTEER") is how the design tells the two
 * halves of the product apart without changing the chrome.
 */
export const Brand = ({
  role,
  href = "/",
  className,
}: {
  role?: string;
  href?: string;
  className?: string;
}) => (
  <Link href={href} className={cn("nav-brand", className)}>
    {SITE.name}
    {role ? <span className="nav-role">{role}</span> : null}
  </Link>
);
