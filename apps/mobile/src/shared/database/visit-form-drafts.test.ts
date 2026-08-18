import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./connection", () => ({
  getDatabase: vi.fn()
}));

import {
  buildNewVisitDraftScopeKey,
  buildVisitDraftScopeKey,
  deleteVisitFormDraft,
  deleteVisitFormDraftsForVisit,
  readVisitFormDraft,
  VISIT_FORM_DRAFT_SCHEMA_VERSION,
  writeVisitFormDraft,
  type VisitFormDraftIdentity
} from "./visit-form-drafts";

const db = {
  getFirstSync: vi.fn(),
  runSync: vi.fn<
    (statement: string, ...parameters: unknown[]) => { changes: number }
  >(() => ({ changes: 1 }))
};

const identity: VisitFormDraftIdentity = {
  ownerUserId: "user-public-1",
  scopeKey: "visit:visit-local-1",
  moduleKey: "receta"
};

describe("visit-form-drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds stable scopes for new and existing visits", () => {
    expect(buildNewVisitDraftScopeKey("parcel-1")).toBe("new:parcel-1");
    expect(buildVisitDraftScopeKey("visit-1")).toBe("visit:visit-1");
  });

  it("writes a versioned recipe payload without touching outbox", () => {
    const payload = {
      mezclas: [{ localId: "mix-1" }],
      fitosanidadApps: [{ localId: "app-1", mezclaLocalId: "mix-1" }]
    };

    writeVisitFormDraft(identity, payload, db as never);

    const call = db.runSync.mock.calls[0];
    expect(String(call[0])).toContain("INSERT INTO visit_form_drafts");
    expect(String(call[0])).not.toContain("sync_outbox");
    expect(call.slice(1, 4)).toEqual([
      identity.ownerUserId,
      identity.scopeKey,
      identity.moduleKey
    ]);
    expect(JSON.parse(String(call[4]))).toEqual(payload);
    expect(call[5]).toBe(VISIT_FORM_DRAFT_SCHEMA_VERSION);
  });

  it("reads only the requested owner, scope and module", () => {
    db.getFirstSync.mockReturnValue({
      payload_json: '{"observation":"conservar"}',
      schema_version: VISIT_FORM_DRAFT_SCHEMA_VERSION
    });

    expect(readVisitFormDraft<{ observation: string }>(identity, db as never)).toEqual({
      observation: "conservar"
    });
    expect(db.getFirstSync.mock.calls[0].slice(1)).toEqual([
      identity.ownerUserId,
      identity.scopeKey,
      identity.moduleKey
    ]);
  });

  it("ignores corrupt and incompatible payloads", () => {
    db.getFirstSync.mockReturnValueOnce({
      payload_json: "{invalid",
      schema_version: VISIT_FORM_DRAFT_SCHEMA_VERSION
    });
    expect(readVisitFormDraft(identity, db as never)).toBeNull();

    db.getFirstSync.mockReturnValueOnce({
      payload_json: "{}",
      schema_version: VISIT_FORM_DRAFT_SCHEMA_VERSION + 1
    });
    expect(readVisitFormDraft(identity, db as never)).toBeNull();
  });

  it("deletes one module or every draft for a visit within the same owner", () => {
    deleteVisitFormDraft(identity, db as never);
    deleteVisitFormDraftsForVisit(
      identity.ownerUserId,
      "visit-local-1",
      db as never
    );

    expect(db.runSync.mock.calls[0].slice(1)).toEqual([
      identity.ownerUserId,
      identity.scopeKey,
      identity.moduleKey
    ]);
    expect(db.runSync.mock.calls[1].slice(1)).toEqual([
      identity.ownerUserId,
      identity.scopeKey
    ]);
  });
});
