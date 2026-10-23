import React, { useState } from "react";
import {
  MessageSquare,
  History,
  Trash2,
  ArrowRight,
  Database,
  FileSpreadsheet,
  Plus,
  Clock,
  Sparkles,
  BarChart3,
  Search,
  Zap,
  Monitor,
  Cloud
} from "lucide-react";
import { formatRelativeTime } from "../lib/chatStorage";

export default function RecentChatsView({
  chats,
  onSelectChat,
  onDeleteChat,
  onClearAll,
  onNewChat,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const filteredChats = chats.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTitle = c.title?.toLowerCase().includes(q);
    const matchMessages = c.messages?.some((m) =>
      typeof m.content === "string" && m.content.toLowerCase().includes(q)
    );
    const matchSource = c.source?.name?.toLowerCase().includes(q);
    return matchTitle || matchMessages || matchSource;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F1117]">
      {/* Top Header */}
      <div className="px-8 py-5 border-b border-[#1E2230] bg-[#111319] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <History size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[17px] font-semibold text-[#F3F4F6]">Recent Chats</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                {chats.length} / 10
              </span>
            </div>
            <p className="text-[12px] text-[#9CA3AF]">
              Previous conversations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {chats.length > 0 && (
            <>
              {confirmClear ? (
                <div className="flex items-center gap-1.5 bg-[#1F171A] border border-red-500/30 px-2 py-1 rounded-md text-[12px]">
                  <span className="text-red-400 mr-1">Clear all {chats.length} chats?</span>
                  <button
                    onClick={() => {
                      onClearAll();
                      setConfirmClear(false);
                    }}
                    className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Yes, clear
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-0.5 bg-[#272B35] hover:bg-[#3E4352] text-[#9CA3AF] rounded text-[11px] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] text-[#9CA3AF] hover:text-red-400 hover:bg-[#1E2230] border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                  title="Clear all recent chats"
                >
                  <Trash2 size={14} />
                  <span>Clear history</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12.5px] font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Search bar if chats exist */}
          {chats.length > 2 && (
            <div className="relative mb-5">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]"
              />
              <input
                type="text"
                placeholder="Search conversations by title, question, or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-[13px] bg-[#151820] border border-[#272B35] hover:border-[#3E4352] focus:border-blue-500 rounded-lg text-[#F3F4F6] placeholder-[#6B7280] focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Empty State */}
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-500/5">
                <History size={28} />
              </div>
              <h3 className="text-[17px] font-semibold text-[#F3F4F6] mb-1.5">
                No conversation history yet
              </h3>
              <p className="text-[13px] text-[#9CA3AF] max-w-sm mb-6">
                When you ask questions or analyze data with Kadash AI Agent, your 10 most recent sessions will be stored here.
              </p>
              <button
                onClick={onNewChat}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[13.5px] font-medium transition-all shadow-md cursor-pointer"
              >
                <Sparkles size={15} />
                <span>Start a conversation</span>
              </button>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF] text-[13px]">
              No conversations match your search query "{searchQuery}".
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChats.map((chat) => {
                const userMessages = chat.messages?.filter((m) => m.role === "User_Message") || [];
                const aiMessages = chat.messages?.filter((m) => m.role === "AI_Message") || [];
                const firstUserQuestion = userMessages[0]?.content || "";
                const lastAiAnswer = aiMessages[aiMessages.length - 1]?.content || "";
                const hasDashboard = aiMessages.some((m) => m.dashboard);

                return (
                  <div
                    key={chat.id}
                    onClick={() => onSelectChat(chat)}
                    className="p-4 rounded-xl bg-[#151820] border border-[#272B35] hover:border-blue-500/50 hover:bg-[#181C26] transition-all cursor-pointer group flex flex-col justify-between gap-3 shadow-sm hover:shadow-md"
                  >
                    {/* Top Row: Title, Time & Delete */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                          <MessageSquare size={14} />
                        </div>
                        <h3 className="text-[14px] font-semibold text-[#F3F4F6] truncate group-hover:text-blue-400 transition-colors">
                          {chat.title || firstUserQuestion || "Conversation"}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11.5px] text-[#6B7280] flex items-center gap-1">
                          <Clock size={12} />
                          {formatRelativeTime(chat.updatedAt || chat.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                          }}
                          className="p-1 text-[#6B7280] hover:text-red-400 rounded hover:bg-[#202432] transition-colors"
                          title="Delete conversation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Preview / Snippet */}
                    <div className="space-y-1 text-[12.5px] text-[#9CA3AF] bg-[#0F1117]/60 p-2.5 rounded-lg border border-[#1E2230]">
                      {firstUserQuestion && (
                        <p className="line-clamp-1">
                          <span className="text-[#6B7280] font-medium mr-1.5">You:</span>
                          <span className="text-[#D1D5DB]">{firstUserQuestion}</span>
                        </p>
                      )}
                      {lastAiAnswer && (
                        <p className="line-clamp-1 text-[12px] text-[#9CA3AF]">
                          <span className="text-[#6B7280] font-medium mr-1.5">AI:</span>
                          <span>{lastAiAnswer.slice(0, 140)}...</span>
                        </p>
                      )}
                    </div>

                    {/* Footer Row: Badges & Resume CTA */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        {/* Source Badge */}
                        {chat.source && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1E29] border border-[#272B35] text-[#9CA3AF]">
                            {chat.source.type === "file" ? (
                              <FileSpreadsheet size={11} className="text-amber-400" />
                            ) : (
                              <Database size={11} className="text-blue-400" />
                            )}
                            <span className="truncate max-w-[140px]">{chat.source.name}</span>
                          </span>
                        )}

                        {/* Model Badge */}
                        {chat.modelId && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1A1E29] border border-[#272B35] text-[#9CA3AF]">
                            {chat.modelId.includes("ollama") ? (
                              <Monitor size={10} className="text-emerald-400" />
                            ) : chat.modelId.includes("groq") ? (
                              <Zap size={10} className="text-orange-400" />
                            ) : (
                              <Cloud size={10} className="text-violet-400" />
                            )}
                            <span className="truncate max-w-[120px]">
                              {chat.modelId.split(":").pop()?.split("/").pop()}
                            </span>
                          </span>
                        )}

                        {/* Message Count */}
                        <span className="px-2 py-0.5 rounded bg-[#1A1E29] border border-[#272B35] text-[#6B7280]">
                          {chat.messages?.length || 0} messages
                        </span>

                        {/* Dashboard Badge */}
                        {hasDashboard && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                            <BarChart3 size={11} />
                            <span>Interactive Dashboard</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[12px] font-medium text-blue-400 opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                        <span>Resume</span>
                        <ArrowRight size={13} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
