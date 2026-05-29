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
  Activity,
  Coins,
  TrendingUp
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
  
  // VỊ TRÍ SỬA 1: Cấu hình mặc định ban đầu cho Tệp Cột C (Luôn đưa giá về cột G và H)
  const [columnConfigColC, setColumnConfigColC] = useState<ColumnMappingConfig>({
    sourceSkuCol: 2, 
    sourcePriceGCol: 6, // Đã sửa từ 3 sang 6 (Cột G)
    sourcePriceHCol: 7, // Đã sửa từ 4 sang 7 (Ghi đè giá mới về đúng Cột H)
    refSkuCol: 0, 
    refPriceCol: 1, 
    hasCustomMapping: false
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
    addLog(`💰 Đã nạp Tệp Gốc 1 vào két sắt: "${file.name}"`, 'success');
  };

  // VỊ TRÍ SỬA 2: Ép cứng chỉ số cột kết quả về G và H khi tải Tệp Cột C lên thực tế
  const handleSourceColCFileLoaded = (file: FileData) => {
    setSourceColCFile(file);
    setColumnConfigColC(prev => ({ 
      ...prev, 
      sourceSkuCol: 2, 
      sourcePriceGCol: 6, // Ép cứng đọc giá gốc từ Cột G để khử đuôi .00
      sourcePriceHCol: 7  // Ép cứng đưa mức giá mới cập nhật về đúng Cột H
    }));
    addLog(`🪙 Đã nạp Tệp Gốc 2 (Cột C) vào kho bạc: "${file.name}"`, 'success');
  };

  const handleRefFileLoaded = (file: FileData) => {
    const autodetect = autoDetectRefColumns(file.headers);
    setRefFile(file);
    setColumnConfig(prev => ({ ...prev, refSkuCol: autodetect.skuCol, refPriceCol: autodetect.priceCol }));
    setColumnConfigColC(prev => ({ ...prev, refSkuCol: autodetect.skuCol, refPriceCol: autodetect.priceCol }));
    addLog(`✨ Đã nạp Tệp Giá Mới đối chiếu thành công: "${file.name}"`, 'success');
  };

  const handleLoadSampleData = () => {
    const { sourceFile: mockSource, sourceColCFile: mockSourceColC, refFile: mockRef } = createMockupFiles();
    setSourceFile(mockSource); setSourceColCFile(mockSourceColC); setRefFile(mockRef);
    setColumnConfig({
      sourceSkuCol: 5, sourcePriceGCol: 6, sourcePriceHCol: 7, refSkuCol: 0, refPriceCol: 1, hasCustomMapping: false
    });
    
    // VỊ TRÍ SỬA 3: Đồng bộ cấu hình dữ liệu mẫu để đưa giá mới về Cột H khi thử nghiệm
    setColumnConfigColC({
      sourceSkuCol: 2, 
      sourcePriceGCol: 6, // Đã sửa từ 3 sang 6
      sourcePriceHCol: 7, // Đã sửa từ 4 sang 7
      refSkuCol: 0, 
      refPriceCol: 1, 
      hasCustomMapping: false
    });
    setResult(null); setResultColC(null); setActiveTab('file-f'); setLogs([]);
    addLog('💎 Đã mở hòm kho báu chứa dữ liệu Shopee mẫu thành công!', 'success');
  };

  const handleClearAll = () => {
    setSourceFile(null); setSourceColCFile(null); setRefFile(null); setResult(null); setResultColC(null); setLogs([]);
  };

  const runMatchingAlgorithm = () => {
    if (!refFile || (!sourceFile && !sourceColCFile)) return;
    setIsProcessing(true);
    addLog('⚡ Máy đếm tiền đang chạy, tiến hành khớp mã SKU tài lộc...', 'info');
    setTimeout(() => {
      try {
        if (sourceFile) setResult(processSheets(sourceFile, refFile, columnConfig));
        if (sourceColCFile) setResultColC(processSheets(sourceColCFile, refFile, columnConfigColC));
        setActiveTab(sourceFile ? 'file-f' : 'file-c');
        addLog(`🎉 Quy trình đối soát sinh kim tài lộc hoàn tất mỹ mãn!`, 'success');
      } catch (err: any) {
        addLog(`❌ Gặp lỗi kiểm kê: ${err.message}`, 'error');
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
    <div className="min-h-screen bg-stone-50 text-amber-950 font-sans antialiased overflow-x-hidden relative selection:bg-amber-200 selection:text-amber-900">
      {/* NỀN HOÀNG GIA LẤP LÁNH ÁNH VÀNG */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f3e8ff_1px,transparent_1px),linear-gradient(to_bottom,#f3e8ff_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_60%,transparent_100%)] z-0 pointer-events-none opacity-50" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-200/40 rounded-full blur-3xl pointer-events-none z-0 animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-yellow-100/50 rounded-full blur-3xl pointer-events-none z-0" />

      <AnimatePresence mode="wait">
        {/* MÀN HÌNH KHÓA 3D "KÉT SẮT HOÀNG GIA" */}
        {!isAuthorized ? (
          <motion.div 
            key="lock-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -40, rotateX: 12 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="min-h-screen flex items-center justify-center p-4 relative z-10 [perspective:1000px]"
          >
            <motion.div 
              whileHover={{ rotateX: 3, rotateY: -3, translateZ: 15 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="max-w-md w-full bg-white rounded-3xl p-8 text-center border-2 border-amber-200 shadow-[0_30px_60px_-15px_rgba(217,119,6,0.15)] relative overflow-hidden"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Thanh kim tiền viền vàng thượng lưu */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300" />
              
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center text-amber-950 mb-5 shadow-lg shadow-amber-500/20"
              >
                <Coins className="w-8 h-8" />
              </motion.div>
              
              <h2 className="text-2xl font-black tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-900">
                Két Sắt Được Bảo Vệ
              </h2>
              <p className="text-xs text-amber-800/70 mt-1.5 leading-relaxed font-medium">
                Hệ thống quản lý tài lộc đang được niêm phong an toàn. Vui lòng nhập mã khóa đại cát để mở hòm tài sản.
              </p>

              <form onSubmit={handleVerifyKey} className="mt-8 text-left" style={{ transform: "translateZ(20px)" }}>
                <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">
                  Mật Mã Khai Xuân / Access Key
                </label>
                <input
                  type="password"
                  placeholder="Nhập mã vàng bạc..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="w-full px-5 py-3.5 bg-amber-50/50 border-2 border-amber-100 focus:border-amber-400 text-amber-950 rounded-xl outline-none transition-all text-sm placeholder-amber-700/40 font-mono shadow-[inner_0_2px_4px_rgba(217,119,6,0.05)] focus:bg-white"
                />
                
                {lockError && (
                  <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="mt-3 text-xs font-bold text-rose-600 flex items-center gap-1">
                    ⚠️ {lockError}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02, translateY: -2, boxShadow: "0 12px 24px rgba(217, 119, 6, 0.25)" }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="mt-6 w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-amber-950 font-black text-xs rounded-xl tracking-widest uppercase transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md border border-yellow-300"
                >
                  Mở khóa kho báu
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        ) : (
          /* GIAO DIỆN CHÍNH "SANG TRỌNG VÀNG KIM - HOÀNG GIA" */
          <motion.div 
            key="main-app"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10"
          >
            {/* THANH HEADER ĐẲNG CẤP THƯỢNG LƯU */}
            <header className="bg-white/80 border-b-2 border-amber-100 shadow-sm sticky top-0 z-40 backdrop-blur-md">
              <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 text-amber-950 p-3 rounded-2xl shadow-md shadow-amber-500/20 relative group">
                    <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '20s' }} />
                  </div>
                  <div>
                    <h1 className="text-base md:text-xl font-black text-amber-900 tracking-tight flex items-center gap-2">
                      TRỢ LÝ ĐỐI KHỚP & ĐỔI VÀNG EXCEL
                      <span className="text-[9px] font-black text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-md uppercase tracking-widest">GOLD v1.3</span>
                    </h1>
                    <p className="text-xs text-amber-800/60 font-semibold">
                      Kiểm kê thông minh: Chuẩn hóa tiền tệ, khớp SKU tự động và cập nhật giá bán thu hút tài lộc.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={handleLoadSampleData}
                    className="px-4 py-2.5 text-xs font-black text-amber-900 hover:bg-amber-100 bg-amber-50 border-2 border-amber-200/60 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Database className="w-4 h-4 text-amber-600" />
                    Sử Dụng Bản Mẫu Tài Lộc
                  </button>
                  
                  {/* Nút Gỡ tất cả file */}
                  {(sourceFile || sourceColCFile || refFile) && (
                    <button
                      onClick={handleClearAll}
                      className="px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 border-2 border-rose-100 rounded-xl transition-all cursor-pointer"
                    >
                      Xóa Hòm Tệp
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      localStorage.removeItem('site_access_granted');
                      setIsAuthorized(false);
                    }}
                    className="px-3 py-2.5 text-xs font-bold text-amber-700/60 hover:text-amber-900 hover:bg-amber-50 border-2 border-dashed border-amber-200 rounded-xl transition-all cursor-pointer"
                  >
                    Khóa lại
                  </button>
                </div>
              </div>
            </header>

            {/* PHÂN KHU HÀM CHỨA CARD 3D VÀNG BẠC */}
            <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 [perspective:1200px]">
              <div className="flex flex-col gap-6">
                
                {/* 3 KHỐI CARD THẢ FILE SANG TRỌNG */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {[
                    { file: sourceFile, id: "source-orig", label: "Két Gốc 1 (SKU Cột F)", color: "from-amber-400 to-yellow-500", glow: "shadow-amber-500/5", fn: handleSourceFileLoaded, clr: () => { setSourceFile(null); setResult(null); }, desc: "Chứa SKU tại Cột F (chuẩn mặc định), tự động quét và lọc sạch đuôi tiền tệ lẻ .00.", icon: "master", hclr: "indigo" },
                    { file: sourceColCFile, id: "source-col-c", label: "Két Gốc 2 (SKU Cột C)", color: "from-yellow-400 to-amber-500", glow: "shadow-yellow-500/5", fn: handleSourceColCFileLoaded, clr: () => { setSourceColCFile(null); setResultColC(null); }, desc: "Hỗ trợ file chứa SKU định vị chính xác tại Cột C. Tự động ghi đè giá vàng thần tốc vào Cột H.", icon: "master", hclr: "sky" },
                    { file: refFile, id: "ref-pricing", label: "Bảng Giá Mới Đối Chiếu", color: "from-emerald-400 to-teal-500", glow: "shadow-emerald-500/5", fn: handleRefFileLoaded, clr: () => { setRefFile(null); setResult(null); setResultColC(null); }, desc: "Bảng chứa danh sách giá mới cập nhật tương ứng phục vụ tra cứu giao thương.", icon: "reference", hclr: "emerald" }
                  ].map((zone, idx) => (
                    <motion.div
                      key={zone.id}
                      whileHover={{ scale: 1.02, translateY: -3, rotateX: 1.5, borderColor: "#fbbf24" }}
                      className={`bg-white border-2 border-amber-100 rounded-2xl p-1 shadow-lg ${zone.glow} transition-all duration-300 relative overflow-hidden`}
                    >
                      <div className={`h-1 w-full bg-gradient-to-r ${zone.color}`} />
                      <div className="p-4 bg-gradient-to-b from-amber-50/20 to-transparent">
                        <FileUploadZone
                          id={zone.id} label={zone.label} placeholder="Thả tệp dữ liệu hái ra tiền vào đây..." description={zone.desc}
                          file={zone.file} onFileLoaded={zone.fn} onFileCleared={zone.clr} iconName={zone.icon} highlightColor={zone.hclr}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* BẢNG CẤU HÌNH CỘT (MAPPING) */}
                <motion.div whileHover={{ scale: 1.005 }} className="bg-white border-2 border-amber-100 rounded-2xl p-1 shadow-md">
                  <MappingSettings
                    sourceFile={sourceFile} sourceColCFile={sourceColCFile} refFile={refFile}
                    config={columnConfig} configColC={columnConfigColC} onChange={setColumnConfig} onChangeColC={setColumnConfigColC}
                  />
                </motion.div>

                {/* NÚT THỰC THI "ĐỐI CHIẾU SINH TÀI LỘC" */}
                {(sourceFile || sourceColCFile) && refFile && !result && !resultColC && (
                  <motion.div 
                    initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-r from-amber-900 to-amber-950 border-2 border-yellow-400 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden"
                  >
                    {/* Luồng sáng vàng kim chìm mặt sau */}
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex gap-4 items-start relative z-10">
                      <div className="p-3 rounded-xl bg-amber-950 border border-yellow-400/40 text-yellow-400 shrink-0 mt-0.5 animate-bounce">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-sm font-black text-yellow-400 tracking-wider uppercase block">Sẵn sàng vận hành dòng tiền dữ liệu</span>
                        <p className="text-xs text-amber-100/70 mt-1 leading-relaxed max-w-xl font-medium">
                          Mọi nguồn tệp đã lọt vào kho. Nhấp nút kích hoạt để hệ thống khai thông luồng đối khớp, vá lại giá bán tối ưu lợi nhuận về đúng Cột H ngay lập tức.
                        </p>
                      </div>
                    </div>

                    <motion.button
                      onClick={runMatchingAlgorithm}
                      disabled={isProcessing}
                      whileHover={{ scale: 1.04, boxShadow: "0 0 25px rgba(245, 158, 11, 0.4)" }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-yellow-400 hover:to-amber-500 text-amber-950 font-black text-xs rounded-xl tracking-widest uppercase shadow-md border border-yellow-200 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 relative z-10"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          ĐANG ĐẾM TIỀN...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-amber-950" />
                          KÍCH HOẠT ĐỐI CHIẾU SINH TÀI
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                )}

                {/* PHÂN TAB KẾT QUẢ SONG TRÙNG */}
                {(result && resultColC) && (
                  <div className="flex bg-white border-2 border-amber-100 p-1.5 rounded-xl self-start gap-2 shadow-sm">
                    <button
                      onClick={() => setActiveTab('file-f')}
                      className={`py-2 px-4 text-xs font-black rounded-lg transition-all cursor-pointer ${
                        activeTab === 'file-f' ? 'bg-amber-500 text-amber-950 shadow' : 'text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      KẾT QUẢ TỆP CỘT F ({result.matchingCount} dòng)
                    </button>
                    <button
                      onClick={() => setActiveTab('file-c')}
                      className={`py-2 px-4 text-xs font-black rounded-lg transition-all cursor-pointer ${
                        activeTab === 'file-c' ? 'bg-yellow-500 text-amber-950 shadow' : 'text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      KẾT QUẢ TỆP CỘT C ({resultColC.matchingCount} dòng)
                    </button>
                  </div>
                )}

                {/* THÀNH QUẢ DASHBOARD (HIỂN THỊ KHI XỬ LÝ XONG) */}
                {activeResult && (
                  <motion.div initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }}>
                    <StatsDashboard result={activeResult} onReset={handleClearAll} />
                  </motion.div>
                )}

                {/* KHU VỰC TẢI FILE VÀNG KHỐI */}
                {(result || resultColC) && (
                  <div className="flex flex-col gap-6">
                    {result && (
                      <div className="bg-white border-2 border-amber-100 p-6 rounded-2xl shadow-md flex flex-col gap-4">
                        <span className="text-xs font-black text-amber-800 uppercase tracking-widest block bg-amber-50 self-start px-3 py-1 rounded-md border border-amber-200">
                          📦 Kết Xuất Tải Về Cho Tệp Gốc 1 (Cột F)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col justify-between gap-3 bg-amber-50/20 border-2 border-amber-100/60 p-4 rounded-xl hover:border-amber-400 transition-all group">
                            <div>
                              <span className="text-xs font-black text-amber-900 block">1. Tệp Kết Quả Đã Vá Giá Cột F</span>
                              <p className="text-[11px] text-amber-700/70 mt-1 font-medium">Bản ghi hoàn chỉnh, điền giá bán mới chuẩn xác 100% rước tài lộc.</p>
                            </div>
                            <button onClick={() => downloadResultFile('file-f')} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-yellow-300">
                              <Download className="w-4 h-4" /> Tải Tệp_Kết_Quả_F.xlsx
                            </button>
                          </div>

                          <div className="flex flex-col justify-between gap-3 bg-amber-50/20 border-2 border-amber-100/60 p-4 rounded-xl hover:border-emerald-400 transition-all group">
                            <div>
                              <span className="text-xs font-black text-amber-900 block">2. Bản Đối Soát Doanh Số Chi Tiết F</span>
                              <p className="text-[11px] text-amber-700/70 mt-1 font-medium">Thống kê đa chiều, tách nhóm mã bán tốt và nhóm cần thanh lý.</p>
                            </div>
                            <button onClick={() => downloadComparisonFile('file-f')} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                              <Download className="w-4 h-4" /> Tải Đối_Chiếu_Mã_F.xlsx
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {resultColC && (
                      <div className="bg-white border-2 border-amber-100 p-6 rounded-2xl shadow-md flex flex-col gap-4">
                        <span className="text-xs font-black text-amber-800 uppercase tracking-widest block bg-amber-50 self-start px-3 py-1 rounded-md border border-amber-200">
                          📦 Kết Xuất Tải Về Cho Tệp Gốc 2 (Cột C)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col justify-between gap-3 bg-amber-50/20 border-2 border-amber-100/60 p-4 rounded-xl hover:border-yellow-500 transition-all group">
                            <div>
                              <span className="text-xs font-black text-amber-900 block">1. Tệp Kết Quả Đã Vá Giá Vào Cột H (SKU Cột C)</span>
                              <p className="text-[11px] text-amber-700/70 mt-1 font-medium">Xử lý chuỗi SKU tại cột C, ghi đè hoàn thiện bảng giá bán ra đúng tại Cột H.</p>
                            </div>
                            <button onClick={() => downloadResultFile('file-c')} className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-amber-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-yellow-200">
                              <Download className="w-4 h-4" /> Tải Tệp_Kết_Quả_C.xlsx
                            </button>
                          </div>

                          <div className="flex flex-col justify-between gap-3 bg-amber-50/20 border-2 border-amber-100/60 p-4 rounded-xl hover:border-teal-400 transition-all group">
                            <div>
                              <span className="text-xs font-black text-amber-900 block">2. Bản Đối Soát Doanh Số Chi Tiết C</span>
                              <p className="text-[11px] text-amber-700/70 mt-1 font-medium">Kiểm tra lỗi mã SKU không khớp để cân đối kho hàng phú quý.</p>
                            </div>
                            <button onClick={() => downloadComparisonFile('file-c')} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                              <Download className="w-4 h-4" /> Tải Đối_Chiếu_Mã_C.xlsx
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* BẢNG TRỰC QUAN XEM TRƯỚC DỮ LIỆU */}
                {activeResult && (
                  <div className="shadow-sm border-2 border-amber-100 rounded-2xl overflow-hidden bg-white">
                    <MatchTable result={activeResult} />
                  </div>
                )}

                {/* NHẬT KÝ KIỂM KÊ KÉT SẮT (CONSOLE LOGS) */}
                <div className="bg-white border-2 border-amber-100 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3.5 pb-2 border-b-2 border-amber-50">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-black text-amber-800 uppercase tracking-wider">Nhật Ký Lõi Kiểm Kê Kho Bạc</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <div className="w-2 h-2 rounded-full bg-amber-600" />
                    </div>
                  </div>
                  
                  {logs.length === 0 ? (
                    <div className="text-center py-6 text-xs text-amber-800/40 font-mono font-bold tracking-wide">
                      🪙 Kho bạc đang sẵn sàng. Vui lòng đổ tệp Excel vào két...
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto font-mono text-[11px] bg-amber-50/30 p-4 rounded-xl border border-amber-100 shadow-inner">
                      {logs.map((log, index) => (
                        <div key={index} className="flex gap-2.5 items-start leading-relaxed border-l-2 border-amber-200 pl-2">
                          <span className="text-amber-800/50 shrink-0 select-none">[{log.timestamp}]</span>
                          <span className={`
                            ${log.type === 'success' ? 'text-emerald-700 font-bold' : ''}
                            ${log.type === 'error' ? 'text-rose-600 font-extrabold' : ''}
                            ${log.type === 'warn' ? 'text-amber-600 font-bold' : ''}
                            ${log.type === 'info' ? 'text-amber-900 font-medium' : ''}
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
