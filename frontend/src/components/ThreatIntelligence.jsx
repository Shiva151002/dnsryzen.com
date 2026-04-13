import React, { useState, useRef, useEffect } from 'react';
import { Search, ShieldAlert, ShieldCheck, AlertTriangle, Globe, Calendar, Clock, Link as LinkIcon, FileText, Fingerprint, Copy, Check } from 'lucide-react';

// Helper to format file sizes elegantly
const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]} (${bytes} bytes)`;
};

// Helper to format dates to UTC
const formatUTCDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  if (typeof timestamp === 'string') return timestamp;
  return new Date(timestamp * 1000).toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
};

// Side-by-side Detail Row with perfect spacing and copy button
const DetailRow = ({ label, value, mono = false, copyable = false }) => {
  const [copied, setCopied] = useState(false);

  if (value === null || value === undefined || value === '') return null;

  const displayValue = Array.isArray(value) ? value.join(', ') : String(value);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-row items-start py-3 gap-6 border-b border-gray-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors px-4 -mx-4 group">
      <div className="w-40 sm:w-56 shrink-0 font-semibold text-slate-600 dark:text-slate-400 tracking-wide text-[13px] pt-0.5">
        {label}
      </div>
      <div className={`flex-1 flex items-start justify-between gap-4 text-slate-800 dark:text-slate-300 break-all text-[13px] leading-relaxed ${mono ? 'font-mono' : ''}`}>
        <span className="pt-0.5">{displayValue}</span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="shrink-0 p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-700 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Copy to clipboard"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
};

const ThreatIntelligence = () => {
  // REQUIREMENT: Clear data on page refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      const keysToRemove = ['ti_activeTab', 'ti_resultTab', 'ti_file_state', 'ti_url_state', 'ti_search_state'];
      keysToRemove.forEach(k => localStorage.removeItem(k));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ti_activeTab') || 'file'); 
  const [resultTab, setResultTab] = useState(() => localStorage.getItem('ti_resultTab') || 'detection');

  // SEPARATE STATES FOR EACH INTERNAL TOOL
  const [fileState, setFileState] = useState(() => {
    const saved = localStorage.getItem('ti_file_state');
    return saved ? JSON.parse(saved) : { target: '', results: null };
  });

  const [urlState, setUrlState] = useState(() => {
    const saved = localStorage.getItem('ti_url_state');
    return saved ? JSON.parse(saved) : { target: '', results: null };
  });

  const [searchState, setSearchState] = useState(() => {
    const saved = localStorage.getItem('ti_search_state');
    return saved ? JSON.parse(saved) : { target: '', results: null };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pollingStatus, setPollingStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Persistence logic for sub-tools
  useEffect(() => {
    localStorage.setItem('ti_activeTab', activeTab);
    localStorage.setItem('ti_resultTab', resultTab);
    localStorage.setItem('ti_file_state', JSON.stringify(fileState));
    localStorage.setItem('ti_url_state', JSON.stringify(urlState));
    localStorage.setItem('ti_search_state', JSON.stringify(searchState));
  }, [activeTab, resultTab, fileState, urlState, searchState]);

  // Helper to get/set data for the current active tool
  const current = activeTab === 'file' ? fileState : activeTab === 'url' ? urlState : searchState;
  
  const updateCurrentData = (updates) => {
    if (activeTab === 'file') setFileState(prev => ({ ...prev, ...updates }));
    else if (activeTab === 'url') setUrlState(prev => ({ ...prev, ...updates }));
    else setSearchState(prev => ({ ...prev, ...updates }));
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError(null);
  };

  const pollAnalysis = async (analysisId, localData = {}) => {
    setPollingStatus('Analyzing in the cloud... Please wait.');
    let attempts = 0;
    const maxAttempts = 40; 
    const intervalTime = 5000; 
    
    const interval = setInterval(async () => {
      attempts++;
      setPollingStatus(`Analyzing across 70+ security vendors... (Attempt ${attempts}/${maxAttempts})`);

      try {
        const res = await fetch(`/api/threat-intel/analysis/${analysisId}`);
        const data = await res.json();
        
        if (data.success && data.data.data.attributes.status === 'completed') {
          clearInterval(interval);
          setPollingStatus('Analysis complete. Fetching deep report metadata...');
          
          try {
            const searchEndpoint = activeTab === 'url' ? '/api/threat-intel/url' : '/api/threat-intel/search';
            const searchPayload = activeTab === 'url' ? current.target : (localData.sha256 || current.target);
            
            const fullReportRes = await fetch(searchEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ target: searchPayload })
            });
            const fullReportData = await fullReportRes.json();

            if (fullReportData.success && fullReportData.data.data) {
               const payloadData = activeTab === 'url' ? fullReportData.data.data : fullReportData.data.data[0];
               if (payloadData) {
                  updateCurrentData({ results: payloadData });
                  setPollingStatus('');
                  setLoading(false);
                  return;
               }
            }
          } catch (e) { console.error("Deep report fetch failed", e); }

          const attrs = data.data.data.attributes;
          const meta = data.data.data.meta || {};
          const fileInfo = meta.file_info || {};
          
          updateCurrentData({
            results: {
              id: analysisId,
              type: activeTab === 'file' ? 'file' : 'url',
              attributes: {
                last_analysis_stats: attrs.stats,
                last_analysis_results: attrs.results,
                creation_date: new Date().getTime() / 1000,
                last_analysis_date: new Date().getTime() / 1000,
                md5: fileInfo.md5 || attrs.md5,
                sha1: localData.sha1 || fileInfo.sha1 || attrs.sha1,
                sha256: localData.sha256 || fileInfo.sha256 || attrs.sha256,
                size: localData.size || fileInfo.size || attrs.size,
                meaningful_name: localData.name || current.target
              }
            }
          });
          setPollingStatus('');
          setLoading(false);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setError("VirusTotal is taking longer than 3 minutes. The file is in their queue—please copy the file hash and search for it manually in a few minutes.");
          setPollingStatus('');
          setLoading(false);
        }
      } catch (err) {
        clearInterval(interval);
        setError("Error checking analysis status. Please try again.");
        setPollingStatus('');
        setLoading(false);
      }
    }, intervalTime);
  };

  const getLocalFileInfo = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const sha256Buffer = await crypto.subtle.digest('SHA-256', buffer);
      const sha256Array = Array.from(new Uint8Array(sha256Buffer));
      const sha256 = sha256Array.map(b => b.toString(16).padStart(2, '0')).join('');

      const sha1Buffer = await crypto.subtle.digest('SHA-1', buffer);
      const sha1Array = Array.from(new Uint8Array(sha1Buffer));
      const sha1 = sha1Array.map(b => b.toString(16).padStart(2, '0')).join('');

      return { name: file.name, size: file.size, sha256, sha1 };
    } catch (err) {
      console.warn("Local hashing failed:", err);
      return { name: file.name, size: file.size };
    }
  };

  const processFile = async (file) => {
    setLoading(true);
    setError(null);
    updateCurrentData({ target: file.name, results: null });
    setResultTab('detection');

    try {
      setPollingStatus('Generating local file hashes...');
      const localFileInfo = await getLocalFileInfo(file);

      if (localFileInfo.sha256) {
        setPollingStatus('Checking VT database for existing analysis...');
        const searchRes = await fetch('/api/threat-intel/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: localFileInfo.sha256 })
        });
        
        const searchData = await searchRes.json();

        if (searchData.success && searchData.data.data && searchData.data.data.length > 0) {
          updateCurrentData({ results: searchData.data.data[0] });
          setPollingStatus('');
          setLoading(false);
          return;
        }
      }

      setPollingStatus('Uploading file for new analysis...');
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/threat-intel/file', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        if (uploadData.message.includes('409') || uploadData.message.includes('ConflictError')) {
          setError("This file is currently being processed by another user on VirusTotal. Please try searching for it again in a few minutes.");
        } else {
          setError(uploadData.message || "File upload failed.");
        }
        setPollingStatus('');
        setLoading(false);
      } else {
        const analysisId = uploadData.data.data.id;
        pollAnalysis(analysisId, localFileInfo);
      }
    } catch (err) {
      console.error(err);
      setError("Error processing file. Please ensure it's not too large.");
      setPollingStatus('');
      setLoading(false);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!current.target) return;
    
    setLoading(true);
    setError(null);
    updateCurrentData({ results: null });
    setResultTab('detection');
    setPollingStatus('');

    const endpoint = activeTab === 'url' ? '/api/threat-intel/url' : '/api/threat-intel/search';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: current.target })
      });

      const data = await res.json();
      
      if (!data.success) {
        setError(data.message || "Failed to fetch threat intelligence.");
        setLoading(false);
        return;
      }

      if (data.type === 'analysis') {
        const analysisId = data.data.data.id;
        pollAnalysis(analysisId, { name: current.target });
      } else {
        const payloadData = activeTab === 'url' ? data.data.data : data.data.data[0];
        if (!payloadData) {
          setError("No records found in the database.");
        } else {
          updateCurrentData({ results: payloadData });
        }
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Network error communicating with the backend.");
      setLoading(false);
    }
  };

  const renderScoreCircle = (stats) => {
    if (!stats) return null;
    const total = stats.harmless + stats.malicious + stats.suspicious + stats.undetected + (stats.timeout || 0);
    const malicious = stats.malicious + stats.suspicious;
    const isClean = malicious === 0;
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = isClean ? 0 : circumference - ((total - malicious) / total) * circumference;

    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700 w-40 shrink-0 shadow-sm">
        <div className="relative flex items-center justify-center w-24 h-24 mb-3">
          <svg viewBox="0 0 96 96" className="transform -rotate-90 w-24 h-24">
            <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-200 dark:text-slate-700" />
            <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} className={`transition-all duration-1000 ease-out ${isClean ? 'text-green-500' : 'text-red-500'}`} />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${isClean ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{malicious}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">/ {total}</span>
          </div>
        </div>
        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider text-center">Community Score</span>
      </div>
    );
  };

  const results = current.results;
  const attributes = results?.attributes;
  const stats = attributes?.last_analysis_stats;
  const vendors = attributes?.last_analysis_results ? Object.entries(attributes.last_analysis_results) : [];
  const maliciousCount = (stats?.malicious || 0) + (stats?.suspicious || 0);
  const totalVendors = vendors.length || 94;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Top Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Threat Intelligence</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Analyze suspicious files, domains, IPs, and URLs to detect malware and other breaches using multi-vendor consensus.
        </p>
      </div>

      {/* Main Tab Controls */}
      <div className="flex justify-center border-b border-gray-200 dark:border-slate-700 mb-10 gap-12 md:gap-32 text-sm font-bold tracking-wider uppercase">
        <button 
          onClick={() => handleTabSwitch('file')}
          className={`pb-4 px-2 flex items-center gap-2 transition-all border-b-2 ${activeTab === 'file' ? 'text-orange-500 border-orange-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-transparent'}`}
        >
          <FileText size={18} /> FileScan
        </button>
        <button 
          onClick={() => handleTabSwitch('url')}
          className={`pb-4 px-2 flex items-center gap-2 transition-all border-b-2 ${activeTab === 'url' ? 'text-orange-500 border-orange-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-transparent'}`}
        >
          <LinkIcon size={18} /> UrlScan
        </button>
        <button 
          onClick={() => handleTabSwitch('search')}
          className={`pb-4 px-2 flex items-center gap-2 transition-all border-b-2 ${activeTab === 'search' ? 'text-orange-500 border-orange-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-transparent'}`}
        >
          <Search size={18} /> IpScan
        </button>
      </div>

      {/* Input Areas */}
      <div className="flex flex-col items-center justify-center min-h-[160px] mb-8">
        
        {/* FILE DRAG AND DROP */}
        {activeTab === 'file' && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full max-w-2xl flex flex-col items-center justify-center gap-6 py-12 px-6 border-2 border-dashed rounded-xl transition-all duration-300 ${
              isDragging ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" />
            
            <div className="relative flex items-center justify-center mb-2">
              <Fingerprint size={72} className={`${isDragging ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'} transition-colors`} />
              {loading && <div className="absolute top-1/2 w-full h-[3px] bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,1)] animate-[scan_2s_ease-in-out_infinite]"></div>}
            </div>
            
            <div className="text-center flex flex-col items-center gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="px-8 py-3 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:border-orange-500 hover:text-orange-500 transition-colors shadow-sm"
              >
                {loading ? 'Processing...' : 'Choose file'}
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400">Drag & drop a file here to scan</p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 text-center">
              By submitting data above, you are agreeing to the sharing of your <strong className="text-slate-700 dark:text-slate-300">Sample submission with the security community</strong>.
            </p>
          </div>
        )}

        {/* SEARCH BAR */}
        {(activeTab === 'url' || activeTab === 'search') && (
          <div className="w-full max-w-4xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-8 shadow-sm">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
              <input
                className="flex-1 h-12 px-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 transition-all outline-none font-medium text-base shadow-inner"
                placeholder={activeTab === 'url' ? "Enter URL (e.g. google.com)" : "URL, IP address, domain, or file hash"}
                value={current.target}
                onChange={(e) => updateCurrentData({ target: e.target.value })}
              />
              <button 
                type="submit"
                disabled={loading || !current.target}
                className="h-12 px-8 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 shadow-sm"
              >
                {loading ? <span className="animate-pulse">Analyzing...</span> : 'Analyze'}
              </button>
            </form>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-4 text-center">
              By submitting data above, you are agreeing to the sharing of your <strong className="text-slate-700 dark:text-slate-300">Sample submission with the security community</strong>.
            </p>
          </div>
        )}

        {/* LOADING TEXT */}
        {loading && (
          <div className="mt-8 text-center text-orange-500 text-sm font-bold animate-pulse">
            {pollingStatus || "Scanning database..."}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3 w-full max-w-4xl mx-auto">
          <AlertTriangle className="text-red-500 mt-0.5" size={16} />
          <div>
            <h4 className="text-red-700 dark:text-red-400 font-bold text-sm">Scan Failed</h4>
            <p className="text-red-600 dark:text-red-300 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results Block */}
      {results && attributes && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          
          <div className={`px-6 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700/50 ${maliciousCount === 0 ? 'bg-green-50/30 dark:bg-green-900/10' : 'bg-red-50/30 dark:bg-red-900/10'}`}>
            <div className={maliciousCount === 0 ? 'text-green-500' : 'text-red-500'}>
              {maliciousCount === 0 ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
            </div>
            <p className={`text-sm font-bold tracking-tight ${maliciousCount === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {maliciousCount === 0 
                ? `No security vendors flagged this ${activeTab === 'url' ? 'URL' : activeTab === 'file' ? 'file' : 'IP address'} as malicious`
                : `${maliciousCount}/${totalVendors} security vendors flagged this ${activeTab === 'url' ? 'URL' : activeTab === 'file' ? 'file' : 'IP address'} as malicious`
              }
            </p>
          </div>

          <div className="p-6 flex flex-col md:flex-row gap-8 items-center border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            {renderScoreCircle(stats)}
            <div className="flex-1 w-full space-y-4">
              <div className="border-b border-gray-200 dark:border-slate-700 pb-5">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white break-all">
                    {attributes.url || attributes.meaningful_name || (attributes.names && attributes.names[0]) || current.target}
                  </h3>
                </div>
                
                {activeTab === 'url' && (
                  <div className="flex flex-wrap items-center gap-x-12 gap-y-4 text-[13px] font-medium text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold text-[14px]">Status</span>
                      <span className="text-green-600 dark:text-green-400 font-bold text-[14px]">{attributes.last_http_response_code || '200'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold text-[14px]">Content type</span>
                      <span className="bg-slate-200/60 dark:bg-slate-700/80 px-4 py-1.5 rounded text-[12px] font-mono border border-slate-300 dark:border-slate-600 uppercase text-slate-700 dark:text-slate-300">
                        {attributes.last_http_response_headers?.['Content-Type'] || 'text/html; charset=UTF-8'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-slate-400" />
                      <span className="text-slate-500 dark:text-slate-400 font-semibold text-[14px]">Last Analysis Date:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold text-[14px]">{formatUTCDate(attributes.last_analysis_date)}</span>
                    </div>
                  </div>
                )}

                {/* IP Header Data */}
                {results.type === 'ip_address' && (
                  <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
                    {attributes.network && <span>{attributes.network}</span>}
                    {attributes.asn && (
                      <span className="flex items-center gap-1">
                        AS {attributes.asn} {attributes.as_owner ? <span className="opacity-75">({attributes.as_owner})</span> : ''}
                      </span>
                    )}
                    {attributes.country && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-md">
                        <Globe size={14} className="text-slate-500" /> {attributes.country}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2 mt-4">
                  <span className="px-2.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase rounded tracking-wide">
                    {results.type || activeTab}
                  </span>
                  {attributes.size && (
                    <span className="px-2.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase rounded tracking-wide">
                      {formatBytes(attributes.size).split(' ')[0] + ' ' + formatBytes(attributes.size).split(' ')[1]}
                    </span>
                  )}
                </div>
              </div>

              {activeTab !== 'url' && attributes.last_analysis_date && (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Last Analysis Date</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    {formatUTCDate(attributes.last_analysis_date)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sub-Tabs */}
          <div className="border-b border-gray-200 dark:border-slate-700 px-8">
            <nav className="flex gap-8 mt-4">
              <button 
                onClick={() => setResultTab('detection')}
                className={`pb-3 text-xs font-bold tracking-wider uppercase transition-all border-b-2 ${resultTab === 'detection' ? 'text-orange-500 border-orange-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-transparent'}`}
              >
                Detection
              </button>
              <button 
                onClick={() => setResultTab('details')}
                className={`pb-3 text-xs font-bold tracking-wider uppercase transition-all border-b-2 ${resultTab === 'details' ? 'text-orange-500 border-orange-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-transparent'}`}
              >
                Details
              </button>
            </nav>
          </div>

          {/* DETECTION CONTENT */}
          {resultTab === 'detection' && (
            <div className="bg-gray-50 dark:bg-slate-900/20">
              <div className="px-8 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Security Vendors' Analysis</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-gray-200 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-700">
                {vendors.map(([vendorName, vendorData], i) => {
                  const isClean = vendorData.category === 'harmless' || vendorData.category === 'undetected';
                  const isSuspicious = vendorData.category === 'suspicious';
                  const isMalicious = vendorData.category === 'malicious';
                  
                  let textColor = 'text-slate-500 dark:text-slate-400';
                  let Icon = Globe;
                  
                  if (isClean) { textColor = 'text-green-600 dark:text-green-400'; Icon = ShieldCheck; }
                  else if (isMalicious) { textColor = 'text-red-600 dark:text-red-400'; Icon = ShieldAlert; }
                  else if (isSuspicious) { textColor = 'text-amber-600 dark:text-amber-400'; Icon = AlertTriangle; }

                  return (
                    <div key={i} className="bg-white dark:bg-slate-800 p-4 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{vendorName}</span>
                      <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${textColor}`}>
                        <Icon size={14} />
                        {vendorData.result || vendorData.category}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DETAILS CONTENT */}
          {resultTab === 'details' && (
            <div className="p-8 space-y-12 bg-white dark:bg-slate-800">
              {results.type === 'ip_address' && (
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">Network</h4>
                  <div className="flex flex-col">
                    <DetailRow label="Network Range" value={attributes.network} copyable />
                    <DetailRow label="Autonomous System Number" value={attributes.asn} copyable />
                    <DetailRow label="Autonomous System Label" value={attributes.as_owner} />
                    <DetailRow label="Regional Internet Registry" value={attributes.regional_internet_registry?.toUpperCase()} />
                    <DetailRow label="Country" value={attributes.country} />
                    <DetailRow label="Continent" value={attributes.continent} />
                  </div>
                </div>
              )}

              {results.type === 'ip_address' && attributes.whois && (
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">Whois Lookup</h4>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto leading-relaxed shadow-inner">
                    {attributes.whois}
                  </div>
                </div>
              )}

              {attributes.last_https_certificate && (
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">Last HTTPS Certificate</h4>
                  <div className="flex flex-col">
                    <DetailRow label="Issuer" value={attributes.last_https_certificate.issuer?.O || attributes.last_https_certificate.issuer?.CN} copyable />
                    <DetailRow label="Subject" value={attributes.last_https_certificate.subject?.CN} copyable />
                    <DetailRow label="Serial Number" value={attributes.last_https_certificate.serial_number} mono copyable />
                    <DetailRow label="Thumbprint (SHA-1)" value={attributes.last_https_certificate.thumbprint_sha1} mono copyable />
                    <DetailRow label="Thumbprint (SHA-256)" value={attributes.last_https_certificate.thumbprint_sha256} mono copyable />
                    <DetailRow label="Validity Not Before" value={attributes.last_https_certificate.validity?.not_before} />
                    <DetailRow label="Validity Not After" value={attributes.last_https_certificate.validity?.not_after} />
                  </div>
                </div>
              )}

              {(attributes.md5 || attributes.sha1 || attributes.sha256) && (
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">Basic Properties</h4>
                  <div className="flex flex-col">
                    <DetailRow label="MD5" value={attributes.md5} mono copyable />
                    <DetailRow label="SHA-1" value={attributes.sha1} mono copyable />
                    <DetailRow label="SHA-256" value={attributes.sha256} mono copyable />
                    <DetailRow label="SSDEEP" value={attributes.ssdeep} mono copyable />
                    <DetailRow label="TLSH" value={attributes.tlsh} mono copyable />
                    <DetailRow 
                      label="File type" 
                      value={
                        attributes.type_description ? (
                          <span className="flex items-center gap-2">
                            {attributes.type_description} 
                            {attributes.type_tag && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-[10px] rounded-full uppercase text-slate-500">{attributes.type_tag}</span>}
                          </span>
                        ) : null
                      } 
                    />
                    <DetailRow label="Magic" value={attributes.magic} />
                    <DetailRow label="File size" value={attributes.size ? formatBytes(attributes.size) : null} />
                  </div>
                </div>
              )}

              {attributes.categories && Object.keys(attributes.categories).length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">Categories</h4>
                  <div className="flex flex-col">
                    {Object.entries(attributes.categories).map(([vendor, category]) => (
                      <DetailRow key={vendor} label={vendor} value={category} />
                    ))}
                  </div>
                </div>
              )}

              {(attributes.last_http_response_code || attributes.last_final_url) && (
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">HTTP Response</h4>
                  <div className="flex flex-col">
                    <DetailRow label="Final URL" value={attributes.last_final_url} copyable />
                    <DetailRow label="Serving IP Address" value={attributes.last_http_response_client_ip} copyable />
                    <DetailRow label="Status Code" value={attributes.last_http_response_code} />
                    <DetailRow label="Body Length" value={attributes.last_http_response_content_length ? formatBytes(attributes.last_http_response_content_length) : null} />
                    <DetailRow label="Body SHA-256" value={attributes.last_http_response_content_sha256} mono copyable />
                  </div>
                </div>
              )}

              {attributes.last_http_response_headers && Object.keys(attributes.last_http_response_headers).length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">Headers</h4>
                  <div className="flex flex-col">
                    {Object.entries(attributes.last_http_response_headers).map(([key, val]) => (
                      <DetailRow key={key} label={key} value={val} copyable />
                    ))}
                  </div>
                </div>
              )}

              {attributes.html_meta && Object.keys(attributes.html_meta).length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">HTML Meta Tags</h4>
                  <div className="flex flex-col">
                    {Object.entries(attributes.html_meta).map(([key, val]) => (
                      <DetailRow key={key} label={key} value={val} />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">History</h4>
                <div className="flex flex-col">
                  <DetailRow label="Creation Date" value={attributes.creation_date ? formatUTCDate(attributes.creation_date) : null} />
                  <DetailRow label="First Submission" value={attributes.first_submission_date ? formatUTCDate(attributes.first_submission_date) : null} />
                  <DetailRow label="Last Submission" value={attributes.last_submission_date ? formatUTCDate(attributes.last_submission_date) : null} />
                  <DetailRow label="Last Analysis" value={attributes.last_analysis_date ? formatUTCDate(attributes.last_analysis_date) : null} />
                </div>
              </div>

              {attributes.names && attributes.names.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">Names</h4>
                  <ul className="list-none text-[13px] text-slate-700 dark:text-slate-300 space-y-2">
                    {attributes.names.slice(0, 10).map((name, idx) => (
                      <li key={idx} className="break-all py-1 border-b border-gray-50 dark:border-slate-700/30 last:border-0">{name}</li>
                    ))}
                    {attributes.names.length > 10 && (
                      <li className="text-slate-400 italic mt-2">...and {attributes.names.length - 10} more.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreatIntelligence;
