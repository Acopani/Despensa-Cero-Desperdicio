import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AlertCircle, Camera, CheckCircle2, Edit3, Flashlight, Loader2, Search, X } from 'lucide-react';
import { AddProductBottomSheet } from '@/features/inventory/AddProductBottomSheet';
import { AppPermissionState, PermissionDialog } from '@/shared/components/PermissionDialog';
import { InventoryItem } from '@/types';
import { lookupProduct, ProductLookupResult } from './productLookup';

interface ScannerScreenProps {
  onClose: () => void;
  onSaveProduct: (product: InventoryItem) => void;
}

interface CameraOption {
  id: string;
  label: string;
}

const READER_ID = 'despensa-barcode-reader';
const CAMERA_STORAGE_KEY = 'despensa_camera_id';
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
];

function cameraErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (!window.isSecureContext) return 'La cámara requiere HTTPS o abrir la aplicación desde localhost.';
  if (/NotAllowed|Permission|denied/i.test(text)) return 'El permiso de cámara fue rechazado. Habilítalo desde la configuración del navegador y vuelve a abrir el escáner.';
  if (/NotFound|DevicesNotFound|no camera/i.test(text)) return 'No se encontró ninguna cámara disponible en este dispositivo.';
  if (/NotReadable|TrackStart|Could not start/i.test(text)) return 'Otra aplicación está usando la cámara. Ciérrala e inténtalo de nuevo.';
  return `No se pudo iniciar la cámara: ${text}`;
}

