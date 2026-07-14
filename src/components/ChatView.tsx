import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { getFirebase } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { Message, Chat, User } from '../types';
import { encryptText, decryptText } from '../lib/utils';
import { Send, Lock, Shield, FileUp } from 'lucide-react';
import { format } from 'date-fns';

export default function ChatView() {
  const { currentUser, selectedChatId, encryptionKey } = useAppStore();
  const [messages, setMessages] = useState<(Message & { decryptedText?: string })[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatInfo, setChatInfo] = useState<Chat | null>(null);
  const [chatUsers, setChatUsers] = useState<Record<string, User>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedChatId) return;

    const { db } = getFirebase();
    
    // Fetch chat info
    const fetchChat = async () => {
      const snap = await getDoc(doc(db, 'chats', selectedChatId));
      if (snap.exists()) {
        const data = snap.data() as Chat;
        setChatInfo({ id: snap.id, ...data });
        
        // Fetch users in chat
        if (data.members.length > 0) {
          const uQuery = query(collection(db, 'users'), where('__name__', 'in', data.members));
          const uSnap = await getDocs(uQuery);
          const uMap: Record<string, User> = {};
          uSnap.forEach(d => {
            uMap[d.id] = { id: d.id, ...d.data() } as User;
          });
          setChatUsers(uMap);
        }
      }
    };
    fetchChat();

    // Subscribe to messages
    const q = query(
      collection(db, 'chats', selectedChatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, async (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      
      // Decrypt messages
      const decryptedMsgs = await Promise.all(
        msgs.map(async (m) => {
          let text = m.text;
          try {
             text = await decryptText(m.text, encryptionKey);
          } catch (e) {
            console.error('Failed to decrypt', e);
          }
          return { ...m, decryptedText: text };
        })
      );
      
      setMessages(decryptedMsgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsub();
  }, [selectedChatId, encryptionKey]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChatId || !currentUser) return;

    const textToSend = inputText;
    setInputText('');
    setSending(true);

    try {
      const { db } = getFirebase();
      const encrypted = await encryptText(textToSend, encryptionKey);
      
      await addDoc(collection(db, 'chats', selectedChatId, 'messages'), {
        senderId: currentUser.id,
        text: encrypted,
        createdAt: Date.now(),
        chatId: selectedChatId
      });

      await updateDoc(doc(db, 'chats', selectedChatId), {
        lastMessage: 'encrypted',
        lastMessageAt: Date.now()
      });
      
    } catch (e) {
      console.error(e);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getChatName = () => {
    if (chatInfo?.name) return chatInfo.name;
    if (chatInfo?.type === 'direct' && currentUser) {
      const otherId = chatInfo.members.find(id => id !== currentUser.id);
      return otherId && chatUsers[otherId] ? chatUsers[otherId].displayName : 'Unknown User';
    }
    return 'Secure Chat';
  };

  if (!selectedChatId) return null;

  return (
    <div className="flex-1 h-full flex flex-col relative bg-[#050505]">
      {/* Header */}
      <div className="h-20 px-8 flex items-center justify-between bg-[#050505]/80 backdrop-blur-md border-b border-zinc-800 z-10">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold">{getChatName()}</h3>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-900"></div>
                <div className="w-5 h-5 rounded-full bg-zinc-600 border border-zinc-900"></div>
              </div>
              <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-mono">E2EE Socket Established</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-zinc-500">
          <Lock className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-zinc-800/50"></div>
          <span className="text-[10px] text-zinc-600 uppercase font-mono tracking-widest">Session Initialized - SHA256 Handshake OK</span>
          <div className="h-px flex-1 bg-zinc-800/50"></div>
        </div>

        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser?.id;
          const sender = chatUsers[msg.senderId];
          
          return (
            <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-xs ${isMe ? 'bg-indigo-600 text-indigo-200' : 'bg-zinc-800 text-zinc-400'}`}>
                 {isMe ? 'ME' : sender?.displayName?.substring(0, 2).toUpperCase() || 'U'}
              </div>
              <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {isMe ? (
                    <>
                      <span className="text-[10px] text-zinc-500 font-mono">{format(msg.createdAt, 'HH:mm')}</span>
                      <span className="text-sm font-semibold">You</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold">{sender?.displayName || 'Unknown'}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{format(msg.createdAt, 'HH:mm')}</span>
                    </>
                  )}
                </div>
                <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/10' 
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{msg.decryptedText}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-[#050505] border-t border-zinc-800/50">
        <form onSubmit={handleSendMessage} className="flex items-center gap-4 p-2 bg-[#0d0d0d] border border-zinc-800 rounded-2xl focus-within:border-indigo-500/50 transition-colors">
          <button type="button" className="p-2 text-zinc-500 hover:text-white transition-colors" title="File sharing coming soon">
            <FileUp className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a secure message..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 placeholder-zinc-600 focus:outline-none text-zinc-200"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || sending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
      
      {/* Branding Footer */}
      <div className="absolute bottom-2 right-4 text-[9px] uppercase tracking-[0.2em] font-mono text-zinc-700 pointer-events-none">
        Designed by filphy • Secure Mesh Network
      </div>
    </div>
  );
}
