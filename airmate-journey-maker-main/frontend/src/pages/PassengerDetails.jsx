import { useState, useEffect } from "react";
import { useNavigate, Link, useSearch } from "@tanstack/react-router";
import { User, Phone, Mail, Calendar, Globe, ChevronRight, Plane, AlertCircle, Shield } from "lucide-react";
import { store, useStore } from "@/lib/store";
import useRequireCustomer from "@/lib/useRequireCustomer";
import { fetchFlightById } from "@/services/api";
import { bookingRedirectFromDraft } from "@/lib/authRedirect";

const COUNTRIES = [
  "Indian", "American", "British", "Australian", "Canadian", "German",
  "French", "Japanese", "Chinese", "Singaporean", "Emirati", "Other",
];

function defaultPassenger(index, user) {
  if (index === 0 && user) {
    const [first = "", ...rest] = user.name ? user.name.split(" ") : ["", ""];
    const userPhoneDigits = user.phone ? user.phone.replace(/\D/g, "").slice(-10) : "";
    return {
      type: "adult",
      firstName: first,
      lastName: rest.join(" ") || "",
      dateOfBirth: user.dateOfBirth || "",
      gender: user.gender || "male",
      nationality: user.nationality || "Indian",
      passportNumber: user.passportNumber || "",
      email: user.email || "",
      phone: userPhoneDigits,
    };
  }
  return {
    type: "adult",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "male",
    nationality: "Indian",
    passportNumber: "",
    email: "",
    phone: "",
  };
}

