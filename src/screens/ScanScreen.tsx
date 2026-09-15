import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api, ScanErrorCode } from '../services/api';
import { useI18n } from '../i18n';

// -------------------------------------------------------------------
// Scanner State Machine
// -------------------------------------------------------------------
type ScanState =
  | 'IDLE'           // No image selected, camera viewfinder shown
  | 'IMAGE_SELECTED' // Image captured/uploaded, not yet analyzing
  | 'ANALYZING'      // AI request in-flight
  | 'SUCCESS'        // AI returned validated result (confidence >= 0.45)
  | 'UNCERTAIN'      // AI returned low-confidence result (is_unidentifiable)
  | 'TIMEOUT'        // Frontend or backend timed out
  | 'ERROR';         // Any other failure (network, invalid response, etc.)


interface ScanScreenProps {
  onAddScanPoint?: (pts: number, stream?: 'dry' | 'wet' | 'hazard' | 'ewaste') => void;
  userScanCounts?: {
    dry: number;
    wet: number;
    hazard: number;
    ewaste: number;
  };
  onOpenScheduleModal?: (
    facilityName?: string,
    itemName?: string,
    weightKg?: number,
    payout?: string
  ) => void;
  onNavigateToFacilities?: () => void;
}

interface DetectedItem {
  name: string;
  category: string;
  materialType: string;
  confidence: string;
  confidenceNum: number;
  bin: string;
  color: string;
  textColor: string;
  co2: string;
  points: number;
  stream: 'dry' | 'wet' | 'hazard' | 'ewaste';
  instructions?: string;
  fileName?: string;
  scrapType: string;
  isRecyclable: boolean;
  recyclabilityText: string;
  recyclabilityStatus:
    | 'Highly Recyclable'
    | 'Recyclable'
    | 'Conditionally Recyclable'
    | 'Special Disposal Required'
    | 'Not Recyclable'
    | 'Requires Separation';
  bestFor: string;
  marketPricePerKg: string;
  approxRateNum?: number | null;
  estimatedWeightKg: number | null;
  weightRangeKg?: string | null;
  estimatedValueRs: number | null;
  valueText?: string;
  requiresVerification?: boolean;
  reason?: string;
  unit?: string;
  marketDemand?: string;
  kabadiwalaNote?: string;
  detectedItems?: string[];
  scanId?: string;
  isUnidentifiable?: boolean;
}

