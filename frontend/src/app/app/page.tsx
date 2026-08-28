"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ID, Permission, Query, Role } from 'appwrite';
import TopNav from '@/components/TopNav';
import HeroInput from '@/components/HeroInput';
import ResultView from '@/components/ResultView';
import { compressContext, CompressionResult } from '@/lib/api';
import { account, tablesDB, APPWRITE_DATABASE_ID, TABLE_USER_CHAT_HISTORY } from '@/utils/appwrite/client';
import styles from './app.module.css';

export interface ChatTurn {
  id: string;
  originalText: string;
  result: CompressionResult;
  createdAt?: string;
}

const HISTORY_LIMIT = 50;

export default function AppPage() {
  // There's no server-side session check for this route (see the note in
  // frontend/README.md about Appwrite's cookie living on Appwrite's own
  // domain, not this app's), so protection happens here: check the session
  // client-side on mount and bounce to /login if there isn't one.
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);
  const [globalHistory, setGlobalHistory] = useState<ChatTurn[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndLoadHistory() {
      try {
        const user = await account.get();
        setUserId(user.$id);

        const result = await tablesDB.listRows({
          databaseId: APPWRITE_DATABASE_ID,
          tableId: TABLE_USER_CHAT_HISTORY,
          queries: [
            Query.equal('user_id', user.$id),
            Query.orderAsc('$createdAt'),
            Query.limit(HISTORY_LIMIT),
          ],
        });

        const history: ChatTurn[] = result.rows.map(row => ({
          id: row.$id,
          originalText: row.original_text as string,
          result: JSON.parse(row.result_json as string) as CompressionResult,
          createdAt: row.$createdAt,
        }));
        setGlobalHistory(history);
      } catch {
        router.push('/login');
        return;
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuthAndLoadHistory();
  }, [router]);

  const handleCompress = async (text: string, qaPairs: { question: string }[]) => {
    setIsLoading(true);
    setPendingUserText(text);
    setError(null);
    try {
      const [res] = await Promise.all([
        compressContext(text, qaPairs),
        new Promise(resolve => setTimeout(resolve, 11500))
      ]);

      // Persist to Appwrite first so the turn carries a real, stable id that
      // the history panel can later use to delete it; fall back to a local
      // id if the write fails, so the app still works without losing this
      // turn from the current session.
      let id = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      let createdAt: string | undefined = new Date().toISOString();

      if (userId) {
        try {
          const rowId = ID.unique();
          const row = await tablesDB.createRow({
            databaseId: APPWRITE_DATABASE_ID,
            tableId: TABLE_USER_CHAT_HISTORY,
            rowId,
            data: {
              user_id: userId,
              original_text: text,
              result_json: JSON.stringify(res),
            },
            // Only the creating user may ever read, update, or delete this
            // row -- enforced by Appwrite regardless of what the client asks for.
            permissions: [
              Permission.read(Role.user(userId)),
              Permission.update(Role.user(userId)),
              Permission.delete(Role.user(userId)),
            ],
          });
          id = row.$id;
          createdAt = row.$createdAt;
        } catch (insertErr) {
          console.error("Failed to save history to Appwrite", insertErr);
        }
      }

      const newTurn: ChatTurn = { id, originalText: text, result: res, createdAt };
      setCurrentChat(prev => [...prev, newTurn]);
      setGlobalHistory(prev => [...prev, newTurn].slice(-HISTORY_LIMIT));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during compression.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setPendingUserText(null);
    }
  };

  const handleReset = () => {
    setCurrentChat([]);
    setPendingUserText(null);
    setError(null);
  };

  const handleSelectHistory = (id: string) => {
    const turn = globalHistory.find(t => t.id === id);
    if (turn) {
      setCurrentChat([turn]);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    setGlobalHistory(prev => prev.filter(t => t.id !== id));
    setCurrentChat(prev => prev.filter(t => t.id !== id));

    if (id.startsWith('local_')) return; // never persisted, nothing to delete server-side

    try {
      await tablesDB.deleteRow({ databaseId: APPWRITE_DATABASE_ID, tableId: TABLE_USER_CHAT_HISTORY, rowId: id });
    } catch (err) {
      console.error("Failed to delete history entry from Appwrite", err);
    }
  };

  const handleClearHistory = async () => {
    const idsToDelete = globalHistory.map(t => t.id).filter(id => !id.startsWith('local_'));
    setGlobalHistory([]);
    setCurrentChat([]);

    await Promise.all(idsToDelete.map(async (id) => {
      try {
        await tablesDB.deleteRow({ databaseId: APPWRITE_DATABASE_ID, tableId: TABLE_USER_CHAT_HISTORY, rowId: id });
      } catch (err) {
        console.error(`Failed to delete history entry ${id} from Appwrite`, err);
      }
    }));
  };

  if (!authChecked) {
    return <div className="fixed inset-0 z-[-2] bg-[#030303]" />;
  }

  return (
    <div className={styles.layout}>
      {/* Global Backgrounds */}
      <div className="fixed inset-0 z-[-2] bg-[#030303]" />

      {/* Dynamic Background Grid */}
      <div className="fixed inset-0 z-[-1] opacity-20 pointer-events-none"
           style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '100px 100px', maskImage: 'radial-gradient(circle at center, black 60%, transparent 100%)', WebkitMaskImage: 'radial-gradient(circle at center, black 60%, transparent 100%)' }} />

      {/* Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none z-[-1]" />

      <TopNav
        onReset={handleReset}
        chatHistory={globalHistory}
        onSelectHistory={handleSelectHistory}
        onDeleteHistory={handleDeleteHistory}
        onClearHistory={handleClearHistory}
      />
      <main className={styles.mainContent}>
        {error && (
          <div className={styles.errorToast}>
            {error}
          </div>
        )}

        {currentChat.length === 0 && !isLoading ? (
          <HeroInput onSubmit={handleCompress} isLoading={isLoading} />
        ) : (
          <ResultView
            chatHistory={currentChat}
            onReset={handleReset}
            onSubmit={handleCompress}
            isLoading={isLoading}
            pendingUserText={pendingUserText}
          />
        )}
      </main>
    </div>
  );
}
