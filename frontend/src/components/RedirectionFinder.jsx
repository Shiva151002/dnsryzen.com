import React, { useState } from 'react';
import { Search, ChevronRight, CheckCircle, AlertTriangle, XCircle, Copy } from 'lucide-react';

// Module-level cache: Persists during app navigation, resets on full page reload.
const redirectionCache = {
  url: '',
  results: null
};

const RedirectionFinder = () => {
  // Initialize state from in-memory cache
  const [url, setUrl] = useState(redirectionCache.url);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(redirectionCache.results);
  const [error, setError] = useState(null);

  const getStatusColor = (code) => {
    if (code >= 300 && code < 400) return "text-orange-500 bg-orange-500/20"; // Redirect (301, 302, 307)
    if (code >= 200 && code < 300) return "text-green-500 bg-green-500/20"; // Success (200)
    if (code >= 400) return "text-red-500 bg-red-500/20"; // Error (404, 500)
    return "text-gray-500 bg-gray-500/20"; // Unknown / Network Error
  };

  const handleTrace = async (e) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setResults(null);
    setError(null);

    const safeUrl = url.trim();

    try {
      const res = await fetch('/api/redirections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: safeUrl })
      });
      const data = await res.json();

      if (!data.success) {
          setError(`Request failed: ${data.error || "Check domain spelling or network."}`);
      } else {
          setResults(data.hops);
          
          // Update in-memory cache on success
          redirectionCache.url = safeUrl;
          redirectionCache.results = data.hops;
      }
    } catch (err) {
      setError("Network error. Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Redirection Finder</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Enter a URL to trace its complete redirection path. This tool will show you every hop, including the HTTP status code and final destination.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-8 mb-8">
        <form onSubmit={handleTrace} className="flex flex-col gap-4">
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">URL to Check</label>
            <div className="flex gap-4">
                <input
                    className="flex-1 h-12 px-4 border border-gray-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    placeholder="e.g., k12insight.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
                <button
                    disabled={loading}
                    className="h-12 bg-orange-500 hover:bg-orange-600 text-white px-8 rounded-lg font-bold shadow-md transition-all disabled:opacity-70 flex items-center justify-center"
                >
                    {loading ? 'Tracing...' : 'Trace Redirects'}
                </button>
            </div>
        </form>
      </div>

      {/* Results and Errors */}
      {(results || error) && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 rounded-r-lg">
                    <p className="text-red-600 dark:text-red-400 font-bold">Error: {error}</p>
                </div>
            )}

            {results && (
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-800 dark:text-white text-lg border-b dark:border-slate-700 pb-2 mb-4">
                        Redirect Chain ({results.length} Hops)
                    </h3>

                    {results.map((hop, index) => (
                        <div key={index} className="flex items-center space-x-3">
                            {/* Status Code */}
                            <div
                                className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusColor(hop.status_code)} shrink-0`}
                            >
                                {hop.status_code}
                            </div>

                            {/* URL Path */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-mono text-gray-900 dark:text-gray-200 truncate" title={hop.url}>
                                    {hop.url}
                                </p>
                            </div>

                            {/* Arrow icon unless it's the final hop */}
                            {index < results.length - 1 ? (
                                <ChevronRight size={16} className="text-gray-400 shrink-0" />
                            ) : (
                                <CheckCircle size={16} className="text-green-500 shrink-0" />
                            )}
                        </div>
                    ))}

                    <div className="pt-4 mt-4 border-t dark:border-slate-700 text-sm">
                        <p className="font-bold text-gray-600 dark:text-gray-300">Final Destination:</p>
                        <a href={results[results.length - 1].url} target="_blank" rel="noopener noreferrer" className="text-orange-500 break-all underline">
                            {results[results.length - 1].url}
                        </a>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default RedirectionFinder;
