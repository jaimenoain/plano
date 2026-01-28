/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, mock, beforeAll } from "bun:test";

// Polyfill localStorage
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
} as any;

const mockInvoke = mock(() => Promise.resolve({ data: { uploadUrl: "http://mock-url.com/upload", key: "mock-key" }, error: null }));

// Mock the supabase library
mock.module("@supabase/supabase-js", () => {
    return {
        createClient: () => ({
            functions: {
                invoke: mockInvoke
            },
            auth: {
                getSession: () => Promise.resolve({
                    data: {
                        session: { access_token: "mock-token" }
                    }
                })
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

    it("should successfully upload a file", async () => {
        mockInvoke.mockClear();

        // Mock global fetch
        const originalFetch = global.fetch;
        const mockFetch = mock(() => Promise.resolve(new Response("OK", { status: 200 })));
        global.fetch = mockFetch;

        const file = new File(["test content"], "test.txt", { type: "text/plain" });
        // Bun adds charset=utf-8 for text/plain created from string/buffer?
        const expectedType = file.type;

        try {
            const result = await uploadFile(file);
            expect(result).toBe("mock-key");

            expect(mockInvoke).toHaveBeenCalled();
            expect(mockInvoke.mock.calls[0][0]).toBe("generate-upload-url");
            expect(mockInvoke.mock.calls[0][1]).toEqual({
                body: {
                    fileName: "test.txt",
                    contentType: expectedType,
                    folderName: undefined
                },
                headers: {
                    Authorization: "Bearer mock-token"
                }
            });

            expect(mockFetch).toHaveBeenCalled();
            expect(mockFetch.mock.calls[0][0]).toBe("http://mock-url.com/upload");
            expect(mockFetch.mock.calls[0][1].method).toBe("PUT");
            expect(mockFetch.mock.calls[0][1].headers["Content-Type"]).toBe(expectedType);

        } finally {
            global.fetch = originalFetch;
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
        // Reset mockInvoke to success
        mockInvoke.mockImplementationOnce(() => Promise.resolve({ data: { uploadUrl: "http://mock-url.com/upload", key: "mock-key" }, error: null }));

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
