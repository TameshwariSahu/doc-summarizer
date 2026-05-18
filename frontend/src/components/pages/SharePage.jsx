import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { FileText } from "lucide-react";
import { API_URL } from "@/lib/api";


export function SharePage() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await axios.get(`${API_URL}/history/share/${id}`);
        setSummary(res.data);
      } catch (err) {
        setError("Summary not found!");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center px-4">
        <h1 className="text-2xl font-bold text-foreground mb-2">Summary not found!</h1>
        <Link to="/" className="text-primary hover:underline">Go to home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 text-center">
          <Link to="/" className="flex items-center justify-center gap-2 text-primary font-bold text-xl mb-6">
            <FileText className="h-6 w-6" />
            DocSummarizer
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Shared Summary</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {summary.fileName} — {new Date(summary.createdAt).toLocaleDateString("en-US", {
              year: "numeric", month: "short", day: "numeric"
            })}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {summary.summaryFormat === "bullets" ? "Bullet Points" : "Paragraph"}
            </span>
            {summary.summaryLanguage && summary.summaryLanguage !== "English" && (
              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground border border-border">
                {summary.summaryLanguage}
              </span>
            )}
          </div>
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-secondary rounded-lg p-4">
            {summary.summaryText}
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-muted-foreground text-sm">
            Want to summarize your own documents?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}