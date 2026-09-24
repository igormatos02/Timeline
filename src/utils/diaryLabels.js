/**
 * Diary labels: condominium (condoflow) timeboards call diary entries "posts".
 * Returns a translation function that prefers the `condoPost.<key>` override when the
 * active timeboard is condoflow and falls back to the regular key otherwise.
 */
export function makeDiaryT(t, isCondoflow) {
  return (key, params) => {
    if (isCondoflow) {
      const overrideKey = `condoPost.${key}`;
      const value = t(overrideKey, params);
      if (value !== overrideKey) return value;
    }
    return t(key, params);
  };
}
