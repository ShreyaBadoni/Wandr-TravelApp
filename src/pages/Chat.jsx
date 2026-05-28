import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import UserAvatar from "../components/UserAvatar";
import axios from "axios";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import "../styles/dashboard.css";
import "../styles/chat.css";

let socket;

function Chat({ toggleTheme }) {
  const [teams, setTeams]               = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(true);
  const [sending, setSending]           = useState(false);
  const [onlineUsers, setOnlineUsers]   = useState([]);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const currentUserId = (() => {
    try { return JSON.parse(atob(token.split(".")[1])).id; } catch { return null; }
  })();
  const currentUser = (() => {
    try {
      const p = JSON.parse(atob(token.split(".")[1]));
      return { _id: p.id, name: localStorage.getItem("userName") || "You", avatar: localStorage.getItem("userAvatar") || "" };
    } catch { return null; }
  })();

  // Init socket
  useEffect(() => {
    socket = io("https://wandr-travelapp.onrender.com", { auth: { token } });
    socket.on("connect_error", () => toast.error("Chat connection failed"));
    return () => socket.disconnect();
  }, []);

  // Load teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await axios.get("https://wandr-travelapp.onrender.com/teams", { headers: { Authorization: token } });
        setTeams(res.data.teams);
        if (res.data.teams.length > 0) setSelectedTeam(res.data.teams[0]);
      } catch { toast.error("Failed to load teams"); }
      finally { setLoading(false); }
    };
    fetchTeams();
  }, []);

  // Join room and load messages when team changes
  useEffect(() => {
    if (!selectedTeam || !socket) return;
    socket.emit("join_team", selectedTeam._id);

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`https://wandr-travelapp.onrender.com/teams/${selectedTeam._id}/messages`, { headers: { Authorization: token } });
        setMessages(res.data.messages);
      } catch { toast.error("Failed to load messages"); }
    };
    fetchMessages();

    // Listen for new messages
    socket.off("new_message");
    socket.on("new_message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });
  }, [selectedTeam]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !selectedTeam || sending) return;
    setSending(true);
    socket.emit("send_message", { teamId: selectedTeam._id, content: input.trim() });
    setInput("");
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const fmtTime = (d) => new Date(d).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
  const fmtDate = (d) => {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  };

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const d = fmtDate(msg.createdAt);
    if (!acc[d]) acc[d] = [];
    acc[d].push(msg);
    return acc;
  }, {});

  return (
    <div className="wandr-page chat-page">
      <div className="wandr-page-bg">
        <div className="wandr-bg-orb wandr-bg-orb-1" />
        <div className="wandr-bg-orb wandr-bg-orb-2" />
      </div>
      <Navbar toggleTheme={toggleTheme} />

      {loading ? (
        <div className="wandr-loading"><div className="wandr-spinner" /><span>Loading chats...</span></div>
      ) : teams.length === 0 ? (
        <div className="teams-empty" style={{ marginTop: 80 }}>
          <div className="teams-empty-icon">💬</div>
          <h3>No teams yet</h3>
          <p>Join or create a team to start chatting.</p>
          <button className="wandr-btn wandr-btn-primary" onClick={() => navigate("/teams")}>Go to Teams</button>
        </div>
      ) : (
        <div className="chat-layout">

          {/* Sidebar */}
          <div className="chat-sidebar">
            <div className="chat-sidebar-title">💬 Team Chats</div>
            {teams.map(t => (
              <div key={t._id}
                className={`chat-team-item ${selectedTeam?._id === t._id ? "active" : ""}`}
                onClick={() => setSelectedTeam(t)}>
                <div className="chat-team-avatar">{t.name.slice(0,2).toUpperCase()}</div>
                <div className="chat-team-info">
                  <div className="chat-team-name">{t.name}</div>
                  <div className="chat-team-sub">
                    {t.vacation?.active
                      ? <span style={{ color:"#7a9e7e" }}>● {t.vacation.destination}</span>
                      : `${t.members.length} members`
                    }
                  </div>
                </div>
              </div>
            ))}

            <div className="chat-ai-hint">
              <div className="chat-ai-hint-title">🤖 AI Assistant</div>
              <div className="chat-ai-hint-text">Type <strong>@ai</strong> followed by your question to get travel recommendations and trip planning help.</div>
              <div className="chat-ai-hint-examples">
                <span>@ai best restaurants here</span>
                <span>@ai 3 day itinerary</span>
                <span>@ai budget tips</span>
              </div>
            </div>
          </div>

          {/* Chat area */}
          <div className="chat-main">
            {selectedTeam && (
              <>
                {/* Chat header */}
                <div className="chat-header">
                  <div className="chat-header-info">
                    <div className="chat-header-name">{selectedTeam.name}</div>
                    <div className="chat-header-sub">
                      {selectedTeam.vacation?.active
                        ? `✈️ Vacationing in ${selectedTeam.vacation.destination}`
                        : `${selectedTeam.members.length} members`
                      }
                    </div>
                  </div>
                  <div className="chat-member-avatars">
                    {selectedTeam.members.slice(0,4).map(m => (
                      <div key={m.user._id} title={m.user.name} style={{ marginLeft:-8 }}>
                        <UserAvatar user={m.user} size={30} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                  {messages.length === 0 && (
                    <div className="chat-empty">
                      <div>👋</div>
                      <p>No messages yet. Say hello to your team!</p>
                      <p className="chat-empty-hint">Tip: type <strong>@ai</strong> to ask the AI travel assistant</p>
                    </div>
                  )}

                  {Object.entries(grouped).map(([date, msgs]) => (
                    <div key={date}>
                      <div className="chat-date-divider"><span>{date}</span></div>
                      {msgs.map((msg, i) => {
                        const isMe   = msg.sender?._id?.toString() === currentUserId;
                        const isAI   = msg.isAI;
                        const showAvatar = !isMe && (i === 0 || msgs[i-1]?.sender?._id?.toString() !== msg.sender?._id?.toString() || msgs[i-1]?.isAI !== msg.isAI);

                        return (
                          <div key={msg._id}
                            className={`chat-msg-wrap ${isMe ? "me" : ""} ${isAI ? "ai" : ""}`}>
                            {!isMe && (
                              <div className="chat-msg-avatar">
                                {showAvatar && (
                                  isAI
                                    ? <div className="chat-ai-avatar">🤖</div>
                                    : <UserAvatar user={msg.sender} size={32} />
                                )}
                              </div>
                            )}
                            <div className="chat-msg-content">
                              {showAvatar && !isMe && (
                                <div className="chat-msg-name">
                                  {isAI ? "AI Assistant" : msg.sender?.name}
                                </div>
                              )}
                              <div className={`chat-bubble ${isMe ? "bubble-me" : ""} ${isAI ? "bubble-ai" : ""}`}>
                                {msg.content}
                              </div>
                              <div className="chat-msg-time">{fmtTime(msg.createdAt)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="chat-input-area">
                  <input
                    ref={inputRef}
                    className="chat-input"
                    placeholder={`Message ${selectedTeam.name}… or type @ai for travel help`}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={1000}
                  />
                  <button
                    className={`chat-send-btn ${input.trim() ? "active" : ""}`}
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}>
                    ➤
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;
