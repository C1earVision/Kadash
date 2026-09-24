import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Copy, Trash2, Search, Send, MessageSquare, Package, LogOut, Check, Loader2, ArrowDown } from "lucide-react";
import { API_URL, AI_API_URL } from "../config/api";
import { useNavigate } from "react-router-dom";
import MarkdownContent, { ChartImage } from "../components/MarkdownContent";

/* ─── URL normaliser (unchanged logic) ─── */
function normalizeVisualizationUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  const aiBase = AI_API_URL.replace(/\/$/, "");
  if (trimmed.startsWith("/")) {
    return `${aiBase}${trimmed}`;
  }

  try {
    const apiOrigin = new URL(aiBase).origin;
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/visualizations/")) {
      return `${apiOrigin}${parsed.pathname}`;
    }
  } catch {
    // keep original URL if parsing fails
  }

  return trimmed;
}

/* ─── Agent label helper ─── */
function agentLabel(agent) {
  const map = {
    use_rag_agent: "RAG Agent",
    use_web_search_agent: "Search Agent",
    use_crud_agent: "CRUD Agent",
    use_data_analysis_and_visualization_agent: "Analysis Agent",
  };
  return map[agent] || agent;
}

/* ════════════════════════════════════════════════════════════════
   Dashboard — product catalog table
   ════════════════════════════════════════════════════════════════ */
