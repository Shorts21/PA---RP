
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as LucideIcons from 'lucide-react';
import { 
  ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip
} from 'recharts';

const { 
  AlertCircle, 
  ShieldAlert, 
  BrainCircuit, 
  FileText, 
  RefreshCw,
  Users,
  Target,
  Database,
  FileSpreadsheet,
  ShieldCheck,
  Zap,
  Info,
  CloudUpload,
  DatabaseZap,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Settings,
  Terminal,
  Server,
  Key,
  MapPin,
  Briefcase,
  TrendingDown,
  Layers,
  TrendingUp,
  Menu,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  DatabaseIcon
} = LucideIcons;

// --- Configurações Iniciais ---
const DEFAULT_URL = 'https://gnqjypsvmoxgifgjtfbo.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImducWp5cHN2bW94Z2lmZ2p0ZmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MzA3NTMsImV4cCI6MjA4NTIwNjc1M30.0gMqkCyjCPa7iGzA_qZem_NyTW09XrIibuhKV8Mkz9g';

const RISK_FACTORS = [
  { id: 'R1', name: 'Sobrecarga', questions: ['Q1', 'Q2'], inverse: [], icon: 'Zap' },
  { id: 'R2', name: 'Subcarga', questions: ['Q3', 'Q4'], inverse: ['Q3'], icon: 'TrendingDown' },
  { id: 'R3', name: 'Autonomia', questions: ['Q5', 'Q6'], inverse: ['Q5', 'Q6'], icon: 'Target' },
  { id: 'R4', name: 'Clareza de Papel', questions: ['Q7', 'Q8'], inverse: ['Q7', 'Q8'], icon: 'Info' },
  { id: 'R5', name: 'Suporte Liderança', questions: ['Q9', 'Q10'], inverse: ['Q9', 'Q10'], icon: 'Users' },
  { id: 'R6', name: 'Recompensas', questions: ['Q11', 'Q12'], inverse: ['Q11', 'Q12'], icon: 'TrendingUp' },
  { id: 'R7', name: 'Justiça Organ.', questions: ['Q13', 'Q14'], inverse: ['Q13', 'Q14'], icon: 'ShieldCheck' },
  { id: 'R8', name: 'Gestão Mudanças', questions: ['Q15', 'Q16'], inverse: ['Q15', 'Q16'], icon: 'RefreshCw' },
  { id: 'R9', name: 'Relacionamentos', questions: ['Q17', 'Q18'], inverse: ['Q17', 'Q18'], icon: 'Users' },
  { id: 'R10', name: 'Assédio / Respeito', questions: ['Q19', 'Q20'], inverse: [], critical: true, icon: 'ShieldAlert' },
  { id: 'R11', name: 'Eventos Violentos', questions: ['Q21', 'Q22'], inverse: [], critical: true, icon: 'AlertCircle' },
  { id: 'R12', name: 'Comunicação', questions: ['Q23', 'Q24'], inverse: ['Q23', 'Q24'], icon: 'FileText' },
  { id: 'R13', name: 'Isolamento Social', questions: ['Q25', 'Q26'], inverse: [], icon: 'Layers' }
];

const SYSTEM_INSTRUCTION = `Você é o "People Analytics Expert", consultor sênior em saúde ocupacional. Analise os KPIs e forneça um diagnóstico executivo focado em prevenção e ISO 45003. Use Markdown para formatar.`;

