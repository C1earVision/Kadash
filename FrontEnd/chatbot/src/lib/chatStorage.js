// Local storage manager for recent chat conversations (capped at 10)

const STORAGE_KEY = "kadash_recent_chats";
const MAX_CHATS = 10;

/**
 * Generate a short, readable title from the user's first prompt.
 */
export function generateChatTitle(prompt) {
  if (!prompt || typeof prompt !== "string") return "New Conversation";
  const clean = prompt
    .replace(/^Context:\s*/i, "")
    .replace(/token:\S+/gi, "")
    .trim();
  if (!clean) return "New Conversation";
  const firstLine = clean.split("\n")[0].trim();
  return firstLine.length > 50 ? `${firstLine.slice(0, 48)}…` : firstLine;
}

/**
 * Get all saved recent chats (up to 10), sorted by updatedAt descending.
 */
export function getRecentChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_CHATS);
  } catch (err) {
    console.error("Failed to load recent chats from localStorage:", err);
    return [];
  }
}

/**
 * Save or update a chat session in the list.
 * Inserts/moves the chat to index 0, keeps at most 10 items.
 */
export function saveChatSession(session) {
  if (!session || !session.id) return [];
  try {
    const chats = getRecentChats();
    const existingIndex = chats.findIndex((c) => c.id === session.id);

    const updatedSession = {
      ...session,
      updatedAt: new Date().toISOString(),
    };

    let updatedList;
    if (existingIndex >= 0) {
      // Remove old position and place updated at the front
      chats.splice(existingIndex, 1);
      updatedList = [updatedSession, ...chats];
    } else {
      updatedList = [updatedSession, ...chats];
    }

    const trimmed = updatedList.slice(0, MAX_CHATS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch (err) {
    console.error("Failed to save chat session:", err);
    return [];
  }
}

/**
 * Delete a chat session by id.
 */
export function deleteChatSession(sessionId) {
  try {
    const chats = getRecentChats();
    const filtered = chats.filter((c) => c.id !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.error("Failed to delete chat session:", err);
    return [];
  }
}

/**
 * Clear all chat history.
 */
export function clearAllChats() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  } catch (err) {
    console.error("Failed to clear chat history:", err);
    return [];
  }
}

/**
 * Format relative time (e.g. "5m ago", "2h ago", "Yesterday", "Oct 22").
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
