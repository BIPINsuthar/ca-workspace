export type ActionState = { ok?: boolean; error?: string; message?: string; id?: string; at?: number };

export const ok = (message?: string, id?: string): ActionState => ({ ok: true, message, id, at: Date.now() });
export const fail = (error: string): ActionState => ({ ok: false, error, at: Date.now() });

/** Read trimmed text from FormData; empty → null. */
export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}
