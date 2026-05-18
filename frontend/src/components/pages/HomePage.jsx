import { useState } from "react";
import axios from "axios";
import { UploadBox } from "../UploadBox";
import { FormatToggle } from "../FormatToggle";
import { SummaryCard } from "../SummaryCard";
import { DocumentQAPanel } from "../DocumentQAPanel";
import { Sparkles, FileText, AlignLeft } from "lucide-react";
import { toast } from "sonner";
import { LanguageSelector } from "../LanguageSelector";
import { API_URL } from "@/lib/api";

const API_URL = "http://localhost:5000/api";

export function HomePage() {
  const [activeTab, setActiveTab] = useState("file");
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [format, setFormat] = useState("bullets");
  const [isLoading, setIsLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState(null);
  const [language, setLanguage] = useState("English"); // ✅ moved inside component

  const handleClear = () => {
    setSelectedFile(null);
    setPastedText("");
    setSummaryResult(null);
  };

  const handleUpload = async () => {
    if (activeTab === "file" && !selectedFile) {
      toast.error("Please select a file first!");
      return;
    }
    if (activeTab === "text" && !pastedText.trim()) {
      toast.error("Please paste some text first!");
      return;
    }

    setIsLoading(true);
    setSummaryResult(null);

    try {
      let response;

      if (activeTab === "file") {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("format", format);
        formData.append("language", language); 
        response = await axios.post(`${API_URL}/summarize/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        response = await axios.post(`${API_URL}/summarize/text`, {
          text: pastedText,
          format,
          language,
        });
        
      }
console.log("Full response:", response.data);
      setSummaryResult({
        id: response.data.summary._id,
        filename: activeTab === "file" ? selectedFile.name : "Pasted Text",
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
          Upload a file or paste text to get an AI-powered summary instantly
        </p>
      </div>

      <div className="space-y-6">

        {/* Tab switcher */}
        <div className="flex gap-2 p-1 bg-secondary rounded-lg w-fit">
          <button
            onClick={() => { setActiveTab("file"); handleClear(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === "file"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <FileText className="h-4 w-4" />
            Upload File
          </button>
          <button
            onClick={() => { setActiveTab("text"); handleClear(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === "text"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <AlignLeft className="h-4 w-4" />
            Paste Text
          </button>
        </div>

        {/* File upload tab */}
        {activeTab === "file" && (
          <UploadBox
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
            onClear={handleClear}
            disabled={isLoading}
          />
        )}

        {/* Text paste tab */}
        {activeTab === "text" && (
          <div className="relative">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              disabled={isLoading}
              placeholder="Paste your text here — article, paragraph, notes, anything..."
              rows={10}
              className="w-full rounded-xl border-2 border-dashed border-border bg-secondary text-foreground placeholder:text-muted-foreground p-4 text-sm leading-relaxed resize-none focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            />
            {pastedText && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-muted-foreground">
                  {pastedText.trim().split(/\s+/).length} words
                </span>
                <button
                  onClick={handleClear}
                  className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Format + Language + Summarize button — ✅ no duplicates */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <FormatToggle value={format} onChange={setFormat} disabled={isLoading} />
            <LanguageSelector value={language} onChange={setLanguage} disabled={isLoading} />
          </div>

          <button
            onClick={handleUpload}
            disabled={isLoading || (activeTab === "file" ? !selectedFile : !pastedText.trim())}
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

        {/* Summary result */}
        {summaryResult && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                Summary Result
              </h2>
              <SummaryCard
                id={summaryResult.id}
                filename={summaryResult.filename}
                date={summaryResult.date}
                format={summaryResult.format}
                summary={summaryResult.summary}
              />
            </div>
            {summaryResult.contentHash && (
              <DocumentQAPanel
                contentHash={summaryResult.contentHash}
                disabled={isLoading}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