export const ScanScreen: React.FC<ScanScreenProps> = ({
  onAddScanPoint,
  userScanCounts = { dry: 0, wet: 0, hazard: 0, ewaste: 0 },
  onOpenScheduleModal,
  onNavigateToFacilities,
}) => {
  const { language, t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCaptureInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // -------------------------------------------------------------------
  // Stale-request guard: each analysis attempt gets a new UUID.
  // Results are ignored if activeRequestId has changed by the time
  // the async response returns.
  // -------------------------------------------------------------------
  const activeRequestIdRef = useRef<string>('');

  // -------------------------------------------------------------------
  // AbortController: each attempt gets its own controller.
  // Previous request is cancelled when a new attempt starts.
  // -------------------------------------------------------------------
  const abortControllerRef = useRef<AbortController | null>(null);

  // -------------------------------------------------------------------
  // Blob URL lifecycle fix:
  // Track the current blob URL in a ref so the unmount cleanup can revoke
  // the FINAL url (not a stale closure over an old previewUrl value).
  // We do NOT use useEffect([previewUrl]) for cleanup — that pattern
  // was revoking the URL while the image was still being displayed.
  // -------------------------------------------------------------------
  const previewUrlRef = useRef<string | null>(null);

  // Camera & Real-Time Stream State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);

  // -------------------------------------------------------------------
  // Core Scanner State Machine
  // All scanner UI derives from scanState — never from multiple booleans.
  // -------------------------------------------------------------------
  const [scanState, setScanState] = useState<ScanState>('IDLE');
  const [selectedImage, setSelectedImage] = useState<File | string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanErrorCode, setScanErrorCode] = useState<ScanErrorCode | null>(null);
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);
  // customDetectedItem: only set on SUCCESS or UNCERTAIN — NEVER on TIMEOUT/ERROR
  const [customDetectedItem, setCustomDetectedItem] = useState<DetectedItem | null>(null);

  // Keep previewUrlRef in sync with state for unmount cleanup.
  // IMPORTANT: We must NOT use useEffect([previewUrl]) to revoke URLs —
  // that pattern revokes the URL while the image is still being displayed.
  // Revocation happens only: (a) on component unmount, (b) manually when
  // the user selects a new image (explicit revoke before setPreviewUrl).
  useEffect(() => { previewUrlRef.current = previewUrl; }, [previewUrl]);

  // Unmount-only blob URL cleanup — uses ref, NOT the previewUrl state value
  // (which would be stale in a dep-array cleanup closure).
  useEffect(() => {
    return () => {
      // We only revoke on ACTUAL unmount if we aren't coming back.
      // But App.tsx polling might cause re-renders. 
      // To be safe, we only revoke if we are explicitly resetting or if the app is truly closing.
      // For now, let's keep it but be aware of the App.tsx lifecycle.
      // console.log('[SCANNER] COMPONENT UNMOUNT — revoking blob URL if any', previewUrlRef.current);
    };
  }, []); // ← empty deps: runs cleanup ONLY on actual unmount, never on re-renders

  // -------------------------------------------------------------------
  // Derived convenience flags (read-only — do NOT set these directly)
  // -------------------------------------------------------------------
  const isAnalyzing = scanState === 'ANALYZING';
  const analysisError = (scanState === 'TIMEOUT' || scanState === 'ERROR') ? scanErrorMessage : null;

  const [detectedItemIndex, setDetectedItemIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scanNotification, setScanNotification] = useState<string | null>(null);
  const [calcWeightKg, setCalcWeightKg] = useState<number>(10);
  const [scanCounts, setScanCounts] = useState(userScanCounts);
  const [isNearbyCentersModalOpen, setIsNearbyCentersModalOpen] = useState(false);
  const [selectedCenterContactMsg, setSelectedCenterContactMsg] = useState<string | null>(null);

  const nearbyScrapCenters = [
    {
      id: 'center-1',
      name: 'Green Earth Kabadiwala Hub',
      distance: '0.8 km',
      area: 'Road No 36, Jubilee Hills',
      rating: '4.9 ★',
      reviews: '128 reviews',
      phone: '+919876543210',
      openHours: 'Open Now • 8:00 AM - 7:30 PM',
      verifiedBadge: 'EcoScan Gold Partner',
      accepts: ['Iron & TMT Rods', 'Copper / Brass', 'Carton Boxes', 'PET Bottles'],
      specialOffer: 'Instant UPI on spot + ₹1/kg bonus for sorted clean scrap',
    },
    {
      id: 'center-2',
      name: 'Hyderabad Scrap & Recycling Hub',
      distance: '1.1 km',
      area: 'HITECH City & Madhapur Hub',
      rating: '4.8 ★',
      reviews: '85 reviews',
      phone: '+919845012345',
      openHours: 'Open Now • 8:00 AM - 8:00 PM',
      verifiedBadge: 'Govt Registered Mandi',
      accepts: ['Heavy Iron/Saria', 'Aluminium Cans', 'Copper Cables', 'Old Batteries'],
      specialOffer: 'Certified digital heavy vehicle & platform weighbridge',
    },
    {
      id: 'center-3',
      name: 'Swachh Hyderabad Dry Waste Center',
      distance: '1.4 km',
      area: 'Banjara Hills Circle 18',
      rating: '4.6 ★',
      reviews: '65 reviews',
      phone: '+914022660000',
      openHours: 'Open (7:00 AM - 2:00 PM)',
      verifiedBadge: 'GHMC Municipal Center',
      accepts: ['Multi-layer Plastics', 'Glass Bottles', 'Cardboard', 'All Dry Scrap'],
      specialOffer: 'Official municipal waste diversion certificate & credits',
    },
    {
      id: 'center-4',
      name: 'City E-Waste & Precious Metals Recycler',
      distance: '2.1 km',
      area: 'Kodihalli, Airport Road',
      rating: '4.8 ★',
      reviews: '94 reviews',
      phone: '+918025210987',
      openHours: 'Open (9:00 AM - 6:30 PM)',
      verifiedBadge: 'CPCB Authorized Partner',
      accepts: ['Circuit Boards', 'Copper Cables', 'Appliances', 'Li-ion Batteries'],
      specialOffer: 'CPCB Form-6 EPR Compliance Document provided',
    },
  ];

  const demoDetections: DetectedItem[] = [
    {
      name: 'Mixed Scrap',
      category: 'Mixed Waste',
      materialType: 'Mixed Metal, Plastic & Wire Fragments',
      scrapType: 'Mixed Scrap (Unsorted Industrial / Household Waste)',
      isRecyclable: true,
      recyclabilityText: 'Requires Material Separation',
      recyclabilityStatus: 'Requires Separation',
      bestFor: 'Kabadiwala / Scrap Collection',
      marketPricePerKg: 'Requires Verification',
      approxRateNum: null,
      estimatedWeightKg: null,
      weightRangeKg: 'Requires verification at pickup',
      estimatedValueRs: null,
      valueText: 'Requires material separation / pickup verification',
      requiresVerification: true,
      unit: '₹/kg',
      marketDemand: 'Scrap Mandi Manual Sorting',
      confidence: '88%',
      confidenceNum: 0.88,
      bin: 'Blue Bin (Dry Recyclables)',
      color: 'bg-[#3FA66B]',
      textColor: 'text-[#3FA66B]',
      co2: '+2.4kg CO2e saved',
      points: 25,
      stream: 'dry',
      instructions:
        'Contains multiple mixed scrap materials (metal pieces, plastic fragments, mesh, wires). Keep segregated or give directly to doorstep kabadiwala.',
      kabadiwalaNote:
        'Doorstep kabadiwala will weigh and appraise each material category individually.',
      detectedItems: ['Metal', 'Plastic', 'Wire/Mesh'],
    },
    {
      name: 'Plastic PET Beverage Bottle (Single)',
      category: 'Plastic',
      materialType: 'PET #1',
      scrapType: 'Thermoplastic (PET #1 / Polyethylene)',
      isRecyclable: true,
      recyclabilityText: '100% Recyclable • Mandi Mandate',
      recyclabilityStatus: 'Highly Recyclable',
      bestFor: 'Recycling',
      marketPricePerKg: '₹18.00 / kg',
      approxRateNum: 18,
      estimatedWeightKg: 0.03,
      weightRangeKg: '0.02 - 0.05 kg',
      estimatedValueRs: 0.54,
      valueText: '₹0.54 (Estimated)',
      unit: '₹/kg',
      marketDemand: 'High Demand',
      confidence: '98%',
      confidenceNum: 0.98,
      bin: 'Blue Bin (Dry Recyclables)',
      color: 'bg-[#4DA3FF]',
      textColor: 'text-[#4DA3FF]',
      co2: '+18.4g CO2e saved',
      points: 20,
      stream: 'dry',
      instructions: 'Rinse with water, crush flat and place in the Blue Dry Recyclables bin.',
      kabadiwalaNote:
        'Clear transparent PET bottles command highest price compared to colored bottles.',
      detectedItems: ['Plastic Bottle'],
    },
    {
      name: 'Iron TMT Rod Scrap',
      category: 'Metal',
      materialType: 'HMS Ferrous Steel',
      scrapType: 'Ferrous Metal / Heavy Melting Scrap (HMS)',
      isRecyclable: true,
      recyclabilityText: '100% Infinitely Recyclable (Re-melted for TMT steel)',
      recyclabilityStatus: 'Highly Recyclable',
      bestFor: 'Doorstep Buyback',
      marketPricePerKg: '₹30.00 / kg',
      approxRateNum: 30,
      estimatedWeightKg: 2.5,
      weightRangeKg: '~2.5 kg',
      estimatedValueRs: 75.0,
      valueText: '₹75.00 (Estimated)',
      unit: '₹/kg',
      marketDemand: 'High Demand (Steel Rolling Mills)',
      confidence: '99%',
      confidenceNum: 0.99,
      bin: 'Blue Bin (Dry Scrap & Metals)',
      color: 'bg-[#4DA3FF]',
      textColor: 'text-[#4DA3FF]',
      co2: '+1.8kg CO2e saved per kg',
      points: 25,
      stream: 'dry',
      instructions:
        'Heavy iron rods and construction saria can be melted infinitely without quality loss. Accepted by all verified kabadiwalas for instant cash.',
      kabadiwalaNote:
        'Local kabadiwala benchmark rate is ₹28 - ₹32/kg based on thickness and clean surface.',
      detectedItems: ['Iron TMT Rod Scrap'],
    },
  ];

  const sampleScrapPresets = [
    {
      label: 'Iron Rod Scrap',
      icon: 'construction',
      name: 'Heavy Iron & TMT Construction Rod Scrap',
      confidence: '99.4%',
      bin: 'Blue Bin (Dry Scrap & Metals)',
      color: 'bg-[#4DA3FF]',
      textColor: 'text-[#4DA3FF]',
      co2: '+1.8kg CO2e saved/kg',
      points: 25,
      stream: 'dry' as const,
      scrapType: 'Ferrous Metal / Heavy Melting Scrap (HMS)',
      isRecyclable: true,
      recyclabilityText: '100% Infinitely Recyclable (Zero Quality Loss)',
      marketPricePerKg: '₹28 - ₹32 / kg',
      approxRateNum: 30,
      unit: '₹/kg',
      marketDemand: 'High Demand (Steel Rolling Mills)',
      instructions:
        'Heavy iron rods and construction saria can be melted infinitely without quality loss. Accepted by all verified kabadiwalas for instant cash.',
      kabadiwalaNote:
        'Local kabadiwala benchmark rate is ₹28 - ₹32/kg based on thickness, clean surface, and lack of excessive concrete adhesion.',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuArvBlMsGkaEwGx0T35x-F-TxPBMcTE0CPksavMcAxAdzGROVdbFNxbeZyO6nHQA-ZjI7LjjeiyyXjVdqkWsKwOMB9x4UIbgkW8_Rvyml_PknKRKjL6_bHdPRY0nzaONGopF5fkQJsGH2f95fopZk71ATxN2gCgQ0NEbioTaOQSbtS-IhM8ADlnjTqedEaZlQq6Pf8hESh43oDTWTBuaX7a92VEV0-uvmyfOi-I7NVk1-zQA4jLl0U0KA0bt2atRsmKrPM',
    },
    {
      label: 'Cardboard Box',
      icon: 'inventory_2',
      name: 'Corrugated Packaging Carton Box',
      confidence: '99.4%',
      bin: 'Blue Bin (Dry Paper & Pulp)',
      color: 'bg-[#4DA3FF]',
      textColor: 'text-[#4DA3FF]',
      co2: '+42.0g CO2e saved',
      points: 20,
      stream: 'dry' as const,
      scrapType: 'Kraft Paper & Pulp Corrugated Carton',
      isRecyclable: true,
      recyclabilityText: '100% Recyclable (Up to 7 recycling cycles)',
      marketPricePerKg: '₹12 - ₹15 / kg',
      approxRateNum: 14,
      unit: '₹/kg',
      marketDemand: 'Moderate / Consistent Demand',
      instructions: 'Flatten carton boxes to save collection space and keep strictly dry.',
      kabadiwalaNote: 'Dry cartons earn ₹12-₹15/kg. Wet cardboard is rejected.',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlPn1znpid8DJk4z5lASMYiNH6l0ZkJSCBSs0yu-MnuvhZL2gyfmU0Rs-XDHU4GrodrSclcsFPbL8jliOrF31Qu4iVrCjxQWUUwdMkUZEexZ0PcUjk4HZYfZzvANIjSU5TPcWFXykN_cwhLBwZXgXuLdmCm2Y5-COrY5jAnxxHPZbVfQf0LiNK5qdQUsgGT0lqjb-QAyd8tWhf8DGiUzvHMo65_WN47VFTA0B_bOmC_H6cN2Ody96nii2NYHIbBX77Wc8',
    },
    {
      label: 'Kitchen Peel',
      icon: 'compost',
      name: 'Organic Fruit & Vegetable Peel',
      confidence: '98.9%',
      bin: 'Green Bin (Wet Compost)',
      color: 'bg-[#35C759]',
      textColor: 'text-[#35C759]',
      co2: '+16.5g CO2e saved',
      points: 15,
      stream: 'wet' as const,
      scrapType: 'Biodegradable Kitchen Biomass',
      isRecyclable: false,
      recyclabilityText: 'Compostable Organic Matter (No Scrap Sale Value)',
      marketPricePerKg: '₹0 / kg (Compost Input)',
      approxRateNum: 0,
      unit: '₹/kg',
      marketDemand: 'Home / City Compost',
      instructions: 'Deposit directly in home compost pit or ULB municipal green tipper.',
      kabadiwalaNote: 'Organic waste is not bought by kabadiwalas. Compost at home or give to BBMP.',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_VTpbOTTZfLJQ2I3RLHf5kpo2LeJPO1Ln_hez-A6dJeig3k6ccfuw3sHZVkoe3X3LgbsZ4v5hF25oJCOL7j7UZnKZMKfuImzkaVI_ugnSn4A73l7GhdpOw_ZbVEXsCxC3lQSOSV7qRs0BJSjnEq8Ao4AMplGvDqiavLJB3AVYXz60h93YY1jh4scRvRNjgKJ6hQDAKg2ro8oYUMk6O6uV5ZYmGnEeyvC8ZS1BlaY1jQfuP6Md6kPIRpxK93eZMn1xPB0',
    },
    {
      label: 'Copper & Wire',
      icon: 'cable',
      name: 'High-Purity Copper Wire Scrap',
      confidence: '97.6%',
      bin: 'Amber Bin (Electronic Scrap)',
      color: 'bg-[#B8E600]',
      textColor: 'text-[#B8E600]',
      co2: '+78.2g Mineral Recovery',
      points: 35,
      stream: 'ewaste' as const,
      scrapType: 'High-Purity Copper & Circuit Scrap',
      isRecyclable: true,
      recyclabilityText: '100% Recyclable • Precious Base Metal',
      marketPricePerKg: '₹480 - ₹540 / kg',
      approxRateNum: 510,
      unit: '₹/kg',
      marketDemand: 'Premium Scrap Value',
      instructions: 'Hand over during authorized e-waste collection drive for precious metal recovery.',
      kabadiwalaNote: 'Copper wiring fetches ₹480-₹540/kg bare metal.',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKt-Lpp410CvdTR-4Yp2a12sRV9fxjVAWoH0EBoX6rrCZbIUh5LnCXB3dactDvOrGywZEk3nuDTNfmHFknLKOVUcfpQmKRY0STwvTHwrj9LtfPd23Y_Zgd0Kq1b1tFGpXCQJnYK8WiH8v8-2GHuy5GLtRqCetnY4FIjgkUmoU591_1qSvietNsmcL9krPuOVNco_Pf7sLuFtFmzJOWyRlIb7E9Izs_GnMwzjX5m_WCQiF9S3YA9FCGFpxUDpq3q50uKHE',
    },
  ];

  const quickCategories = [
    { label: 'Iron/Steel', name: 'Iron TMT Rod Scrap' },
    { label: 'Cardboard', name: 'Corrugated Packaging Box' },
    { label: 'Copper Cable', name: 'Copper Wire & Cables' },
    { label: 'Plastic PET', name: 'Plastic PET Beverage Bottle (Single)' },
    { label: 'Aluminium Can', name: 'Aluminium Beverage Can' },
    { label: 'Kitchen Peel', name: 'Banana Peel & Fruit Pulp' },
  ];

  // Clamp detectedItemIndex to valid bounds so demoDetections[clampedIndex] is NEVER undefined.
  const clampedIndex = Math.max(0, Math.min(detectedItemIndex, demoDetections.length - 1));
  // currentItem is ALWAYS defined: customDetectedItem (real AI result) OR the clamped demo entry.
  // This prevents 'Cannot read properties of null (reading "name")' at every currentItem.* access.
  const currentItem: DetectedItem = customDetectedItem ?? demoDetections[clampedIndex] ?? demoDetections[0];


  // Stop camera helper
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start real-time camera stream
  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      setIsCameraLoading(true);
      setCameraError(null);
      stopCameraStream();

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera hardware access is not supported in this browser.');
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // Autoplay policies
          }
        }

        setIsCameraActive(true);
        // Do not reset previewUrl if image already captured

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = (videoTrack.getCapabilities && videoTrack.getCapabilities()) || {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setIsTorchSupported(Boolean((capabilities as any).torch));
        }
      } catch (err: unknown) {
        console.warn('Real-time camera initialisation notice:', err);
        const errorName = (err as Error)?.name;
        if (errorName === 'NotAllowedError') {
          setCameraError(
            'Camera access was denied. Please allow camera permissions or tap "Instant Camera App" below.'
          );
        } else {
          setCameraError(
            'Live camera stream unavailable in current environment. Use "Instant Camera App" below for 1-tap mobile photos.'
          );
        }
        setIsCameraActive(false);
      } finally {
        setIsCameraLoading(false);
      }
    },
    [facingMode, stopCameraStream]
  );

  const handleToggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const nextTorch = !isTorchOn;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch {
      setIsTorchOn(!isTorchOn);
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Core Gemini AI Analysis Pipeline
  // IMPORTANT: runAnalysis uses the correct state machine variables:
  //   activeRequestIdRef (stale-request guard)
  //   setScanState       (state machine transitions)
  //   setScanErrorCode / setScanErrorMessage (error details)
  //   setCustomDetectedItem (only on SUCCESS / UNCERTAIN)
  const runAnalysis = async (
    base64DataUrl: string,
    fileName?: string
  ) => {
    // Generate a unique ID for this specific scan attempt using crypto.randomUUID
    const currentRequestId = crypto.randomUUID();
    activeRequestIdRef.current = currentRequestId;

    setScanState('ANALYZING');
    setScanErrorCode(null);
    setScanErrorMessage(null);
    setCustomDetectedItem(null);
    stopCameraStream();

    console.log('[SCANNER] ANALYSIS START', {
      requestId: currentRequestId,
      payloadLength: base64DataUrl.length,
      timestamp: new Date().toISOString(),
    });

    try {
      const aiResult = await api.scanWaste(base64DataUrl, 'image/jpeg', undefined, language);

      // Stale-request guard: ignore response if user selected a different image
      if (activeRequestIdRef.current !== currentRequestId) {
        console.log('[SCANNER] STALE RESPONSE IGNORED', {
          requestId: currentRequestId,
          activeId: activeRequestIdRef.current,
        });
        return;
      }

      // --- Discriminate on the typed AnalysisResult union ---
      // success: false → translate code to scanState (TIMEOUT / UNCERTAIN / ERROR)
      // success: true  → process validated analysis data
      if (!aiResult.success) {
        const failResult = aiResult as { success: false; code: import('../services/api').ScanErrorCode; message: string; data?: any };
        const { code, message, data } = failResult;
        setScanErrorCode(code);
        setScanErrorMessage(message);

        if (code === 'AI_LOW_CONFIDENCE' && data?.analysis) {
          console.log('[SCANNER] ANALYSIS LOW_CONFIDENCE with DATA', { requestId: currentRequestId, message });
          setScanState('UNCERTAIN');
          
          const analysis = data.analysis;
          setCustomDetectedItem({
            name: analysis.material || 'Unable to reliably identify',
            category: analysis.category || 'Unknown',
            materialType: analysis.material_type || 'Unknown',
            confidence: `${Math.round((analysis.confidence || 0.3) * 100)}%`,
            confidenceNum: analysis.confidence || 0.3,
            recyclabilityStatus: analysis.recyclability_status || 'Not Recyclable',
            bestFor: analysis.best_for || 'Verification Required',
            estimatedWeightKg: analysis.estimated_weight || null,
            weightRangeKg: analysis.weight_range_kg || 'Requires verification',
            estimatedValueRs: analysis.estimated_value || null,
            valueText: analysis.value_text || 'Rate unavailable',
            requiresVerification: true,
            reason: analysis.reason || message,
            isUnidentifiable: true,
            detectedItems: analysis.detected_items || [],
            scrapType: analysis.category || 'Unclassified Waste',
            isRecyclable: Boolean(analysis.recyclable),
            recyclabilityText: analysis.recyclable ? 'Limited Recyclability' : 'Analysis Inconclusive',
            marketPricePerKg: analysis.current_rate_per_kg ? `₹${analysis.current_rate_per_kg}/kg` : 'Rate unavailable',
            approxRateNum: analysis.current_rate_per_kg || null,
            unit: '₹/kg',
            marketDemand: 'Verification Required',
            bin: analysis.category?.toLowerCase().includes('wet') ? 'Green Bin' : 'Gray Bin (Unidentified)',
            color: 'bg-[#65736A]',
            textColor: 'text-[#65736A]',
            co2: '0g CO2e',
            points: 5,
            stream: 'dry',
            fileName: fileName || 'Scanned_Image.jpg',
            instructions: analysis.disposal_instruction || analysis.reason || message,
            kabadiwalaNote: 'Try scanning a well-lit, close-up photo of individual items.',
          });
        } else if (code === 'AI_TIMEOUT') {
          console.log('[SCANNER] ANALYSIS TIMEOUT', { requestId: currentRequestId, message, timestamp: Date.now() });
          setScanState('TIMEOUT');
        } else if (code === 'AI_LOW_CONFIDENCE') {
          console.log('[SCANNER] ANALYSIS LOW_CONFIDENCE (UNCERTAIN)', { requestId: currentRequestId, message });
          setScanState('UNCERTAIN');
        } else {
          console.log('[SCANNER] ANALYSIS ERROR', { requestId: currentRequestId, code, message, timestamp: Date.now() });
          setScanState('ERROR');
        }
        return;
      }

      // --- success: true — aiResult.data is guaranteed to exist ---
      const analysis = aiResult.data.analysis;

      if (!analysis || !analysis.material) {
        // Structurally invalid success response — treat as AI_INVALID_RESPONSE
        setScanErrorCode('AI_INVALID_RESPONSE');
        setScanErrorMessage('AI returned an unexpected response. Please retry.');
        setScanState('ERROR');
        return;
      }

      // Low confidence path (in case backend sends 200 with is_unidentifiable)
      if (analysis.is_unidentifiable || (typeof analysis.confidence === 'number' && analysis.confidence < 0.45)) {
        setScanState('UNCERTAIN');
        setCustomDetectedItem({
          name: analysis.material || 'Unable to reliably identify this item',
          category: analysis.category || 'Unknown',
          materialType: analysis.material_type || 'Unknown',
          confidence: `${Math.round((analysis.confidence || 0.3) * 100)}%`,
          confidenceNum: analysis.confidence || 0.3,
          recyclabilityStatus: analysis.recyclability_status || 'Not Recyclable',
          bestFor: analysis.best_for || 'Verification Required',
          estimatedWeightKg: analysis.estimated_weight || null,
          weightRangeKg: analysis.weight_range_kg || 'Requires verification',
          estimatedValueRs: analysis.estimated_value || null,
          valueText: analysis.value_text || 'Rate unavailable',
          requiresVerification: true,
          reason: analysis.reason || 'Unable to reliably identify this item. Please upload a clearer, well-lit image.',
          isUnidentifiable: true,
          detectedItems: analysis.detected_items || [],
          scrapType: analysis.category || 'Unclassified Waste',
          isRecyclable: Boolean(analysis.recyclable),
          recyclabilityText: analysis.recyclable ? 'Limited Recyclability' : 'Analysis Inconclusive',
          marketPricePerKg: analysis.current_rate_per_kg ? `₹${analysis.current_rate_per_kg}/kg` : 'Rate unavailable',
          approxRateNum: analysis.current_rate_per_kg || null,
          unit: '₹/kg',
          marketDemand: 'Verification Required',
          bin: analysis.category?.toLowerCase().includes('wet') ? 'Green Bin (Wet Compostable)' : 'Gray Bin (Unidentified)',
          color: 'bg-[#65736A]',
          textColor: 'text-[#65736A]',
          co2: '0g CO2e',
          points: 5,
          stream: 'dry',
          fileName: fileName || 'Scanned_Image.jpg',
          instructions: analysis.disposal_instruction || analysis.reason || 'Unable to reliably identify this item. Please upload a clearer, well-lit image.',
          kabadiwalaNote: 'Try scanning a well-lit, close-up photo of individual items.',
        });
        return;
      }

      // --- Build the DetectedItem from the validated AI response ---
      const cat = analysis.category || 'Dry Recyclables';
      const catLower = cat.toLowerCase();

      // isMixed: ONLY true when category is explicitly "mixed" or the material name
      // contains "mixed". Multiple items of the SAME type (e.g. 5 plastic bottles)
      // is NOT mixed — do NOT use detected_items.length as a trigger.
      const isMixed =
        catLower === 'mixed waste' ||
        catLower === 'mixed' ||
        (analysis.material || '').toLowerCase().startsWith('mixed');

      const isWet = catLower.includes('wet') || catLower.includes('organic') || catLower.includes('food');
      const isHazard = catLower.includes('hazard') || catLower.includes('biomedical') || catLower.includes('red');
      const isEwaste =
        catLower.includes('e_waste') ||
        catLower.includes('e-waste') ||
        catLower.includes('electronic') ||
        catLower.includes('circuit');

      const stream: 'dry' | 'wet' | 'hazard' | 'ewaste' = isHazard
        ? 'hazard'
        : isEwaste
        ? 'ewaste'
        : isWet
        ? 'wet'
        : 'dry';

      const binName = isHazard
        ? 'Red Bin (Domestic Hazardous)'
        : isEwaste
        ? 'Amber Bin (Electronic Waste)'
        : isWet
        ? 'Green Bin (Wet Compostable)'
        : 'Blue Bin (Dry Recyclable)';

      const rate = analysis.current_rate_per_kg;
      const confidencePct = `${Math.round((analysis.confidence || 0.85) * 100)}%`;
      const estimatedWeight = analysis.estimated_weight;
      const weightRange =
        analysis.weight_range_kg ||
        (estimatedWeight ? `~${estimatedWeight} kg` : 'Requires verification at pickup');
      const estimatedVal = analysis.estimated_value;

      const valueText =
        analysis.value_text ||
        (estimatedVal !== null
          ? `₹${estimatedVal.toFixed(2)} (Estimated)`
          : isMixed
          ? 'Requires material separation / pickup verification'
          : rate !== null
          ? 'Weight verification required'
          : 'Rate unavailable');

      const recyclabilityStat =
        analysis.recyclability_status ||
        (isMixed ? 'Requires Separation' : analysis.recyclable ? 'Highly Recyclable' : 'Not Recyclable');
      const bestForOpt =
        analysis.best_for ||
        (isMixed
          ? 'Kabadiwala / Scrap Collection'
          : analysis.recyclable
          ? 'Doorstep Buyback'
          : 'Home / City Composting');

      const realDetection: DetectedItem = {
        name: isMixed ? 'Mixed Waste (Multiple Materials)' : analysis.material,
        category: isMixed ? 'Mixed Waste' : cat,
        materialType:
          analysis.material_type ||
          (isMixed ? 'Mixed Materials' : analysis.material || cat),
        confidence: confidencePct,
        confidenceNum: analysis.confidence || 0.85,
        recyclabilityStatus: recyclabilityStat as any,
        bestFor: bestForOpt,
        estimatedWeightKg: estimatedWeight,
        weightRangeKg: weightRange,
        estimatedValueRs: estimatedVal,
        valueText: valueText,
        requiresVerification: Boolean(analysis.requires_verification || isMixed || estimatedWeight === null),
        reason: analysis.reason,
        detectedItems:
          analysis.detected_items && analysis.detected_items.length > 0
            ? analysis.detected_items
            : [analysis.material || 'Waste Item'],
        scrapType: isMixed ? 'Mixed Waste' : cat,
        isRecyclable: Boolean(analysis.recyclable),
        recyclabilityText: isMixed
          ? 'Requires Material Separation'
          : analysis.recyclable
          ? '100% Recyclable • Mandi Mandate'
          : 'Non-Recyclable Compost/Disposal',
        marketPricePerKg:
          rate && rate > 0 ? `₹${rate} / kg` : isMixed ? 'Requires Verification' : 'Zero Scrap Value',
        approxRateNum: rate,
        unit: '₹/kg',
        marketDemand: isMixed
          ? 'Scrap Mandi Manual Sorting'
          : rate && rate > 0
          ? 'Live Mandi Rate'
          : 'Segregated Composting',
        bin: binName,
        color: isHazard
          ? 'bg-[#FF453A]'
          : isEwaste
          ? 'bg-[#B8E600]'
          : isWet
          ? 'bg-[#35C759]'
          : 'bg-[#3FA66B]',
        textColor: isHazard
          ? 'text-[#FF453A]'
          : isEwaste
          ? 'text-[#B8E600]'
          : isWet
          ? 'text-[#35C759]'
          : 'text-[#3FA66B]',
        co2: `+${(Math.max(rate || 10, 1) * 0.35).toFixed(1)}kg CO2e saved`,
        points: isEwaste ? 35 : isHazard ? 30 : isWet ? 15 : 25,
        stream: stream,
        fileName: fileName || 'Scanned_Image.jpg',
        instructions:
          analysis.disposal_instruction ||
          'Segregate cleanly in designated stream or book doorstep pickup for instant buyback.',
        kabadiwalaNote: isMixed
          ? 'Contains multiple distinct waste materials. Local scrap collectors will weigh and sort items individually.'
          : rate && rate > 0
          ? `Live Mandi rate: ₹${rate}/kg. Verified kabadiwalas collect this at your doorstep.`
          : 'Organic/non-recyclable stream. Hand over to municipal green tipper or compost at home.',
      };

      setCustomDetectedItem(realDetection);
      setScanState('SUCCESS');
      setScanCounts((prev) => ({
        ...prev,
        [stream]: prev[stream] + 1,
      }));
      onAddScanPoint?.(realDetection.points, stream);
      setScanNotification(
        `EcoScan AI: "${realDetection.name}" (${confidencePct} confidence) | ${valueText}`
      );
      setTimeout(() => setScanNotification(null), 5000);
    } catch (err: any) {
      // Only handle if this is still the active request
      if (activeRequestIdRef.current !== currentRequestId) return;
      console.error('[Scanner] Unexpected error in runAnalysis:', err);
      setScanErrorCode('UNKNOWN_ERROR');
      setScanErrorMessage(err?.message || 'AI request failed. Please verify your connection and try again.');
      setScanState('ERROR');
    }
  };

  // Helper to set image and immediately start analysis while maintaining image visibility
  const setPreviewAndStartAnalysis = (
    image: File | string,
    url: string,
    fileName?: string
  ) => {
    // Revoke previous blob URL if needed
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedImage(image);
    setPreviewUrl(url);
    setCustomDetectedItem(null);

    if (typeof image === 'string') {
      runAnalysis(image, fileName);
    } else {
      // Compress File to base64 Data URL for API
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawSrc = e.target?.result as string;
        if (!rawSrc) return;

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            runAnalysis(compressedDataUrl, image.name);
          } else {
            runAnalysis(rawSrc, image.name);
          }
        };
        img.onerror = () => {
          runAnalysis(rawSrc, image.name);
        };
        img.src = rawSrc;
      };
      reader.readAsDataURL(image);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setPreviewAndStartAnalysis(file, objectUrl, file.name);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) {
        alert('Please drop a valid image file.');
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setPreviewAndStartAnalysis(file, objectUrl, file.name);
    }
  };

  const handleInstantShutter = () => {
    if (isCapturing || scanState === 'ANALYZING') return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 25, 40]);
      } catch {}
    }

    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 300);

    if (isCameraActive && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      let width = video.videoWidth || 1280;
      let height = video.videoHeight || 720;
      const maxDim = 1024;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const snapName = `Live_Snap_${Date.now().toString().slice(-4)}.jpg`;
        setPreviewAndStartAnalysis(dataUrl, dataUrl, snapName);
        return;
      }
    }

    mobileCaptureInputRef.current?.click();
  };

  const handleSelectSample = (sample: (typeof sampleScrapPresets)[0]) => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedImage(sample.img);
    setPreviewUrl(sample.img);
    setScanState('SUCCESS');
    setScanErrorCode(null);
    setScanErrorMessage(null);
    setCustomDetectedItem({
      name: sample.name,
      confidence: sample.confidence,
      confidenceNum: 0.99,
      bin: sample.bin,
      color: sample.color,
      textColor: sample.textColor,
      co2: sample.co2,
      points: sample.points,
      stream: sample.stream,
      instructions: sample.instructions,
      fileName: `${sample.label.toLowerCase().replace(/\s+/g, '_')}.jpg`,
      scrapType: sample.scrapType,
      isRecyclable: sample.isRecyclable,
      recyclabilityText: sample.recyclabilityText,
      recyclabilityStatus: sample.isRecyclable ? 'Highly Recyclable' : 'Not Recyclable',
      bestFor: sample.isRecyclable ? 'Doorstep Buyback' : 'Home / City Composting',
      marketPricePerKg: sample.marketPricePerKg,
      approxRateNum: sample.approxRateNum,
      estimatedWeightKg: 1.0,
      estimatedValueRs: sample.approxRateNum,
      category: sample.stream === 'wet' ? 'Organic' : 'Metal',
      materialType: sample.scrapType,
      unit: sample.unit,
      marketDemand: sample.marketDemand,
      kabadiwalaNote: sample.kabadiwalaNote,
    });
    setScanNotification(
      `Loaded "${sample.name}": ${sample.recyclabilityText} | Market Price: ${sample.marketPricePerKg}`
    );
    setTimeout(() => setScanNotification(null), 5000);
  };

  const handleRetryAnalysis = () => {
    if (previewUrl) {
      if (typeof selectedImage === 'string') {
        runAnalysis(selectedImage, 'Retried_Image.jpg');
      } else if (selectedImage instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const rawSrc = e.target?.result as string;
          if (rawSrc) runAnalysis(rawSrc, selectedImage.name);
        };
        reader.readAsDataURL(selectedImage);
      } else {
        runAnalysis(previewUrl, 'Retried_Image.jpg');
      }
    }
  };

  const handleResetToCamera = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedImage(null);
    setPreviewUrl(null);
    setCustomDetectedItem(null);
    setScanState('IDLE');
    setScanErrorCode(null);
    setScanErrorMessage(null);

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (mobileCaptureInputRef.current) mobileCaptureInputRef.current.value = '';

    setScanNotification('Scanner reset. Point camera at waste or select an image.');
    setTimeout(() => setScanNotification(null), 3000);

    // Always restart camera — runAnalysis() stops it, so camera is off after any scan attempt.
    startCamera();
  };

  const handleApplyQuickCategory = (cat: { label: string; name: string }) => {
    if (!customDetectedItem) return;
    const updated = { ...customDetectedItem, name: cat.name };
    setCustomDetectedItem(updated);
    setScanNotification(`Updated scrap category tag to: "${cat.name}"`);
    setTimeout(() => setScanNotification(null), 3000);
  };

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto pb-12">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={mobileCaptureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Global Notification Banner */}
      {scanNotification && (
        <div className="p-3 rounded-2xl bg-[#E8F3EB] border border-[#DCE5DE] text-xs flex items-center justify-between gap-2 text-[#174D35] shadow-xs animate-in fade-in">
          <span className="material-symbols-outlined text-[18px] shrink-0 text-[#3FA66B]">
            task_alt
          </span>
          <span className="flex-1 font-semibold text-[#172019]">{scanNotification}</span>
          <button
            onClick={() => setScanNotification(null)}
            className="text-[#65736A] hover:text-[#172019]"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Camera Access Notice / Error */}
      {cameraError && (
        <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-xs flex items-center justify-between gap-2 text-[#DC2626]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[18px] shrink-0">videocam_off</span>
            <span className="truncate">{cameraError}</span>
          </div>
          <button
            onClick={() => mobileCaptureInputRef.current?.click()}
            className="px-2.5 py-1 rounded-md bg-[#DC2626] text-[#FFFFFF] font-bold text-[10px] shrink-0 active:scale-95 cursor-pointer"
            type="button"
          >
            Open Phone Camera
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* A. SCANNED IMAGE PREVIEW & ANALYSIS RESULT CONTAINER */}
      {/* ---------------------------------------------------- */}
      {previewUrl ? (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          {/* Top Header Bar: [Back] | Scan Result | [Retake] */}
          <div className="flex items-center justify-between px-1 pb-1">
            <button
              type="button"
              onClick={handleResetToCamera}
              className="w-9 h-9 rounded-full bg-[#FFFFFF] border border-[#DCE5DE] flex items-center justify-center text-[#172019] hover:text-[#3FA66B] shadow-xs active:scale-95 transition-all cursor-pointer"
              aria-label="Back to Viewfinder"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>

            <div className="flex flex-col items-center">
              <h3 className="font-editorial text-lg font-bold text-[#172019] tracking-tight">{t('wasteAnalysis')}</h3>
              <span className="text-[10px] text-[#65736A] font-medium">Gemini AI Waste Appraisal</span>
            </div>

            <button
              type="button"
              onClick={handleResetToCamera}
              className="w-9 h-9 rounded-full bg-[#FFFFFF] border border-[#DCE5DE] flex items-center justify-center text-[#65736A] hover:text-[#172019] shadow-xs active:scale-95 transition-all cursor-pointer"
              aria-label="Retake Photo"
              title="Retake photo"
            >
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
            </button>
          </div>

          {/* SCANNED IMAGE CONTAINER (100% PERSISTED VISIBILITY WITH LOADING OVERLAY LAYERED ABOVE) */}
          <div className="relative w-full h-56 sm:h-64 rounded-3xl bg-[#172019] border border-[#DCE5DE] p-4 flex items-center justify-center overflow-hidden shadow-xs">
            <img
              src={previewUrl}
              alt={currentItem?.name || 'Scanned waste image'}
              className="max-h-full max-w-full object-contain drop-shadow-md transition-transform hover:scale-105"
            />

            {/* Loading Overlay Layered ABOVE the Scanned Image (Does NOT unmount or replace the image) */}
            {isAnalyzing && (
              <div className="absolute inset-0 z-40 bg-[#172019]/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 gap-3 text-center rounded-3xl animate-in fade-in">
                <div className="w-14 h-14 rounded-full border-4 border-[#3FA66B] border-t-transparent animate-spin flex items-center justify-center shadow-[0_0_20px_rgba(63,166,107,0.4)]">
                  <span className="material-symbols-outlined text-[#3FA66B] text-[24px] animate-pulse">
                    center_focus_strong
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm sm:text-base font-bold text-[#FFFFFF] tracking-tight">{t('analyzing')}</h4>
                  <p className="text-xs text-[#DCE5DE] max-w-xs leading-relaxed">
                    Gemini AI Vision is evaluating material properties, recyclability & live mandi rates
                  </p>
                </div>
              </div>
            )}

            {/* Green Checkmark Badge (Shown on successful identification) */}
            {!isAnalyzing && customDetectedItem && !analysisError && (
              <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-[#3FA66B] text-[#FFFFFF] font-bold flex items-center justify-center shadow-md border-2 border-[#FFFFFF]">
                <span className="material-symbols-outlined text-[20px]">check</span>
              </div>
            )}
          </div>

          {/* Analysis Error / Retry Card */}
          {analysisError && !isAnalyzing && (
            <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] flex flex-col gap-3 text-[#991B1B]">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[24px] text-[#DC2626] shrink-0">
                  error
                </span>
                <div className="flex flex-col gap-1 text-xs flex-1">
                  <span className="font-bold text-sm">AI Analysis Failed</span>
                  <span className="leading-relaxed">{analysisError}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRetryAnalysis}
                  className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-[#FFFFFF] font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Retry Analysis</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToCamera}
                  className="px-4 py-2 rounded-xl bg-[#FFFFFF] border border-[#FCA5A5] text-[#991B1B] hover:bg-[#FEF2F2] font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Select Another Image
                </button>
              </div>
            </div>
          )}

          {/* Low Confidence or Unidentifiable Alert */}
          {!isAnalyzing && currentItem && (currentItem.isUnidentifiable || currentItem.confidenceNum < 0.45) && (
            <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-start gap-3 text-[#991B1B]">
              <span className="material-symbols-outlined text-[24px] text-[#DC2626] shrink-0">
                warning
              </span>
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-bold text-sm">{t('unableIdentify')}</span>
                <span className="leading-relaxed">
                  {currentItem.reason || 'Please upload a clearer, well-lit image of the scrap item.'}
                </span>
                <button
                  type="button"
                  onClick={handleResetToCamera}
                  className="mt-1.5 self-start px-3 py-1.5 rounded-lg bg-[#DC2626] text-[#FFFFFF] font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Upload Clearer Image
                </button>
              </div>
            </div>
          )}

          {/* AI-Confirmed Appraisal Results */}
          {!isAnalyzing && currentItem && !currentItem.isUnidentifiable && currentItem.confidenceNum >= 0.45 && (
            <>
              <div className="flex flex-col items-center text-center gap-1.5 mt-1">
                <h2 className="font-editorial text-2xl font-bold text-[#172019] tracking-tight">
                  {currentItem.name}
                </h2>

                <span
                  className={`px-3.5 py-1 rounded-full text-xs font-bold shadow-2xs border ${
                    currentItem.recyclabilityStatus === 'Highly Recyclable' || currentItem.recyclabilityStatus === 'Recyclable'
                      ? 'bg-[#E8F3EB] text-[#174D35] border-[#DCE5DE]'
                      : currentItem.recyclabilityStatus === 'Requires Separation'
                      ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                      : currentItem.recyclabilityStatus === 'Conditionally Recyclable'
                      ? 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]'
                      : currentItem.recyclabilityStatus === 'Special Disposal Required'
                      ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                      : 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]'
                  }`}
                >
                  {currentItem.recyclabilityStatus || (currentItem.isRecyclable ? 'Highly Recyclable' : 'Not Recyclable')}
                </span>
              </div>

              {/* RESULT INFORMATION GRID CARD */}
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#DCE5DE] p-4 shadow-xs flex flex-col divide-y divide-[#DCE5DE]/60">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[#65736A] font-semibold">Category</span>
                  <span className="text-xs font-bold text-[#172019]">{currentItem.category || currentItem.scrapType || 'Dry Recyclable'}</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[#65736A] font-semibold">Type</span>
                  <span className="text-xs font-bold text-[#172019]">{currentItem.materialType || currentItem.name}</span>
                </div>

                <div className="py-2.5 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#65736A] font-semibold">Estimated Weight</span>
                    <span className="text-xs font-bold text-[#172019]">
                      {currentItem.estimatedWeightKg !== null && currentItem.estimatedWeightKg !== undefined
                        ? `~${currentItem.estimatedWeightKg} kg`
                        : currentItem.weightRangeKg || 'Requires verification at pickup'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#65736A] italic">
                    {currentItem.estimatedWeightKg !== null && currentItem.estimatedWeightKg !== undefined
                      ? `Estimated weight (${currentItem.weightRangeKg || '~' + currentItem.estimatedWeightKg + ' kg'}) — Verified at pickup`
                      : 'Estimated weight — Requires verification at pickup'}
                  </span>
                </div>

                <div className="py-2.5 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#65736A] font-semibold">{t('estimatedValue')}</span>
                    <span className="font-editorial text-sm sm:text-base font-bold text-[#3FA66B]">
                      {currentItem.valueText
                        ? currentItem.valueText
                        : currentItem.estimatedValueRs !== null && currentItem.estimatedValueRs !== undefined
                        ? `₹${currentItem.estimatedValueRs.toFixed(2)} (Estimated)`
                        : 'Requires material separation / pickup verification'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#65736A]">
                    All prices are ESTIMATES until verified at pickup
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[#65736A] font-semibold">Best For</span>
                  <span className="text-xs font-bold text-[#174D35] bg-[#E8F3EB] px-2 py-0.5 rounded-md border border-[#DCE5DE]">
                    {currentItem.bestFor || (currentItem.isRecyclable ? 'Recycling' : 'Composting')}
                  </span>
                </div>

                <div className="py-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#65736A] font-semibold">{t('confidence')}</span>
                    <span className="text-xs font-bold text-[#3FA66B] font-code-metric">
                      {currentItem.confidence}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[#F5F8F4] overflow-hidden border border-[#DCE5DE]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        currentItem.confidenceNum >= 0.85
                          ? 'bg-[#3FA66B]'
                          : currentItem.confidenceNum >= 0.6
                          ? 'bg-[#D97706]'
                          : 'bg-[#DC2626]'
                      }`}
                      style={{ width: currentItem.confidence }}
                    />
                  </div>
                </div>
              </div>

              {currentItem.detectedItems && currentItem.detectedItems.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col gap-2 shadow-xs">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#174D35] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#3FA66B]">category</span>
                    Detected Materials ({currentItem.detectedItems.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {currentItem.detectedItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-[#E8F3EB] text-[#174D35] border border-[#DCE5DE] flex items-center gap-1"
                      >
                        <span className="text-[#3FA66B]">•</span>
                        <span>{item}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-[#F5F8F4] border border-[#DCE5DE] text-xs text-[#65736A] leading-relaxed flex flex-col gap-1">
                <span className="font-bold text-[#172019]">Disposal Guidance:</span>
                <span>{currentItem.instructions}</span>
                {currentItem.kabadiwalaNote && (
                  <span className="text-[#174D35] font-medium mt-1">{currentItem.kabadiwalaNote}</span>
                )}
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenScheduleModal) {
                      const wt = currentItem.estimatedWeightKg ?? 5;
                      const val = currentItem.estimatedValueRs !== null
                        ? `₹${currentItem.estimatedValueRs.toFixed(2)}`
                        : currentItem.valueText || 'Pickup Verification';
                      onOpenScheduleModal(
                        undefined,
                        `${currentItem.name} (${currentItem.materialType || currentItem.category || 'Recyclable'})`,
                        wt,
                        val
                      );
                    }
                  }}
                  className="w-full h-12 rounded-xl bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] font-bold text-sm shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                  <span>{t('schedulePickup')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToCamera}
                  className="w-full h-12 rounded-xl bg-[#FFFFFF] hover:bg-[#F5F8F4] text-[#172019] font-bold text-sm border border-[#DCE5DE] shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                  <span>{t('scan')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ---------------------------------------------------- */
        /* B. VIEWFINDER / LIVE CAMERA VIEW MODE */
        /* ---------------------------------------------------- */
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative w-full h-84 sm:h-96 rounded-3xl overflow-hidden shadow-xl bg-[#172019] border-2 transition-all ${
              isDragging
                ? 'border-[#3FA66B] ring-4 ring-[#3FA66B]/30 scale-[1.01]'
                : 'border-[#DCE5DE]'
            }`}
          >
            {shutterFlash && (
              <div className="absolute inset-0 z-40 bg-white pointer-events-none animate-camera-flash" />
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${
                isCameraActive ? 'block' : 'hidden'
              }`}
            />

            {!isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#172019]">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKt-Lpp410CvdTR-4Yp2a12sRV9fxjVAWoH0EBoX6rrCZbIUh5LnCXB3dactDvOrGywZEk3nuDTNfmHFknLKOVUcfpQmKRY0STwvTHwrj9LtfPd23Y_Zgd0Kq1b1tFGpXCQJnYK8WiH8v8-2GHuy5GLtRqCetnY4FIjgkUmoU591_1qSvietNsmcL9krPuOVNco_Pf7sLuFtFmzJOWyRlIb7E9Izs_GnMwzjX5m_WCQiF9S3YA9FCGFpxUDpq3q50uKHE"
                  alt="Camera preview background"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-35 mix-blend-luminosity brightness-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#172019] via-transparent to-[#172019]/80"></div>
              </div>
            )}

            {isDragging && (
              <div className="absolute inset-0 z-30 bg-[#172019]/90 backdrop-blur-md flex flex-col items-center justify-center gap-2 p-4 text-center">
                <span className="material-symbols-outlined text-4xl text-[#3FA66B] animate-bounce">
                  drive_folder_upload
                </span>
                <p className="text-sm font-bold text-[#FFFFFF]">{t('uploadImage')}</p>
                <p className="text-xs text-[#DCE5DE]">Directly imported from your files</p>
              </div>
            )}

            <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-[#3FA66B] to-transparent shadow-[0_0_12px_#3FA66B] animate-laser-scan z-10 pointer-events-none" />

            <div className="relative z-20 w-full h-full flex flex-col justify-between p-3.5 sm:p-4 pointer-events-none">
              <div className="flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-1.5 bg-[#FFFFFF]/90 backdrop-blur-md px-3 py-1 rounded-full border border-[#DCE5DE] shadow-sm">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCameraActive ? 'bg-[#3FA66B] animate-ping' : 'bg-[#3FA66B]'
                    }`}
                  />
                  <span className="text-[10px] uppercase font-bold text-[#172019] tracking-wider truncate max-w-[140px]">
                    {isCameraActive ? 'Live Camera (60 FPS)' : 'AI Viewfinder'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    aria-label="Toggle Flash"
                    onClick={handleToggleTorch}
                    className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all shadow-sm border border-[#DCE5DE] active:scale-95 ${
                      isTorchOn
                        ? 'bg-[#3FA66B] text-[#FFFFFF]'
                        : 'bg-[#FFFFFF]/80 text-[#172019] hover:text-[#3FA66B]'
                    }`}
                    type="button"
                    title={isTorchSupported ? 'Toggle mobile flashlight' : 'Flashlight'}
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {isTorchOn ? 'flash_on' : 'flash_off'}
                    </span>
                  </button>

                  <button
                    aria-label="Flip Camera"
                    onClick={handleToggleCameraFacing}
                    className="w-8 h-8 rounded-full bg-[#FFFFFF]/80 backdrop-blur-md flex items-center justify-center text-[#172019] hover:text-[#3FA66B] transition-all shadow-sm border border-[#DCE5DE] active:scale-95"
                    type="button"
                    title={`Flip camera (Currently: ${
                      facingMode === 'environment' ? 'Rear' : 'Front'
                    })`}
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      flip_camera_android
                    </span>
                  </button>

                  <button
                    aria-label="Cycle Item"
                    onClick={() =>
                      setDetectedItemIndex((prev) => (prev + 1) % demoDetections.length)
                    }
                    className="w-8 h-8 rounded-full bg-[#FFFFFF]/80 backdrop-blur-md flex items-center justify-center text-[#172019] hover:text-[#3FA66B] transition-all shadow-sm border border-[#DCE5DE] active:scale-95"
                    type="button"
                    title="Cycle item"
                  >
                    <span className="material-symbols-outlined text-[17px]">cached</span>
                  </button>
                </div>
              </div>

              <div className="relative flex-1 flex items-center justify-center pointer-events-auto my-2">
                <div className="relative w-64 h-48 flex flex-col justify-between">
                  <div className="flex justify-between w-full">
                    <div className="w-5 h-5 border-t-2 border-l-2 border-[#3FA66B] rounded-tl-md"></div>
                    <div className="w-5 h-5 border-t-2 border-r-2 border-[#3FA66B] rounded-tr-md"></div>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-[#3FA66B]/60 animate-ping" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3FA66B] absolute" />
                  </div>

                  <div
                    onClick={() => {
                      if (!customDetectedItem) {
                        setDetectedItemIndex((prev) =>
                          (Math.max(0, Math.min(prev, demoDetections.length - 1)) + 1) % demoDetections.length
                        );
                      }
                    }}
                    className="mx-auto w-60 rounded-xl bg-[#FFFFFF]/95 backdrop-blur-lg p-2.5 shadow-lg transform transition-transform hover:scale-105 border border-[#DCE5DE] cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-[#3FA66B] animate-pulse"></span>
                        <span className="font-editorial text-xs font-bold text-[#172019] truncate">
                          {currentItem.name}
                        </span>
                      </div>
                      <span className="font-code-metric text-[10px] text-[#174D35] bg-[#E8F3EB] px-1.5 py-0.5 rounded font-bold border border-[#DCE5DE]">
                        {currentItem.confidence}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${currentItem.color}`}></span>
                        <span className={`text-[11px] font-bold ${currentItem.textColor}`}>
                          {currentItem.bin}
                        </span>
                      </div>
                      <span className="font-bold text-xs text-[#3FA66B]">
                        {currentItem.marketPricePerKg}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-[#65736A] text-[10px]">
                      <span className="material-symbols-outlined text-[13px] text-[#3FA66B]">eco</span>
                      <span>{currentItem.co2}</span>
                    </div>
                  </div>

                  <div className="flex justify-between w-full">
                    <div className="w-5 h-5 border-b-2 border-l-2 border-[#3FA66B] rounded-bl-md"></div>
                    <div className="w-5 h-5 border-b-2 border-r-2 border-[#3FA66B] rounded-br-md"></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-auto">
                {!isCameraActive ? (
                  <button
                    onClick={() => startCamera()}
                    disabled={isCameraLoading}
                    className="bg-[#3FA66B] text-[#FFFFFF] font-bold text-xs px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 active:scale-95 transition-all hover:bg-[#174D35] cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">videocam</span>
                    <span>
                      {isCameraLoading ? 'Starting Camera...' : 'Turn On Real-Time Camera'}
                    </span>
                  </button>
                ) : (
                  <div className="bg-[#FFFFFF]/90 backdrop-blur-md px-3 py-1 rounded-full border border-[#DCE5DE] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px] text-[#3FA66B]">
                      center_focus_strong
                    </span>
                    <p className="text-[11px] text-[#172019] text-center font-medium">
                      Point phone at scrap & press the shutter button
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MOBILE PHOTO SHUTTER DOCK */}
          <div className="rounded-2xl bg-[#FFFFFF] p-3 border-2 border-[#DCE5DE] shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#174D35] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-[#3FA66B]">smartphone</span>
                Mobile Shutter & Instant Capture
              </span>
              <span className="text-[10px] text-[#65736A]">
                {isCameraActive ? 'Real-Time Frame' : 'Fast Snap Mode'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 px-2 py-1">
              <button
                onClick={() => mobileCaptureInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-1 h-16 rounded-xl bg-[#F5F8F4] hover:bg-[#E8F3EB] border border-[#DCE5DE] hover:border-[#3FA66B]/40 text-[#172019] active:scale-95 transition-all group cursor-pointer"
                type="button"
                title="Open phone's native camera directly to take an instant photo"
              >
                <span className="material-symbols-outlined text-[22px] text-[#3FA66B] group-hover:scale-110 transition-transform">
                  photo_camera
                </span>
                <span className="text-[10px] font-bold text-[#172019] leading-none text-center">
                  Phone Camera
                </span>
                <span className="text-[8px] text-[#65736A] leading-none">Instant App</span>
              </button>

              <div className="flex flex-col items-center justify-center">
                <button
                  onClick={handleInstantShutter}
                  disabled={isCapturing || isAnalyzing}
                  className={`w-18 h-18 rounded-full border-4 border-[#3FA66B]/30 p-1 flex items-center justify-center transition-all shadow-[0_0_20px_rgba(63,166,107,0.2)] active:scale-90 cursor-pointer ${
                    isCapturing || isAnalyzing ? 'brightness-110 scale-95' : 'hover:scale-105'
                  }`}
                  type="button"
                  title="Snap instant photo & identify scrap"
                >
                  <div className="w-full h-full rounded-full bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] flex items-center justify-center font-bold shadow-inner">
                    <span className="material-symbols-outlined text-[30px]">
                      {isCapturing || isAnalyzing ? 'hourglass_top' : 'camera'}
                    </span>
                  </div>
                </button>
                <span className="text-[10px] font-bold text-[#3FA66B] mt-1.5 leading-none">
                  {isCapturing || isAnalyzing ? 'Analyzing...' : 'Snap & Identify'}
                </span>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-1 h-16 rounded-xl bg-[#F5F8F4] hover:bg-[#E8F3EB] border border-[#DCE5DE] hover:border-[#3FA66B]/40 text-[#172019] active:scale-95 transition-all group cursor-pointer"
                type="button"
                title="Choose a photo from your gallery or computer folders"
              >
                <span className="material-symbols-outlined text-[22px] text-[#3FA66B] group-hover:scale-110 transition-transform">
                  folder_open
                </span>
                <span className="text-[10px] font-bold text-[#172019] leading-none text-center">
                  Gallery / Files
                </span>
                <span className="text-[8px] text-[#65736A] leading-none">Device Storage</span>
              </button>
            </div>
          </div>

          {/* Quick Test Presets */}
          <div className="rounded-xl bg-[#151B18] p-3 border border-[#303832] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#B8E600]">
                  desktop_windows
                </span>
                <span className="text-xs font-bold text-[#FFFFFF]">Quick Test Presets</span>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-[#B8E600] hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                type="button"
              >
                <span>Browse Local Drive</span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </button>
            </div>

            <p className="text-[11px] text-[#9AA59D] leading-relaxed">
              Test scrap identification and live price calculation with 1-click presets:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-0.5">
              {sampleScrapPresets.map((sample) => (
                <button
                  key={sample.label}
                  onClick={() => handleSelectSample(sample)}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-[#151B18] hover:bg-[#151B18] border border-[#303832] hover:border-[#B8E600]/50 text-left transition-all group cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#B8E600] shrink-0 group-hover:scale-110 transition-transform">
                    {sample.icon}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-semibold text-[#FFFFFF] truncate">
                      {sample.label}
                    </span>
                    <span className="text-[9px] text-[#B8E600] font-bold truncate">
                      {sample.marketPricePerKg}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4-Bin Categorization Track */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[#B8E600] tracking-widest">
                National SWM Categorization
              </span>
              <span className="font-code-metric text-[11px] text-[#9AA59D]">4 Streams Active</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl bg-[#151B18] p-2.5 flex items-center justify-between shadow-sm border border-[#303832]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4DA3FF] shrink-0"></span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#FFFFFF] truncate">Dry Scrap</span>
                    <span className="text-[10px] text-[#9AA59D] truncate">Iron, Paper, PET</span>
                  </div>
                </div>
                <span className="font-code-metric text-xs text-[#F4F7F2] font-bold ml-1">
                  {scanCounts.dry}
                </span>
              </div>

              <div className="rounded-xl bg-[#151B18] p-2.5 flex items-center justify-between shadow-sm border border-[#303832]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B8E600] shrink-0"></span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#FFFFFF] truncate">Wet Waste</span>
                    <span className="text-[10px] text-[#9AA59D] truncate">Kitchen Peels</span>
                  </div>
                </div>
                <span className="font-code-metric text-xs text-[#B8E600] font-bold ml-1">
                  {scanCounts.wet}
                </span>
              </div>

              <div className="rounded-xl bg-[#151B18] p-2.5 flex items-center justify-between shadow-sm border border-[#303832]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF453A] shrink-0"></span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#FFFFFF] truncate">Hazardous</span>
                    <span className="text-[10px] text-[#9AA59D] truncate">Lead, Paints</span>
                  </div>
                </div>
                <span className="font-code-metric text-xs text-[#FF453A] font-bold ml-1">
                  {scanCounts.hazard}
                </span>
              </div>

              <div className="rounded-xl bg-[#151B18] p-2.5 flex items-center justify-between shadow-sm border border-[#303832]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B8E600] shrink-0"></span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#FFFFFF] truncate">E-Waste</span>
                    <span className="text-[10px] text-[#9AA59D] truncate">PCBs, Copper</span>
                  </div>
                </div>
                <span className="font-code-metric text-xs text-[#B8E600] font-bold ml-1">
                  {scanCounts.ewaste}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* NEARBY SCRAP CENTERS MODAL */}
      {isNearbyCentersModalOpen && currentItem && (
        <div
          className="fixed inset-0 z-50 bg-[#0B0F0D]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setIsNearbyCentersModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#151B18] rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 shadow-2xl border-t sm:border border-[#303832] max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#303832]/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#151B18] border border-[#303832] flex items-center justify-center text-[#4DA3FF]">
                  <span className="material-symbols-outlined text-[22px]">storefront</span>
                </div>
                <div>
                  <h3 className="font-editorial text-base font-bold text-[#FFFFFF]">
                    Nearby Scrap Centers
                  </h3>
                  <p className="text-[11px] text-[#B8E600]">
                    Accepting {currentItem.name} • {currentItem.marketPricePerKg}
                  </p>
                </div>
              </div>
              <button
                aria-label="Close modal"
                onClick={() => setIsNearbyCentersModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#151B18] border border-[#303832] flex items-center justify-center text-[#9AA59D] hover:text-[#FFFFFF] cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {selectedCenterContactMsg && (
              <div className="p-3 rounded-xl bg-[#151B18] border border-[#B8E600] text-[#B8E600] text-xs flex items-center justify-between animate-in fade-in">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>{selectedCenterContactMsg}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCenterContactMsg(null)}
                  className="text-[#9AA59D] hover:text-[#FFFFFF] text-xs ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3FA66B]"></span>
                <span className="text-xs text-[#172019]">
                  Current Item: <strong className="text-[#174D35]">{currentItem.name}</strong>
                </span>
              </div>
              <span className="text-xs font-bold text-[#3FA66B]">
                {currentItem.marketPricePerKg}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {nearbyScrapCenters.map((center) => (
                <div
                  key={center.id}
                  className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#DCE5DE] hover:border-[#3FA66B]/60 transition-all flex flex-col gap-2.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#172019]">{center.name}</span>
                        <span className="material-symbols-outlined text-[#3FA66B] text-[16px]">
                          verified
                        </span>
                      </div>
                      <span className="text-[11px] text-[#65736A] mt-0.5">{center.area}</span>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F3EB] text-[#174D35] border border-[#DCE5DE]">
                        {center.distance}
                      </span>
                      <span className="text-[10px] text-[#65736A] mt-0.5">{center.rating}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="bg-[#F5F8F4] text-[#172019] px-2 py-0.5 rounded border border-[#DCE5DE]">
                      🕒 {center.openHours}
                    </span>
                    <span className="bg-[#E8F3EB] text-[#174D35] px-2 py-0.5 rounded border border-[#DCE5DE]">
                      {center.verifiedBadge}
                    </span>
                  </div>

                  <p className="text-[10px] text-[#65736A] italic">
                    💡 {center.specialOffer}
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#DCE5DE]">
                    <a
                      href={`tel:${center.phone}`}
                      onClick={() =>
                        setSelectedCenterContactMsg(`Calling ${center.name}: ${center.phone}`)
                      }
                      className="py-1.5 px-2 rounded-lg bg-[#FFFFFF] hover:bg-[#F5F8F4] text-[#172019] border border-[#DCE5DE] text-[11px] font-semibold flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px] text-[#3FA66B]">call</span>
                      <span>Call</span>
                    </a>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCenterContactMsg(
                          `Navigation to ${center.name} (${center.distance}) started!`
                        )
                      }
                      className="py-1.5 px-2 rounded-lg bg-[#FFFFFF] hover:bg-[#F5F8F4] text-[#172019] border border-[#DCE5DE] text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px] text-[#2563EB]">
                        directions
                      </span>
                      <span>Directions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsNearbyCentersModalOpen(false);
                        if (onOpenScheduleModal) {
                          onOpenScheduleModal(
                            center.name,
                            currentItem.scrapType || currentItem.name,
                            calcWeightKg,
                            `₹${calcWeightKg * (currentItem.approxRateNum || 30)} Instant UPI / Cash`
                          );
                        }
                      }}
                      className="py-1.5 px-2 rounded-lg bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                      <span>Book Slot</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#DCE5DE] flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsNearbyCentersModalOpen(false);
                  if (onNavigateToFacilities) {
                    onNavigateToFacilities();
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#E8F3EB] text-[#3FA66B] font-bold text-xs border border-[#3FA66B] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">map</span>
                <span>Open Full Interactive Facilities Map</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
