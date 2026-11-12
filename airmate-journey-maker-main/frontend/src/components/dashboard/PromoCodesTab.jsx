import { useState, useEffect } from "react";
import {
  Tag,
  Copy,
  Check,
  Calculator,
  Percent,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { fetchPromoCodes, validatePromoCodeApi } from "@/services/api";
import { currency } from "@/data/flights";
import { toast } from "sonner";

export default function PromoCodesTab() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState("");

  // Interactive Calculator State
  const [calcFare, setCalcFare] = useState(5000);
  const [calcCode, setCalcCode] = useState("AIRMATE10");
  const [calcClass, setCalcClass] = useState("Economy");
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => {
    fetchPromoCodes()
      .then((data) => {
        setPromos(data.promos || []);
      })
      .catch((err) => {
        console.warn("Could not load promo codes:", err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Promo code "${code}" copied to clipboard`);
    setTimeout(() => setCopiedCode(""), 2500);
  };

  const handleCalculate = async (e) => {
    e?.preventDefault();
    if (!calcCode) return;
    setCalcLoading(true);
    try {
      const res = await validatePromoCodeApi(calcCode, calcFare, calcClass);
      setCalcResult(res);
    } catch (err) {
      toast.error(err.message || "Invalid promo code calculation");
      setCalcResult(null);
    } finally {
      setCalcLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h3 className="font-display text-base font-bold text-foreground">
          AirMate Deals & Promo Privileges
        </h3>
        <p className="text-xs text-muted-foreground">
          Exclusive vouchers and discounts applicable across Indian air travel routes.
        </p>
      </div>

      {/* Promos Cards Grid */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {promos.map((p) => {
            const isCopied = copiedCode === p.code;

            return (
              <div
                key={p.code}
                className="soft-card relative overflow-hidden p-5 transition-all hover:border-primary/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-primary">
                      {p.tag || "Offer"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">Valid until {p.validUntil}</span>
                  </div>

                  <h4 className="mt-3 font-display text-base font-bold text-foreground">
                    {p.title}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>

                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span>Min Fare: {currency(p.minFare)}</span>
                    <span>•</span>
                    <span>Max Savings: {currency(p.maxDiscount)}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                  <div className="rounded-xl border border-dashed border-primary/50 bg-primary/5 px-3 py-1 font-mono text-sm font-black tracking-wider text-primary">
                    {p.code}
                  </div>

                  <button
                    onClick={() => handleCopy(p.code)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-1.5 text-xs font-semibold hover:bg-secondary transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="size-3.5 text-emerald-500" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" /> Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Savings Calculator */}
      <div className="soft-card p-6 bg-gradient-to-br from-card to-secondary/30">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="size-5 text-primary" />
          <div>
            <h4 className="font-display text-base font-bold text-foreground">
              Promo Discount Estimator
            </h4>
            <p className="text-xs text-muted-foreground">
              Test how much you will save on your intended flight fare before checkout.
            </p>
          </div>
        </div>

        <form onSubmit={handleCalculate} className="grid gap-3 sm:grid-cols-4 text-xs">
          <div>
            <label className="font-semibold text-foreground block mb-1">Base Ticket Fare (₹)</label>
            <input
              type="number"
              min={500}
              step={100}
              value={calcFare}
              onChange={(e) => setCalcFare(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Select Promo Code</label>
            <select
              value={calcCode}
              onChange={(e) => setCalcCode(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
            >
              {promos.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} ({p.title})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Cabin Class</label>
            <select
              value={calcClass}
              onChange={(e) => setCalcClass(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
            >
              <option value="Economy">Economy</option>
              <option value="Premium Economy">Premium Economy</option>
              <option value="Business">Business Class</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={calcLoading}
              className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:opacity-95 disabled:opacity-50"
            >
              {calcLoading ? "Calculating..." : "Calculate Savings"}
            </button>
          </div>
        </form>

        {calcResult && (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                  {calcResult.message}
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                  Applied promo code: <strong>{calcResult.code}</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-muted-foreground block">Net Payable Fare:</span>
                <span className="font-display text-xl font-black text-foreground">
                  {currency(calcResult.finalFare)}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-2">
                  (Saved {currency(calcResult.discount)})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