const RiskCard = ({ r }: any) => {
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({
    transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
  });

  const getStatus = (score) => {
    if (score >= 4.0) return { label: 'CRÍTICO', color: 'text-red-600', fill: 'bg-red-500', iconBg: 'bg-red-100', dot: 'bg-red-500', border: 'border-red-200', hoverBorder: 'hover:border-red-400' };
    if (score >= 2.5) return { label: 'ALERTA', color: 'text-amber-600', fill: 'bg-amber-500', iconBg: 'bg-amber-100', dot: 'bg-amber-500', border: 'border-amber-200', hoverBorder: 'hover:border-amber-400' };
    return { label: 'ESTÁVEL', color: 'text-emerald-600', fill: 'bg-emerald-500', iconBg: 'bg-emerald-100', dot: 'bg-emerald-500', border: 'border-emerald-200', hoverBorder: 'hover:border-emerald-400' };
  };

  const status = getStatus(r.score);
  // @ts-ignore
  const DynamicIcon = LucideIcons[r.icon] || LucideIcons.Zap;

  const handleMouseMove = (e) => {
    if (!cardRef.current || window.innerWidth < 1024) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -10;
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 10;
    setTiltStyle({ 
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
      zIndex: 10,
      transition: 'transform 0.1s ease-out'
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({ 
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)', 
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      zIndex: 1,
      transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)' 
    });
  };

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={tiltStyle}
      className={`bg-white p-6 sm:p-7 rounded-[2rem] border ${status.border} ${status.hoverBorder} flex flex-col justify-between h-full relative overflow-hidden transition-all duration-500 shadow-sm min-h-[260px]`}>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-sm ${status.iconBg} ${status.color}`}>
               <DynamicIcon size={20} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{r.id}</p>
              <h4 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight tracking-tight">{r.name}</h4>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest ${status.fill} text-white shadow-md`}>
            {status.label}
          </div>
        </div>
        
        <div className="flex flex-col mb-5">
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-1">Nível de Exposição</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl sm:text-5xl font-bold ${status.color} tabular-nums tracking-tighter leading-none`}>
              {r.score.toFixed(2)}
            </span>
            <span className="text-slate-300 font-medium text-xs">/ 5.00</span>
          </div>
        </div>

        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4 shadow-inner">
          <div className={`h-full transition-all duration-1000 ease-out rounded-full ${status.fill}`} style={{ width: `${(r.score / 5) * 100}%` }} />
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1.5 relative z-10">
        {r.questions.map((q) => (
          <span key={q} className="text-[8px] sm:text-[9px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-100 uppercase tracking-wider">
            {q}
          </span>
        ))}
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="bg-white p-6 sm:p-7 rounded-[2rem] border border-slate-100 flex flex-col justify-between h-full min-h-[260px] animate-pulse">
    <div>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
          <div className="space-y-2">
            <div className="w-10 h-3 bg-slate-100 rounded" />
            <div className="w-24 h-4 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
      <div className="w-20 h-3 bg-slate-100 rounded mb-2" />
      <div className="w-16 h-8 bg-slate-100 rounded mb-6" />
      <div className="w-full h-2.5 bg-slate-50 rounded-full" />
    </div>
    <div className="flex gap-1.5 mt-4">
      <div className="w-8 h-4 bg-slate-50 rounded" />
      <div className="w-8 h-4 bg-slate-50 rounded" />
    </div>
  </div>
);

