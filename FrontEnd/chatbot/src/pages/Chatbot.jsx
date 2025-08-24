import { useState, useEffect } from "react";
import axios from "axios";

export default function Chatbot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(["Context: "]));
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = { role: "User_Message", content: input };
    let storedMessages = JSON.parse(localStorage.getItem("messages")) || ["Context: "];
    storedMessages.push(`${newMessage.role}: ${newMessage.content};`);
    localStorage.setItem("messages", JSON.stringify(storedMessages));

    // Show user's message and temporary "Searching..." message
    setMessages((prev) => [...prev, newMessage, { role: "AI_Message", content: "Searching..." }]);
    setInput("");
    setLoading(true);

    try {
      const payLoad = {
        question: JSON.parse(localStorage.getItem("messages")).join(" "),
        admin: JSON.parse(localStorage.getItem("user")).user.AdminState
      }
      const res = await axios.post("http://127.0.0.1:8000/query", payLoad);

      const aiMessage = {
        role: "AI_Message",
        content: res.data.answer,
        agent: res.data.agent,
      };

      let updatedMessages = JSON.parse(localStorage.getItem("messages")) || [];
      updatedMessages.push(`${aiMessage.role}: ${aiMessage.content};`);
      localStorage.setItem("messages", JSON.stringify(updatedMessages));

      // Remove "Searching..." and add real AI message
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.content !== "Searching...");
        return [...filtered, aiMessage];
      });
    } catch (err) {
      console.log(err);
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.content !== "Searching...");
        return [...filtered, { role: "AI_Message", content: "Error connecting to AI." }];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="bg-[#0f172a] text-gray-100 min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-[#1e293b] border border-gray-700 rounded-lg shadow-md">
          <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-md text-sm ${
                  msg.role === "User_Message"
                    ? "bg-blue-700 text-white text-right"
                    : "bg-gray-700 text-gray-100 text-left"
                }`}
              >
                <p className="font-semibold">
                  {msg.role === "User_Message" ? "You" : "AI"}
                </p>
                {msg.agent && (
                  <p className="text-xs italic text-gray-300">
                    – {msg.agent === "use_rag_agent" ? "RAG AGENT USED" : "SEARCH AGENT USED"}
                  </p>
                )}
                <p className={msg.content === "Searching..." ? "italic text-gray-400" : ""}>
                  {msg.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 bg-[#1e293b] text-white placeholder-gray-400 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
