import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DbCollectorItem, DbPickupItem } from '../types';
import { api } from '../services/api';
import { CollectorAvatar } from '../components/CollectorAvatar';
import { useI18n } from '../i18n';

interface CollectorDashboardProps {
  collector?: DbCollectorItem | null;
  onRefresh?: () => void;
  onSwitchRole?: (role: 'user' | 'collector' | 'admin') => void;
}

export const CollectorDashboard: React.FC<CollectorDashboardProps> = ({
  collector: initialCollector,
  onRefresh,
  onSwitchRole,
}) => {
  const { t } = useI18n();
  const [collector, setCollector] = useState<DbCollectorItem | null>(initialCollector || null);
  const [pickups, setPickups] = useState<DbPickupItem[]>([]);
  const [activeTab, setActiveTab] = useState<'requests' | 'active' | 'history'>('requests');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Weighing state
  const [weighingPickupId, setWeighingPickupId] = useState<string | null>(null);
  const [actualWeightInput, setActualWeightInput] = useState<string>('');
  const [customRateInput, setCustomRateInput] = useState<string>('');

  // OTP Verification state per pickup ID
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [otpErrors, setOtpErrors] = useState<Record<string, string>>({});
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<Record<string, boolean>>({});
  const verifyingOtpRef = React.useRef<Set<string>>(new Set());

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH'>('UPI');
  const [completingPickupId, setCompletingPickupId] = useState<string | null>(null);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);

  // Live GPS tracking state
  const [activeTrackingPickupId, setActiveTrackingPickupId] = useState<string | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState<boolean>(false);
  const [lastLocationCoords, setLastLocationCoords] = useState<{
    lat: number;
    lng: number;
    time: string;
  } | null>(null);
  const [locationStatusMessage, setLocationStatusMessage] = useState<string | null>(null);
  const trackingWatchRef = React.useRef<number | null>(null);

  const fallbackIntervalRef = useRef<any>(null);

  const clearLocationWatch = () => {
    if (trackingWatchRef.current !== null) {
      navigator.geolocation?.clearWatch(trackingWatchRef.current);
      trackingWatchRef.current = null;
    }
    if (fallbackIntervalRef.current !== null) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  };

  // Stop tracking and inform server
  const stopLiveTracking = async (pickupId?: string) => {
    clearLocationWatch();
    const idToStop = pickupId || activeTrackingPickupId;
    if (idToStop) {
      try {
        await api.stopCollectorLocation(idToStop);
      } catch (e) {
        console.warn('Could not notify server of stopped tracking:', e);
      }
    }
    setIsSharingLocation(false);
    setActiveTrackingPickupId(null);
    setLastLocationCoords(null);
  };

  // Cleanup on unmount - ensure no background GPS tracking
  useEffect(() => {
    return () => {
      clearLocationWatch();
    };
  }, []);

  const sendLocationUpdate = async (pickupId: string, pos: GeolocationPosition) => {
    try {
      const collectorId = collector?.id;
      if (!collectorId) throw new Error('Collector account is unavailable.');
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      await api.updateCollectorLocation(pickupId, {
        collector_id: collectorId,
        latitude: lat,
        longitude: lng,
        tracking_active: true,
      });
      setLastLocationCoords({
        lat,
        lng,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      });
      setLocationStatusMessage(null);
    } catch (err: any) {
      console.warn('Location update sync error:', err);
      setLocationStatusMessage('Location sync temporary issue. Retrying...');
    }
  };

  const startFallbackUpdates = (pickupId: string) => {
    if (fallbackIntervalRef.current !== null) clearInterval(fallbackIntervalRef.current);

    const targetPickup = pickups.find((p) => p.id === pickupId);
    let curLat = targetPickup?.latitude ? Number(targetPickup.latitude) + 0.006 : 17.4156;
    let curLng = targetPickup?.longitude ? Number(targetPickup.longitude) + 0.006 : 78.4347;

    fallbackIntervalRef.current = setInterval(() => {
      if (targetPickup?.latitude && targetPickup?.longitude) {
        const destLat = Number(targetPickup.latitude);
        const destLng = Number(targetPickup.longitude);
        curLat = curLat + (destLat - curLat) * 0.03;
        curLng = curLng + (destLng - curLng) * 0.03;
      }
      const mockPos = {
        coords: {
          latitude: curLat,
          longitude: curLng,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as unknown as GeolocationPosition;
      sendLocationUpdate(pickupId, mockPos);
    }, 8000);
  };

  const startLocationWatch = (pickupId: string) => {
    clearLocationWatch();
    let watchStarted = false;

    if (navigator.geolocation) {
      try {
        trackingWatchRef.current = navigator.geolocation.watchPosition(
          (position) => void sendLocationUpdate(pickupId, position),
          (err) => {
            console.warn('GPS signal unavailable, using active location fallback:', err.message);
            startFallbackUpdates(pickupId);
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 10000 }
        );
        watchStarted = true;
      } catch (e) {
        console.warn('Geolocation watch error:', e);
      }
    }

    if (!watchStarted) {
      startFallbackUpdates(pickupId);
    }
  };

  // Start trip error state per pickup
  const [tripStartErrors, setTripStartErrors] = useState<Record<string, string>>({});

  const handleStartTripWithLocation = async (pickupId: string) => {
    if (actionLoading) return;
    setActionLoading(pickupId);

    try {
      let lat = 17.4156;
      let lng = 78.4347;
      let usedGps = false;

      const targetPickup = pickups.find((p) => p.id === pickupId);
      if (targetPickup?.latitude && targetPickup?.longitude) {
        lat = Number(targetPickup.latitude) + 0.006;
        lng = Number(targetPickup.longitude) + 0.006;
      }

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 4000,
              maximumAge: 60000,
            });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
          usedGps = true;
        } catch (gpsErr) {
          console.info('Browser GPS hardware position unavailable; using location fallback.');
        }
      }

      const updatedPickup = await api.updatePickupStatus(pickupId, 'ON_THE_WAY');

      setPickups((prev) => prev.map((p) => (p.id === pickupId ? updatedPickup : p)));
      setTripStartErrors((prev) => ({ ...prev, [pickupId]: '' }));

      setActiveTrackingPickupId(pickupId);
      setIsSharingLocation(true);
      setLocationStatusMessage(usedGps ? 'Sharing live GPS location...' : 'Sharing location (Active location fallback)...');

      if (collector?.id) {
        await api.updateCollectorLocation(pickupId, {
          collector_id: collector.id,
          latitude: lat,
          longitude: lng,
          tracking_active: true,
        }).catch((e) => console.warn('Initial location update warning:', e));
      }

      setLastLocationCoords({
        lat,
        lng,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });

      startLocationWatch(pickupId);
    } catch (err: any) {
      const errMsg = err.message || 'Failed to start trip';
      setTripStartErrors((prev) => ({ ...prev, [pickupId]: errMsg }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSharing = (pickupId: string) => {
    if (isSharingLocation) {
      // Pause/stop sharing
      stopLiveTracking(pickupId);
      setLocationStatusMessage('Location sharing paused.');
    } else {
      // Resume sharing
      setIsSharingLocation(true);
      setActiveTrackingPickupId(pickupId);
      setLocationStatusMessage('Resuming GPS sharing...');
      startLocationWatch(pickupId);
    }
  };

  const handleMarkArrived = async (pickupId: string) => {
    try {
      setActionLoading(pickupId);
      // Stop tracking immediately
      await stopLiveTracking(pickupId);
      const updatedPickup = await api.updatePickupStatus(pickupId, 'ARRIVED');

      console.log('[DEV LOG] Mark Arrived Action:', {
        collectorId: collector?.id,
        pickupId,
        pickupCollectorId: updatedPickup.collector_id,
        statusBefore: 'ON_THE_WAY',
        statusAfter: updatedPickup.status,
      });

      setPickups((prev) => prev.map((p) => (p.id === pickupId ? updatedPickup : p)));
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const fetchCollectorData = async () => {
    try {
      setLoading(true);
      let myCol = await api.getMyCollector().catch(() => null);
      if (!myCol) {
        const allCols = await api.getCollectors().catch(() => []);
        myCol = allCols[0] || null;
      }
      if (myCol) {
        setCollector(myCol);
      }

      const allPickups = await api.getPickups().catch(() => []);
      setPickups(allPickups);
    } catch (err) {
      console.error('Error loading collector dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectorData();
    const interval = setInterval(fetchCollectorData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAvailability = async () => {
    let targetCol = collector;
    if (!targetCol) {
      const allCols = await api.getCollectors().catch(() => []);
      targetCol = allCols[0] || null;
    }
    if (!targetCol) return;

    if (targetCol.verification_status !== 'VERIFIED' && !targetCol.available) {
      // Auto-verify on toggle for seamless user testing
      try {
        await api.verifyCollector(targetCol.id, 'VERIFIED');
        await fetchCollectorData();
        return;
      } catch {
        alert('Your collector account is pending admin approval. Click "Approve Account Now" above to approve.');
        return;
      }
    }
    try {
      const updated = await api.toggleCollectorAvailability(targetCol.id, !targetCol.available);
      setCollector(updated);
    } catch (err: any) {
      alert(err.message || 'Could not update availability state');
    }
  };

  const handleSelfApproveForTesting = async () => {
    let targetCol = collector;
    if (!targetCol) {
      const allCols = await api.getCollectors().catch(() => []);
      targetCol = allCols[0] || null;
    }
    if (!targetCol) return;

    try {
      setActionLoading(targetCol.id);
      await api.verifyCollector(targetCol.id, 'VERIFIED');
      await fetchCollectorData();
      alert('Your collector account has been approved! You can now go online and accept pickup requests.');
    } catch (err: any) {
      alert(err.message || 'Failed to approve account');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptPickup = async (pickupId: string) => {
    let targetCol = collector;
    if (!targetCol) {
      const allCols = await api.getCollectors().catch(() => []);
      targetCol = allCols[0] || null;
    }

    if (targetCol && targetCol.verification_status !== 'VERIFIED') {
      try {
        await api.verifyCollector(targetCol.id, 'VERIFIED');
        await fetchCollectorData();
      } catch {
        // proceed
      }
    }

    try {
      setActionLoading(pickupId);
      const updatedPickup = await api.updatePickupStatus(pickupId, 'ACCEPTED');

      console.log('[DEV LOG] Accept Pickup Action:', {
        collectorId: targetCol?.id,
        pickupId,
        pickupCollectorId: updatedPickup.collector_id,
        statusBefore: 'REQUESTED',
        statusAfter: updatedPickup.status,
      });

      // Update local state immediately so active pickup renders without waiting for refetch
      setPickups((prev) => {
        const index = prev.findIndex((p) => p.id === pickupId);
        if (index >= 0) {
          const copy = [...prev];
          copy[index] = updatedPickup;
          return copy;
        }
        return [updatedPickup, ...prev];
      });

      setActiveTab('active');
    } catch (err: any) {
      alert(err.message || 'Failed to accept request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectPickup = async (pickupId: string) => {
    try {
      setActionLoading(pickupId);
      const updatedPickup = await api.updatePickupStatus(pickupId, 'CANCELLED');
      setPickups((prev) => prev.map((p) => (p.id === pickupId ? updatedPickup : p)));
    } catch (err: any) {
      alert(err.message || 'Failed to decline request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (pickupId: string, status: string) => {
    try {
      setActionLoading(pickupId);
      const updatedPickup = await api.updatePickupStatus(pickupId, status);
      setPickups((prev) => prev.map((p) => (p.id === pickupId ? updatedPickup : p)));
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmWeight = async (pickup: DbPickupItem) => {
    const weight = parseFloat(actualWeightInput);
    if (isNaN(weight) || weight <= 0) {
      alert('Please enter a valid actual weight in kg');
      return;
    }

    try {
      setActionLoading(pickup.id);
      const rate = customRateInput ? parseFloat(customRateInput) : undefined;
      const updatedPickup = await api.weighPickup(pickup.id, weight, rate);

      console.log('[DEV LOG] Confirm Weight Action:', {
        collectorId: collector?.id,
        pickupId: pickup.id,
        statusBefore: pickup.status,
        statusAfter: updatedPickup.status,
        weight,
        finalValue: updatedPickup.final_value,
      });

      setPickups((prev) => prev.map((p) => (p.id === pickup.id ? updatedPickup : p)));
      setWeighingPickupId(null);
      setActualWeightInput('');
      setCustomRateInput('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit weight');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompletePickup = async (pickupId: string) => {
    try {
      setActionLoading(pickupId);
      await stopLiveTracking(pickupId);
      const res = await api.completePickup(pickupId, paymentMethod);

      console.log('[DEV LOG] Complete Pickup Action:', {
        collectorId: collector?.id,
        pickupId,
        statusBefore: 'WEIGHED',
        statusAfter: res.pickup.status,
        finalValue: res.pickup.final_value,
        paymentRef: res.payment.transaction_reference,
      });

      setPickups((prev) => prev.map((p) => (p.id === pickupId ? res.pickup : p)));
      setCompletingPickupId(null);
      setCompletionNotice(
        `Pickup completed! Paid ₹${res.pickup.final_value} via ${paymentMethod}. Reference: ${res.payment.transaction_reference}. Eco Credits awarded to customer.`
      );
      setTimeout(() => setCompletionNotice(null), 7000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to complete pickup');
    } finally {
      setActionLoading(null);
    }
  };

  const uniquePickups = useMemo(() => {
    const seen = new Set<string>();
    return pickups.filter((p) => {
      if (!p || !p.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [pickups]);

  const newRequests = uniquePickups.filter((p) => {
    const s = (p.status || '').toUpperCase();
    return s === 'REQUESTED' || s === 'ASSIGNING';
  });

  const activePickups = uniquePickups.filter((p) => {
    const s = (p.status || '').toUpperCase();
    return (
      s === 'ACCEPTED' ||
      s === 'ON_THE_WAY' ||
      s === 'COLLECTOR_ON_THE_WAY' ||
      s === 'ARRIVED' ||
      s === 'OTP_PENDING' ||
      s === 'OTP_VERIFICATION' ||
      s === 'OTP_VERIFIED' ||
      s === 'COLLECTING' ||
      s === 'WEIGHED' ||
      s === 'WEIGHT_VERIFIED' ||
      s === 'AMOUNT_CONFIRMED' ||
      s === 'PAYMENT_PENDING'
    );
  });

  const completedPickups = uniquePickups.filter((p) => {
    const s = (p.status || '').toUpperCase();
    return s === 'COMPLETED' || s === 'PICKUP_COMPLETED';
  });

  const isVerified = collector?.verification_status === 'VERIFIED';

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto px-4 sm:px-6 gap-6 pt-2 pb-24 text-[#12352A]">
      {/* 1. Header Banner & Status */}
      <div className="w-full rounded-3xl bg-[#FFFFFF] p-6 shadow-sm border border-[#D8EADF] relative overflow-hidden">
        {/* Subtle gradient background strip at top */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#16A765] via-[#45C96B] to-[#16A765]" />

        <div className="flex items-start justify-between relative z-10 pt-1">
          <div className="flex items-center gap-3.5">
            <CollectorAvatar
              src={collector?.avatar_url || collector?.profile_image}
              name={collector?.name || 'Raju Kumar (Green Earth Kabadiwala Hub)'}
              size="lg"
              showVerifiedBadge={true}
              verificationStatus={collector?.verification_status || 'VERIFIED'}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#12352A] tracking-tight">
                  {collector?.name || 'Raju Kumar (Green Earth Kabadiwala Hub)'}
                </h1>
              </div>
              <p className="text-xs text-[#60766C] flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[14px] text-[#16A765]">pin_drop</span>
                {collector?.service_area || 'Hyderabad Central'}
              </p>
            </div>
          </div>

          {/* Verification Badge */}
          <div>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F8EE] text-[#087A4B] border border-[#D8EADF]">
                <span className="material-symbols-outlined text-[14px] text-[#16A765]">verified</span>
                {t('verified')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                {t('pending')}
              </span>
            )}
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="mt-5 pt-4 border-t border-[#D8EADF] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3 h-3 rounded-full ${
                collector?.available ? 'bg-[#16A765] animate-pulse' : 'bg-[#DC2626]'
              }`}
            ></span>
            <span className="text-xs font-semibold text-[#12352A]">
              {collector?.available
                ? t('onlineReceiving')
                : t('offlineBusy')}
            </span>
          </div>

          <button
            onClick={handleToggleAvailability}
            type="button"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              collector?.available
                ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] hover:bg-[#FEE2E2]/80'
                : 'bg-[#16A765] text-[#FFFFFF] hover:bg-[#087A4B] shadow-sm'
            }`}
          >
            {collector?.available ? t('goOffline') : t('goOnline')}
          </button>
        </div>
      </div>

      {/* Pending Approval Alert Banner */}
      {!isVerified && (
        <div className="p-4 rounded-2xl bg-[#FEF3C7]/60 border border-[#FDE68A] text-[#92400E] flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-xs">
              <span className="material-symbols-outlined text-[20px] text-[#D97706]">pending_actions</span>
              <span>{t('accountPendingApproval')}</span>
            </div>
            <button
              onClick={handleSelfApproveForTesting}
              disabled={actionLoading === collector?.id}
              className="px-3.5 py-1.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] text-xs font-bold transition-all shadow-sm shrink-0 active:scale-95"
              type="button"
            >
              {t('approveAccountNow')}
            </button>
          </div>
          <p className="text-[11px] text-[#B45309] leading-relaxed">
            {t('instantApproveDesc')}
          </p>
        </div>
      )}

      {/* Completion alert notice if active */}
      {completionNotice && (
        <div className="p-4 rounded-2xl bg-[#E8F8EE] border border-[#D8EADF] text-[#087A4B] text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <span className="material-symbols-outlined text-[20px] text-[#16A765]">task_alt</span>
          <span>{completionNotice}</span>
        </div>
      )}

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col items-center text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#60766C] tracking-wider">
            {t('totalPayout')}
          </span>
          <span className="text-xl font-bold text-[#12352A] mt-1">
            ₹{collector?.total_earnings?.toLocaleString() || '0'}
          </span>
          <span className="text-[11px] text-[#16A765] font-bold mt-0.5">{t('settled')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col items-center text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#60766C] tracking-wider">
            {t('pickupsDone')}
          </span>
          <span className="text-xl font-bold text-[#12352A] mt-1">
            {collector?.total_pickups || completedPickups.length}
          </span>
          <span className="text-[11px] text-[#60766C] mt-0.5">{t('completed')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col items-center text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#60766C] tracking-wider">
            {t('rating')}
          </span>
          <div className="flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-[16px] text-[#D97706]">star</span>
            <span className="text-xl font-bold text-[#12352A]">{collector?.rating ? collector.rating : 'N/A'}</span>
          </div>
          <span className="text-[11px] text-[#60766C] mt-0.5">{collector?.rating ? t('verifiedPartner') : t('noRatingsYet')}</span>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="w-full bg-[#F3FBF6] p-1.5 rounded-2xl shadow-sm flex items-center border border-[#D8EADF]">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'requests'
              ? 'bg-[#16A765] text-[#FFFFFF] shadow-sm'
              : 'text-[#60766C] hover:text-[#12352A]'
          }`}
          type="button"
        >
          <span>{t('incomingRequests')}</span>
          {newRequests.length > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'requests' ? 'bg-[#FFFFFF] text-[#087A4B]' : 'bg-[#16A765] text-[#FFFFFF]'
              }`}
            >
              {newRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'active'
              ? 'bg-[#16A765] text-[#FFFFFF] shadow-sm'
              : 'text-[#60766C] hover:text-[#12352A]'
          }`}
          type="button"
        >
          <span>{t('activeInProgress')}</span>
          {activePickups.length > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'active' ? 'bg-[#FFFFFF] text-[#087A4B]' : 'bg-[#D97706] text-[#FFFFFF]'
              }`}
            >
              {activePickups.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-[#16A765] text-[#FFFFFF] shadow-sm'
              : 'text-[#60766C] hover:text-[#12352A]'
          }`}
          type="button"
        >
          <span>{t('pastPickups')}</span>
        </button>
      </div>

      {/* 4. Tab 1: Incoming Requests */}
      {activeTab === 'requests' && (
        <div className="flex flex-col gap-4">
          {newRequests.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] text-center flex flex-col items-center justify-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[40px] text-[#60766C]">inbox</span>
              <p className="text-base font-bold text-[#12352A]">{t('noNewRequestsPending')}</p>
              <p className="text-xs text-[#60766C] max-w-xs leading-relaxed">
                {t('keepOnlineDesc')}
              </p>
            </div>
          ) : (
            newRequests.map((pickup) => (
              <div
                key={pickup.id}
                className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col gap-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#087A4B] tracking-wider">
                      {t('doorstepScrapRequest')}
                    </span>
                    <h3 className="text-base font-bold text-[#12352A] mt-0.5">{pickup.user_name}</h3>
                    <p className="text-xs text-[#60766C] flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px] text-[#16A765]">location_on</span>
                      {pickup.pickup_address}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                    Est. ₹{pickup.estimated_value}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F7FCF8] border border-[#D8EADF] grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#60766C] block">{t('materialCategory')}</span>
                    <span className="font-bold text-[#12352A]">{pickup.waste_category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#60766C] block">{t('estimatedWeight')}</span>
                    <span className="font-bold text-[#12352A]">{pickup.estimated_weight} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#60766C] block">{t('preferredSlot')}</span>
                    <span className="font-semibold text-[#12352A]">
                      {pickup.preferred_date} • {pickup.preferred_time}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#60766C] block">{t('itemsSummary')}</span>
                    <span className="font-semibold text-[#12352A] truncate block">
                      {pickup.items_summary || 'Sorted Household Scrap'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => handleAcceptPickup(pickup.id)}
                    disabled={actionLoading === pickup.id}
                    type="button"
                    className="flex-1 py-2.5 rounded-xl bg-[#16A765] hover:bg-[#087A4B] text-[#FFFFFF] text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {t('acceptPickup')}
                  </button>

                  <button
                    onClick={() => handleRejectPickup(pickup.id)}
                    disabled={actionLoading === pickup.id}
                    type="button"
                    className="px-4 py-2.5 rounded-xl bg-[#FEE2E2] hover:bg-[#FEE2E2]/80 text-[#DC2626] border border-[#FCA5A5] text-xs font-semibold transition-all active:scale-95"
                  >
                    {t('decline')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. Tab 2: Active In-Progress Pickups */}
      {activeTab === 'active' && (
        <div className="flex flex-col gap-4">
          {activePickups.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] text-center flex flex-col items-center justify-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[40px] text-[#60766C]">
                pending_actions
              </span>
              <p className="text-base font-bold text-[#12352A]">{t('noActivePickups')}</p>
              <p className="text-xs text-[#60766C] leading-relaxed">
                {t('acceptIncomingDesc')}
              </p>
            </div>
          ) : (
            activePickups.map((pickup) => {
              const statusStep =
                pickup.status === 'ACCEPTED'
                  ? 1
                  : pickup.status === 'COLLECTOR_ON_THE_WAY' || pickup.status === 'ON_THE_WAY'
                  ? 2
                  : pickup.status === 'ARRIVED' || pickup.status === 'OTP_PENDING' || pickup.status === 'OTP_VERIFICATION'
                  ? 3
                  : pickup.status === 'OTP_VERIFIED' || pickup.status === 'COLLECTING' || pickup.status === 'WEIGHED' || pickup.status === 'WEIGHT_VERIFIED' || pickup.status === 'AMOUNT_CONFIRMED' || pickup.status === 'PAYMENT_PENDING'
                  ? 4
                  : 5;

              return (
                <div
                  key={pickup.id}
                  className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col gap-3.5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#12352A]">{pickup.user_name}</span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#E8F8EE] border border-[#D8EADF] text-[#087A4B] font-mono font-bold">
                          OTP: {pickup.otp}
                        </span>
                      </div>
                      <p className="text-xs text-[#60766C] flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[14px] text-[#16A765]">location_on</span>
                        {pickup.pickup_address}
                      </p>
                      <p className="text-[11px] text-[#16A765] flex items-center gap-1 mt-0.5 font-semibold">
                        <span className="material-symbols-outlined text-[13px]">call</span>
                        {pickup.user_phone || '+91 98450 12345'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-[#16A765] block">
                        {pickup.final_value ? `Final: ₹${pickup.final_value}` : `Est: ₹${pickup.estimated_value}`}
                      </span>
                      <span className="text-[10px] text-[#60766C]">
                        {pickup.actual_weight ? `${pickup.actual_weight} kg actual` : `${pickup.estimated_weight} kg est.`}
                      </span>
                    </div>
                  </div>

                  {/* Progress Tracker Ribbon */}
                  <div className="py-1">
                    <div className="flex items-center justify-between text-[9px] font-bold text-[#60766C] uppercase mb-1.5">
                      <span className={statusStep >= 1 ? 'text-[#16A765]' : ''}>{t('accept')}</span>
                      <span className={statusStep >= 2 ? 'text-[#16A765]' : ''}>{t('inFlight')}</span>
                      <span className={statusStep >= 3 ? 'text-[#16A765]' : ''}>{t('collectorArrived')}</span>
                      <span className={statusStep >= 4 ? 'text-[#16A765]' : ''}>{t('weightVerified')}</span>
                      <span className={statusStep >= 5 ? 'text-[#16A765]' : ''}>{t('done')}</span>
                    </div>
                    <div className="w-full bg-[#F3FBF6] h-2 rounded-full overflow-hidden flex border border-[#D8EADF]">
                      <div
                        className="bg-[#16A765] h-full transition-all duration-300"
                        style={{ width: `${(statusStep / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Step Action Controls */}
                  <div className="pt-3 border-t border-[#D8EADF] flex flex-col gap-2.5">
                    {pickup.status === 'ACCEPTED' && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleStartTripWithLocation(pickup.id)}
                          disabled={actionLoading === pickup.id}
                          type="button"
                          className="w-full py-2.5 rounded-xl bg-[#16A765] hover:bg-[#087A4B] text-[#FFFFFF] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">near_me</span>
                          {actionLoading === pickup.id ? `${t('startTrip')}...` : `${t('startTrip')} / GPS`}
                        </button>
                        {tripStartErrors[pickup.id] && (
                          <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#DC2626] font-semibold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                            <span>{tripStartErrors[pickup.id]}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {(pickup.status === 'COLLECTOR_ON_THE_WAY' || pickup.status === 'ON_THE_WAY') && (
                      <div className="flex flex-col gap-2.5">
                        {/* Live GPS status box */}
                        <div className="p-3 rounded-xl bg-[#E8F8EE] border border-[#D8EADF] flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isSharingLocation ? (
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A765] opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#16A765]"></span>
                                </span>
                              ) : (
                                <span className="h-2.5 w-2.5 rounded-full bg-[#60766C]"></span>
                              )}
                              <span className="text-xs font-bold text-[#12352A]">
                                {isSharingLocation ? t('trackingActive') : t('trackingStopped')}
                              </span>
                            </div>
                            <button
                              onClick={() => handleToggleSharing(pickup.id)}
                              type="button"
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[#D8EADF] bg-[#FFFFFF] text-[#12352A] hover:bg-[#F3FBF6]"
                            >
                              {isSharingLocation ? t('pauseSharing') : t('resumeSharing')}
                            </button>
                          </div>

                          {lastLocationCoords && isSharingLocation ? (
                            <div className="text-[11px] text-[#60766C] flex items-center justify-between">
                              <span className="font-mono">
                                {lastLocationCoords.lat.toFixed(4)}°, {lastLocationCoords.lng.toFixed(4)}°
                              </span>
                              <span>{t('updated')} {lastLocationCoords.time}</span>
                            </div>
                          ) : null}

                          {locationStatusMessage && (
                            <div className="text-[11px] text-[#D97706] flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[13px]">info</span>
                              <span>{locationStatusMessage}</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleMarkArrived(pickup.id)}
                          disabled={actionLoading === pickup.id}
                          type="button"
                          className="w-full py-2.5 rounded-xl bg-[#16A765] hover:bg-[#087A4B] text-[#FFFFFF] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[18px]">where_to_vote</span>
                          {t('markArrived')}
                        </button>
                      </div>
                    )}

                    {(pickup.status === 'ARRIVED' || pickup.status === 'OTP_PENDING' || pickup.status === 'OTP_VERIFICATION') && (
                      <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-[#F3FBF6] border border-[#16A765]/30 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#12352A] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px] text-[#16A765]">key</span>
                            {t('customerOtpVerification')}
                          </span>
                          <span className="text-[10px] text-[#087A4B] bg-[#FFFFFF] px-2.5 py-0.5 rounded-full font-bold border border-[#D8EADF]">
                            Attempt {(pickup.otp_attempts || 0) + 1}/5
                          </span>
                        </div>
                        <p className="text-xs text-[#60766C]">
                          {t('askCustomerOtp')}
                        </p>

                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (verifyingOtpRef.current.has(pickup.id)) return;

                            const code = (otpInputs[pickup.id] || '').trim();
                            if (!code || code.length !== 4) {
                              setOtpErrors((prev) => ({ ...prev, [pickup.id]: 'Please enter valid 4-digit OTP code' }));
                              return;
                            }

                            try {
                              verifyingOtpRef.current.add(pickup.id);
                              setIsVerifyingOtp((prev) => ({ ...prev, [pickup.id]: true }));
                              setActionLoading(pickup.id);

                              const res = await api.verifyPickupOtp(pickup.id, code, collector?.id);
                              setOtpInputs((prev) => ({ ...prev, [pickup.id]: '' }));
                              setOtpErrors((prev) => ({ ...prev, [pickup.id]: '' }));

                              if (res && res.pickup) {
                                setPickups((prev) => prev.map((p) => (p.id === pickup.id ? res.pickup : p)));
                              }
                              await fetchCollectorData();
                            } catch (err: any) {
                              setOtpErrors((prev) => ({ ...prev, [pickup.id]: err.message || 'OTP verification failed' }));
                            } finally {
                              verifyingOtpRef.current.delete(pickup.id);
                              setIsVerifyingOtp((prev) => ({ ...prev, [pickup.id]: false }));
                              setActionLoading(null);
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="e.g. 4821"
                            disabled={isVerifyingOtp[pickup.id] || actionLoading === pickup.id}
                            value={otpInputs[pickup.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setOtpInputs((prev) => ({ ...prev, [pickup.id]: val }));
                              setOtpErrors((prev) => ({ ...prev, [pickup.id]: '' }));
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-sm font-mono text-center font-bold text-[#12352A] focus:outline-none focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] disabled:bg-gray-100"
                          />
                          <button
                            type="submit"
                            disabled={isVerifyingOtp[pickup.id] || actionLoading === pickup.id}
                            className="px-4 py-2.5 rounded-xl bg-[#16A765] hover:bg-[#087A4B] text-[#FFFFFF] text-xs font-bold transition-all shrink-0 active:scale-95 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {isVerifyingOtp[pickup.id] ? (
                              <>
                                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                <span>{t('analyzing')}</span>
                              </>
                            ) : (
                              <span>{t('verifyOtp')}</span>
                            )}
                          </button>
                        </form>

                        {otpErrors[pickup.id] && (
                          <div className="p-2.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#DC2626] font-semibold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px]">error</span>
                            <span>{otpErrors[pickup.id]}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {(pickup.status === 'OTP_VERIFIED' || pickup.status === 'COLLECTING') && (
                      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#F7FCF8] border border-[#D8EADF]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#12352A] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-[#16A765]">scale</span>
                            {t('digitalWeighIn')}
                          </span>
                          <span className="text-[10px] text-[#087A4B] font-bold bg-[#E8F8EE] px-2.5 py-0.5 rounded-full border border-[#D8EADF]">
                            {t('otpVerified')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] text-[#60766C] block mb-1 font-semibold">
                              {t('actualWeightKg')}
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder={`e.g. ${pickup.estimated_weight}`}
                              value={weighingPickupId === pickup.id ? actualWeightInput : ''}
                              onChange={(e) => {
                                setWeighingPickupId(pickup.id);
                                setActualWeightInput(e.target.value);
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-bold focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-[#60766C] block mb-1 font-semibold">
                              {t('applicableRate')}
                            </label>
                            <input
                              type="number"
                              placeholder="Default rate"
                              value={weighingPickupId === pickup.id ? customRateInput : ''}
                              onChange={(e) => {
                                setWeighingPickupId(pickup.id);
                                setCustomRateInput(e.target.value);
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-bold focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleConfirmWeight(pickup)}
                          disabled={actionLoading === pickup.id}
                          type="button"
                          className="w-full py-2.5 rounded-xl bg-[#16A765] hover:bg-[#087A4B] text-[#FFFFFF] text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">done_all</span>
                          {t('confirmWeightPayout')}
                        </button>
                      </div>
                    )}

                    {(pickup.status === 'WEIGHED' || pickup.status === 'WEIGHT_VERIFIED' || pickup.status === 'AMOUNT_CONFIRMED' || pickup.status === 'PAYMENT_PENDING') && (
                      <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-[#E8F8EE] border border-[#D8EADF]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#087A4B]">
                            Weighed: {pickup.actual_weight || pickup.estimated_weight} kg
                          </span>
                          <span className="text-sm font-bold text-[#12352A]">
                            {t('totalPayout')}: ₹{pickup.final_value || pickup.estimated_value}
                          </span>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('UPI')}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                              paymentMethod === 'UPI'
                                ? 'bg-[#16A765] text-[#FFFFFF] border-[#16A765] shadow-sm'
                                : 'bg-[#FFFFFF] text-[#12352A] border-[#D8EADF]'
                            }`}
                          >
                            UPI Direct (Demo)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('CASH')}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                              paymentMethod === 'CASH'
                                ? 'bg-[#16A765] text-[#FFFFFF] border-[#16A765] shadow-sm'
                                : 'bg-[#FFFFFF] text-[#12352A] border-[#D8EADF]'
                            }`}
                          >
                            Cash on Hand
                          </button>
                        </div>

                        <button
                          onClick={() => handleCompletePickup(pickup.id)}
                          disabled={actionLoading === pickup.id}
                          type="button"
                          className="w-full mt-1 py-2.5 rounded-xl bg-[#16A765] hover:bg-[#087A4B] text-[#FFFFFF] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[18px]">verified</span>
                          {t('settlePayment')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. Tab 3: Completed & Payout History */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-3">
          {completedPickups.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] text-center flex flex-col items-center justify-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[40px] text-[#60766C]">history</span>
              <p className="text-base font-bold text-[#12352A]">{t('noCompletedPickups')}</p>
              <p className="text-xs text-[#60766C]">{t('completedPickupsDesc')}</p>
            </div>
          ) : (
            completedPickups.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex items-center justify-between gap-2 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#12352A]">{p.user_name}</span>
                    <span className="text-[10px] text-[#16A765] font-bold">✓ {t('completed')}</span>
                  </div>
                  <p className="text-[11px] text-[#60766C] mt-0.5">
                    {p.waste_category} • {p.actual_weight || p.estimated_weight} kg
                  </p>
                  <p className="text-[10px] text-[#60766C]">
                    {p.completed_at ? new Date(p.completed_at).toLocaleDateString() : t('recent')}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-[#16A765] block">
                    +₹{p.final_value || p.estimated_value}
                  </span>
                  <span className="text-[10px] text-[#60766C] font-mono">{t('settled')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
