import React, { useState, useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";
import "./App.css";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [channelTopic, setChannelTopic] = useState("");
  const [messages, setMessages] = useState([]);
  const [userList, setUserList] = useState([]);
  const [inputText, setInputText] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelTopic, setNewChannelTopic] = useState("");
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/channels`);
      const data = await res.json();
      setChannels(data);
    } catch (e) {
      console.error("Failed to fetch channels", e);
    }
  }, []);

  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("username_set", (data) => {
      setLoggedIn(true);
      setError("");
      fetchChannels();
    });

    socket.on("error", (data) => {
      setError(data.message);
    });

    socket.on("joined_channel", (data) => {
      setCurrentChannel(data.channel);
      setChannelTopic(data.topic);
      setMessages([]);
      setError("");
    });

    socket.on("message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("user_list", (data) => {
      setUserList(data.users);
    });

    socket.on("channel_created", () => {
      fetchChannels();
    });

    return () => {
      socket.off("username_set");
      socket.off("error");
      socket.off("joined_channel");
      socket.off("message");
      socket.off("user_list");
      socket.off("channel_created");
    };
  }, [socket, fetchChannels]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim() && password && socket) {
      socket.emit("set_username", {
        username: username.trim(),
        password: password,
        action: isRegistering ? "register" : "login",
      });
    }
  };

  const handleJoinChannel = (channelName) => {
    if (socket) {
      socket.emit("join_channel", { channel: channelName });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputText.trim() && socket) {
      socket.emit("send_message", { text: inputText.trim() });
      setInputText("");
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    try {
      const res = await fetch(`${SOCKET_URL}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChannelName.trim(),
          topic: newChannelTopic.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewChannelName("");
        setNewChannelTopic("");
        setShowCreateChannel(false);
        fetchChannels();
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError("Failed to create channel");
    }
  };

  if (!loggedIn) {
    return (
      <div className="login-screen">
        <div className="login-box">
          <h1>PyChat</h1>
          <p>IRC-style chat</p>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">
              {isRegistering ? "Register" : "Log In"}
            </button>
          </form>
          <p className="auth-toggle">
            {isRegistering ? "Already have an account? " : "New here? "}
            <span
              className="auth-toggle-link"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
            >
              {isRegistering ? "Log in" : "Register"}
            </span>
          </p>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>PyChat</h2>
          <span className="username">@{username}</span>
        </div>
        <div className="channels-header">
          <h3>Channels</h3>
          <button
            className="create-btn"
            onClick={() => setShowCreateChannel(!showCreateChannel)}
            title="Create channel"
          >
            +
          </button>
        </div>
        {showCreateChannel && (
          <form className="create-channel-form" onSubmit={handleCreateChannel}>
            <input
              type="text"
              placeholder="channel-name"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              placeholder="Topic (optional)"
              value={newChannelTopic}
              onChange={(e) => setNewChannelTopic(e.target.value)}
            />
            <button type="submit">Create</button>
          </form>
        )}
        <ul className="channel-list">
          {channels.map((ch) => (
            <li
              key={ch.name}
              className={currentChannel === ch.name ? "active" : ""}
              onClick={() => handleJoinChannel(ch.name)}
            >
              <span className="channel-name"># {ch.name}</span>
              <span className="channel-count">{ch.user_count}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="main">
        {currentChannel ? (
          <>
            <div className="channel-header">
              <h3>#{currentChannel}</h3>
              {channelTopic && <span className="topic">{channelTopic}</span>}
            </div>
            <div className="messages-area">
              <div className="messages">
                {messages.map((msg, i) =>
                  msg.type === "system" ? (
                    <div key={i} className="message system">
                      <span className="system-text">{msg.text}</span>
                      <span className="timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ) : (
                    <div key={i} className="message chat">
                      <span className="msg-username">{msg.username}</span>
                      <span className="msg-text">{msg.text}</span>
                      <span className="timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="user-sidebar">
                <h4>Users ({userList.length})</h4>
                <ul>
                  {userList.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </div>
            </div>
            <form className="message-input" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder={`Message #${currentChannel}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                autoFocus
              />
              <button type="submit">Send</button>
            </form>
          </>
        ) : (
          <div className="no-channel">
            <h2>Welcome to PyChat</h2>
            <p>Select a channel from the sidebar to start chatting.</p>
          </div>
        )}
      </div>
      {error && (
        <div className="error-toast" onClick={() => setError("")}>
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
