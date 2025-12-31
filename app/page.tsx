"use client";
import { UserButton, SignInButton, SignedIn, SignedOut, useUser, useClerk } from "@clerk/nextjs";
import { useState, useEffect, useRef } from 'react';
import { Crosshair, Globe, ArrowRight, Zap, ShieldAlert, Radio, ScanEye, UserCircle, Save, FileText, UploadCloud, MapPin, Clock, PenTool, Copy, X, Mail, Briefcase, ChevronDown, CheckCircle, Trophy, Ban, RefreshCw, BrainCircuit, Target, Terminal, Flame } from 'lucide-react';

// --- VISUALS: CSS ANIMATIONS ---
const GLOBAL_STYLES = `
  @keyframes grid-scroll {
    0% { background-position: 0 0; }
    100% { background-position: 40px 40px; }
  }
  @keyframes scanline {
    0% { top: -50%; opacity: 0; }
    50% { opacity: 1; }
    100% { top: 150%; opacity: 0; }
  }
  @keyframes thunder-flash {
    0%, 90%, 100% { opacity: 0; }
    92% { opacity: 0.1; }
    93% { opacity: 0; }
    94% { opacity: 0.2; }
    96% { opacity: 0; }
  }
  .animate-grid {
    animation: grid-scroll 4s linear infinite;
  }
  .scanline-1 { animation: scanline 8s linear infinite; }
  .scanline-2 { animation: scanline 12s linear infinite 2s; }
  .scanline-3 { animation: scanline 5s linear infinite 4s; }
  
  .glass-panel {
    background: rgba(5, 10, 5, 0.6);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(34, 197, 94, 0.15);
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.8);
  }
  .text-glow {
    text-shadow: 0 0 30px rgba(34, 197, 94, 0.6);
  }
  body {
    cursor: crosshair;
  }
  button, a, input {
    cursor: pointer; 
  }
`;

const SUGGESTED_ROLES = [
  "Software Engineer", "Data Scientist", "Product Manager",
  "Registered Nurse", "Biomedical Engineer", "Pharmacist", "Medical Assistant",
  "Farm Manager", "Agricultural Engineer", "Environmental Consultant", "Agronomist",
  "Construction Manager", "Electrician", "Civil Engineer", "Architect",
  "Accountant", "Financial Analyst", "Marketing Manager", "HR Specialist",
  "Graphic Designer", "Chef", "Customer Service Rep", "Content Writer"
];

const SUGGESTED_LOCATIONS = [
  "Remote", 
  "Lagos, Nigeria", "Abuja, Nigeria", "Port Harcourt, Nigeria",
  "Nairobi, Kenya", "Cape Town, South Africa", "Johannesburg, South Africa",
  "Accra, Ghana", "Cairo, Egypt", "Kigali, Rwanda", 
  "London, UK", "New York, USA", "Toronto, Canada", "Dubai, UAE"
];

// --- Types ---
interface Job {
  job_id: string;
  employer_name: string;
  job_title: string;
  job_description: string;
  job_apply_link: string;
  job_city: string;
  job_country: string;
  job_posted_at_datetime_utc: string;
}

interface Analysis {
  matchScore: number;
  keyKeywords: string[];
  warningLog: string;
  attackPlan: string;
}

interface Application extends Job {
  status: 'APPLIED' | 'INTERVIEW' | 'OFFER' | 'REJECTED';
  appliedDate: string;
  notes: string;
  briefing?: InterviewBriefing;
}

interface InterviewBriefing {
  questions: { q: string; why: string; answer: string }[];
  red_flags: string[];
  questions_to_ask_them: string[];
}

