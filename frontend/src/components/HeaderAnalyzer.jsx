import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, FileText, Loader2, Info, Copy, Check, ExternalLink, AlertTriangle, Zap, Server, Globe, Lightbulb } from 'lucide-react';

// Module-level cache for sticky sessions
const headerCache = {
  url: '',
  data: null
};

const HEADER_INFO = {
  "Strict-Transport-Security": "Forces browsers to use HTTPS, preventing man-in-the-middle attacks.",
  "Content-Security-Policy": "Prevents Cross-Site Scripting (XSS) by restricting where resources can load from.",
  "X-Frame-Options": "Prevents Clickjacking by disabling the site from being embedded in iframes.",
  "X-Content-Type-Options": "Stops the browser from 'sniffing' the MIME type, preventing drive-by downloads.",
  "Referrer-Policy": "Controls how much referrer information is passed when navigating away.",
  "Permissions-Policy": "Restricts browser features like camera, microphone, or geolocation."
};

const HeaderAnalyzer = () => {
  const [url, setUrl] = useState(headerCache.url);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(headerCache.data);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch('/api/http-headers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to fetch headers.");
      }

      setData(json);
      
      // Update cache
      headerCache.url = url.trim();
      headerCache.data = json;

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data.headers, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return 'text-green-500 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (grade === 'B') return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    if (grade === 'C') return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    return 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  };

  // Intelligence Feature: Detect Server/Cloud Infrastructure
  const detectFingerprint = () => {
    const headers = data?.headers || {};
    const server = (headers['Server'] || headers['server'] || '').toLowerCase();
    const via = (headers['Via'] || headers['via'] || '').toLowerCase();
    const powered = (headers['X-Powered-By'] || headers['x-powered-by'] || '').toLowerCase();

    if (server.includes('cloudflare')) return "Cloudflare WAF";
    if (server.includes('cloudfront') || via.includes('cloudfront')) return "Amazon CloudFront";
    if (server.includes('nginx')) return "Nginx Web Server";
    if (server.includes('apache')) return "Apache HTTPD";
    if (powered.includes('wp-rocket') || powered.includes('wordpress')) return "WordPress CMS";
    if (server.includes('litespeed')) return "LiteSpeed Server";
    return server || "Generic Server";
  };

  // Intelligence Feature: Reputation Estimator
  const getReputation = () => {
    const presentCount = Object.values(data?.security_report || {}).filter(v => v === 'Present').length;
    if (presentCount >= 5) return { status: 'Excellent', color: 'text-green-500', bg: 'bg-green-500/10' };
    if (presentCount >= 3) return { status: 'Trustworthy', color: 'text-blue-500', bg: 'bg-blue-500/10' };
    return { status: 'Neutral', color: 'text-gray-500', bg: 'bg-gray-500/10' };
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
           HTTP Header Security
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Professional diagnostic tool for analyzing security headers, infrastructure fingerprinting, and domain reputation.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-8 mb-8">
        <form onSubmit={handleAnalyze} className="flex gap-4">
          <div className="flex-1 relative">
            <input 
              className="w-full h-12 px-4 border border-gray-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
              placeholder="e.g. cloudflare.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <button 
            disabled={loading}
            className="h-12 bg-orange-500 hover:bg-orange-600 text-white px-8 rounded-lg font-bold shadow-md transition-all disabled:opacity-70 flex items-center justify-center gap-2 w-40"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Analyze'}
          </button>
        </form>

        {error && (
           <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm font-bold flex items-center gap-2">
              <ShieldAlert size={16} /> Error: {error}
           </div>
        )}
      </div>

      {data && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Top Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Grade Card */}
                <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${getGradeColor(data.grade)}`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Security Grade</span>
                    <h1 className="text-4xl font-black leading-none">{data.grade}</h1>
                </div>

                {/* Domain Reputation Card */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reputation</span>
                    <div className={`flex items-center gap-1.5 font-bold ${getReputation().color}`}>
                        <Globe size={16} />
                        {getReputation().status}
                    </div>
                </div>

                {/* Infrastructure Card */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Infrastructure</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                        <Server size={16} className="text-orange-500" />
                        <span className="truncate max-w-[120px]">{detectFingerprint()}</span>
                    </div>
                </div>

                {/* Response Time Card (Mocked or status based) */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">HTTP Status</span>
                    <span className={`text-xl font-bold flex items-center gap-1 ${data.status_code < 400 ? 'text-green-500' : 'text-red-500'}`}>
                        {data.status_code}
                        {data.status_code < 400 ? <Check size={16}/> : <AlertTriangle size={16}/>}
                    </span>
                </div>
            </div>

            {/* Middle Section: Checklist and Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Security Checklist */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-tight">
                        <ShieldCheck size={18} className="text-orange-500"/> Security Policy Checklist
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(data.security_report).map(([header, status]) => (
                            <div key={header} className="group relative flex flex-col p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700 transition-all hover:border-orange-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 truncate pr-2" title={header}>{header}</span>
                                    {status === "Present" ? (
                                        <span className="flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded shrink-0">
                                            Present
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded shrink-0">
                                            Missing
                                        </span>
                                    )}
                                </div>
                                <p className="hidden group-hover:block text-[9px] text-slate-500 mt-1 italic">
                                  {HEADER_INFO[header]}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Smart Recommendations */}
                <div className="bg-orange-500/5 dark:bg-orange-500/10 rounded-xl border border-orange-500/20 p-4">
                    <h3 className="font-bold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2 text-sm uppercase tracking-tight">
                        <Lightbulb size={18} /> Fix Recommendations
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(data.security_report).filter(([_, s]) => s === 'Missing').slice(0, 3).map(([header]) => (
                            <div key={header} className="flex gap-2">
                                <div className="mt-1"><Zap size={12} className="text-orange-500" /></div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                                    Implement <span className="font-bold text-slate-800 dark:text-white">{header}</span> to protect against specific web vulnerabilities.
                                </p>
                            </div>
                        ))}
                        {Object.values(data.security_report).every(s => s === 'Present') && (
                            <p className="text-xs font-medium text-green-600">Great job! All essential security headers are active.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Raw Headers Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
                        <FileText size={16} /> Technical Header dump
                    </h3>
                    <button 
                        onClick={copyToClipboard}
                        className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-orange-500 transition-colors bg-white dark:bg-slate-800 border px-2 py-1 rounded shadow-sm"
                    >
                        {copied ? <Check size={12}/> : <Copy size={12}/>}
                        {copied ? 'Copied' : 'Copy JSON'}
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {Object.entries(data.headers).map(([key, val]) => (
                                <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-4 py-2 font-bold text-slate-500 dark:text-slate-400 w-1/3 break-all border-r dark:border-slate-700">{key}</td>
                                    <td className="px-4 py-2 font-mono text-gray-800 dark:text-gray-200 break-all">{val}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
      )}
    </div>
  );
};

export default HeaderAnalyzer;
