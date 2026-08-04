'use client';

import { useState, useRef, useEffect } from 'react';
import type { LessonContent, QuizQuestion } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

export default function LessonChatbot({ lessonContent }: { lessonContent: LessonContent }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Une question sur cette leçon ? Je suis là pour t'aider !" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/lesson-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          chatHistory: messages,
          lessonContent,
        }),
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'bot', content: data.reply }]);

      // Si le chatbot a généré une nouvelle question de quiz
      if (data.newQuizQuestion) {
        const customQ = sessionStorage.getItem('customQuizQuestions');
        const parsedQ = customQ ? JSON.parse(customQ) : [];
        parsedQ.push(data.newQuizQuestion);
        sessionStorage.setItem('customQuizQuestions', JSON.stringify(parsedQ));
        
        addToast('🎯 Bonne question ! Le quiz a été adapté.', 'success');
      }
    } catch (err) {
      console.error('[CHAT] Error:', err);
      setMessages(prev => [...prev, { role: 'bot', content: "Désolé, je n'ai pas pu répondre à ta question. 😕" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── MODALE CHATBOT ── */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 90,
          right: 20,
          width: 320,
          maxHeight: 450,
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {/* Header */}
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 600
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🤖</span> CogniBot
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)'
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'var(--surface-secondary)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-lg)',
                maxWidth: '85%',
                fontSize: '0.9rem',
                lineHeight: 1.4,
                borderBottomRightRadius: msg.role === 'user' ? 0 : 'var(--radius-lg)',
                borderBottomLeftRadius: msg.role === 'bot' ? 0 : 'var(--radius-lg)'
              }}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                CogniBot écrit...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: 'var(--space-3)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 'var(--space-2)'
          }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Pose ta question..."
              className="form-input"
              style={{ flex: 1, padding: 'var(--space-2)', fontSize: '0.9rem' }}
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="btn btn-primary"
              style={{ padding: '0 var(--space-3)' }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* ── FAB ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: '50%',
          backgroundColor: 'var(--primary)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
          zIndex: 1000,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        💬
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </>
  );
}
