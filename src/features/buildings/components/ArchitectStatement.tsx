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
    <div className={`space-y-4 ${className || ""}`}>
      <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary">
        Architect's Statement
      </h3>

      {isEditing ? (
        <Textarea
          value={statement}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write the architect's statement here..."
          className="min-h-[150px] text-lg font-light tracking-tight resize-y bg-surface-default"
        />
      ) : (
        <div className="pl-6 border-l-4 border-text-primary/80 py-2">
          <p
            ref={textRef}
            className={`text-xl font-light tracking-tight text-text-primary/90 whitespace-pre-wrap leading-relaxed italic ${!isExpanded ? "line-clamp-5" : ""}`}
          >
            {statement}
          </p>
          {(showReadMore || isExpanded) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-text-secondary hover:text-text-primary mt-2 font-medium hover:underline focus:outline-none"
            >
              {isExpanded ? "Read less" : "Read more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
