import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  User,
  Shield,
  Utensils,
  Plane,
  Loader2,
  Check,
} from "lucide-react";
import {
  fetchSavedPassengers,
  addSavedPassenger,
  updateSavedPassenger,
  deleteSavedPassenger,
} from "@/services/api";
import { toast } from "sonner";

const blankPassenger = {
  firstName: "",
  lastName: "",
  type: "adult",
  gender: "male",
  dateOfBirth: "",
  nationality: "Indian",
  passportNumber: "",
  passportExpiry: "",
  frequentFlyerNumber: "",
  preferredSeat: "any",
  preferredMeal: "standard",
};

export default function SavedPassengersTab() {
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankPassenger);
  const [submitting, setSubmitting] = useState(false);

  const loadPassengers = async () => {
    try {
      setLoading(true);
      const data = await fetchSavedPassengers();
      setPassengers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Failed to load passengers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPassengers();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(blankPassenger);
    setModalOpen(true);
  };

  const handleOpenEdit = (pax) => {
    setEditingId(pax.id);
    setForm({
      firstName: pax.firstName || "",
      lastName: pax.lastName || "",
      type: pax.type || "adult",
      gender: pax.gender || "male",
      dateOfBirth: pax.dateOfBirth || "",
      nationality: pax.nationality || "Indian",
      passportNumber: pax.passportNumber || "",
      passportExpiry: pax.passportExpiry || "",
      frequentFlyerNumber: pax.frequentFlyerNumber || "",
      preferredSeat: pax.preferredSeat || "any",
      preferredMeal: pax.preferredMeal || "standard",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateSavedPassenger(editingId, form);
        toast.success("Passenger profile updated");
      } else {
        await addSavedPassenger(form);
        toast.success("Passenger added to your travel directory");
      }
      setModalOpen(false);
      loadPassengers();
    } catch (err) {
      toast.error(err.message || "Failed to save passenger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name} from saved travellers?`)) return;
    try {
      await deleteSavedPassenger(id);
      toast.success("Passenger removed");
      setPassengers((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error(err.message || "Failed to delete passenger");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">
            Saved Passengers & Co-Travellers
          </h3>
          <p className="text-xs text-muted-foreground">
            Store personal information to auto-fill bookings and check-ins instantly.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-95"
        >
          <Plus className="size-4" /> Add Traveller
        </button>
      </div>

      {/* Passengers Grid */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : passengers.length === 0 ? (
        <div className="soft-card p-12 text-center">
          <Users className="mx-auto size-10 text-muted-foreground/40" />
          <h4 className="mt-3 font-display text-base font-bold text-foreground">
            No saved travellers yet
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Add your family members or frequent flying companions for rapid 1-click booking.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            <Plus className="size-3.5" /> Add First Traveller
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {passengers.map((pax) => (
            <div
              key={pax.id}
              className="soft-card p-4 transition-all hover:border-primary/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
                      {pax.firstName[0]}
                      {pax.lastName[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        {pax.firstName} {pax.lastName}
                      </h4>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {pax.type} · {pax.gender}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(pax)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(pax.id, `${pax.firstName} ${pax.lastName}`)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 border-t border-border/70 pt-3 text-xs">
                  {pax.dateOfBirth && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Date of Birth:</span>
                      <strong className="text-foreground">{pax.dateOfBirth}</strong>
                    </div>
                  )}

                  <div className="flex justify-between text-muted-foreground">
                    <span>Nationality:</span>
                    <strong className="text-foreground">{pax.nationality}</strong>
                  </div>

                  {pax.passportNumber && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Passport:</span>
                      <strong className="font-mono text-foreground">{pax.passportNumber}</strong>
                    </div>
                  )}

                  <div className="flex justify-between text-muted-foreground">
                    <span>Seat Preference:</span>
                    <strong className="capitalize text-foreground">{pax.preferredSeat}</strong>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Meal:</span>
                    <strong className="capitalize text-foreground">{pax.preferredMeal}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-border/50 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="size-3" /> Ready for autofill at checkout
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Passenger Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="soft-card w-full max-w-lg p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="font-display text-base font-bold text-foreground">
                  {editingId ? "Edit Saved Traveller" : "Add New Traveller"}
                </h4>
                <p className="text-xs text-muted-foreground">Maintain government ID & flight preferences</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="e.g. Rahul"
                    className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="e.g. Sharma"
                    className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
                  >
                    <option value="adult">Adult (12+)</option>
                    <option value="child">Child (2-11)</option>
                    <option value="infant">Infant (&lt;2)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2 outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Nationality</label>
                  <input
                    type="text"
                    value={form.nationality}
                    onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                    placeholder="Indian"
                    className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Frequent Flyer Number
                  </label>
                  <input
                    type="text"
                    value={form.frequentFlyerNumber}
                    onChange={(e) => setForm({ ...form, frequentFlyerNumber: e.target.value })}
                    placeholder="e.g. AI-982142"
                    className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Passport Number (Optional)</label>
                  <input
                    type="text"
                    value={form.passportNumber}
                    onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
                    placeholder="Z1234567"
                    className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Passport Expiry</label>
                  <input
                    type="date"
                    value={form.passportExpiry}
                    onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2 outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Seat Preference</label>
                  <select
                    value={form.preferredSeat}
                    onChange={(e) => setForm({ ...form, preferredSeat: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
                  >
                    <option value="any">No Preference</option>
                    <option value="window">Window Seat</option>
                    <option value="aisle">Aisle Seat</option>
                    <option value="middle">Middle Seat</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Meal Preference</label>
                  <select
                    value={form.preferredMeal}
                    onChange={(e) => setForm({ ...form, preferredMeal: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
                  >
                    <option value="standard">Standard Meal</option>
                    <option value="veg">Vegetarian Meal (VGML)</option>
                    <option value="non-veg">Non-Vegetarian</option>
                    <option value="jain">Jain Vegetarian (VJML)</option>
                    <option value="vegan">Strict Vegan</option>
                    <option value="diabetic">Diabetic Meal</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground hover:opacity-95 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingId ? "Save Changes" : "Save Traveller"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
