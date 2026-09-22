import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verify email", description: "Confirm your email address to finish setting up FestFlow." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
