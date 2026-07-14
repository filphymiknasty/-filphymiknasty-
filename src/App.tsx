import { useEffect, useState } from 'react';
import { useAppStore } from './store';
import { getFirebase, initFirebase } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import { Loader2, Lock } from 'lucide-react';
import { motion } from 'motion/react';

function Login() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const { auth, db } = getFirebase();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          createdAt: Date.now()
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#050505] text-zinc-100 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-8 text-center shadow-2xl shadow-indigo-500/10"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
          <Lock className="h-8 w-8 text-white" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white">CipherChat</h1>
        <p className="mb-6 text-sm text-zinc-500">End-to-end encrypted messaging.</p>
        <p className="mb-8 text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Created by filphy</p>
        
        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue with Google
        </button>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const { currentUser, setCurrentUser, selectedChatId } = useAppStore();

  useEffect(() => {
    initFirebase().then(({ auth }) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          setCurrentUser({
            id: user.uid,
            email: user.email!,
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || undefined
          });
        } else {
          setCurrentUser(null);
        }
        setInitialized(true);
      });
    }).catch(console.error);
  }, [setCurrentUser]);

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#050505] text-zinc-100 font-sans">
      <div className="w-16 h-full flex flex-col items-center py-6 bg-[#0a0a0a] border-r border-zinc-800">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-10 shadow-lg shadow-indigo-500/20">
          <span className="text-white font-bold">C</span>
        </div>
        <nav className="flex flex-col gap-8 flex-1">
          <div className="p-2 rounded-lg bg-zinc-800 text-indigo-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
          </div>
          <div className="p-2 text-zinc-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          </div>
          <div className="p-2 text-zinc-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
        </nav>
      </div>

      <Sidebar />
      {selectedChatId ? (
        <ChatView />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center bg-[#050505] relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <Lock className="h-8 w-8 text-indigo-500/50" />
          </div>
          <h2 className="text-xl font-semibold text-white">CipherChat</h2>
          <p className="text-sm text-zinc-500 mt-2">Select a conversation to start messaging securely.</p>
          <div className="absolute bottom-2 right-4 text-[9px] uppercase tracking-[0.2em] font-mono text-zinc-700 pointer-events-none">
            Designed by filphy • Secure Mesh Network
          </div>
        </div>
      )}
    </div>
  );
}
