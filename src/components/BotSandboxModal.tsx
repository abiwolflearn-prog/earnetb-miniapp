import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BotCommandResponse, TelegramUser } from '../types';
import { triggerHaptic } from '../lib/telegram';
import { useTranslation } from '../i18n/useTranslation';
import { Bot, Send, X, ExternalLink, RefreshCw, Zap } from 'lucide-react';

interface BotSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: TelegramUser;
  onLaunchMiniAppFromBot: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  inlineKeyboard?: BotCommandResponse['inlineKeyboard'];
  time: string;
}

export const BotSandboxModal: React.FC<BotSandboxModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLaunchMiniAppFromBot
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'bot',
      text: t('bot.welcome_text'),
      inlineKeyboard: [
        [
          { text: t('bot.launch_app'), url: '#' }
        ],
        [
          { text: t('bot.view_tasks'), callback_data: 'tasks' },
          { text: t('bot.wallet_cashout'), callback_data: 'withdraw' }
        ]
      ],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputCommand, setInputCommand] = useState<string>('/start');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSendCommand = async (cmdToRun?: string) => {
    const cmd = (cmdToRun || inputCommand).trim();
    if (!cmd) return;

    triggerHaptic('light');

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: cmd,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputCommand('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/bot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, user: currentUser })
      });

      const data: BotCommandResponse = await res.json();

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: data.text,
        inlineKeyboard: data.inlineKeyboard,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `bot_err_${Date.now()}`,
        sender: 'bot',
        text: t('bot.comm_error'),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickCommands = ['/start', '/help', '/profile', '/tasks', '/withdraw'];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex items-center justify-center text-white">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>@EtNovaTasksbot</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[11px] text-cyan-400 font-medium">{t('bot.simulator_subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Command Pills */}
          <div className="p-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {quickCommands.map((qc) => (
              <button
                key={qc}
                onClick={() => handleSendCommand(qc)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950/80 hover:text-cyan-300 border border-slate-700 text-[11px] font-mono text-slate-300 whitespace-nowrap transition-colors"
              >
                {qc}
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                      : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/80'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span className="text-[9px] opacity-60 block text-right mt-1">{msg.time}</span>
                </div>

                {/* Inline Keyboards */}
                {msg.inlineKeyboard && (
                  <div className="mt-2 w-[85%] space-y-1.5">
                    {msg.inlineKeyboard.map((row, rIdx) => (
                      <div key={rIdx} className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {row.map((btn, bIdx) => {
                          const isWebAppLauncher = btn.text.includes('Launch') || btn.text.includes('Open') || Boolean(btn.web_app);

                          return (
                            <button
                              key={bIdx}
                              onClick={() => {
                                if (isWebAppLauncher) {
                                  onLaunchMiniAppFromBot();
                                  onClose();
                                } else if (btn.callback_data) {
                                  handleSendCommand(`/${btn.callback_data}`);
                                } else if (btn.url && btn.url !== '#') {
                                  window.open(btn.url, '_blank');
                                }
                              }}
                              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                isWebAppLauncher
                                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-extrabold shadow-md shadow-cyan-500/20'
                                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700'
                              }`}
                            >
                              {isWebAppLauncher && <Zap className="w-3.5 h-3.5 fill-slate-950" />}
                              <span>{btn.text}</span>
                              {!isWebAppLauncher && btn.url && <ExternalLink className="w-3 h-3 opacity-60" />}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 text-slate-400 text-xs w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>{t('bot.typing')}</span>
              </div>
            )}
          </div>

          {/* Command Input Box */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputCommand}
              onChange={(e) => setInputCommand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
              placeholder={t('bot.input_placeholder')}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => handleSendCommand()}
              disabled={isLoading || !inputCommand.trim()}
              className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

