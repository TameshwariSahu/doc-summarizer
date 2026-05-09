import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center px-4">
      <h1 className="text-8xl font-bold text-primary">404</h1>
      <p className="mt-4 text-2xl font-semibold text-foreground">Page Not Found!</p>
      <p className="mt-2 text-muted-foreground">
        The page your are finding not exists
      </p>
      <Link
        to="/"
        className="mt-8 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
      >
        Go to Home Page
      </Link>
    </div>
  );
}