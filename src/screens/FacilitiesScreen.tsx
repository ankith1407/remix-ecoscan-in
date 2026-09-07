import React, { useState, useEffect, useMemo } from 'react';
import { ScrapRate, Facility, ScheduledPickup, LiveCollectorLocation } from '../types';
import { ScrapRateTicker } from '../components/ScrapRateTicker';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { api } from '../services/api';
import { useI18n } from '../i18n';

interface FacilitiesScreenProps {
  rates: ScrapRate[];
  facilities: Facility[];
  pickups: ScheduledPickup[];
  onOpenScheduleModal: (facilityName?: string) => void;
  onCancelPickup?: (pickupId: string) => void;
  onSelectPickup?: (pickupId: string) => void;
  onOpenReceipt?: (pickupId: string) => void;
  userId: string;
}

export const FacilitiesScreen: React.FC<FacilitiesScreenProps> = ({
  rates,
  facilities,
  pickups,
  onOpenScheduleModal,
  onCancelPickup,
  onSelectPickup,
  onOpenReceipt,
  userId,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'facilities' | 'pickups'>('facilities');
  const [selectedFilter, setSelectedFilter] = useState<string>('All Materials');
  const [searchQuery, setSearchQuery] = useState<string>('Indiranagar 100ft Rd, Bengaluru');
  const [showMapView, setShowMapView] = useState<boolean>(false);

  // Deduplicate pickups by id to ensure distinct keys and prevent duplicate renders
  const uniquePickups = useMemo(() => {
    const seen = new Set<string>();
    return pickups.filter((p) => {
      if (!p || !p.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [pickups]);

  // Live Collector GPS tracking state
  const [liveLocations, setLiveLocations] = useState<Record<string, LiveCollectorLocation>>({});
  const [dbPickupsMap, setDbPickupsMap] = useState<Record<string, { status: string }>>({});

  useEffect(() => {
    let isMounted = true;

    const fetchLiveTracking = async () => {
      try {
        const remotePickups = await api.getPickups({ userId }).catch(() => []);
        if (!isMounted) return;

        const newDbMap: Record<string, { status: string }> = {};
        for (const p of remotePickups) {
          newDbMap[p.id] = { status: p.status };
        }
        setDbPickupsMap(newDbMap);

        // Fetch location for active pickups on the way
        for (const p of uniquePickups) {
          const status = newDbMap[p.id]?.status || p.collectorStatus;
          if (status === 'COLLECTOR_ON_THE_WAY' || status === 'ON_THE_WAY') {
            try {
              const loc = await api.getCollectorLocation(p.id, userId);
              if (isMounted) {
                setLiveLocations((prev) => ({ ...prev, [p.id]: loc }));
              }
            } catch (e) {
              console.warn('Could not fetch location for', p.id, e);
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching live pickup tracking:', err);
      }
    };

    fetchLiveTracking();
    const interval = setInterval(fetchLiveTracking, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [uniquePickups, activeTab, userId]);

  const filterOptions = [
    { label: 'All Materials', color: 'bg-[#B8E600]' },
    { label: 'Old Appliances', color: 'bg-[#B8E600]' },
    { label: 'Metals & Brass', color: 'bg-[#F4F7F2]' },
    { label: 'Plastics & Cartons', color: 'bg-[#B8E600]' },
    { label: 'E-Waste & Batteries', color: 'bg-[#FF453A]' },
  ];

  const filteredFacilities = facilities.filter((fac) => {
    if (selectedFilter === 'All Materials') return true;
    if (selectedFilter === 'Old Appliances') return fac.accepts.some((a) => a.toLowerCase().includes('laptop') || a.toLowerCase().includes('appliance'));
    if (selectedFilter === 'Metals & Brass') return fac.accepts.some((a) => a.toLowerCase().includes('brass') || a.toLowerCase().includes('copper') || a.toLowerCase().includes('metal'));
    if (selectedFilter === 'Plastics & Cartons') return fac.accepts.some((a) => a.toLowerCase().includes('plastic') || a.toLowerCase().includes('carton') || a.toLowerCase().includes('newspaper'));
    if (selectedFilter === 'E-Waste & Batteries') return fac.category === 'ewaste' || fac.accepts.some((a) => a.toLowerCase().includes('battery') || a.toLowerCase().includes('pcb'));
    return true;
  });

  const activeInFlightCount = uniquePickups.filter((p) => {
    const dbStatus = dbPickupsMap[p.id]?.status || p.collectorStatus;
    return p.status !== 'completed' && dbStatus !== 'COMPLETED' && dbStatus !== 'CANCELLED' && dbStatus !== 'REJECTED';
  }).length;
  const primaryActivePickup = uniquePickups[0];

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 gap-4 pt-1 pb-20">
      {/* 1. Live Scrap Rate Micro-Ticker */}
      <ScrapRateTicker rates={rates} variant="compact" />

      {/* 2. Segmented Top Control */}
      <div className="w-full bg-[#FFFFFF] p-1 rounded-full shadow-xs flex items-center border border-[#DCE5DE]">
        <button
          onClick={() => setActiveTab('facilities')}
          className={`flex-1 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'facilities'
              ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
              : 'text-[#65736A] hover:text-[#172019]'
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-[17px]">near_me</span>
          <span>{t('nearbyCenters')}</span>
        </button>

        <button
          onClick={() => setActiveTab('pickups')}
          className={`flex-1 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'pickups'
              ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
              : 'text-[#65736A] hover:text-[#172019]'
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-[17px]">local_shipping</span>
          <span>{t('pickups')}</span>
          <span className="bg-[#E8F3EB] text-[#174D35] text-[10px] px-2 py-0.5 rounded-full font-bold border border-[#DCE5DE]">
            {activeInFlightCount} {t('active')}
          </span>
        </button>
      </div>

      {/* VIEW 1: NEARBY CENTERS */}
      {activeTab === 'facilities' && (
        <div className="flex flex-col gap-4">
          {/* Search & Geolocation Bar */}
          <div className="flex flex-col gap-2">
            <div className="relative flex items-center bg-[#FFFFFF] rounded-2xl px-3.5 py-2.5 shadow-xs border border-[#DCE5DE]">
              <span className="material-symbols-outlined text-[#3FA66B] text-[22px] mr-2.5 shrink-0">
                search
              </span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[9px] uppercase tracking-wider text-[#174D35] font-bold">
                  Current Location • GPS Auto
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search kabadiwala, centers..."
                  className="bg-transparent text-xs font-medium text-[#172019] focus:outline-none truncate placeholder:text-[#65736A]"
                />
              </div>
              <button
                aria-label="Locate Me"
                onClick={() => setSearchQuery('Indiranagar 100ft Rd, Bengaluru (Verified GPS)')}
                className="w-8 h-8 rounded-xl bg-[#E8F3EB] hover:bg-[#D7E8DC] flex items-center justify-center text-[#3FA66B] active:scale-95 transition-transform shrink-0 border border-[#DCE5DE]"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">my_location</span>
              </button>
            </div>

            {/* Filter Material Pills Horizontal Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 -mx-4 px-4">
              {filterOptions.map((f) => {
                const isActive = selectedFilter === f.label;
                return (
                  <button
                    key={f.label}
                    onClick={() => setSelectedFilter(f.label)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all border ${
                      isActive
                        ? 'bg-[#3FA66B] text-[#FFFFFF] font-bold border-[#3FA66B] shadow-xs'
                        : 'bg-[#FFFFFF] text-[#172019] border-[#DCE5DE] hover:bg-[#E8F3EB]'
                    }`}
                    type="button"
                  >
                    {f.label === 'All Materials' ? (
                      <span className="material-symbols-outlined text-[15px]">tune</span>
                    ) : (
                      <span className={`w-2 h-2 rounded-full ${f.color}`}></span>
                    )}
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Doorstep Scrap Collection Hero Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-[#FFFFFF] shadow-sm p-5 flex flex-col gap-3 border border-[#DCE5DE]">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <div className="inline-flex items-center gap-1 bg-[#E8F3EB] text-[#174D35] px-2.5 py-0.5 rounded-full w-fit border border-[#DCE5DE]">
                  <span className="material-symbols-outlined text-[13px] text-[#3FA66B]">verified</span>
                  <span className="text-[9px] uppercase tracking-wider font-bold">
                    Certified At-Home Service
                  </span>
                </div>
                <h2 className="font-editorial italic text-lg font-bold text-[#172019] mt-1">
                  Got Bulk Scrap or Electronics?
                </h2>
                <p className="text-xs text-[#65736A] leading-relaxed">
                  Book a verified local Kabadiwala equipped with a certified digital scale & guaranteed UPI / Instant cash payout at your doorstep.
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B] shrink-0">
                <span className="material-symbols-outlined text-[24px]">scale</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="bg-[#F5F8F4] rounded-xl p-2 flex flex-col items-center text-center border border-[#DCE5DE]">
                <span className="material-symbols-outlined text-[#3FA66B] text-[18px]">handshake</span>
                <span className="text-[10px] font-bold text-[#172019] mt-1">Zero Haggling</span>
              </div>
              <div className="bg-[#F5F8F4] rounded-xl p-2 flex flex-col items-center text-center border border-[#DCE5DE]">
                <span className="material-symbols-outlined text-[#3FA66B] text-[18px]">speed</span>
                <span className="text-[10px] font-bold text-[#172019] mt-1">Within 2 Hrs</span>
              </div>
              <div className="bg-[#F5F8F4] rounded-xl p-2 flex flex-col items-center text-center border border-[#DCE5DE]">
                <span className="material-symbols-outlined text-[#3FA66B] text-[18px]">
                  currency_rupee
                </span>
                <span className="text-[10px] font-bold text-[#172019] mt-1">Instant Payout</span>
              </div>
            </div>

            <button
              onClick={() => onOpenScheduleModal()}
              className="w-full mt-1 py-2.5 px-4 rounded-xl bg-[#3FA66B] text-[#FFFFFF] font-bold text-xs shadow-xs hover:bg-[#174D35] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
              <span>{t('schedulePickup')}</span>
            </button>
          </div>

          {/* Section Title & Map View Switcher */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-[#174D35] font-bold">Verified Centers</span>
              <span className="bg-[#E8F3EB] font-code-metric text-[10px] text-[#174D35] px-2 py-0.5 rounded-full font-bold border border-[#DCE5DE]">
                {filteredFacilities.length} nearby
              </span>
            </div>
            <button
              onClick={() => setShowMapView(!showMapView)}
              className="text-[#3FA66B] text-xs font-semibold flex items-center gap-1 hover:underline"
              type="button"
            >
              <span>{showMapView ? 'List View' : 'Map View'}</span>
              <span className="material-symbols-outlined text-[16px]">
                {showMapView ? 'view_list' : 'map'}
              </span>
            </button>
          </div>

          {/* Map Preview mode */}
          {showMapView && (
            <div className="w-full rounded-2xl bg-[#FFFFFF] p-4 border border-[#DCE5DE] flex flex-col items-center justify-center gap-3 text-center shadow-xs relative overflow-hidden h-56">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3FA66B_1px,transparent_1px)] [background-size:16px_16px]"></div>
              <div className="w-12 h-12 rounded-full bg-[#E8F3EB] text-[#3FA66B] flex items-center justify-center z-10 border border-[#3FA66B]/40 animate-pulse">
                <span className="material-symbols-outlined text-[28px]">pin_drop</span>
              </div>
              <div className="z-10">
                <h4 className="font-editorial italic text-base font-bold text-[#172019]">Bengaluru Eco-Cluster Map</h4>
                <p className="text-xs text-[#65736A] mt-0.5">
                  Showing 3 verified centers in Indiranagar & Kodihalli
                </p>
              </div>
              <button
                onClick={() => alert('GPS Route optimized: Lowest carbon footprint route plotted.')}
                className="z-10 px-4 py-1.5 rounded-full bg-[#E8F3EB] text-[#174D35] text-xs font-bold border border-[#DCE5DE] hover:bg-[#D7E8DC]"
                type="button"
              >
                Find Nearest Dropoff (0.8 km)
              </button>
            </div>
          )}

          {/* Facility Cards List */}
          <div className="flex flex-col gap-3.5">
            {filteredFacilities.map((facility) => (
              <div
                key={facility.id}
                className="bg-[#FFFFFF] rounded-2xl p-4 shadow-xs flex flex-col gap-3 hover:border-[#3FA66B]/60 border border-[#DCE5DE] transition-all"
              >
                {/* Media Header & Info */}
                <div className="flex gap-3 items-start">
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-[#E8F3EB] relative border border-[#DCE5DE]">
                    {facility.image ? (
                      <img
                        src={facility.image}
                        alt={facility.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#E8F3EB] flex items-center justify-center text-[#3FA66B]">
                        <span className="material-symbols-outlined text-[36px]">nature_people</span>
                      </div>
                    )}
                    <span className="absolute top-1 left-1 bg-[#FFFFFF]/90 backdrop-blur-sm text-[#174D35] font-code-metric text-[10px] px-1.5 py-0.5 rounded font-bold border border-[#DCE5DE]">
                      {facility.distance}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-editorial text-sm font-bold text-[#172019] truncate">{facility.name}</h3>
                      {facility.verified && (
                        <span
                          className="material-symbols-outlined text-[#3FA66B] text-[18px] shrink-0"
                          title={facility.verifiedBadgeText || 'Verified'}
                        >
                          verified
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center text-[#3FA66B]">
                        <span className="material-symbols-outlined text-[15px] fill-1">star</span>
                        <span className="text-xs font-bold ml-0.5 text-[#172019]">
                          {facility.rating}
                        </span>
                        <span className="text-[11px] text-[#65736A] ml-0.5">
                          ({facility.reviewsCount})
                        </span>
                      </div>
                      <span className="text-[#DCE5DE] text-xs">•</span>
                      <span className="text-xs font-semibold text-[#174D35]">
                        {facility.statusText}
                      </span>
                    </div>

                    <p className="text-xs text-[#65736A] truncate mt-1">{facility.address}</p>
                  </div>
                </div>

                {/* Accepted Materials Tags */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-[#65736A]">Accepts:</span>
                  {facility.accepts.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-[#F5F8F4] text-[#172019] text-[10px] font-medium border border-[#DCE5DE]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Quick Action Controls */}
                <div className={`grid ${facility.category === 'bbmp_dwcc' ? 'grid-cols-2' : 'grid-cols-3'} gap-2 pt-1 border-t border-[#DCE5DE]`}>
                  {facility.category === 'bbmp_dwcc' ? (
                    <>
                      <button
                        onClick={() =>
                          alert(
                            'BBMP DWCC Guidelines: Strict dry waste segregation is mandatory. Non-recyclable bags are rejected at gate.'
                          )
                        }
                        className="py-2 px-2 rounded-xl bg-[#FFFFFF] text-[#172019] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#E8F3EB] transition-colors border border-[#DCE5DE]"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[17px] text-[#3FA66B]">
                          info
                        </span>
                        <span>Guidelines</span>
                      </button>

                      <button
                        onClick={() =>
                          alert('Opening directions to Swachh Bharat BBMP DWCC...')
                        }
                        className="py-2 px-2 rounded-xl bg-[#FFFFFF] text-[#172019] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#E8F3EB] transition-colors border border-[#DCE5DE]"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[17px] text-[#172019]">
                          directions
                        </span>
                        <span>Navigate</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <a
                        href={`tel:${facility.phone}`}
                        className="py-2 px-2 rounded-xl bg-[#FFFFFF] text-[#172019] text-xs font-semibold flex items-center justify-center gap-1 hover:bg-[#E8F3EB] transition-colors border border-[#DCE5DE]"
                      >
                        <span className="material-symbols-outlined text-[17px] text-[#3FA66B]">
                          call
                        </span>
                        <span>Call</span>
                      </a>

                      <button
                        onClick={() =>
                          alert(`Opening directions to ${facility.name}...`)
                        }
                        className="py-2 px-2 rounded-xl bg-[#FFFFFF] text-[#172019] text-xs font-semibold flex items-center justify-center gap-1 hover:bg-[#E8F3EB] transition-colors border border-[#DCE5DE]"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[17px] text-[#172019]">
                          directions
                        </span>
                        <span>Navigate</span>
                      </button>

                      <button
                        onClick={() => onOpenScheduleModal(facility.name)}
                        className="py-2 px-2 rounded-xl bg-[#3FA66B] text-[#FFFFFF] text-xs font-bold flex items-center justify-center gap-1 shadow-xs hover:bg-[#174D35] active:scale-95 transition-all"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[17px]">
                          calendar_today
                        </span>
                        <span>{facility.category === 'ewaste' ? 'Drop / Pick' : 'Book'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Persistent Sticky Active Booking Status Strip */}
          {primaryActivePickup && (
            <div
              onClick={() => setActiveTab('pickups')}
              className="bg-[#FFFFFF] p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-2 border border-[#3FA66B] cursor-pointer hover:bg-[#E8F3EB] transition-all mt-1"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E8F3EB] flex items-center justify-center text-[#3FA66B] shrink-0 border border-[#DCE5DE]">
                  <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3FA66B] animate-ping"></span>
                    <span className="text-[9px] text-[#174D35] uppercase font-bold tracking-wider">
                      Active Booking
                    </span>
                  </div>
                  <span className="text-xs font-medium text-[#172019] truncate">
                    {primaryActivePickup.dateTimeSlot} • {primaryActivePickup.partnerName}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="bg-[#E8F3EB] px-2 py-1 rounded-lg border border-[#DCE5DE]">
                  <span className="font-code-metric text-xs text-[#174D35] font-bold">
                    OTP {primaryActivePickup.otp}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-full bg-[#FFFFFF] border border-[#DCE5DE] flex items-center justify-center text-[#172019]">
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* VIEW 2: MY SCHEDULED PICKUPS */}
      {activeTab === 'pickups' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-[#174D35] font-bold">{t('scheduledPickups')}</span>
            <span className="bg-[#E8F3EB] text-[#174D35] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border border-[#DCE5DE]">
              {activeInFlightCount} {t('inFlight')}
            </span>
          </div>

          {uniquePickups.map((pickup) => {
            const currentDbStatus = dbPickupsMap[pickup.id]?.status || pickup.collectorStatus;
            const isCompleted = pickup.status === 'completed' || currentDbStatus === 'COMPLETED';
            const isCollectorOnTheWay = !isCompleted && (currentDbStatus === 'COLLECTOR_ON_THE_WAY' || currentDbStatus === 'ON_THE_WAY' || pickup.collectorStatus === 'COLLECTOR_ON_THE_WAY' || pickup.collectorStatus === 'ON_THE_WAY');
            const isCollectorArrived = !isCompleted && (currentDbStatus === 'ARRIVED' || currentDbStatus === 'OTP_PENDING');
            const isConfirmed = !isCompleted && (pickup.status === 'confirmed' || currentDbStatus === 'ACCEPTED' || currentDbStatus === 'REQUESTED');
            const trackingData = liveLocations[pickup.id];

            let displayStatusText = pickup.statusText;
            if (isCompleted) displayStatusText = 'COMPLETED ✓';
            else if (isCollectorOnTheWay) displayStatusText = 'COLLECTOR ON THE WAY';
            else if (isCollectorArrived) displayStatusText = 'COLLECTOR ARRIVED AT DOORSTEP';
            else if (currentDbStatus === 'WEIGHED' || currentDbStatus === 'WEIGHT_VERIFIED') displayStatusText = 'WEIGHT VERIFIED';

            return (
              <div
                key={pickup.id}
                className={`bg-[#FFFFFF] rounded-2xl p-4 shadow-xs flex flex-col gap-3 border-l-4 ${
                  isCompleted ? 'border-l-[#3FA66B]' : isConfirmed ? 'border-l-[#3FA66B]' : 'border-l-[#DCE5DE]'
                } border border-[#DCE5DE]`}
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isCollectorOnTheWay
                            ? 'bg-[#3FA66B] animate-ping'
                            : isCompleted || isConfirmed
                            ? 'bg-[#3FA66B]'
                            : 'bg-[#DCE5DE]'
                        }`}
                      ></span>
                      <span
                        className={`text-[10px] uppercase tracking-wider font-bold ${
                          isCompleted || isConfirmed ? 'text-[#174D35]' : 'text-[#65736A]'
                        }`}
                      >
                        {displayStatusText}
                      </span>
                    </div>
                    <h3 className="font-editorial text-base font-bold text-[#172019] mt-1">
                      {pickup.dateTimeSlot}
                    </h3>
                    <p className="text-xs text-[#65736A]">{pickup.partnerName}</p>
                  </div>

                  {isCompleted ? (
                    <div className="bg-[#E8F3EB] px-3 py-1.5 rounded-xl flex flex-col items-end border border-[#3FA66B]/40">
                      <span className="text-[9px] uppercase text-[#174D35] font-bold">
                        Status
                      </span>
                      <span className="text-xs font-bold text-[#3FA66B] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Verified
                      </span>
                    </div>
                  ) : (
                    <div className="bg-[#E8F3EB] px-3 py-1.5 rounded-xl flex flex-col items-end border border-[#DCE5DE]">
                      <span className="text-[9px] uppercase text-[#65736A] font-bold">
                        Pickup OTP
                      </span>
                      <span
                        className={`font-code-metric text-base font-bold tracking-wider ${
                          isConfirmed ? 'text-[#174D35]' : 'text-[#65736A]'
                        }`}
                      >
                        {pickup.otp}
                      </span>
                    </div>
                  )}
                </div>

                {/* Itemized estimate breakdown */}
                <div className="bg-[#F5F8F4] rounded-xl p-3 flex items-center justify-between border border-[#DCE5DE]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[#3FA66B] text-[20px] shrink-0">
                      inventory_2
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[#172019] truncate">
                        {pickup.itemsSummary}
                      </span>
                      <span className="text-[11px] text-[#65736A]">{pickup.weightEst}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <span
                      className={`text-xs font-bold ${
                        isConfirmed ? 'text-[#3FA66B]' : 'text-[#172019]'
                      }`}
                    >
                      {pickup.payoutEst}
                    </span>
                    <span className="text-[10px] text-[#65736A]">
                      {pickup.isFixedPrice ? 'Pre-assessed' : 'Est. Payout'}
                    </span>
                  </div>
                </div>

                {/* Live Collector Location Tracking Section */}
                {isCollectorOnTheWay && (
                  <div className="bg-[#E8F3EB] rounded-xl p-3 flex flex-col gap-2.5 border border-[#3FA66B]/40 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3FA66B] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3FA66B]"></span>
                        </span>
                        <span className="text-xs font-bold text-[#172019] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-[#3FA66B]">
                            local_shipping
                          </span>
                          <span>{t('collectorOnWay')}</span>
                        </span>
                      </div>

                      {trackingData?.available && trackingData.approx_eta_formatted ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#3FA66B] text-[#FFFFFF]">
                          ETA {trackingData.approx_eta_formatted}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#65736A] font-medium">
                          Live Trip
                        </span>
                      )}
                    </div>

                    {trackingData?.available && trackingData.location ? (
                      <div className="flex flex-col gap-2 pt-0.5">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2 bg-[#FFFFFF] p-2.5 rounded-lg border border-[#DCE5DE] text-xs">
                          <div>
                            <span className="text-[10px] text-[#65736A] block">
                              Approximate Distance
                            </span>
                            <span className="font-bold text-[#172019] flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[14px] text-[#3FA66B]">
                                straighten
                              </span>
                              {trackingData.distance_formatted}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#65736A] block">
                              Estimated Arrival
                            </span>
                            <span className="font-bold text-[#3FA66B] flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[14px]">timer</span>
                              {trackingData.approx_eta_formatted}
                            </span>
                          </div>
                        </div>

                        {/* Location Details */}
                        <div className="flex flex-col gap-2 text-xs bg-[#FFFFFF] p-2.5 rounded-lg border border-[#DCE5DE]">
                          <div className="flex items-start gap-2">
                            <span className="text-xs shrink-0 mt-0.5">📍</span>
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold text-[#65736A]">
                                Collector Location
                              </span>
                              <span className="text-xs font-mono text-[#172019]">
                                {trackingData.location.latitude.toFixed(4)}° N,{' '}
                                {trackingData.location.longitude.toFixed(4)}° E
                              </span>
                              <span className="text-[10px] text-[#65736A]">
                                {trackingData.location.tracking_active ? t('trackingActive') : t('trackingStopped')} • {t('updated')}{' '}
                                {new Date(trackingData.location.updated_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 pt-2 border-t border-[#DCE5DE]">
                            <span className="text-xs shrink-0 mt-0.5">🏠</span>
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold text-[#65736A]">
                                Pickup Destination
                              </span>
                              <span className="text-xs text-[#172019]">
                                {trackingData.pickup_location?.address || t('pickupAddressUnavailable')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <LiveTrackingMap
                          collectorLocation={trackingData.location}
                          pickupLocation={trackingData.pickup_location}
                        />
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-[#FFFFFF] border border-[#DCE5DE] text-center flex flex-col items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[20px] text-[#65736A]">
                          location_searching
                        </span>
                        <p className="text-xs font-medium text-[#172019]">
                          {t('locationUnavailable')}
                        </p>
                        <span className="text-[10px] text-[#65736A]">
                          {t('locationWaiting')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Partner Profile & Controls */}
                {isConfirmed && pickup.partnerVehicle ? (
                  <div className="flex items-center justify-between pt-1 border-t border-[#DCE5DE]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
                        <span className="material-symbols-outlined text-[20px]">two_wheeler</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#172019]">
                          {pickup.partnerVehicle}
                        </span>
                        <span className="text-[11px] text-[#65736A]">
                          {pickup.partnerRating} • {pickup.pickupsCount}
                        </span>
                      </div>
                    </div>

                    <a
                      href={`tel:${pickup.phone || '+919845012345'}`}
                      className="w-9 h-9 rounded-xl bg-[#3FA66B] text-[#FFFFFF] flex items-center justify-center shadow-xs active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[18px]">call</span>
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#DCE5DE]">
                    {isCompleted && onOpenReceipt && (
                      <button
                        onClick={() => onOpenReceipt(pickup.id)}
                        className="py-1.5 px-3 rounded-lg bg-[#3FA66B] text-[#FFFFFF] text-xs font-bold hover:bg-[#174D35] transition-colors shadow-xs flex items-center gap-1"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                        View Receipt & Rating
                      </button>
                    )}
                    {onSelectPickup && (
                      <button
                        onClick={() => onSelectPickup(pickup.id)}
                        className="py-1.5 px-3 rounded-lg bg-[#E8F3EB] text-[#174D35] text-xs font-bold hover:bg-[#D7E8DC] transition-colors border border-[#DCE5DE] flex items-center gap-1"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px]">timeline</span>
                        Inspector Timeline
                      </button>
                    )}
                    {!isCompleted && (
                      <>
                        <button
                          onClick={() => alert('Opening reschedule slot selector...')}
                          className="py-1.5 px-3 rounded-lg bg-[#FFFFFF] text-[#172019] text-xs font-semibold hover:bg-[#F5F8F4] transition-colors border border-[#DCE5DE]"
                          type="button"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Cancel this pickup request?')) {
                              onCancelPickup && onCancelPickup(pickup.id);
                            }
                          }}
                          className="py-1.5 px-3 rounded-lg bg-[#FFFFFF] text-[#DC2626] text-xs font-semibold hover:bg-[#FEE2E2] transition-colors border border-[#FCA5A5]"
                          type="button"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={() => onOpenScheduleModal()}
            className="w-full py-3 rounded-2xl bg-[#FFFFFF] hover:bg-[#E8F3EB] text-[#3FA66B] text-xs font-bold border-2 border-dashed border-[#DCE5DE] hover:border-[#3FA66B]/60 flex items-center justify-center gap-2 transition-all mt-2"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>Book Another Doorstep Pickup</span>
          </button>
        </div>
      )}

    </div>
  );
};
