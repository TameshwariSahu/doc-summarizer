import { useState, useEffect } from "react";
import axios from "axios";
import { SummaryCard } from "../SummaryCard";
import { DocumentQAPanel } from "../DocumentQAPanel";
import { History, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";

const ITEMS_PER_PAGE = 10;

export function HistoryPage() {
  const [summaries, setSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage]);

  const fetchHistory = async (page) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/history`, {
        params: { page, limit: ITEMS_PER_PAGE },
        headers: { Authorization: `Bearer ${token}` },
      });
      setSummaries(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      toast.error("Failed to load history!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (summaries.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchHistory(currentPage);
      }
      toast.success("Summary deleted!");
    } catch (error) {
      toast.error("Failed to delete!");
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(pagination.totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
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
        {pagination.totalItems > 0 && (
          <span className="ml-auto text-sm text-muted-foreground">
            {pagination.totalItems} {pagination.totalItems === 1 ? "summary" : "summaries"}
          </span>
        )}
      </div>

      {summaries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg">No summaries yet!</p>
          <p className="text-sm mt-1">Upload a document to get started.</p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {summaries.map((s) => (
              <div key={s._id} className="space-y-4">
                <SummaryCard
                  id={s._id}
                  filename={s.fileName}
                  date={new Date(s.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
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

          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm
                  hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              {getPageNumbers()[0] > 1 && (
                <>
                  <button onClick={() => goToPage(1)}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-accent transition">
                    1
                  </button>
                  {getPageNumbers()[0] > 2 && (
                    <span className="px-1 text-muted-foreground">…</span>
                  )}
                </>
              )}

              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    page === currentPage
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "hover:bg-accent"
                  }`}
                >
                  {page}
                </button>
              ))}

              {getPageNumbers()[getPageNumbers().length - 1] < pagination.totalPages && (
                <>
                  {getPageNumbers()[getPageNumbers().length - 1] < pagination.totalPages - 1 && (
                    <span className="px-1 text-muted-foreground">…</span>
                  )}
                  <button onClick={() => goToPage(pagination.totalPages)}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-accent transition">
                    {pagination.totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm
                  hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}