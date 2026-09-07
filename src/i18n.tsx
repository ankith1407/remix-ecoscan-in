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
