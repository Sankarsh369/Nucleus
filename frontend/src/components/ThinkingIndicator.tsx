import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import styles from './ThinkingIndicator.module.css';

const PHRASES = [
  'Thinking...',
  'Analyzing...',
  'Understanding your request...',
  'Searching relevant information...',
  'Generating response...',
  'Almost there...'
];

export default function ThinkingIndicator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % PHRASES.length);
    }, 2000); // 2 second interval

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.container}>
      <Sparkles size={16} className={styles.icon} />
      <div className={styles.textWrapper}>
        {PHRASES.map((phrase, i) => (
          <span
            key={i}
            className={`${styles.phrase} ${i === index ? styles.active : ''}`}
          >
            {phrase}
          </span>
        ))}
      </div>
    </div>
  );
}
