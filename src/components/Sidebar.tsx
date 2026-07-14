import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { getFirebase } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Chat, User } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquarePlus, Users, Search, LogOut, Lock } from 'lucide-react';
import { signOut } from 'firebase/auth';

export default function Sidebar() {
  const { currentUser, selectedChatId, setSelectedChatId } = useAppStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const { db } = getFirebase();
    const q = query(
      collection(db, 'chats'),
      where('members', 'array-contains', currentUser.id),
      orderBy('lastMessageAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(fetched);
    });

    return () => unsub();
  }, [currentUser]);

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim() || !currentUser) return;
    
    try {
      setCreating(true);
      const { db } = getFirebase();
      
      // Find user by email
      const usersQuery = query(collection(db, 'users'), where('email', '==', searchEmail.toLowerCase()));
      const userSnap = await getDocs(usersQuery);
      
      if (userSnap.empty) {
        alert('User not found. Ensure they have signed in at least once.');
        return;
      }
      
      const targetUser = userSnap.docs[0];
      const targetUserId = targetUser.id;
      
      if (targetUserId === currentUser.id) {
        alert("You can't message yourself.");
        return;
      }
      
      // Check if direct chat already exists
      const existingChatQuery = query(
        collection(db, 'chats'),
        where('members', 'in', [[currentUser.id, targetUserId], [targetUserId, currentUser.id]])
      );
      
      const existingSnap = await getDocs(existingChatQuery);
      let chatId = '';
      
      if (!existingSnap.empty) {
        chatId = existingSnap.docs[0].id;
      } else {
        const newChat = await addDoc(collection(db, 'chats'), {
          type: 'direct',
          name: '', // Derived dynamically
          members: [currentUser.id, targetUserId],
          createdAt: Date.now(),
          lastMessageAt: Date.now(),
        });
        chatId = newChat.id;
      }
      
      setShowNewChat(false);
      setSearchEmail('');
      setSelectedChatId(chatId);
      
    } catch (e) {
      console.error(e);
      alert('Error creating chat');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    const { auth } = getFirebase();
    signOut(auth);
  };

  return (
    <div className="flex w-[320px] flex-col bg-[#0d0d0d] border-r border-zinc-800/50">
      <div className="p-6 pb-2 border-b border-transparent">
        <h2 className="text-xl font-semibold mb-6 flex items-center justify-between">
          CipherChat
          <span className="px-2 py-1 bg-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400 rounded border border-zinc-700">v1.2</span>
        </h2>
        <div className="relative mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-zinc-500" />
            </div>
            <input 
              type="text" 
              placeholder="Search secure keys..." 
              className="w-full bg-[#151515] border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors text-zinc-300"
            />
          </div>
          <button onClick={() => setShowNewChat(true)} className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors flex-shrink-0">
            <MessageSquarePlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showNewChat && (
        <div className="px-6 pb-4 bg-[#0d0d0d]">
          <form onSubmit={handleCreateChat} className="flex flex-col space-y-3 p-4 bg-zinc-900/50 border border-indigo-500/20 rounded-xl">
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="User email to chat with..."
              className="rounded-lg bg-[#151515] border border-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
              required
            />
            <div className="flex space-x-2">
              <button 
                type="submit" 
                disabled={creating}
                className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                START
              </button>
              <button 
                type="button" 
                onClick={() => setShowNewChat(false)}
                className="flex-1 rounded-lg bg-zinc-800 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700"
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {chats.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">
            No chats yet. Start a new encrypted conversation.
          </div>
        ) : (
          chats.map(chat => {
            const isSelected = selectedChatId === chat.id;
            return (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full flex items-center p-3 text-left transition-colors rounded-xl gap-3 ${
                  isSelected 
                    ? 'bg-gradient-to-r from-indigo-900/20 to-transparent border border-indigo-500/30' 
                    : 'hover:bg-zinc-800/30 border border-transparent'
                }`}
              >
                <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl font-bold relative ${
                  isSelected ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {chat.type === 'group' ? <Users className="h-5 w-5" /> : (chat.name || 'S').substring(0, 2).toUpperCase()}
                  {isSelected && (
                     <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0d0d0d] rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`truncate font-medium text-sm ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                      {chat.name || 'Secure Chat'}
                    </span>
                    {chat.lastMessageAt && (
                      <span className="text-[10px] text-zinc-500">
                        {formatDistanceToNow(chat.lastMessageAt, { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div className={`truncate text-xs ${isSelected ? 'text-indigo-300' : 'text-zinc-500'}`}>
                    {chat.lastMessage ? 'Encrypted message' : 'No messages'}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between p-4 border-t border-zinc-800/50 bg-[#0d0d0d]">
        <div className="flex items-center overflow-hidden">
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} alt="Avatar" className="h-8 w-8 rounded-full object-cover border border-zinc-700" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono text-zinc-400">
              {currentUser?.displayName?.charAt(0)}
            </div>
          )}
          <span className="ml-3 truncate text-sm font-medium text-zinc-300">
            {currentUser?.displayName}
          </span>
        </div>
        <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
