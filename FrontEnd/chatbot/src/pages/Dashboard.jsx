import { useState, useEffect } from "react";
import axios from "axios";

export default function DashBoard() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(["Context: "]));
    localStorage.setItem("admin", JSON.stringify(false))
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    // after doing login page adjust the tokin to be dynamic
    const newMessage = { role: "User_Message", content: input };
    let storedMessages = JSON.parse(localStorage.getItem("messages")) || ["Context: "];
    storedMessages.push(`${newMessage.role}: ${newMessage.content};`);
    localStorage.setItem("messages", JSON.stringify(storedMessages));
    

    setMessages((prev) => [...prev, newMessage, { role: "AI_Message", content: "Searching..." }]);
    setInput("");
    setLoading(true);
    console.log(localStorage.getItem("user"))
    try {
      const payLoad = {
        question: JSON.parse(localStorage.getItem("messages")).join(" ")+` token:${JSON.parse(localStorage.getItem("user")).token}`,
        admin: JSON.parse(localStorage.getItem("user")).user.AdminState
      }
      const res = await axios.post("http://127.0.0.1:9000/query", payLoad);
      console.log(res)
      if (res.data.answer.includes("http")){
        const llm_response_object = JSON.parse(res.data.answer)
        const llm_response = llm_response_object.content
        const image_url = llm_response_object.image;
        var aiMessage = {
          role: "AI_Message",
          content: llm_response,
          agent: res.data.agent,
          image: image_url
        };
      }else{
        console.log("else used")
        var aiMessage = {
          role: "AI_Message",
          content: res.data.answer,
          agent: res.data.agent,
        };
    }

      let updatedMessages = JSON.parse(localStorage.getItem("messages")) || [];
      updatedMessages.push(`${aiMessage.role}: ${aiMessage.content};`);
      localStorage.setItem("messages", JSON.stringify(updatedMessages));
      console.log(localStorage.getItem("messages"))
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.content !== "Searching...");
        return [...filtered, aiMessage];
      });
    } catch (err) {
      console.log(err);
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.content !== "Searching...");
        return [...filtered, { role: "AI_Message", content: `Error connecting to AI. ${err.response?.data?.error}` }];
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
      {/* Sidebar */}
      <aside className="w-64 bg-[#151522] p-6 flex flex-col justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-8">rwazi</h1>
          <nav className="space-y-4 text-gray-300 text-sm">
            <div className="opacity-60">Lumora</div>
            <div>
              Insights <span className="ml-2 text-xs bg-gray-600 px-2 py-0.5 rounded">BETA</span>
            </div>
            <div className="text-blue-500">
              Sena <span className="ml-2 text-xs bg-gray-600 px-2 py-0.5 rounded">BETA</span>
            </div>
            <div className="opacity-60">Report</div>
          </nav>
        </div>

        <div className="space-y-2">
          <button className="bg-blue-700 w-full py-2 rounded">Plans</button>
          <button className="bg-blue-500 w-full py-2 rounded">+ New Order</button>
          <div className="mt-4 text-xs bg-green-700 p-3 rounded text-white">
            Joseph Rutakangwa
            <br />
            <span className="text-gray-300 text-[0.75rem]">joseph@rwazi.com</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col justify-between px-8 py-6">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`text-sm leading-relaxed max-w-4xl ${
                msg.role === "User_Message" ? "text-right ml-auto" : "text-left"
              }`}
            >
              <p
                className={`${
                  msg.role === "User_Message" ? "text-gray-300" : "text-white"
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
                        style={{ maxWidth: "100%", height: "auto", marginTop: "4px" }}
                      />
                    </div>
                  )}
                </>
              )}
              </p>
              {msg.agent && (
                <p className="text-xs italic text-gray-500 mt-1">
                  – {msg.agent === "use_rag_agent" ? "RAG AGENT USED" : "use_web_search_agent"? "SEARCH AGENT USED":"CRUD Agent"}
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
