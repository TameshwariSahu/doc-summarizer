const formats = [
  { value: "bullets", label: "Bullet Points" },
  { value: "paragraph", label: "Paragraph" }
];

export function FormatToggle({ value, onChange, disabled }) {
  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {formats.map((f) => (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            disabled={disabled}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all
              ${value === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-foreground border-border hover:border-primary"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}