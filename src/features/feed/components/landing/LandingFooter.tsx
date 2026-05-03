import { Link } from "react-router";

export function LandingFooter() {
  return (
    <footer className="border-t border-border-default py-8 px-5 md:px-8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <span className="text-[11px] text-text-disabled tracking-wide">
            © {new Date().getFullYear()} Plano
          </span>
          <Link
            to="/privacy"
            className="text-[11px] text-text-disabled hover:text-text-secondary transition-colors tracking-wide"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="text-[11px] text-text-disabled hover:text-text-secondary transition-colors tracking-wide"
          >
            Terms
          </Link>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="https://instagram.com/plano.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium tracking-[0.1em] uppercase text-text-disabled hover:text-text-secondary transition-colors"
          >
            Instagram
          </a>
          <span className="text-text-disabled text-xs">·</span>
          <a
            href="https://x.com/planoapp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium tracking-[0.1em] uppercase text-text-disabled hover:text-text-secondary transition-colors"
          >
            X
          </a>
        </div>
      </div>
    </footer>
  );
}
