/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  ArrowRight, 
  Download, 
  RefreshCw, 
  Terminal, 
  Play, 
  BookOpen, 
  CheckCircle, 
  Info, 
  ArrowRightLeft,
  ChevronRight,
  Database,
  Lock,
  Layers,
  Activity
} from 'lucide-react';

import { ColumnMappingConfig, FileData, ProcessingLog, ProcessingResult } from './types';
import { FileUploadZone } from './components/FileUploadZone';
import { MappingSettings } from './components/MappingSettings';
import { StatsDashboard } from './components/StatsDashboard';
import { MatchTable } from './components/MatchTable';
import { PythonScriptBox } from './components/PythonScriptBox';
import { 
  processSheets, 
  generateResultWorkbook, 
  generateComparisonWorkbook, 
  createMockupFiles,
  autoDetectSourceColumns,
  autoDetectRefColumns
} from './utils/excelProcessor';

export default function App() {
  // --- LOGIC KHÓA TRANG WEB ---
  const SECRET_KEY = 'anhlamdeptraivocungtan'; 

  const [isAuthorized, setIsAuthorized] = useState<boolean>(
    localStorage.getItem('site_access_granted') === 'true'
  );
  const [inputKey, setInputKey] = useState('');
  const [lockError, setLockError] = useState('');

  const handleVerifyKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey === SECRET_KEY) {
      localStorage.setItem('site_access_granted', 'true');
      setIsAuthorized(true);
      setLockError('');
    } else {
      setLockError('Mã khóa không chính xác. Vui lòng thử lại!');
    }
  };

  // Input spreadsheets
  const [sourceFile, setSourceFile] = useState<FileData | null>(null);
  const [sourceColCFile, setSourceColCFile] = useState<FileData | null>(null);
  const [refFile, setRefFile] = useState<FileData | null>(null);

  // Column config
  const [columnConfig, setColumnConfig] = useState<ColumnMappingConfig>({
    sourceSkuCol: 5, sourcePriceGCol: 6, sourcePriceHCol: 7, refSkuCol: 0, refPriceCol: 1, hasCustomMapping: false
  });
  const [columnConfigColC, setColumnConfigColC] = useState<ColumnMappingConfig>({
    sourceSkuCol: 2, sourcePriceGCol: 3, sourcePriceHCol: 4, refSkuCol: 0, refPriceCol: 1, hasCustomMapping: false
  });

  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [resultColC, setResultColC] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [activeTab, setActiveTab] = useState<'file-f' | 'file-c'>('file-f');

  const addLog = (message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    setLogs(prev => [{ timestamp: time, message, type }, ...prev]);
  };

  const handleSourceFileLoaded = (file: FileData) => {
    setSourceFile(file);
    const autodetect = autoDetectSourceColumns(file.headers);
    setColumnConfig(prev => ({ ...prev, sourceSkuCol: autodetect.skuCol, sourcePriceGCol: autodetect.priceGCol, sourcePriceHCol: autodetect.priceHCol }));
    addLog(`Đã tải Tệp Gốc 1: "${file.name}"`, 'success');
  };

  const handleSourceColCFileLoaded = (file: FileData) => {
    setSourceColCFile(file);
    addLog(`Đã tải Tệp Gốc 2 (Cột C): "${file.name}"`, 'success');
  };

  const handleRefFileLoaded = (file: FileData) => {
    setRefFile(file);
    const autodetect = autoDetectRefColumns(file.headers);
    setColumnConfig(prev => ({ ...prev, refSkuCol: autodetect.skuCol, refPriceCol: autodetect.priceCol }));
    setColumnConfigColC(prev => ({ ...prev, refSkuCol: autodetect.skuCol, refPriceCol: autodetect.priceCol }));
    addLog(`Đã tải Tệp Giá Mới: "${file.name}"`, 'success');
  };

  const handleLoadSampleData = () => {
    const { sourceFile: mockSource, sourceColCFile: mockSourceColC, refFile: mockRef } = createMockupFiles();
    setSourceFile(mockSource); setSourceColCFile(mockSourceColC); setRefFile(mockRef);
    setResult(null); setResultColC(null); setActiveTab('file-f'); setLogs([]);
    addLog('Đã nạp bộ dữ liệu mẫu 3D không gian Shopee thành công.', 'success');
  };

  const handleClearAll = () => {
    setSourceFile(null); setSourceColCFile(null); setRefFile(null); setResult(null); setResultColC(null); setLogs([]);
  };

  const runMatchingAlgorithm = () => {
    if (!refFile || (!sourceFile && !sourceColCFile)) return;
    setIsProcessing(true);
    addLog('Hệ thống hạt đang lượng hóa và khớp dữ liệu...', 'info');
    setTimeout(() => {
      try {
        if (sourceFile) setResult(processSheets(sourceFile, refFile, columnConfig));
        if (sourceColCFile) setResultColC(processSheets(sourceColCFile, refFile, columnConfigColC));
        setActiveTab(sourceFile ? 'file-f' : 'file-c');
        addLog(`Đối sánh đa chiều hoàn tất!`, 'success');
      } catch (err: any) {
        addLog(`Lỗi xử lý: ${err.message}`, 'error');
      } finally { setIsProcessing(false); }
    }, 800);
  };

  const downloadResultFile = (type: 'file-f' | 'file-c') => {
    const activeResult = type === 'file-f' ? result : resultColC;
    const activeSource = type === 'file-f' ? sourceFile : sourceColCFile;
    if (!activeResult || !activeSource) return;
    const outputName = activeSource.name.replace(/\.[^/.]+$/, '_Ket_Qua.xlsx');
    const binData = generateResultWorkbook(activeResult.outputRows, outputName);
    const blob = new Blob([binData], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = outputName; a.click();
  };

  const downloadComparisonFile = (type: 'file-f' | 'file-c') => {
    const activeResult = type === 'file-f' ? result : resultColC;
    const activeConfig = type === 'file-f' ? columnConfig : columnConfigColC;
    if (!activeResult || !refFile) return;
    const outputName = type === 'file-f' ? 'File_Doi_Chieu_Ma_Cot_F.xlsx' : 'File_Doi_Chieu_Ma_Cot_C.xlsx';
    const binData = generateComparisonWorkbook(activeResult.processedItems, refFile, activeConfig);
    const blob = new Blob([binData], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = outputName; a.click();
  };

  const resolvedTab = (result && resultColC) ? activeTab : (result ? 'file-f' : 'file-c');
  const activeResult = resolvedTab === 'file-f' ? result : resultColC;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-x-hidden relative selection:bg-indigo-500 selection:text-white">
      {/* BACKGROUND HIỆU ỨNG KHÔNG GIAN 3D (CHUNG) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] z-0 pointer-events-none opacity-70 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none z-0" />

      <AnimatePresence mode="wait">
        {/* MÀN HÌNH KHÓA 3D SIÊU THỰC */}
        {!isAuthorized ? (
          <motion.div 
            key="lock-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -50, rotateX: 15 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="min-h-screen flex items-center justify-center p-4 relative z-10 [perspective:1000px]"
          >
            {/* Thẻ Card Khóa hỗ trợ hiệu ứng xoay 3D nhẹ khi Hover */}
            <motion.div 
              whileHover={{ rotateX: 4, rotateY: -4, translateZ: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 text-center border border-slate-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] shadow-indigo-950/20 relative overflow-hidden"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500" />
              
              <motion.div 
                animate={{ rotateY: [0, 360] }}
                transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-500/30"
              >
                <Lock className="w-7 h-7" />
              </motion.div>
              
              <h2 className="text-2xl font-black text-white tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                Hệ Thống Được Bảo Vệ
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Khoang xử lý dữ liệu đang được mã hóa bằng thuật toán không gian. Vui lòng điền mật mã để khởi chạy lõi năng lượng.
              </p>

              <form onSubmit={handleVerifyKey} className="mt-8 text-left" style={{ transform: "translateZ(20px)" }}>
                <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2.5">
                  Mã bảo mật định danh (Access Key)
                </label>
                <input
                  type="password"
                  placeholder="Điền mã bảo mật..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl outline-none transition-all text-sm placeholder-slate-600 font-mono shadow-[inner_0_2px_4px_rgba(0,0,0,0.6)] focus:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                />
                
                {lockError && (
                  <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mt-3 text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                    🚀 {lockError}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02, translateY: -2, boxShadow: "0 10px 20px rgba(79, 70, 229, 0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="mt-6 w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  Kích hoạt lõi ứng dụng
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        ) : (
          /* GIAO DIỆN TRONG TRANG WEB CHÍNH - SIÊU ĐẸP & SINH ĐỘNG */
          <motion.div 
            key="main-app"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10"
          >
            {/* THANH HEADER HIỆN ĐẠI CYBERPUNK */}
            <header className="bg-slate-900/70 border-b border-slate-800 shadow-xl sticky top-0 z-40 backdrop-blur-md">
              <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-500/20 relative overflow-hidden group">
                    <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '15s' }} />
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </div>
                  <div>
                    <h1 className="text-md md:text-xl font-black text-white tracking-tight flex items-center gap-2">
                      TRỢ LÝ ĐỐI KHỚP EXCEL
                      <span className="text-[9px] font-black text-indigo-300 bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 rounded-md uppercase tracking-widest">CYBER v1.3</span>
                    </h1>
                    <p className="text-xs text-slate-400 font-medium">
                      Động cơ xử lý lượng tử: Làm sạch số liệu, quét SKU đa luồng và đồng bộ giá bán tự động.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={handleLoadSampleData}
                    className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md"
                  >
                    <Database className="w-4 h-4 text-indigo-400" />
                    Nạp Dữ Liệu Mẫu 3D
                  </button>
                  
                  {/* Nút Gỡ tất cả file */}
                  {(sourceFile || sourceColCFile || refFile) && (
                    <button
                      onClick={handleClearAll}
                      className="px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-950/30 border border-rose-900/50 rounded-xl transition-all cursor-pointer"
                    >
                      Xóa Bộ Nhớ Tệp
                    </button>
                  )}
                  
                  {/* Nút Khóa Hoạt cảnh Trở ra */}
                  <button
                    onClick={() => {
                      localStorage.removeItem('site_access_granted');
                      setIsAuthorized(false);
                    }}
                    className="px-3 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-300 hover:bg-slate-800/80 rounded-xl border border-dashed border-slate-700 transition-all cursor-pointer"
                  >
                    Khóa lại
                  </button>
                </div>
              </div>
            </header>

            {/* KHOANG CHỨA NỘI DUNG CHÍNH CHUẨN KHÔNG GIAN 3D */}
            <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 [perspective:1200px]">
              <div className="flex flex-col gap-8">
                
                {/* LƯỚI THẢ TỆP BOX 3D HOVER */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {[
                    { file: sourceFile, id: "source-orig", label: "Tệp Gốc 1 (SKU Cột F)", color: "from-indigo-500 to-purple-600", colorGlow: "shadow-indigo-950/40", fn: handleSourceFileLoaded, clr: () => { setSourceFile(null); setResult(null); }, desc: "Hỗ trợ file Excel (.xlsx, .xls) hoặc CSV. Chứa SKU tại Cột F (chuẩn mặc định), giá gốc cột G, giá bán cột H.", icon: "master", hclr: "indigo" },
                    { file: sourceColCFile, id: "source-col-c", label: "Tệp Gốc 2 (SKU Cột C)", color: "from-sky-500 to-blue-600", colorGlow: "shadow-sky-950/40", fn: handleSourceColCFileLoaded, clr: () => { setSourceColCFile(null); setResultColC(null); }, desc: "Excel hoặc CSV. Chứa SKU định vị chính xác tại Cột C. Tự động khớp SKU và dán đè giá mới cập nhật.", icon: "master", hclr: "sky" },
                    { file: refFile, id: "ref-pricing", label: "Tệp Giá Mới (Tệp Đối Chiếu)", color: "from-emerald-500 to-teal-600", colorGlow: "shadow-emerald-950/40", fn: handleRefFileLoaded, clr: () => { setRefFile(null); setResult(null); setResultColC(null); }, desc: "Chứa bảng đối chiếu mã SKU tương ứng với mức giá mới cần cập nhật.", icon: "reference", hclr: "emerald" }
                  ].map((zone, idx) => (
                    <motion.div
                      key={zone.id}
                      initial={{ opacity: 0, y: 20, rotateY: idx * 2 }}
                      animate={{ opacity: 1, y: 0, rotateY: 0 }}
                      transition={{ delay: idx * 0.1, type: "spring" }}
                      whileHover={{ scale: 1.02, translateY: -4, rotateX: 2 }}
                      className={`bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-2xl p-1 shadow-xl ${zone.colorGlow} transition-all duration-300 relative overflow-hidden group`}
                    >
                      <div className={`h-1 w-full bg-gradient-to-r ${zone.color}`} />
                      <div className="p-5">
                        <FileUploadZone
                          id={zone.id} label={zone.label} placeholder="Kéo và thả tệp dữ liệu hạt..." description={zone.desc}
                          file={zone.file} onFileLoaded={zone.fn} onFileCleared={zone.clr} iconName={zone.icon} highlightColor={zone.hclr}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* BẢNG ĐIỀU CHỈNH MAPPING RULES SÂU */}
                <motion.div 
                  whileHover={{ translateZ: 5 }}
                  className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-2 shadow-inner"
                >
                  <MappingSettings
                    sourceFile={sourceFile} sourceColCFile={sourceColCFile} refFile={refFile}
                    config={columnConfig} configColC={columnConfigColC} onChange={setColumnConfig} onChangeColC={setColumnConfigColC}
                  />
                </motion.div>

                {/* NÚT KÍCH HOẠT QUY TRÌNH HẠT MÁY CHỦ (BẤM LÀ NỔ HIỆU ỨNG) */}
                {(sourceFile || sourceColCFile) && refFile && !result && !resultColC && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-900/40 rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex gap-4 items-start relative z-10">
                      <div className="p-3 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/50 shrink-0 mt-0.5 animate-pulse">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-indigo-300 tracking-wide uppercase block">Sẵn sàng hợp nhất ma trận giá</span>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">
                          Động cơ đã nạp đủ tệp nguồn. Khi thực thi, hệ thống sẽ tự động gỡ đuôi số thập phân .00, đồng bộ khóa SKU và tạo lớp dữ liệu xuất khẩu mới.
                        </p>
                      </div>
                    </div>

                    <motion.button
                      onClick={runMatchingAlgorithm}
                      disabled={isProcessing}
                      whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(99, 102, 241, 0.5)" }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-40 relative z-10 shrink-0"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          ĐANG XỬ LÝ LƯỢNG TỬ...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white animate-bounce" />
                          BẮT ĐẦU ĐỐI CHIẾU 3D
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                )}

                {/* TAB CHUYỂN ĐỔI PHÂN KHÚC KẾT QUẢ KHI CÓ ĐỦ CẢ HAI */}
                {(result && resultColC) && (
                  <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl self-start gap-2 shadow-inner">
                    <button
                      onClick={() => setActiveTab('file-f')}
                      className={`py-2.5 px-5 text-xs font-bold rounded-lg transition-all cursor-pointer tracking-wide ${
                        activeTab === 'file-f' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      KẾT QUẢ TỆP CỘT F ({result.matchingCount} dòng khớp)
                    </button>
                    <button
                      onClick={() => setActiveTab('file-c')}
                      className={`py-2.5 px-5 text-xs font-bold rounded-lg transition-all cursor-pointer tracking-wide ${
                        activeTab === 'file-c' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      KẾT QUẢ TỆP CỘT C ({resultColC.matchingCount} dòng khớp)
                    </button>
                  </div>
                )}

                {/* BẢNG THỐNG KÊ DASHBOARD CHUYÊN NGHIỆP */}
                {activeResult && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                    <StatsDashboard result={activeResult} onReset={handleClearAll} />
                  </motion.div>
                )}

                {/* KHO KẾT XUẤT DOWNLOAD FILE 3D CARD */}
                {(result || resultColC) && (
                  <div className="flex flex-col gap-6">
                    {result && (
                      <motion.div whileHover={{ scale: 1.01 }} className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col gap-4">
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block bg-indigo-950/40 self-start px-3 py-1 rounded-md border border-indigo-900/50">
                          Bộ Xuất Bản Tệp Gốc 1 (Mã SKU Cột F)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col justify-between gap-3 bg-slate-950 border border-slate-900 p-4 rounded-xl hover:border-indigo-500/30 transition-all group">
                            <div>
                              <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors block">1. Bản Phát Hành Đã Sửa Đè Cột F</span>
                              <p className="text-[11px] text-slate-500 mt-1 leading-normal">Mức giá mới được dán đè trực tiếp tại Cột H, định dạng số đã dọn sạch đuôi lẻ .00.</p>
                            </div>
                            <button onClick={() => downloadResultFile('file-f')} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl tracking-wide uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer">
                              <Download className="w-4 h-4" /> Tải Tệp_Kết_Quả_Sửa_F.xlsx
                            </button>
                          </div>

                          <div className="flex flex-col justify-between gap-3 bg-slate-950 border border-slate-900 p-4 rounded-xl hover:border-emerald-500/30 transition-all group">
                            <div>
                              <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors block">2. Bản Phân Tích Tra Soát Đối Chiếu F</span>
                              <p className="text-[11px] text-slate-500 mt-1 leading-normal">Báo cáo đa trang chia rõ các khối danh mục SKU thành công và SKU thất bại.</p>
                            </div>
                            <button onClick={() => downloadComparisonFile('file-f')} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl tracking-wide uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer">
                              <Download className="w-4 h-4" /> Tải Đối_Chiếu_Mã_F.xlsx
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {resultColC && (
                      <motion.div whileHover={{ scale: 1.01 }} className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col gap-4">
                        <span className="text-xs font-black text-sky-400 uppercase tracking-widest block bg-sky-950/40 self-start px-3 py-1 rounded-md border border-sky-900/50">
                          Bộ Xuất Bản Tệp Gốc 2 (Mã SKU Cột C)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col justify-between gap-3 bg-slate-950 border border-slate-900 p-4 rounded-xl hover:border-sky-500/30 transition-all group">
                            <div>
                              <span className="text-xs font-bold text-slate-200 group-hover:text-sky-400 transition-colors block">1. Bản Phát Hành Đã Sửa Đè Cột C</span>
                              <p className="text-[11px] text-slate-500 mt-1 leading-normal">Dò quét mã từ lõi Cột C của tệp gốc thứ 2 để vá và ghi đè mức giá phù hợp hoàn hảo.</p>
                            </div>
                            <button onClick={() => downloadResultFile('file-c')} className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-xl tracking-wide uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer">
                              <Download className="w-4 h-4" /> Tải Tệp_Kết_Quả_Sửa_C.xlsx
                            </button>
                          </div>

                          <div className="flex flex-col justify-between gap-3 bg-slate-950 border border-slate-900 p-4 rounded-xl hover:border-teal-500/30 transition-all group">
                            <div>
                              <span className="text-xs font-bold text-slate-200 group-hover:text-teal-400 transition-colors block">2. Bản Phân Tích Tra Soát Đối Chiếu C</span>
                              <p className="text-[11px] text-slate-500 mt-1 leading-normal">Bóc tách ma trận SKU trùng khớp bên trong bảng dữ liệu tệp gốc thứ 2.</p>
                            </div>
                            <button onClick={() => downloadComparisonFile('file-c')} className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl tracking-wide uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer">
                              <Download className="w-4 h-4" /> Tải Đối_Chiếu_Mã_C.xlsx
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* BẢNG PREVIEW DATA SAU KHI ĐỐI CHIẾU */}
                {activeResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <MatchTable result={activeResult} />
                  </motion.div>
                )}

                {/* NHẬT KÝ CONSOLE HOẠT HÌNH LƯỢNG TỬ */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-indigo-400 animate-pulse" />
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Nhật Ký Lõi Thực Thi (Console)</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                    </div>
                  </div>
                  
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-600 font-mono tracking-wide animate-pulse">
                      📡 Hệ thống đang rảnh rỗi. Đang chờ luồng dữ liệu Excel đầu vào...
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto font-mono text-[11px] bg-slate-950/80 p-4 rounded-xl border border-slate-900 shadow-inner custom-scrollbar">
                      {logs.map((log, index) => (
                        <div key={index} className="flex gap-2.5 items-start leading-relaxed border-l-2 border-slate-800/40 pl-2">
                          <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                          <span className={`
                            ${log.type === 'success' ? 'text-emerald-400 font-medium drop-shadow-[0_0_6px_rgba(52,211,153,0.2)]' : ''}
                            ${log.type === 'error' ? 'text-rose-400 font-bold' : ''}
                            ${log.type === 'warn' ? 'text-amber-400 font-medium' : ''}
                            ${log.type === 'info' ? 'text-indigo-300' : ''}
                          `}>
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
