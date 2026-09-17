import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Language } from './types';

export const LANGUAGE_OPTIONS: Array<{ code: Language; label: string; nativeLabel: string }> = [
  { code: 'EN', label: 'English', nativeLabel: 'English' },
  { code: 'HI', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'TE', label: 'Telugu', nativeLabel: 'తెలుగు' },
];

type TranslationKey = keyof typeof translations.EN;

const translations = {
  EN: {
    dashboard: 'Dashboard', facilities: 'Facilities', scan: 'Scan', rewards: 'Rewards', guide: 'Guide',
    citizen: 'Citizen', collector: 'Collector', admin: 'Admin', adminDesk: 'Admin Desk', citizenUser: 'Citizen User', kabadiwalaDesk: 'Kabadiwala Desk',
    wasteToValue: 'Waste to Value Platform', changeLanguage: 'Change language', notifications: 'Notifications', profile: 'Profile',
    goodMorning: 'Good morning', account: 'Account', certificate: 'Certificate', currentLocation: 'Current Location',
    nearbyCenters: 'Nearby Centers', pickups: 'Pickups', active: 'Active', scheduledPickups: 'Scheduled Pickups', inFlight: 'In-Flight',
    collectorOnWay: 'Collector On The Way', collectorArrived: 'Collector Arrived', liveTrip: 'Live Trip', trackingActive: 'Tracking active', trackingStopped: 'Tracking stopped',
    collectorLocation: 'Collector Location', pickupDestination: 'Pickup Destination', pickupAddressUnavailable: 'Pickup address unavailable', updated: 'Updated',
    yourLocation: 'Your location', pickupLocation: 'Pickup location', approximateDistance: 'Approximate Distance', estimatedArrival: 'Estimated Arrival',
    mapAttribution: 'OpenStreetMap map', locationUnavailable: 'Collector location is currently unavailable.', locationWaiting: 'Coordinates will display once the driver starts location sharing.',
    scanWaste: 'Scan Waste with AI', openCamera: 'Open Camera', uploadImage: 'Upload Image', analyze: 'Analyze Waste', analyzing: 'Analyzing waste...',
    cameraUnavailable: 'Camera is unavailable.', cameraPermission: 'Camera permission is required.', tryAgain: 'Try Again', chooseImage: 'Choose an image',
    wasteAnalysis: 'Waste Analysis', unableIdentify: 'Unable to confidently identify the waste', confidence: 'Confidence', recyclable: 'Recyclable', notRecyclable: 'Not Recyclable', estimatedValue: 'Estimated Value',
    marketRate: 'Market Rate', disposalInstruction: 'Disposal Instruction', detectedItems: 'Detected Items', schedulePickup: 'Schedule Pickup',
    ecoCredits: 'Eco Credits', redeem: 'Redeem', redeemNow: 'Redeem Now', available: 'Available', used: 'Used', expired: 'Expired',
    pickupStatus: 'Pickup Status', pickupOtp: 'Pickup OTP', cancel: 'Cancel', reschedule: 'Reschedule', viewReceipt: 'View Receipt & Rating',
    startTrip: 'Start Trip', resumeSharing: 'Resume Sharing', pauseSharing: 'Pause Sharing', completePickup: 'Complete Pickup', verifyOtp: 'Verify OTP',
    accept: 'Accept', decline: 'Decline', confirmWeight: 'Confirm Weight', completed: 'Completed', cancelled: 'Cancelled', recent: 'Recent',
    noApiKey: 'EcoAI is not configured on the server. Please try again later.', temporaryBusy: 'EcoAI is temporarily busy. Please try again in a moment.',
    ecoAiGreeting: 'Namaste! I am EcoAI, your personal waste intelligence assistant.', ecoAiAnalyzing: 'EcoAI is thinking...', askEcoAi: 'Ask EcoAI anything about waste, scrap rates...',
    quickInquiries: 'Quick Inquiries for EcoAI', sendQuery: 'Send query to EcoAI', closeAssistant: 'Close assistant',
    languageChanged: 'Language changed to {language}.', networkError: 'A network error occurred. Please try again.',
    exploreGuest: 'Explore as Guest', getStarted: 'Get Started', createAccount: 'New Citizen? Create New Account',
    welcomeBack: 'Welcome Back', password: 'Password', otp: 'One-Time OTP', createNewAccount: 'Create New Account',
    requestSubmitted: 'Request Submitted', collectorAccepted: 'Collector Accepted', weightVerified: 'Weight Verified',
    switchRole: 'Switch Workspace Role', userActivity: 'User Activity Timeline', close: 'Close', markAllRead: 'Mark all as read',
    noNotifications: 'No notifications yet', pickupDetails: 'Pickup Details', doorstepOtp: 'Doorstep OTP', weight: 'Weight',
    customer: 'Customer', collectorPartner: 'Collector Partner', materialItem: 'Material Item', verified: 'Verified', loading: 'Loading...',
    copy: 'Copy', noRewards: 'No rewards available right now.', failedLoad: 'Unable to load rewards.', saved: 'Saved', error: 'Error',
    pickupCompleted: 'Pickup Completed', level: 'Level', ecoScore: 'Eco Score', credits: 'Credits', settings: 'Settings',
    emailMobile: 'Email or Mobile Number', enterEmailMobile: 'Enter email or 10-digit mobile', forgotUseOtp: 'Forgot? Use OTP',
    enterPassword: 'Enter account password', verificationCode: 'Verification Code', sendOtp: 'Send OTP', resendOtp: 'Resend OTP', signIn: 'Sign In', demoLogin: '1-Tap Demo Login',
    fullName: 'Full Name', emailAddress: 'Email Address', mobileNumber: 'Mobile Number', creatingProfile: 'Creating Eco Profile...', verifyCreate: 'Verify OTP & Create Account',
    wasteRecycled: 'Waste Recycled', ecoCreditsBalance: 'Eco Credits Balance', aiEcoScore: 'AI Eco Score', geminiRealTimeModel: 'Gemini 3 Real-Time Model',
    aiSmartRecommendations: 'AI Smart Recommendations', realTimeImpact: 'Real-Time Impact', totalScans: 'Total Scans', itemsAiAnalyzed: 'Items AI analyzed',
    diverted: 'Diverted', dryRecyclables: 'Dry recyclables', co2Offset: 'CO₂ Offset', greenhouseGasesSaved: 'Greenhouse gases saved',
    done: 'done', doorstepScrapSales: 'Doorstep scrap sales', segregationBreakdown: 'Segregation Breakdown', thirtyDays: '30 Days',
    dryRecyclable: 'Dry Recyclable', organicWet: 'Organic Wet', eWaste: 'E-Waste', hazardous: 'Hazardous',
    householdItemScans: 'Household item scans', claimed: 'Claimed!', claim: 'Claim', recentActivity: 'Recent Activity',
    realTimeBackendLog: 'Real-Time Backend Log', viewFullTimeline: 'View Full Timeline', noRecentActivity: 'No recent activity logged yet.',
    communityCleanMissions: 'Community Clean Missions', viewAll: 'View All',
    allMaterials: 'All Materials', oldAppliances: 'Old Appliances', metalsBrass: 'Metals & Brass', plasticsCartons: 'Plastics & Cartons', eWasteBatteries: 'E-Waste & Batteries',
    certifiedAtHome: 'Certified At-Home Service', bulkScrapHeader: 'Got Bulk Scrap or Electronics?', bulkScrapDesc: 'Book a verified local Kabadiwala equipped with a certified digital scale & guaranteed UPI / Instant cash payout at your doorstep.',
    zeroHaggling: 'Zero Haggling', within2Hrs: 'Within 2 Hrs', instantPayout: 'Instant Payout', verifiedCenters: 'Verified Centers',
    listView: 'List View', mapView: 'Map View', guidelines: 'Guidelines', navigate: 'Navigate', call: 'Call', book: 'Book',
    activeBooking: 'Active Booking', inspectorTimeline: 'Inspector Timeline', bookAnotherPickup: 'Book Another Doorstep Pickup',
    scanTitle: 'Scan Waste with AI', realTimeAiVision: 'Real-Time AI Vision Scanner', samplePresets: 'Sample Scrap Presets', instantAppCamera: 'Instant Camera App', quickMaterialLookup: 'Quick Material Lookup', dropImageHere: 'Drop image file here',
    greenSovereignCredits: 'Green Sovereign Credits', ecoRewardsVouchers: 'Eco Rewards & Vouchers', availableEcoBalance: 'Available Eco Balance', browseAvailableRewards: 'Browse Available Rewards', voucherCode: 'Voucher Code', howToUse: 'How to use:', availablePartnerRewards: 'Available Partner Rewards', myRedeemedVouchers: 'My Redeemed Vouchers', redeemOffer: 'Redeem Offer',
    segregationGuide: '4-Bin Segregation Guide', officialIndianNorms: 'Official Indian municipal norms.', acceptedItems: 'Accepted Items:', preparationTip: 'Preparation Tip:', safetyWarning: 'Safety Warning:',
    incomingRequests: 'Incoming Requests', activeInProgress: 'Active In-Progress', pastPickups: 'Past Pickups', goOnline: 'Go Online', goOffline: 'Go Offline', approveAccountNow: 'Approve Account Now', totalPayout: 'Total Payout', acceptPickup: 'Accept Pickup',
    scanWasteCap: 'SCAN WASTE', schedulePickupCap: 'SCHEDULE PICKUP', alreadyRegistered: 'Already registered?', signInExisting: 'Sign In to Existing Account', newToEcoScan: 'New to EcoScan IN?',
    liveCamera: 'Live Camera (60 FPS)', aiViewfinder: 'AI Viewfinder', readyToScanScrap: 'Ready to Scan Scrap', autoDetectionActive: 'Auto-Detection Active', liveMandiRates: 'Live Mandi Rates',
    scanAnyItemAppraisal: 'Scan any item for instant appraisal', turnOnCamera: 'Turn On Real-Time Camera', startingCamera: 'Starting Camera...', pointPhoneAtScrap: 'Point phone at scrap & press the shutter button',
    mobileShutterDock: 'Mobile Shutter & Instant Capture', realTimeFrame: 'Real-Time Frame', fastSnapMode: 'Fast Snap Mode', phoneCamera: 'Phone Camera', instantApp: 'Instant App',
    snapAndIdentify: 'Snap & Identify', galleryFiles: 'Gallery / Files', deviceStorage: 'Device Storage', quickTestPresets: 'Quick Test Presets', browseLocalDrive: 'Browse Local Drive',
    testScrapPresetsDesc: 'Test scrap identification and live price calculation with 1-click presets:', ironRodScrapLabel: 'Iron Rod Scrap', cardboardBoxLabel: 'Cardboard Box', kitchenPeelLabel: 'Kitchen Peel', copperWireLabel: 'Copper & Wire',
    nationalSwmCategorization: 'National SWM Categorization', streamsActive: '4 Streams Active', dryScrapLabel: 'Dry Scrap', dryScrapDesc: 'Iron, Paper, PET', wetWasteLabel: 'Wet Waste', wetWasteDesc: 'Kitchen Peels', hazardousDesc: 'Lead, Paints', eWasteDesc: 'PCBs, Copper', openPhoneCamera: 'Open Phone Camera',
    adminDeskHeader: 'EcoScan Admin Desk', adminSubHeader: 'Platform Verification, Prices & Operations', systemOnline: 'System Online',
    totalRecycled: 'Total Recycled', divertedLandfill: 'Diverted from Landfill', payoutSettled: 'Payout Settled', toCitizens: 'To Citizens',
    pickupsDone: 'Pickups Done', completedRate: 'Completed Rate', collectorsCap: 'Collectors', overview: 'Overview', collectorsTab: 'Collectors',
    scrapPricesTab: 'Scrap Prices', usersTab: 'Users', auditLogTab: 'Audit Log', partnersTab: 'Partners', pendingKabadiwalaApprovals: 'Pending Kabadiwala Approvals',
    approvalRequiredDesc: 'Approval required to allow accepting doorstep scrap pickups', approveAllPending: 'Approve All Pending', approveAndVerify: 'Approve & Verify',
    addCollector: 'Add Collector', addMaterial: 'Add Material', addPartner: 'Add Partner', addReward: 'Add Reward', savePrice: 'Save Price', editPrice: 'Edit Price', actions: 'Actions',
    rating: 'Rating', verifiedPartner: 'Verified Partner', noRatingsYet: 'No ratings yet', onlineReceiving: 'Online & Receiving Nearby Pickup Requests', offlineBusy: 'Offline / Currently Busy',
    accountPendingApproval: 'Account Pending Admin Approval', instantApproveDesc: 'Click below to instantly approve your account for live pickup testing:',
    noNewRequestsPending: 'No New Requests Pending', keepOnlineDesc: 'Keep your status "Online" to automatically receive doorstep scrap pickup requests in your area.',
    doorstepScrapRequest: 'Doorstep Scrap Request', materialCategory: 'Material Category', estimatedWeight: 'Estimated Weight', preferredSlot: 'Preferred Slot', itemsSummary: 'Items Summary',
    noActivePickups: 'No Active Pickups In Progress', acceptIncomingDesc: 'Accept incoming requests to start routes and collect recyclable waste at doorsteps.',
    markArrived: 'Mark Arrived at Doorstep', customerOtpVerification: 'Customer OTP Verification', askCustomerOtp: 'Ask customer for their 4-digit security OTP code generated on their EcoScan app.',
    digitalWeighIn: 'Digital Weigh-In', otpVerified: 'OTP Verified ✓', actualWeightKg: 'Actual Weight (kg)', applicableRate: 'Applicable Rate (₹/kg)', confirmWeightPayout: 'Confirm Weight & Final Payout',
    settlePayment: 'Settle Payment', noCompletedPickups: 'No Completed Pickups Yet', completedPickupsDesc: 'Your successfully completed scrap pickups will appear here.',
    pending: 'Pending Approval', settled: 'Settled',
  },
  HI: {
    dashboard: 'डैशबोर्ड', facilities: 'केंद्र', scan: 'स्कैन', rewards: 'रिवॉर्ड्स', guide: 'गाइड',
    citizen: 'नागरिक', collector: 'कलेक्टर', admin: 'एडमिन', adminDesk: 'एडमिन डेस्क', citizenUser: 'नागरिक उपयोगकर्ता', kabadiwalaDesk: 'कबाड़ीवाला डेस्क',
    wasteToValue: 'कचरे से मूल्य मंच', changeLanguage: 'भाषा बदलें', notifications: 'सूचनाएँ', profile: 'प्रोफ़ाइल',
    goodMorning: 'सुप्रभात', account: 'खाता', certificate: 'प्रमाणपत्र', currentLocation: 'वर्तमान स्थान',
    nearbyCenters: 'नज़दीकी केंद्र', pickups: 'पिकअप', active: 'सक्रिय', scheduledPickups: 'निर्धारित पिकअप', inFlight: 'चल रहे',
    collectorOnWay: 'कलेक्टर रास्ते में है', collectorArrived: 'कलेक्टर पहुँच गया', liveTrip: 'लाइव यात्रा', trackingActive: 'ट्रैकिंग सक्रिय', trackingStopped: 'ट्रैकिंग बंद',
    collectorLocation: 'कलेक्टर का स्थान', pickupDestination: 'पिकअप गंतव्य', pickupAddressUnavailable: 'पिकअप पता उपलब्ध नहीं', updated: 'अपडेट',
    yourLocation: 'आपका स्थान', pickupLocation: 'पिकअप स्थान', approximateDistance: 'अनुमानित दूरी', estimatedArrival: 'अनुमानित आगमन',
    mapAttribution: 'OpenStreetMap मानचित्र', locationUnavailable: 'कलेक्टर का स्थान अभी उपलब्ध नहीं है।', locationWaiting: 'ड्राइवर द्वारा स्थान साझा करना शुरू करने के बाद निर्देशांक दिखेंगे।',
    scanWaste: 'AI से कचरा स्कैन करें', openCamera: 'कैमरा खोलें', uploadImage: 'चित्र अपलोड करें', analyze: 'कचरे का विश्लेषण करें', analyzing: 'कचरे का विश्लेषण हो रहा है...',
    cameraUnavailable: 'कैमरा उपलब्ध नहीं है।', cameraPermission: 'कैमरा अनुमति आवश्यक है।', tryAgain: 'फिर प्रयास करें', chooseImage: 'चित्र चुनें',
    wasteAnalysis: 'कचरा विश्लेषण', unableIdentify: 'कचरे की विश्वसनीय पहचान नहीं हो सकी', confidence: 'विश्वास', recyclable: 'पुनर्चक्रण योग्य', notRecyclable: 'पुनर्चक्रण योग्य नहीं', estimatedValue: 'अनुमानित मूल्य',
    marketRate: 'बाज़ार दर', disposalInstruction: 'निपटान निर्देश', detectedItems: 'पहचानी गई वस्तुएँ', schedulePickup: 'पिकअप शेड्यूल करें',
    ecoCredits: 'इको क्रेडिट्स', redeem: 'रिडीम', redeemNow: 'अभी रिडीम करें', available: 'उपलब्ध', used: 'उपयोग किया गया', expired: 'समाप्त',
    pickupStatus: 'पिकअप स्थिति', pickupOtp: 'पिकअप OTP', cancel: 'रद्द करें', reschedule: 'फिर से शेड्यूल', viewReceipt: 'रसीद और रेटिंग देखें',
    startTrip: 'यात्रा शुरू करें', resumeSharing: 'शेयरिंग फिर शुरू करें', pauseSharing: 'शेयरिंग रोकें', completePickup: 'पिकअप पूरा करें', verifyOtp: 'OTP सत्यापित करें',
    accept: 'स्वीकार करें', decline: 'अस्वीकार करें', confirmWeight: 'वज़न की पुष्टि करें', completed: 'पूरा हुआ', cancelled: 'रद्द', recent: 'हाल का',
    noApiKey: 'EcoAI सर्वर पर कॉन्फ़िगर नहीं है। कृपया बाद में प्रयास करें।', temporaryBusy: 'EcoAI अभी व्यस्त है। कृपया थोड़ी देर बाद फिर प्रयास करें।',
    ecoAiGreeting: 'नमस्ते! मैं EcoAI हूँ, आपका व्यक्तिगत कचरा बुद्धिमत्ता सहायक।', ecoAiAnalyzing: 'EcoAI सोच रहा है...', askEcoAi: 'कचरे और स्क्रैप दरों के बारे में EcoAI से पूछें...',
    quickInquiries: 'EcoAI के लिए त्वरित प्रश्न', sendQuery: 'प्रश्न भेजें', closeAssistant: 'सहायक बंद करें',
    languageChanged: 'भाषा {language} में बदल गई।', networkError: 'नेटवर्क त्रुटि हुई। कृपया फिर प्रयास करें।',
    exploreGuest: 'अतिथि के रूप में देखें', getStarted: 'शुरू करें', createAccount: 'नए नागरिक? नया खाता बनाएँ',
    welcomeBack: 'वापसी पर स्वागत है', password: 'पासवर्ड', otp: 'एक बार का OTP', createNewAccount: 'नया खाता बनाएँ',
    requestSubmitted: 'अनुरोध भेजा गया', collectorAccepted: 'कलेक्टर ने स्वीकार किया', weightVerified: 'वज़न सत्यापित',
    switchRole: 'वर्कस्पेस भूमिका बदलें', userActivity: 'उपयोगकर्ता गतिविधि', close: 'बंद करें', markAllRead: 'सभी को पढ़ा हुआ करें',
    noNotifications: 'अभी कोई सूचना नहीं', pickupDetails: 'पिकअप विवरण', doorstepOtp: 'डोरस्टेप OTP', weight: 'वज़न',
    customer: 'ग्राहक', collectorPartner: 'कलेक्टर पार्टनर', materialItem: 'सामग्री', verified: 'सत्यापित', loading: 'लोड हो रहा है...',
    copy: 'कॉपी करें', noRewards: 'अभी कोई रिवॉर्ड उपलब्ध नहीं है।', failedLoad: 'रिवॉर्ड लोड नहीं हो सके।', saved: 'सहेजा गया', error: 'त्रुटि',
    pickupCompleted: 'पिकअप पूरा हुआ', level: 'स्तर', ecoScore: 'इको स्कोर', credits: 'क्रेडिट्स', settings: 'सेटिंग्स',
    emailMobile: 'ईमेल या मोबाइल नंबर', enterEmailMobile: 'ईमेल या 10 अंकों का मोबाइल दर्ज करें', forgotUseOtp: 'भूल गए? OTP उपयोग करें',
    enterPassword: 'खाते का पासवर्ड दर्ज करें', verificationCode: 'सत्यापन कोड', sendOtp: 'OTP भेजें', resendOtp: 'OTP फिर भेजें', signIn: 'साइन इन', demoLogin: 'एक टैप डेमो लॉगिन',
    fullName: 'पूरा नाम', emailAddress: 'ईमेल पता', mobileNumber: 'मोबाइल नंबर', creatingProfile: 'इको प्रोफ़ाइल बन रही है...', verifyCreate: 'OTP सत्यापित करें और खाता बनाएँ',
    wasteRecycled: 'पुनर्चक्रित कचरा', ecoCreditsBalance: 'इको क्रेडिट्स बैलेंस', aiEcoScore: 'AI इको स्कोर', geminiRealTimeModel: 'Gemini 3 रीयल-टाइम मॉडल',
    aiSmartRecommendations: 'AI स्मार्ट सुझाव', realTimeImpact: 'रीयल-टाइम प्रभाव', totalScans: 'कुल स्कैन', itemsAiAnalyzed: 'AI द्वारा विश्लेषण की गई वस्तुएँ',
    diverted: 'डायवर्ट किया गया', dryRecyclables: 'सूखा पुनर्चक्रण योग्य', co2Offset: 'CO₂ ऑफसेट', greenhouseGasesSaved: 'ग्रीनहाउस गैसों की बचत',
    done: 'पूरा हुआ', doorstepScrapSales: 'डोरस्टेप स्क्रैप बिक्री', segregationBreakdown: 'प्रथक्कीकरण विवरण', thirtyDays: '30 दिन',
    dryRecyclable: 'सूखा पुनर्चक्रण योग्य', organicWet: 'जैविक गीला', eWaste: 'ई-कचरा', hazardous: 'खतरनाक',
    householdItemScans: 'घरेलू सामान स्कैन', claimed: 'दावा किया गया!', claim: 'दावा करें', recentActivity: 'हालिया गतिविधि',
    realTimeBackendLog: 'रीयल-टाइम बैकएंड लॉग', viewFullTimeline: 'पूरा टाइमलाइन देखें', noRecentActivity: 'अभी तक कोई हालिया गतिविधि दर्ज नहीं की गई।',
    communityCleanMissions: 'सामुदायिक स्वच्छता मिशन', viewAll: 'सभी देखें',
    allMaterials: 'सभी सामग्रियां', oldAppliances: 'पुराने उपकरण', metalsBrass: 'धातु और पीतल', plasticsCartons: 'प्लास्टिक और कार्टन', eWasteBatteries: 'ई-कचरा और बैटरियां',
    certifiedAtHome: 'प्रमाणित होम सर्विस', bulkScrapHeader: 'क्या आपके पास भारी स्क्रैप या इलेक्ट्रॉनिक्स है?', bulkScrapDesc: 'अपने दरवाजे पर डिजिटल स्केल और गारंटीकृत यूपीआई / कैश भुगतान वाले कबाड़ीवाला को बुक करें।',
    zeroHaggling: 'कोई मोलभाव नहीं', within2Hrs: '2 घंटे के भीतर', instantPayout: 'तुरंत भुगतान', verifiedCenters: 'सत्यापित केंद्र',
    listView: 'सूची दृश्य', mapView: 'मानचित्र दृश्य', guidelines: 'दिशा-निर्देश', navigate: 'नेविगेट करें', call: 'कॉल करें', book: 'बुक करें',
    activeBooking: 'सक्रिय बुकिंग', inspectorTimeline: 'निरीक्षक टाइमलाइन', bookAnotherPickup: 'एक और डोरस्टेप पिकअप बुक करें',
    scanTitle: 'AI से कचरा स्कैन करें', realTimeAiVision: 'रीयल-टाइम AI विज़न स्कैनर', samplePresets: 'नमूना स्क्रैप प्रीसेट', instantAppCamera: 'त्वरित कैमरा ऐप', quickMaterialLookup: 'त्वरित सामग्री खोज', dropImageHere: 'यहां छवि फ़ाइल छोड़ें',
    greenSovereignCredits: 'ग्रीन सॉवरेन क्रेडिट्स', ecoRewardsVouchers: 'इको रिवॉर्ड्स और वाउचर', availableEcoBalance: 'उपलब्ध इको बैलेंस', browseAvailableRewards: 'उपलब्ध रिवॉर्ड्स देखें', voucherCode: 'वाउचर कोड', howToUse: 'उपयोग कैसे करें:', availablePartnerRewards: 'उपलब्ध पार्टनर रिवॉर्ड्स', myRedeemedVouchers: 'मेरे रिडीम किए गए वाउचर', redeemOffer: 'ऑफ़र रिडीम करें',
    segregationGuide: '4-बिन प्रथक्कीकरण गाइड', officialIndianNorms: 'आधिकारिक भारतीय नगर निगम मानदंड।', acceptedItems: 'स्वीकृत वस्तुएं:', preparationTip: 'तैयारी टिप:', safetyWarning: 'सुरक्षा चेतावनी:',
    incomingRequests: 'आने वाले अनुरोध', activeInProgress: 'सक्रिय प्रगति में', pastPickups: 'पुराने पिकअप', goOnline: 'ऑनलाइन जाएं', goOffline: 'ऑफ़लाइन जाएं', approveAccountNow: 'खाता अभी स्वीकृत करें', totalPayout: 'कुल भुगतान', acceptPickup: 'पिकअप स्वीकार करें',
    scanWasteCap: 'कचरा स्कैन करें', schedulePickupCap: 'पिकअप शेड्यूल करें', alreadyRegistered: 'पहले से पंजीकृत हैं?', signInExisting: 'मौजूदा खाते में साइन इन करें', newToEcoScan: 'EcoScan IN में नए हैं?',
    liveCamera: 'लाइव कैमरा (60 FPS)', aiViewfinder: 'AI व्यूफ़ाइंडर', readyToScanScrap: 'स्क्रैप स्कैन करने के लिए तैयार', autoDetectionActive: 'ऑटो-डिटेक्शन सक्रिय', liveMandiRates: 'लाइव मंडी दरें',
    scanAnyItemAppraisal: 'त्वरित मूल्यांकन के लिए किसी भी वस्तु को स्कैन करें', turnOnCamera: 'रीयल-टाइम कैमरा चालू करें', startingCamera: 'कैमरा शुरू हो रहा है...', pointPhoneAtScrap: 'फोन को स्क्रैप पर रखें और शटर बटन दबाएं',
    mobileShutterDock: 'मोबाइल शटर और त्वरित कैप्चर', realTimeFrame: 'रीयल-टाइम फ्रेम', fastSnapMode: 'फास्ट स्नैप मोड', phoneCamera: 'फोन कैमरा', instantApp: 'त्वरित ऐप',
    snapAndIdentify: 'स्नैप करें और पहचानें', galleryFiles: 'गैलरी / फ़ाइलें', deviceStorage: 'डिवाइस स्टोरेज', quickTestPresets: 'त्वरित परीक्षण प्रीसेट', browseLocalDrive: 'लोकल ड्राइव देखें',
    testScrapPresetsDesc: '1-क्लिक प्रीसेट के साथ स्क्रैप पहचान और लाइव मूल्य गणना का परीक्षण करें:', ironRodScrapLabel: 'लोहे की छड़ का स्क्रैप', cardboardBoxLabel: 'गत्ते का डिब्बा', kitchenPeelLabel: 'रसोई के छिलके', copperWireLabel: 'तांबा और तार',
    nationalSwmCategorization: 'राष्ट्रीय SWM वर्गीकरण', streamsActive: '4 धाराएं सक्रिय', dryScrapLabel: 'सूखा स्क्रैप', dryScrapDesc: 'लोहा, कागज, पीईटी', wetWasteLabel: 'गीला कचरा', wetWasteDesc: 'रसोई के छिलके', hazardousDesc: 'सीसा, पेंट', eWasteDesc: 'पीसीबी, तांबा', openPhoneCamera: 'फोन कैमरा खोलें',
    adminDeskHeader: 'EcoScan एडमिन डेस्क', adminSubHeader: 'प्लेटफ़ॉर्म सत्यापन, मूल्य और संचालन', systemOnline: 'सिस्टम ऑनलाइन',
    totalRecycled: 'कुल पुनर्चक्रित', divertedLandfill: 'लैंडफिल से बचाया गया', payoutSettled: 'भुगतान चुकता', toCitizens: 'नागरिकों को',
    pickupsDone: 'पिकअप पूर्ण', completedRate: 'पूर्णता दर', collectorsCap: 'कलेक्टर', overview: 'अवलोकन', collectorsTab: 'कलेक्टर',
    scrapPricesTab: 'स्क्रैप दरें', usersTab: 'उपयोगकर्ता', auditLogTab: 'ऑडिट लॉग', partnersTab: 'पार्टनर', pendingKabadiwalaApprovals: 'लंबित कबाड़ीवाला अनुमोदन',
    approvalRequiredDesc: 'डोरस्टेप स्क्रैप पिकअप स्वीकार करने की अनुमति के लिए अनुमोदन आवश्यक है', approveAllPending: 'सभी लंबित को स्वीकृत करें', approveAndVerify: 'स्वीकृत और सत्यापित करें',
    addCollector: 'कलेक्टर जोड़ें', addMaterial: 'सामग्री जोड़ें', addPartner: 'पार्टनर जोड़ें', addReward: 'रिवॉर्ड जोड़ें', savePrice: 'मूल्य सहेजें', editPrice: 'मूल्य बदलें', actions: 'कार्रवाई',
    rating: 'रेटिंग', verifiedPartner: 'सत्यापित पार्टनर', noRatingsYet: 'अभी कोई रेटिंग नहीं', onlineReceiving: 'ऑनलाइन और नजदीकी पिकअप अनुरोध प्राप्त हो रहे हैं', offlineBusy: 'ऑफ़लाइन / वर्तमान में व्यस्त',
    accountPendingApproval: 'खाता एडमिन अनुमोदन के लिए लंबित', instantApproveDesc: 'लाइव पिकअप परीक्षण के लिए अपना खाता तुरंत स्वीकृत करने के लिए नीचे क्लिक करें:',
    noNewRequestsPending: 'कोई नया अनुरोध लंबित नहीं है', keepOnlineDesc: 'अपने क्षेत्र में स्वचालित रूप से पिकअप अनुरोध प्राप्त करने के लिए अपनी स्थिति "ऑनलाइन" रखें।',
    doorstepScrapRequest: 'डोरस्टेप स्क्रैप अनुरोध', materialCategory: 'सामग्री श्रेणी', estimatedWeight: 'अनुमानित वज़न', preferredSlot: 'पसंदीदा समय', itemsSummary: 'सामग्री सारांश',
    noActivePickups: 'कोई सक्रिय पिकअप प्रगति में नहीं है', acceptIncomingDesc: 'मार्ग शुरू करने और कचरा एकत्र करने के लिए आने वाले अनुरोधों को स्वीकार करें।',
    markArrived: 'दरवाजे पर पहुँच गए मार्क करें', customerOtpVerification: 'ग्राहक OTP सत्यापन', askCustomerOtp: 'ग्राहक से उनके EcoScan ऐप पर जनरेट किया गया 4-अंकों का OTP मांगें।',
    digitalWeighIn: 'डिजिटल वज़न', otpVerified: 'OTP सत्यापित ✓', actualWeightKg: 'वास्तविक वज़न (किग्रा)', applicableRate: 'लागू दर (₹/किग्रा)', confirmWeightPayout: 'वज़न और अंतिम भुगतान की पुष्टि करें',
    settlePayment: 'भुगतान चुकता करें', noCompletedPickups: 'अभी तक कोई पूरा हुआ पिकअप नहीं', completedPickupsDesc: 'आपके सफलतापूर्वक पूरे किए गए स्क्रैप पिकअप यहां दिखेंगे।',
    pending: 'लंबित अनुमोदन', settled: 'सत्यापित/तय',
  },
  TE: {
    dashboard: 'డాష్‌బోర్డ్', facilities: 'కేంద్రాలు', scan: 'స్కాన్', rewards: 'రివార్డులు', guide: 'గైడ్',
    citizen: 'పౌరుడు', collector: 'కలెక్టర్', admin: 'అడ్మిన్', adminDesk: 'అడ్మిన్ డెస్క్', citizenUser: 'పౌర వినియోగదారు', kabadiwalaDesk: 'కబాడీవాలా డెస్క్',
    wasteToValue: 'వ్యర్థం నుంచి విలువ వేదిక', changeLanguage: 'భాష మార్చండి', notifications: 'నోటిఫికేషన్లు', profile: 'ప్రొఫైల్',
    goodMorning: 'శుభోదయం', account: 'ఖాతా', certificate: 'సర్టిఫికేట్', currentLocation: 'ప్రస్తుత స్థానం',
    nearbyCenters: 'సమీప కేంద్రాలు', pickups: 'పికప్‌లు', active: 'క్రియాశీలం', scheduledPickups: 'షెడ్యూల్ చేసిన పికప్‌లు', inFlight: 'ప్రయాణంలో',
    collectorOnWay: 'కలెక్టర్ మార్గంలో ఉన్నారు', collectorArrived: 'కలెక్టర్ చేరుకున్నారు', liveTrip: 'లైవ్ ప్రయాణం', trackingActive: 'ట్రాకింగ్ యాక్టివ్', trackingStopped: 'ట్రాకింగ్ ఆపబడింది',
    collectorLocation: 'కలెక్టర్ స్థానం', pickupDestination: 'పికప్ గమ్యం', pickupAddressUnavailable: 'పికప్ చిరునామా అందుబాటులో లేదు', updated: 'అప్‌డేట్',
    yourLocation: 'మీ స్థానం', pickupLocation: 'పికప్ స్థానం', approximateDistance: 'సుమారు దూరం', estimatedArrival: 'అంచనా రాక',
    mapAttribution: 'OpenStreetMap మ్యాప్', locationUnavailable: 'కలెక్టర్ స్థానం ప్రస్తుతం అందుబాటులో లేదు.', locationWaiting: 'డ్రైవర్ లొకేషన్ షేరింగ్ ప్రారంభించిన తర్వాత కోఆర్డినేట్లు కనిపిస్తాయి.',
    scanWaste: 'AIతో వ్యర్థాన్ని స్కాన్ చేయండి', openCamera: 'కెమెరా తెరవండి', uploadImage: 'చిత్రాన్ని అప్‌లోడ్ చేయండి', analyze: 'వ్యర్థాన్ని విశ్లేషించండి', analyzing: 'వ్యర్థాన్ని విశ్లేషిస్తోంది...',
    cameraUnavailable: 'కెమెరా అందుబాటులో లేదు.', cameraPermission: 'కెమెరా అనుమతి అవసరం.', tryAgain: 'మళ్లీ ప్రయత్నించండి', chooseImage: 'చిత్రాన్ని ఎంచుకోండి',
    wasteAnalysis: 'వ్యర్థ విశ్లేషణ', unableIdentify: 'వ్యర్థాన్ని నమ్మకంగా గుర్తించలేకపోయాము', confidence: 'నమ్మకం', recyclable: 'రీసైకిల్ చేయవచ్చు', notRecyclable: 'రీసైకిల్ చేయలేము', estimatedValue: 'అంచనా విలువ',
    marketRate: 'మార్కెట్ రేటు', disposalInstruction: 'పారవేత సూచనలు', detectedItems: 'గుర్తించిన వస్తువులు', schedulePickup: 'పికప్ షెడ్యూల్ చేయండి',
    ecoCredits: 'ఇకో క్రెడిట్లు', redeem: 'రిడీమ్', redeemNow: 'ఇప్పుడే రిడీమ్ చేయండి', available: 'అందుబాటులో', used: 'ఉపయోగించబడింది', expired: 'గడువు ముగిసింది',
    pickupStatus: 'పికప్ స్థితి', pickupOtp: 'పికప్ OTP', cancel: 'రద్దు చేయండి', reschedule: 'మళ్లీ షెడ్యూల్ చేయండి', viewReceipt: 'రసీదు మరియు రేటింగ్ చూడండి',
    startTrip: 'ప్రయాణం ప్రారంభించండి', resumeSharing: 'షేరింగ్ కొనసాగించండి', pauseSharing: 'షేరింగ్ ఆపండి', completePickup: 'పికప్ పూర్తి చేయండి', verifyOtp: 'OTP ధృవీకరించండి',
    accept: 'అంగీకరించండి', decline: 'తిరస్కరించండి', confirmWeight: 'బరువును నిర్ధారించండి', completed: 'పూర్తయింది', cancelled: 'రద్దయింది', recent: 'ఇటీవలి',
    noApiKey: 'EcoAI సర్వర్‌లో కాన్ఫిగర్ కాలేదు. దయచేసి తర్వాత ప్రయత్నించండి.', temporaryBusy: 'EcoAI ప్రస్తుతం బిజీగా ఉంది. దయచేసి కొద్దిసేపటి తర్వాత ప్రయత్నించండి.',
    ecoAiGreeting: 'నమస్కారం! నేను EcoAI, మీ వ్యక్తిగత వ్యర్థ విజ్ఞాన సహాయకుడిని.', ecoAiAnalyzing: 'EcoAI ఆలోచిస్తోంది...', askEcoAi: 'వ్యర్థాలు మరియు స్క్రాప్ రేట్ల గురించి EcoAIని అడగండి...',
    quickInquiries: 'EcoAI కోసం త్వరిత ప్రశ్నలు', sendQuery: 'ప్రశ్న పంపండి', closeAssistant: 'సహాయకుడిని మూసివేయండి',
    languageChanged: 'భాష {language}కి మార్చబడింది.', networkError: 'నెట్‌వర్క్ లోపం జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.',
    exploreGuest: 'అతిథిగా చూడండి', getStarted: 'ప్రారంభించండి', createAccount: 'కొత్త పౌరుడా? కొత్త ఖాతా సృష్టించండి',
    welcomeBack: 'తిరిగి స్వాగతం', password: 'పాస్‌వర్డ్', otp: 'ఒక్కసారి OTP', createNewAccount: 'కొత్త ఖాతా సృష్టించండి',
    requestSubmitted: 'అభ్యర్థన పంపబడింది', collectorAccepted: 'కలెక్టర్ అంగీకరించారు', weightVerified: 'బరువు ధృవీకరించబడింది',
    switchRole: 'వర్క్‌స్పేస్ పాత్ర మార్చండి', userActivity: 'వినియోగదారు కార్యకలాపాలు', close: 'మూసివేయండి', markAllRead: 'అన్నింటినీ చదివినవిగా గుర్తించండి',
    noNotifications: 'ఇంకా నోటిఫికేషన్లు లేవు', pickupDetails: 'పికప్ వివరాలు', doorstepOtp: 'డోర్‌స్టెప్ OTP', weight: 'బరువు',
    customer: 'కస్టమర్', collectorPartner: 'కలెక్టర్ భాగస్వామి', materialItem: 'పదార్థం', verified: 'ధృవీకరించబడింది', loading: 'లోడ్ అవుతోంది...',
    copy: 'కాపీ చేయండి', noRewards: 'ప్రస్తుతం రివార్డులు అందుబాటులో లేవు.', failedLoad: 'రివార్డులను లోడ్ చేయలేకపోయాము.', saved: 'సేవ్ చేయబడింది', error: 'లోపం',
    pickupCompleted: 'పికప్ పూర్తయింది', level: 'స్థాయి', ecoScore: 'ఇకో స్కోర్', credits: 'క్రెడిట్లు', settings: 'సెట్టింగ్‌లు',
    emailMobile: 'ఈమెయిల్ లేదా మొబైల్ నంబర్', enterEmailMobile: 'ఈమెయిల్ లేదా 10 అంకెల మొబైల్ నమోదు చేయండి', forgotUseOtp: 'మర్చిపోయారా? OTP ఉపయోగించండి',
    enterPassword: 'ఖాతా పాస్‌వర్డ్ నమోదు చేయండి', verificationCode: 'ధృవీకరణ కోడ్', sendOtp: 'OTP పంపండి', resendOtp: 'OTP మళ్లీ పంపండి', signIn: 'సైన్ ఇన్', demoLogin: 'ఒక ట్యాప్ డెమో లాగిన్',
    fullName: 'పూర్తి పేరు', emailAddress: 'ఈమెయిల్ చిరునామా', mobileNumber: 'మొబైల్ నంబర్', creatingProfile: 'ఇకో ప్రొఫైల్ సృష్టిస్తోంది...', verifyCreate: 'OTP ధృవీకరించి ఖాతా సృష్టించండి',
    wasteRecycled: 'రీసైకిల్ చేసిన వ్యర్థాలు', ecoCreditsBalance: 'ఇకో క్రెడిట్ల నిల్వ', aiEcoScore: 'AI ఇకో స్కోరు', geminiRealTimeModel: 'Gemini 3 రియల్-టైమ్ మోడల్',
    aiSmartRecommendations: 'AI స్మార్ట్ సూచనలు', realTimeImpact: 'రియల్-టైమ్ ప్రభావం', totalScans: 'మొత్తం స్కాన్లు', itemsAiAnalyzed: 'AI విశ్లేషించిన వస్తువులు',
    diverted: 'మళ్లించబడింది', dryRecyclables: 'పొడి రీసైకిల్ వస్తువులు', co2Offset: 'CO₂ ఆఫ్‌సెట్', greenhouseGasesSaved: 'హరితగృహ వాయువుల ఆదా',
    done: 'పూర్తయింది', doorstepScrapSales: 'ఇంటి వద్ద స్క్రాప్ అమ్మకాలు', segregationBreakdown: 'వర్గీకరణ వివరాలు', thirtyDays: '30 రోజులు',
    dryRecyclable: 'పొడి రీసైకిల్ వ్యర్థం', organicWet: 'సేంద్రీయ తడి వ్యర్థం', eWaste: 'ఇ-వ్యర్థాలు', hazardous: 'ప్రమాదకరమైనవి',
    householdItemScans: 'ఇంటి వస్తువుల స్కాన్లు', claimed: 'క్లెయిమ్ చేయబడింది!', claim: 'క్లెయిమ్ చేయండి', recentActivity: 'ఇటీవలి కార్యకలాపాలు',
    realTimeBackendLog: 'రియల్-టైమ్ బ్యాకెండ్ లాగ్', viewFullTimeline: 'పూర్తి టైమ్‌లైన్ చూడండి', noRecentActivity: 'ఇంకా ఎటువంటి ఇటీవల కార్యకలాపాలు నమోదు కాలేదు.',
    communityCleanMissions: 'సముదాయ పరిశుభ్రత మిషన్లు', viewAll: 'అన్నీ చూడండి',
    allMaterials: 'అన్ని పదార్థాలు', oldAppliances: 'పాత ఉపకరణాలు', metalsBrass: 'లోహాలు మరియు ఇత్తడి', plasticsCartons: 'ప్లాస్టిక్‌లు మరియు కార్టన్‌లు', eWasteBatteries: 'ఇ-వ్యర్థాలు మరియు బ్యాటరీలు',
    certifiedAtHome: 'ధృవీకరించబడిన ఇంటి సేవ', bulkScrapHeader: 'మీ వద్ద బల్క్ స్క్రాప్ లేదా ఎలక్ట్రానిక్స్ ఉన్నాయా?', bulkScrapDesc: 'ధృవీకరించబడిన డిజిటల్ స్కేల్ మరియు గ్యారెంటీడ్ UPI/ఇన్‌స్టంట్ క్యాష్ చెల్లింపుతో మీ ఇంటి వద్దకే కబాడీవాలాను బుక్ చేసుకోండి.',
    zeroHaggling: 'బేరసారాలు లేవు', within2Hrs: '2 గంటల్లో', instantPayout: 'తక్షణ చెల్లింపు', verifiedCenters: 'ధృవీకరించబడిన కేంద్రాలు',
    listView: 'జాబితా వీక్షణ', mapView: 'మ్యాప్ వీక్షణ', guidelines: 'మార్గదర్శకాలు', navigate: 'మార్గం చూడండి', call: 'కాల్ చేయండి', book: 'బుక్ చేయండి',
    activeBooking: 'క్రియాశీల బుకింగ్', inspectorTimeline: 'ఇన్‌స్పెక్టర్ టైమ్‌లైన్', bookAnotherPickup: 'మరో డోర్‌స్టెప్ పికప్‌ను బుక్ చేయండి',
    scanTitle: 'AIతో వ్యర్థాలను స్కాన్ చేయండి', realTimeAiVision: 'రియల్-టైమ్ AI విజన్ స్కానర్', samplePresets: 'నమూనా స్క్రాప్ ప్రిసెట్లు', instantAppCamera: 'తక్షణ కెమెరా యాప్', quickMaterialLookup: 'త్వరిత పదార్థ శోధన', dropImageHere: 'ఇక్కడ ఇమేజ్ ఫైల్‌ను వేయండి',
    greenSovereignCredits: 'గ్రీన్ సావరిన్ క్రెడిట్లు', ecoRewardsVouchers: 'ఇకో రివార్డులు మరియు వోచర్లు', availableEcoBalance: 'అందుబాటులో ఉన్న ఇకో బాలెన్స్', browseAvailableRewards: 'అందుబాటులో ఉన్న రివార్డులను చూడండి', voucherCode: 'వోచర్ కోడ్', howToUse: 'ఎలా ఉపయోగించాలి:', availablePartnerRewards: 'అందుబాటులో ఉన్న భాగస్వామి రివార్డులు', myRedeemedVouchers: 'నా రిడీమ్ చేసిన వోచర్లు', redeemOffer: 'ఆఫర్‌ను రిడీమ్ చేయండి',
    segregationGuide: '4-బిన్ వర్గీకరణ గైడ్', officialIndianNorms: 'అధికారిక భారతీయ మున్సిపల్ నిబంధనలు.', acceptedItems: 'అంగీకరించిన వస్తువులు:', preparationTip: 'సన్నాహక సూచన:', safetyWarning: 'రక్షణ హెచ్చరిక:',
    incomingRequests: 'వచ్చే అభ్యర్థనలు', activeInProgress: 'ప్రస్తుతం పురోగతిలో ఉన్నాయి', pastPickups: 'గత పికప్‌లు', goOnline: 'ఆన్‌లైన్‌కి వెళ్లండి', goOffline: 'ఆఫ్‌లైన్‌కి వెళ్లండి', approveAccountNow: 'ఇప్పుడే ఖాతాను ఆమోదించండి', totalPayout: 'మొత్తం చెల్లింపు', acceptPickup: 'పికప్ అంగీకరించండి',
    scanWasteCap: 'వ్యర్థాన్ని స్కాన్ చేయండి', schedulePickupCap: 'పికప్ షెడ్యూల్ చేయండి', alreadyRegistered: 'ఇప్పటికే రిజిస్టర్ అయ్యారా?', signInExisting: 'ఉన్న ఖాతాలోకి సైన్ ఇన్ చేయండి', newToEcoScan: 'EcoScan INకి కొత్తవారా?',
    liveCamera: 'లైవ్ కెమెరా (60 FPS)', aiViewfinder: 'AI వ్యూఫైండర్', readyToScanScrap: 'స్క్రాప్ స్కాన్ చేయడానికి సిద్ధంగా ఉంది', autoDetectionActive: 'ఆటో-డిటెక్షన్ యాక్టివ్', liveMandiRates: 'లైవ్ మార్కెట్ రేట్లు',
    scanAnyItemAppraisal: 'తక్షణ అంచనా కోసం ఏ వస్తువునైనా స్కాన్ చేయండి', turnOnCamera: 'రియల్-టైమ్ కెమెరా ఆన్ చేయండి', startingCamera: 'కెమెరా ప్రారంభమవుతోంది...', pointPhoneAtScrap: 'ఫోన్‌ను స్క్రాప్‌పై ఉంచి షట్టర్ బటన్ నొక్కండి',
    mobileShutterDock: 'మొబైల్ షట్టర్ మరియు తక్షణ క్యాప్చర్', realTimeFrame: 'రియల్-టైమ్ ఫ్రేమ్', fastSnapMode: 'ఫాస్ట్ స్నాప్ మోడ్', phoneCamera: 'ఫోన్ కెమెరా', instantApp: 'ఇన్‌స్టంట్ యాప్',
    snapAndIdentify: 'స్నాప్ చేసి గుర్తించండి', galleryFiles: 'గ్యాలరీ / ఫైళ్ళు', deviceStorage: 'డివైస్ స్టోరేజ్', quickTestPresets: 'త్వరిత పరీక్ష ప్రిసెట్లు', browseLocalDrive: 'లోకల్ డ్రైవ్ బ్రౌజ్ చేయండి',
    testScrapPresetsDesc: '1-క్లిక్ ప్రిసెట్లతో స్క్రాప్ గుర్తింపు మరియు లైవ్ ధర గణనను పరీక్షించండి:', ironRodScrapLabel: 'ఇనుప రాడ్ స్క్రాప్', cardboardBoxLabel: 'కార్డ్‌బోర్డ్ బాక్స్', kitchenPeelLabel: 'కిచెన్ తొక్కలు', copperWireLabel: 'రాగి మరియు వైరు',
    nationalSwmCategorization: 'జాతీయ SWM వర్గీకరణ', streamsActive: '4 స్ట్రీమ్‌లు యాక్టివ్', dryScrapLabel: 'పొడి స్క్రాప్', dryScrapDesc: 'ఇనుము, కాగితం, PET', wetWasteLabel: 'తడి వ్యర్థం', wetWasteDesc: 'కిచెన్ తొక్కలు', hazardousDesc: 'సీసం, పెయింట్లు', eWasteDesc: 'PCBలు, రాగి', openPhoneCamera: 'ఫోన్ కెమెరా తెరవండి',
    adminDeskHeader: 'EcoScan అడ్మిన్ డెస్క్', adminSubHeader: 'ప్లాట్‌ఫాం ధృవీకరణ, ధరలు & కార్యకలాపాలు', systemOnline: 'సిస్టమ్ ఆన్‌లైన్',
    totalRecycled: 'మొత్తం రీసైకిల్ చేసినవి', divertedLandfill: 'ల్యాండ్‌ఫిల్ నుండి మళ్లించబడింది', payoutSettled: 'చెల్లింపు పూర్తయింది', toCitizens: 'పౌరులకు',
    pickupsDone: 'పికప్‌లు పూర్తయ్యాయి', completedRate: 'పూర్తయిన రేటు', collectorsCap: 'కలెక్టర్లు', overview: 'అవలోకనం', collectorsTab: 'కలెక్టర్లు',
    scrapPricesTab: 'స్క్రాప్ ధరలు', usersTab: 'వినియోగదారులు', auditLogTab: 'ఆడిట్ లాగ్', partnersTab: 'భాగస్వాములు', pendingKabadiwalaApprovals: 'పెండింగ్ కబాడీవాలా ఆమోదాలు',
    approvalRequiredDesc: 'ఇంటి వద్ద స్క్రాప్ పికప్‌లను అంగీకరించడానికి అనుమతికి ఆమోదం అవసరం', approveAllPending: 'పెండింగ్‌లో ఉన్నవన్నీ ఆమోదించండి', approveAndVerify: 'ఆమోదించి ధృవీకరించండి',
    addCollector: 'కలెక్టర్‌ను జోడించండి', addMaterial: 'పదార్థాన్ని జోడించండి', addPartner: 'భాగస్వామిని జోడించండి', addReward: 'రివార్డ్‌ను జోడించండి', savePrice: 'ధర సేవ్ చేయండి', editPrice: 'ధర మార్చండి', actions: 'చర్యలు',
    rating: 'రేటింగ్', verifiedPartner: 'ధృవీకరించబడిన భాగస్వామి', noRatingsYet: 'ఇంకా రేటింగ్‌లు లేవు', onlineReceiving: 'ఆన్‌లైన్ & సమీప పికప్ అభ్యర్థనలను స్వీకరిస్తోంది', offlineBusy: 'ఆఫ్‌లైన్ / ప్రస్తుతం బిజీగా ఉన్నారు',
    accountPendingApproval: 'ఖాతా అడ్మిన్ ఆమోదం కోసం పెండింగ్‌లో ఉంది', instantApproveDesc: 'లైవ్ పికప్ పరీక్ష కోసం మీ ఖాతాను తక్షణమే ఆమోదించడానికి క్రింద క్లిక్ చేయండి:',
    noNewRequestsPending: 'కొత్త అభ్యర్థనలు ఏవీ పెండింగ్‌లో లేవు', keepOnlineDesc: 'మీ ప్రాంతంలో పికప్ అభ్యర్థనలను ఆటోమేటిక్‌గా స్వీకరించడానికి మీ స్థితిని "ఆన్‌లైన్"లో ఉంచండి.',
    doorstepScrapRequest: 'డోర్‌స్టెప్ స్క్రాప్ అభ్యర్థన', materialCategory: 'పదార్థ వర్గం', estimatedWeight: 'అంచనా వేసిన బరువు', preferredSlot: 'ప్రాధాన్యత సమయం', itemsSummary: 'వస్తువుల సారాంశం',
    noActivePickups: 'ప్రస్తుతం యాక్టివ్ పికప్‌లు లేవు', acceptIncomingDesc: 'రూట్‌లను ప్రారంభించడానికి మరియు వ్యర్థాలను సేకరించడానికి వచ్చే అభ్యర్థనలను అంగీకరించండి.',
    markArrived: 'ఇంటి వద్దకు చేరుకున్నట్లు మార్క్ చేయండి', customerOtpVerification: 'కస్టమర్ OTP ధృవీకరణ', askCustomerOtp: 'కస్టమర్ వారి EcoScan యాప్‌లో జనరేట్ చేసిన 4-అంకెల OTP కోడ్‌ను అడగండి.',
    digitalWeighIn: 'డిజిటల్ బరువు నమోదు', otpVerified: 'OTP ధృవీకరించబడింది ✓', actualWeightKg: 'అసలు బరువు (కేజీ)', applicableRate: 'వర్తించే రేటు (₹/కేజీ)', confirmWeightPayout: 'బరువు & తుది చెల్లింపును నిర్ధారించండి',
    settlePayment: 'చెల్లింపును పూర్తి చేయండి', noCompletedPickups: 'ఇంకా పూర్తయిన పికప్‌లు లేవు', completedPickupsDesc: 'మీరు విజయవంతంగా పూర్తి చేసిన స్క్రాప్ పికప్‌లు ఇక్కడ కనిపిస్తాయి.',
    pending: 'పెండింగ్ ఆమోదం', settled: 'పూర్తయింది',
  },
} satisfies Record<Language, Record<string, string>>;

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('ecoscan_language');
      return saved === 'HI' || saved === 'TE' || saved === 'EN' ? saved : 'EN';
    } catch {
      return 'EN';
    }
  });

  const setLanguage = (nextLanguage: Language) => setLanguageState(nextLanguage);

  useEffect(() => {
    try {
      localStorage.setItem('ecoscan_language', language);
      document.documentElement.lang = language === 'HI' ? 'hi' : language === 'TE' ? 'te' : 'en';
    } catch {
      // Storage can be unavailable in private browsing; the in-memory selection still works.
    }
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    t: (key, values) => {
      let text = translations[language][key] || translations.EN[key] || key;
      Object.entries(values || {}).forEach(([name, replacement]) => {
        text = text.replace(`{${name}}`, String(replacement));
      });
      return text;
    },
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
};
