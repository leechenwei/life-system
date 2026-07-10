import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "./nav";

export const metadata: Metadata = {
  title: "Life System",
  description: "Personal money + life tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Life System" },
  icons: { icon: "/icon-192.png", apple: "/icon-180.png" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-neutral-50 text-neutral-900">
        <div className="mx-auto min-h-screen max-w-md bg-neutral-50 pb-24">
          <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-neutral-200 bg-neutral-50/90 px-4 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
            <span className="inline-block h-6 w-6 rounded-md bg-black" />
            <span className="text-sm font-semibold tracking-tight">Life System</span>
          </header>
          {children}
        </div>
        <Nav />
      </body>
    </html>
  );
}
