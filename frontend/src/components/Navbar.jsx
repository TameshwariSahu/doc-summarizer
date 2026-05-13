import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { FileText, History, LogOut, Sun, Moon } from "lucide-react";
import { toast } from "sonner";

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully!");
    navigate("/login");
  };

  if (!isAuthenticated) return null;

  return (
     <nav className="border-b border-border bg-card px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary font-bold text-lg">
          <FileText className="h-5 w-5" />
          DocSummarizer
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">
            Hey, {user?.name}!
          </span>
          <Link
            to="/history"
            className="flex items-center gap-1 text-sm text-foreground hover:text-primary transition-colors"
          >
            <History className="h-4 w-4" />
            History
          </Link>
          <button
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-foreground hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}