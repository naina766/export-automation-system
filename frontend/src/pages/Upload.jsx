import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight,
  Database,
  FileSpreadsheet
} from 'lucide-react';
import apiService from '../services/api';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';

export const Upload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isDragOver, setIsDragOver] = useState(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await apiService.getLeads();
      setLeads(res.leads || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setNotification({ type: 'error', message: 'Please select a valid .csv file.' });
      return;
    }

    try {
      setUploading(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.uploadCSV(file);
      setStats(res.stats);
      setLeads(res.leads || []);
      setNotification({
        type: 'success',
        message: `Successfully uploaded ${res.stats?.total_records || 0} leads (${res.stats?.valid_records || 0} valid emails, ${res.stats?.duplicates_removed || 0} duplicates removed).`
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to process CSV upload.'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLoadDemo = async () => {
    try {
      setUploading(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.loadDemoData();
      setStats(res.stats);
      setLeads(res.leads || []);
      setNotification({
        type: 'success',
        message: `Successfully loaded sample demo buyers (${res.stats?.valid_records} valid emails, ${res.stats?.duplicates_removed} duplicates detected).`
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to load demo dataset.'
      });
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    {
      header: '#',
      render: (_, idx) => <span className="text-slate-400 text-xs font-mono">{idx + 1}</span>,
    },
    {
      header: 'Buyer Name',
      accessor: 'name',
      render: (row) => <span className="font-semibold text-white">{row.name || '—'}</span>,
    },
    {
      header: 'Company Name',
      accessor: 'company',
      render: (row) => <span className="text-slate-300">{row.company || '—'}</span>,
    },
    {
      header: 'Email Address',
      accessor: 'email',
      render: (row) => (
        <code className="text-xs text-blue-300 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/50">
          {row.email || '(Missing)'}
        </code>
      ),
    },
    {
      header: 'Country',
      accessor: 'country',
      render: (row) => <span className="text-slate-300">{row.country || '—'}</span>,
    },
    {
      header: 'Source',
      accessor: 'source',
      render: (row) => <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">{row.source || 'Direct'}</span>,
    },
    {
      header: 'Email Status',
      accessor: 'email_status',
      render: (row) => <StatusBadge status={row.email_status} />,
    },
    {
      header: 'Deduplication',
      render: (row) => {
        if (row.is_duplicate === 'True' || row.is_duplicate === true) {
          return <StatusBadge status="invalid" text="Duplicate" />;
        }
        if (row.already_contacted === 'True' || row.already_contacted === true) {
          return <StatusBadge status="missing" text="Already Contacted" />;
        }
        return <StatusBadge status="valid" text="Ready" />;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Dropzone */}
        <div className="lg:col-span-7 bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-white mb-1">📥 Ingest Buyer Leads CSV</h2>
          <p className="text-xs text-slate-400 mb-4">
            Upload custom CSV files or load fictional Himalayan Singing Bowls leads.
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
              ${isDragOver 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-[#222f4c] bg-[#0b0f19]/50 hover:border-slate-500 hover:bg-[#0b0f19]'}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">
              Drag and drop your CSV file here, or <span className="text-blue-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-400">Accepts standard .csv format with name, company, email, country</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#222f4c]">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              Browse Files (.csv)
            </button>

            <button
              onClick={handleLoadDemo}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>⚡ Load Demo Buyers Dataset</span>
            </button>
          </div>
        </div>

        {/* Schema & Batch Summary */}
        <div className="lg:col-span-5 bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-1">📋 Accepted CSV Schema</h2>
            <p className="text-xs text-slate-400 mb-3">The extractor auto-normalizes column headers & aliases:</p>
            
            <div className="bg-[#0b0f19] p-3 rounded-lg border border-[#222f4c] font-mono text-[11px] text-blue-300 space-y-1">
              <div>name, company, email, website, country, source</div>
              <div className="text-slate-400">Sarah Miller, Himalayan Wellness, sarah@hw.example, USA, Google</div>
            </div>

            {stats && (
              <div className="mt-4 p-4 rounded-xl bg-[#0b0f19] border border-[#222f4c] space-y-2 text-xs">
                <div className="font-bold text-white mb-1">Batch Ingestion Metrics:</div>
                <div className="flex justify-between text-slate-300">
                  <span>Total Ingested:</span>
                  <b className="text-white">{stats.total_records}</b>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Valid Syntax Emails:</span>
                  <b className="text-emerald-400">{stats.valid_records}</b>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Invalid / Missing:</span>
                  <b className="text-rose-400">{stats.invalid_records}</b>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Duplicate Records:</span>
                  <b className="text-amber-400">{stats.duplicates_removed}</b>
                </div>
              </div>
            )}
          </div>

          {leads.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#222f4c]">
              <button
                onClick={() => navigate('/classify')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md"
              >
                <span>Proceed to AI Classification</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white">👥 Current Lead Store (data/buyers.csv)</h2>
            <p className="text-xs text-slate-400">{leads.length} total imported contacts</p>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Fetching lead records..." />
        ) : (
          <DataTable
            columns={columns}
            data={leads}
            emptyMessage="No buyer leads in store. Upload a CSV file or load sample demo data."
          />
        )}
      </div>
    </div>
  );
};

export default Upload;
