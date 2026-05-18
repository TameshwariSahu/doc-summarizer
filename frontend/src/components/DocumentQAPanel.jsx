import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { MessageCircle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";


export function DocumentQAPanel({ contentHash, disabled }) {
  const [faq, setFaq] = useState([]);
  const [loadingFaq, setLoadingFaq] = useState(true);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [openItems, setOpenItems] = useState({});

  useEffect(() => {
    if (!contentHash) return;
    let cancelled = false;
    (async () => {
      setLoadingFaq(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/qa/faq/${contentHash}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setFaq(res.data);
      } catch (e) {
        if (!cancelled) {
          toast.error(e.response?.data?.message || "Could not load FAQ.");
        }
      } finally {
        if (!cancelled) setLoadingFaq(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contentHash]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || !contentHash) return;
    setAsking(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/qa/ask`, {
        contentHash,
        question: question.trim(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data.fallback ? "Answer ready (offline lookup)" : "Answer ready");
      setQuestion("");
      const refresh = await axios.get(`${API_URL}/qa/faq/${contentHash}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFaq(refresh.data);
      setOpenItems({ 0: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not get an answer.");
    } finally {
      setAsking(false);
    }
  };

  if (!contentHash) return null;

  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Ask about this document</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Ask anything that the uploaded text can answer. Past questions for this same file (same
        content) show below as FAQ, including questions from earlier uploads.
      </p>
      <form onSubmit={handleAsk} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What is the main argument in paragraph 2?"
          disabled={disabled || asking}
          rows={2}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={disabled || asking || !question.trim()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 min-h-[2.5rem] sm:min-w-[5rem]"
        >
          {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
        </button>
      </form>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Frequently asked (this document)
        </h3>
        {loadingFaq ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : faq.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No questions yet for this document. Be the first to ask above.
          </p>
        ) : (
          <ul className="space-y-2">
            {faq.map((item, i) => (
              <li key={`${item.question}-${i}`} className="rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-start justify-between gap-2 px-3 py-2 text-left bg-secondary/50 hover:bg-secondary transition-colors"
                  onClick={() => setOpenItems((o) => ({ ...o, [i]: !o[i] }))}
                >
                  <span className="text-sm text-foreground font-medium">{item.question}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    {item.askCount > 1 && (
                      <span className="text-xs rounded-full bg-primary/15 text-primary px-2 py-0.5">
                        asked {item.askCount}×
                      </span>
                    )}
                    {openItems[i] ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                </button>
                {openItems[i] && (
                  <div className="px-3 py-2 text-sm text-muted-foreground border-t border-border bg-background whitespace-pre-wrap">
                    {item.answer}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}