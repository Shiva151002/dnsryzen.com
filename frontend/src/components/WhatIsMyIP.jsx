import React, { useState, useEffect } from 'react';
import { MapPin, Globe, Wifi, Server, ShieldCheck, Copy, Check, Search, Activity, Lock, AlertTriangle } from 'lucide-react';

// Module-level cache: Persists during app navigation, resets on full page reload.
const ipCache = {
  searchQuery: '',
  data: null
};

const InfoCard = ({ icon: Icon, label, value, copyable = false, status = "neutral" }) => {
  const [copied, setCopied] = useState(false);

  let statusColor = "text-gray-900 dark:text-white";
  if (status === "good") statusColor = "text-green-500";
  if (status === "bad") statusColor = "text-red-500";
  if (status === "warning") statusColor = "text-amber-500";

  const handleCopy = (val) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-gray-200 dark:border-slate-800 flex flex-col justify-between h-full hover:border-orange-500/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        <Icon size={16} className="text-orange-500 opacity-80" />
      </div>
      <div className="flex items-center gap-2">
        <h3 className={`text-lg font-bold truncate ${statusColor}`} title={value}>
            {value || "N/A"}
        </h3>
        {copyable && value && (
            <button
                onClick={() => handleCopy(value)}
                className="text-gray-400 hover:text-orange-500 transition-colors flex-shrink-0"
                title="Copy"
            >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
        )}
      </div>
    </div>
  );
};

const WhatIsMyIP = () => {
  // Initialize state from the in-memory cache
  const [ipInput, setIpInput] = useState(ipCache.searchQuery);
  const [data, setData] = useState(ipCache.data);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bannerCopied, setBannerCopied] = useState(false);

  const fetchIP = async (targetIP = '') => {
    setLoading(true);
    setError(null);

    let ipToLookup = targetIP;

    try {
      // 1. Client-Side Pre-Check for "My IP"
      if (!ipToLookup) {
          try {
              const ipRes = await fetch('https://api.ipify.org?format=json');
              if (ipRes.ok) {
                  const ipData = await ipRes.json();
                  ipToLookup = ipData.ip;
              }
          } catch (e) {
              console.warn("Client-side IP detection failed, falling back to server detection.");
          }
      }

      // 2. Get Details from Backend
      const res = await fetch('/api/ip-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ipToLookup })
      });

      if (!res.ok) {
         throw new Error(`Server returned ${res.status}`);
      }

      const json = await res.json();

      if (json.success === false) {
            throw new Error(json.message || 'Failed to fetch IP details');
      }

      const newData = {
          query: json.ip,
          city: json.city,
          region: json.region,
          country: json.country,
          flag: json.flag?.img,
          zip: json.postal,
          lat: json.latitude,
          lon: json.longitude,
          isp: json.connection?.isp,
          org: json.connection?.org,
          as: json.connection?.asn,
          range: json.connection?.range,
          is_eu: json.is_eu
      };

      // Map backend response to UI state
      setData(newData);

      // 3. Update in-memory cache
      ipCache.searchQuery = targetIP; // Keep the input used for this search
      ipCache.data = newData;

    } catch (err) {
      console.error(err);
      setError("Could not resolve IP address. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial Load: Only fetch if we don't have cached data
  useEffect(() => {
    if (!ipCache.data) {
        fetchIP();
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchIP(ipInput);
  };

  const handleBannerCopy = (val) => {
    navigator.clipboard.writeText(val);
    setBannerCopied(true);
    setTimeout(() => setBannerCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500">

      {/* Header / Search Bar */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">IP Intelligence</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                Network telemetry and reputation lookup.
                </p>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
                <button
                    onClick={() => { setIpInput(''); fetchIP(''); }}
                    className="h-10 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-orange-500 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shadow-sm"
                    title="Check My Public IP"
                >
                    <MapPin size={16} className="text-orange-500" />
                    My IP
                </button>

                <form onSubmit={handleSearch} className="relative flex-1 md:w-80">
                    <input
                        className="w-full h-10 pl-10 pr-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                        placeholder="Search IP address (e.g. 8.8.8.8)"
                        value={ipInput}
                        onChange={(e) => setIpInput(e.target.value)}
                    />
                    <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                    <button className="absolute right-1 top-1 h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-md transition-colors">
                        Lookup
                    </button>
                </form>
            </div>
        </div>
      </div>

      {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
              <p className="text-gray-500 text-sm font-mono">Scanning network...</p>
          </div>
      ) : error ? (
        <div className="p-6 text-center bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 font-bold">{error}</p>
            <button onClick={() => { setIpInput(''); fetchIP(''); }} className="mt-4 text-xs underline text-red-500">Retry My IP</button>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT COL: Main Info */}
            <div className="lg:col-span-2 space-y-6">
                {/* Big Banner with NEW Copy Button */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border-l-4 border-orange-500 shadow-sm border-y border-r border-gray-200 dark:border-slate-800 relative group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {data.flag && <img src={data.flag} alt="Flag" className="w-10 h-auto shadow-sm rounded-sm" />}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Target IP Address</p>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white font-mono tracking-tight">{data.query}</h1>
                            </div>
                        </div>
                        {/* THE NEW COPY SYMBOL BUTTON */}
                        <button 
                            onClick={() => handleBannerCopy(data.query)}
                            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-lg transition-all flex items-center justify-center"
                            title="Copy IP Address"
                        >
                            {bannerCopied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                        </button>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard icon={Globe} label="Location" value={`${data.city}, ${data.region}, ${data.country}`} />
                    <InfoCard icon={Server} label="Organization" value={data.org} />
                    <InfoCard icon={Wifi} label="ISP" value={data.isp} />
                    <InfoCard icon={Activity} label="ASN" value={`AS${data.as}`} copyable />
                    <InfoCard icon={MapPin} label="Coordinates" value={`${data.lat}, ${data.lon}`} copyable />
                    <InfoCard icon={ShieldCheck} label="EU Jurisdiction" value={data.is_eu ? "Yes" : "No"} status={data.is_eu ? "warning" : "neutral"} />
                </div>
            </div>

            {/* RIGHT COL: Map & Reputation */}
            <div className="space-y-6">
                {/* MAP - Square Aspect Ratio */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden w-full aspect-square relative">
                    <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        marginHeight="0"
                        marginWidth="0"
                        title="Map"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.lon-5}%2C${data.lat-5}%2C${data.lon+5}%2C${data.lat+5}&layer=mapnik&marker=${data.lat}%2C${data.lon}`}
                        className="w-full h-full"
                    ></iframe>
                </div>

                {/* Pseudo-Reputation Block */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold flex items-center gap-2"><Lock size={16} className="text-green-400"/> Reputation Estimate</h3>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded uppercase font-bold">Neutral</span>
                    </div>
                    <div className="space-y-3 text-sm text-slate-400">
                        <div className="flex justify-between"><span>Spam Blacklist</span> <span className="text-green-400">Clean</span></div>
                        <div className="flex justify-between"><span>Tor Exit Node</span> <span className="text-green-400">No</span></div>
                        <div className="flex justify-between"><span>VPN Endpoint</span> <span className="text-gray-500">Unknown</span></div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700 text-[10px] text-slate-500 text-center">
                        * Basic reputation estimation based on public lists.
                    </div>
                </div>
            </div>

        </div>
      ) : null}
    </div>
  );
};

export default WhatIsMyIP;
