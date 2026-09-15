import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';

interface GeminiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ecoai';
  text: string;
}

export const GeminiDrawer: React.FC<GeminiDrawerProps> = ({
  isOpen,
  onClose,
  onOpen,
}) => {
  const { language, t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      sender: 'ecoai',
      text: t('ecoAiGreeting'),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    'How to prep empty ghee & oil jars for scrap?',
    'Current market value for 10kg cardboard cartons',
    'Where to safely recycle swollen smartphone batteries?',
  ];

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    // Build chat history payload for multi-turn conversation memory
    const historyPayload = messages
      .filter((m) => m.id !== 'm-1')
      .map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        text: m.text,
      }));

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await api.askEcoAi(query, historyPayload, language);
      const botMsg: Message = {
        id: `g-${Date.now()}`,
        sender: 'ecoai',
        text: res,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const botMsg: Message = {
        id: `g-${Date.now()}`,
        sender: 'ecoai',
        text: err.message || t('networkError'),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <div className="fixed bottom-22 right-4 z-40">
        <button
          aria-label="Ask EcoAi Chatbot"
          onClick={onOpen}
          className="h-12 px-4 rounded-full bg-[#3FA66B] text-[#FFFFFF] shadow-lg flex items-center gap-2 active:scale-95 transition-all hover:bg-[#174D35] border border-[#3FA66B]"
          type="button"
        >
          <span className="material-symbols-outlined text-[22px] animate-bounce">smart_toy</span>
          <span className="text-sm font-bold tracking-tight">EcoAi</span>
        </button>
      </div>

      {/* Drawer / Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#172019]/60 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
        >
          <div
            className="w-full max-w-md bg-[#FFFFFF] text-[#172019] rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 sm:gap-4 relative border border-[#DCE5DE] max-h-[85vh] sm:max-h-[85vh] h-[75dvh] sm:h-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE5DE] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#E8F3EB] border border-[#DCE5DE] text-[#3FA66B] flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">smart_toy</span>
                </div>
                <div>
                  <h4 className="font-editorial italic text-base font-bold text-[#172019]">EcoAi Chatbot</h4>
                  <span className="text-xs text-[#174D35] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3FA66B] animate-pulse"></span>
                    Your Personal Environmental Assistant
                  </span>
                </div>
              </div>
              <button
                aria-label="Close Assistant"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F5F8F4] border border-[#DCE5DE] flex items-center justify-center text-[#65736A] hover:text-[#172019] hover:bg-[#E8F3EB] transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Chat message stream */}
            <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto pr-1 scrollbar-none">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl text-sm ${
                    m.sender === 'ecoai'
                      ? 'bg-[#E8F3EB] text-[#172019] border border-[#DCE5DE] leading-relaxed'
                      : 'bg-[#3FA66B] text-[#FFFFFF] font-semibold ml-8 self-end'
                  }`}
                >
                  {m.id === 'm-1' ? t('ecoAiGreeting') : m.text}
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center gap-1.5 bg-[#E8F3EB] border border-[#DCE5DE] p-3 rounded-xl w-fit text-xs text-[#174D35]">
                  <span className="w-2 h-2 rounded-full bg-[#3FA66B] animate-ping"></span>
                  EcoAi is analyzing waste regulations & scrap market...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Inquiry Suggestions */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-[#65736A] font-bold">
                Quick Inquiries for EcoAi:
              </span>
              <div className="flex flex-col gap-1">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="text-left px-3 py-1.5 rounded-lg bg-[#F5F8F4] hover:bg-[#E8F3EB] text-[#172019] text-xs transition-colors flex items-center justify-between border border-[#DCE5DE]"
                    type="button"
                  >
                    <span className="truncate pr-2">{q}</span>
                    <span className="material-symbols-outlined text-[#3FA66B] text-[15px] shrink-0">
                      north_east
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input field */}
            <div className="flex items-center gap-2 pt-1 shrink-0">
              <input
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask EcoAi anything about waste, scrap rates..."
                className="flex-1 h-11 px-3.5 rounded-xl bg-[#FFFFFF] text-[#172019] text-sm placeholder:text-[#65736A] focus:outline-none focus:ring-2 focus:ring-[#3FA66B] border border-[#DCE5DE]"
                type="text"
              />
              <button
                aria-label="Send Query to EcoAi"
                onClick={() => handleSend()}
                className="w-11 h-11 rounded-xl bg-[#3FA66B] text-[#FFFFFF] flex items-center justify-center shadow-md hover:bg-[#174D35] active:scale-95 transition-all cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px] font-bold">send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const EcoAiDrawer = GeminiDrawer;
