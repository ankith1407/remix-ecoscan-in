import React, { useState, useEffect, useMemo } from 'react';
import { DbCollectorItem, DbPickupItem } from '../types';
import { api } from '../services/api';
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

  // OTP Verification state
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpError, setOtpError] = useState<string | null>(null);

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

  const clearLocationWatch = () => {
    if (trackingWatchRef.current !== null) {
      navigator.geolocation?.clearWatch(trackingWatchRef.current);
      trackingWatchRef.current = null;
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

  const startLocationWatch = (pickupId: string) => {
    if (!navigator.geolocation) {
      setLocationStatusMessage('GPS is unavailable on this device/browser.');
      return;
    }
    clearLocationWatch();
    trackingWatchRef.current = navigator.geolocation.watchPosition(
      (position) => void sendLocationUpdate(pickupId, position),
      (err) => {
        let msg = 'Collector location is currently unavailable.';
        if (err.code === err.PERMISSION_DENIED) msg = 'Location permission denied. Please allow GPS access.';
        else if (err.code === err.POSITION_UNAVAILABLE) msg = 'GPS signal currently unavailable.';
        else if (err.code === err.TIMEOUT) msg = 'GPS signal request timed out.';
        setLocationStatusMessage(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Start trip error state per pickup
  const [tripStartErrors, setTripStartErrors] = useState<Record<string, string>>({});

  const handleStartTripWithLocation = async (pickupId: string) => {
    if (actionLoading) return;

    if (!navigator.geolocation) {
      const errMsg = 'Location permission is required to start trip. GPS location services are unavailable on this device/browser.';
      setTripStartErrors((prev) => ({ ...prev, [pickupId]: errMsg }));
      return;
    }

    setActionLoading(pickupId);

    try {
      // 1. Verify location permission before updating backend status
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      }).catch((err) => {
        let msg = 'Location permission is required to start trip.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission is required to start trip. Please enable location access in browser settings.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location permission is required to start trip. GPS signal is currently unavailable.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location permission is required to start trip. GPS request timed out.';
        }
        throw new Error(msg);
      });

      // 2. Perform backend transition: ACCEPTED -> ON_THE_WAY
      await api.updatePickupStatus(pickupId, 'ON_THE_WAY');
      setTripStartErrors((prev) => ({ ...prev, [pickupId]: '' }));
      await fetchCollectorData();

      // 3. Begin live location sharing
      setActiveTrackingPickupId(pickupId);
      setIsSharingLocation(true);
      setLocationStatusMessage('Sharing live GPS location...');

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      if (!collector?.id) {
        throw new Error('Collector profile unavailable. Please refresh your dashboard.');
      }
      await api.updateCollectorLocation(pickupId, {
        collector_id: collector.id,
        latitude: lat,
        longitude: lng,
        tracking_active: true,
      }).catch((e) => console.warn('Initial location update warning:', e));

      setLastLocationCoords({
        lat,
        lng,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });

      // 4. Continue receiving fresh browser GPS fixes throughout the trip.
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
      await api.updatePickupStatus(pickupId, 'ARRIVED');
      await fetchCollectorData();
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
      await api.updatePickupStatus(pickupId, 'ACCEPTED');
      await fetchCollectorData();
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
      await api.updatePickupStatus(pickupId, 'CANCELLED');
      await fetchCollectorData();
    } catch (err: any) {
      alert(err.message || 'Failed to decline request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (pickupId: string, status: string) => {
    try {
      setActionLoading(pickupId);
      await api.updatePickupStatus(pickupId, status);
      await fetchCollectorData();
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
      await api.weighPickup(pickup.id, weight, rate);
      setWeighingPickupId(null);
      setActualWeightInput('');
      setCustomRateInput('');
      await fetchCollectorData();
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
      setCompletingPickupId(null);
      setCompletionNotice(
        `Pickup completed! Paid ₹${res.pickup.final_value} via ${paymentMethod}. Reference: ${res.payment.transaction_reference}. Eco Credits awarded to customer.`
      );
      setTimeout(() => setCompletionNotice(null), 7000);
      await fetchCollectorData();
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

  const newRequests = uniquePickups.filter((p) => p.status === 'REQUESTED');
  const activePickups = uniquePickups.filter(
    (p) =>
      p.status === 'ACCEPTED' ||
      p.status === 'ON_THE_WAY' ||
      p.status === 'COLLECTOR_ON_THE_WAY' ||
      p.status === 'ARRIVED' ||
      p.status === 'OTP_PENDING' ||
      p.status === 'OTP_VERIFICATION' ||
      p.status === 'OTP_VERIFIED' ||
      p.status === 'COLLECTING' ||
      p.status === 'WEIGHED' ||
      p.status === 'WEIGHT_VERIFIED' ||
      p.status === 'AMOUNT_CONFIRMED' ||
      p.status === 'PAYMENT_PENDING'
  );
  const completedPickups = uniquePickups.filter((p) => p.status === 'COMPLETED');

  const isVerified = collector?.verification_status === 'VERIFIED';

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 gap-4 pt-1 pb-24 text-[#172019]">
      {/* 1. Header Banner & Status */}
      <div className="w-full rounded-2xl bg-[#FFFFFF] p-5 shadow-xs border border-[#DCE5DE] relative overflow-hidden">
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#E8F3EB] flex items-center justify-center text-[#3FA66B] border border-[#DCE5DE] shadow-xs">
              <span className="material-symbols-outlined text-[28px]">local_shipping</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#172019] tracking-tight">
                  {collector?.name || 'Kabadiwala Partner Desk'}
                </h1>
              </div>
              <p className="text-xs text-[#65736A] flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                {collector?.service_area || 'Hyderabad Central'}
              </p>
            </div>
          </div>

          {/* Verification Badge */}
          <div>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E8F3EB] text-[#174D35] border border-[#DCE5DE]">
                <span className="material-symbols-outlined text-[13px] text-[#3FA66B]">verified</span>
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                <span className="material-symbols-outlined text-[13px]">schedule</span>
                Pending Approval
              </span>
            )}
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="mt-4 pt-4 border-t border-[#DCE5DE] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                collector?.available ? 'bg-[#3FA66B] animate-pulse' : 'bg-[#DC2626]'
              }`}
            ></span>
            <span className="text-xs font-semibold">
              {collector?.available
                ? 'Online & Receiving Nearby Pickup Requests'
                : 'Offline / Currently Busy'}
            </span>
          </div>

          <button
            onClick={handleToggleAvailability}
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              collector?.available
                ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] hover:bg-[#FCA5A5]/30'
                : 'bg-[#3FA66B] text-[#FFFFFF] hover:bg-[#174D35]'
            }`}
          >
            {collector?.available ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* Pending Approval Alert Banner */}
      {!isVerified && (
        <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] flex flex-col gap-2 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-xs">
              <span className="material-symbols-outlined text-[20px] text-[#D97706]">pending_actions</span>
              <span>Account Pending Admin Approval</span>
            </div>
            <button
              onClick={handleSelfApproveForTesting}
              disabled={actionLoading === collector?.id}
              className="px-3 py-1.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] text-xs font-bold transition-all shadow-xs shrink-0 active:scale-95"
              type="button"
            >
              Approve Account Now
            </button>
          </div>
          <p className="text-[11px] text-[#B45309] leading-relaxed">
            Your collector account is waiting for admin verification. Click <strong>"Approve Account Now"</strong> above to approve your account immediately and start accepting pickups and going online.
          </p>
        </div>
      )}

      {/* Completion alert notice if active */}
      {completionNotice && (
        <div className="p-3.5 rounded-xl bg-[#E8F3EB] border border-[#DCE5DE] text-[#174D35] text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#3FA66B]">task_alt</span>
          <span>{completionNotice}</span>
        </div>
      )}

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col items-center text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#65736A] tracking-wider">
            Total Payout
          </span>
          <span className="text-lg font-bold text-[#172019] mt-0.5">
            ₹{collector?.total_earnings?.toLocaleString() || '0'}
          </span>
          <span className="text-[10px] text-[#3FA66B] font-bold mt-0.5">Settled</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col items-center text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#65736A] tracking-wider">
            Pickups Done
          </span>
          <span className="text-lg font-bold text-[#172019] mt-0.5">
            {collector?.total_pickups || completedPickups.length}
          </span>
          <span className="text-[10px] text-[#65736A] mt-0.5">Completed</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col items-center text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#65736A] tracking-wider">
            Rating
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-[15px] text-[#D97706]">star</span>
            <span className="text-lg font-bold text-[#172019]">{collector?.rating ? collector.rating : 'N/A'}</span>
          </div>
          <span className="text-[10px] text-[#65736A] mt-0.5">{collector?.rating ? 'Verified Partner' : 'No ratings yet'}</span>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="w-full bg-[#FFFFFF] p-1 rounded-xl shadow-xs flex items-center border border-[#DCE5DE]">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'requests'
              ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
              : 'text-[#65736A] hover:text-[#172019]'
          }`}
          type="button"
        >
          <span>Incoming Requests</span>
          {newRequests.length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'requests' ? 'bg-[#FFFFFF] text-[#174D35]' : 'bg-[#3FA66B] text-[#FFFFFF]'
              }`}
            >
              {newRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'active'
              ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
              : 'text-[#65736A] hover:text-[#172019]'
          }`}
          type="button"
        >
          <span>Active In-Progress</span>
          {activePickups.length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'active' ? 'bg-[#FFFFFF] text-[#174D35]' : 'bg-[#D97706] text-[#FFFFFF]'
              }`}
            >
              {activePickups.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
              : 'text-[#65736A] hover:text-[#172019]'
          }`}
          type="button"
        >
          <span>Past Pickups</span>
        </button>
      </div>

      {/* 4. Tab 1: Incoming Requests */}
      {activeTab === 'requests' && (
        <div className="flex flex-col gap-3">
          {newRequests.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#DCE5DE] text-center flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[36px] text-[#65736A]">inbox</span>
              <p className="text-sm font-semibold text-[#172019]">No New Requests Pending</p>
              <p className="text-xs text-[#65736A] max-w-xs">
                Keep your status "Online" to automatically receive doorstep scrap pickup requests in your area.
              </p>
            </div>
          ) : (
            newRequests.map((pickup) => (
              <div
                key={pickup.id}
                className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col gap-3 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#174D35] tracking-wider">
                      Doorstep Scrap Request
                    </span>
                    <h3 className="text-sm font-bold text-[#172019] mt-0.5">{pickup.user_name}</h3>
                    <p className="text-xs text-[#65736A] flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[13px]">location_on</span>
                      {pickup.pickup_address}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E8F3EB] text-[#174D35] border border-[#DCE5DE]">
                    Est. ₹{pickup.estimated_value}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#F5F8F4] border border-[#DCE5DE] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#65736A] block">Material Category</span>
                    <span className="font-semibold text-[#172019]">{pickup.waste_category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#65736A] block">Estimated Weight</span>
                    <span className="font-semibold text-[#172019]">{pickup.estimated_weight} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#65736A] block">Preferred Slot</span>
                    <span className="font-semibold text-[#172019]">
                      {pickup.preferred_date} • {pickup.preferred_time}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#65736A] block">Items Summary</span>
                    <span className="font-semibold text-[#172019] truncate block">
                      {pickup.items_summary || 'Sorted Household Scrap'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleAcceptPickup(pickup.id)}
                    disabled={actionLoading === pickup.id}
                    type="button"
                    className="flex-1 py-2 rounded-lg bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Accept Pickup
                  </button>

                  <button
                    onClick={() => handleRejectPickup(pickup.id)}
                    disabled={actionLoading === pickup.id}
                    type="button"
                    className="px-3 py-2 rounded-lg bg-[#FEE2E2] hover:bg-[#FCA5A5]/30 text-[#DC2626] border border-[#FCA5A5] text-xs font-semibold transition-all active:scale-95"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. Tab 2: Active In-Progress Pickups */}
      {activeTab === 'active' && (
        <div className="flex flex-col gap-3.5">
          {activePickups.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#DCE5DE] text-center flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[36px] text-[#65736A]">
                pending_actions
              </span>
              <p className="text-sm font-semibold text-[#172019]">No Active Pickups In Progress</p>
              <p className="text-xs text-[#65736A]">
                Accept incoming requests to start routes and collect recyclable waste at doorsteps.
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
                  className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col gap-3 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#172019]">{pickup.user_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8F3EB] border border-[#DCE5DE] text-[#174D35] font-mono font-bold">
                          OTP: {pickup.otp}
                        </span>
                      </div>
                      <p className="text-xs text-[#65736A] flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        {pickup.pickup_address}
                      </p>
                      <p className="text-[11px] text-[#3FA66B] flex items-center gap-1 mt-0.5 font-semibold">
                        <span className="material-symbols-outlined text-[12px]">call</span>
                        {pickup.user_phone || '+91 98450 12345'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-[#3FA66B] block">
                        {pickup.final_value ? `Final: ₹${pickup.final_value}` : `Est: ₹${pickup.estimated_value}`}
                      </span>
                      <span className="text-[10px] text-[#65736A]">
                        {pickup.actual_weight ? `${pickup.actual_weight} kg actual` : `${pickup.estimated_weight} kg est.`}
                      </span>
                    </div>
                  </div>

                  {/* Progress Tracker Ribbon */}
                  <div className="py-1">
                    <div className="flex items-center justify-between text-[9px] font-bold text-[#65736A] uppercase mb-1">
                      <span className={statusStep >= 1 ? 'text-[#3FA66B]' : ''}>Accepted</span>
                      <span className={statusStep >= 2 ? 'text-[#3FA66B]' : ''}>On Way</span>
                      <span className={statusStep >= 3 ? 'text-[#3FA66B]' : ''}>Arrived</span>
                      <span className={statusStep >= 4 ? 'text-[#3FA66B]' : ''}>Weighed</span>
                      <span className={statusStep >= 5 ? 'text-[#3FA66B]' : ''}>Done</span>
                    </div>
                    <div className="w-full bg-[#F5F8F4] h-1.5 rounded-full overflow-hidden flex border border-[#DCE5DE]">
                      <div
                        className="bg-[#3FA66B] h-full transition-all duration-300"
                        style={{ width: `${(statusStep / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Step Action Controls */}
                  <div className="pt-2 border-t border-[#DCE5DE] flex flex-col gap-2">
                    {pickup.status === 'ACCEPTED' && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleStartTripWithLocation(pickup.id)}
                          disabled={actionLoading === pickup.id}
                          type="button"
                          className="w-full py-2.5 rounded-lg bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">near_me</span>
                          {actionLoading === pickup.id ? `${t('startTrip')}...` : `${t('startTrip')} / GPS`}
                        </button>
                        {tripStartErrors[pickup.id] && (
                          <div className="p-2.5 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#DC2626] font-semibold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                            <span>{tripStartErrors[pickup.id]}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {(pickup.status === 'COLLECTOR_ON_THE_WAY' || pickup.status === 'ON_THE_WAY') && (
                      <div className="flex flex-col gap-2">
                        {/* Live GPS status box */}
                        <div className="p-2.5 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isSharingLocation ? (
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3FA66B] opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3FA66B]"></span>
                                </span>
                              ) : (
                                <span className="h-2.5 w-2.5 rounded-full bg-[#65736A]"></span>
                              )}
                              <span className="text-xs font-bold text-[#172019]">
                                {isSharingLocation ? t('trackingActive') : t('trackingStopped')}
                              </span>
                            </div>
                            <button
                              onClick={() => handleToggleSharing(pickup.id)}
                              type="button"
                              className="text-[11px] font-bold px-2 py-0.5 rounded border border-[#DCE5DE] bg-[#FFFFFF] text-[#172019] hover:bg-[#F5F8F4]"
                            >
                              {isSharingLocation ? t('pauseSharing') : t('resumeSharing')}
                            </button>
                          </div>

                          {lastLocationCoords && isSharingLocation ? (
                            <div className="text-[11px] text-[#65736A] flex items-center justify-between">
                              <span className="font-mono">
                                {lastLocationCoords.lat.toFixed(4)}°, {lastLocationCoords.lng.toFixed(4)}°
                              </span>
                              <span>Updated {lastLocationCoords.time}</span>
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
                          className="w-full py-2.5 rounded-lg bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[18px]">where_to_vote</span>
                          Mark Arrived at Doorstep
                        </button>
                      </div>
                    )}

                    {(pickup.status === 'ARRIVED' || pickup.status === 'OTP_PENDING') && (
                      <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-[#E8F3EB] border border-[#3FA66B]/40 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#172019] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px] text-[#3FA66B]">key</span>
                            Customer OTP Verification
                          </span>
                          <span className="text-[10px] text-[#174D35] bg-[#FFFFFF] px-2 py-0.5 rounded-full font-bold border border-[#DCE5DE]">
                            Attempt {(pickup.otp_attempts || 0) + 1}/5
                          </span>
                        </div>
                        <p className="text-xs text-[#65736A]">
                          Ask customer for their 4-digit security OTP code generated on their EcoScan app.
                        </p>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="e.g. 4821"
                            value={otpInput}
                            onChange={(e) => {
                              setOtpInput(e.target.value);
                              setOtpError(null);
                            }}
                            className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#DCE5DE] text-sm font-mono text-center font-bold text-[#172019] focus:outline-none focus:border-[#3FA66B]"
                          />
                          <button
                            onClick={async () => {
                              if (!otpInput || otpInput.trim().length !== 4) {
                                setOtpError('Please enter valid 4-digit OTP code');
                                return;
                              }
                              try {
                                setActionLoading(pickup.id);
                                await api.verifyPickupOtp(pickup.id, otpInput.trim(), collector?.id);
                                setOtpInput('');
                                setOtpError(null);
                                await fetchCollectorData();
                              } catch (err: any) {
                                setOtpError(err.message || 'OTP verification failed');
                              } finally {
                                setActionLoading(null);
                              }
                            }}
                            disabled={actionLoading === pickup.id}
                            type="button"
                            className="px-4 py-2 rounded-lg bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] text-xs font-bold transition-all shrink-0 active:scale-95 shadow-xs"
                          >
                            Verify OTP
                          </button>
                        </div>

                        {otpError && (
                          <div className="p-2 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#DC2626] font-semibold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px]">error</span>
                            <span>{otpError}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {(pickup.status === 'OTP_VERIFIED' || pickup.status === 'COLLECTING') && (
                      <div className="flex flex-col gap-2.5 p-3 rounded-lg bg-[#F5F8F4] border border-[#DCE5DE]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#172019] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-[#3FA66B]">scale</span>
                            Digital Weigh-In
                          </span>
                          <span className="text-[10px] text-[#174D35] font-bold bg-[#E8F3EB] px-2 py-0.5 rounded-full border border-[#DCE5DE]">
                            OTP Verified ✓
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-[#65736A] block mb-1 font-semibold">
                              Actual Weight (kg) *
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
                              className="w-full px-2.5 py-1.5 rounded bg-[#FFFFFF] border border-[#DCE5DE] text-[#172019] text-xs font-bold focus:border-[#3FA66B] focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-[#65736A] block mb-1 font-semibold">
                              Applicable Rate (₹/kg)
                            </label>
                            <input
                              type="number"
                              placeholder="Default rate"
                              value={weighingPickupId === pickup.id ? customRateInput : ''}
                              onChange={(e) => {
                                setWeighingPickupId(pickup.id);
                                setCustomRateInput(e.target.value);
                              }}
                              className="w-full px-2.5 py-1.5 rounded bg-[#FFFFFF] border border-[#DCE5DE] text-[#172019] text-xs font-bold focus:border-[#3FA66B] focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleConfirmWeight(pickup)}
                          disabled={actionLoading === pickup.id}
                          type="button"
                          className="w-full py-2 rounded bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">done_all</span>
                          Confirm Weight & Final Payout
                        </button>
                      </div>
                    )}

                    {(pickup.status === 'WEIGHED' || pickup.status === 'WEIGHT_VERIFIED' || pickup.status === 'AMOUNT_CONFIRMED' || pickup.status === 'PAYMENT_PENDING') && (
                      <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#174D35]">
                            Weighed: {pickup.actual_weight || pickup.estimated_weight} kg
                          </span>
                          <span className="text-sm font-bold text-[#172019]">
                            Total Payout: ₹{pickup.final_value || pickup.estimated_value}
                          </span>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('UPI')}
                            className={`flex-1 py-1.5 rounded text-xs font-bold transition-all border ${
                              paymentMethod === 'UPI'
                                ? 'bg-[#3FA66B] text-[#FFFFFF] border-[#3FA66B]'
                                : 'bg-[#FFFFFF] text-[#172019] border-[#DCE5DE]'
                            }`}
                          >
                            UPI Direct (Demo)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('CASH')}
                            className={`flex-1 py-1.5 rounded text-xs font-bold transition-all border ${
                              paymentMethod === 'CASH'
                                ? 'bg-[#3FA66B] text-[#FFFFFF] border-[#3FA66B]'
                                : 'bg-[#FFFFFF] text-[#172019] border-[#DCE5DE]'
                            }`}
                          >
                            Cash on Hand
                          </button>
                        </div>

                        <button
                          onClick={() => handleCompletePickup(pickup.id)}
                          disabled={actionLoading === pickup.id}
                          type="button"
                          className="w-full mt-1 py-2.5 rounded-lg bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[18px]">verified</span>
                          {t('completePickup')} & Settle Payment
                        </button>

                        <p className="text-[10px] text-center text-[#65736A]">
                          Demo Mode: Records instant payment settlement & awards Eco Credits to customer.
                        </p>
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
        <div className="flex flex-col gap-2.5">
          {completedPickups.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#DCE5DE] text-center flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[36px] text-[#65736A]">history</span>
              <p className="text-sm font-semibold text-[#172019]">No Completed Pickups Yet</p>
              <p className="text-xs text-[#65736A]">Your successfully completed scrap pickups will appear here.</p>
            </div>
          ) : (
            completedPickups.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex items-center justify-between gap-2 shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#172019]">{p.user_name}</span>
                    <span className="text-[10px] text-[#3FA66B] font-bold">✓ Completed</span>
                  </div>
                  <p className="text-[11px] text-[#65736A] mt-0.5">
                    {p.waste_category} • {p.actual_weight || p.estimated_weight} kg
                  </p>
                  <p className="text-[10px] text-[#65736A]">
                    {p.completed_at ? new Date(p.completed_at).toLocaleDateString() : 'Recent'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-[#3FA66B] block">
                    +₹{p.final_value || p.estimated_value}
                  </span>
                  <span className="text-[10px] text-[#65736A] font-mono">Paid</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>

  );
};
