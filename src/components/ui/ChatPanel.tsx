"use client";

import React, { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { X, Send } from "lucide-react";
import Button from "./Button";

export type Message = {
  id: string;
  sender: "me" | "opponent";
  message: string;
  timestamp: Date;
};

type ChatPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  socket: Socket | null;
  gameId: string | null;
  opponentName: string;
  messages: Message[];
  onAddMessage: (message: Message) => void;
};

export default function ChatPanel({
  isOpen,
  onClose,
  socket,
  gameId,
  opponentName,
  messages,
  onAddMessage,
}: ChatPanelProps) {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); // Auto-scroll to bottom on new message
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !socket || !gameId) return;

    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      sender: "me",
      message: inputMessage.trim(),
      timestamp: new Date(),
    };

    onAddMessage(newMessage);

    socket.emit("chat-message", {
      gameId,
      message: inputMessage.trim(),
    });

    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Backdrop for mobile - semi-transparent */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div
        className={`fixed lg:relative bottom-0 lg:bottom-auto right-0 lg:top-0 h-[50vh] lg:h-full bg-zinc-900 border-l lg:border-l border-t lg:border-t-0 border-white/10 flex flex-col z-50 transition-all duration-300 ${
          isOpen
            ? "translate-y-0 lg:translate-x-0"
            : "translate-y-full lg:hidden"
        } w-full lg:w-96 rounded-sm`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <div>
            <h3 className="font-bold text-lg">Chat</h3>
            <p className="text-sm text-gray-400">with {opponentName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
            aria-label="Close chat"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <p>No messages yet</p>
              <p className="text-sm mt-2">Start chatting with your opponent!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === "me" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-xl p-3 ${
                    msg.sender === "me"
                      ? "bg-zinc-700 text-white rounded-tr-none"
                      : "bg-slate-700 text-white rounded-bl-none"
                  }`}
                >
                  <p className="text-sm break-words">{msg.message}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            )))
          }
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="flex w-full bg-zinc-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div>
              <Button
                size="small"
                variant="primary"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="h-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
