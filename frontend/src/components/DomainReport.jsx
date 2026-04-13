import React, { useState } from 'react';
import { Copy } from 'lucide-react';

// UPDATED: Accepts progress state as props
const DomainReport = ({ 
  domain, setDomain, 
  reportData, setReportData, 
  loading, setLoading,
  progress, setProgress // <--- NEW PROPS
}) => {

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!domain) return;

    setLoading(true);
    setReportData(null);
    setProgress(5);

    // UPDATED: Faster progress bar animation to match ~5s backend time
    // Runs every 150ms (instead of 400ms) to feel snappier
    const interval = setInterval(() => {
      setProgress((prev) => {
        // Slow down as we get closer to 90% to assume "finishing up" state
        if (prev >= 90) return prev;
        const increment = prev < 60 ? Math.floor(Math.random() * 5) + 2 : 1;
        return prev + increment;
      });
    }, 150);

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });
      const data = await res.json();
      
      clearInterval(interval);
      setProgress(100);
      // Small delay to let user see 100% before showing data
      setTimeout(() => setLoading(false), 400); 
      setReportData(data);
    } catch (err) {
      console.error(err);
      setLoading(false);
      clearInterval(interval);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Domain Health Report</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Get a comprehensive DNS profile. This performs a deep scan for key records and common subdomains to map its public footprint.
        </p>
      </div>

      {/* Search Box */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-8 mb-8 transition-colors duration-300">
        <form onSubmit={handleGenerate} className="flex gap-4">
          <input 
            className="flex-1 h-12 px-4 border border-gray-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            placeholder="e.g., amazon.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <button 
            disabled={loading}
            className="h-12 bg-slate-500 hover:bg-slate-600 text-white px-8 rounded-lg font-semibold shadow-md transition-all disabled:opacity-70 flex items-center gap-2 min-w-[180px] justify-center"
          >
            {loading ? `Generating... (${progress}%)` : 'Generate Report'}
          </button>
        </form>

        {/* Progress Bar */}
        {loading && (
          <div className="mt-8">
            <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
              <span>Scanning domain, please wait...</span>
              <span>{progress}% complete</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-orange-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Report Results */}
      {reportData && !loading && (
        <div className="space-y-8">
          {Object.entries(reportData.report).map(([type, records]) => (
            <div key={type} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">
                  {type} Records <span className="text-gray-400 text-sm ml-2">({records.length})</span>
                </h3>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded text-xs text-gray-600 dark:text-gray-300 hover:text-orange-600 transition-colors">
                   <Copy size={12} /> Copy
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-900/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold w-1/3">Name</th>
                      <th className="px-6 py-4 font-semibold w-24">TTL</th>
                      <th className="px-6 py-4 font-semibold">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {records.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{r.name || domain}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{r.ttl}</td>
                        <td className="px-6 py-4 font-mono text-xs break-all leading-relaxed">
                          <div className="text-[15px] font-medium text-gray-800 dark:text-gray-100">{r.data}</div>
                          {r.provider && (
                            <div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 font-sans">
                              {r.provider}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DomainReport;
