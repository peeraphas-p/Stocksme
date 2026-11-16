import Nav from "@/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="md:pl-52 pb-24 md:pb-8">
        <div className="mx-auto max-w-6xl px-4 py-5 space-y-4">{children}</div>
      </main>
    </div>
  );
}