export default function Home() {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk(); // Hook to force login modal
  
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeTab, setActiveTab] = useState<'SEARCH' | 'MISSIONS'>('SEARCH');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Batch Analysis State
  const [analyzing, setAnalyzing] = useState<string | null>(null); 
  const [autoAnalyzing, setAutoAnalyzing] = useState(false); 
  
  const [writing, setWriting] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, Analysis>>({});
  const [error, setError] = useState('');

  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const [locSuggestions, setLocSuggestions] = useState<string[]>([]);
  const [showRoleSuggest, setShowRoleSuggest] = useState(false);
  const [showLocSuggest, setShowLocSuggest] = useState(false);

  const [showProfile, setShowProfile] = useState(false);
  const [userResume, setUserResume] = useState('');
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null); 
  
  const [prepping, setPrepping] = useState<string | null>(null);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [currentBriefing, setCurrentBriefing] = useState<InterviewBriefing | null>(null);

  const [applications, setApplications] = useState<Application[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedResume = localStorage.getItem('HEADHUNTER_RESUME');
    if (savedResume) { setUserResume(savedResume); setIsProfileSaved(true); }
    const savedApps = localStorage.getItem('HEADHUNTER_MISSIONS');
    if (savedApps) { setApplications(JSON.parse(savedApps)); }
  }, []);

  const handleRoleChange = (val: string) => {
    setQuery(val);
    if (val.length > 0) {
      setRoleSuggestions(SUGGESTED_ROLES.filter(r => r.toLowerCase().includes(val.toLowerCase())));
      setShowRoleSuggest(true);
    } else setShowRoleSuggest(false);
  };

  const handleLocChange = (val: string) => {
    setLocation(val);
    if (val.length > 0) {
      setLocSuggestions(SUGGESTED_LOCATIONS.filter(l => l.toLowerCase().includes(val.toLowerCase())));
      setShowLocSuggest(true);
    } else setShowLocSuggest(false);
  };

  const selectRole = (val: string) => { setQuery(val); setShowRoleSuggest(false); };
  const selectLoc = (val: string) => { setLocation(val); setShowLocSuggest(false); };

  const saveProfile = () => {
    localStorage.setItem('HEADHUNTER_RESUME', userResume);
    setIsProfileSaved(true);
    setShowProfile(false);
    alert("IDENTITY UPLOADED. AGENT IS NOW SYNCED WITH YOUR SKILLSET.");
  };

  const trackApplication = (job: Job) => {
    if (applications.find(app => app.job_id === job.job_id)) return;
    const newApp: Application = { ...job, status: 'APPLIED', appliedDate: new Date().toLocaleDateString(), notes: 'Auto-tracked via Agent.' };
    const updatedApps = [newApp, ...applications];
    setApplications(updatedApps);
    localStorage.setItem('HEADHUNTER_MISSIONS', JSON.stringify(updatedApps));
  };

  const updateStatus = (jobId: string, newStatus: Application['status']) => {
    const updatedApps = applications.map(app => app.job_id === jobId ? { ...app, status: newStatus } : app);
    setApplications(updatedApps);
    localStorage.setItem('HEADHUNTER_MISSIONS', JSON.stringify(updatedApps));
  };

  const deleteApplication = (jobId: string) => {
    const updatedApps = applications.filter(app => app.job_id !== jobId);
    setApplications(updatedApps);
    localStorage.setItem('HEADHUNTER_MISSIONS', JSON.stringify(updatedApps));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { alert("PLEASE UPLOAD A PDF FILE."); return; }
    setIsReadingFile(true);
    try {
        if (!(window as any).pdfjsLib) {
            const script = document.createElement('script');
            script.src = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.async = true;
            document.body.appendChild(script);
            await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = () => reject(new Error("Failed to load PDF Engine.")); });
        }
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); const textContent = await page.getTextContent(); fullText += textContent.items.map((item: any) => item.str).join(' ') + "\n"; }
        if (fullText.length < 50) throw new Error("PDF scanned but appears empty.");
        setUserResume(prev => prev + "\n\n" + fullText);
        alert("✅ RESUME DECODED SUCCESSFULLY");
    } catch (err: any) { alert("⚠️ BROWSER READ ERROR: " + err.message); } finally { setIsReadingFile(false); }
  };

  // --- ANALYSIS ENGINE ---
  const analyzeTarget = async (jobId: string, description: string) => {
    if (!userResume) return; 
    
    setAnalyzing(jobId);
    try {
      const response = await fetch('/api/analyze', { 
        method: 'POST', 
        body: JSON.stringify({ 
           jobDescription: description, 
           userProfile: userResume, 
           // NOTE: We don't deduct credits here, only on SEARCH to be fair
           type: 'ANALYSIS' 
        }), 
      });
      const data = await response.json();
      setAnalysisResults(prev => ({ ...prev, [jobId]: data }));
    } catch (err) { console.error("Analysis Failed", err); } finally { setAnalyzing(null); }
  };

  const runBatchRecon = async (newJobs: Job[]) => {
    if (!userResume || newJobs.length === 0) return;
    setAutoAnalyzing(true);
    const targets = newJobs.slice(0, 3);
    for (const job of targets) {
        await analyzeTarget(job.job_id, job.job_description);
    }
    setAutoAnalyzing(false);
  };

  // --- MAIN DEPLOY ENGINE (WITH GATES & PAYWALL) ---
  const executeSearch = async (isLoadMore = false) => {
    // 1. GATEKEEPER: Check Login
    if (!isSignedIn) {
      openSignIn(); 
      return;
    }

    if (!query) {
      setError('// TARGET PARAMETERS MISSING');
      return;
    }

    if (isLoadMore) setLoadingMore(true);
    else { setLoading(true); setJobs([]); setPage(1); }
    setError('');
    
    try {
      // 2. CHECK CREDITS (Hit backend before Searching)
      const creditCheck = await fetch('/api/analyze', {
         method: 'POST',
         body: JSON.stringify({ 
             type: 'CREDIT_CHECK', 
             userEmail: user?.primaryEmailAddress?.emailAddress 
         }) 
      });

      if (creditCheck.status === 402) {
         setLoading(false);
         setLoadingMore(false);
         setShowPaywall(true); // <--- SHOW PAYWALL
         return;
      }

      // 3. IF CREDITS OK -> EXECUTE SEARCH
      const RAPID_KEY = process.env.NEXT_PUBLIC_RAPID_API_KEY || '';
      const currentPage = isLoadMore ? page + 1 : 1;
      const fullQuery = location ? `${query} in ${location}` : `${query} Remote`; 
      
      const url = `https://jsearch.p.rapidapi.com/search?query=${fullQuery}&page=${currentPage}&num_pages=1&date_posted=month`;
      const options = { method: 'GET', headers: { 'X-RapidAPI-Key': RAPID_KEY, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' } };
      
      const response = await fetch(url, options);
      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        if (isLoadMore) { 
            setJobs(prev => [...prev, ...result.data]); 
            setPage(currentPage);
        } else { 
            setJobs(result.data);
            runBatchRecon(result.data);
        }
      } else { 
        if (!isLoadMore) setError('// TARGET NOT FOUND: Try expanding your search terms.'); 
      }

    } catch (err) { 
       console.error(err);
       setError('// NETWORK FAILURE: Connection Refused.'); 
    } finally { 
       setLoading(false); 
       setLoadingMore(false); 
    }
  };

  const generateApplication = async (job: Job) => {
    if (!userResume) { alert("⚠️ UPLOAD IDENTITY FIRST."); return; }
    setWriting(job.job_id);
    setSelectedJob(job);
    try {
      const response = await fetch('/api/write-letter', { method: 'POST', body: JSON.stringify({ jobDescription: job.job_description, userProfile: userResume, employerName: job.employer_name }), });
      const data = await response.json();
      setGeneratedLetter(data.letter);
      setShowLetterModal(true);
      trackApplication(job);
    } catch (err) { alert("Writer Uplink Failed"); } finally { setWriting(null); }
  };

  const generateBriefing = async (app: Application) => {
    if (app.briefing) { setCurrentBriefing(app.briefing); setShowBriefingModal(true); return; }
    setPrepping(app.job_id);
    try {
      const response = await fetch('/api/prep-interview', {
        method: 'POST',
        body: JSON.stringify({ jobTitle: app.job_title, employer: app.employer_name, jobDescription: app.job_description, userProfile: userResume }),
      });
      const data = await response.json();
      const updatedApps = applications.map(a => a.job_id === app.job_id ? { ...a, briefing: data } : a);
      setApplications(updatedApps);
      localStorage.setItem('HEADHUNTER_MISSIONS', JSON.stringify(updatedApps));
      setCurrentBriefing(data);
      setShowBriefingModal(true);
    } catch (err) { alert("Simulation Failed"); } finally { setPrepping(null); }
  };

  const handleQuickEmail = () => {
    if (!selectedJob) return;
    const emailMatch = selectedJob.job_description.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
    const recipient = emailMatch ? emailMatch[0] : ""; 
    const subject = encodeURIComponent(`Application for ${selectedJob.job_title} - ${selectedJob.employer_name}`);
    const body = encodeURIComponent(generatedLetter);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-[#020402] text-green-500 font-mono selection:bg-green-500 selection:text-black overflow-x-hidden cursor-crosshair" onClick={() => { setShowRoleSuggest(false); setShowLocSuggest(false); }}>
      {/* --- LOGIN BUTTON OVERLAY START --- */}
      <div className="fixed top-5 right-5 z-50 flex items-center gap-4">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="bg-green-600 hover:bg-green-500 text-black font-bold py-2 px-6 rounded shadow-[0_0_15px_rgba(34,197,94,0.6)] uppercase tracking-widest transition-all hover:scale-105 border border-green-400">
              [ INITIALIZE ACCOUNT ]
            </button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <div className="flex items-center gap-3">
            <span className="text-green-500 text-xs md:text-sm font-mono animate-pulse hidden sm:block">
              ● SYSTEM ONLINE
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </SignedIn>
      </div>
      {/* --- LOGIN BUTTON OVERLAY END --- */}
      <style>{GLOBAL_STYLES}</style>
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-15 animate-grid" style={{ backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute inset-x-0 h-[2px] bg-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.6)] scanline-1 z-0"></div>
        <div className="absolute inset-x-0 h-[1px] bg-green-400/20 shadow-[0_0_10px_rgba(34,197,94,0.4)] scanline-2 z-0"></div>
        <div className="absolute inset-x-0 h-[3px] bg-green-600/10 shadow-[0_0_30px_rgba(34,197,94,0.2)] scanline-3 z-0"></div>
        <div className="absolute inset-0 bg-green-500 pointer-events-none mix-blend-overlay" style={{ animation: 'thunder-flash 15s infinite' }}></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_90%)]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-6">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center py-6 border-b border-green-900/30 mb-12 gap-6 glass-panel rounded-xl px-8 mt-4">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('SEARCH')}>
            <div className="relative">
                <Crosshair className="w-10 h-10 text-green-500 group-hover:rotate-90 transition-transform duration-700" />
                <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            </div>
            <span className="text-4xl font-[900] tracking-[0.2em] text-white italic transform -skew-x-6">
              HEAD<span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-300">HUNTER</span>
            </span>
          </div>
          
          <div className="flex bg-black/40 p-1.5 rounded-lg border border-green-900/50 backdrop-blur-sm">
            <button onClick={() => setActiveTab('SEARCH')} className={`px-6 py-2.5 rounded-md text-sm font-black tracking-wider transition-all flex items-center gap-2 ${activeTab === 'SEARCH' ? 'bg-green-600 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'text-gray-500 hover:text-green-400'}`}><Zap className="w-4 h-4" /> HUNT</button>
            <button onClick={() => setActiveTab('MISSIONS')} className={`px-6 py-2.5 rounded-md text-sm font-black tracking-wider transition-all flex items-center gap-2 ${activeTab === 'MISSIONS' ? 'bg-green-600 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'text-gray-500 hover:text-green-400'}`}><Briefcase className="w-4 h-4" /> MISSIONS <span className="bg-green-900 text-green-400 px-2 rounded text-[10px] ml-1">{applications.length}</span></button>
          </div>

          <button onClick={() => setShowProfile(!showProfile)} className={`flex items-center gap-2 px-5 py-2.5 rounded border-l-2 transition-all font-bold tracking-widest ${isProfileSaved ? 'bg-green-900/10 border-green-500 text-green-400 hover:bg-green-900/20' : 'bg-red-900/10 border-red-500 text-red-500 animate-pulse'}`}>
             <Terminal className="w-4 h-4" /> {isProfileSaved ? 'SYSTEM_ONLINE' : 'IDENTITY_REQUIRED'}
          </button>
        </header>

        {/* --- MODALS (LETTER & BRIEFING) --- */}
        {showLetterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
            <div className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-green-800/50 bg-black/40">
                <h3 className="text-xl font-black text-white flex items-center gap-2 italic"><PenTool className="w-5 h-5 text-green-400" /> GENERATED_PAYLOAD</h3>
                <button onClick={() => setShowLetterModal(false)}><X className="w-6 h-6 hover:text-white transition-colors" /></button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 bg-black/20"><pre className="whitespace-pre-wrap font-sans text-sm text-green-100 leading-7">{generatedLetter}</pre></div>
              <div className="p-5 border-t border-green-800/50 bg-black/40 flex justify-end gap-3 flex-wrap">
                <button onClick={handleQuickEmail} className="bg-green-900/20 border border-green-500 text-green-400 font-bold px-6 py-3 rounded hover:bg-green-500 hover:text-black flex items-center gap-2 transition-all"><Mail className="w-4 h-4" /> LAUNCH MAILER</button>
                <button onClick={() => {navigator.clipboard.writeText(generatedLetter); alert("COPIED TO CLIPBOARD")}} className="bg-green-600 text-black font-bold px-6 py-3 rounded hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center gap-2"><Copy className="w-4 h-4" /> COPY TEXT</button>
              </div>
            </div>
          </div>
        )}

        {showBriefingModal && currentBriefing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">
            <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.15)]">
              <div className="flex justify-between items-center p-6 border-b border-purple-900 bg-black/60">
                <div>
                   <h3 className="text-2xl font-black text-white flex items-center gap-3 italic"><BrainCircuit className="w-8 h-8 text-purple-500" /> TACTICAL BRIEFING</h3>
                   <p className="text-purple-400 text-xs font-mono mt-1 tracking-widest">CONFIDENTIAL // INTERVIEW PREPARATION PROTOCOL</p>
                </div>
                <button onClick={() => setShowBriefingModal(false)}><X className="w-8 h-8 text-gray-500 hover:text-white" /></button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 space-y-8 bg-black/40">
                <div>
                    <h4 className="text-purple-400 font-bold mb-4 uppercase tracking-widest flex items-center gap-2 border-b border-purple-900/50 pb-2"><Target className="w-4 h-4"/> HOSTILE INTERROGATION PREDICTION</h4>
                    <div className="grid gap-4">
                        {currentBriefing.questions.map((q, i) => (
                            <div key={i} className="bg-black/40 border border-purple-900/30 p-5 rounded-lg hover:border-purple-500/50 transition-colors">
                                <div className="text-white font-bold text-lg mb-2">"{q.q}"</div>
                                <div className="text-xs text-gray-500 mb-4 font-mono">// INTENT: {q.why}</div>
                                <div className="pl-4 border-l-2 border-green-500 text-green-200 text-sm leading-relaxed bg-green-900/5 p-3 rounded-r">
                                    <span className="text-green-500 font-bold text-xs uppercase block mb-1">Optimal Response Strategy:</span>{q.answer}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-red-400 font-bold mb-4 uppercase tracking-widest flex items-center gap-2 border-b border-red-900/50 pb-2"><ShieldAlert className="w-4 h-4"/> DETECTED VULNERABILITIES</h4>
                        <ul className="space-y-2">
                            {currentBriefing.red_flags.map((flag, i) => (
                                <li key={i} className="text-gray-300 text-sm bg-red-950/20 border border-red-900/30 p-3 rounded flex items-start gap-3"><span className="text-red-500 mt-1">⚠</span> {flag}</li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-blue-400 font-bold mb-4 uppercase tracking-widest flex items-center gap-2 border-b border-blue-900/50 pb-2"><Zap className="w-4 h-4"/> STRATEGIC INQUIRIES</h4>
                        <ul className="space-y-2">
                            {currentBriefing.questions_to_ask_them.map((q, i) => (
                                <li key={i} className="text-gray-300 text-sm bg-blue-950/20 border border-blue-900/30 p-3 rounded flex items-start gap-3"><span className="text-blue-500 mt-1">?</span> {q}</li>
                            ))}
                        </ul>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showProfile && (
          <div className="mb-12 glass-panel p-8 rounded-xl animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-6 text-white border-b border-green-800/50 pb-4"><FileText className="w-6 h-6 text-green-500" /><h2 className="text-xl font-black uppercase tracking-widest">Agent Identity Matrix</h2></div>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-green-900/50 bg-black/30 hover:border-green-500 hover:bg-green-900/10 transition-all cursor-pointer p-10 mb-6 rounded-lg text-center group">
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
              {isReadingFile ? <div className="flex flex-col items-center gap-3 text-green-400 animate-pulse"><ScanEye className="w-10 h-10 animate-spin" /><span className="font-bold tracking-widest">DECRYPTING FILE STRUCTURE...</span></div> : <div className="flex flex-col items-center gap-3 text-gray-500 group-hover:text-green-400 transition-colors"><UploadCloud className="w-10 h-10" /><span className="font-bold tracking-widest">INITIALIZE UPLINK (CLICK TO UPLOAD RESUME)</span></div>}
            </div>
            <textarea value={userResume} onChange={(e) => setUserResume(e.target.value)} placeholder="RAW DATA STREAM..." className="w-full h-40 bg-black/50 border border-green-900/50 text-green-300 p-5 font-mono text-xs focus:border-green-500 focus:outline-none rounded-lg mb-6" />
            <button onClick={saveProfile} className="w-full py-4 bg-green-600 hover:bg-green-500 text-black font-black uppercase tracking-[0.2em] rounded-lg flex items-center justify-center gap-3 transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]"><Save className="w-5 h-5" /> ENCRYPT & SAVE IDENTITY</button>
          </div>
        )}

        {/* --- VIEW: SEARCH --- */}
        {activeTab === 'SEARCH' && (
          <>
            <div className="text-center mb-16 mt-8">
              <h1 className="text-5xl md:text-8xl font-[900] text-white mb-6 tracking-tighter italic text-glow uppercase transform -skew-x-3">
                IDENTIFY YOUR <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-emerald-300 to-green-600 animate-pulse pr-4">TARGET</span>
              </h1>
              <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto border-l-4 border-green-500 pl-6 text-left font-sans bg-black/40 p-4 rounded-r-lg">
                // <span className="text-green-500 font-bold">SYSTEM READY:</span> The job market is a battlefield. <br/>
                // Deploy the agent to extract high-value opportunities before the masses arrive.
              </p>
            </div>

            <div className="glass-panel p-3 rounded-xl flex flex-col md:flex-row gap-3 relative z-20 mb-12">
               <div className="flex-[2] flex items-center bg-black/60 rounded-lg border border-green-900/30 px-6 group focus-within:border-green-500 transition-colors relative h-16">
                <span className="text-green-500 mr-4 font-bold text-xl">$</span>
                <input type="text" value={query} onChange={(e) => handleRoleChange(e.target.value)} placeholder="ROLE (e.g. Farm Manager)" className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-gray-700 font-bold tracking-wide uppercase" onKeyDown={(e) => e.key === 'Enter' && executeSearch(false)} />
                {showRoleSuggest && (<div className="absolute top-full left-0 right-0 bg-[#0a0a0a] border border-green-800 mt-2 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-50">{roleSuggestions.map(s => (<div key={s} onClick={(e) => { e.stopPropagation(); selectRole(s); }} className="px-6 py-4 text-sm text-gray-300 hover:bg-green-900/30 hover:text-green-400 cursor-pointer border-b border-gray-900 last:border-0 font-bold uppercase">{s}</div>))}</div>)}
              </div>
              <div className="flex-1 flex items-center bg-black/60 rounded-lg border border-green-900/30 px-6 group focus-within:border-green-500 transition-colors relative h-16">
                <MapPin className="text-green-700 mr-3 w-5 h-5" />
                <input type="text" value={location} onChange={(e) => handleLocChange(e.target.value)} placeholder="LOCATION" className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-gray-700 font-bold tracking-wide uppercase" onKeyDown={(e) => e.key === 'Enter' && executeSearch(false)} />
                 {showLocSuggest && (<div className="absolute top-full left-0 right-0 bg-[#0a0a0a] border border-green-800 mt-2 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-50">{locSuggestions.map(s => (<div key={s} onClick={(e) => { e.stopPropagation(); selectLoc(s); }} className="px-6 py-4 text-sm text-gray-300 hover:bg-green-900/30 hover:text-green-400 cursor-pointer border-b border-gray-900 last:border-0 font-bold uppercase">{s}</div>))}</div>)}
              </div>
              <button onClick={() => executeSearch(false)} disabled={loading} className="bg-green-600 hover:bg-green-500 text-black font-black text-lg px-10 h-16 rounded-lg transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group whitespace-nowrap">{loading ? <><Zap className="animate-spin w-6 h-6" /> SCANNING</> : <><ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /> DEPLOY</>}</button>
            </div>

            <div className="mt-12">
               {error && <div className="p-6 bg-red-950/30 border border-red-500 text-red-500 font-mono flex items-center gap-4 rounded-lg animate-pulse"><ShieldAlert className="w-6 h-6" /> {error}</div>}
               
               {/* BATCH ANALYSIS STATUS */}
               {autoAnalyzing && (
                 <div className="mb-8 p-4 bg-green-900/10 border border-green-500/30 rounded-lg flex items-center gap-3 animate-pulse">
                    <Flame className="text-orange-500 w-5 h-5 animate-bounce" />
                    <span className="text-green-400 font-mono text-sm tracking-widest uppercase">Batch Reconnaissance Protocol Active: Auto-Scanning Top Targets...</span>
                 </div>
               )}

               <div className="grid gap-6">
                {jobs.map((job) => (
                  <div key={job.job_id} className="group relative bg-black/40 border border-gray-800 hover:border-green-500 p-8 rounded-xl transition-all duration-300 hover:bg-green-900/10 hover:shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                      <div>
                        <h3 className="text-2xl font-black text-white group-hover:text-green-400 transition-colors uppercase tracking-tight">{job.job_title}</h3>
                        <div className="flex flex-wrap items-center gap-6 text-xs text-gray-500 mt-3 font-mono uppercase tracking-widest">
                          <span className="flex items-center gap-2 text-green-600 font-bold"><Zap className="w-4 h-4" /> {job.employer_name}</span>
                          <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> {job.job_city}, {job.job_country}</span>
                          <span className="flex items-center gap-2 text-yellow-600"><Clock className="w-4 h-4" /> {new Date(job.job_posted_at_datetime_utc).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => analyzeTarget(job.job_id, job.job_description)} disabled={analyzing === job.job_id || !!analysisResults[job.job_id]} className={`px-5 py-2.5 border text-xs font-black rounded uppercase tracking-wider transition-all flex items-center gap-2 ${analysisResults[job.job_id] ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-transparent border-gray-700 text-gray-400 hover:border-green-500 hover:text-green-400'}`}>{analyzing === job.job_id ? <ScanEye className="animate-spin w-4 h-4"/> : <ScanEye className="w-4 h-4"/>} {analysisResults[job.job_id] ? 'ANALYSIS_COMPLETE' : 'SCAN_TARGET'}</button>
                        {analysisResults[job.job_id] && (
                          <button onClick={() => generateApplication(job)} disabled={writing === job.job_id} className="px-5 py-2.5 bg-green-600 text-black text-xs font-black rounded uppercase tracking-wider hover:bg-green-400 transition-all flex items-center gap-2 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                            {writing === job.job_id ? <PenTool className="animate-bounce w-4 h-4"/> : <PenTool className="w-4 h-4"/>} WRITE_LETTER
                          </button>
                        )}
                        <a href={job.job_apply_link} target="_blank" className="px-5 py-2.5 border border-gray-700 bg-gray-900/50 text-white text-xs font-black rounded uppercase tracking-wider hover:bg-white hover:text-black transition-all">[ APPLY ]</a>
                      </div>
                    </div>
                    {/* ANALYSIS RESULTS */}
                    {analysisResults[job.job_id] && (
                      <div className="mt-6 p-6 bg-black/50 border border-green-500/30 rounded-lg animate-in fade-in slide-in-from-top-2 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                          <div className="p-4 bg-green-950/10 border border-green-900/50 rounded flex flex-col justify-center items-center text-center">
                            <div className="text-[10px] text-green-500 uppercase mb-2 tracking-[0.2em] font-bold">Success Probability</div>
                            <div className={`text-4xl font-black ${analysisResults[job.job_id].matchScore > 80 ? 'text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]' : analysisResults[job.job_id].matchScore > 50 ? 'text-yellow-400' : 'text-red-500'}`}>{analysisResults[job.job_id].matchScore}%</div>
                          </div>
                          <div className="p-4 bg-green-950/10 border border-green-900/50 rounded col-span-2">
                            <div className="text-[10px] text-green-500 uppercase mb-2 tracking-[0.2em] font-bold">Tactical Approach</div>
                            <div className="text-sm text-green-200 font-bold leading-relaxed">"{analysisResults[job.job_id].attackPlan}"</div>
                          </div>
                        </div>
                        <div className="mb-4">
                          <div className="text-[10px] text-gray-500 uppercase mb-3 tracking-widest font-bold">Required Assets</div>
                          <div className="flex flex-wrap gap-2">{analysisResults[job.job_id].keyKeywords.map((kw, i) => (<span key={i} className="px-3 py-1.5 bg-green-500/5 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase rounded-sm tracking-wider">{kw}</span>))}</div>
                        </div>
                        {analysisResults[job.job_id].warningLog && (<div className="mt-4 text-xs text-red-400 flex items-start gap-3 border-t border-red-900/20 pt-4"><ShieldAlert className="w-5 h-5 shrink-0" /> <div><span className="font-bold text-red-500 uppercase tracking-wider mb-1 block">WARNING:</span> {analysisResults[job.job_id].warningLog}</div></div>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {jobs.length > 0 && (
                <div className="text-center mt-16 pb-20">
                    <button onClick={() => executeSearch(true)} disabled={loadingMore} className="bg-black hover:bg-gray-900 text-green-500 border border-green-900 hover:border-green-500 px-10 py-5 rounded-full font-black text-sm tracking-widest transition-all flex items-center gap-3 mx-auto shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                        {loadingMore ? <RefreshCw className="animate-spin w-5 h-5" /> : <ChevronDown className="w-5 h-5" />} {loadingMore ? 'FETCHING MORE TARGETS...' : 'LOAD MORE TARGETS'}
                    </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* --- VIEW: MISSIONS (TRACKER) --- */}
        {activeTab === 'MISSIONS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-16 mt-8">
              <h1 className="text-6xl font-[900] text-white mb-2 uppercase italic tracking-tighter">Mission <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">Control</span></h1>
              <p className="text-gray-500 font-mono tracking-widest text-sm">// ACTIVE OPERATIONS DASHBOARD</p>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-24 glass-panel rounded-xl"><Briefcase className="w-20 h-20 text-gray-800 mx-auto mb-6" /><h3 className="text-2xl font-black text-gray-600 uppercase tracking-widest">NO ACTIVE MISSIONS</h3><p className="text-gray-700 font-mono mt-3">Generate a letter or apply to a job to initiate tracking.</p></div>
            ) : (
              <div className="grid gap-4">
                {applications.map((app) => (
                  <div key={app.job_id} className="glass-panel p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-green-500 transition-all rounded-xl relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-green-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-xl font-black text-white">{app.job_title}</h3>
                        <span className={`text-[10px] font-black px-3 py-1 rounded border uppercase tracking-wider ${app.status === 'APPLIED' ? 'bg-blue-950/40 text-blue-400 border-blue-900' : app.status === 'INTERVIEW' ? 'bg-purple-950/40 text-purple-400 border-purple-900 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : app.status === 'OFFER' ? 'bg-green-950/40 text-green-400 border-green-900 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-red-950/40 text-red-400 border-red-900'}`}>{app.status}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono flex gap-4 uppercase tracking-wider"><span>{app.employer_name}</span><span className="text-green-800">|</span><span>{app.job_city}</span><span className="text-green-800">|</span><span>{app.appliedDate}</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="flex bg-black/60 rounded-lg p-1.5 mr-4 border border-green-900/30">
                         <button onClick={() => updateStatus(app.job_id, 'INTERVIEW')} title="Mark Interview" className={`p-2 rounded hover:bg-purple-900/20 ${app.status === 'INTERVIEW' ? 'text-purple-400' : 'text-gray-600 hover:text-purple-400'}`}><ScanEye className="w-5 h-5" /></button>
                         <button onClick={() => updateStatus(app.job_id, 'OFFER')} title="Mark Offer" className="p-2 rounded hover:bg-green-900/20 hover:text-green-400 text-gray-600"><Trophy className="w-5 h-5" /></button>
                         <button onClick={() => updateStatus(app.job_id, 'REJECTED')} title="Mark Rejected" className="p-2 rounded hover:bg-red-900/20 hover:text-red-400 text-gray-600"><Ban className="w-5 h-5" /></button>
                       </div>
                       
                       {app.status === 'INTERVIEW' && (
                         <button 
                           onClick={() => generateBriefing(app)}
                           disabled={prepping === app.job_id}
                           className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black px-4 py-3 rounded-lg uppercase flex items-center gap-2 mr-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
                         >
                            {prepping === app.job_id ? <BrainCircuit className="animate-spin w-4 h-4"/> : <BrainCircuit className="w-4 h-4"/>} 
                            WAR_ROOM
                         </button>
                       )}

                       <a href={app.job_apply_link} target="_blank" className="text-green-500 hover:text-white text-xs font-black border border-green-900 px-4 py-3 rounded-lg uppercase transition-colors">View Job</a>
                       <button onClick={() => deleteApplication(app.job_id)} className="text-red-900 hover:text-red-500 p-2"><X className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* --- PAYWALL MODAL (THE WALL) --- */}
      {showPaywall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in zoom-in-95">
          <div className="bg-black border border-green-500 p-8 max-w-lg w-full shadow-[0_0_50px_rgba(34,197,94,0.2)] relative">
            <button 
              onClick={() => setShowPaywall(false)}
              className="absolute top-4 right-4 text-green-700 hover:text-green-400 text-xl font-bold"
            >
              [X]
            </button>
            
            <h2 className="text-3xl font-bold text-green-500 mb-2 tracking-widest uppercase flex items-center gap-3">
               <ShieldAlert className="w-8 h-8"/> MISSION ABORTED
            </h2>
            <div className="h-px w-full bg-green-900 mb-6"></div>

            <p className="text-gray-300 mb-6 font-mono text-sm leading-relaxed">
              // <span className="text-red-500">ERROR:</span> RESOURCES DEPLETED.<br/>
              Your free trial intelligence credits have been exhausted. To continue accessing the global job network, high-level clearance is required.
            </p>
            
            <div className="border border-green-500/30 p-6 mb-8 bg-green-900/10 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors"></div>
              <div className="relative z-10">
                 <div className="text-sm font-bold text-green-400 uppercase tracking-widest mb-2">PRO OPERATOR LICENSE</div>
                 <div className="text-4xl font-black text-white mb-2">$15</div>
                 <div className="text-xs text-green-600 font-mono">ONE-TIME PAYMENT • NO SUBSCRIPTION</div>
              </div>
            </div>

            <button 
              onClick={() => window.location.href = "https://buy.stripe.com/test_aFa5kx5S1c6s6kedsnefC00"}
              className="w-full bg-green-600 hover:bg-green-500 text-black font-black py-4 rounded uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(34,197,94,0.6)] text-lg flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5 fill-black" /> UPGRADE CLEARANCE
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}