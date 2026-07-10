import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life System",
  description: "Personal money + life tracker",
};

const nav = [
  { href: "/", label: "Home" },
  { href: "/add", label: "＋ Add" },
  { href: "/accounts", label: "Accounts" },
  { href: "/plan", label: "Plan" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-neutral-50 text-neutral-900">
        <div className="mx-auto max-w-md pb-24">{children}</div>
        {/* Bottom tab bar — thumb-reachable on iPhone */}
        <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md justify-around border-t bg-white/95 py-2 backdrop-blur">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="px-3 py-1 text-sm font-medium">
              {n.label}
            </Link>
          ))}
        </nav>
      </body>
    </html>
  );
}
