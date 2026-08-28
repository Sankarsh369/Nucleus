import React, { useState, useEffect, useRef } from 'react';
import { Target, Copy, Edit2, Code, Settings as SettingsIcon, Send, Check, CheckCircle2, Zap, DollarSign, ArrowUp, Loader2 } from 'lucide-react';
import styles from './ResultView.module.css';

import AIPipeline, { CompressionGraph } from './AIPipeline';

interface CompressionResult {
  compressed_text: string;
  raw_tokens: number;
  compressed_tokens: number;
  compression_ratio: number;
  accuracy_retained?: number;
  cost_saved_usd: number;
  latency_speedup_ratio?: number;
}

export interface ChatTurnType {
  originalText: string;
  result: CompressionResult;
}

interface ResultViewProps {
  chatHistory: ChatTurnType[];
  onReset: () => void;
  onSubmit: (text: string, qaPairs: { question: string }[]) => void;
  isLoading: boolean;
  pendingUserText?: string | null;
}

type TabType = 'Answer' | 'Metrics' | 'Difference';

function ChatTurnItem({ turn }: { turn: ChatTurnType }) {
  const [activeTab, setActiveTab] = useState<TabType>('Answer');
  const [isCopied, setIsCopied] = useState(false);
  const [isUserCopied, setIsUserCopied] = useState(false);
  const { originalText, result } = turn;

  const handleCopyAnswer = () => {
    navigator.clipboard.writeText(result.compressed_text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyUserText = () => {
    navigator.clipboard.writeText(originalText);
    setIsUserCopied(true);
    setTimeout(() => setIsUserCopied(false), 2000);
  };

  return (
    <div className={styles.chatThread}>
      <div className={styles.userBubbleWrapper}>
        <div className={styles.userBubble}>
          {originalText}
        </div>
        <div className={styles.userActions}>
          <button 
            className={styles.iconBtn} 
            title="Copy text"
            onClick={handleCopyUserText}
            style={{
              color: isUserCopied ? '#22c55e' : 'var(--text-secondary)',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: isUserCopied ? 'scale(1.2)' : 'scale(1)',
            }}
          >
            {isUserCopied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      <div className={styles.aiResponseWrapper}>
        <div className={styles.aiHeader}>
          <div className={styles.aiLogo}>
            <Code size={16} />
          </div>
          <div className={styles.thoughtIndicator}>
            Thought for 1.2s
          </div>
        </div>

        <AIPipeline inputText={originalText} isCompleted={true} compressionResult={result} />

        <div className={styles.tabGroupInline}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'Answer' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('Answer')}
          >
            Answer
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'Metrics' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('Metrics')}
          >
            Metrics
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'Difference' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('Difference')}
          >
            Difference
          </button>
        </div>

        <div className={styles.aiContent}>
          {activeTab === 'Metrics' && (
            <>
            <div className={`${styles.metricsGrid} animate-fade-in`}>
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <Target size={16} className={styles.metricIcon} />
                  <span>Compression</span>
                </div>
                <div className={styles.metricValue}>{result.compression_ratio.toFixed(1)}%</div>
                <div className={styles.metricSub}>{result.raw_tokens} → {result.compressed_tokens} tokens</div>
              </div>
              
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <DollarSign size={16} className={styles.metricIcon} />
                  <span>Cost Saved</span>
                </div>
                <div className={styles.metricValue}>${result.cost_saved_usd.toFixed(4)}</div>
                <div className={styles.metricSub}>per 100 requests</div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <Zap size={16} className={styles.metricIcon} />
                  <span>Latency Speedup</span>
                </div>
                <div className={styles.metricValue}>
                  {result.latency_speedup_ratio != null ? `${result.latency_speedup_ratio.toFixed(1)}x` : 'N/A'}
                </div>
                <div className={styles.metricSub}>Faster inference</div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <CheckCircle2 size={16} className={styles.metricIcon} />
                  <span>Accuracy Retention</span>
                </div>
                <div className={styles.metricValue}>
                  {result.accuracy_retained != null ? `${result.accuracy_retained.toFixed(1)}%` : 'N/A'}
                </div>
                <div className={styles.metricSub}>QA Semantic match</div>
              </div>
            </div>
            <div style={{ marginTop: '28px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
              <CompressionGraph tokens={result.raw_tokens} result={result} />
            </div>
            </>
          )}

          {activeTab === 'Answer' && (
            <div className={`${styles.markdownContainer} animate-fade-in`} style={{ position: 'relative' }}>
              <button 
                onClick={handleCopyAnswer}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '6px',
                  color: isCopied ? '#22c55e' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: isCopied ? 'scale(1.1)' : 'scale(1)',
                  zIndex: 10
                }}
                title="Copy Answer"
              >
                {isCopied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <div className={styles.mdBody}>
                {result.compressed_text}
              </div>
            </div>
          )}

          {activeTab === 'Difference' && (
            <div className={`${styles.diffContainer} animate-fade-in`}>
              <div className={styles.markdownContainer}>
                <div className={styles.mdHeader}>
                  <h3 style={{ color: '#ef4444' }}>Original Context</h3>
                </div>
                <div className={styles.mdBody}>
                  {originalText}
                </div>
              </div>
              <div className={styles.markdownContainer}>
                <div className={styles.mdHeader}>
                  <h3 style={{ color: '#22c55e' }}>Compressed Context</h3>
                </div>
                <div className={styles.mdBody}>
                  {result.compressed_text}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResultView({ chatHistory, onSubmit, isLoading, pendingUserText }: ResultViewProps) {
  const [chatInput, setChatInput] = useState('');
  const [isPendingCopied, setIsPendingCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when chatHistory or loading state changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

  return (
    <div className={`${styles.resultLayout} animate-fade-in`}>
      <div className={styles.resultScrollable} ref={scrollRef}>
        <div className={styles.resultContainer}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
            {chatHistory.map((turn, idx) => (
              <ChatTurnItem key={idx} turn={turn} />
            ))}
            
            {isLoading && pendingUserText && (
              <div className={styles.chatThread}>
                <div className={styles.userBubbleWrapper}>
                  <div className={styles.userBubble}>
                    {pendingUserText}
                  </div>
                  <div className={styles.userActions}>
                    <button 
                      className={styles.iconBtn}
                      onClick={() => {
                        navigator.clipboard.writeText(pendingUserText);
                        setIsPendingCopied(true);
                        setTimeout(() => setIsPendingCopied(false), 2000);
                      }}
                      style={{
                        color: isPendingCopied ? '#22c55e' : 'var(--text-secondary)',
                        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: isPendingCopied ? 'scale(1.2)' : 'scale(1)',
                      }}
                    >
                      {isPendingCopied ? <Check size={14} /> : <Copy size={14}/>}
                    </button>
                  </div>
                </div>

                <div className={styles.aiResponseWrapper}>
                  <div className={styles.aiHeader}>
                    <div className={styles.aiLogo}>
                      <Code size={16} />
                    </div>
                  </div>
                  <div className={styles.aiContent} style={{ padding: '8px 24px' }}>
                    <AIPipeline inputText={pendingUserText || ''} isCompleted={false} />
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>

      <div className={styles.bottomChatContainer}>
        <div className={styles.chatInputWrapper}>
          <div className={`${styles.chatInputInner} ${isLoading ? styles.loading : ''}`}>
            <textarea
              ref={textareaRef}
              className={styles.chatInput}
              placeholder="Paste your long codebase, logs, or text here (up to 50k characters)..."
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isLoading && chatInput.trim()) {
                    onSubmit(chatInput, []);
                    setChatInput('');
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                    }
                  }
                }
              }}
              rows={1}
            />

            <button 
              type="button" 
              className={styles.submitBtn} 
              disabled={isLoading || !chatInput.trim()}
              onClick={() => {
                onSubmit(chatInput, []);
                setChatInput('');
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto';
                }
              }}
            >
              {isLoading ? <Loader2 size={18} className={styles.spinner} /> : <ArrowUp size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
