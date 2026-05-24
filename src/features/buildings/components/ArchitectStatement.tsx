import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";

interface ArchitectStatementProps {
  statement: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  className?: string;
  /** Name shown as attribution below the statement (e.g. the lead architect's name) */
  architectName?: string;
}

export const ArchitectStatement = ({
  statement,
  isEditing,
  onChange,
  className,
  architectName,
}: ArchitectStatementProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      const el = textRef.current;
      if (el && !isExpanded) {
        setShowReadMore(el.scrollHeight > el.clientHeight);
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [statement, isExpanded]);

  if (!statement && !isEditing) return null;

  return (
    <div className={className || ""}>
      {/* Editorial blockquote: neon left rule, no card box */}
      <div className="border-l-2 border-text-primary pl-5 py-0.5">
        {isEditing ? (
          <Textarea
            value={statement}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write the architect's statement here..."
            className="min-h-[150px] text-base leading-relaxed resize-y bg-surface-default"
          />
        ) : (
          <div>
            <p
              ref={textRef}
              className={`text-base leading-relaxed text-text-secondary whitespace-pre-wrap ${
                !isExpanded ? "line-clamp-5" : ""
              }`}
            >
              {statement}
            </p>
            {architectName && (
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-disabled">
                — {architectName}
              </p>
            )}
            {(showReadMore || isExpanded) && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-xs uppercase tracking-wide text-text-secondary hover:text-text-primary font-medium hover:underline focus:outline-none"
              >
                {isExpanded ? "Read less" : "Read more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};