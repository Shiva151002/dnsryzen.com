import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Info, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

// Module-level cache: Persists during app navigation (tab switching), but resets on full page reload.
const emailHealthCache = {
  domain: '',
  selector: '',
  results: null
};

const HealthCard = ({ title, data, type }) => {
  const [isOpen, setIsOpen] = useState(false);

  let statusColor = "bg-gray-100 text-gray-600 border-gray-200";
  let StatusIcon = Info;
  let statusText = "Unknown";

  if (data.status === 'pass') {
    statusColor = "bg-green-50 text-green-700 border-green-200";
    StatusIcon = ShieldCheck;
    statusText = "Pass";
  } else if (data.status === 'fail') {
    statusColor = "bg-red-50 text-red-700 border-red-200";
    StatusIcon = ShieldAlert;
    statusText = "Fail";
  } else {
    statusColor = "bg-blue-50 text-blue-700 border-blue-200";
    statusText = "Info";
  }

  return (
    <div className={`border rounded-xl mb-4 overflow-hidden ${statusColor.split(' ')[2]}`}>
      <div
        className={`p-4 flex items-center justify-between cursor-pointer ${statusColor} bg-opacity-40`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <StatusIcon size={20} />
          <div>
            <h3 className="font-bold text-sm">{title}</h3>
            <p className="text-xs opacity-90">{data.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${statusColor} bg-white/50`}>
                {statusText}
            </span>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Details Dropdown */}
      {isOpen && (
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-inherit">
            <p className="text-xs font-bold text-gray-500 mb-1 uppercase">Raw Record:</p>
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
                {data.record || "No record found"}
            </div>
        </div>
      )}
    </div>
  );
};

const EmailHealth = () => {
  // Initialize state from the in-memory cache
  const [domain, setDomain] = useState(emailHealthCache.domain);
  const [selector, setSelector] = useState(emailHealthCache.selector);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(emailHealthCache.results);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!domain) return;
    
    setLoading(true);
    setResults(null);

    try {
      const res = await fetch('/api/email-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, selector })
      });
      const data = await res.json();
      
      setResults(data);

      // Save successful results to the in-memory cache
      emailHealthCache.domain = domain;
      emailHealthCache.selector = selector;
      emailHealthCache.results = data;

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Email Health Check</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Enter a domain to get a comprehensive analysis of its email security configuration, including SPF, DKIM, and DMARC records.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-8 mb-8">
        <form onSubmit={handleAnalyze} className="flex flex-col gap-4">
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Domain Name</label>
                    <input
                        className="w-full h-12 px-4 border border-gray-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                        placeholder="e.g., example.com"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                    />
                </div>
                <div className="w-1/3">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">DKIM Selector (Optional)</label>
                    <input
                        className="w-full h-12 px-4 border border-gray-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                        placeholder="e.g., default"
                        value={selector}
                        onChange={(e) => setSelector(e.target.value)}
                    />
                </div>
            </div>

            <button
                disabled={loading || !domain}
                className="h-12 bg-orange-500 hover:bg-orange-600 text-white px-8 rounded-lg font-bold shadow-md transition-all disabled:opacity-70 w-48 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Analyze Email Health'}
            </button>
        </form>
      </div>

      {results && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
            <HealthCard
                title="SPF (Sender Policy Framework)"
                data={results.spf}
                type="spf"
            />
            <HealthCard
                title="DKIM (DomainKeys Identified Mail)"
                data={results.dkim}
                type="dkim"
            />
            <HealthCard
                title="DMARC (Domain-based Message Authentication)"
                data={results.dmarc}
                type="dmarc"
            />
        </div>
      )}
    </div>
  );
};

export default EmailHealth;
