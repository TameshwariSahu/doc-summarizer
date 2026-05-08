import { useState } from "react";
import { Copy, Check, Trash2, FileText } from "lucide-react";

export function SummaryCard({ filename, date, format, summary, onDelete }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatLabel = {
    bullets: "Bullet Points",
    paragraph: "Paragraph",
    json: "JSON",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground text-sm">{filename}</p>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {formatLabel[format] || format}
          </span>
          <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Copy"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-secondary rounded-lg p-4">
        {summary}
      </div>
    </div>
  );
}