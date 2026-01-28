/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, mock, beforeAll, beforeEach } from "bun:test";

// Polyfill localStorage
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
} as any;

const mockInvoke = mock(() => Promise.resolve({ data: { uploadUrl: "http://mock-url.com/upload", key: "mock-key" }, error: null }));
const mockGetUser = mock(() => Promise.resolve({ data: { user: { id: "mock-user" } }, error: null }));
const mockRefreshSession = mock(() => Promise.resolve({ data: { session: { access_token: "refreshed-token" } }, error: null }));
const mockGetSession = mock(() => Promise.resolve({ data: { session: { access_token: "mock-token" } } }));

// Mock the supabase library
mock.module("@supabase/supabase-js", () => {
    return {
        createClient: () => ({
            functions: {
                invoke: mockInvoke
            },
            auth: {
                getSession: mockGetSession,
                getUser: mockGetUser,
                refreshSession: mockRefreshSession,
            }
        })
    };
});

describe("uploadFile", () => {
    let uploadFile: any;

    beforeAll(async () => {
        // Dynamic import to ensure polyfills and mocks are active
        const module = await import("../src/utils/upload");
        uploadFile = module.uploadFile;
    });

    beforeEach(() => {
        mockInvoke.mockClear();
        mockGetUser.mockClear();
        mockRefreshSession.mockClear();
        mockGetSession.mockClear();

        // Reset default behaviors
        mockInvoke.mockImplementation(() => Promise.resolve({ data: { uploadUrl: "http://mock-url.com/upload", key: "mock-key" }, error: null }));
        mockGetUser.mockImplementation(() => Promise.resolve({ data: { user: { id: "mock-user" } }, error: null }));
        mockRefreshSession.mockImplementation(() => Promise.resolve({ data: { session: { access_token: "refreshed-token" } }, error: null }));
    });

    it("should successfully upload a file when getUser succeeds", async () => {
        // Mock global fetch
        const originalFetch = global.fetch;
        const mockFetch = mock(() => Promise.resolve(new Response("OK", { status: 200 })));
        global.fetch = mockFetch;

        const file = new File(["test content"], "test.txt", { type: "text/plain" });
        const expectedType = file.type;

        try {
            const result = await uploadFile(file);
            expect(result).toBe("mock-key");

            expect(mockGetUser).toHaveBeenCalled();
            expect(mockRefreshSession).not.toHaveBeenCalled();

            expect(mockInvoke).toHaveBeenCalled();
            expect(mockInvoke.mock.calls[0][0]).toBe("generate-upload-url");

            expect(mockFetch).toHaveBeenCalled();
        } finally {
            global.fetch = originalFetch;
        }
    });

    it("should attempt refresh session if getUser fails", async () => {
        // Mock getUser failure
        mockGetUser.mockImplementationOnce(() => Promise.resolve({ error: { message: "Token expired" } }));

        // Mock global fetch
        const originalFetch = global.fetch;
        const mockFetch = mock(() => Promise.resolve(new Response("OK", { status: 200 })));
        global.fetch = mockFetch;

        const file = new File(["test content"], "test.txt", { type: "text/plain" });

        try {
            const result = await uploadFile(file);
            expect(result).toBe("mock-key");

            expect(mockGetUser).toHaveBeenCalled();
            expect(mockRefreshSession).toHaveBeenCalled(); // Should attempt refresh
            expect(mockInvoke).toHaveBeenCalled();
        } finally {
            global.fetch = originalFetch;
        }
    });

    it("should throw error if getUser fails AND refreshSession fails", async () => {
        // Mock getUser failure
        mockGetUser.mockImplementationOnce(() => Promise.resolve({ error: { message: "Token expired" } }));
        // Mock refreshSession failure
        mockRefreshSession.mockImplementationOnce(() => Promise.resolve({ data: { session: null }, error: { message: "Refresh failed" } }));

        const file = new File(["test content"], "test.txt", { type: "text/plain" });

        try {
            await uploadFile(file);
            expect(true).toBe(false); // Should fail
        } catch (e: any) {
            expect(e.message).toContain("User not authenticated");
        }
    });

    it("should throw error if generate-upload-url fails", async () => {
        mockInvoke.mockImplementationOnce(() => Promise.resolve({ data: null, error: { message: "Mock Error" } }));

        const file = new File(["test"], "test.txt", { type: "text/plain" });

        try {
            await uploadFile(file);
            expect(true).toBe(false); // Should fail
        } catch (e: any) {
            expect(e.message).toContain("Failed to generate upload URL: Mock Error");
        }
    });

    it("should throw error if upload fetch fails", async () => {
        const originalFetch = global.fetch;
        const mockFetch = mock(() => Promise.resolve(new Response("Error", { status: 500, statusText: "Internal Server Error" })));
        global.fetch = mockFetch;

        const file = new File(["test"], "test.txt", { type: "text/plain" });

        try {
            await uploadFile(file);
            expect(true).toBe(false); // Should fail
        } catch (e: any) {
            expect(e.message).toContain("Failed to upload file: Internal Server Error");
        } finally {
            global.fetch = originalFetch;
        }
    });
});
