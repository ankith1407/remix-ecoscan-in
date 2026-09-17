import React, { useState, useEffect } from 'react';
import {
  ScreenType,
  ScrapRate,
  UserEcoProfile,
  ImpactMetrics,
  SegregationBreakdown,
  DailyQuest,
  CommunityMission,
  Facility,
  ScheduledPickup,
  AuthUser,
  UserRole,
} from './types';
import {
  INITIAL_SCRAP_RATES,
  INITIAL_USER_PROFILE,
  INITIAL_IMPACT_METRICS,
  INITIAL_SEGREGATION,
  INITIAL_DAILY_QUEST,
  COMMUNITY_MISSIONS,
  INITIAL_FACILITIES,
  INITIAL_PICKUPS,
  getFreshUserProfile,
  FRESH_IMPACT_METRICS,
  FRESH_SEGREGATION,
  FRESH_DAILY_QUEST,
} from './data/mockData';
import { api } from './services/api';
import { getCollectorAvatarByName, CollectorAvatar } from './components/CollectorAvatar';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { DashboardScreen } from './screens/DashboardScreen';
import { FacilitiesScreen } from './screens/FacilitiesScreen';
import { ScanScreen } from './screens/ScanScreen';
import { GuideScreen } from './screens/GuideScreen';
import { RewardsScreen } from './screens/RewardsScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { CollectorDashboard } from './screens/CollectorDashboard';
import { AdminDashboard } from './screens/AdminDashboard';
import { CertificateModal } from './components/CertificateModal';
import { SchedulePickupModal } from './components/SchedulePickupModal';
import { ProfileAccountModal } from './components/ProfileAccountModal';
import { PartnerDashboardModal } from './components/PartnerDashboardModal';
import { EcoAiDrawer } from './components/GeminiDrawer';
import { EcoBackground } from './components/EcoBackground';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { PickupDetailModal } from './components/PickupDetailModal';
import { ActivityTimelineModal } from './components/ActivityTimelineModal';
import { PickupConfirmationModal } from './components/PickupConfirmationModal';
import { PickupReceiptModal } from './components/PickupReceiptModal';
import { RatingModal } from './components/RatingModal';
import { DbNotification, DbUserActivity, DbPickupItem } from './types';
import { useI18n } from './i18n';

