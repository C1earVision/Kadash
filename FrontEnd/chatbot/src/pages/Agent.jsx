import { useState, useEffect } from "react";
import axios from "axios";
import { Copy, Trash, Search } from "lucide-react"; // icon for copy button
import { API_URL, AI_API_URL } from "../config/api";


function DashBoard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Search states
  const [searchField, setSearchField] = useState("Name"); // default to Name
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
      alert("❌ You must be logged in");
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
      alert("❌ Failed to delete product");
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
      <div className="flex flex-1 items-center justify-center text-xl">
        Loading products...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-red-500 text-xl">
        {error}
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-[#0F0F1A] text-white">
      <h1 className="text-3xl font-bold mb-6">📦 Products</h1>

      {/* Search and Filters */}
      <div className="mb-4 flex flex-col md:flex-row gap-3 items-center">
        {/* Search Field Selector */}
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Name">Name</option>
          <option value="ID">ID</option>
        </select>

        {/* Search Input */}
        <div className="relative flex-1 w-full md:w-1/2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={`Search by ${searchField}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Selector */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map((cat, i) => (
            <option key={i} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-gray-700 rounded-lg">
        <table className="min-w-full">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Price</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Brand</th>
              <th className="px-4 py-2 text-left">Stock</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => (
                <tr
                  key={p.ProductId}
                  className="border-t border-gray-700 hover:bg-gray-900"
                >
                  <td className="px-4 py-2 flex items-center gap-2">
                    <span>{p.ProductId}</span>

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopy(p.ProductId)}
                      className="p-1 rounded hover:bg-gray-700"
                    >
                      <Copy size={16} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(p.ProductId)}
                      className="p-1 rounded hover:bg-red-700"
                    >
                      <Trash size={16} />
                    </button>

                    {copiedId === p.ProductId && (
                      <span className="text-green-400 text-sm ml-1">Copied!</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{p.Name}</td>
                  <td className="px-4 py-2">${p.Price}</td>
                  <td className="px-4 py-2">{p.Category}</td>
                  <td className="px-4 py-2">{p.Brand}</td>
                  <td className="px-4 py-2">{p.StockQuantity}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-400">
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







// Agent Component
function Agent() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(["Context: "]));
    localStorage.setItem("admin", JSON.stringify(false));
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
      { role: "AI_Message", content: "Searching..." },
    ]);
    setInput("");
    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) {
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.content !== "Searching...");
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

      let aiMessage;
      if (res.data.answer.includes("http")) {
        const llm_response_object = JSON.parse(res.data.answer);
        aiMessage = {
          role: "AI_Message",
          content: llm_response_object.content,
          agent: res.data.agent,
          image: llm_response_object.image,
        };
      } else {
        aiMessage = {
          role: "AI_Message",
          content: res.data.answer,
          agent: res.data.agent,
        };
      }

      let updatedMessages =
        JSON.parse(localStorage.getItem("messages")) || [];
      updatedMessages.push(`${aiMessage.role}: ${aiMessage.content};`);
      localStorage.setItem("messages", JSON.stringify(updatedMessages));

      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.content !== "Searching...");
        return [...filtered, aiMessage];
      });
    } catch (err) {
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.content !== "Searching...");
        return [
          ...filtered,
          {
            role: "AI_Message",
            content: `Error connecting to AI. ${err.response?.data?.error}`,
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="flex min-h-screen bg-[#0F0F1A] text-white">
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col justify-between px-8 py-6">
        <div className="flex-1 overflow-y-auto space-y-6 pr-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`text-sm leading-relaxed max-w-4xl ${
                msg.role === "User_Message"
                  ? "text-right ml-auto"
                  : "text-left"
              }`}
            >
              <div
                className={`${
                  msg.role === "User_Message"
                    ? "text-gray-300"
                    : "text-white"
                } whitespace-pre-line`}
              >
                {msg.content === "Searching..." ? (
                  <span className="italic text-gray-500">Searching...</span>
                ) : (
                  <>
                    <div>{msg.content}</div>
                    {msg.image && (
                      <div>
                        <img
                          src={msg.image}
                          alt="Generated visualization"
                          style={{
                            maxWidth: "100%",
                            height: "auto",
                            marginTop: "4px",
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
              {msg.agent && (
                <p className="text-xs italic text-gray-500 mt-1">
                  –{" "}
                  {msg.agent === "use_rag_agent"
                    ? "RAG AGENT USED"
                    : "use_web_search_agent"
                    ? "SEARCH AGENT USED"
                    : "CRUD Agent"}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Input Box */}
        <div className="flex items-center gap-2 mt-6">
          <input
            type="text"
            placeholder="what would be the low hanging fruit opp..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 bg-[#1C1C2D] text-white placeholder-gray-400 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-5 py-2 rounded"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("agent");

  return (
    <div className="flex h-screen bg-[#0F0F1A] text-white overflow-y-auto">
      {/* Sidebar */}
      <aside className="w-64 bg-[#151522] p-6 flex flex-col">
        <h1 className="text-3xl font-bold mb-8">Kadash</h1>
        <nav className="flex flex-col space-y-3 text-gray-300 text-[18px]">
          <button
            onClick={() => setPage("agent")}
            className={`w-full px-4 py-2 rounded-lg transition-colors ${
              page === "agent"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            Agent
          </button>
          <button
            onClick={() => setPage("dashboard")}
            className={`w-full px-4 py-2 rounded-lg transition-colors ${
              page === "dashboard"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            Dashboard
          </button>
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col bg-[#0F0F1A]">
        {page === "agent" ? <Agent /> : <DashBoard />}
      </main>
    </div>
  );
}





