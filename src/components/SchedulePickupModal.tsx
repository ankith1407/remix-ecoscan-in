import React, { useState, useEffect } from 'react';
import { ScheduledPickup } from '../types';
import { api } from '../services/api';

interface SchedulePickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pickup: ScheduledPickup) => void;
  preselectedFacilityName?: string;
  preselectedItemName?: string;
  preselectedWeightKg?: number;
  preselectedPayout?: string;
  userId: string;
}

export const SchedulePickupModal: React.FC<SchedulePickupModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  preselectedFacilityName,
  preselectedItemName,
  preselectedWeightKg,
  preselectedPayout,
  userId,
}) => {
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([
    'Newspaper / Cartons',
    'Old Appliances',
  ]);
  const [weightKg, setWeightKg] = useState<number>(preselectedWeightKg || 10);
  const [selectedSlot, setSelectedSlot] = useState<string>('Tomorrow 10 AM');
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash'>('upi');

  useEffect(() => {
    if (preselectedItemName) {
      setSelectedMaterials([preselectedItemName]);
    }
    if (preselectedWeightKg) {
      setWeightKg(preselectedWeightKg);
    }
  }, [preselectedItemName, preselectedWeightKg]);

  useEffect(() => {
    if (isOpen) {
      api.getCurrentUser()
        .then((user) => {
          if (user) {
            if (user.address && user.address.trim()) {
              setPickupAddress(user.address.trim());
            }
            const phone = user.phoneNumber || (user as any).phone || '';
            if (phone.trim()) {
              setContactPhone(phone.trim());
            }
          }
        })
        .catch(() => {
          // Non-fatal: keep current input state if offline or guest
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleMaterial = (material: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(material)
        ? prev.filter((m) => m !== material)
        : [...prev, material]
    );
  };

  const handleBooking = async () => {
    if (isSubmitting) return;
    setValidationError(null);

    // Validation rules
    if (!selectedMaterials || selectedMaterials.length === 0) {
      setValidationError('Please select at least one scrap material item');
      return;
    }
    if (!weightKg || weightKg <= 0) {
      setValidationError('Please select a valid estimated scrap weight');
      return;
    }
    if (!pickupAddress || pickupAddress.trim().length < 5) {
      setValidationError('Please enter a valid doorstep pickup address');
      return;
    }
    if (!contactPhone || contactPhone.trim().length < 8) {
      setValidationError('Please enter a valid contact phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      let lat = 17.3850;
      let lng = 78.4867;

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 2500,
              maximumAge: 300000,
            });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } catch {
          // Fall back gracefully to operating center coords if browser GPS denied/timed out
          console.info('Geolocation unavailable or denied; using address location.');
        }
      }

      const finalItems = preselectedItemName
        ? `${preselectedItemName} (${weightKg}kg)`
        : selectedMaterials.length > 0
        ? `${selectedMaterials.join(', ')} (${weightKg}kg)`
        : `Mixed Scrap (${weightKg}kg)`;

      let createdPickupItem: any = null;
      try {
        const res = await api.createPickup({
          user_id: userId,
          pickup_address: pickupAddress.trim(),
          estimated_weight: weightKg,
          waste_category: selectedMaterials[0] || 'Dry Recyclables',
          items_summary: finalItems,
          preferred_date: selectedSlot,
          special_instructions: specialInstructions.trim(),
          latitude: lat,
          longitude: lng,
        } as any);
        if (res && res.id) {
          createdPickupItem = res;
        }
      } catch (err: any) {
        setValidationError(err.message || 'Server pickup creation failed');
        return;
      }

      const randomOtp = createdPickupItem?.otp || Math.floor(1000 + Math.random() * 9000).toString();
      const newPickup: ScheduledPickup = {
        id: createdPickupItem?.id || `ES-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).substring(2,6).toUpperCase()}`,
        status: 'confirmed',
        statusText: 'Finding a nearby collector...',
        dateTimeSlot: selectedSlot,
        partnerName: preselectedFacilityName || 'Certified Verified Kabadiwala Network',
        partnerVehicle: 'KA-03-EC-4821 (E-Loader)',
        partnerRating: '4.9 ★',
        pickupsCount: '450+ Pickups Done',
        phone: contactPhone,
        otp: randomOtp,
        itemsSummary: finalItems,
        weightEst: `Est. ${weightKg} kg`,
        payoutEst: preselectedPayout || `₹${weightKg * 25} - ₹${weightKg * 35}`,
        collectorStatus: 'REQUESTED',
      };

      onConfirm(newPickup);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#12352A]/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#FFFFFF] rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-4 shadow-xl border border-[#D8EADF] animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto text-[#12352A]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#D8EADF]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765] shadow-xs">
              <span className="material-symbols-outlined text-[22px]">electric_rickshaw</span>
            </div>
            <div>
              <h3 className="font-editorial italic text-base font-bold text-[#12352A]">
                Book Scrap Doorstep Pickup
              </h3>
              <p className="text-xs text-[#087A4B] font-semibold truncate max-w-[240px]">
                {preselectedFacilityName
                  ? `Partner: ${preselectedFacilityName}`
                  : 'Certified Verified Kabadiwala Network'}
              </p>
            </div>
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F7FCF8] border border-[#D8EADF] flex items-center justify-center text-[#60766C] hover:text-[#12352A]"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Identified Product & Agreed Valuation Banner (if booked from Scan screen) */}
        {preselectedItemName && (
          <div className="p-3.5 rounded-2xl bg-[#E8F8EE] border border-[#D8EADF] flex flex-col gap-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[#087A4B] tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                Identified Scrap Product
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#16A765] text-[#FFFFFF] text-[10px] font-bold">
                Rate Locked
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#12352A]">{preselectedItemName}</span>
                <span className="text-[11px] text-[#60766C]">
                  Estimated Weight: <strong className="text-[#12352A]">{weightKg} kg</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#60766C] block">Estimated Payout</span>
                <span className="text-base font-editorial font-bold text-[#16A765]">
                  {preselectedPayout || `₹${weightKg * 30}`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Material Selection / Additional Items */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#60766C] font-semibold flex items-center justify-between">
            <span>{preselectedItemName ? 'Add Any Additional Scrap:' : 'Select Scrap Items:'}</span>
            <span className="text-[10px] text-[#16A765] font-bold">Certified Electronic Scale</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              preselectedItemName || 'Iron / Heavy Metal',
              'Newspaper / Cartons',
              'Old Appliances',
              'Plastic Bottles & Containers',
              'Copper Wire / Brass',
            ]
              .filter((val, idx, arr) => arr.indexOf(val) === idx)
              .map((mat) => {
                const checked = selectedMaterials.includes(mat);
                return (
                  <label
                    key={mat}
                    className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer select-none border transition-all text-xs ${
                      checked
                        ? 'bg-[#E8F8EE] border-[#16A765] text-[#087A4B] font-semibold'
                        : 'bg-[#FFFFFF] border-[#D8EADF] text-[#60766C]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMaterial(mat)}
                      className="accent-[#16A765] w-4 h-4 rounded"
                    />
                    <span className="truncate">{mat}</span>
                  </label>
                );
              })}
          </div>
        </div>

        {/* Weight Selector / Adjuster */}
        <div className="flex flex-col gap-1.5 bg-[#F3FBF6] p-3 rounded-xl border border-[#D8EADF]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#60766C] font-semibold">Total Estimated Scrap Weight:</span>
            <span className="text-sm font-bold text-[#16A765] font-editorial">{weightKg} kg</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {[5, 10, 20, 50].map((kg) => (
              <button
                key={kg}
                type="button"
                onClick={() => setWeightKg(kg)}
                className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  weightKg === kg
                    ? 'bg-[#16A765] text-[#FFFFFF] border-[#16A765]'
                    : 'bg-[#FFFFFF] text-[#12352A] border-[#D8EADF]'
                }`}
              >
                {kg} kg
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Slot Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#60766C] font-semibold">
            Choose Convenient Pickup Slot:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['Today, 4 PM', 'Tomorrow 10 AM', 'Sunday 11 AM'].map((slot) => {
              const isSelected = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold text-center transition-all ${
                    isSelected
                      ? 'bg-[#16A765] text-[#FFFFFF] shadow-xs font-bold'
                      : 'bg-[#FFFFFF] text-[#12352A] border border-[#D8EADF] hover:bg-[#E8F8EE]'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Pickup Address & Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#60766C] font-semibold">Contact Phone *</label>
            <div className="flex items-center bg-[#FFFFFF] rounded-xl px-3 py-2 border border-[#D8EADF]">
              <span className="material-symbols-outlined text-[#16A765] text-[18px] mr-2 shrink-0">call</span>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98450 12345"
                className="bg-transparent text-xs text-[#12352A] w-full focus:outline-none font-bold"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#60766C] font-semibold">Special Instructions (Optional)</label>
            <input
              type="text"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Ring bell 402, scrap kept on balcony"
              className="bg-[#FFFFFF] rounded-xl px-3 py-2 border border-[#D8EADF] text-xs text-[#12352A] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#60766C] font-semibold flex items-center justify-between">
            <span>Pickup Address:</span>
            <span className="text-[10px] text-[#16A765] font-bold">Doorstep Service</span>
          </label>
          <div className="flex items-center bg-[#FFFFFF] rounded-xl px-3 py-2 border border-[#D8EADF]">
            <span className="material-symbols-outlined text-[#16A765] text-[18px] mr-2 shrink-0">
              home_pin
            </span>
            <input
              type="text"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="bg-transparent text-xs text-[#12352A] w-full focus:outline-none"
            />
          </div>
        </div>

        {validationError && (
          <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#DC2626] font-semibold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{validationError}</span>
          </div>
        )}

        {/* Step 4: Payment Preference */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#60766C] font-semibold">How would you like to get paid?</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMode('upi')}
              className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                paymentMode === 'upi'
                  ? 'bg-[#E8F8EE] border-[#16A765] text-[#087A4B] font-bold'
                  : 'bg-[#FFFFFF] border-[#D8EADF] text-[#60766C]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
              <span>Instant UPI (GPay/PhonePe)</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('cash')}
              className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                paymentMode === 'cash'
                  ? 'bg-[#E8F8EE] border-[#16A765] text-[#087A4B] font-bold'
                  : 'bg-[#FFFFFF] border-[#D8EADF] text-[#60766C]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">payments</span>
              <span>Cash on Weighing</span>
            </button>
          </div>
        </div>

        {/* Trust Reassurance Badges */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F3FBF6] text-[#60766C] text-xs border border-[#D8EADF]">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-[#16A765]">verified</span>
            <span>Certified Scale</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-[#16A765]">currency_rupee</span>
            <span>Instant Payout</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-[#16A765]">security</span>
            <span>Verified OTP Agent</span>
          </span>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleBooking}
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl bg-[#16A765] disabled:opacity-50 text-[#FFFFFF] font-bold text-sm shadow-md active:scale-[0.98] transition-transform hover:bg-[#087A4B] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isSubmitting ? 'hourglass_top' : 'check_circle'}
          </span>
          <span>
            {isSubmitting
              ? 'Scheduling Pickup...'
              : `Confirm Pickup Slot (${preselectedPayout || `₹${weightKg * 30}`})`}
          </span>
        </button>
      </div>
    </div>
  );
};
