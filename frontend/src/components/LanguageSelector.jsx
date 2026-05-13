const languages = [
  { value: "English", label: "English" },
  { value: "Hindi", label: "हिंदी" },
  { value: "Gujarati", label: "ગુજરાતી" },
  { value: "Marathi", label: "मराठी" },
  { value: "Bengali", label: "বাংলা" },
  { value: "Tamil", label: "தமிழ்" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "Arabic", label: "العربية" },
];

export function LanguageSelector({ value, onChange, disabled }) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">Summary Language</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="px-3 py-2 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 cursor-pointer"
      >
        {languages.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}