'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Check, FileText } from 'lucide-react';

interface OCRScannerProps {
  type: 'placa' | 'nota-fiscal' | 'documento';
  onResult: (data: any) => void;
  onClose?: () => void;
}

// Usa API routes do Next.js (mesmo domínio)

const titles = {
  'placa': 'Ler Placa do Veículo',
  'nota-fiscal': 'Escanear Nota Fiscal',
  'documento': 'Ler Documento (CNH/CRLV)',
};

const descriptions = {
  'placa': 'Tire uma foto ou envie uma imagem da placa do veículo',
  'nota-fiscal': 'Envie uma imagem ou PDF da nota fiscal',
  'documento': 'Tire uma foto ou envie uma imagem do documento',
};

export default function OCRScanner({ type, onResult, onClose }: OCRScannerProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a PDF
    const isPdfFile = file.type === 'application/pdf';
    setIsPdf(isPdfFile);

    if (isPdfFile) {
      // For PDF, just show the filename
      setPdfName(file.name);
      setPreview('pdf');
    } else {
      // Preview image
      setPdfName(null);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    await processImage(file);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError('Não foi possível acessar a câmera');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setPreview(canvas.toDataURL('image/jpeg'));
      stopCamera();
      await processImage(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.95);
  };

  const processImage = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/ocr/${type}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        onResult(data.data);
      } else {
        setError(data.message || 'Erro ao processar imagem');
      }
    } catch {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setIsPdf(false);
    setPdfName(null);
    setResult(null);
    setError(null);
    stopCamera();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1F1F1F] border border-[#333333] rounded-2xl w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-[#333333] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{titles[type]}</h2>
            <p className="text-sm text-[#6B7280] mt-1">{descriptions[type]}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#333333] rounded-lg transition-colors text-[#94a3b8]"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {showCamera ? (
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-xl bg-black"
              />
              <div className="flex gap-3 justify-center">
                <button
                  onClick={capturePhoto}
                  className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                >
                  <Camera className="inline mr-2" size={20} />
                  Capturar
                </button>
                <button
                  onClick={stopCamera}
                  className="px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              {isPdf ? (
                <div className="w-full rounded-xl p-8 bg-[#2a2a2a] flex flex-col items-center justify-center gap-3">
                  <FileText size={48} className="text-red-400" />
                  <p className="text-white font-medium">{pdfName}</p>
                  <p className="text-sm text-[#6B7280]">Arquivo PDF</p>
                </div>
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full rounded-xl max-h-64 object-contain bg-black"
                />
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 text-[#22c55e]">
                  <Loader2 className="animate-spin" size={20} />
                  <span>{isPdf ? 'Processando PDF...' : 'Processando imagem...'}</span>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {result && (
                <div className="p-4 bg-[#22c55e]/20 border border-[#22c55e]/50 rounded-xl">
                  <div className="flex items-center gap-2 text-[#22c55e] mb-2">
                    <Check size={20} />
                    <span className="font-medium">Dados extraídos com sucesso!</span>
                  </div>
                  {type === 'placa' && result.plate && (
                    <p className="text-white text-2xl font-mono font-bold">{result.plate}</p>
                  )}
                  {type === 'documento' && (
                    <div className="text-sm text-[#94a3b8] space-y-1">
                      <p>Tipo: <span className="text-white">{result.tipo}</span></p>
                      {result.nome && <p>Nome: <span className="text-white">{result.nome}</span></p>}
                      {result.cpf && <p>CPF: <span className="text-white">{result.cpf}</span></p>}
                      {result.placa && <p>Placa: <span className="text-white">{result.placa}</span></p>}
                    </div>
                  )}
                  {type === 'nota-fiscal' && (
                    <div className="text-sm text-[#94a3b8] space-y-1">
                      {result.numeroNF && <p>NF: <span className="text-white">{result.numeroNF}</span></p>}
                      {result.cnpj && <p>CNPJ: <span className="text-white">{result.cnpj}</span></p>}
                      {result.valorTotal && <p>Total: <span className="text-white">R$ {result.valorTotal.toFixed(2)}</span></p>}
                      {result.itens?.length > 0 && <p>{result.itens.length} itens detectados</p>}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={reset}
                className="w-full px-6 py-3 border border-[#333333] rounded-xl text-[#94a3b8] hover:bg-[#333333] transition-colors"
              >
                Nova Leitura
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Upload area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#333333] rounded-xl p-8 text-center cursor-pointer hover:border-[#22c55e]/50 transition-colors"
              >
                <Upload className="mx-auto mb-4 text-[#6B7280]" size={40} />
                <p className="text-[#94a3b8]">
                  {type === 'nota-fiscal'
                    ? 'Clique para selecionar uma imagem ou PDF'
                    : 'Clique para selecionar uma imagem'}
                </p>
                <p className="text-sm text-[#6B7280] mt-1">ou arraste e solte aqui</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={type === 'nota-fiscal' ? 'image/*,.pdf,application/pdf' : 'image/*'}
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-[#333333]" />
                <span className="text-[#6B7280] text-sm">ou</span>
                <div className="flex-1 h-px bg-[#333333]" />
              </div>

              <button
                onClick={startCamera}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#166534] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
              >
                <Camera size={20} />
                Usar Câmera
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
