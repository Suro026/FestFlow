/**
 * Placeholder home page.
 *
 * Replaced by the ported landing page (Hero / Navbar / Footer) in the UI port.
 * It exists now so the App Router has a route to build and the API routes can
 * be compiled and exercised.
 */
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold text-foreground">FestFlow</h1>
      <p className="max-w-md text-muted-foreground">
        The Next.js rearchitecture is in progress. The data layer, security rules and
        admin routes are in place; the interface is being ported next.
      </p>
    </main>
  );
}
