// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Company } from "@/features/credits/types";
import { EditCompanyForm } from "./EditCompanyForm";

const { updateCompanyMock } = vi.hoisted(() => ({
  updateCompanyMock: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "a@b.com" }, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/features/credits/api/companies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/companies")>();
  return {
    ...actual,
    updateCompany: (...args: unknown[]) => updateCompanyMock(...args),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://storage.test/logo.png" } }),
      })),
    },
  },
}));

vi.mock("@/lib/image-compression", () => ({
  resizeImage: vi.fn(async (f: File) => f),
}));

const baseCompany: Company = {
  id: "co1",
  name: "StructCo GmbH",
  slug: "structco",
  bio: "Original bio",
  country: "Germany",
  foundedYear: 1990,
  dissolvedYear: null,
  logoUrl: null,
  website: "structco.example",
  verifiedDomain: null,
  claimStatus: "claimed",
  createdAt: "t0",
  updatedAt: "t0",
};

describe("EditCompanyForm (QA 4.2)", () => {
  beforeEach(() => {
    updateCompanyMock.mockReset();
    vi.stubGlobal("crypto", { randomUUID: () => "00000000-0000-4000-8000-000000000099" });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("submits bio change via updateCompany and calls onSaved with returned company", async () => {
    const updated: Company = { ...baseCompany, bio: "Updated company bio" };
    updateCompanyMock.mockResolvedValue(updated);
    const onSaved = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <EditCompanyForm open company={baseCompany} onOpenChange={onOpenChange} onSaved={onSaved} />,
    );

    fireEvent.change(screen.getByLabelText(/bio/i), { target: { value: "Updated company bio" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateCompanyMock).toHaveBeenCalledWith(
        "co1",
        expect.objectContaining({ bio: "Updated company bio" }),
      );
    });
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(updated);
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("after logo upload, save sends logoUrl from storage to updateCompany", async () => {
    const updated: Company = { ...baseCompany, logoUrl: "https://storage.test/logo.png" };
    updateCompanyMock.mockResolvedValue(updated);
    const onSaved = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <EditCompanyForm open company={baseCompany} onOpenChange={onOpenChange} onSaved={onSaved} />,
    );

    const file = new File(["x"], "logo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload company logo"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateCompanyMock).toHaveBeenCalledWith(
        "co1",
        expect.objectContaining({ logoUrl: "https://storage.test/logo.png" }),
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
