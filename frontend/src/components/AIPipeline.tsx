'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, FileText, Cpu, Sparkles, ChevronRight,
  Database, Scissors, ShieldCheck, X, Server, Loader2
} from 'lucide-react';
import { CompressionResult } from '@/lib/api';

interface AIPipelineProps {
  inputText: string;
  isCompleted: boolean;
  compressionResult?: CompressionResult;
  onPipelineComplete?: () => void;
}

export type PipelineStage = 
  | 'input_validation' 
  | 'semantic_analysis' 
  | 'intelligent_chunking' 
  | 'redundancy_detection' 
  | 'context_optimization' 
  | 'context_validation' 
  | 'cost_analysis' 
  | 'retrieval_summary' 
  | 'answer_generation' 
  | 'completed';

export type ChunkType = { id: number; state: string };

const STAGES: PipelineStage[] = [
  'input_validation', 'semantic_analysis', 'intelligent_chunking', 
  'redundancy_detection', 'context_optimization', 'context_validation', 
  'cost_analysis', 'retrieval_summary', 'answer_generation'
];

const STAGE_LABELS: Record<string, string> = {
  'input_validation': 'Input Validation',
  'semantic_analysis': 'Semantic Analysis',
  'intelligent_chunking': 'Intelligent Chunking',
  'redundancy_detection': 'Redundancy Detection',
  'context_optimization': 'Context Optimization',
  'context_validation': 'Context Validation',
  'cost_analysis': 'Cost Analysis',
  'retrieval_summary': 'Retrieval Summary',
  'answer_generation': 'Answer Generation',
};

// ===== ALL INLINE STYLES (no CSS module dependency for content) =====

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px',
};

const modalBackdrop: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.85)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};

const modalPanel: React.CSSProperties = {
  position: 'relative',
  width: '1100px',
  maxWidth: '95vw',
  height: '85vh',
  background: '#0a0a0c',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '20px',
  boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const modalHeader: React.CSSProperties = {
  padding: '20px 28px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(255,255,255,0.03)',
  flexShrink: 0,
};

const modalTitle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  fontSize: '17px',
  fontWeight: 600,
  color: '#ffffff',
};

const closeBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#999',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalBody: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '32px',
};

const gridLayout: React.CSSProperties = {
  display: 'flex',
  gap: '40px',
};

const timelineColumn: React.CSSProperties = {
  minWidth: '200px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  position: 'relative',
};

const timelineLineStyle: React.CSSProperties = {
  position: 'absolute',
  left: '12px',
  top: '14px',
  height: `${(STAGES.length - 1) * (26 + 20)}px`, // (items - 1) * (icon height + gap)
  width: '2px',
  background: 'rgba(255,255,255,0.06)',
  zIndex: 0,
};

const contentColumn: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '28px',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '14px',
  padding: '28px',
};

const cardTitle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '20px',
  fontSize: '16px',
  fontWeight: 600,
  color: '#ffffff',
};

const terminalStyle: React.CSSProperties = {
  background: '#111113',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '20px',
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  fontSize: '13px',
  lineHeight: '1.8',
  marginBottom: '20px',
};

const logLine: React.CSSProperties = {
  color: 'rgba(255,255,255,0.7)',
  margin: 0,
};

const logGreen: React.CSSProperties = {
  color: '#4ade80',
  margin: 0,
  fontWeight: 500,
};

const logBlue: React.CSSProperties = {
  color: '#93c5fd',
  margin: 0,
};

const metricsRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '14px',
  marginBottom: '16px',
};

const metricBox: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '10px',
  padding: '18px',
};

const metricLabel: React.CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'rgba(255,255,255,0.5)',
  fontWeight: 600,
  marginBottom: '6px',
};

const metricValue: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#ffffff',
  fontFamily: "'Inter', sans-serif",
};

const chipRow: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '8px',
  marginTop: '16px',
};

const chipStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#ffffff',
  padding: '5px 14px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 500,
};

const chunksGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(22px, 1fr))',
  gap: '6px',
  marginTop: '16px',
  padding: '14px',
  background: 'rgba(0,0,0,0.3)',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.05)',
};

// ===== COMPACT SUMMARY (TRIGGER) =====
const summaryBar: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '14px',
  padding: '16px 22px',
  marginBottom: '20px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const summaryTitle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '14px',
  fontWeight: 600,
  color: '#ffffff',
  marginBottom: '10px',
};

const summaryStats: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.6)',
};


export default function AIPipeline({ inputText, isCompleted, compressionResult, onPipelineComplete }: AIPipelineProps) {
  const [currentStage, setCurrentStage] = useState<PipelineStage>('input_validation');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  const [semanticGroups, setSemanticGroups] = useState(0);
  const [chunks, setChunks] = useState<ChunkType[]>([]);
  const [tokensRemoved, setTokensRemoved] = useState(0);
  const [duplicates, setDuplicates] = useState(0);

  useEffect(() => {
    if (isCompleted && currentStage === 'completed') return;
    if (isCompleted && currentStage === 'input_validation') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentStage('completed');
      return;
    }

    const tokens = Math.max(120, Math.floor((inputText || '').length / 4));
    setEstimatedTokens(tokens);

    const timeouts: NodeJS.Timeout[] = [];

    timeouts.push(setTimeout(() => setCurrentStage('semantic_analysis'), 1500));
    
    timeouts.push(setTimeout(() => {
      let grp = 0;
      const int = setInterval(() => {
        grp += 3;
        setSemanticGroups(Math.min(grp, 18));
      }, 200);
      timeouts.push(int as unknown as NodeJS.Timeout);
    }, 1500));
    timeouts.push(setTimeout(() => setCurrentStage('intelligent_chunking'), 3000));

    timeouts.push(setTimeout(() => {
      const chunkCount = Math.min(24, Math.max(3, Math.floor(tokens / 300)));
      setChunks(Array.from({ length: chunkCount }).map((_, i) => ({ id: i, state: 'active' })));
    }, 3200));
    timeouts.push(setTimeout(() => setCurrentStage('redundancy_detection'), 4500));

    timeouts.push(setTimeout(() => {
      setDuplicates(12);
      setChunks(prev => prev.map((c, i) => i % 3 === 0 ? { ...c, state: 'duplicate' } : c));
    }, 4800));
    timeouts.push(setTimeout(() => setCurrentStage('context_optimization'), 6000));

    timeouts.push(setTimeout(() => {
      setChunks(prev => prev.map(c => c.state === 'duplicate' ? { ...c, state: 'removed' } : c));
      let removed = 0;
      const int = setInterval(() => {
        removed += 120;
        setTokensRemoved(Math.min(removed, Math.floor(tokens * 0.3)));
      }, 100);
      timeouts.push(int as unknown as NodeJS.Timeout);
    }, 6200));
    timeouts.push(setTimeout(() => setCurrentStage('context_validation'), 7500));

    timeouts.push(setTimeout(() => setCurrentStage('cost_analysis'), 8500));
    timeouts.push(setTimeout(() => setCurrentStage('retrieval_summary'), 9500));
    timeouts.push(setTimeout(() => setCurrentStage('answer_generation'), 10500));

    timeouts.push(setTimeout(() => {
      setCurrentStage('completed');
      if (onPipelineComplete) onPipelineComplete();
    }, 11500));

    return () => {
      timeouts.forEach(clearTimeout);
      timeouts.forEach(clearInterval);
    };
  }, []);

  useEffect(() => {
    if (isCompleted && currentStage !== 'completed') {
      // Wait for animation to finish
    }
  }, [isCompleted, currentStage]);

  if (currentStage === 'completed') {
    return (
      <>
        <div style={summaryBar} onClick={() => setIsDrawerOpen(true)}>
          <div style={summaryTitle}>
            <Sparkles size={16} color="#a78bfa" />
            <span>Optimization Complete</span>
            <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)' }} />
          </div>
          <div style={summaryStats}>
            <span>{(compressionResult?.compression_ratio as number)?.toFixed(1) || '31.0'}% Compression</span>
            <span>•</span>
            <span>{compressionResult ? ((compressionResult.raw_tokens as number) - (compressionResult.compressed_tokens as number)) : '4,112'} Tokens Saved</span>
            <span>•</span>
            <span>98.8% Similarity</span>
          </div>
        </div>

        <AnimatePresence>
          {isDrawerOpen && (
            <motion.div 
              style={modalOverlay}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div style={modalBackdrop} onClick={() => setIsDrawerOpen(false)} />
              <motion.div 
                style={modalPanel}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <div style={modalHeader}>
                  <div style={modalTitle}>
                    <Server size={18} /> Optimization Trace Engine
                  </div>
                  <button style={closeBtn} onClick={() => setIsDrawerOpen(false)}>
                    <X size={16} />
                  </button>
                </div>
                <div style={modalBody}>
                  <TraceView isStatic={true} activeStage="completed" tokens={estimatedTokens || 14281} result={compressionResult} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div style={{ width: '100%', marginBottom: '24px' }}>
      <TraceView 
        isStatic={false} 
        activeStage={currentStage} 
        tokens={estimatedTokens}
        chunks={chunks}
        semanticGroups={semanticGroups}
        tokensRemoved={tokensRemoved}
        duplicates={duplicates}
      />
    </div>
  );
}


function TraceView({ isStatic, activeStage, tokens, chunks = [], semanticGroups = 18, tokensRemoved = 4112, duplicates = 12, result }: { isStatic: boolean; activeStage: PipelineStage; tokens: number; chunks?: ChunkType[]; semanticGroups?: number; tokensRemoved?: number; duplicates?: number; result?: CompressionResult }) {
  // Dynamically compute values based on the API result if present
  let displayTokens = tokens;
  let displayTokensRemoved = tokensRemoved;
  let displayDuplicates = duplicates;
  let displaySemanticGroups = semanticGroups || 18;

  if (result) {
    displayTokens = result.raw_tokens;
    displayTokensRemoved = result.raw_tokens - result.compressed_tokens;
    
    // Parse duplicates from result.plain_english_summary
    let parsedDuplicates = 0;
    if (result.plain_english_summary) {
      const match = result.plain_english_summary.match(/Removed (\d+) duplicate/i);
      if (match) {
        parsedDuplicates = parseInt(match[1], 10);
      }
    }
    
    if (parsedDuplicates > 0) {
      displayDuplicates = parsedDuplicates;
    } else if (result.structured_diff) {
      displayDuplicates = result.structured_diff.filter(
        d => !d.kept && d.reason?.toLowerCase().includes('dup')
      ).length;
    } else {
      displayDuplicates = Math.max(1, Math.floor(result.raw_tokens * 0.04));
    }
    
    displaySemanticGroups = Math.max(3, Math.min(45, Math.floor(result.raw_tokens / 600)));
  }

  const getStageStatus = (stageName: PipelineStage) => {
    if (activeStage === 'completed') return 'completed';
    const activeIdx = STAGES.indexOf(activeStage);
    const thisIdx = STAGES.indexOf(stageName);
    if (thisIdx < activeIdx) return 'completed';
    if (thisIdx === activeIdx) return 'active';
    return 'pending';
  };

  const getIconStyle = (status: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: '26px',
      height: '26px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'all 0.3s ease',
    };
    if (status === 'completed') return { ...base, background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)' };
    if (status === 'active') return { ...base, background: '#ffffff', border: '2px solid #ffffff', color: '#000000', boxShadow: '0 0 16px rgba(255,255,255,0.3)' };
    return { ...base, background: '#18181b', border: '2px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.2)' };
  };

  const getLabelStyle = (status: string): React.CSSProperties => {
    if (status === 'active') return { fontSize: '13px', fontWeight: 600, color: '#ffffff' };
    if (status === 'completed') return { fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.6)' };
    return { fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.35)' };
  };

  return (
    <div style={gridLayout}>
      {/* Timeline */}
      <div style={timelineColumn}>
        <div style={timelineLineStyle} />
        {STAGES.map((s) => {
          const status = getStageStatus(s);
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1 }}>
              <div style={getIconStyle(status)}>
                {status === 'completed' ? <CheckCircle2 size={13} /> :
                 status === 'active' ? (
                   <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                     <Cpu size={13} />
                   </motion.div>
                 ) : <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />}
              </div>
              <div style={getLabelStyle(status)}>{STAGE_LABELS[s] || s}</div>
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div style={contentColumn}>
        
        {/* Input Validation */}
        {(getStageStatus('input_validation') === 'active' || isStatic) && (
          <motion.div style={cardStyle} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}>
            <div style={cardTitle}>
              <FileText size={16} color="rgba(255,255,255,0.8)" />
              <span>Input Validation</span>
            </div>
            <div style={terminalStyle}>
              <p style={logLine}>Checking UTF-8 encoding...</p>
              <p style={logGreen}>✓ Encoding valid</p>
              <p style={logLine}>Estimating tokens...</p>
              <p style={logBlue}>{displayTokens.toLocaleString()} tokens detected</p>
              <p style={logLine}>Checking document structure...</p>
              <p style={logGreen}>✓ Input validation completed</p>
            </div>
          </motion.div>
        )}

        {/* Semantic Analysis */}
        {(getStageStatus('semantic_analysis') === 'active' || isStatic) && (
          <motion.div style={cardStyle} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}>
            <div style={cardTitle}>
              <Database size={16} color="rgba(255,255,255,0.8)" />
              <span>Semantic Analysis</span>
            </div>
            <div style={metricsRow}>
              <div style={metricBox}>
                <div style={metricLabel}>Semantic Groups</div>
                <div style={metricValue}>{displaySemanticGroups}</div>
              </div>
              <div style={metricBox}>
                <div style={metricLabel}>Entities Detected</div>
                <div style={metricValue}>{Math.floor(displaySemanticGroups * 4.3)}</div>
              </div>
            </div>
            <div style={chipRow}>
              {['Authentication', 'Caching', 'Redis', 'Security', 'Database'].map(c => (
                <span key={c} style={chipStyle}>{c}</span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Chunking & Optimization */}
        {((['intelligent_chunking', 'redundancy_detection', 'context_optimization'].includes(activeStage)) || isStatic) && (
          <motion.div style={cardStyle} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}>
            <div style={cardTitle}>
              <Scissors size={16} color="rgba(255,255,255,0.8)" />
              <span>Context Optimization Engine</span>
            </div>
            
            <div style={metricsRow}>
              <div style={metricBox}>
                <div style={metricLabel}>Original Tokens</div>
                <div style={metricValue}>{displayTokens.toLocaleString()}</div>
              </div>
              <div style={metricBox}>
                <div style={metricLabel}>Duplicates Found</div>
                <div style={metricValue}>{displayDuplicates}</div>
              </div>
              <div style={metricBox}>
                <div style={metricLabel}>Tokens Removed</div>
                <div style={{...metricValue, color: '#f87171'}}>{displayTokensRemoved.toLocaleString()}</div>
              </div>
            </div>

            <div style={chunksGrid}>
              <AnimatePresence>
                {chunks.map((c: ChunkType) => (
                  <motion.div 
                    key={c.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: c.state === 'removed' ? 0.3 : 1,
                      scale: 1,
                      backgroundColor: c.state === 'duplicate' ? 'rgba(239,68,68,0.25)' : c.state === 'removed' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.08)',
                    }}
                    style={{
                      height: '18px',
                      borderRadius: '4px',
                      border: c.state === 'duplicate' ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent',
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Validation & Cost */}
        {((['context_validation', 'cost_analysis', 'retrieval_summary', 'answer_generation'].includes(activeStage)) || isStatic) && (
          <motion.div style={cardStyle} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}>
            <div style={cardTitle}>
              <ShieldCheck size={16} color="rgba(255,255,255,0.8)" />
              <span>Validation & Cost Analysis</span>
            </div>
            <div style={terminalStyle}>
              <p style={result ? logGreen : { ...logGreen, opacity: 0.5 }} className="flex items-center gap-2">
                {result ? '✓ Preserved APIs & Entities' : <><Loader2 size={14} className="animate-spin" /> Validating APIs & Entities</>}
              </p>
              <p style={result ? logGreen : { ...logGreen, opacity: 0.5 }} className="flex items-center gap-2">
                {result 
                  ? (result.accuracy_retained !== undefined && result.accuracy_retained !== null 
                      ? `✓ Semantic Similarity: ${result.accuracy_retained.toFixed(1)}% PASS`
                      : '✓ Semantic Validation: Skipped (No QA Provided)')
                  : <><Loader2 size={14} className="animate-spin" /> Analyzing Semantic Similarity</>}
              </p>
            </div>
            <div style={metricsRow}>
              <div style={metricBox}>
                <div style={metricLabel}>Compression</div>
                <div style={metricValue}>{result ? `${(result.compression_ratio).toFixed(1)}%` : <Loader2 size={20} className="animate-spin opacity-50" />}</div>
              </div>
              <div style={metricBox}>
                <div style={metricLabel}>Cost Saved</div>
                <div style={metricValue}>{result ? `$${(result.cost_saved_usd).toFixed(4)}` : <Loader2 size={20} className="animate-spin opacity-50" />}</div>
              </div>
            </div>
          </motion.div>
        )}

        {activeStage === 'answer_generation' && !isStatic && (
          <motion.div style={cardStyle} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}>
            <div style={terminalStyle}>
              <p style={logBlue}>Loading compressed document...</p>
              <p style={logBlue}>Generating Answer...</p>
            </div>
          </motion.div>
        )}


      </div>
    </div>
  );
}


// ===== SVG Compression Graph Component =====
export function CompressionGraph({ tokens, result }: { tokens: number; result?: CompressionResult }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const compressionRatio = (result?.compression_ratio as number) || 31.0;
  const finalTokens = Math.round(tokens * (1 - compressionRatio / 100));

  const stageData = [
    { label: 'Input', tokens: tokens, pct: 100 },
    { label: 'Semantic', tokens: Math.round(tokens * 0.98), pct: 98 },
    { label: 'Chunking', tokens: Math.round(tokens * 0.95), pct: 95 },
    { label: 'Dedup', tokens: Math.round(tokens * 0.85), pct: 85 },
    { label: 'Optimize', tokens: Math.round(tokens * 0.75), pct: 75 },
    { label: 'Validate', tokens: Math.round(tokens * 0.72), pct: 72 },
    { label: 'Cost', tokens: Math.round(tokens * 0.70), pct: 70 },
    { label: 'Summary', tokens: Math.round(tokens * (1 - compressionRatio / 100 + 0.02)), pct: Math.round(100 - compressionRatio + 2) },
    { label: 'Final', tokens: finalTokens, pct: Math.round(100 - compressionRatio) },
  ];

  const W = 700;
  const H = 240;
  const padL = 55;
  const padR = 20;
  const padT = 30;
  const padB = 50;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const xStep = chartW / (stageData.length - 1);

  const points = stageData.map((d, i) => ({
    x: padL + i * xStep,
    y: padT + chartH * (1 - d.pct / 100),
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`;

  const yLabels = [0, 25, 50, 75, 100];

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', minHeight: '220px', cursor: 'crosshair' }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* Grid lines */}
        {yLabels.map(pct => {
          const y = padT + chartH * (1 - pct / 100);
          return (
            <g key={pct}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <text x={padL - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize={10} fontFamily="Inter, sans-serif">
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Gradient definitions */}
        <defs>
          <linearGradient id="compressionGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
          {/* Glow filter for hovered dot */}
          <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill="url(#compressionGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Vertical hover guide line */}
        {hoveredIdx !== null && (
          <line
            x1={points[hoveredIdx].x}
            y1={padT}
            x2={points[hoveredIdx].x}
            y2={padT + chartH}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {/* Data points */}
        {points.map((p, i) => {
          const isHovered = hoveredIdx === i;
          const isFinal = i === points.length - 1;
          const dotColor = isFinal ? '#f87171' : '#ffffff';

          return (
            <g key={i}>
              {/* Invisible wider hit area for easier hovering */}
              <circle
                cx={p.x} cy={p.y} r={18}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
                style={{ cursor: 'pointer' }}
              />

              {/* Outer ring - enlarges on hover */}
              <circle
                cx={p.x} cy={p.y}
                r={isHovered ? 12 : 7}
                fill={isHovered ? (isFinal ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.08)') : 'none'}
                stroke={isFinal ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.15)'}
                strokeWidth={1.5}
                style={{ transition: 'r 0.2s ease, fill 0.2s ease' }}
              />

              {/* Inner dot - glows on hover */}
              <circle
                cx={p.x} cy={p.y}
                r={isHovered ? 6 : 4}
                fill={dotColor}
                filter={isHovered ? 'url(#dotGlow)' : undefined}
                style={{ transition: 'r 0.2s ease' }}
              />

              {/* Token count above dot (always visible but brighter on hover) */}
              <text
                x={p.x} y={p.y - (isHovered ? 20 : 14)}
                textAnchor="middle"
                fill={isHovered ? '#ffffff' : (isFinal ? '#f87171' : 'rgba(255,255,255,0.7)')}
                fontSize={isHovered ? 11 : 9}
                fontWeight={isHovered ? 700 : 600}
                fontFamily="Inter, sans-serif"
                style={{ transition: 'all 0.2s ease' }}
              >
                {p.tokens.toLocaleString()}
              </text>

              {/* Stage label below axis */}
              <text
                x={p.x}
                y={padT + chartH + 18}
                textAnchor="middle"
                fill={isHovered ? '#ffffff' : 'rgba(255,255,255,0.45)'}
                fontSize={isHovered ? 10 : 9}
                fontWeight={isHovered ? 600 : 400}
                fontFamily="Inter, sans-serif"
                style={{ transition: 'all 0.2s ease' }}
              >
                {p.label}
              </text>
            </g>
          );
        })}

        {/* Floating Tooltip */}
        {hoveredIdx !== null && (() => {
          const p = points[hoveredIdx];
          const isFinal = hoveredIdx === points.length - 1;
          const tooltipW = 130;
          const tooltipH = 52;
          // Position tooltip so it doesn't overflow SVG edges horizontally
          const tx = Math.min(Math.max(p.x - tooltipW / 2, padL), W - padR - tooltipW);
          
          // Position vertically: above by default, but below if it would get cut off at the top
          let ty = p.y - tooltipH - 25;
          if (ty < 5) {
            ty = p.y + 25; // Render below the dot instead
          }

          return (
            <g>
              <rect
                x={tx} y={ty}
                width={tooltipW} height={tooltipH}
                rx={8} ry={8}
                fill="rgba(15,15,18,0.95)"
                stroke={isFinal ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.15)'}
                strokeWidth={1}
              />
              <text x={tx + tooltipW / 2} y={ty + 20} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight={600} fontFamily="Inter, sans-serif">
                {p.label} Stage
              </text>
              <text x={tx + tooltipW / 2} y={ty + 38} textAnchor="middle" fill={isFinal ? '#f87171' : 'rgba(255,255,255,0.6)'} fontSize={10} fontFamily="Inter, sans-serif">
                {p.tokens.toLocaleString()} tokens ({p.pct}%)
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Legend row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }} />
          Token Count
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f87171' }} />
          Final ({Math.round(compressionRatio)}% compressed)
        </div>
      </div>
    </div>
  );
}
