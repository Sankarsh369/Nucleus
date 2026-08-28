import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, CheckCircle2, FileText, Code, ArrowUp, Loader2 } from 'lucide-react';
import styles from './HeroInput.module.css';

interface HeroInputProps {
  onSubmit: (text: string, qaPairs: { question: string }[]) => void;
  isLoading: boolean;
}

export default function HeroInput({ onSubmit, isLoading }: HeroInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    onSubmit(text, []);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className={`${styles.heroContainer} animate-fade-in`}>
      <div className={styles.logoMark}>
        <Code className={styles.largeIcon} strokeWidth={1.5} />
      </div>
      
      <h1 className={styles.heroTitle}>How can I compress your context today?</h1>
      
      <form onSubmit={handleSubmit} className={styles.inputWrapper}>
        <div className={`${styles.inputGlassContainer} ${isLoading ? styles.loading : ''}`}>
          
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder="Paste your long codebase, logs, or text here (up to 50k characters)..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            maxLength={50000}
            rows={1}
          />
          
          <button 
            type="submit" 
            className={styles.submitBtn} 
            disabled={isLoading || !text.trim()}
          >
            {isLoading ? <Loader2 size={18} className={styles.spinner} /> : <ArrowUp size={18} />}
          </button>
        </div>
        
        <div className={styles.suggestionPills}>
          <button 
            type="button" 
            className={styles.pillBtn}
            onClick={() => setText("def fibonacci(n):\n    # This is a redundant comment\n    # It explains what the function does\n    # Below we check the base cases\n    if n <= 1:\n        return n\n    else:\n        # We recursively call fibonacci\n        # This can be slow without memoization\n        return fibonacci(n-1) + fibonacci(n-2)\n")}
          >
            <FileText size={14} /> Compress Codebase
          </button>
          <button 
            type="button" 
            className={styles.pillBtn}
            onClick={() => setText("[2026-08-01 10:00:00] INFO: Server started on port 8000\n[2026-08-01 10:00:05] DEBUG: Connection pool initialized with 50 connections\n[2026-08-01 10:01:00] INFO: Incoming request to /compress\n[2026-08-01 10:01:02] ERROR: KeyError 'text' in payload\n[2026-08-01 10:01:05] INFO: Request finished with status 500\n")}
          >
            <Settings size={14} /> Minify Server Logs
          </button>
          <button 
            type="button" 
            className={styles.pillBtn}
            onClick={() => {
              setText("class DatabaseConnectionPool:\n    \"\"\"\n    Connection pool manager with a hardcoded limit for tests.\n    \"\"\"\n    def __init__(self, limit=50):\n        self.limit = limit\n        self.connections = []");
            }}
          >
            <CheckCircle2 size={14} /> QA Validation Match
          </button>
        </div>
      </form>
    </div>
  );
}


