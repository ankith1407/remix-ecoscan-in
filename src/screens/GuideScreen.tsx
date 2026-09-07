import React, { useState } from 'react';
import { SEGREGATION_DATABASE } from '../data/mockData';
import { ScreenType } from '../types';

interface GuideScreenProps {
  onNavigateToScan: () => void;
}

export const GuideScreen: React.FC<GuideScreenProps> = ({ onNavigateToScan }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [expandedBins, setExpandedBins] = useState<{ [key: string]: boolean }>({
    blue: true,
    green: true,
    red: false,
    black: false,
  });

  const toggleBin = (binKey: string) => {
    setExpandedBins((prev) => ({
      ...prev,
      [binKey]: !prev[binKey],
    }));
  };

  const matchedItem = searchQuery.trim()
    ? SEGREGATION_DATABASE.find(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          searchQuery.toLowerCase().includes(item.name.toLowerCase().split(' ')[0])
      )
    : null;

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 gap-4 pt-1 pb-20">
      {/* Search & AI Lookup Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#FFFFFF] p-4 shadow-xs border border-[#DCE5DE]">
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F3EB] text-[#174D35] text-[10px] uppercase font-bold tracking-wider border border-[#DCE5DE]">
              <span className="material-symbols-outlined text-[14px] text-[#3FA66B]">verified</span>
              MoHUA Standards
            </span>
            <span className="font-code-metric text-xs text-[#174D35] font-bold">SBM-Urban 2.0</span>
          </div>

          <h2 className="font-editorial italic text-xl font-bold text-[#172019] tracking-tight">
            4-Bin Segregation Guide
          </h2>
          <p className="text-xs text-[#65736A] leading-relaxed font-sans">
            Official Indian municipal norms. Segregate at source to enable zero-landfill smart recovery.
          </p>

          {/* Search Input Container */}
          <div className="mt-1 relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-[#3FA66B] text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search item (e.g. Milk pouch, CFL bulb, thermocol)..."
              className="w-full h-11 pl-10 pr-9 bg-[#F5F8F4] text-[#172019] placeholder:text-[#65736A]/70 text-xs font-medium rounded-xl outline-none focus:ring-1 focus:ring-[#3FA66B] border border-[#DCE5DE] shadow-inner"
            />
            {searchQuery && (
              <button
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 w-6 h-6 rounded-full bg-[#FFFFFF] flex items-center justify-center text-[#65736A] hover:text-[#172019] border border-[#DCE5DE]"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>

          {/* Live Search Instant Match Banner */}
          {searchQuery.trim() && (
            <div className="mt-1 rounded-xl bg-[#FFFFFF] p-3 transition-all shadow-xs border border-[#DCE5DE] animate-in fade-in">
              {matchedItem ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${matchedItem.color}`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {matchedItem.icon}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-editorial text-xs font-bold text-[#172019]">{matchedItem.name}</span>
                        <span className="text-[11px] text-[#3FA66B] font-bold">
                          Goes into: {matchedItem.bin}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E8F3EB] text-[#174D35] border border-[#DCE5DE]">
                      {matchedItem.type}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#F5F8F4] font-code-metric text-[11px] text-[#174D35] flex items-center gap-1.5 border border-[#DCE5DE]">
                    <span className="material-symbols-outlined text-[14px] text-[#3FA66B]">info</span>
                    <span>{matchedItem.tip}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F3EB] flex items-center justify-center text-[#3FA66B] border border-[#DCE5DE]">
                      <span className="material-symbols-outlined text-[18px]">document_scanner</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#172019]">Unknown Item</span>
                      <p className="text-[10px] text-[#65736A]">
                        Use AI Vision scanner to verify bin classification
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onNavigateToScan}
                    className="px-3 py-1.5 rounded-lg bg-[#3FA66B] text-[#FFFFFF] text-[11px] font-bold"
                    type="button"
                  >
                    Scan Now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Visual Blueprint Preview Accordion Card */}
      <div className="rounded-2xl overflow-hidden bg-[#FFFFFF] shadow-xs border border-[#DCE5DE]">
        <div
          onClick={() => setShowBlueprint(!showBlueprint)}
          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#F5F8F4] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#E8F3EB] flex items-center justify-center text-[#3FA66B] border border-[#DCE5DE]">
              <span className="material-symbols-outlined text-[18px]">photo_library</span>
            </span>
            <div>
              <h3 className="font-editorial text-xs font-bold text-[#172019]">Visual AI Protocol Reference</h3>
              <p className="text-[11px] text-[#65736A]">
                Tap to preview active municipal scanning models
              </p>
            </div>
          </div>
          <button
            className="w-7 h-7 rounded-full bg-[#FFFFFF] flex items-center justify-center text-[#172019] border border-[#DCE5DE]"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {showBlueprint ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>

        {showBlueprint && (
          <div className="px-3 pb-3 flex flex-col gap-2 pt-1 border-t border-[#DCE5DE] animate-in fade-in">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative rounded-xl overflow-hidden bg-[#F5F8F4] aspect-video border border-[#DCE5DE]">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCukmu4_EnfByfMBZWFH6dueFnBlw6M2xu7HJy9m4f08a7GJ8SObOzY0VR1luKQWm2b3G6U4LHQ68E3XId0IYa63Sfm_m0nrKgVRxmMQc-I9Ex5wZCrYwqDU3Dm2qck-usiU0bb4Hlqmg-eFoQ4pMlGcbNAEuFv0Zkwels4wSPh1I0ACdMz8i6rIqNnLV87KOzBZ5Iq77q28FJ06F9rP4mIK8j3wcKHrHL91_UCpQtHUimNFEAPDGkNSdlPjrIQi-Yr7zU"
                  alt="Manual Chart"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1.5 left-1.5 bg-[#FFFFFF]/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-[#174D35] border border-[#DCE5DE]">
                  Manual Chart
                </div>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-[#F5F8F4] aspect-video border border-[#DCE5DE]">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPPPNaTE5dYHkQtyLBtoIqJ6SpH9VSwg5sJoPgfkGGKNuY-GcKnxxKSBRt8k56zf2RtG1mB1oP88Oe-Cp_LKG3g6wtBsxWHoNNtc1Zzqp_C0pBO6SsfVX0A9y6bX01b6N--PRDcjllxv-mJyvKbi1Sn9BdAq6FVfIPvb-Ze5F5xj3mtvikdIEKKMbmlkq331BIztXp1gIhvEvhycZORXdsBxHG_LuI-OFW-TBLbt9xNKWLfH578v1jVQ9iLOO4xusKFuk"
                  alt="AI Assistant"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1.5 left-1.5 bg-[#FFFFFF]/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-[#174D35] border border-[#DCE5DE]">
                  AI Assistant
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4-Bin Segmented Cards */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-editorial italic text-sm font-bold text-[#172019]">Standard 4-Stream Rules</span>
          <span className="text-xs text-[#65736A]">4 Active Categories</span>
        </div>

        {/* 1. BLUE BIN: DRY RECYCLABLE */}
        <div className="rounded-2xl bg-[#FFFFFF] shadow-xs overflow-hidden border border-[#DCE5DE] transition-all">
          <button
            onClick={() => toggleBin('blue')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F5F8F4] transition-colors"
            type="button"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0 shadow-xs border border-[#BFDBFE]">
                <span className="material-symbols-outlined text-[26px]">recycling</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
                  <span className="font-editorial text-sm font-bold text-[#172019] truncate">Blue Bin</span>
                </div>
                <span className="text-xs text-[#2563EB] font-bold">Dry Recyclable Waste</span>
              </div>
            </div>
            <div
              className={`w-8 h-8 rounded-full bg-[#F5F8F4] flex items-center justify-center text-[#172019] shrink-0 transition-transform duration-200 border border-[#DCE5DE] ${
                expandedBins.blue ? 'rotate-180' : ''
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
            </div>
          </button>

          {expandedBins.blue && (
            <div className="px-4 pb-4 flex flex-col gap-2.5 border-t border-[#DCE5DE] pt-2">
              <div className="p-2.5 rounded-xl bg-[#F5F8F4] flex flex-col gap-1.5 border border-[#DCE5DE]">
                <span className="text-xs font-semibold text-[#172019]">Accepted Items:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Plastic bottles (PET)',
                    'Milk pouches (cut open)',
                    'Corrugated cartons',
                    'Aluminum foil & cans',
                    'Clean glass bottles',
                    'Newspapers & books',
                  ].map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-md bg-[#FFFFFF] text-[#172019] text-[11px] border border-[#DCE5DE]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#DBEAFE] text-[#1E40AF] flex items-start gap-2 border border-[#BFDBFE]">
                <span className="material-symbols-outlined text-[17px] shrink-0 mt-0.5 text-[#2563EB]">
                  cleaning_services
                </span>
                <p className="text-xs text-[#1E40AF] leading-relaxed">
                  <strong className="text-[#1E40AF]">Preparation Tip:</strong> Empty liquids completely, rinse milk packets, and crush plastic bottles flat to reduce pickup volume.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 2. GREEN BIN: WET ORGANIC */}
        <div className="rounded-2xl bg-[#FFFFFF] shadow-xs overflow-hidden border border-[#DCE5DE] transition-all">
          <button
            onClick={() => toggleBin('green')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F5F8F4] transition-colors"
            type="button"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#E8F3EB] text-[#3FA66B] flex items-center justify-center shrink-0 shadow-xs border border-[#DCE5DE]">
                <span className="material-symbols-outlined text-[26px]">compost</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3FA66B]"></span>
                  <span className="font-editorial text-sm font-bold text-[#172019] truncate">Green Bin</span>
                </div>
                <span className="text-xs text-[#3FA66B] font-bold">Wet Organic Waste</span>
              </div>
            </div>
            <div
              className={`w-8 h-8 rounded-full bg-[#F5F8F4] flex items-center justify-center text-[#172019] shrink-0 transition-transform duration-200 border border-[#DCE5DE] ${
                expandedBins.green ? 'rotate-180' : ''
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
            </div>
          </button>

          {expandedBins.green && (
            <div className="px-4 pb-4 flex flex-col gap-2.5 border-t border-[#DCE5DE] pt-2">
              <div className="p-2.5 rounded-xl bg-[#F5F8F4] flex flex-col gap-1.5 border border-[#DCE5DE]">
                <span className="text-xs font-semibold text-[#172019]">Accepted Items:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Vegetable & fruit peels',
                    'Used tea powder / bags',
                    'Cooked kitchen leftovers',
                    'Eggshells & coconut shells',
                    'Garden leaves & trim',
                  ].map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-md bg-[#FFFFFF] text-[#172019] text-[11px] border border-[#DCE5DE]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#E8F3EB] text-[#174D35] flex items-start gap-2 border border-[#DCE5DE]">
                <span className="material-symbols-outlined text-[17px] shrink-0 mt-0.5 text-[#3FA66B]">
                  nest_eco_leaf
                </span>
                <p className="text-xs text-[#174D35] leading-relaxed">
                  <strong className="text-[#174D35]">Important Tip:</strong> Never discard wet organic waste inside standard polythene carry-bags. Transfer loose or use certified compostable cornstarch liners.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 3. RED BIN: DOMESTIC HAZARDOUS */}
        <div className="rounded-2xl bg-[#FFFFFF] shadow-xs overflow-hidden border border-[#DCE5DE] transition-all">
          <button
            onClick={() => toggleBin('red')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F5F8F4] transition-colors"
            type="button"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0 shadow-xs border border-[#FCA5A5]">
                <span className="material-symbols-outlined text-[26px]">warning</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
                  <span className="font-editorial text-sm font-bold text-[#172019] truncate">Red Bin</span>
                </div>
                <span className="text-xs text-[#DC2626] font-bold">Domestic Hazardous Waste</span>
              </div>
            </div>
            <div
              className={`w-8 h-8 rounded-full bg-[#F5F8F4] flex items-center justify-center text-[#172019] shrink-0 transition-transform duration-200 border border-[#DCE5DE] ${
                expandedBins.red ? 'rotate-180' : ''
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
            </div>
          </button>

          {expandedBins.red && (
            <div className="px-4 pb-4 flex flex-col gap-2.5 border-t border-[#DCE5DE] pt-2">
              <div className="p-2.5 rounded-xl bg-[#F5F8F4] flex flex-col gap-1.5 border border-[#DCE5DE]">
                <span className="text-xs font-semibold text-[#172019]">Accepted Items:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Expired tablets & syrups',
                    'Sanitary napkins & diapers',
                    'Syringes & insulin needles',
                    'Bug spray & paint aerosols',
                    'CFL / Fluorescent tube lights',
                  ].map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-md bg-[#FFFFFF] text-[#172019] text-[11px] border border-[#DCE5DE]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FEE2E2] text-[#991B1B] flex items-start gap-2 border border-[#FCA5A5]">
                <span className="material-symbols-outlined text-[17px] shrink-0 mt-0.5 text-[#DC2626]">
                  health_and_safety
                </span>
                <p className="text-xs text-[#991B1B] leading-relaxed">
                  <strong className="text-[#DC2626]">Safety Warning:</strong> Wrap sharps, blades, and sanitaries securely in newspaper and mark with a red dot before dropping into the red container.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 4. BLACK / GRAY BIN: E-WASTE & ELECTRONICS */}
        <div className="rounded-2xl bg-[#FFFFFF] shadow-xs overflow-hidden border border-[#DCE5DE] transition-all">
          <button
            onClick={() => toggleBin('black')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F5F8F4] transition-colors"
            type="button"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#E8F3EB] text-[#174D35] flex items-center justify-center shrink-0 shadow-xs border border-[#DCE5DE]">
                <span className="material-symbols-outlined text-[26px]">devices</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#174D35]"></span>
                  <span className="font-editorial text-sm font-bold text-[#172019] truncate">
                    Black / Gray Bin
                  </span>
                </div>
                <span className="text-xs text-[#174D35] font-bold">E-Waste & Electronics</span>
              </div>
            </div>
            <div
              className={`w-8 h-8 rounded-full bg-[#F5F8F4] flex items-center justify-center text-[#172019] shrink-0 transition-transform duration-200 border border-[#DCE5DE] ${
                expandedBins.black ? 'rotate-180' : ''
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
            </div>
          </button>

          {expandedBins.black && (
            <div className="px-4 pb-4 flex flex-col gap-2.5 border-t border-[#DCE5DE] pt-2">
              <div className="p-2.5 rounded-xl bg-[#F5F8F4] flex flex-col gap-1.5 border border-[#DCE5DE]">
                <span className="text-xs font-semibold text-[#172019]">Accepted Items:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Phone chargers & USB cables',
                    'Dead lithium batteries',
                    'Old TV remotes & power banks',
                    'Keyboards, mice & accessories',
                    'Broken circuit boards (PCBs)',
                  ].map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-md bg-[#FFFFFF] text-[#172019] text-[11px] border border-[#DCE5DE]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#E8F3EB] text-[#174D35] flex items-start gap-2 border border-[#DCE5DE]">
                <span className="material-symbols-outlined text-[17px] shrink-0 mt-0.5 text-[#3FA66B]">
                  currency_rupee
                </span>
                <p className="text-xs text-[#174D35] leading-relaxed">
                  <strong className="text-[#174D35]">Monetize:</strong> You can book a verified doorstep kabadiwala on EcoScan for bulk e-waste to earn immediate cash and Green Credits.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Bin Identifier Assistant Quick Box */}
      <div className="rounded-2xl bg-[#FFFFFF] p-4 flex flex-col gap-3 shadow-xs border border-[#DCE5DE]">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-[#3FA66B] flex items-center justify-center text-[#FFFFFF] shadow-xs">
            <span className="material-symbols-outlined text-[22px]">smart_toy</span>
          </div>
          <div>
            <h3 className="font-editorial text-xs font-bold text-[#172019]">Not sure which bin?</h3>
            <p className="text-[11px] text-[#65736A]">Tap quick chips or trigger the AI camera</p>
          </div>
        </div>

        {/* Quick Item Query Chips */}
        <div className="flex flex-wrap gap-1.5">
          {[
            '🍕 Greasy Pizza Box',
            '💡 CFL Bulb',
            '📦 Amazon Bubblewrap',
            '🔋 AAA Battery',
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => {
                const cleaned = chip.replace(/^[^\w\s]+/, '').trim();
                setSearchQuery(cleaned);
              }}
              className="px-3 py-1.5 rounded-full bg-[#F5F8F4] hover:bg-[#E8F3EB] text-[#172019] text-xs transition-colors flex items-center gap-1 border border-[#DCE5DE]"
              type="button"
            >
              <span>{chip}</span>
            </button>
          ))}
        </div>

        {/* Direct Scanner Launcher */}
        <button
          onClick={onNavigateToScan}
          className="w-full h-11 rounded-xl bg-[#3FA66B] text-[#FFFFFF] text-xs font-bold flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-transform hover:bg-[#174D35]"
          type="button"
        >
          <span className="material-symbols-outlined text-[19px]">photo_camera</span>
          <span>Instant Scan with Gemini Vision AI</span>
        </button>
      </div>

      {/* Government Compliance Footer */}
      <div className="rounded-2xl bg-[#FFFFFF] p-4 flex flex-col gap-2 shadow-inner border border-[#DCE5DE]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#3FA66B] text-[22px]">policy</span>
            <span className="font-editorial italic text-xs font-bold text-[#172019]">Government Compliance</span>
          </div>
          <span className="font-code-metric text-[11px] text-[#174D35] font-bold">CPCB 2026 / EPR</span>
        </div>
        <p className="text-[11px] text-[#65736A] leading-relaxed">
          EcoScan categorizes waste in conformity with the Solid Waste Management Rules (SWM 2016) & Plastic Waste Management (PWM Amendment 2024). Segregation at source is mandatory across Class 1 & 2 Indian municipalities.
        </p>
        <div className="flex items-center gap-4 pt-1">
          <div className="flex items-center gap-1 text-[#65736A] text-xs">
            <span className="material-symbols-outlined text-[15px] text-[#3FA66B]">check_circle</span>
            <span>SBM-U 2.0 Star Rated</span>
          </div>
          <div className="flex items-center gap-1 text-[#65736A] text-xs">
            <span className="material-symbols-outlined text-[15px] text-[#3FA66B]">check_circle</span>
            <span>EPR Certified Recyclers</span>
          </div>
        </div>
      </div>

    </div>
  );
};
