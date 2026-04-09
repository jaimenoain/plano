// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Person } from "@/features/credits/types";
import { EditPersonForm } from "./EditPersonForm";

const { updatePersonMock } = vi.hoisted(() => ({
  updatePersonMock: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "a@b.com" }, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/features/credits/api/people", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/people")>();
  return {
    ...actual,
    updatePerson: (...args: unknown[]) => updatePersonMock(...args),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://storage/avatar.png" } }),
      })),
    },
  },
}));

vi.mock("@/lib/image-compression", () => ({
  resizeImage: vi.fn(async (f: File) => f),
}));

const basePerson: Person = {
  id: "p1",
  name: "Jane Doe",
  slug: "jane-doe",
  bio: "Original bio",
  nationality: null,
  birthYear: null,
  deathYear: null,
  avatarUrl: null,
  website: null,
  locationNote: null,
  claimedByUserId: "u1",
  claimStatus: "claimed",
  createdAt: "t0",
  updatedAt: "t0",
};

describe("EditPersonForm (QA 3.2)", () => {
  beforeEach(() => {
    updatePersonMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("submits bio change via updatePerson and calls onSaved with returned person", async () => {
    const updated: Person = { ...basePerson, bio: "Saved bio line" };
    updatePersonMock.mockResolvedValue(updated);
    const onSaved = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <EditPersonForm open person={basePerson} onOpenChange={onOpenChange} onSaved={onSaved} />,
    );

    fireEvent.change(screen.getByLabelText("Bio"), { target: { value: "Saved bio line" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updatePersonMock).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ bio: "Saved bio line" }),
      );
    });
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(updated);
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
