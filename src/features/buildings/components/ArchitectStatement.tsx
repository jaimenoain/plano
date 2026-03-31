import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";

interface ArchitectStatementProps {
  statement: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  className?: string;
}

export const ArchitectStatement = ({ statement, isEditing, onChange, className }: ArchitectStatementProps) => {
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
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [statement, isExpanded]);

  if (!statement && !isEditing) return null;

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="bg-brand-secondary border border-border-default rounded-sm p-6">
        <h3 className="text-xs font-medium text-brand-secondary-foreground uppercase tracking-wide mb-3">
          Architect&apos;s Statement
        </h3>

        {isEditing ? (
          <Textarea
            value={statement}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write the architect's statement here..."
            className="min-h-[150px] text-base leading-relaxed italic resize-y bg-surface-default"
          />
        ) : (
          <div>
            <p
              ref={textRef}
              className={`text-base leading-relaxed italic text-text-primary/90 whitespace-pre-wrap ${!isExpanded ? "line-clamp-5" : ""}`}
            >
              {statement}
            </p>
            {(showReadMore || isExpanded) && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-3 text-sm text-text-secondary hover:text-text-primary font-medium hover:underline focus:outline-none"
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
