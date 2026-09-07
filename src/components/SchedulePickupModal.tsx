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
  const [pickupAddress, setPickupAddress] = useState<string>(
    'Flat 402, Green Meadows, 12th Main, Indiranagar, Bengaluru'
  );
  const [contactPhone, setContactPhone] = useState<string>('+91 98450 12345');
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
      if (!navigator.geolocation) {
        setValidationError('Current location is required to schedule a pickup.');
        return;
      }
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
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
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
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
      className="fixed inset-0 z-50 bg-[#172019]/60 backdrop-blur-md flex items-end justify-center p-0 transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#FFFFFF] rounded-t-3xl p-6 flex flex-col gap-4 shadow-2xl border-t border-[#DCE5DE] animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto text-[#172019]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B] shadow-xs">
              <span className="material-symbols-outlined text-[22px]">electric_rickshaw</span>
            </div>
            <div>
              <h3 className="font-editorial italic text-base font-bold text-[#172019]">
                Book Scrap Doorstep Pickup
              </h3>
              <p className="text-xs text-[#174D35] font-semibold truncate max-w-[240px]">
                {preselectedFacilityName
                  ? `Partner: ${preselectedFacilityName}`
                  : 'Certified Verified Kabadiwala Network'}
              </p>
            </div>
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F8F4] border border-[#DCE5DE] flex items-center justify-center text-[#65736A] hover:text-[#172019]"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Identified Product & Agreed Valuation Banner (if booked from Scan screen) */}
        {preselectedItemName && (
          <div className="p-3.5 rounded-2xl bg-[#E8F3EB] border border-[#3FA66B]/30 flex flex-col gap-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[#174D35] tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                Identified Scrap Product
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#3FA66B] text-[#FFFFFF] text-[10px] font-bold">
                Rate Locked
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#172019]">{preselectedItemName}</span>
                <span className="text-[11px] text-[#65736A]">
                  Estimated Weight: <strong className="text-[#172019]">{weightKg} kg</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#65736A] block">Estimated Payout</span>
                <span className="text-base font-editorial font-bold text-[#3FA66B]">
                  {preselectedPayout || `₹${weightKg * 30}`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Material Selection / Additional Items */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#65736A] font-semibold flex items-center justify-between">
            <span>{preselectedItemName ? 'Add Any Additional Scrap:' : 'Select Scrap Items:'}</span>
            <span className="text-[10px] text-[#3FA66B] font-bold">Certified Electronic Scale</span>
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
                        ? 'bg-[#E8F3EB] border-[#3FA66B] text-[#174D35] font-semibold'
                        : 'bg-[#FFFFFF] border-[#DCE5DE] text-[#65736A]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMaterial(mat)}
                      className="accent-[#3FA66B] w-4 h-4 rounded"
                    />
                    <span className="truncate">{mat}</span>
                  </label>
                );
              })}
          </div>
        </div>

        {/* Weight Selector / Adjuster */}
        <div className="flex flex-col gap-1.5 bg-[#F5F8F4] p-3 rounded-xl border border-[#DCE5DE]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#65736A] font-semibold">Total Estimated Scrap Weight:</span>
            <span className="text-sm font-bold text-[#3FA66B] font-editorial">{weightKg} kg</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {[5, 10, 20, 50].map((kg) => (
              <button
                key={kg}
                type="button"
                onClick={() => setWeightKg(kg)}
                className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  weightKg === kg
                    ? 'bg-[#3FA66B] text-[#FFFFFF] border-[#3FA66B]'
                    : 'bg-[#FFFFFF] text-[#172019] border-[#DCE5DE]'
                }`}
              >
                {kg} kg
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Slot Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#65736A] font-semibold">
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
                      ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-sm font-bold'
                      : 'bg-[#FFFFFF] text-[#172019] border border-[#DCE5DE] hover:bg-[#E8F3EB]'
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
            <label className="text-xs text-[#65736A] font-semibold">Contact Phone *</label>
            <div className="flex items-center bg-[#FFFFFF] rounded-xl px-3 py-2 border border-[#DCE5DE]">
              <span className="material-symbols-outlined text-[#3FA66B] text-[18px] mr-2 shrink-0">call</span>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98450 12345"
                className="bg-transparent text-xs text-[#172019] w-full focus:outline-none font-bold"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#65736A] font-semibold">Special Instructions (Optional)</label>
            <input
              type="text"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Ring bell 402, scrap kept on balcony"
              className="bg-[#FFFFFF] rounded-xl px-3 py-2 border border-[#DCE5DE] text-xs text-[#172019] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#65736A] font-semibold flex items-center justify-between">
            <span>Pickup Address:</span>
            <span className="text-[10px] text-[#3FA66B] font-bold">Doorstep Service</span>
          </label>
          <div className="flex items-center bg-[#FFFFFF] rounded-xl px-3 py-2 border border-[#DCE5DE]">
            <span className="material-symbols-outlined text-[#3FA66B] text-[18px] mr-2 shrink-0">
              home_pin
            </span>
            <input
              type="text"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="bg-transparent text-xs text-[#172019] w-full focus:outline-none"
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
          <label className="text-xs text-[#65736A] font-semibold">How would you like to get paid?</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMode('upi')}
              className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                paymentMode === 'upi'
                  ? 'bg-[#E8F3EB] border-[#3FA66B] text-[#174D35] font-bold'
                  : 'bg-[#FFFFFF] border-[#DCE5DE] text-[#65736A]'
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
                  ? 'bg-[#E8F3EB] border-[#3FA66B] text-[#174D35] font-bold'
                  : 'bg-[#FFFFFF] border-[#DCE5DE] text-[#65736A]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">payments</span>
              <span>Cash on Weighing</span>
            </button>
          </div>
        </div>

        {/* Trust Reassurance Badges */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F5F8F4] text-[#65736A] text-xs border border-[#DCE5DE]">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-[#3FA66B]">verified</span>
            <span>Certified Scale</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-[#3FA66B]">currency_rupee</span>
            <span>Instant Payout</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-[#3FA66B]">security</span>
            <span>Verified OTP Agent</span>
          </span>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleBooking}
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl bg-[#3FA66B] disabled:opacity-50 text-[#FFFFFF] font-bold text-sm shadow-md active:scale-[0.98] transition-transform hover:bg-[#174D35] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
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