export default function App() {
  const { language, setLanguage, t } = useI18n();
  // Authentication screen flow: 'welcome' | 'login' | 'register' | 'authenticated'
  const [authScreen, setAuthScreen] = useState<'welcome' | 'login' | 'register' | 'authenticated'>(() => {
    try {
      const saved = localStorage.getItem('ecoscan_auth_screen');
      if (saved && ['welcome', 'login', 'register', 'authenticated'].includes(saved)) {
        return saved as 'welcome' | 'login' | 'register' | 'authenticated';
      }
    } catch {
      // ignore
    }
    return 'welcome';
  });

  // Role switching: Citizen User vs. Kabadiwala Collector vs. Admin Operations Desk
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('ecoscan_active_role');
      if (saved && ['user', 'collector', 'admin'].includes(saved)) {
        return saved as UserRole;
      }
    } catch {
      // ignore
    }
    return 'user';
  });

  const [savedUsers, setSavedUsers] = useState<AuthUser[]>(() => {
    try {
      const saved = localStorage.getItem('ecoscan_saved_users');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'usr_aditi',
        name: 'Aditi Rao',
        email: 'aditi.rao@gmail.com',
        phoneNumber: '+91 98450 12345',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    try {
      const saved = localStorage.getItem('ecoscan_current_screen');
      if (saved) return saved as ScreenType;
    } catch {
      // ignore
    }
    return 'dashboard';
  });

  // Save authScreen, currentScreen, and activeRole when updated
  useEffect(() => {
    try {
      localStorage.setItem('ecoscan_auth_screen', authScreen);
    } catch {}
  }, [authScreen]);

  useEffect(() => {
    try {
      localStorage.setItem('ecoscan_current_screen', currentScreen);
    } catch {}
  }, [currentScreen]);

  useEffect(() => {
    try {
      localStorage.setItem('ecoscan_active_role', activeRole);
    } catch {}
  }, [activeRole]);

  useEffect(() => {
    if (authScreen !== 'authenticated') return;
    api.getCurrentUser().catch(() => {
      setAuthScreen('welcome');
      setActiveRole('user');
      localStorage.removeItem('ecoscan_auth_screen');
    });
  }, [authScreen]);

  // Core interactive states
  const [rates, setRates] = useState<ScrapRate[]>(INITIAL_SCRAP_RATES);

  const fetchDynamicRates = async () => {
    try {
      const dbMats = await api.getMaterials();
      if (dbMats && dbMats.length > 0) {
        const mapped: ScrapRate[] = dbMats.map((m) => {
          let cat: 'paper' | 'plastic' | 'metal' | 'ewaste' = 'paper';
          const c = (m.category || '').toLowerCase();
          if (c.includes('metal')) cat = 'metal';
          else if (c.includes('plastic')) cat = 'plastic';
          else if (c.includes('paper') || c.includes('cardboard')) cat = 'paper';
          else if (c.includes('ewaste') || c.includes('e-waste')) cat = 'ewaste';

          return {
            id: m.id,
            name: m.material_name,
            rate: m.current_price_per_kg,
            unit: m.unit || '₹/kg',
            trend: 'up',
            category: cat,
          };
        });
        setRates(mapped);
      }
    } catch (err) {
      console.warn('Scrap rates loaded with local fallback:', err);
    }
  };

  useEffect(() => {
    fetchDynamicRates();
  }, []);
  const [userProfile, setUserProfile] = useState<UserEcoProfile>(() => {
    try {
      const savedProfile = localStorage.getItem('ecoscan_active_profile');
      if (savedProfile) return JSON.parse(savedProfile);
    } catch {
      // ignore
    }
    return {
      ...INITIAL_USER_PROFILE,
      name: 'Aditi Rao',
      email: 'aditi.rao@gmail.com',
      phoneNumber: '+91 98450 12345',
    };
  });

  const [impactMetrics, setImpactMetrics] = useState<ImpactMetrics>(INITIAL_IMPACT_METRICS);
  const [segregation, setSegregation] = useState<SegregationBreakdown>(INITIAL_SEGREGATION);
  const [dailyQuest, setDailyQuest] = useState<DailyQuest>(INITIAL_DAILY_QUEST);
  const [missions] = useState<CommunityMission[]>(COMMUNITY_MISSIONS);
  const [facilities] = useState<Facility[]>(INITIAL_FACILITIES);
  const [pickups, setPickups] = useState<ScheduledPickup[]>(INITIAL_PICKUPS);

  // Modals & Drawers
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [selectedFacilityForPickup, setSelectedFacilityForPickup] = useState<string | undefined>();
  const [prefilledPickupDetails, setPrefilledPickupDetails] = useState<{
    itemName?: string;
    weightKg?: number;
    payout?: string;
  } | undefined>();
  const [isEcoAiDrawerOpen, setIsEcoAiDrawerOpen] = useState(false);

  // User Notifications, Activity Logs & Inspector Modals State
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [userActivities, setUserActivities] = useState<DbUserActivity[]>([]);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isActivityTimelineModalOpen, setIsActivityTimelineModalOpen] = useState(false);
  const [selectedPickupForInspector, setSelectedPickupForInspector] = useState<DbPickupItem | null>(null);
  const [isPickupDetailModalOpen, setIsPickupDetailModalOpen] = useState(false);

  // Confirmation, Receipt & Rating Modals
  const [createdPickupForConfirmation, setCreatedPickupForConfirmation] = useState<DbPickupItem | null>(null);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [selectedPickupForReceipt, setSelectedPickupForReceipt] = useState<DbPickupItem | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPickupForRating, setSelectedPickupForRating] = useState<DbPickupItem | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  const activeUserId = userProfile.email === 'aditi.rao@gmail.com' ? 'usr_aditi' : userProfile.id || 'usr_aditi';

  // Live polling for activity feed, notifications & pickup status sync
  useEffect(() => {
    let isMounted = true;

    const fetchLiveUserFeed = async () => {
      if (authScreen !== 'authenticated') return;
      try {
        const [notifsData, activitiesData, remotePickups] = await Promise.all([
          api.getNotifications(activeUserId, activeRole).catch(() => []),
          api.getUserActivities(activeUserId).catch(() => []),
          api.getPickups({ userId: activeUserId }).catch(() => []),
        ]);

        if (!isMounted) return;
        setNotifications(notifsData);
        setUserActivities(activitiesData);

        if (remotePickups && remotePickups.length > 0) {
          const mappedPickups: ScheduledPickup[] = remotePickups.map((p) => {
            const isCompleted = p.status === 'COMPLETED';
            const isCancelled = p.status === 'CANCELLED' || p.status === 'REJECTED' || p.status === 'FAILED';

            let statusText = `${t('pickupStatus')} • EN ROUTE`;
            if (p.status === 'COMPLETED') statusText = `${t('completed')} ✓`;
            else if (p.status === 'CANCELLED') statusText = `${t('cancelled')} ✕`;
            else if (p.status === 'COLLECTOR_ON_THE_WAY' || p.status === 'ON_THE_WAY') statusText = t('collectorOnWay');
            else if (p.status === 'ARRIVED') statusText = t('collectorArrived');
            else if (p.status === 'WEIGHED' || p.status === 'WEIGHT_VERIFIED') statusText = t('weightVerified');
            else if (p.status === 'REQUESTED') statusText = t('requestSubmitted');
            else if (p.status === 'ACCEPTED') statusText = t('collectorAccepted');

            return {
              id: p.id,
              status: (isCompleted ? 'completed' : isCancelled ? 'pending' : 'confirmed') as 'completed' | 'pending' | 'confirmed',
              statusText,
              dateTimeSlot: `${p.preferred_date || 'Today'} • ${p.preferred_time || '10:30 AM'}`,
              partnerName: p.collector_name || 'Raju Kumar (Green Earth Kabadiwala Hub)',
              partnerVehicle: 'TS 09 EC 4821 (E-Loader Rickshaw)',
              partnerRating: '4.9 ★',
              partnerImage: getCollectorAvatarByName(p.collector_name || 'Raju Kumar'),
              collectorImage: getCollectorAvatarByName(p.collector_name || 'Raju Kumar'),
              pickupsCount: '340+ Pickups',
              phone: p.user_phone || '+91 98450 12345',
              otp: p.otp,
              itemsSummary: p.items_summary || p.waste_category,
              weightEst: `${p.actual_weight || p.estimated_weight} kg verified weight`,
              payoutEst: `₹${p.final_value || p.estimated_value}`,
              isFixedPrice: false,
              collectorStatus: p.status,
            };
          });
          setPickups(mappedPickups);
        }
      } catch (err) {
        console.warn('Error fetching live user feed:', err);
      }
    };

    fetchLiveUserFeed();
    const interval = setInterval(fetchLiveUserFeed, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeUserId, activeRole, authScreen, language, t]);

  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      const updated = await api.markNotificationRead(notifId);
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? updated : n)));
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead(activeUserId, activeRole);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read: true })));
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err);
    }
  };

  const handleOpenReceipt = async (pickupId: string) => {
    try {
      const remotePickups = await api.getPickups({ userId: activeUserId });
      const found = remotePickups.find((p) => p.id === pickupId);
      if (found) {
        setSelectedPickupForReceipt(found);
        setIsReceiptModalOpen(true);
      } else {
        showToast('Receipt details not found');
      }
    } catch {
      showToast('Could not load receipt');
    }
  };

  const handleSelectPickupForInspector = async (pickupId: string) => {
    try {
      const remotePickups = await api.getPickups({ userId: activeUserId });
      const found = remotePickups.find((p) => p.id === pickupId);
      if (found) {
        setSelectedPickupForInspector(found);
        setIsPickupDetailModalOpen(true);
      } else {
        showToast('Pickup details not found.');
      }
    } catch (err) {
      showToast('Could not fetch pickup details.');
    }
  };

  // Toast / notice
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Persist saved users whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('ecoscan_saved_users', JSON.stringify(savedUsers));
    } catch {
      // ignore
    }
  }, [savedUsers]);

  // Persist active user profile whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('ecoscan_active_profile', JSON.stringify(userProfile));
      if (userProfile.email) {
        localStorage.setItem(
          `ecoscan_user_data_${userProfile.email}`,
          JSON.stringify({
            userProfile,
            impactMetrics,
            segregation,
            dailyQuest,
            pickups,
          })
        );
      }
    } catch {
      // ignore
    }
  }, [userProfile, impactMetrics, segregation, dailyQuest, pickups]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleToggleLanguage = () => {
    setLanguage(language === 'EN' ? 'HI' : language === 'HI' ? 'TE' : 'EN');
  };

  // Helper to load user-specific dataset or initialize fresh/demo data
  const loadUserDataForUser = (user: AuthUser) => {
    try {
      const saved = localStorage.getItem(`ecoscan_user_data_${user.email}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.userProfile) setUserProfile(data.userProfile);
        if (data.impactMetrics) setImpactMetrics(data.impactMetrics);
        if (data.segregation) setSegregation(data.segregation);
        if (data.dailyQuest) setDailyQuest(data.dailyQuest);
        if (data.pickups && Array.isArray(data.pickups)) {
          const seen = new Set<string>();
          const deduped = data.pickups.filter((p: ScheduledPickup) => {
            if (!p || !p.id || seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
          setPickups(deduped);
        }
        return;
      }
    } catch {
      // ignore
    }

    // Default if no stored data
    if (user.email === 'aditi.rao@gmail.com') {
      setUserProfile({
        ...INITIAL_USER_PROFILE,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
      });
      setImpactMetrics(INITIAL_IMPACT_METRICS);
      setSegregation(INITIAL_SEGREGATION);
      setDailyQuest(INITIAL_DAILY_QUEST);
      setPickups(INITIAL_PICKUPS);
    } else {
      // Completely fresh data for new users as requested!
      const freshProf = getFreshUserProfile(user.name, user.email, user.phoneNumber);
      setUserProfile(freshProf);
      setImpactMetrics(FRESH_IMPACT_METRICS);
      setSegregation(FRESH_SEGREGATION);
      setDailyQuest(FRESH_DAILY_QUEST);
      setPickups([]);
    }
  };

  const handleLoginSuccess = (user: AuthUser) => {
    loadUserDataForUser(user);
    setActiveRole(user.role || 'user');
    setCurrentScreen('dashboard');

    // Ensure user is in savedUsers
    setSavedUsers((prev) => {
      const exists = prev.find((u) => u.email === user.email || u.phoneNumber === user.phoneNumber);
      if (exists) {
        return prev.map((u) => (u.id === exists.id ? user : u));
      }
      return [user, ...prev];
    });

    setAuthScreen('authenticated');
    showToast(`Welcome back, ${user.name}!`);
  };

  const handleRegisterSuccess = (newUser: AuthUser) => {
    // Brand new user creates account: start completely fresh!
    const freshProfile = getFreshUserProfile(newUser.name, newUser.email, newUser.phoneNumber);

    setUserProfile(freshProfile);
    setImpactMetrics(FRESH_IMPACT_METRICS);
    setSegregation(FRESH_SEGREGATION);
    setDailyQuest(FRESH_DAILY_QUEST);
    setPickups([]);

    try {
      localStorage.setItem(
        `ecoscan_user_data_${newUser.email}`,
        JSON.stringify({
          userProfile: freshProfile,
          impactMetrics: FRESH_IMPACT_METRICS,
          segregation: FRESH_SEGREGATION,
          dailyQuest: FRESH_DAILY_QUEST,
          pickups: [],
        })
      );
    } catch {
      // ignore
    }

    setSavedUsers((prev) => [newUser, ...prev.filter((u) => u.email !== newUser.email)]);
    setAuthScreen('authenticated');
    setCurrentScreen('dashboard');
    showToast(`Welcome ${newUser.name}! Your fresh account is ready.`);
  };

  const handleSwitchAccount = (account: AuthUser) => {
    loadUserDataForUser(account);
    showToast(`Switched account to ${account.name}`);
  };

  const handleSignOut = () => {
    void api.logout();
    setAuthScreen('welcome');
    showToast('Signed out of EcoScan IN');
  };

  const handleClaimQuest = () => {
    if (dailyQuest.isClaimed) return;
    setDailyQuest((prev) => ({ ...prev, isClaimed: true }));
    setUserProfile((prev) => ({
      ...prev,
      points: Math.min(prev.maxPoints, prev.points + dailyQuest.pointsReward),
      ecoScore: Math.min(100, prev.ecoScore + 2),
    }));
    showToast(`+${dailyQuest.pointsReward} Eco Points Claimed! Well done!`);
  };

  const handleAddScanPoint = (pts: number, stream?: 'dry' | 'wet' | 'hazard' | 'ewaste') => {
    setUserProfile((prev) => ({
      ...prev,
      points: Math.min(prev.maxPoints, prev.points + pts),
      ecoScore: Math.min(100, prev.ecoScore + 3),
    }));

    setImpactMetrics((prev) => ({
      ...prev,
      totalScans: prev.totalScans + 1,
      dryDivertedKg:
        stream === 'dry' || !stream
          ? Number((prev.dryDivertedKg + 0.5).toFixed(1))
          : prev.dryDivertedKg,
      co2OffsetKg: Number((prev.co2OffsetKg + 0.35).toFixed(1)),
      lastUpdated: 'Just now',
    }));

    setSegregation((prev) => {
      const activeStream = stream || 'dry';
      // If previously completely empty (fresh user), initialize first slice to 100%
      if (
        prev.dryRecyclable === 0 &&
        prev.organicWet === 0 &&
        prev.eWaste === 0 &&
        prev.hazardous === 0
      ) {
        if (activeStream === 'dry') return { dryRecyclable: 100, organicWet: 0, eWaste: 0, hazardous: 0 };
        if (activeStream === 'wet') return { dryRecyclable: 0, organicWet: 100, eWaste: 0, hazardous: 0 };
        if (activeStream === 'ewaste') return { dryRecyclable: 0, organicWet: 0, eWaste: 100, hazardous: 0 };
        return { dryRecyclable: 0, organicWet: 0, eWaste: 0, hazardous: 100 };
      }
      return prev;
    });

    setDailyQuest((prev) => ({
      ...prev,
      completedCount: Math.min(prev.totalRequired, prev.completedCount + 1),
    }));
  };

  const handleOpenScheduleModal = (
    facilityName?: string,
    itemName?: string,
    weightKg?: number,
    payout?: string
  ) => {
    setSelectedFacilityForPickup(facilityName);
    setPrefilledPickupDetails(itemName ? { itemName, weightKg, payout } : undefined);
    setIsScheduleModalOpen(true);
  };

  const handleConfirmPickup = async (newPickup: ScheduledPickup) => {
    setPickups((prev) => {
      const seen = new Set<string>();
      const combined = [newPickup, ...prev];
      return combined.filter((p) => {
        if (!p || !p.id || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    });
    setIsScheduleModalOpen(false);
    setImpactMetrics((prev) => ({
      ...prev,
      pickupsDone: prev.pickupsDone + 1,
    }));

    // Fetch backend item details to show Confirmation Modal
    try {
      const remotePickups = await api.getPickups({ userId: activeUserId }).catch(() => []);
      const found = remotePickups.find((p) => p.id === newPickup.id);
      if (found) {
        setCreatedPickupForConfirmation(found);
        setIsConfirmationModalOpen(true);
      } else {
        showToast('Pickup was created, but confirmation details are still loading.');
      }
    } catch {
      showToast(`Doorstep Pickup Booked! ID: ${newPickup.id} (OTP: ${newPickup.otp})`);
    }
  };

  const handleCancelPickup = async (pickupId: string) => {
    try {
      await api.cancelPickup(pickupId, activeUserId, 'user', 'Cancelled by citizen');
      setPickups((prev) => prev.filter((p) => p.id !== pickupId));
      showToast('Pickup request cancelled.');
    } catch {
      setPickups((prev) => prev.filter((p) => p.id !== pickupId));
      showToast('Pickup request cancelled.');
    }
  };

  if (authScreen === 'welcome') {
    return (
      <div className="relative min-h-screen">
        <EcoBackground authScreen="welcome" />
        <WelcomeScreen
          onGetStarted={() => setAuthScreen('login')}
          onCreateAccount={() => setAuthScreen('register')}
          onContinueAsGuest={() => setAuthScreen('authenticated')}
        />
      </div>
    );
  }

  if (authScreen === 'login') {
    return (
      <div className="relative min-h-screen">
        <EcoBackground authScreen="login" />
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onNavigateToRegister={() => setAuthScreen('register')}
          onBackToWelcome={() => setAuthScreen('welcome')}
        />
      </div>
    );
  }

  if (authScreen === 'register') {
    return (
      <div className="relative min-h-screen">
        <EcoBackground authScreen="register" />
        <RegisterScreen
          onRegisterSuccess={handleRegisterSuccess}
          onNavigateToLogin={() => setAuthScreen('login')}
          onBackToWelcome={() => setAuthScreen('welcome')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F8F4] text-[#111111] flex flex-col selection:bg-[#3FA66B] selection:text-[#FFFFFF] antialiased relative">
      <EcoBackground currentScreen={currentScreen} activeRole={activeRole} authScreen="authenticated" />
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#111111] border border-[#3FA66B]/50 text-[#FFFFFF] px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-[#3FA66B] text-[18px]">verified</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header with Profile Options & Role Switcher */}
      <Header
        language={language}
        userName={userProfile.name}
        activeRole={activeRole}
        unreadNotificationCount={notifications.filter((n) => !n.is_read && !n.read).length}
        onToggleLanguage={handleToggleLanguage}
        onChangeLanguage={setLanguage}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onSwitchRole={(role) => {
          setActiveRole(role);
          showToast(
            role === 'admin'
              ? 'Switched to Admin Operations & Mandi Pricing Desk'
              : role === 'collector'
              ? 'Switched to Kabadiwala Partner Workflow'
              : 'Switched to Citizen App'
          );
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-16 pb-12">
        {activeRole === 'collector' ? (
          <CollectorDashboard
            onRefresh={fetchDynamicRates}
            onSwitchRole={(role) => setActiveRole(role)}
          />
        ) : activeRole === 'admin' ? (
          <AdminDashboard onRefresh={fetchDynamicRates} />
        ) : (
          <>
            {currentScreen === 'dashboard' && (
              <DashboardScreen
                rates={rates}
                userProfile={userProfile}
                impactMetrics={impactMetrics}
                segregation={segregation}
                dailyQuest={dailyQuest}
                missions={missions}
                recentActivities={userActivities}
                onClaimQuest={handleClaimQuest}
                onOpenCertificate={() => setIsCertModalOpen(true)}
                onOpenAccountModal={() => setIsProfileModalOpen(true)}
                onOpenActivityHistory={() => setIsActivityTimelineModalOpen(true)}
                onNavigate={(screen) => setCurrentScreen(screen)}
                onSelectMission={(mission) => {
                  showToast(`Joined ${mission.title} in ${mission.location}!`);
                }}
              />
            )}

            {currentScreen === 'facilities' && (
              <FacilitiesScreen
                rates={rates}
                facilities={facilities}
                pickups={pickups}
                userId={activeUserId}
                onOpenScheduleModal={handleOpenScheduleModal}
                onCancelPickup={handleCancelPickup}
                onSelectPickup={handleSelectPickupForInspector}
                onOpenReceipt={handleOpenReceipt}
              />
            )}

            {currentScreen === 'scan' && (
              <ScanScreen
                onAddScanPoint={handleAddScanPoint}
                userScanCounts={{
                  dry: segregation.dryRecyclable > 0 ? Math.round(segregation.dryRecyclable / 5) : 0,
                  wet: segregation.organicWet > 0 ? Math.round(segregation.organicWet / 5) : 0,
                  hazard: segregation.hazardous > 0 ? Math.round(segregation.hazardous / 5) : 0,
                  ewaste: segregation.eWaste > 0 ? Math.round(segregation.eWaste / 5) : 0,
                }}
                onOpenScheduleModal={handleOpenScheduleModal}
                onNavigateToFacilities={() => setCurrentScreen('facilities')}
              />
            )}

            {currentScreen === 'guide' && (
              <GuideScreen onNavigateToScan={() => setCurrentScreen('scan')} />
            )}

            {currentScreen === 'rewards' && (
              <RewardsScreen
                userProfile={userProfile}
                onDeductPoints={(pts, voucherTitle) => {
                  setUserProfile((prev) => ({
                    ...prev,
                    points: Math.max(0, prev.points - pts),
                  }));
                  showToast(`Voucher redeemed: ${voucherTitle}!`);
                }}
                onOpenCertificate={() => setIsCertModalOpen(true)}
                onOpenPartnerDashboard={() => setIsPartnerModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Floating EcoAi Chatbot Trigger & Drawer */}
      <EcoAiDrawer
        isOpen={isEcoAiDrawerOpen}
        onClose={() => setIsEcoAiDrawerOpen(false)}
        onOpen={() => setIsEcoAiDrawerOpen(true)}
      />

      {/* Bottom Sticky Navigation (Shown for Citizen View) */}
      {activeRole === 'user' && (
        <Navigation
          currentScreen={currentScreen}
          onSelectScreen={(screen) => setCurrentScreen(screen)}
        />
      )}

      {/* Modals */}
      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        activeRole={activeRole}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onSelectPickup={handleSelectPickupForInspector}
        onOpenActivityHistory={() => setIsActivityTimelineModalOpen(true)}
      />

      <PickupDetailModal
        isOpen={isPickupDetailModalOpen}
        onClose={() => setIsPickupDetailModalOpen(false)}
        pickup={selectedPickupForInspector}
      />

      <ActivityTimelineModal
        isOpen={isActivityTimelineModalOpen}
        onClose={() => setIsActivityTimelineModalOpen(false)}
        activities={userActivities}
        onSelectPickup={handleSelectPickupForInspector}
      />

      <ProfileAccountModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={userProfile}
        savedUsers={savedUsers}
        activeRole={activeRole}
        onSwitchRole={(role) => {
          setActiveRole(role);
          showToast(
            role === 'admin'
              ? 'Switched to Admin Operations & Mandi Pricing Desk'
              : role === 'collector'
              ? 'Switched to Kabadiwala Partner Workflow'
              : 'Switched to Citizen App'
          );
        }}
        onSwitchAccount={handleSwitchAccount}
        onOpenLogin={() => setAuthScreen('login')}
        onOpenRegister={() => setAuthScreen('register')}
        onOpenCertificate={() => setIsCertModalOpen(true)}
        onSignOut={handleSignOut}
      />

      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        user={userProfile}
      />

      <SchedulePickupModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onConfirm={handleConfirmPickup}
        preselectedFacilityName={selectedFacilityForPickup}
        preselectedItemName={prefilledPickupDetails?.itemName}
        preselectedWeightKg={prefilledPickupDetails?.weightKg}
        preselectedPayout={prefilledPickupDetails?.payout}
        userId={activeUserId}
      />

      <PartnerDashboardModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
      />

      <PickupConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        pickup={createdPickupForConfirmation}
        onViewPickups={() => {
          setCurrentScreen('facilities');
        }}
      />

      <PickupReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        pickup={selectedPickupForReceipt}
        onOpenRating={(pickup) => {
          setSelectedPickupForRating(pickup);
          setIsRatingModalOpen(true);
        }}
      />

      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        pickup={selectedPickupForRating}
        onSuccess={() => {
          showToast('Thank you for rating your collector experience!');
        }}
      />
    </div>
  );
}
