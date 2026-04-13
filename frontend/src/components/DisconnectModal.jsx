import React from 'react';
import { AlertCircle, Save } from 'lucide-react';

const DisconnectModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-slate-700 scale-100 transform transition-all">
        
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Save size={24} className="text-orange-600 dark:text-orange-500" />
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Disconnect for now?
          </h3>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            This will disconnect AI features for this session. <br/>
            <span className="font-semibold text-gray-700 dark:text-gray-300">Your API key will remain saved</span> for easy reconnection later.
          </p>

          <div className="flex gap-3 justify-center">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="px-4 py-2 text-white bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all"
            >
              Yes, Disconnect
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DisconnectModal;
