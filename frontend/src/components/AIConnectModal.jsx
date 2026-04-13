import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Zap, Lock } from 'lucide-react';

const AIConnectModal = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('grok_api_key');
      if (stored) {
        setApiKey(stored);
        setIsSaved(true);
      } else {
        setApiKey('');
        setIsSaved(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    // FIX: Trim whitespace to prevent connection errors
    onSave(apiKey.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-700 scale-100 transition-all">
        
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            Connect with AI
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full p-1 hover:bg-gray-100 dark:hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4 mb-6">
            <h3 className="text-amber-800 dark:text-amber-500 font-bold text-sm mb-2 flex items-center gap-2">
              <AlertTriangle size={16} /> Security Notice
            </h3>
            <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>Your API key is stored <strong>exclusively in your browser's local storage</strong>.</li>
              <li>It is sent directly to the Grok API from your browser.</li>
              <li>For best practice, use a dedicated, revocable API key for this application.</li>
            </ul>
          </div>

          <div className="flex justify-between items-center mb-2">
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 text-sm font-medium inline-flex items-center gap-1 transition-colors group">
              Get your API key from GrokCloud <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </a>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-gray-400" />
            </div>
            <input 
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Groq API key (gsk_...)"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-mono text-base font-bold tracking-wide shadow-sm placeholder:font-normal placeholder:text-sm placeholder:tracking-normal"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={!apiKey.trim().startsWith('gsk_')}
              className="px-6 py-2.5 bg-orange-500 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed hover:bg-orange-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all transform active:scale-[0.98]"
            >
              <Zap size={16} fill="currentColor" /> 
              {isSaved ? 'Update & Connect' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConnectModal;