function DashBoard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Search states
  const [searchField, setSearchField] = useState("Name");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const fetchProducts = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) {
        setError("Please log in first to view products");
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/products`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        setProducts(res.data.Products);
      } catch (err) {
        setError("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleCopy = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      alert("You must be logged in");
      return;
    }
    try {
      await axios.delete(`${API_URL}/user/admin/${id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setProducts((prev) => prev.filter((p) => p.ProductId !== id));
    } catch (err) {
      console.error("Failed to delete product:", err);
      alert("Failed to delete product");
    }
  };

  // Get unique categories for dropdown
  const categories = ["All", ...new Set(products.map((p) => p.Category))];

  // Filtering logic
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchField === "ID"
        ? p.ProductId.toString().toLowerCase().includes(searchTerm.toLowerCase())
        : p.Name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" || p.Category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[#9CA3AF]" />
        <span className="ml-2 text-[14px] text-[#9CA3AF]">Loading products…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-[14px] text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-[18px] font-semibold text-[#F3F4F6]">Products</h2>
        <p className="text-[13px] text-[#6B7280] mt-0.5">
          {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"}
          {selectedCategory !== "All" && ` in ${selectedCategory}`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value)}
          className="px-3 py-1.5 text-[13px] rounded-md bg-[#151820] text-[#D1D5DB] border border-[#272B35] focus:outline-none focus:border-[#2563EB] transition-colors"
        >
          <option value="Name">Name</option>
          <option value="ID">ID</option>
        </select>

        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" size={15} />
          <input
            type="text"
            placeholder={`Search by ${searchField.toLowerCase()}…`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-md bg-[#151820] text-[#D1D5DB] border border-[#272B35] placeholder-[#4B5563] focus:outline-none focus:border-[#2563EB] transition-colors"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 text-[13px] rounded-md bg-[#151820] text-[#D1D5DB] border border-[#272B35] focus:outline-none focus:border-[#2563EB] transition-colors"
        >
          {categories.map((cat, i) => (
            <option key={i} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-md border border-[#272B35]">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#151820] text-[#9CA3AF] text-left text-[12px] uppercase tracking-wider">
              <th className="px-4 py-2.5 font-medium">ID</th>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Price</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Brand</th>
              <th className="px-4 py-2.5 font-medium">Stock</th>
              <th className="px-4 py-2.5 font-medium w-[80px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2230]">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => (
                <tr
                  key={p.ProductId}
                  className="text-[#D1D5DB] hover:bg-[#151820]/60 transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-[12px] text-[#9CA3AF]">
                    {p.ProductId}
                  </td>
                  <td className="px-4 py-2.5 text-[#F3F4F6]">{p.Name}</td>
                  <td className="px-4 py-2.5">${p.Price}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-1.5 py-0.5 text-[11px] rounded bg-[#1E2230] text-[#9CA3AF]">
                      {p.Category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{p.Brand}</td>
                  <td className="px-4 py-2.5">{p.StockQuantity}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(p.ProductId)}
                        className="p-1 rounded text-[#6B7280] hover:text-[#D1D5DB] hover:bg-[#272B35] transition-colors"
                        title="Copy ID"
                      >
                        {copiedId === p.ProductId ? (
                          <Check size={14} className="text-green-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(p.ProductId)}
                        className="p-1 rounded text-[#6B7280] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Delete product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-8 text-[13px] text-[#6B7280]">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   ChatView — agent chat interface
   ════════════════════════════════════════════════════════════════ */
function ChatView() {
  const baseMessage = {
    role: 'AI_Message',
    content: `Hi! I'm your dashboard agent. I can help you manage your business data.\n\nHere are some things you can ask:\n- Look up product info, pricing, or availability\n- Add, update, or remove products\n- Get business statistics — sales, profit, top sellers\n- Generate charts and visual reports`
  };

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([baseMessage]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(["Context: "]));
    localStorage.setItem("admin", JSON.stringify(false));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollBtn(distanceFromBottom > 100);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessage = { role: "User_Message", content: input };
    let storedMessages =
      JSON.parse(localStorage.getItem("messages")) || ["Context: "];
    storedMessages.push(`${newMessage.role}: ${newMessage.content};`);
    localStorage.setItem("messages", JSON.stringify(storedMessages));

    setMessages((prev) => [
      ...prev,
      newMessage,
      { role: "AI_Message", content: "Searching...", isLoading: true },
    ]);
    setInput("");
    setLoading(true);
    inputRef.current?.focus();

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) {
        setMessages((prev) => {
          const filtered = prev.filter((msg) => !msg.isLoading);
          return [...filtered, { role: "AI_Message", content: "Please log in first to use the agent." }];
        });
        setLoading(false);
        return;
      }

      const payLoad = {
        question:
          JSON.parse(localStorage.getItem("messages")).join(" ") +
          ` token:${user.token}`,
        admin: user.user.AdminState,
      };
      const res = await axios.post(`${AI_API_URL}/query`, payLoad);

      const imageUrl = normalizeVisualizationUrl(res.data.image);
      const aiMessage = {
        role: "AI_Message",
        content: res.data.answer,
        agent: res.data.agent,
        ...(imageUrl ? { image: imageUrl } : {}),
      };

      let updatedMessages =
        JSON.parse(localStorage.getItem("messages")) || [];
      updatedMessages.push(`${aiMessage.role}: ${aiMessage.content};`);
      localStorage.setItem("messages", JSON.stringify(updatedMessages));

      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isLoading);
        return [...filtered, aiMessage];
      });
    } catch (err) {
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isLoading);
        return [
          ...filtered,
          {
            role: "AI_Message",
            content: `Error connecting to AI. ${err.response?.data?.error || "Please try again."}`,
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 relative"
      >
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "User_Message" ? (
                /* User message */
                <div className="flex justify-end">
                  <div className="max-w-[75%] px-3.5 py-2.5 rounded-lg bg-[#1E2230] text-[14px] text-[#F3F4F6] leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              ) : (
                /* AI message */
                <div className="flex justify-start">
                  <div className="w-full max-w-[95%]">
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2 text-[14px] text-[#6B7280]">
                        <Loader2 size={15} className="animate-spin" />
                        <span>Thinking…</span>
                      </div>
                    ) : (
                      <>
                        <MarkdownContent content={msg.content} />
                        {msg.image && (
                          <ChartImage
                            src={msg.image}
                            alt="Generated visualization"
                          />
                        )}
                        {msg.agent && (
                          <p className="mt-1.5 text-[11px] text-[#6B7280]">
                            via {agentLabel(msg.agent)}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll-to-bottom button */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="sticky bottom-4 left-1/2 -translate-x-1/2 p-2 rounded-full bg-[#272B35] text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#353a47] transition-colors shadow-lg"
          >
            <ArrowDown size={16} />
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-[#1E2230] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask anything about your business…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading}
            className="flex-1 px-3.5 py-2 text-[14px] text-[#F3F4F6] bg-[#151820] border border-[#272B35] rounded-md placeholder-[#4B5563] focus:outline-none focus:border-[#2563EB] disabled:opacity-50 transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   Main Layout — sidebar + content area
   ════════════════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState("agent");
  const navigate = useNavigate();

  const user = (() => {
    try {
      const data = JSON.parse(localStorage.getItem("user"));
      return data?.user || null;
    } catch {
      return null;
    }
  })();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("messages");
    localStorage.removeItem("admin");
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-[#0F1117] text-[#F3F4F6] overflow-hidden">
      {/* ─── Sidebar ─── */}
      <aside className="w-56 flex flex-col border-r border-[#1E2230] bg-[#0F1117]">
        {/* Logo */}
        <div className="px-5 py-5">
          <span className="text-[17px] font-semibold tracking-tight text-[#F3F4F6]">
            Kadash
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3">
          <div className="space-y-0.5">
            <button
              onClick={() => setPage("agent")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
                page === "agent"
                  ? "bg-[#2563EB]/10 text-[#3B82F6]"
                  : "text-[#9CA3AF] hover:text-[#D1D5DB] hover:bg-[#151820]"
              }`}
            >
              <MessageSquare size={16} />
              Agent
            </button>
            <button
              onClick={() => setPage("dashboard")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
                page === "dashboard"
                  ? "bg-[#2563EB]/10 text-[#3B82F6]"
                  : "text-[#9CA3AF] hover:text-[#D1D5DB] hover:bg-[#151820]"
              }`}
            >
              <Package size={16} />
              Products
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 mt-auto">
          {user && (
            <div className="px-3 py-2 mb-2">
              <p className="text-[12px] text-[#6B7280] truncate">{user.Email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[#9CA3AF] hover:text-[#D1D5DB] hover:bg-[#151820] transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ─── Content ─── */}
      <main className="flex-1 flex flex-col min-h-0 bg-[#0F1117]">
        {page === "agent" ? <ChatView /> : <DashBoard />}
      </main>
    </div>
  );
}
