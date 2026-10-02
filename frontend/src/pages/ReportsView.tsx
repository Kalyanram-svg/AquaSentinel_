import React, { useState, useEffect } from 'react';
import { api, resolveApiUrl } from '../services/api';
import {
  FileText,
  Download,
  Search,
  CheckCircle,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Presentation,
  History,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    api.getSurveys().then(setSurveys).catch(() => {});
    api.getAuditLogs().then(setAuditLogs).catch(() => {});
  }, []);

  const handleExport = async (surveyId: number, format: 'pdf' | 'csv' | 'json') => {
    setDownloading(`${surveyId}-${format}`);
    try {
      const res = await api.exportReport(surveyId, format);
      window.open(resolveApiUrl(res.download_url), '_blank');
    } catch (err) {
      alert('Report export failed: ' + err);
    } finally {
      setDownloading(null);
    }
  };

  const filteredSurveys = surveys.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.survey_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-[#041527] border border-cyan-900/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-white">Inspection Reports, Audit Trail & Mission History</h2>
            <p className="text-[10px] text-slate-400">Capabilities 13, 14, 45, 49 • Automated ReportLab PDFs, CSV Exports & Forensics</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mission code, platform..."
            className="pl-9 pr-3 py-1.5 rounded-xl bg-[#020b14] border border-cyan-900 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Surveys List with Export Buttons */}
      <div className="rounded-2xl bg-[#041527] border border-cyan-900/40 p-5 space-y-4">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          Searchable Survey Records ({filteredSurveys.length})
        </h3>

        <div className="space-y-3">
          {filteredSurveys.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-xl bg-[#020b14] border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs"
            >
              <div>
                <div className="text-sm font-bold text-white">{s.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  {s.survey_code} • {s.platform} • {s.sensor_model}
                </div>
                <div className="text-[10px] text-cyan-400 mt-1 font-mono">
                  Coords: {s.latitude?.toFixed(3)}°N, {s.longitude?.toFixed(3)}°E • Depth: {s.water_depth_meters}m
                </div>
              </div>

              {/* One-Click Export Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport(s.id, 'pdf')}
                  disabled={downloading === `${s.id}-pdf`}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-glow-cyan"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Report</span>
                </button>

                <button
                  onClick={() => handleExport(s.id, 'csv')}
                  disabled={downloading === `${s.id}-csv`}
                  className="px-3 py-1.5 rounded-xl bg-[#031322] hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CSV</span>
                </button>

                <button
                  onClick={() => handleExport(s.id, 'json')}
                  disabled={downloading === `${s.id}-json`}
                  className="px-3 py-1.5 rounded-xl bg-[#031322] hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>JSON</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capability 45: Activity & Audit Trail */}
      <div className="rounded-2xl bg-[#041527] border border-cyan-900/40 p-5 space-y-4">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          Capability 45: Activity & Cryptographic Audit Center (Forensic Trail)
        </h3>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-[#020b14] border border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {log.action}
                </span>
                <span className="text-slate-300 font-sans text-[11px]">{log.user_email}</span>
                <span className="text-slate-500 text-[10px]">
                  Resource: {log.resource_type} #{log.resource_id}
                </span>
              </div>
              <div className="text-right text-[10px] text-slate-400">
                {log.timestamp?.slice(0, 19)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
