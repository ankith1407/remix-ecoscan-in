import React, { useState } from 'react';
import { DbPickupItem } from '../types';
import { api } from '../services/api';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickup: DbPickupItem | null;
  onSuccess?: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  pickup,
  onSuccess,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [review, setReview] = useState<string>('');
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !pickup) return null;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await api.ratePickup(pickup.id, pickup.user_id, rating, review);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#172019]/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-[#DCE5DE] flex flex-col p-6 gap-4 animate-in fade-in zoom-in-95 duration-200 text-[#172019]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706]">
              <span className="material-symbols-outlined text-[24px]">grade</span>
            </div>
            <div>
              <h3 className="font-editorial italic font-bold text-base text-[#172019]">
                Rate Pickup Experience
              </h3>
              <p className="text-xs text-[#65736A]">
                Pickup #{pickup.id.substring(0, 10)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F8F4] text-[#65736A] hover:text-[#172019] flex items-center justify-center"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Collector Info Banner */}
        <div className="p-3.5 rounded-2xl bg-[#F5F8F4] border border-[#DCE5DE] flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B] shrink-0 font-bold">
            <span className="material-symbols-outlined text-[24px]">person</span>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-[#172019] block truncate">
              {pickup.collector_name || 'Green Earth Kabadiwala Partner'}
            </span>
            <span className="text-[11px] text-[#65736A] block">
              {pickup.collector_vehicle || 'KA-03-EC-4821'} • {pickup.actual_weight || pickup.estimated_weight} kg collected
            </span>
          </div>
        </div>

        {/* Interactive 5 Star Selector */}
        <div className="flex flex-col items-center gap-2 py-2">
          <span className="text-xs font-semibold text-[#65736A]">How was your scrap pickup service?</span>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating !== null ? hoverRating : rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1 transition-transform active:scale-125 focus:outline-none"
                >
                  <span
                    className={`material-symbols-outlined text-[34px] ${
                      active ? 'text-[#D97706] fill-1' : 'text-[#DCE5DE]'
                    }`}
                  >
                    star
                  </span>
                </button>
              );
            })}
          </div>
          <span className="text-xs font-bold text-[#D97706]">
            {rating === 5
              ? 'Excellent! (5/5)'
              : rating === 4
              ? 'Very Good (4/5)'
              : rating === 3
              ? 'Average (3/5)'
              : rating === 2
              ? 'Below Average (2/5)'
              : 'Poor Service (1/5)'}
          </span>
        </div>

        {/* Optional Review Input */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-[#65736A]">Optional Feedback / Comments:</label>
          <textarea
            rows={3}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Punctual collector, accurate scale weighing, prompt payout..."
            className="p-3 rounded-xl border border-[#DCE5DE] text-xs text-[#172019] focus:outline-none focus:border-[#3FA66B] bg-[#FFFFFF]"
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#DC2626] font-semibold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onClose}
            type="button"
            className="py-2.5 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] text-[#172019] font-bold text-xs hover:bg-[#F5F8F4] transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            type="button"
            className="py-2.5 rounded-xl bg-[#3FA66B] text-[#FFFFFF] font-bold text-xs hover:bg-[#174D35] transition-colors flex items-center justify-center gap-1 shadow-xs"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
};
