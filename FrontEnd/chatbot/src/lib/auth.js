/**
 * Session from Node login: { user, token } in localStorage.
 */

export function getStoredAuth() {
  try {
    const data = JSON.parse(localStorage.getItem("user"));
    if (!data?.token) return null;
    const { Password: _pw, ...safeUser } = data.user || {};
    return { token: data.token, user: safeUser };
  } catch {
    return null;
  }
}

/** @returns {Record<string, string>} */
export function authHeaders(extra = {}) {
  const auth = getStoredAuth();
  if (!auth?.token) return { ...extra };
  return { ...extra, Authorization: `Bearer ${auth.token}` };
}
