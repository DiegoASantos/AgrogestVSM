import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import {
  deleteVisitFormDraft,
  type VisitFormDraftIdentity,
  writeVisitFormDraft
} from "../database/visit-form-drafts";

const DEFAULT_DEBOUNCE_MS = 300;

type UseVisitFormDraftOptions<T> = {
  enabled: boolean;
  identity: VisitFormDraftIdentity | null;
  value: T;
  debounceMs?: number;
};

export function useVisitFormDraft<T>({
  debounceMs = DEFAULT_DEBOUNCE_MS,
  enabled,
  identity,
  value
}: UseVisitFormDraftOptions<T>) {
  const identityRef = useRef(identity);
  const valueRef = useRef(value);
  const initializedRef = useRef(false);
  const identityKeyRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const pendingIdentityRef = useRef<VisitFormDraftIdentity | null>(null);
  const pendingValueRef = useRef<T | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  identityRef.current = identity;
  valueRef.current = value;

  const flush = useCallback(() => {
    if (!dirtyRef.current || !pendingIdentityRef.current) {
      return;
    }

    writeVisitFormDraft(pendingIdentityRef.current, pendingValueRef.current);
    dirtyRef.current = false;
    pendingIdentityRef.current = null;
    pendingValueRef.current = null;
  }, []);

  const clearDraft = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (identityRef.current) {
      deleteVisitFormDraft(identityRef.current);
    }

    dirtyRef.current = false;
    pendingIdentityRef.current = null;
    pendingValueRef.current = null;
  }, []);

  useEffect(() => {
    const identityKey = identity
      ? `${identity.ownerUserId}:${identity.scopeKey}:${identity.moduleKey}`
      : null;

    if (identityKeyRef.current !== identityKey) {
      flush();
      identityKeyRef.current = identityKey;
      initializedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    if (!enabled || !identity) {
      initializedRef.current = false;
      return;
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    dirtyRef.current = true;
    pendingIdentityRef.current = identity;
    pendingValueRef.current = value;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      flush();
    }, debounceMs);
  }, [debounceMs, enabled, flush, identity, value]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        flush();
      }
    });

    return () => {
      subscription.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      flush();
    };
  }, [flush]);

  return { clearDraft, flushDraft: flush };
}
