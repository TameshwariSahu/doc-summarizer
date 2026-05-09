import { useState, useEffect } from "react";
import axios from "axios";
import { SummaryCard } from "../SummaryCard";
import { DocumentQAPanel } from "../DocumentQAPanel";
import { History } from "lucide-react";
import { toast } from "sonner";

const API_URL = "http://localhost:5000/api";

export function HistoryPage() {
  const [summaries, setSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/history`);
      setSummaries(res.data);
    } catch (error) {
      toast.error("Failed to load history!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/history/${id}`);
      setSummaries(summaries.filter((s) => s._id !== id));
      toast.success("Summary deleted!");
    } catch (error) {
      toast.error("Failed to delete!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <History className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Summary History</h1>
      </div>

      {summaries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg">No summaries yet!</p>
          <p className="text-sm mt-1">Upload a document to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {summaries.map((s) => (
            <div key={s._id} className="space-y-4">
              <SummaryCard
                filename={s.fileName}
                date={new Date(s.createdAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                })}
                format={s.summaryFormat}
                summary={s.summaryText}
                onDelete={() => handleDelete(s._id)}
              />
              {s.contentHash ? (
                <DocumentQAPanel contentHash={s.contentHash} />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}