import { useState } from "react";
import axios from "axios";
import { UploadBox } from "../UploadBox";
import { FormatToggle } from "../FormatToggle";
import { SummaryCard } from "../SummaryCard";
import { DocumentQAPanel } from "../DocumentQAPanel";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

const API_URL = "http://localhost:5000/api";

export function HomePage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [format, setFormat] = useState("bullets");
  const [isLoading, setIsLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState(null);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first!");
      return;
    }

    setIsLoading(true);
    setSummaryResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("format", format);

      const response = await axios.post(`${API_URL}/summarize/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSummaryResult({
        filename: selectedFile.name,
        summary: response.data.summary.summaryText,
        format: format,
        contentHash: response.data.summary.contentHash,
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric",
        }),
      });

      toast.success("Document summarized successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to summarize!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          Document Summarizer
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upload your PDF or DOCX file and get an AI-powered summary instantly
        </p>
      </div>

      <div className="space-y-6">
        <UploadBox
          onFileSelect={setSelectedFile}
          selectedFile={selectedFile}
          onClear={() => { setSelectedFile(null); setSummaryResult(null); }}
          disabled={isLoading}
        />

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <FormatToggle value={format} onChange={setFormat} disabled={isLoading} />

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isLoading}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Summarize
              </>
            )}
          </button>
        </div>

        {summaryResult && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Summary Result</h2>
              <SummaryCard
                filename={summaryResult.filename}
                date={summaryResult.date}
                format={summaryResult.format}
                summary={summaryResult.summary}
              />
            </div>
            {summaryResult.contentHash && (
              <DocumentQAPanel contentHash={summaryResult.contentHash} disabled={isLoading} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}