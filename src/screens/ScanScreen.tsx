import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';

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

  // Camera & Real-Time Stream State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);

  // Detection & UI State
  const [detectedItemIndex, setDetectedItemIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [customDetectedItem, setCustomDetectedItem] = useState<DetectedItem | null>(null);
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
      area: '12th Main, HAL 2nd Stage, Indiranagar',
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
      name: 'Bangalore Metal & Paper Mandi Depot',
      distance: '1.1 km',
      area: 'HAL 3rd Stage, Old Airport Road',
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
      name: 'Swachh Bharat Ward 84 DWCC Centre',
      distance: '1.4 km',
      area: 'Near BDA Complex, Indiranagar',
      rating: '4.6 ★',
      reviews: '65 reviews',
      phone: '+918022660000',
      openHours: 'Open (7:00 AM - 2:00 PM)',
      verifiedBadge: 'BBMP Municipal DWCC',
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
    {
      name: 'Aluminium Beverage Can',
      category: 'Metal',
      materialType: 'Aluminium 3004',
      scrapType: 'Non-Ferrous Aluminium Alloy (Grade 3004)',
      isRecyclable: true,
      recyclabilityText: '100% Infinitely Recyclable (Saves 95% energy vs virgin ore)',
      recyclabilityStatus: 'Highly Recyclable',
      bestFor: 'Recycling',
      marketPricePerKg: '₹125.00 / kg',
      approxRateNum: 125,
      estimatedWeightKg: 0.02,
      weightRangeKg: '0.015 - 0.025 kg',
      estimatedValueRs: 2.5,
      valueText: '₹2.50 (Estimated)',
      unit: '₹/kg',
      marketDemand: 'Very High Demand',
      confidence: '98%',
      confidenceNum: 0.98,
      bin: 'Blue Bin (Dry Metal Scrap)',
      color: 'bg-[#4DA3FF]',
      textColor: 'text-[#4DA3FF]',
      co2: '+32.1g CO2e saved',
      points: 25,
      stream: 'dry',
      instructions: 'Empty residual liquids, crush flat to conserve volume for scrap collection.',
      kabadiwalaNote: 'High value scrap. Approx 65-70 standard beverage cans weigh 1 kg.',
      detectedItems: ['Aluminium Beverage Can'],
    },
    {
      name: 'Copper Wire & Cables',
      category: 'Metal',
      materialType: 'Millberry Bare Copper',
      scrapType: 'High-Purity Millberry Copper Wire',
      isRecyclable: true,
      recyclabilityText: '100% High Value Precious Base Metal',
      recyclabilityStatus: 'Highly Recyclable',
      bestFor: 'Doorstep Buyback',
      marketPricePerKg: '₹510.00 / kg',
      approxRateNum: 510,
      estimatedWeightKg: 0.8,
      weightRangeKg: '~0.8 kg',
      estimatedValueRs: 408.0,
      valueText: '₹408.00 (Estimated)',
      unit: '₹/kg',
      marketDemand: 'Premium Highest Scrap Value',
      confidence: '99%',
      confidenceNum: 0.99,
      bin: 'Amber Bin (E-Waste / Metal)',
      color: 'bg-[#B8E600]',
      textColor: 'text-[#B8E600]',
      co2: '+4.2kg CO2e saved per kg',
      points: 35,
      stream: 'ewaste',
      instructions: 'Stripped bright copper earns the highest market payout in India. Keep unmixed.',
      kabadiwalaNote:
        'Stripped bare copper fetches ₹500+/kg. Insulated plastic cable fetches ₹160-₹220/kg.',
      detectedItems: ['Copper Wire & Cables'],
    },
    {
      name: 'Corrugated Packaging Box',
      category: 'Cardboard',
      materialType: 'Kraft Paper Pulp',
      scrapType: 'Kraft Paper & Pulp Corrugated Carton',
      isRecyclable: true,
      recyclabilityText: '100% Recyclable (Up to 7 recycling cycles)',
      recyclabilityStatus: 'Recyclable',
      bestFor: 'Recycling',
      marketPricePerKg: '₹14.00 / kg',
      approxRateNum: 14,
      estimatedWeightKg: 1.2,
      weightRangeKg: '~1.2 kg',
      estimatedValueRs: 16.8,
      valueText: '₹16.80 (Estimated)',
      unit: '₹/kg',
      marketDemand: 'Moderate / Consistent Demand',
      confidence: '99%',
      confidenceNum: 0.99,
      bin: 'Blue Bin (Dry Paper & Pulp)',
      color: 'bg-[#4DA3FF]',
      textColor: 'text-[#4DA3FF]',
      co2: '+42.0g CO2e saved',
      points: 20,
      stream: 'dry',
      instructions:
        'Flatten carton boxes to save collection space and keep strictly away from water and oil.',
      kabadiwalaNote: 'Dry cartons earn ₹12-₹15/kg. Wet or oil-soaked cardboard is rejected by recyclers.',
      detectedItems: ['Corrugated Packaging Box'],
    },
    {
      name: 'Banana Peel & Fruit Pulp',
      category: 'Organic',
      materialType: 'Biomass',
      scrapType: 'Biodegradable Kitchen Biomass',
      isRecyclable: false,
      recyclabilityText: 'Compostable Organic Matter (No Scrap Sale Value)',
      recyclabilityStatus: 'Not Recyclable',
      bestFor: 'Home / City Composting',
      marketPricePerKg: '₹0.00 / kg',
      approxRateNum: 0,
      estimatedWeightKg: 0.5,
      weightRangeKg: '~0.5 kg',
      estimatedValueRs: 0,
      valueText: '₹0.00 (Compost)',
      unit: '₹/kg',
      marketDemand: 'Not Sold to Kabadiwala (Home/City Compost)',
      confidence: '97%',
      confidenceNum: 0.97,
      bin: 'Green Bin (Wet Organic)',
      color: 'bg-[#35C759]',
      textColor: 'text-[#35C759]',
      co2: '+12.0g CO2e saved',
      points: 15,
      stream: 'wet',
      instructions:
        'Transfer directly to wet organic bin or home composting composter for green sovereign credits.',
      kabadiwalaNote:
        'Organic waste is not bought by scrap dealers. Compost at home or give to BBMP/municipal wet collectors.',
      detectedItems: ['Banana Peel & Fruit Pulp'],
    },
  ];

  // Active item is either custom uploaded item or the current demo item
  const currentItem = customDetectedItem || demoDetections[detectedItemIndex];

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
        setUploadedImageSrc(null); // Clear static upload so live camera is visible

        // Check if torch/flashlight is supported
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

  // Toggle between rear and selfie/front camera
  const handleToggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Toggle mobile torch/flashlight if supported
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

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Core Image Analysis Pipeline with Real Gemini AI Integration
  const processUploadedImage = async (
    base64DataUrl: string,
    mimeType: string = 'image/jpeg',
    fileName?: string
  ) => {
    setUploadedImageSrc(base64DataUrl);
    if (fileName) setUploadedFileName(fileName);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setCustomDetectedItem(null);

    // Stop live camera stream if running
    stopCameraStream();

    try {
      // Send image to server-side Gemini AI Vision model
      const aiResult = await api.scanWaste(base64DataUrl, mimeType, undefined, language);
      const analysis = aiResult?.analysis;

      if (!analysis) {
        setUploadedImageSrc(base64DataUrl);
        setCustomDetectedItem({
          name: 'Mixed Scrap / Unverified Waste',
          category: 'Mixed Waste',
          materialType: 'Unclassified Scrap',
          confidence: '50%',
          confidenceNum: 0.5,
          recyclabilityStatus: 'Requires Separation',
          bestFor: 'Kabadiwala / Scrap Collection',
          estimatedWeightKg: null,
          weightRangeKg: 'Requires verification at pickup',
          estimatedValueRs: null,
          valueText: 'Requires material separation / pickup verification',
          requiresVerification: true,
          reason: 'Analysis service returned empty result. Physical verification recommended.',
          isUnidentifiable: false,
          detectedItems: ['Scrap Material'],
          scrapType: 'Mixed Scrap',
          isRecyclable: true,
          recyclabilityText: 'Requires Separation at Pickup',
          marketPricePerKg: 'Requires verification',
          approxRateNum: null,
          unit: '₹/kg',
          marketDemand: 'Doorstep Pickup Verification',
          bin: 'Blue Bin (Dry Recyclables)',
          color: 'bg-[#3FA66B]',
          textColor: 'text-[#3FA66B]',
          co2: '+0.5kg CO2e saved',
          points: 15,
          stream: 'dry',
          fileName: fileName || 'Scanned_Image.jpg',
          instructions: 'Segregate materials into dry/metal/plastic bins or request doorstep inspection.',
          kabadiwalaNote: 'Scrap collectors will weigh and appraise items directly at your doorstep.',
        });
        return;
      }

      // Handle low confidence (< 0.45) or unidentifiable result
      if (analysis.is_unidentifiable || (analysis.confidence !== undefined && analysis.confidence < 0.45)) {
        setUploadedImageSrc(base64DataUrl);
        setCustomDetectedItem({
          name: 'Unidentified / Ambiguous Waste',
          category: 'Other',
          materialType: 'Unknown',
          confidence: `${Math.round((analysis.confidence || 0.3) * 100)}%`,
          confidenceNum: analysis.confidence || 0.3,
          recyclabilityStatus: 'Not Recyclable',
          bestFor: 'Verification Required',
          estimatedWeightKg: null,
          weightRangeKg: 'Requires verification at pickup',
          estimatedValueRs: null,
          valueText: 'Rate unavailable',
          requiresVerification: true,
          reason: analysis.reason || 'Unable to confidently identify the waste. Please upload a clearer image.',
          isUnidentifiable: true,
          detectedItems: [],
          scrapType: 'Unclassified Waste',
          isRecyclable: false,
          recyclabilityText: 'Analysis Inconclusive',
          marketPricePerKg: 'Rate unavailable',
          approxRateNum: null,
          unit: '₹/kg',
          marketDemand: 'Verification Required',
          bin: 'Gray Bin (Unidentified)',
          color: 'bg-[#65736A]',
          textColor: 'text-[#65736A]',
          co2: '0g CO2e',
          points: 5,
          stream: 'dry',
          fileName: fileName || 'Scanned_Image.jpg',
          instructions: 'Unable to confidently identify the waste. Please upload a clearer image.',
          kabadiwalaNote: 'Try scanning a well-lit, close-up photo of individual items.',
        });
        return;
      }

      // Build dynamic detection item from AI result
      const cat = analysis.category || 'Dry Recyclables';
      const catLower = cat.toLowerCase();
      const isMixed =
        catLower.includes('mixed') ||
        (analysis.material || '').toLowerCase().includes('mixed') ||
        (analysis.detected_items && analysis.detected_items.length > 2);

      const isWet = catLower.includes('wet') || catLower.includes('organic') || catLower.includes('food');
      const isHazard = catLower.includes('hazard') || catLower.includes('biomedical') || catLower.includes('red');
      const isEwaste = catLower.includes('e-waste') || catLower.includes('electronic') || catLower.includes('circuit');

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
      const weightRange = analysis.weight_range_kg || (estimatedWeight ? `~${estimatedWeight} kg` : 'Requires verification at pickup');
      const estimatedVal = analysis.estimated_value;
      
      const valueText = analysis.value_text || (estimatedVal !== null
        ? `₹${estimatedVal.toFixed(2)} (Estimated)`
        : isMixed
        ? 'Requires material separation / pickup verification'
        : rate !== null
        ? 'Weight verification required'
        : 'Rate unavailable');

      const recyclabilityStat = analysis.recyclability_status || (isMixed ? 'Requires Separation' : analysis.recyclable ? 'Highly Recyclable' : 'Not Recyclable');
      const bestForOpt = analysis.best_for || (isMixed ? 'Kabadiwala / Scrap Collection' : analysis.recyclable ? 'Doorstep Buyback' : 'Home / City Composting');

      const realDetection: DetectedItem = {
        name: isMixed ? 'Mixed Scrap' : analysis.material || 'Scrap Material',
        category: isMixed ? 'Mixed Waste' : cat,
        materialType: analysis.material_type || (isMixed ? 'Mixed Metal, Plastic & Wire Fragments' : analysis.material || cat),
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
        detectedItems: analysis.detected_items && analysis.detected_items.length > 0 ? analysis.detected_items : [analysis.material || 'Scrap Material'],
        scrapType: `${isMixed ? 'Mixed Scrap' : cat}`,
        isRecyclable: Boolean(analysis.recyclable),
        recyclabilityText: isMixed
          ? 'Requires Material Separation'
          : analysis.recyclable
          ? '100% Recyclable • Mandi Mandate'
          : 'Non-Recyclable Compost/Disposal',
        marketPricePerKg: rate && rate > 0 ? `₹${rate} / kg` : isMixed ? 'Requires Verification' : 'Zero Scrap Value',
        approxRateNum: rate,
        unit: '₹/kg',
        marketDemand: isMixed ? 'Scrap Mandi Manual Sorting' : rate && rate > 0 ? 'Live Mandi Rate' : 'Segregated Composting',
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
        kabadiwalaNote:
          isMixed
            ? 'Contains multiple mixed scrap materials. Local scrap collectors will weigh and sort items individually.'
            : rate && rate > 0
            ? `Live Mandi rate: ₹${rate}/kg. Verified kabadiwalas collect this at your doorstep.`
            : 'Organic/non-recyclable stream. Hand over to municipal green tipper or compost at home.',
      };

      setCustomDetectedItem(realDetection);
      setScanCounts((prev) => ({
        ...prev,
        [stream]: prev[stream] + 1,
      }));
      onAddScanPoint?.(realDetection.points, stream);
      setScanNotification(
        `Gemini AI Identified: "${realDetection.name}" (${confidencePct} confidence) | ${valueText}`
      );
      setTimeout(() => setScanNotification(null), 5000);
    } catch (err) {
      console.warn('[ScanScreen] AI Analysis Request error (using client fallback):', err);
      // REMOVE HARDCODED PET BOTTLE FALLBACK. Return unverified mixed scrap result.
      const fallbackDetection: DetectedItem = {
        name: 'Mixed Scrap / Unverified Waste',
        category: 'Mixed Waste',
        materialType: 'Unclassified Scrap',
        confidence: '50%',
        confidenceNum: 0.5,
        recyclabilityStatus: 'Requires Separation',
        bestFor: 'Kabadiwala / Scrap Collection',
        estimatedWeightKg: null,
        weightRangeKg: 'Requires verification at pickup',
        estimatedValueRs: null,
        valueText: 'Requires material separation / pickup verification',
        requiresVerification: true,
        reason: 'AI service request failed. Doorstep pickup verification required.',
        isUnidentifiable: false,
        detectedItems: ['Mixed Scrap', 'Unsorted Waste'],
        scrapType: 'Mixed Scrap',
        isRecyclable: true,
        recyclabilityText: 'Requires Separation at Pickup',
        marketPricePerKg: 'Requires verification',
        approxRateNum: null,
        unit: '₹/kg',
        marketDemand: 'Doorstep Pickup Verification',
        bin: 'Blue Bin (Dry Recyclables)',
        color: 'bg-[#3FA66B]',
        textColor: 'text-[#3FA66B]',
        co2: '+0.5kg CO2e saved',
        points: 15,
        stream: 'dry',
        fileName: fileName || 'Scanned_Image.jpg',
        instructions: 'Segregate materials into dry/metal/plastic bins or request doorstep inspection.',
        kabadiwalaNote: 'Scrap collectors will weigh and appraise items directly at your doorstep.',
      };
      setUploadedImageSrc(base64DataUrl);
      setCustomDetectedItem(fallbackDetection);
      onAddScanPoint?.(15, 'dry');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Analyze an image file uploaded from computer folders or captured via native mobile camera
  const processUploadedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

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
          processUploadedImage(compressedDataUrl, 'image/jpeg', file.name);
        } else {
          processUploadedImage(rawSrc, file.type || 'image/jpeg', file.name);
        }
      };
      img.onerror = () => {
        processUploadedImage(rawSrc, file.type || 'image/jpeg', file.name);
      };
      img.src = rawSrc;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFile(e.target.files[0]);
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
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // REAL-TIME INSTANT PHOTO SHUTTER FOR MOBILE PHONES & DESKTOPS
  const handleInstantShutter = () => {
    if (isCapturing || isAnalyzing) return;

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
        processUploadedImage(
          dataUrl,
          'image/jpeg',
          `Live_Snap_${Date.now().toString().slice(-4)}.jpg`
        );
        return;
      }
    }

    mobileCaptureInputRef.current?.click();
  };

  // Switch back to Live Camera / Viewfinder
  const handleResetToCamera = () => {
    setUploadedImageSrc(null);
    setUploadedFileName(null);
    setCustomDetectedItem(null);
    setIsAnalyzing(false);
    setAnalysisError(null);

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (mobileCaptureInputRef.current) mobileCaptureInputRef.current.value = '';

    setScanNotification('Reset scanner. Point camera at waste or select an image.');
    setTimeout(() => setScanNotification(null), 3000);

    if (!isCameraActive) {
      startCamera();
    }
  };

  // Preset scrap items
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

  const handleSelectSample = (sample: (typeof sampleScrapPresets)[0]) => {
    setUploadedImageSrc(sample.img);
    setUploadedFileName(sample.name);
    setCustomDetectedItem({
      name: sample.name,
      confidence: sample.confidence,
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
      marketPricePerKg: sample.marketPricePerKg,
      approxRateNum: sample.approxRateNum,
      unit: sample.unit,
      marketDemand: sample.marketDemand,
      kabadiwalaNote: sample.kabadiwalaNote,
    });
    setScanNotification(
      `Loaded "${sample.name}": ${sample.recyclabilityText} | Market Price: ${sample.marketPricePerKg}`
    );
    setTimeout(() => setScanNotification(null), 5000);
  };

  // Quick Material selector for real-time live snaps
  const quickCategories = [
    { label: 'Mixed Scrap', stream: 'dry' as const, rate: 0, price: 'Requires Verification', name: 'Mixed Scrap' },
    { label: 'Iron & Saria', stream: 'dry' as const, rate: 30, price: '₹28 - ₹32 / kg', name: 'Iron TMT Rod Scrap' },
    { label: 'Aluminium Can', stream: 'dry' as const, rate: 125, price: '₹110 - ₹145 / kg', name: 'Aluminium Beverage Can' },
    { label: 'PET Bottle', stream: 'dry' as const, rate: 18, price: '₹16 - ₹20 / kg', name: 'Plastic PET Beverage Bottle (Single)' },
    { label: 'Copper Wire', stream: 'ewaste' as const, rate: 510, price: '₹480 - ₹540 / kg', name: 'Copper Wire & Cables' },
    { label: 'Cardboard', stream: 'dry' as const, rate: 14, price: '₹12 - ₹15 / kg', name: 'Corrugated Packaging Box' },
    { label: 'Kitchen Wet', stream: 'wet' as const, rate: 0, price: '₹0 / kg (Compost)', name: 'Banana Peel & Fruit Pulp' },
  ];

  const handleApplyQuickCategory = (cat: (typeof quickCategories)[0]) => {
    const match = demoDetections.find((d) => d.name === cat.name) || demoDetections[0];
    const sampleMatch = sampleScrapPresets.find((s) => s.name.includes(cat.name) || s.label.includes(cat.label));
    const imgSrc = sampleMatch?.img || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=500&auto=format&fit=crop&q=80';
    setUploadedImageSrc(imgSrc);
    setCustomDetectedItem({
      ...match,
      name: cat.name,
    });
    setScanNotification(`Tagged as "${cat.name}" • Live Mandi Rate: ${cat.price}`);
    setTimeout(() => setScanNotification(null), 4000);
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 gap-4 pt-1 pb-28">
      {/* Hidden file input for general desktop folder file browsing */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hidden mobile camera capture input: 'capture="environment"' directly launches phone camera fullscreen! */}
      <input
        ref={mobileCaptureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hidden canvas used to extract real-time frames from HTML5 video element */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Floating Notification */}
      {scanNotification && (
        <div className="p-3 rounded-xl bg-[#FFFFFF] text-[#3FA66B] border border-[#3FA66B]/40 text-xs flex items-center gap-2.5 animate-fadeIn shadow-lg">
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
            className="px-2.5 py-1 rounded-md bg-[#DC2626] text-[#FFFFFF] font-bold text-[10px] shrink-0 active:scale-95"
            type="button"
          >
            Open Phone Camera
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* A. CENTER PHONE SCAN RESULT SCREEN (When photo analyzed) */}
      {/* ---------------------------------------------------- */}
      {(uploadedImageSrc || customDetectedItem) && !isAnalyzing ? (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          {/* Top Header Bar: [Back] | Scan Result | [Retake] */}
          <div className="flex items-center justify-between px-1 pb-1">
            <button
              type="button"
              onClick={handleResetToCamera}
              className="w-9 h-9 rounded-full bg-[#FFFFFF] border border-[#DCE5DE] flex items-center justify-center text-[#172019] hover:text-[#3FA66B] shadow-xs active:scale-95 transition-all"
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
              className="w-9 h-9 rounded-full bg-[#FFFFFF] border border-[#DCE5DE] flex items-center justify-center text-[#65736A] hover:text-[#172019] shadow-xs active:scale-95 transition-all"
              aria-label="Retake Photo"
              title="Retake photo"
            >
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
            </button>
          </div>

          {/* Scanned Image Card (Soft Sage Rounded Container + Verified Green Checkmark) */}
          <div className="relative w-full h-56 sm:h-64 rounded-3xl bg-[#E8F3EB] border border-[#DCE5DE] p-4 flex items-center justify-center overflow-hidden shadow-xs">
            <img
              src={uploadedImageSrc}
              alt={currentItem.name}
              className="max-h-full max-w-full object-contain drop-shadow-md transition-transform hover:scale-105"
            />

            {/* Green Checkmark Circle Badge at bottom right of image container */}
            <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-[#3FA66B] text-[#FFFFFF] font-bold flex items-center justify-center shadow-md border-2 border-[#FFFFFF]">
              <span className="material-symbols-outlined text-[20px]">check</span>
            </div>
          </div>

          {/* Low Confidence or Unidentifiable Alert */}
          {(currentItem.isUnidentifiable || currentItem.confidenceNum < 0.45) && (
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

          {/* AI-Confirmed Item Name & Recyclability Badge */}
          <div className="flex flex-col items-center text-center gap-1.5 mt-1">
            <h2 className="font-editorial text-2xl font-bold text-[#172019] tracking-tight">
              {currentItem.name}
            </h2>

            {/* Recyclability Status Pill */}
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
            {/* Row 1: Category */}
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-xs text-[#65736A] font-semibold">Category</span>
              <span className="text-xs font-bold text-[#172019]">{currentItem.category || currentItem.scrapType || 'Dry Recyclable'}</span>
            </div>

            {/* Row 2: Type / Material */}
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-xs text-[#65736A] font-semibold">Type</span>
              <span className="text-xs font-bold text-[#172019]">{currentItem.materialType || currentItem.name}</span>
            </div>

            {/* Row 3: Estimated Weight */}
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

            {/* Row 4: Estimated Price */}
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

            {/* Row 5: Best For */}
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-xs text-[#65736A] font-semibold">Best For</span>
              <span className="text-xs font-bold text-[#174D35] bg-[#E8F3EB] px-2 py-0.5 rounded-md border border-[#DCE5DE]">
                {currentItem.bestFor || (currentItem.isRecyclable ? 'Recycling' : 'Composting')}
              </span>
            </div>

            {/* Row 6: AI Confidence */}
            <div className="py-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#65736A] font-semibold">{t('confidence')}</span>
                <span className="text-xs font-bold text-[#3FA66B] font-code-metric">
                  {currentItem.confidence}
                </span>
              </div>

              {/* Progress Bar */}
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

              {currentItem.confidenceNum < 0.7 && currentItem.confidenceNum >= 0.45 && (
                <span className="text-[10px] text-[#D97706] font-medium flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[13px]">warning</span>
                  Moderate confidence — please verify item properties.
                </span>
              )}
            </div>
          </div>

          {/* Multiple Detected Items Card */}
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

          {/* Recommended Disposal Method & Guidance Box */}
          <div className="p-3.5 rounded-2xl bg-[#F5F8F4] border border-[#DCE5DE] text-xs text-[#65736A] leading-relaxed flex flex-col gap-1">
            <span className="font-bold text-[#172019]">Disposal Guidance:</span>
            <span>{currentItem.instructions}</span>
            {currentItem.kabadiwalaNote && (
              <span className="text-[#174D35] font-medium mt-1">{currentItem.kabadiwalaNote}</span>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col gap-2.5 pt-1">
            {/* Primary: Schedule Pickup */}
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

            {/* Secondary: Scan Another */}
            <button
              type="button"
              onClick={handleResetToCamera}
              className="w-full h-12 rounded-xl bg-[#FFFFFF] hover:bg-[#F5F8F4] text-[#172019] font-bold text-sm border border-[#DCE5DE] shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              <span>{t('scan')}</span>
            </button>
          </div>
        </div>
      ) : (
        /* ---------------------------------------------------- */
        /* B. VIEWFINDER / LIVE CAMERA VIEW MODE */
        /* ---------------------------------------------------- */
        <>
          {/* 1. PRIMARY AI VIEWFINDER / REAL-TIME MOBILE CAMERA CANVAS */}
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
        {/* Shutter Flash Animation Effect */}
        {shutterFlash && (
          <div className="absolute inset-0 z-40 bg-white pointer-events-none animate-camera-flash" />
        )}

        {/* Real-time Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${
            isCameraActive && !uploadedImageSrc ? 'block' : 'hidden'
          }`}
        />

        {/* Captured Snapshot or Uploaded Image View */}
        {uploadedImageSrc && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#172019] z-0">
            <img
              src={uploadedImageSrc}
              alt="Captured waste scrap item"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#172019] via-transparent to-[#172019]/70 pointer-events-none"></div>
            {isCapturing && (
              <div className="absolute inset-x-0 h-1 bg-[#3FA66B] shadow-[0_0_15px_#3FA66B] animate-pulse top-1/2 transform -translate-y-1/2"></div>
            )}
          </div>
        )}

        {/* Fallback Viewfinder */}
        {!isCameraActive && !uploadedImageSrc && (
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

        {/* Drag Over Overlay Prompt */}
        {isDragging && (
          <div className="absolute inset-0 z-30 bg-[#172019]/90 backdrop-blur-md flex flex-col items-center justify-center gap-2 p-4 text-center">
            <span className="material-symbols-outlined text-4xl text-[#3FA66B] animate-bounce">
              drive_folder_upload
            </span>
            <p className="text-sm font-bold text-[#FFFFFF]">{t('uploadImage')}</p>
            <p className="text-xs text-[#DCE5DE]">Directly imported from your files</p>
          </div>
        )}

        {/* Analyzing Waste AI Loading Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-40 bg-[#172019]/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 gap-3 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-full border-4 border-[#3FA66B] border-t-transparent animate-spin flex items-center justify-center shadow-[0_0_20px_rgba(63,166,107,0.4)]">
              <span className="material-symbols-outlined text-[#3FA66B] text-[28px] animate-pulse">
                center_focus_strong
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-base font-bold text-[#FFFFFF] tracking-tight">{t('analyzing')}</h4>
              <p className="text-xs text-[#DCE5DE] max-w-xs leading-relaxed">
                Gemini AI Vision is evaluating material properties, recyclability & live mandi rates
              </p>
            </div>
          </div>
        )}

        {/* Real-time Laser Scanning Beam */}
        {(!uploadedImageSrc || isAnalyzing) && (
          <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-[#3FA66B] to-transparent shadow-[0_0_12px_#3FA66B] animate-laser-scan z-10 pointer-events-none" />
        )}

        {/* Viewfinder HUD Overlays */}
        <div className="relative z-20 w-full h-full flex flex-col justify-between p-3.5 sm:p-4 pointer-events-none">
          {/* Top HUD Controls */}
          <div className="flex items-center justify-between pointer-events-auto">
            {/* Live Indicator Pill */}
            <div className="flex items-center gap-1.5 bg-[#FFFFFF]/90 backdrop-blur-md px-3 py-1 rounded-full border border-[#DCE5DE] shadow-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  isCameraActive && !uploadedImageSrc
                    ? 'bg-[#3FA66B] animate-ping'
                    : uploadedImageSrc
                    ? 'bg-[#2563EB]'
                    : 'bg-[#3FA66B]'
                }`}
              />
              <span className="text-[10px] uppercase font-bold text-[#172019] tracking-wider truncate max-w-[140px]">
                {uploadedImageSrc
                  ? 'Snapped Photo'
                  : isCameraActive
                  ? 'Live Camera (60 FPS)'
                  : 'AI Viewfinder'}
              </span>
            </div>

            {/* Quick Utility Action Buttons */}
            <div className="flex items-center gap-1.5">
              {uploadedImageSrc ? (
                <button
                  onClick={handleResetToCamera}
                  className="h-8 px-3 rounded-full bg-[#FFFFFF]/95 backdrop-blur-md text-[#3FA66B] hover:text-[#174D35] flex items-center gap-1 text-[11px] font-bold border border-[#3FA66B] shadow-sm active:scale-95 transition-all"
                  type="button"
                  title="Return to live camera"
                >
                  <span className="material-symbols-outlined text-[16px]">videocam</span>
                  <span>Retake / Live</span>
                </button>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Center Reticle */}
          <div className="relative flex-1 flex items-center justify-center pointer-events-auto my-2">
            <div className="relative w-64 h-48 flex flex-col justify-between">
              <div className="flex justify-between w-full">
                <div className="w-5 h-5 border-t-2 border-l-2 border-[#3FA66B] rounded-tl-md"></div>
                <div className="w-5 h-5 border-t-2 border-r-2 border-[#3FA66B] rounded-tr-md"></div>
              </div>

              {!uploadedImageSrc && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-2 h-2 rounded-full bg-[#3FA66B]/60 animate-ping" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3FA66B] absolute" />
                </div>
              )}

              {/* Live Detected Target Card */}
              <div
                onClick={() => {
                  if (!customDetectedItem) {
                    setDetectedItemIndex((prev) => (prev + 1) % demoDetections.length);
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

          {/* Bottom Viewfinder Status */}
          <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-auto">
            {!isCameraActive && !uploadedImageSrc ? (
              <button
                onClick={() => startCamera()}
                disabled={isCameraLoading}
                className="bg-[#3FA66B] text-[#FFFFFF] font-bold text-xs px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 active:scale-95 transition-all hover:bg-[#174D35]"
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
                  {uploadedImageSrc ? 'check_circle' : 'center_focus_strong'}
                </span>
                <p className="text-[11px] text-[#172019] text-center font-medium">
                  {uploadedImageSrc
                    ? 'Photo Analyzed • See scrap price & recyclability below'
                    : 'Point phone at scrap & press the shutter button'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Error Alert Card */}
      {analysisError && (
        <div className="p-4 rounded-2xl bg-[#FEE2E2] border-2 border-[#FCA5A5] text-xs flex flex-col gap-3 text-[#DC2626] shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[24px] text-[#DC2626] shrink-0">error</span>
            <div className="flex flex-col min-w-0">
              <h4 className="font-bold text-sm text-[#DC2626]">Waste Analysis Notice</h4>
              <p className="text-xs text-[#DC2626] font-semibold mt-0.5">{analysisError}</p>
            </div>
          </div>
          <button
            onClick={handleResetToCamera}
            type="button"
            className="py-2.5 px-4 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 self-start shadow-xs active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Scan Again / Try Another Photo</span>
          </button>
        </div>
      )}

      {/* 2. DEDICATED MOBILE PHOTO SHUTTER DOCK */}
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

        {/* Shutter Bar */}
        <div className="flex items-center justify-between gap-3 px-2 py-1">
          <button
            onClick={() => mobileCaptureInputRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-16 rounded-xl bg-[#F5F8F4] hover:bg-[#E8F3EB] border border-[#DCE5DE] hover:border-[#3FA66B]/40 text-[#172019] active:scale-95 transition-all group"
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

          {/* BIG SHUTTER BUTTON */}
          <div className="flex flex-col items-center justify-center">
            <button
              onClick={handleInstantShutter}
              disabled={isCapturing}
              className={`w-18 h-18 rounded-full border-4 border-[#3FA66B]/30 p-1 flex items-center justify-center transition-all shadow-[0_0_20px_rgba(63,166,107,0.2)] active:scale-90 ${
                isCapturing ? 'brightness-110 scale-95' : 'hover:scale-105'
              }`}
              type="button"
              title="Snap instant photo & identify scrap"
            >
              <div className="w-full h-full rounded-full bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] flex items-center justify-center font-bold shadow-inner">
                <span className="material-symbols-outlined text-[30px]">
                  {isCapturing ? 'hourglass_top' : 'camera'}
                </span>
              </div>
            </button>
            <span className="text-[10px] font-bold text-[#3FA66B] mt-1.5 leading-none">
              {isCapturing ? 'Analyzing...' : 'Snap & Identify'}
            </span>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-16 rounded-xl bg-[#F5F8F4] hover:bg-[#E8F3EB] border border-[#DCE5DE] hover:border-[#3FA66B]/40 text-[#172019] active:scale-95 transition-all group"
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

        {/* Quick Material Fine-Tuning Chips */}
        <div className="pt-2 border-t border-[#DCE5DE] flex flex-col gap-1.5">
          <span className="text-[10px] text-[#65736A] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-[#3FA66B]">touch_app</span>
            <span>Confirm or Change Snapped Material:</span>
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {quickCategories.map((cat) => (
              <button
                key={cat.label}
                onClick={() => handleApplyQuickCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all border ${
                  currentItem.name === cat.name
                    ? 'bg-[#3FA66B] text-[#FFFFFF] border-[#3FA66B]'
                    : 'bg-[#FFFFFF] text-[#172019] border-[#DCE5DE] hover:border-[#3FA66B]/40'
                }`}
                type="button"
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. EXPLICIT SCRAP MARKET PRICE & RECYCLABILITY CLARIFICATION CARD */}
      <div className="rounded-2xl bg-[#FFFFFF] p-4 border-2 border-[#DCE5DE] hover:border-[#3FA66B]/60 shadow-sm flex flex-col gap-3 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
              <span className="material-symbols-outlined text-[18px]">currency_rupee</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#172019]">
                Scrap Market Price & Recyclability
              </h3>
              <span className="text-[10px] text-[#65736A]">
                Live Mandi Rates & Kabadiwala Clarification
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#E8F3EB] text-[#174D35] border border-[#DCE5DE] flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3FA66B] animate-pulse"></span>
            Verified Mandi Rate
          </span>
        </div>

        {/* Product Type & Recyclable Clarification Box */}
        <div className="p-3.5 rounded-xl bg-[#E8F3EB] border border-[#DCE5DE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[#65736A] font-bold">
              Identified Product / Scrap Type
            </span>
            <span className="text-base font-bold text-[#172019] mt-0.5">
              {currentItem.scrapType || currentItem.name}
            </span>

            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  currentItem.isRecyclable
                    ? 'bg-[#3FA66B] text-[#FFFFFF]'
                    : 'bg-[#DC2626] text-[#FFFFFF]'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {currentItem.isRecyclable ? 'check_circle' : 'info'}
                </span>
                <span>{currentItem.isRecyclable ? 'Recyclable Scrap' : 'Non-Scrap / Compost'}</span>
              </span>
              <span className="text-xs text-[#172019] font-medium truncate max-w-[200px]">
                {currentItem.recyclabilityText}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:items-end p-2.5 sm:p-0 rounded-lg bg-[#FFFFFF] sm:bg-transparent border sm:border-0 border-[#DCE5DE]">
            <span className="text-[10px] uppercase tracking-wider text-[#174D35] font-bold">
              Market Price Per Kg
            </span>
            <span className="font-editorial text-2xl font-bold text-[#3FA66B] tracking-tight">
              {currentItem.marketPricePerKg}
            </span>
            <span className="text-[10px] text-[#65736A] mt-0.5">
              {currentItem.marketDemand || 'Current Mandi Valuation'}
            </span>
          </div>
        </div>

        {/* Dynamic Weight & Cash Payout Estimator */}
        {currentItem.approxRateNum && currentItem.approxRateNum > 0 ? (
          <div className="p-3 rounded-xl bg-[#F5F8F4] border border-[#DCE5DE] flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#65736A] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#3FA66B]">
                  calculate
                </span>
                <span>Instant Scrap Earnings Calculator:</span>
              </span>
              <span className="text-[10px] text-[#174D35] font-bold">
                Rate: ₹{currentItem.approxRateNum}/kg
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[5, 10, 20, 50].map((kg) => (
                <button
                  key={kg}
                  onClick={() => setCalcWeightKg(kg)}
                  className={`p-2 rounded-lg text-center transition-all border ${
                    calcWeightKg === kg
                      ? 'bg-[#3FA66B] text-[#FFFFFF] border-[#3FA66B] font-bold'
                      : 'bg-[#FFFFFF] text-[#172019] border-[#DCE5DE] hover:border-[#3FA66B]/50'
                  }`}
                  type="button"
                >
                  <div className="text-[10px] opacity-80">{kg} kg</div>
                  <div className="text-xs font-bold mt-0.5">
                    ₹{kg * currentItem.approxRateNum!}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#DCE5DE]">
              <span className="text-[#65736A]">
                Estimated payout for <strong className="text-[#172019]">{calcWeightKg} kg</strong> of{' '}
                {currentItem.name}:
              </span>
              <span className="font-editorial text-base font-bold text-[#3FA66B]">
                ₹{calcWeightKg * currentItem.approxRateNum} Payout
              </span>
            </div>
          </div>
        ) : null}

        {/* Clear Practical Advice & Kabadiwala Notes */}
        <div className="text-[11px] text-[#65736A] leading-relaxed flex flex-col gap-1 bg-[#F5F8F4] p-3 rounded-xl border border-[#DCE5DE]">
          <div>
            <strong className="text-[#172019]">Disposal Clarification: </strong>
            <span>{currentItem.instructions}</span>
          </div>
          {currentItem.kabadiwalaNote && (
            <div className="text-[#174D35] mt-0.5 font-medium">
              <strong>Kabadiwala Tip: </strong>
              <span className="text-[#172019]">{currentItem.kabadiwalaNote}</span>
            </div>
          )}
        </div>

        {/* OPTIONS TO BOOK PICKUP SLOT OR NEARBY CENTERS */}
        <div className="mt-1 p-4 rounded-2xl bg-[#FFFFFF] border-2 border-[#3FA66B] shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B] shadow-xs">
                <span className="material-symbols-outlined text-[20px]">handshake</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#172019] flex items-center gap-2">
                  <span>Ready with this Price?</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#3FA66B] text-[#FFFFFF] uppercase tracking-wider">
                    Rate Guaranteed
                  </span>
                </h4>
                <p className="text-[11px] text-[#65736A]">
                  {currentItem.marketPricePerKg} • Est.{' '}
                  <strong className="text-[#3FA66B]">
                    ₹{calcWeightKg * (currentItem.approxRateNum || 30)}
                  </strong>{' '}
                  for {calcWeightKg} kg
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#172019] leading-relaxed">
            If you are ready with this price for <strong className="text-[#172019]">{currentItem.name}</strong>, choose how you would like to proceed:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* OPTION 1: Book a Slot for Schedule Pickup */}
            <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] hover:border-[#3FA66B] transition-all flex flex-col justify-between gap-3 shadow-xs group">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B] group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">electric_rickshaw</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-bold bg-[#E8F3EB] text-[#174D35] px-2 py-0.5 rounded-md border border-[#DCE5DE]">
                    Doorstep Service
                  </span>
                </div>

                <div>
                  <h5 className="text-sm font-bold text-[#172019]">Book a Slot for Schedule Pickup</h5>
                  <p className="text-[11px] text-[#65736A] leading-snug mt-1">
                    Verified kabadiwala visits your home with certified digital electronic scale and pays instantly via UPI or cash.
                  </p>
                </div>

                <div className="bg-[#F5F8F4] p-2 rounded-lg text-[10px] text-[#172019] flex items-center justify-between border border-[#DCE5DE]">
                  <span className="text-[#65736A] truncate">
                    {calcWeightKg} kg • {currentItem.name}
                  </span>
                  <span className="font-bold text-[#3FA66B] shrink-0">
                    Est. ₹{calcWeightKg * (currentItem.approxRateNum || 30)} Payout
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onOpenScheduleModal) {
                    onOpenScheduleModal(
                      undefined,
                      currentItem.scrapType || currentItem.name,
                      calcWeightKg,
                      `₹${calcWeightKg * (currentItem.approxRateNum || 30)} Instant UPI / Cash`
                    );
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[17px]">calendar_today</span>
                <span>
                  Book Pickup Slot (₹{calcWeightKg * (currentItem.approxRateNum || 30)})
                </span>
              </button>
            </div>

            {/* OPTION 2: Drop-off at Nearby Centers */}
            <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] hover:border-[#2563EB] transition-all flex flex-col justify-between gap-3 shadow-xs group">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-[#DBEAFE] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">storefront</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-bold bg-[#DBEAFE] text-[#1E40AF] px-2 py-0.5 rounded-md border border-[#BFDBFE]">
                    Self Drop-off
                  </span>
                </div>

                <div>
                  <h5 className="text-sm font-bold text-[#172019]">Drop-off at Nearby Centers</h5>
                  <p className="text-[11px] text-[#65736A] leading-snug mt-1">
                    Find verified scrap centers & dry waste depots starting at 0.8 km with instant weigh counters and cash payout.
                  </p>
                </div>

                <div className="bg-[#F5F8F4] p-2 rounded-lg text-[10px] text-[#172019] flex items-center justify-between border border-[#DCE5DE]">
                  <span className="text-[#65736A]">Closest Hub:</span>
                  <span className="font-bold text-[#2563EB]">0.8 km (Green Earth Hub)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNearbyCentersModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#FFFFFF] hover:bg-[#DBEAFE] text-[#2563EB] hover:text-[#1E40AF] border border-[#2563EB] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[17px]">near_me</span>
                <span>View Nearby Centers (4)</span>
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* 4. Quick Test Samples Presets */}
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
            className="text-[11px] text-[#B8E600] hover:underline flex items-center gap-0.5 font-medium"
            type="button"
          >
            <span>Browse Local Drive</span>
            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
          </button>
        </div>

        <p className="text-[11px] text-[#9AA59D] leading-relaxed">
          Test scrap identification and live price calculation with 1-click presets:
        </p>

        {/* 4 Quick-test desktop file chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-0.5">
          {sampleScrapPresets.map((sample) => (
            <button
              key={sample.label}
              onClick={() => handleSelectSample(sample)}
              className="flex items-center gap-1.5 p-2 rounded-lg bg-[#151B18] hover:bg-[#151B18] border border-[#303832] hover:border-[#B8E600]/50 text-left transition-all group"
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

      {/* 5. 4-Bin Indian Municipal Waste Categories Pill Track */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-[#B8E600] tracking-widest">
            National SWM Categorization
          </span>
          <span className="font-code-metric text-[11px] text-[#9AA59D]">4 Streams Active</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {/* Blue: Dry Recyclable */}
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

          {/* Green: Wet Organic */}
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

          {/* Red: Domestic Hazardous */}
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

          {/* Amber: E-Waste */}
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

      {/* 5. NEARBY SCRAP CENTERS MODAL (BOTTOM SHEET / DIALOG) */}
      {isNearbyCentersModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#0B0F0D]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setIsNearbyCentersModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#151B18] rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 shadow-2xl border-t sm:border border-[#303832] max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
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
                className="w-8 h-8 rounded-full bg-[#151B18] border border-[#303832] flex items-center justify-center text-[#9AA59D] hover:text-[#FFFFFF]"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Quick Action Toast inside modal */}
            {selectedCenterContactMsg && (
              <div className="p-3 rounded-xl bg-[#151B18] border border-[#B8E600] text-[#B8E600] text-xs flex items-center justify-between animate-in fade-in">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>{selectedCenterContactMsg}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCenterContactMsg(null)}
                  className="text-[#9AA59D] hover:text-[#FFFFFF] text-xs ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Active Scrap Product Banner */}
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

            {/* List of Verified Centers */}
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

                  {/* Timing and badge info */}
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

                  {/* 3 Direct Actions */}
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
                      className="py-1.5 px-2 rounded-lg bg-[#FFFFFF] hover:bg-[#F5F8F4] text-[#172019] border border-[#DCE5DE] text-[11px] font-semibold flex items-center justify-center gap-1"
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
                      className="py-1.5 px-2 rounded-lg bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                      <span>Book Slot</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom button: Switch to Full Facilities Map */}
            <div className="pt-2 border-t border-[#DCE5DE] flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsNearbyCentersModalOpen(false);
                  if (onNavigateToFacilities) {
                    onNavigateToFacilities();
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#E8F3EB] text-[#3FA66B] font-bold text-xs border border-[#3FA66B] flex items-center justify-center gap-2 transition-colors"
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

