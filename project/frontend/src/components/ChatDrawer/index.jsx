import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Sparkles } from 'lucide-react';
import { sendChatMessage, subscribeToChat } from '../../firebase/rtdb';

export const ChatDrawer = ({ 
  orderId, 
  isOpen, 
  onClose, 
  currentUserId, 
  currentUserName, 
  recipientName, 
  isSeller 
}) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Quick reply options depending on user role
  const quickReplies = isSeller 
    ? [
        "Food is ready for pickup! 🍳",
        "Fresh and packed! 🛍️",
        "I am at the counter.",
        "Please ring the bell.",
        "Running 5 minutes late."
      ]
    : [
        "I have arrived! 📍",
        "Outside the gate.",
        "Running 5 mins late.",
        "Where should I stand?",
        "Thank you so much!"
      ];

  // Subscribe to live chat room messages
  useEffect(() => {
    if (!orderId || !isOpen) return;

    const unsubscribe = subscribeToChat(orderId, (chatList) => {
      setMessages(chatList);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [orderId, isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || !orderId) return;

    setSending(true);
    try {
      await sendChatMessage(orderId, text, currentUserId, currentUserName);
      if (!textToSend) setInputText('');
    } catch (err) {
      console.error('Failed to send chat message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md h-full bg-slate-900/90 border-l border-white/10 backdrop-blur-md flex flex-col shadow-2xl animate-slide-in">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-500/10 text-primary-500 rounded-lg">
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Handoff Coordination</h3>
              <p className="text-[10px] text-gray-400">
                Chatting with <span className="font-semibold text-primary-400">{recipientName}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 scrollbar-thin scrollbar-thumb-white/5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-50 px-4">
              <MessageSquare size={36} className="text-gray-500" />
              <p className="text-xs font-bold text-gray-300">No messages yet</p>
              <p className="text-[10px] text-gray-400">
                Coordinate pickup, safety, or delays directly. Chats are deleted when order completes.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 text-[9px] text-gray-500 font-semibold">
                    <span>{isMe ? 'You' : msg.senderName}</span>
                    <span>·</span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div 
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs break-words shadow-sm ${
                      isMe 
                        ? 'bg-primary-500 text-slate-950 font-medium rounded-tr-none' 
                        : 'bg-white/5 border border-white/5 text-gray-200 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies Panel */}
        <div className="px-5 py-3 border-t border-white/5 bg-slate-950/20">
          <div className="flex items-center gap-1 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <Sparkles size={10} className="text-secondary-500" />
            <span>Quick Replies</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickReplies.map((reply, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(reply)}
                className="px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary-500/30 text-gray-300 hover:text-white rounded-lg text-[10px] font-medium transition-all"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="px-5 py-4 border-t border-white/10 bg-slate-950/40 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={sending}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-xs transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={sending || !inputText.trim()}
            className="p-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-800 text-slate-950 rounded-xl transition shadow-lg shadow-primary-500/10"
          >
            <Send size={15} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChatDrawer;