export function ScannerScreen({ onClose, onSaveProduct }: ScannerScreenProps) {
  const [torchActive, setTorchActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStartRequested, setCameraStartRequested] = useState(false);
  const [permissionDialogState, setPermissionDialogState] = useState<AppPermissionState | null>(null);
  const [permissionPending, setPermissionPending] = useState(false);
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [message, setMessage] = useState('Preparando lector de códigos…');
  const [manualBarcode, setManualBarcode] = useState('');
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'missing' | 'error'>('idle');
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [detectedProduct, setDetectedProduct] = useState<Partial<ProductLookupResult>>({});
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraInitializationStartedRef = useRef(false);
  const processingRef = useRef(false);
  const switchingCameraRef = useRef(false);
  const lastBarcodeRef = useRef('');

  const pauseScanner = () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) {
      try { scanner.pause(true); } catch { /* El lector ya puede estar pausado. */ }
    }
  };

  const resumeScanner = () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) {
      try {
        scanner.resume();
        setMessage('Alinea el código de barras dentro del marco');
      } catch { /* Se mantiene disponible la entrada manual. */ }
    }
  };

  const processBarcode = async (value: string) => {
    const barcode = value.trim();
    if (!barcode || processingRef.current || barcode === lastBarcodeRef.current) return;
    processingRef.current = true;
    lastBarcodeRef.current = barcode;
    pauseScanner();
    setManualBarcode(barcode);
    setLookupState('loading');
    setMessage(`Código ${barcode} detectado. Buscando producto…`);

    try {
      const product = await lookupProduct(barcode);
      if (product) {
        setDetectedProduct(product);
        setLookupState('found');
        setMessage(`${product.name} encontrado`);
      } else {
        setDetectedProduct({ barcode });
        setLookupState('missing');
        setMessage('Producto no encontrado. Completa sus datos para registrarlo.');
      }
    } catch (error) {
      console.warn('No se pudo consultar el producto', error);
      setDetectedProduct({ barcode });
      setLookupState('error');
      setMessage('No fue posible consultar Open Food Facts. Puedes añadirlo manualmente.');
    } finally {
      processingRef.current = false;
      setShowBottomSheet(true);
    }
  };

  const startCamera = async (scanner: Html5Qrcode, cameraId: string) => {
    await scanner.start(
      cameraId,
      {
        fps: 12,
        qrbox: (width, height) => ({
          width: Math.max(180, Math.min(Math.floor(width * 0.86), 360)),
          height: Math.max(100, Math.min(Math.floor(height * 0.42), 180)),
        }),
        aspectRatio: 1.777778,
        disableFlip: true,
      },
      (decodedText) => void processBarcode(decodedText),
      () => undefined,
    );
  };

  useEffect(() => {
    let active = true;

    async function detectCameraPermission() {
      if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
        if (active) {
          setPermissionDialogState('unsupported');
          setMessage(cameraErrorMessage(new Error('La cámara no está disponible en este contexto')));
        }
        return;
      }

      try {
        if (!navigator.permissions?.query) throw new Error('Permissions API no disponible');
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (!active) return;
        if (permission.state === 'granted') {
          setCameraStartRequested(true);
        } else {
          setPermissionDialogState(permission.state === 'denied' ? 'denied' : 'prompt');
          setMessage(permission.state === 'denied' ? 'El permiso de cámara está bloqueado.' : 'Confirma el acceso para iniciar la cámara.');
        }
      } catch {
        if (active) {
          setPermissionDialogState('prompt');
          setMessage('Confirma el acceso para iniciar la cámara.');
        }
      }
    }

    void detectCameraPermission();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!cameraStartRequested || cameraInitializationStartedRef.current) return;
    cameraInitializationStartedRef.current = true;
    let cancelled = false;
    const scanner = new Html5Qrcode(READER_ID, { formatsToSupport: SUPPORTED_FORMATS, verbose: false });
    scannerRef.current = scanner;

    async function initializeScanner() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('La API de cámara no está disponible');
        if (!window.isSecureContext) throw new Error('Se requiere un contexto seguro');

        const detectedCameras = await Html5Qrcode.getCameras();
        if (cancelled) return;
        if (!detectedCameras.length) throw new Error('No camera found');

        setCameras(detectedCameras);
        const savedCameraId = localStorage.getItem(CAMERA_STORAGE_KEY);
        const initialCamera = detectedCameras.find((camera) => camera.id === savedCameraId) || detectedCameras[0];
        await startCamera(scanner, initialCamera.id);

        if (cancelled) {
          await scanner.stop();
          return;
        }
        setSelectedCameraId(initialCamera.id);
        localStorage.setItem(CAMERA_STORAGE_KEY, initialCamera.id);
        setCameraReady(true);
        setLookupState('idle');
        setPermissionDialogState(null);
        setMessage('Alinea el código de barras dentro del marco');
      } catch (error) {
        if (!cancelled) {
          console.warn('No se pudo iniciar html5-qrcode', error);
          const errorMessage = cameraErrorMessage(error);
          setCameraReady(false);
          setLookupState('error');
          setMessage(errorMessage);
          if (/NotAllowed|Permission|denied/i.test(error instanceof Error ? error.message : String(error))) {
            setPermissionDialogState('denied');
          } else {
            setPermissionDialogState(null);
          }
        }
      } finally {
        if (!cancelled) setPermissionPending(false);
      }
    }

    void initializeScanner();
    return () => {
      cancelled = true;
      scannerRef.current = null;
      if (scanner.isScanning) {
        void scanner.stop().then(() => scanner.clear()).catch(() => undefined);
      } else {
        scanner.clear();
      }
    };
  }, [cameraStartRequested]);

  const confirmCameraPermission = () => {
    setPermissionPending(true);
    setCameraStartRequested(true);
  };

  const dismissCameraPermission = () => {
    setPermissionDialogState(null);
    setMessage('Cámara no activada. Puedes escribir el código o usar la entrada manual.');
  };

  const switchCamera = async (cameraId: string) => {
    const scanner = scannerRef.current;
    if (!scanner || !cameraId || cameraId === selectedCameraId || switchingCameraRef.current) return;

    const previousCameraId = selectedCameraId;
    switchingCameraRef.current = true;
    setCameraReady(false);
    setTorchActive(false);
    setMessage('Cambiando de cámara…');

    try {
      if (scanner.isScanning) await scanner.stop();
      await startCamera(scanner, cameraId);
      setSelectedCameraId(cameraId);
      localStorage.setItem(CAMERA_STORAGE_KEY, cameraId);
      setCameraReady(true);
      setLookupState('idle');
      setMessage('Alinea el código de barras dentro del marco');
    } catch (error) {
      console.warn('No se pudo cambiar de cámara', error);
      setLookupState('error');
      setMessage(cameraErrorMessage(error));

      if (previousCameraId && !scanner.isScanning) {
        try {
          await startCamera(scanner, previousCameraId);
          setCameraReady(true);
          setMessage('No se pudo abrir esa cámara. Se restauró la cámara anterior.');
        } catch { /* La entrada manual continúa disponible. */ }
      }
    } finally {
      switchingCameraRef.current = false;
    }
  };

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner?.isScanning) return;
    const next = !torchActive;
    try {
      await scanner.applyVideoConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchActive(next);
    } catch {
      setMessage('La linterna no está disponible en esta cámara.');
    }
  };

  const lookupManualBarcode = () => {
    lastBarcodeRef.current = '';
    void processBarcode(manualBarcode);
  };

  const openManualForm = () => {
    pauseScanner();
    setDetectedProduct({ barcode: manualBarcode });
    setShowBottomSheet(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black font-sans text-white overflow-hidden flex flex-col justify-between">
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#182018] to-black">
        <div id={READER_ID} className="w-full h-full overflow-hidden [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover [&_video]:!border-0 [&_canvas]:!hidden" />
        <div className="pointer-events-none absolute inset-0 bg-black/30" />
      </div>

      <div className="relative z-10 grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-3 px-4 pt-8 pb-4">
        <button onClick={onClose} aria-label="Cerrar escáner" className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md active:scale-90"><X className="w-7 h-7" /></button>
        <label className="min-w-0 h-11 px-3 rounded-full bg-black/55 backdrop-blur-md flex items-center gap-2 border border-white/20">
          <Camera className="w-4 h-4 shrink-0 text-[#81c784]" />
          <span className="sr-only">Cámara activa</span>
          <select
            value={selectedCameraId}
            onChange={(event) => void switchCamera(event.target.value)}
            disabled={!cameras.length || switchingCameraRef.current}
            className="min-w-0 w-full bg-transparent text-white text-xs font-semibold outline-none truncate disabled:opacity-60 [&_option]:text-black"
          >
            {!selectedCameraId && <option value="">Selecciona una cámara</option>}
            {cameras.map((camera, index) => <option key={camera.id} value={camera.id}>{camera.label || `Cámara ${index + 1}`}</option>)}
          </select>
        </label>
        <button onClick={() => void toggleTorch()} disabled={!cameraReady} aria-label="Linterna" className={`w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md active:scale-90 disabled:opacity-40 ${torchActive ? 'bg-[#4caf50]' : 'bg-white/20'}`}><Flashlight className="w-6 h-6" /></button>
      </div>

      <div className="pointer-events-none relative z-10 flex-grow flex flex-col items-center justify-center">
        <div className="w-72 md:w-96 h-48 relative">
          {['top-0 left-0 border-t-4 border-l-4 rounded-tl-xl','top-0 right-0 border-t-4 border-r-4 rounded-tr-xl','bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl','bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl'].map((classes) => <div key={classes} className={`absolute w-9 h-9 border-[#4caf50] ${classes}`} />)}
          <div className="w-full h-full bg-white/5 rounded-xl shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]">{cameraReady && <div className="scan-line absolute left-2 right-2 h-0.5 bg-[#4caf50] shadow-[0_0_12px_2px_rgba(76,175,80,0.8)]" />}</div>
        </div>
        <div role="status" className="mt-7 mx-6 max-w-md text-center text-xs font-semibold bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-2">
          {lookupState === 'loading' || (!cameraReady && lookupState === 'idle') ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : lookupState === 'found' ? <CheckCircle2 className="w-4 h-4 text-[#81c784] shrink-0" /> : lookupState === 'error' ? <AlertCircle className="w-4 h-4 text-[#ffb74d] shrink-0" /> : null}
          <span>{message}</span>
        </div>
      </div>

      <div className="relative z-10 pb-8 px-6 flex flex-col items-center gap-3">
        <div className="w-full max-w-sm flex gap-2">
          <input value={manualBarcode} onChange={(event) => setManualBarcode(event.target.value.replace(/\D/g, ''))} onKeyDown={(event) => event.key === 'Enter' && lookupManualBarcode()} inputMode="numeric" placeholder="Escribe el código de barras" className="min-w-0 flex-1 bg-white/95 text-[#1a1c1c] rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#4caf50]" />
          <button onClick={lookupManualBarcode} disabled={!manualBarcode || lookupState === 'loading'} aria-label="Buscar código" className="w-12 h-12 rounded-full bg-[#006e1c] flex items-center justify-center disabled:opacity-50"><Search className="w-5 h-5" /></button>
        </div>
        <button onClick={openManualForm} className="text-white px-6 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 bg-white/15 backdrop-blur-md"><Edit3 className="w-4 h-4" /> Entrada manual</button>
      </div>

      <PermissionDialog
        open={permissionDialogState !== null}
        kind="camera"
        state={permissionDialogState || 'prompt'}
        pending={permissionPending}
        onConfirm={confirmCameraPermission}
        onCancel={dismissCameraPermission}
      />

      <AddProductBottomSheet
        isOpen={showBottomSheet}
        initialProduct={detectedProduct}
        onClose={() => {
          setShowBottomSheet(false);
          lastBarcodeRef.current = '';
          setLookupState('idle');
          resumeScanner();
        }}
        onSaveProduct={(item) => {
          onSaveProduct(item);
          setShowBottomSheet(false);
          onClose();
        }}
      />
    </div>
  );
}