export default function PassengerDetails() {
  const { draft, user } = useStore();
  const navigate = useNavigate();
  const search = useSearch({ from: "/passengers" });
  const resumeRedirect = bookingRedirectFromDraft(draft, `/passengers?${new URLSearchParams({
    flightId: search.flightId || "",
    date: search.date || "",
    passengers: String(search.passengers || 1),
    cabinClass: search.cabinClass || "Economy",
  }).toString()}`);
  const isCustomer = useRequireCustomer(resumeRedirect);
  const count = draft ? draft.passengers : search.passengers || 1;

  useEffect(() => {
    if (draft || !search.flightId) return;
    let active = true;
    fetchFlightById(search.flightId)
      .then((flight) => {
        if (!active || !flight) return;
        const customized = {
          ...flight,
          cabinClass: search.cabinClass || flight.cabinClass || "Economy",
        };
        store.startBooking(customized, search.passengers || 1, search.date || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [draft, search.cabinClass, search.date, search.flightId, search.passengers]);

  const [passengers, setPassengers] = useState(() => {
    if (draft && Array.isArray(draft.passengerDetails) && draft.passengerDetails.length === count) {
      return draft.passengerDetails.map((p, idx) => ({
        ...defaultPassenger(idx, user),
        ...p,
        passportNumber: p.passportNumber || p.passport || "",
        phone: p.phone ? p.phone.replace(/\D/g, "").slice(-10) : "",
      }));
    }
    return Array.from({ length: count }, (_, i) => defaultPassenger(i, user));
  });
  const [errors, setErrors] = useState({});

  if (!isCustomer) return null;

  if (!draft) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">No flight selected</h1>
        <Link to="/search" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Search flights
        </Link>
      </div>
    );
  }

  function updatePassenger(index, field, value) {
    setPassengers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    // Clear error on change
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`${index}_${field}`];
      return next;
    });
  }

  function handlePhoneChange(index, rawValue) {
    let digits = rawValue.replace(/\D/g, "");
    // If user typed/pasted country code 91... (12 digits) or leading 0 (11 digits)
    if (digits.length === 12 && digits.startsWith("91")) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    digits = digits.slice(0, 10);
    updatePassenger(index, "phone", digits);
  }

  function validate() {
    const newErrors = {};
    passengers.forEach((p, i) => {
      // First Name
      if (!p.firstName || !p.firstName.trim()) {
        newErrors[`${i}_firstName`] = "First name is required";
      }

      // Last Name
      if (!p.lastName || !p.lastName.trim()) {
        newErrors[`${i}_lastName`] = "Last name is required";
      }

      // Date of Birth
      if (!p.dateOfBirth || !p.dateOfBirth.trim()) {
        newErrors[`${i}_dateOfBirth`] = "Date of birth is required";
      } else {
        const dob = new Date(p.dateOfBirth);
        if (isNaN(dob.getTime()) || dob > new Date()) {
          newErrors[`${i}_dateOfBirth`] = "Enter a valid past date of birth";
        }
      }

      // Gender
      if (!p.gender || !p.gender.trim()) {
        newErrors[`${i}_gender`] = "Gender is required";
      }

      // Nationality
      if (!p.nationality || !p.nationality.trim()) {
        newErrors[`${i}_nationality`] = "Nationality is required";
      }

      // Passenger Type
      if (!p.type || !p.type.trim()) {
        newErrors[`${i}_type`] = "Passenger type is required";
      }

      // Passport Number
      if (!p.passportNumber || !p.passportNumber.trim()) {
        newErrors[`${i}_passportNumber`] = "Passport / ID number is required";
      } else if (p.passportNumber.trim().length < 4) {
        newErrors[`${i}_passportNumber`] = "Passport number must be at least 4 characters";
      }

      // Contact Details for Lead Passenger
      if (i === 0) {
        const emailVal = (p.email || (user ? user.email : "") || "").trim();
        if (!emailVal) {
          newErrors[`${i}_email`] = "Contact email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
          newErrors[`${i}_email`] = "Enter a valid email address";
        }

        const cleanPhone = (p.phone || "").replace(/\D/g, "");
        if (!cleanPhone) {
          newErrors[`${i}_phone`] = "Contact phone number is required";
        } else if (cleanPhone.length !== 10) {
          newErrors[`${i}_phone`] = "Phone number must be exactly 10 digits";
        }
      }
    });
    return newErrors;
  }

  function handleContinue() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const finalPassengers = passengers.map((p, idx) => {
      if (idx === 0 && !p.email && user?.email) {
        return { ...p, email: user.email };
      }
      return p;
    });
    store.setPassengerDetails(finalPassengers);
    navigate({ to: "/seats" });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Breadcrumb steps */}
      <div className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <span className="text-primary">Passengers</span>
        <ChevronRight className="size-3.5" />
        <span>Seats</span>
        <ChevronRight className="size-3.5" />
        <span>Baggage</span>
        <ChevronRight className="size-3.5" />
        <span>Payment</span>
      </div>

      <h1 className="font-display text-2xl font-bold sm:text-3xl">Passenger Details</h1>

      {/* Flight summary strip */}
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/40 px-4 py-3 text-sm">
        <Plane className="size-4 shrink-0 text-primary -rotate-45" />
        <span className="font-semibold">{draft.flight.fromCode} → {draft.flight.toCode}</span>
        <span className="text-muted-foreground">{draft.flight.airline} {draft.flight.flightNumber}</span>
        <span className="ml-auto font-medium text-primary">{draft.cabinClass}</span>
      </div>

      <div className="mt-6 space-y-6">
        {passengers.map((pax, i) => (
          <div key={i} className="soft-card overflow-hidden">
            {/* Card header */}
            <div className="sky-panel flex items-center gap-2 px-5 py-3">
              <User className="size-4" />
              <span className="font-display text-sm font-bold">
                Passenger {i + 1}{count > 1 ? ` of ${count}` : ""}{i === 0 ? " (Lead)" : ""}
              </span>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {/* First Name */}
              <Field
                label="First Name"
                required
                error={errors[`${i}_firstName`]}
              >
                <input
                  id={`pax-${i}-firstName`}
                  value={pax.firstName}
                  onChange={(e) => updatePassenger(i, "firstName", e.target.value)}
                  placeholder="As on passport / ID"
                  className={fieldCls(errors[`${i}_firstName`])}
                />
              </Field>

              {/* Last Name */}
              <Field
                label="Last Name"
                required
                error={errors[`${i}_lastName`]}
              >
                <input
                  id={`pax-${i}-lastName`}
                  value={pax.lastName}
                  onChange={(e) => updatePassenger(i, "lastName", e.target.value)}
                  placeholder="As on passport / ID"
                  className={fieldCls(errors[`${i}_lastName`])}
                />
              </Field>

              {/* Date of Birth */}
              <Field
                label="Date of Birth"
                required
                icon={<Calendar className="size-3.5" />}
                error={errors[`${i}_dateOfBirth`]}
              >
                <input
                  id={`pax-${i}-dob`}
                  type="date"
                  value={pax.dateOfBirth}
                  onChange={(e) => updatePassenger(i, "dateOfBirth", e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className={fieldCls(errors[`${i}_dateOfBirth`])}
                />
              </Field>

              {/* Gender */}
              <Field
                label="Gender"
                required
                error={errors[`${i}_gender`]}
              >
                <select
                  id={`pax-${i}-gender`}
                  value={pax.gender}
                  onChange={(e) => updatePassenger(i, "gender", e.target.value)}
                  className={fieldCls(errors[`${i}_gender`])}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Prefer not to say</option>
                </select>
              </Field>

              {/* Nationality */}
              <Field
                label="Nationality"
                required
                icon={<Globe className="size-3.5" />}
                error={errors[`${i}_nationality`]}
              >
                <select
                  id={`pax-${i}-nationality`}
                  value={pax.nationality}
                  onChange={(e) => updatePassenger(i, "nationality", e.target.value)}
                  className={fieldCls(errors[`${i}_nationality`])}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>

              {/* Passenger type */}
              <Field
                label="Passenger Type"
                required
                error={errors[`${i}_type`]}
              >
                <select
                  id={`pax-${i}-type`}
                  value={pax.type}
                  onChange={(e) => updatePassenger(i, "type", e.target.value)}
                  className={fieldCls(errors[`${i}_type`])}
                >
                  <option value="adult">Adult (12+ yrs)</option>
                  <option value="child">Child (2–11 yrs)</option>
                  <option value="infant">Infant (under 2)</option>
                </select>
              </Field>

              {/* Passport Number */}
              <Field
                label="Passport Number"
                required
                icon={<Shield className="size-3.5" />}
                error={errors[`${i}_passportNumber`]}
                className="sm:col-span-2"
              >
                <input
                  id={`pax-${i}-passportNumber`}
                  type="text"
                  value={pax.passportNumber || ""}
                  onChange={(e) => updatePassenger(i, "passportNumber", e.target.value.toUpperCase())}
                  placeholder="e.g. Z1234567 or National Govt ID"
                  className={fieldCls(errors[`${i}_passportNumber`])}
                />
              </Field>

              {/* Contact fields — only for lead passenger */}
              {i === 0 && (
                <>
                  <Field
                    label="Contact Email"
                    required
                    icon={<Mail className="size-3.5" />}
                    error={errors[`${i}_email`]}
                    className="sm:col-span-2"
                  >
                    <input
                      id={`pax-${i}-email`}
                      type="email"
                      value={pax.email || (user ? user.email : "")}
                      onChange={(e) => updatePassenger(i, "email", e.target.value)}
                      placeholder="Booking confirmation will be sent here"
                      className={fieldCls(errors[`${i}_email`])}
                      readOnly={!!user}
                    />
                  </Field>

                  <Field
                    label="Contact Phone"
                    required
                    icon={<Phone className="size-3.5" />}
                    error={errors[`${i}_phone`]}
                    className="sm:col-span-2"
                  >
                    <div className="flex">
                      <span className="inline-flex items-center rounded-l-xl border border-r-0 border-input bg-muted/60 px-3.5 py-2.5 text-sm font-semibold text-muted-foreground select-none">
                        +91
                      </span>
                      <input
                        id={`pax-${i}-phone`}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        value={pax.phone}
                        onChange={(e) => handlePhoneChange(i, e.target.value)}
                        placeholder="98450 11223"
                        className={`w-full rounded-r-xl border px-3 py-2.5 text-sm outline-none transition-colors bg-background ${
                          errors[`${i}_phone`]
                            ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                            : "border-input focus:border-primary focus:ring-2 focus:ring-ring/30"
                        }`}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Must be exactly 10 digits</span>
                      <span className={pax.phone && pax.phone.length === 10 ? "font-medium text-emerald-600 dark:text-emerald-400" : ""}>
                        {pax.phone ? pax.phone.length : 0}/10
                      </span>
                    </div>
                  </Field>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          Please fill in all required fields marked with *.
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleContinue}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:opacity-90 active:scale-[0.98]"
        >
          Continue to Seat Selection <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function fieldCls(error) {
  return (
    "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors bg-background " +
    (error
      ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
      : "border-input focus:border-primary focus:ring-2 focus:ring-ring/30")
  );
}

function Field({ label, icon, required = false, error, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
        {required && <span className="text-destructive font-bold text-sm leading-none">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
