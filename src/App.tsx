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
  Database
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
  // Input spreadsheets
  const [sourceFile, setSourceFile] = useState<FileData | null>(null);
  const [sourceColCFile, setSourceColCFile] = useState<FileData | null>(null);
  const [refFile, setRefFile] = useState<FileData | null>(null);

  // Column matching setting state (File 1: standard Column F)
  const [columnConfig, setColumnConfig] = useState<ColumnMappingConfig>({
    sourceSkuCol: 5,     // Column F
    sourcePriceGCol: 6,  // Column G
    sourcePriceHCol: 7,  // Column H
    refSkuCol: 0,        // Column A
    refPriceCol: 1,      // Column B
    hasCustomMapping: false
  });

  // Column matching setting state (File 2: specialized Column C)
  const [columnConfigColC, setColumnConfigColC] = useState<ColumnMappingConfig>({
    sourceSkuCol: 2,     // Column C Mặc Định
    sourcePriceGCol: 3,  // Column D or auto-detected
    sourcePriceHCol: 4,  // Column E or auto-detected
    refSkuCol: 0,        // Column A
    refPriceCol: 1,      // Column B
    hasCustomMapping: false
  });

  // Outputs state Map
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [resultColC, setResultColC] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Real-time operations logs
  const [logs, setLogs] = useState<ProcessingLog[]>([]);

  // Selected preview tab to toggle statistics/preview if both results exist
  const [activeTab, setActiveTab] = useState<'file-f' | 'file-c'>('file-f');

  const addLog = (message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    setLogs(prev => [{ timestamp: time, message, type }, ...prev]);
  };

  const handleSourceFileLoaded = (file: FileData) => {
    setSourceFile(file);
    const autodetect = autoDetectSourceColumns(file.headers);
    setColumnConfig(prev => ({
      ...prev,
      sourceSkuCol: autodetect.skuCol,
      sourcePriceGCol: autodetect.priceGCol,
      sourcePriceHCol: autodetect.priceHCol,
    }));
    addLog(`Đã tải Tệp Gốc 1 (Mặc định Cột F): "${file.name}" | Định dạng: ${file.sheetName || 'Chính'}. Đầu dòng bảng định vị tại dòng thứ ${file.headerRowIndex + 1}.`, 'success');
  };

  const handleSourceColCFileLoaded = (file: FileData) => {
    setSourceColCFile(file);
    const autodetect = autoDetectSourceColumns(file.headers);
    setColumnConfigColC(prev => ({
      ...prev,
      sourceSkuCol: 2, // Luôn ưu tiên Cột C (Index 2) theo yêu cầu
      sourcePriceGCol: autodetect.priceGCol === 2 ? 3 : autodetect.priceGCol,
      sourcePriceHCol: autodetect.priceHCol === 2 ? 4 : autodetect.priceHCol,
    }));
    addLog(`Đã tải Tệp Gốc 2 (Mã SKU Cột C): "${file.name}" | Định dạng: ${file.sheetName || 'Chính'}. Mặc định định vị Mã SKU tại Cột C (Index 2).`, 'success');
  };

  const handleRefFileLoaded = (file: FileData) => {
    setRefFile(file);
    const autodetect = autoDetectRefColumns(file.headers);
    setColumnConfig(prev => ({
      ...prev,
      refSkuCol: autodetect.skuCol,
      refPriceCol: autodetect.priceCol,
    }));
    setColumnConfigColC(prev => ({
      ...prev,
      refSkuCol: autodetect.skuCol,
      refPriceCol: autodetect.priceCol,
    }));
    addLog(`Đã tải Tệp Giá Mới: "${file.name}" | Đối chiếu SKU ở Cột ${(autodetect.skuCol + 1)} và giá mới ở Cột ${(autodetect.priceCol + 1)}.`, 'success');
  };

  const handleLoadSampleData = () => {
    const { sourceFile: mockSource, sourceColCFile: mockSourceColC, refFile: mockRef } = createMockupFiles();
    setSourceFile(mockSource);
    setSourceColCFile(mockSourceColC);
    setRefFile(mockRef);
    setColumnConfig({
      sourceSkuCol: 5,     // Column F
      sourcePriceGCol: 6,
      sourcePriceHCol: 7,
      refSkuCol: 0,
      refPriceCol: 1,
      hasCustomMapping: false
    });
    setColumnConfigColC({
      sourceSkuCol: 2,     // Column C
      sourcePriceGCol: 3,  // Column D
      sourcePriceHCol: 4,  // Column E
      refSkuCol: 0,
      refPriceCol: 1,
      hasCustomMapping: false
    });
    setResult(null);
    setResultColC(null);
    setActiveTab('file-f');
    setLogs([]);
    addLog('Đã nạp bộ dữ liệu mẫu Shopee và Tệp gốc Cột C giả định thành công. Bạn có thể bấm xử lý ngay!', 'success');
  };

  const handleClearAll = () => {
    setSourceFile(null);
    setSourceColCFile(null);
    setRefFile(null);
    setResult(null);
    setResultColC(null);
    setLogs([]);
    setColumnConfig({
      sourceSkuCol: 5,
      sourcePriceGCol: 6,
      sourcePriceHCol: 7,
      refSkuCol: 0,
      refPriceCol: 1,
      hasCustomMapping: false
    });
    setColumnConfigColC({
      sourceSkuCol: 2,
      sourcePriceGCol: 3,
      sourcePriceHCol: 4,
      refSkuCol: 0,
      refPriceCol: 1,
      hasCustomMapping: false
    });
  };

  const runMatchingAlgorithm = () => {
    if (!sourceFile && !sourceColCFile) {
      addLog('Lỗi: Cần tải lên ít nhất một Tệp gốc cần sửa để thực hiện.', 'error');
      return;
    }
    if (!refFile) {
      addLog('Lỗi: Cần tải lên Tệp Giá Mới đối chiếu để thực hiện.', 'error');
      return;
    }

    setIsProcessing(true);
    addLog('Bắt đầu quy trình xử lý và đối chiếu giá...', 'info');

    // Simulate subtle loading delay for premium processing feedback
    setTimeout(() => {
      try {
        let ranF = false;
        let ranC = false;

        if (sourceFile) {
          const computation = processSheets(sourceFile, refFile, columnConfig);
          setResult(computation);
          ranF = true;
          addLog(`[Tệp 1 - Cột F] Hoàn thành chuẩn hóa! Khử đuôi .00 trên cột G và H thành công cho file "${sourceFile.name}".`, 'success');
          addLog(`[Tệp 1 - Cột F] Tra soát kết quả: Khớp thành công ${computation.matchingCount} mã SKU. Giữ nguyên ${computation.notMatchingCount} mã.`, 'success');
        }

        if (sourceColCFile) {
          const computationColC = processSheets(sourceColCFile, refFile, columnConfigColC);
          setResultColC(computationColC);
          ranC = true;
          addLog(`[Tệp 2 - Cột C] Hoàn thành đối chiếu Cột C thành công cho file "${sourceColCFile.name}".`, 'success');
          addLog(`[Tệp 2 - Cột C] Tra soát kết quả: Khớp thành công ${computationColC.matchingCount} mã SKU. Giữ nguyên ${computationColC.notMatchingCount} mã.`, 'success');
        }

        if (ranF) {
          setActiveTab('file-f');
        } else if (ranC) {
          setActiveTab('file-c');
        }

        addLog(`Quy trình xử lý hoàn tất! Đã sẵn sàng tải xuống tệp kết quả.`, 'info');
      } catch (err: any) {
        addLog(`Đã gặp lỗi nghiêm trọng khi xử lý: ${err.message || err}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    }, 600);
  };

  const downloadResultFile = (type: 'file-f' | 'file-c') => {
    const activeResult = type === 'file-f' ? result : resultColC;
    const activeSource = type === 'file-f' ? sourceFile : sourceColCFile;
    if (!activeResult || !activeSource) return;

    try {
      const outputName = activeSource.name.replace(/\.[^/.]+$/, '_Ket_Qua.xlsx');
      const binData = generateResultWorkbook(activeResult.outputRows, outputName);
      
      const blob = new Blob([binData], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addLog(`Đã tải xuống thành công file cập nhật giá (${type === 'file-f' ? 'Tệp Cột F' : 'Tệp Cột C'}): ${outputName}`, 'success');
    } catch (err) {
      addLog('Không thể kết xuất dữ liệu file kết quả.', 'error');
    }
  };

  const downloadComparisonFile = (type: 'file-f' | 'file-c') => {
    const activeResult = type === 'file-f' ? result : resultColC;
    const activeConfig = type === 'file-f' ? columnConfig : columnConfigColC;
    if (!activeResult || !refFile) return;

    try {
      const outputName = type === 'file-f' ? 'File_Doi_Chieu_Ma_Cot_F.xlsx' : 'File_Doi_Chieu_Ma_Cot_C.xlsx';
      const binData = generateComparisonWorkbook(activeResult.processedItems, refFile, activeConfig);
      
      const blob = new Blob([binData], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addLog(`Đã tải xuống thành công file chi tiết đối chiếu (${type === 'file-f' ? 'Cột F' : 'Cột C'}): ${outputName}`, 'success');
    } catch (err) {
      addLog('Không thể kết xuất dữ liệu file đối chiếu đối soát.', 'error');
    }
  };

  const resolvedTab = (result && resultColC) ? activeTab : (result ? 'file-f' : 'file-c');
  const activeResult = resolvedTab === 'file-f' ? result : resultColC;

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans antialiased pb-12 transition-all">
      {/* Top Professional Navigation Shell */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md shadow-indigo-200">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Trợ Lý Đối Khớp & Cập Nhật Giá Excel
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">v1.3</span>
              </h1>
              <p className="text-xs text-slate-500 leading-normal">
                Chuẩn hóa đuôi số thập phân, tự động dò tìm khớp SKU ở Cột F hoặc Cột C, cập nhật giá mới chính xác
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleLoadSampleData}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200/50"
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              Sử dụng dữ liệu mẫu
            </button>
            {(sourceFile || sourceColCFile || refFile) && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                Gỡ File
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Structural Wrapper Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col gap-6">
          {/* Twin/Triple File Landing Zone Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <FileUploadZone
              id="source-orig"
              label="Tệp Gốc 1 (SKU Cột F)"
              placeholder="Kéo và thả file chuẩn vào đây"
              description="Hỗ trợ file Excel (.xlsx, .xls) hoặc CSV. Chứa SKU tại Cột F (chuẩn mặc định), giá gốc cột G, giá bán cột H."
              file={sourceFile}
              onFileLoaded={handleSourceFileLoaded}
              onFileCleared={() => {
                setSourceFile(null);
                setResult(null);
              }}
              iconName="master"
              highlightColor="indigo"
            />

            <FileUploadZone
              id="source-col-c"
              label="Tệp Gốc 2 (Sửa Theo SKU Cột C)"
              placeholder="Thả tệp gốc cần đối chiếu Cột C vào đây"
              description="Excel hoặc CSV. Chứa SKU định vị chính xác tại Cột C. Tự động khớp SKU và dán đè giá mới cập nhật."
              file={sourceColCFile}
              onFileLoaded={handleSourceColCFileLoaded}
              onFileCleared={() => {
                setSourceColCFile(null);
                setResultColC(null);
              }}
              iconName="master"
              highlightColor="sky"
            />

            <FileUploadZone
              id="ref-pricing"
              label="Tệp Giá Mới (Tệp Đối Chiếu)"
              placeholder="Kéo và thả file giá mới vào đây"
              description="Chứa bảng đối chiếu mã SKU tương ứng với mức giá mới cần cập nhật."
              file={refFile}
              onFileLoaded={handleRefFileLoaded}
              onFileCleared={() => {
                setRefFile(null);
                setResult(null);
                setResultColC(null);
              }}
              iconName="reference"
              highlightColor="emerald"
            />
          </div>

          {/* Advanced Mapping Rules Drawer */}
          <MappingSettings
            sourceFile={sourceFile}
            sourceColCFile={sourceColCFile}
            refFile={refFile}
            config={columnConfig}
            configColC={columnConfigColC}
            onChange={setColumnConfig}
            onChangeColC={setColumnConfigColC}
          />

          {/* Processing Action Trigger Panel */}
          {(sourceFile || sourceColCFile) && refFile && !result && !resultColC && (
            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex gap-3 items-start select-none">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-800">Quy trình chuẩn hóa tự động</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Hệ thống sẽ dọn sạch đuôi lẻ vô dụng của tiền tệ (xóa đuôi .00) và dò khớp SKU tối ưu để cập nhật mức giá mới vào đúng cột giá bán.
                  </p>
                </div>
              </div>

              <button
                onClick={runMatchingAlgorithm}
                disabled={isProcessing}
                className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang đối chiếu...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    Tiến Hành Xử Lý & Đối Chiếu
                  </>
                )}
              </button>
            </div>
          )}

          {/* Selector tabs between results if both are completed */}
          {(result && resultColC) && (
            <div className="flex bg-slate-100/90 border border-slate-200/50 p-1.5 rounded-xl self-start gap-1 p-1 max-w-md shadow-sm">
              <button
                onClick={() => setActiveTab('file-f')}
                className={`flex-1 min-w-[150px] py-2 px-4 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'file-f'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Kết quả Tệp Cột F ({result.matchingCount} dòng khớp)
              </button>
              <button
                onClick={() => setActiveTab('file-c')}
                className={`flex-1 min-w-[150px] py-2 px-4 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'file-c'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Kết quả Tệp Cột C ({resultColC.matchingCount} dòng khớp)
              </button>
            </div>
          )}

          {/* Interactive Statistics & Copiable Report Panel */}
          {activeResult && (
            <StatsDashboard 
              result={activeResult} 
              onReset={handleClearAll} 
            />
          )}

          {/* Download Buttons Area If Process is Successful */}
          {(result || resultColC) && (
            <div className="flex flex-col gap-6">
              {result && (
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block bg-indigo-50/50 self-start px-3 py-1 rounded-full border border-indigo-100/30">
                    Tải về Tệp Gốc 1 (Mã SKU Cột F)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                      <span className="text-xs font-bold text-slate-800 block">1. Tệp Kết Quả Chuẩn Hóa Cột F</span>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Mức giá mới được dán đè thay thế vào cột H, định dạng số đã được lược bỏ đuôi .00 thừa hiệu quả.
                      </p>
                      <button
                        onClick={() => downloadResultFile('file-f')}
                        className="mt-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải Tệp_Kết_Quả_Đã_Sửa_F.xlsx
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                      <span className="text-xs font-bold text-slate-800 block">2. Tệp Phân Tích Cột F</span>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Báo cáo chi tiết gồm các nhóm đã dán giá thành công và nhóm chưa tìm thấy giá để phân tích.
                      </p>
                      <button
                        onClick={() => downloadComparisonFile('file-f')}
                        className="mt-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải Đối_Chiếu_Mã_F.xlsx
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {resultColC && (
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                  <span className="text-xs font-bold text-sky-600 uppercase tracking-wider block bg-sky-50/50 self-start px-3 py-1 rounded-full border border-sky-100/30">
                    Tải về Tệp Gốc 2 (Mã SKU Cột C)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                      <span className="text-xs font-bold text-slate-800 block">1. Tệp Kết Quả Chuẩn Hóa Cột C</span>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Dò đối chiếu SKU từ Cột C của tệp gốc thứ 2 để tự động dán và sửa đè mức giá từ tệp giá mới phù hợp.
                      </p>
                      <button
                        onClick={() => downloadResultFile('file-c')}
                        className="mt-2 w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải Tệp_Kết_Quả_Đã_Sửa_C.xlsx
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                      <span className="text-xs font-bold text-slate-800 block">2. Tệp Phân Tích Cột C</span>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Tách nhóm SKU thành công vs thất bại để dễ theo dõi sự trùng khớp trong bảng tệp gốc thứ 2.
                      </p>
                      <button
                        onClick={() => downloadComparisonFile('file-c')}
                        className="mt-2 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải Đối_Chiếu_Mã_C.xlsx
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview Grid Sheets */}
          {activeResult && (
            <MatchTable result={activeResult} />
          )}

          {/* Real-time Operation Logs Console Section */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm shadow-slate-100">
            <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100">
              <Terminal className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Nhật Ký Thực Thi (Console)</span>
            </div>
            
            {logs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Chờ tệp tải lên để bắt đầu xuất nhật ký xử lý dữ liệu...
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto font-mono text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-150">
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-2 items-start leading-relaxed">
                    <span className="text-slate-450 shrink-0">[{log.timestamp}]</span>
                    <span className={`
                      ${log.type === 'success' ? 'text-emerald-600 font-semibold' : ''}
                      ${log.type === 'error' ? 'text-rose-600 font-bold' : ''}
                      ${log.type === 'warn' ? 'text-amber-600 font-medium' : ''}
                      ${log.type === 'info' ? 'text-slate-600' : ''}
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
    </div>
  );
}
