// Wrap any money value so the privacy eye toggle can blur it.
// Server component — just a tagged span; the blur is pure CSS.
export function Amount({ children }: { children: React.ReactNode }) {
  return <span className="amount">{children}</span>;
}