const App = () => {
  const [dbConfig, setDbConfig] = useState(() => ({
    url: localStorage.getItem('ps_supabase_url') || DEFAULT_URL,
    key: localStorage.getItem('ps_supabase_key') || DEFAULT_KEY
  }));
  
  const [allRecords, setAllRecords] = useState([]);
  const [report, setReport] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({ company: 'Todas', sector: 'Todos', city: 'Todas', role: 'Todos' });
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [dbStatus, setDbStatus] = useState('loading');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const supabase = useMemo(() => createClient(dbConfig.url, dbConfig.key), [dbConfig]);

  useEffect(() => { fetchDataFromSupabase(); }, [supabase]);

  const fetchDataFromSupabase = async () => {
    setIsLoadingDB(true);
    setDbStatus('loading');
    try {
      const { data, error: sbError } = await supabase.from('psychosocial_assessments').select('*').order('created_at', { ascending: false });
      if (sbError) throw sbError;
      setAllRecords(data || []);
      setDbStatus('online');
      setError(null);
    } catch (err) { 
      setDbStatus('error');
      setError("Erro de Autenticação. Verifique as chaves.");
    } finally { 
      setIsLoadingDB(false); 
    }
  };

  const handleConfigSave = (newUrl, newKey) => {
    localStorage.setItem('ps_supabase_url', newUrl);
    localStorage.setItem('ps_supabase_key', newKey);
    setDbConfig({ url: newUrl, key: newKey });
    setShowConfigModal(false);
    setSuccessMsg("Configurações atualizadas!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const syncToSupabase = async (workbook) => {
    setIsSyncing(true);
    setError(null);
    try {
      let allPayloads = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rawRows.length < 2) continue;
        const headers = rawRows[0].map(h => String(h || '').trim().toUpperCase());
        // Fix: Removed unused and buggy findIdx function that was using undefined variable 'k' (previously on line 237-241)
        const findIdxKey = (keys) => headers.findIndex(h => keys.some(k => h.includes(k)));
        const idxCompany = findIdxKey(['EMPRESA', 'CLIENTE', 'NOME']);
        const idxSector = findIdxKey(['SETOR', 'UNIDADE', 'ÁREA']);
        const idxCity = findIdxKey(['CIDADE', 'LOCAL', 'UF']);
        const idxRole = findIdxKey(['CARGO', 'FUNÇÃO', 'ATIVIDADE']);
        const idxQuestions = {};
        for (let i = 1; i <= 26; i++) { idxQuestions[`q${i}`] = headers.findIndex(h => h.startsWith(`${i}.`) || h.startsWith(`${i}-`) || h.startsWith(`${i} `)); }
        const sheetPayload = rawRows.slice(1).filter(row => row.some(cell => cell !== null && cell !== '')).map(row => {
          const item = { assessment_date: new Date().toISOString(), company: String(row[idxCompany] || 'N/A').trim(), sector: String(row[idxSector] || 'N/A').trim(), city: String(row[idxCity] || 'N/A').trim(), role: String(row[idxRole] || 'N/A').trim() };
          for (let i = 1; i <= 26; i++) { const val = row[idxQuestions[`q${i}`]]; const match = String(val || '').match(/(\d)/); item[`q${i}`] = match ? parseInt(match[1]) : 3; }
          return item;
        });
        allPayloads = [...allPayloads, ...sheetPayload];
      }
      if (allPayloads.length === 0) throw new Error("Nenhum dado válido encontrado.");
      const { error: sbError } = await supabase.from('psychosocial_assessments').insert(allPayloads);
      if (sbError) throw sbError;
      setSuccessMsg(`${allPayloads.length} sincronizados!`);
      fetchDataFromSupabase();
    } catch (err: any) { setError("Erro: " + err.message); } finally { setIsSyncing(false); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      syncToSupabase(workbook);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const getAIAssistantReport = async () => {
    if (!filteredMetrics) return;
    setIsProcessingAI(true);
    setReport('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Gere um parecer técnico para ${filteredMetrics.respondents} respondentes. Índice de Saúde: ${filteredMetrics.healthIndex}%. Fatores Críticos: ${filteredMetrics.riskScores.filter(r => r.score >= 4.0).map(r => r.name).join(', ') || 'Nenhum'}. Filtros: Empresa ${selectedFilters.company}, Setor ${selectedFilters.sector}.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { systemInstruction: SYSTEM_INSTRUCTION } });
      setReport(response.text || 'Erro no processamento da IA.');
    } catch (err: any) { setError("Erro IA: " + err.message); } finally { setIsProcessingAI(false); }
  };

  const filteredMetrics = useMemo(() => {
    let recs = allRecords;
    const normalizeCompare = (val) => String(val || '').trim().toUpperCase();
    if (selectedFilters.company !== 'Todas') recs = recs.filter(r => normalizeCompare(r.company) === normalizeCompare(selectedFilters.company));
    if (selectedFilters.sector !== 'Todos') recs = recs.filter(r => normalizeCompare(r.sector) === normalizeCompare(selectedFilters.sector));
    if (selectedFilters.city !== 'Todas') recs = recs.filter(r => normalizeCompare(r.city) === normalizeCompare(selectedFilters.city));
    if (selectedFilters.role !== 'Todos') recs = recs.filter(r => normalizeCompare(r.role) === normalizeCompare(selectedFilters.role));
    if (recs.length === 0) return null;
    const riskScores = RISK_FACTORS.map(factor => {
      let sum = 0, count = 0;
      recs.forEach(r => { factor.questions.forEach(q => { let v = r[q.toLowerCase()]; if (v !== undefined && v !== null) { if (factor.inverse?.includes(q)) v = 6 - v; sum += v; count++; } }); });
      return { ...factor, score: parseFloat((sum / (count || 1)).toFixed(2)) };
    });
    const avgRiskGlobal = riskScores.reduce((acc, r) => acc + r.score, 0) / riskScores.length;
    const healthIndex = Math.max(0, Math.min(100, Math.round(100 - ((avgRiskGlobal - 1) / 4 * 100))));
    return { riskScores, respondents: recs.length, healthIndex };
  }, [allRecords, selectedFilters]);

  const filterOptions = useMemo(() => {
    const getUnique = (key) => Array.from(new Set(allRecords.map(r => String(r[key] || '').trim()).filter(v => v && v !== 'N/A'))).sort();
    return { companies: getUnique('company'), sectors: getUnique('sector'), cities: getUnique('city'), roles: getUnique('role') };
  }, [allRecords]);

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6 sm:p-10 space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-3"><Settings className="text-indigo-600" /> Configuração</h2>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 p-2">✕</button>
            </div>
            <div className="space-y-4">
              <input type="text" id="cfg_url" placeholder="URL Supabase" defaultValue={dbConfig.url} className="w-full bg-slate-50 border rounded-xl p-3 text-xs font-bold outline-none" />
              <textarea id="cfg_key" placeholder="Anon Key" defaultValue={dbConfig.key} className="w-full bg-slate-50 border rounded-xl p-3 text-[10px] font-mono outline-none h-24 resize-none" />
            </div>
            <button onClick={() => { const u = (document.getElementById('cfg_url') as HTMLInputElement).value; const k = (document.getElementById('cfg_key') as HTMLTextAreaElement).value; handleConfigSave(u, k); }} className="w-full bg-indigo-600 text-white min-h-[50px] rounded-2xl font-black uppercase text-xs shadow-lg">Salvar Conexão</button>
          </div>
        </div>
      )}

      {/* Navegação Superior - Altura Fixa */}
      <nav className="h-[120px] lg:h-[80px] bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center flex-shrink-0 z-[100] shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 w-full max-w-[1700px] mx-auto">
          <div className="flex w-full lg:w-auto items-center justify-between lg:justify-start gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden lg:flex p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-all">
                {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
              </button>
              
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden bg-indigo-600 p-2.5 rounded-xl shadow-lg text-white active:scale-95 transition-all">
                <Menu size={20} />
              </button>

              <div className="hidden lg:flex bg-indigo-600 p-2 rounded-xl shadow-lg"><BrainCircuit size={20} className="text-white" /></div>
              
              <div className="min-w-0">
                <h1 className="font-black text-sm lg:text-base tracking-tight uppercase leading-none mb-1 truncate">People Analytics <span className="text-indigo-600">Riscos Psicossociais</span></h1>
                <div className="flex items-center gap-2">
                   <div className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                   <span className="text-[8px] font-black uppercase text-slate-400">{dbStatus === 'online' ? 'Conectado' : 'Offline'}</span>
                </div>
              </div>
            </div>
            
            <button onClick={getAIAssistantReport} disabled={isProcessingAI || !filteredMetrics} className="lg:hidden bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg">
              {isProcessingAI ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-start lg:justify-end">
            {['company', 'sector', 'city', 'role'].map((key) => (
              <select key={key} value={selectedFilters[key]} onChange={e => setSelectedFilters(prev => ({ ...prev, [key]: e.target.value }))} className="flex-1 lg:flex-none min-w-[100px] pl-2 pr-2 py-2 bg-slate-50 text-[9px] font-black uppercase rounded-xl border border-slate-200 outline-none appearance-none">
                <option value={key === 'company' ? 'Todas' : 'Todos'}>{(key === 'company' ? 'Empresa' : key === 'sector' ? 'Setor' : key === 'city' ? 'Cidade' : 'Cargo').toUpperCase()}</option>
                {filterOptions[key === 'company' ? 'companies' : key === 'sector' ? 'sectors' : key === 'city' ? 'cities' : 'roles']?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ))}
            <button onClick={getAIAssistantReport} disabled={isProcessingAI || !filteredMetrics} className="hidden lg:flex bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase items-center gap-2 shadow-lg">
              {isProcessingAI ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />} Análise IA
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[140] lg:hidden transition-opacity duration-300" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Sidebar / Drawer - Largura fixa quando aberta para evitar reflow */}
        <aside className={`
          fixed inset-y-0 right-0 lg:left-0 lg:right-auto z-[150] lg:z-40
          bg-white border-l lg:border-l-0 lg:border-r border-slate-200 flex flex-col h-full
          transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          ${isSidebarOpen 
            ? 'w-[85%] max-w-[320px] lg:w-[280px] translate-x-0' 
            : 'translate-x-full lg:translate-x-0 w-0 lg:w-[80px]'
          }
        `}>
          <div className={`p-6 flex flex-col h-full ${!isSidebarOpen && 'lg:items-center'}`}>
            <div className="flex justify-between items-center mb-10 lg:hidden">
              <h3 className="font-black text-[10px] uppercase text-slate-400">Dados</h3>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400"><X size={20} /></button>
            </div>

            <div className="space-y-8 flex flex-col flex-1 overflow-y-auto custom-scrollbar pr-1">
              <div className="space-y-4">
                <div className={`flex items-center gap-3 text-indigo-600 ${!isSidebarOpen && 'lg:justify-center'}`}>
                  <DatabaseZap size={24} />
                  {isSidebarOpen && <h2 className="text-[11px] font-black uppercase tracking-widest">Fontes</h2>}
                </div>
                <label className={`border-2 border-dashed border-slate-200 rounded-[1.5rem] p-6 flex flex-col items-center cursor-pointer hover:bg-indigo-50 transition-all ${!isSidebarOpen && 'lg:p-2 lg:rounded-xl'}`}>
                  <CloudUpload size={isSidebarOpen ? 32 : 24} className="text-slate-300 mb-2" />
                  {isSidebarOpen && <span className="text-[10px] font-black text-slate-600 uppercase">Importar</span>}
                  <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} />
                </label>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={fetchDataFromSupabase} title="Sincronizar" className={`min-h-[48px] bg-slate-50 border rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 px-4 active:scale-95 transition-all ${!isSidebarOpen && 'lg:p-0 lg:w-12 lg:h-12 lg:justify-center'}`}>
                  <RefreshCw size={20} /> {isSidebarOpen && <span>Sincronizar</span>}
                </button>
                <button onClick={() => setShowConfigModal(true)} title="Ajustes" className={`min-h-[48px] bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 px-4 active:scale-95 transition-all ${!isSidebarOpen && 'lg:p-0 lg:w-12 lg:h-12 lg:justify-center'}`}>
                  <Settings size={20} /> {isSidebarOpen && <span>Ajustes</span>}
                </button>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t flex flex-col">
               <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${dbStatus === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {isSidebarOpen && <p className="text-[8px] font-black uppercase text-slate-400">DB: {dbStatus.toUpperCase()}</p>}
               </div>
            </div>
          </div>
        </aside>

        {/* Área Principal - Scroll Independente e Altura Total */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 relative h-full">
          <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-[1700px] mx-auto w-full space-y-8 min-h-full flex flex-col">
            {isLoadingDB ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="h-[140px] bg-white rounded-[2rem] border border-slate-100 animate-pulse" />
                  <div className="h-[140px] bg-white rounded-[2rem] border border-slate-100 animate-pulse" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              </div>
            ) : !filteredMetrics ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[500px]">
                <FileSpreadsheet size={64} className="mb-6 opacity-10" />
                <p className="font-black uppercase tracking-widest text-xs text-center px-8">Sem dados para exibição.<br/>Aplique filtros ou importe planilhas.</p>
              </div>
            ) : (
              <div className="animate-in fade-in duration-700 space-y-8 pb-20 flex-1">
                {/* Dashboard Superior - Apenas Indicadores Principais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 flex-shrink-0">
                  <div className="bg-white p-6 rounded-[2rem] shadow-xl border-t-8 border-indigo-500 min-h-[140px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Amostra</p>
                    <div className="flex items-end gap-2">
                       <h3 className="text-3xl sm:text-5xl font-black text-slate-800 tracking-tighter leading-none">{filteredMetrics.respondents}</h3>
                       <span className="text-[9px] font-black text-indigo-500 uppercase mb-1">Pessoas</span>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] shadow-xl border-t-8 border-emerald-500 min-h-[140px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Saúde Geral</p>
                    <div className="text-3xl sm:text-4xl font-black text-emerald-600 leading-none">{filteredMetrics.healthIndex}%</div>
                    <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${filteredMetrics.healthIndex}%` }} />
                    </div>
                  </div>
                </div>

                {/* Grid de Riscos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                   {filteredMetrics.riskScores.map(r => ( <RiskCard key={r.id} r={r} /> ))}
                </div>

                {/* Matriz Radar com Altura Fixa */}
                <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 h-[500px] lg:h-[600px] relative overflow-hidden flex-shrink-0">
                  <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-12 flex items-center gap-3"><Target size={20} className="text-indigo-500" /> Matriz Radar Psicossocial</h3>
                  <div className="w-full h-full -mt-10">
                    <ResponsiveContainer width="100%" height="90%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={filteredMetrics.riskScores}>
                          <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                          <PolarAngleAxis dataKey="id" tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                          <Radar name="Pontuação" dataKey="score" stroke="#4f46e5" strokeWidth={4} fill="#6366f1" fillOpacity={0.4} />
                          <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 30px -5px rgba(0,0,0,0.15)', fontSize: '11px', fontWeight: '900' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
            
            <footer className="py-8 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest border-t flex flex-col md:flex-row justify-between items-center w-full gap-4 mt-auto">
               <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-emerald-500" /> People Analytics - Riscos Psicossociais</div>
               <div className="bg-slate-100 px-3 py-1.5 rounded-full">ISO 45003 COMPLIANT</div>
            </footer>
          </div>
        </main>
      </div>

      {successMsg && (
        <div className="fixed bottom-8 right-8 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 z-[300]">
           <CheckCircle2 size={24} /> <p className="text-xs font-black uppercase">{successMsg}</p>
        </div>
      )}
      {error && (
        <div className="fixed bottom-8 right-8 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 z-[300]">
           <AlertCircle size={24} /> <p className="text-xs font-black uppercase">{error}</p>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
