import { useCallback } from "react";
import { Upload, X, FileText } from "lucide-react";

export function UploadBox({ onFileSelect, selectedFile, onClear, disabled }) {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }, [disabled, onFileSelect]);

  const handleDragOver = (e) => e.preventDefault();

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary"}
        ${selectedFile ? "border-primary bg-primary/5" : "border-border bg-secondary"}
      `}
    >
      {selectedFile ? (
        <div className="flex items-center justify-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div className="text-left">
            <p className="font-medium text-foreground">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          {!disabled && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="ml-4 text-muted-foreground hover:text-red-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      ) : (
        <label className="cursor-pointer block">
          <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">
            Drop your file here or click to browse
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Supports PDF and DOCX files up to 10MB
          </p>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleChange}
            className="hidden"
            disabled={disabled}
          />
        </label>
      )}
    </div>
  );
}