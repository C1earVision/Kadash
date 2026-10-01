// Data Source Connection & File Upload Modal
// Allows connecting external databases via connection string or uploading CSV/Excel sheets.

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  Database,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Server
} from "lucide-react";
import { AI_API_URL } from "../config/api";

export default function DataSourceModal({ isOpen, onClose, activeSource, onSelectSource }) {
  const [tab, setTab] = useState("connect");
  const [connString, setConnString] = useState("");
  const [customName, setCustomName] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeSources, setActiveSources] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchActiveSources();
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const fetchActiveSources = async () => {
    try {
      const res = await axios.get(`${AI_API_URL}/data-sources/active`);
      if (res.data?.data_sources) {
        setActiveSources(res.data.data_sources);
      }
    } catch (err) {
      console.error("Failed to fetch active data sources:", err);
    }
  };

  const handleConnectDb = async (e) => {
    e.preventDefault();
    if (!connString.trim()) {
      setError("Please provide a valid database connection string.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await axios.post(`${AI_API_URL}/data-sources/connect`, {
        connection_string: connString.trim(),
        custom_name: customName.trim() || undefined,
      });

      if (res.data?.data_source) {
        const newSource = res.data.data_source;
        setSuccessMsg(`Connected successfully! Discovered ${newSource.tables.length} table(s).`);
        onSelectSource(newSource);
        fetchActiveSources();
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to connect to the database. Verify host, port, and credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setError(null);
    }
  };

  const handleUploadFiles = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Please select at least one CSV or Excel file to upload.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const res = await axios.post(`${AI_API_URL}/data-sources/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.data_source) {
        const newSource = res.data.data_source;
        setSuccessMsg(`Dataset prepared! Discovered ${newSource.tables.length} table(s).`);
        onSelectSource(newSource);
        fetchActiveSources();
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to process files. Please verify the file formats.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-[#151820] border border-[#272B35] rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#272B35] bg-[#111319]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Database size={16} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#F3F4F6]">Connect Business Data</h2>
              <p className="text-[12px] text-[#9CA3AF]">Query any database or analyze uploaded CSV/Excel files</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9CA3AF] hover:text-[#F3F4F6] rounded-md hover:bg-[#1E2230] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#272B35] px-6 bg-[#13161F]">
          <button
            onClick={() => { setTab("connect"); setError(null); }}
            className={`py-2.5 px-3 text-[13px] font-medium border-b-2 transition-all flex items-center gap-2 ${
              tab === "connect"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
            }`}
          >
            <Server size={14} />
            Database Connection
          </button>
          <button
            onClick={() => { setTab("upload"); setError(null); }}
            className={`py-2.5 px-3 text-[13px] font-medium border-b-2 transition-all flex items-center gap-2 ${
              tab === "upload"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
            }`}
          >
            <Upload size={14} />
            Upload CSV / Excel
          </button>
          <button
            onClick={() => { setTab("active"); setError(null); fetchActiveSources(); }}
            className={`py-2.5 px-3 text-[13px] font-medium border-b-2 transition-all flex items-center gap-2 ${
              tab === "active"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
            }`}
          >
            <Layers size={14} />
            Active Sources ({activeSources.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[12.5px] flex items-start gap-2.5">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[12.5px] flex items-start gap-2.5">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Connect Database */}
          {tab === "connect" && (
            <form onSubmit={handleConnectDb} className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-medium text-[#D1D5DB] mb-1.5">
                  Connection URI
                </label>
                <input
                  type="text"
                  placeholder="e.g. postgresql://user:password@host:5432/dbname"
                  value={connString}
                  onChange={(e) => setConnString(e.target.value)}
                  className="w-full px-3.5 py-2 text-[13px] bg-[#0F1117] border border-[#272B35] rounded-md text-[#F3F4F6] placeholder-[#4B5563] focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
                <p className="text-[11.5px] text-[#6B7280] mt-1">
                  Supports PostgreSQL, MySQL, SQLite, and SQL Server.
                </p>
              </div>

              <div>
                <label className="block text-[12.5px] font-medium text-[#D1D5DB] mb-1.5">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Production Analytics DB"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2 text-[13px] bg-[#0F1117] border border-[#272B35] rounded-md text-[#F3F4F6] placeholder-[#4B5563] focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !connString.trim()}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[13px] font-medium rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Verifying & Connecting…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Connect Database</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Upload Files */}
          {tab === "upload" && (
            <form onSubmit={handleUploadFiles} className="space-y-4">
              <div className="border-2 border-dashed border-[#272B35] hover:border-blue-500/50 rounded-xl p-6 text-center bg-[#0F1117]/50 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                    <FileSpreadsheet size={24} />
                  </div>
                  <span className="text-[13.5px] font-medium text-[#F3F4F6] mb-1">
                    Choose CSV or Excel sheets
                  </span>
                  <span className="text-[12px] text-[#6B7280]">
                    Drop .csv, .xlsx, or .xls files here
                  </span>
                </label>
              </div>

              {files.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 rounded bg-[#111319] border border-[#272B35] text-[12px]"
                    >
                      <span className="text-[#D1D5DB] truncate">{file.name}</span>
                      <span className="text-[#6B7280]">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || files.length === 0}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[13px] font-medium rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Ingesting into Analytics Engine…</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Upload & Ingest Dataset</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Active Sources */}
          {tab === "active" && (
            <div className="space-y-2.5">
              {activeSources.length === 0 ? (
                <p className="text-[13px] text-[#6B7280] text-center py-6">
                  No custom data sources registered yet.
                </p>
              ) : (
                activeSources.map((source) => {
                  const isSelected = (activeSource?.source_id || "default") === source.source_id;
                  return (
                    <div
                      key={source.source_id}
                      onClick={() => {
                        onSelectSource(source);
                        onClose();
                      }}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-blue-600/10 border-blue-500/50"
                          : "bg-[#111319] border-[#272B35] hover:border-[#3E4352]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            source.type === "file"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {source.type === "file" ? <FileSpreadsheet size={16} /> : <Database size={16} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13.5px] font-medium text-[#F3F4F6]">{source.name}</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-[#6B7280] mt-0.5">
                            {source.tables.length} table(s): {source.tables.slice(0, 3).join(", ")}
                            {source.tables.length > 3 ? "..." : ""}
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-[#6B7280]" />
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
