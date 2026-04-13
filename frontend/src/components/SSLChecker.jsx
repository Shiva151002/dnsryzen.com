import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertTriangle, Calendar, Server, Loader2 } from 'lucide-react';

// Module-level cache: Persists during app navigation, resets on full page reload.
const sslCache = {
  domain: '',
  data: null
};

const SSLChecker = () => {
  // Initialize state from in-memory cache
  const [domain, setDomain] = useState(sslCache.domain);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(sslCache.data);
  const [error, setError] = useState(null);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!domain) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      // 1. Call the backend API
      const res = await fetch('/api/ssl-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || `Server returned ${res.status}`);
      }

      // 2. Handle API level errors (e.g. domain not found)
      if (json.success === false) {
        throw new Error(json.error || "Could not retrieve SSL certificate. The domain might be invalid or unreachable.");
      }

      // 3. Set data only if successful
      setData(json);
      
      // Update in-memory cache
      sslCache.domain = domain.trim();
      sslCache.data = json;

    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to color-code validity days
  const getStatusColor = (days) => {
    if (days > 30) return "text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
    if (days > 0) return "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
    return "text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
          <ShieldCheck className="text-orange-500" /> SSL Certificate Checker
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Inspect a domain's SSL/TLS certificate chain, validity, and issuer details.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 mb-8">
        <form onSubmit={handleCheck} className="flex gap-4">
          <input 
            className="flex-1 h-12 px-4 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            placeholder="Enter domain (e.g. google.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <button 
            disabled={loading || !domain}
            className="h-12 bg-orange-500 hover:bg-orange-600 text-white px-8 rounded-lg font-bold shadow-md transition-all disabled:opacity-70 flex items-center gap-2 min-w-[160px] justify-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Check SSL'}
          </button>
        </form>

        {error && (
           <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg flex items-start gap-3 text-red-700 dark:text-red-400">
              <AlertTriangle className="shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-bold text-sm">Certificate Check Failed</p>
                <p className="text-xs mt-1 opacity-90">{error}</p>
              </div>
           </div>
        )}
      </div>

      {/* Results */}
      {data && data.server_certificate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Main Status Card */}
            <div className={`col-span-1 lg:col-span-2 p-6 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-6 ${getStatusColor(data.server_certificate.validity_days)}`}>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded-full">
                        {data.server_certificate.validity_days > 0 ? <Lock size={32} /> : <AlertTriangle size={32} />}
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">
                            {data.server_certificate.validity_days > 0 ? "Secure Connection" : "Expired Certificate"}
                        </h3>
                        <p className="text-sm font-medium opacity-80">
                            Issued to <span className="font-bold">{data.server_certificate.cn}</span>
                        </p>
                    </div>
                </div>
                <div className="text-center md:text-right">
                    <div className="text-3xl font-black">{data.server_certificate.validity_days}</div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-80">Days Remaining</div>
                </div>
            </div>

            {/* Issuer Details */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Server size={14} /> Issuer Information
                </h4>
                <div className="space-y-4">
                    <div>
                        <span className="text-xs text-gray-500 block mb-1">Common Name (CN)</span>
                        <p className="font-medium text-gray-900 dark:text-white break-words">{data.server_certificate.cn}</p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 block mb-1">Issued By</span>
                        <p className="font-medium text-gray-900 dark:text-white break-words">{data.server_certificate.issuer}</p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 block mb-1">Serial Number</span>
                        <p className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">{data.server_certificate.serial}</p>
                    </div>
                </div>
            </div>

            {/* Validity Dates */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Calendar size={14} /> Validity Period
                </h4>
                <div className="space-y-6">
                    <div className="relative pl-4 border-l-2 border-green-500">
                        <span className="text-xs text-gray-500 block mb-1">Issued On</span>
                        <p className="font-medium text-gray-900 dark:text-white">{data.server_certificate.not_before}</p>
                    </div>
                    <div className="relative pl-4 border-l-2 border-red-400">
                        <span className="text-xs text-gray-500 block mb-1">Expires On</span>
                        <p className="font-medium text-gray-900 dark:text-white">{data.server_certificate.not_after}</p>
                    </div>
                     <div className="pt-2">
                        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className="bg-green-500 h-full w-3/4 opacity-50"></div> 
                        </div>
                        <p className="text-[10px] text-center text-gray-400 mt-2">Visual representation of validity period</p>
                    </div>
                </div>
            </div>

        </div>
      )}
    </div>
  );
};

export default SSLChecker;
