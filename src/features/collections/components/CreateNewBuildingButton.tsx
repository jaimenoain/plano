import { useNavigate } from "react-router";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreateNewBuildingButtonProps {
  /** Seeds the new building's name via `?name=`. */
  searchQuery: string;
  /** Same-origin path the create flow returns to (reopens the modal). */
  returnTo?: string;
}

/**
 * "Create new building" CTA shown in the Add-to-Collection modal when a search
 * has no match. Launches `/add-building` with the search text as the name and,
 * when provided, a `returnTo` so the create flow bounces back to the modal.
 */
export function CreateNewBuildingButton({ searchQuery, returnTo }: CreateNewBuildingButtonProps) {
  const navigate = useNavigate();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        navigate(
          `/add-building?name=${encodeURIComponent(searchQuery)}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`,
        )
      }
      className="gap-2"
    >
      <PlusCircle className="h-4 w-4" />
      Create new building
    </Button>
  );
}
