import React from 'react';
import { Search, FileText, MapPin, Mail, Shield, Activity, FileCode, Fingerprint, Scan } from 'lucide-react';

const Sidebar = ({ activeTool, setActiveTool }) => {
  const menuItems = [
    { icon: Search, label: 'DNS Lookup' },
    { icon: FileText, label: 'Domain Report' },
    { icon: MapPin, label: 'What Is My IP' },
    { icon: Mail, label: 'Email Health' },
  ];

  const advancedItems = [
    { icon: Activity, label: 'Redirection Finder' },
    { icon: Shield, label: 'SSL Checker' },
    { icon: FileCode, label: 'HTTP Headers' },
    { icon: Fingerprint, label: 'Threat Intelligence' }, // NEW ITEM ADDED HERE
  ];

  return (
    <div className="w-72 bg-white dark:bg-slate-900 h-screen border-r border-gray-100 dark:border-slate-800 flex flex-col fixed left-0 top-0 transition-colors duration-300">
      <div className="p-6">
        <div className="flex flex-col gap-1 mb-10 pl-1">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center">
               <div className="w-3 h-3 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50 z-10"></div>
               <div className="absolute w-full h-full animate-spin-slow">
                 <div className="absolute top-0 left-1/2 w-2 h-2 bg-orange-300 rounded-full -translate-x-1/2"></div>
               </div>
               <svg className="absolute inset-0 w-full h-full text-orange-200 dark:text-orange-900/30 animate-pulse-slow" viewBox="0 0 40 40">
                 <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
               </svg>
            </div>
            <h1 className="font-bold text-slate-800 dark:text-white text-2xl tracking-tight">AI DNS</h1>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide pl-1">
            Intelligent DNS Analysis Platform
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-[11px] font-bold text-gray-400 dark:text-slate-600 uppercase tracking-wider mb-3 px-3">Core Tools</h3>
          <nav className="space-y-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => setActiveTool(item.label)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium rounded-lg transition-all duration-200 group ${
                  activeTool === item.label
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <item.icon size={18} className={activeTool === item.label ? 'text-orange-500' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-gray-400 dark:text-slate-600 uppercase tracking-wider mb-3 px-3">Diagnostics</h3>
          <nav className="space-y-1">
            {advancedItems.map((item, index) => (
              <button
                key={index}
                onClick={() => setActiveTool(item.label)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium rounded-lg transition-all duration-200 group ${
                  activeTool === item.label
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <item.icon size={18} className={activeTool === item.label ? 'text-orange-500' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
