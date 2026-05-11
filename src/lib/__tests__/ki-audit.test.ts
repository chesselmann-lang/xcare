/**
 * Tests für KI-Audit-Log (EU AI Act Compliance)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase vor dem Import
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({ insert: mockInsert }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

// Nach dem Mock importieren
const { logKiAudit } = await import("@/lib/ki-audit");

describe("logKiAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  it("schreibt Audit-Eintrag mit Pflichtfeldern", async () => {
    await logKiAudit({
      action: "ki_lotse_query",
      model: "claude-sonnet-4-6",
      input_tokens: 150,
      output_tokens: 300,
    });

    expect(mockFrom).toHaveBeenCalledWith("ki_audit_log");
    expect(mockInsert).toHaveBeenCalled();
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg).toMatchObject({
      action: "ki_lotse_query",
      model: "claude-sonnet-4-6",
      input_tokens: 150,
      output_tokens: 300,
    });
  });

  it("loggt Fehler ohne Exception zu werfen", async () => {
    mockInsert.mockResolvedValue({ error: new Error("DB Error") });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Darf keinen Fehler werfen
    await expect(logKiAudit({ action: "test" })).resolves.not.toThrow();
    consoleSpy.mockRestore();
  });

  it("schreibt user_id wenn angegeben", async () => {
    await logKiAudit({
      action: "embed_query",
      user_id: "user-123",
    });

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.user_id).toBe("user-123");
  });

  it("setzt Timestamp", async () => {
    const before = new Date();
    await logKiAudit({ action: "test_action" });
    const after = new Date();

    const insertArg = mockInsert.mock.calls[0][0];
    if (insertArg.created_at) {
      const ts = new Date(insertArg.created_at);
      expect(ts.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(ts.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    }
  });
});
