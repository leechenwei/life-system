// ponytail: tiny renderer for the only markdown Gemini emits (bold, lists,
// paragraphs). Swap for react-markdown if the AI output ever gets richer.

function Bold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g); // odd indexes were inside **…**
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : p))}
    </>
  );
}

export default function MiniMarkdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={`flex flex-col gap-1.5 pl-5 ${list.ordered ? "list-decimal" : "list-disc"}`}>
        {list.items.map((it, i) => <li key={i}><Bold text={it} /></li>)}
      </Tag>,
    );
    list = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const ord = line.match(/^\d+[.)]\s+(.*)/);
    const bul = line.match(/^[-*•]\s+(.*)/);
    if (ord || bul) {
      const item = (ord ?? bul)![1];
      const ordered = Boolean(ord);
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push(item);
    } else {
      flush();
      blocks.push(<p key={blocks.length}><Bold text={line} /></p>);
    }
  }
  flush();

  return <div className="flex flex-col gap-2.5">{blocks}</div>;
}
