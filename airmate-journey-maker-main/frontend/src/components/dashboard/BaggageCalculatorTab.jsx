import { useState, useEffect } from "react";
import {
  Luggage,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Maximize2,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { calculateBaggageApi } from "@/services/api";
import { currency } from "@/data/flights";

export default function BaggageCalculatorTab() {
  const [airline, setAirline] = useState("AirMate Express");
  const [cabinClass, setCabinClass] = useState("Economy");
  const [checkinKg, setCheckinKg] = useState(15);
  const [cabinKg, setCabinKg] = useState(7);
  const [sportsEquipment, setSportsEquipment] = useState(false);
  const [musicalInstrument, setMusicalInstrument] = useState(false);
  const [calcData, setCalcData] = useState(null);

  const runCalculation = async () => {
    try {
      const res = await calculateBaggageApi({
        airline,
        cabinClass,
        checkinKg,
        cabinKg,
        hasSportsEquipment: sportsEquipment,
        hasMusicalInstrument: musicalInstrument,
      });
      setCalcData(res);
    } catch (err) {
      console.warn("Baggage calc error:", err);
    }
  };

  useEffect(() => {
    runCalculation();
  }, [airline, cabinClass, checkinKg, cabinKg, sportsEquipment, musicalInstrument]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h3 className="font-display text-base font-bold text-foreground">
          Baggage Allowance & Excess Weight Calculator
        </h3>
        <p className="text-xs text-muted-foreground">
          Check baggage allowances and compute pre-booking excess fees across all partner airlines.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="soft-card p-6 lg:col-span-6 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-foreground block mb-1">Operating Airline</label>
            <select
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
            >
              <option value="AirMate Express">AirMate Express</option>
              <option value="Air India">Air India</option>
              <option value="IndiGo">IndiGo</option>
              <option value="Vistara">Vistara</option>
              <option value="Akasa Air">Akasa Air</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Cabin Class</label>
            <select
              value={cabinClass}
              onChange={(e) => setCabinClass(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
            >
              <option value="Economy">Economy</option>
              <option value="Premium Economy">Premium Economy</option>
              <option value="Business">Business Class</option>
              <option value="First">First Class</option>
            </select>
          </div>

          {/* Check-in Weight Input */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-foreground">Planned Check-in Baggage</label>
              <span className="font-bold text-primary text-sm">{checkinKg} kg</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={checkinKg}
              onChange={(e) => setCheckinKg(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="text-[10px] text-muted-foreground">
              Standard allowance is {calcData?.allowedCheckinKg || 15} kg on this ticket.
            </span>
          </div>

          {/* Cabin Weight Input */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-foreground">Planned Hand / Cabin Bag</label>
              <span className="font-bold text-primary text-sm">{cabinKg} kg</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={cabinKg}
              onChange={(e) => setCabinKg(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="text-[10px] text-muted-foreground">
              Standard allowance is {calcData?.allowedCabinKg || 7} kg on this ticket.
            </span>
          </div>

          {/* Special Items Checkboxes */}
          <div className="border-t border-border pt-3 space-y-2">
            <label className="font-semibold text-foreground block">Special Cargo Equipment</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sportsEquipment}
                onChange={(e) => setSportsEquipment(e.target.checked)}
                className="rounded accent-primary size-4"
              />
              <span>Sports Gear (Golf kit, Cricket kit, Surfboard) (+ ₹1,200)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={musicalInstrument}
                onChange={(e) => setMusicalInstrument(e.target.checked)}
                className="rounded accent-primary size-4"
              />
              <span>Musical Instrument in Cabin (+ ₹1,500)</span>
            </label>
          </div>
        </div>

        {/* Calculation & Summary Column */}
        <div className="soft-card p-6 lg:col-span-6 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {airline} · {cabinClass}
                </span>
                <h4 className="font-display text-lg font-bold text-foreground">Baggage Estimate</h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block">Total Extra Fee:</span>
                <span className="font-display text-2xl font-black text-foreground">
                  {calcData?.totalExcessFee ? currency(calcData.totalExcessFee) : "Free (₹0)"}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Free Check-in Included:</span>
                <strong className="text-foreground">{calcData?.allowedCheckinKg || 15} kg</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Free Cabin Bag Included:</span>
                <strong className="text-foreground">{calcData?.allowedCabinKg || 7} kg</strong>
              </div>

              {calcData?.excessCheckinKg > 0 && (
                <div className="flex justify-between py-1 text-destructive font-semibold">
                  <span>Excess Check-in ({calcData.excessCheckinKg} kg @ ₹500/kg):</span>
                  <span>+{currency(calcData.checkinFee)}</span>
                </div>
              )}

              {calcData?.excessCabinKg > 0 && (
                <div className="flex justify-between py-1 text-destructive font-semibold">
                  <span>Excess Cabin Bag ({calcData.excessCabinKg} kg @ ₹750/kg):</span>
                  <span>+{currency(calcData.cabinFee)}</span>
                </div>
              )}

              {calcData?.specialEquipmentFee > 0 && (
                <div className="flex justify-between py-1 text-primary font-semibold">
                  <span>Special Equipment Fee:</span>
                  <span>+{currency(calcData.specialEquipmentFee)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl bg-secondary/50 p-3.5 text-xs text-muted-foreground space-y-2">
              <div className="flex items-start gap-2">
                <Maximize2 className="size-4 shrink-0 text-primary mt-0.5" />
                <div>
                  <strong className="text-foreground block">Cabin Dimensions:</strong>
                  <span>{calcData?.dimensions?.cabin}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Scale className="size-4 shrink-0 text-primary mt-0.5" />
                <div>
                  <strong className="text-foreground block">Check-in Dimensions:</strong>
                  <span>{calcData?.dimensions?.checkin}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{calcData?.recommendation}</span>
          </div>

          {calcData?.source && (
            <div className="text-xs text-muted-foreground text-center">
              Data source: {calcData.source}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
