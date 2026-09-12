import Link from "next/link";
import { Brand } from "./brand";
import { PublicAuthControls } from "./signed-out-only";

/**
 * The header for pages seen before sign-in: landing, explorer, public verify.
 * Same `.nav` as the student side; the difference is only which links show.
 */
export const PublicNav = ({ active }: { active?: "fests" | "colleges" | "verify" }) => (
  <header>
    <nav className="nav mx-auto w-full max-w-[1180px] gap-[26px] px-[18px] py-4 sm:px-6 lg:px-10" aria-label="Primary">
      <Brand href="/" />
      <Link href="/explore" aria-current={active === "fests" ? "page" : undefined}>
        Fests
      </Link>
      <Link href="/for-colleges" aria-current={active === "colleges" ? "page" : undefined} className="hidden sm:inline">
        For colleges
      </Link>
      <Link href="/verify" aria-current={active === "verify" ? "page" : undefined} className="hidden md:inline">
        Verify a certificate
      </Link>
      <div className="ml-3 flex items-center gap-2">
        <PublicAuthControls />
      </div>
    </nav>
  </header>
);

export const PublicFooter = () => (
  <footer className="mt-auto border-t border-divider">
    <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-[18px] py-6 text-[12.5px] text-neutral-500 sm:px-6 lg:px-10">
      <span>© {new Date().getFullYear()} FestFlow</span>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/explore" className="text-inherit no-underline hover:text-accent">
          Fests
        </Link>
        <Link href="/for-colleges" className="text-inherit no-underline hover:text-accent">
          For colleges
        </Link>
        <Link href="/verify" className="text-inherit no-underline hover:text-accent">
          Verify a certificate
        </Link>
        <Link href="/privacy" className="text-inherit no-underline hover:text-accent">
          Privacy
        </Link>
      </div>
    </div>
  </footer>
);
