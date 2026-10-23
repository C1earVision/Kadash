import axios from "axios";
import { AI_API_URL } from "../config/api";
import { authHeaders } from "./auth";

export const DEFAULT_SOURCE = {
  source_id: "default",
  name: "Default Database",
  type: "database",
};

/**
 * @returns {Promise<Array<{ source_id: string, name: string, type: string, tables?: string[] }>>}
 */
export async function fetchServerDataSources() {
  const res = await axios.get(`${AI_API_URL}/data-sources/active`, {
    headers: authHeaders(),
  });
  return res.data?.data_sources || [];
}

/**
 * Match a stored source snapshot against the live server list.
 * @param {object | null | undefined} stored
 * @param {Array<{ source_id: string, name: string, type: string }>} serverList
 */
export function reconcileSourceWithServer(stored, serverList) {
  const id = stored?.source_id || DEFAULT_SOURCE.source_id;
  const match = serverList.find((s) => s.source_id === id);
  if (match) {
    return { ...DEFAULT_SOURCE, ...stored, ...match };
  }
  return { ...DEFAULT_SOURCE };
}

/**
 * Build active source from a query response (authoritative after each run).
 * @param {import("../types/agentApi").QueryResponse} payload
 */
export function sourceFromQueryResponse(payload) {
  if (!payload?.source_id) return null;
  return {
    source_id: payload.source_id,
    name: payload.source_name || DEFAULT_SOURCE.name,
    type: payload.source_id.startsWith("file_") ? "file" : "database",
  };
}
