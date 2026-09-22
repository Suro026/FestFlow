import type { Metadata } from "next";

export const metadata: Metadata = { title: "Choose a password", description: "Set the password for your FestFlow account." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
