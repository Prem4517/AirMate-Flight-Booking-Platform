import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  Loader2,
} from "lucide-react";
import { fetchUserProfile, updateUserProfile, changeUserPassword } from "@/services/api";
import { toast } from "sonner";

export default function ProfileTab({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Profile Form Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [nationality, setNationality] = useState("Indian");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [frequentFlyerNumber, setFrequentFlyerNumber] = useState("");

  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });

  const [emergencyContact, setEmergencyContact] = useState({
    name: "",
    phone: "",
    relationship: "",
  });

  // Security Form Fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetchUserProfile()
      .then((data) => {
        setProfile(data);
        setName(data.name || "");
        setPhone(data.phone || "");
        setDateOfBirth(data.dateOfBirth || "");
        setGender(data.gender || "");
        setNationality(data.nationality || "Indian");
        setPassportNumber(data.passportNumber || "");
        setPassportExpiry(data.passportExpiry || "");
        setFrequentFlyerNumber(data.frequentFlyerNumber || "");
        if (data.address) setAddress({ ...data.address });
        if (data.emergencyContact) setEmergencyContact({ ...data.emergencyContact });
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load profile");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await updateUserProfile({
        name,
        phone,
        dateOfBirth,
        gender,
        nationality,
        passportNumber,
        passportExpiry,
        frequentFlyerNumber,
        address,
        emergencyContact,
      });
      setProfile(updated);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.message || "Failed to save profile changes");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await changeUserPassword({ currentPassword, newPassword });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message || "Password update failed");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Account Identity Header */}
      <div className="soft-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-xl shadow-xs">
            {profile?.name ? profile.name.slice(0, 2).toUpperCase() : "CU"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold text-foreground">
                {profile?.name || "Customer Account"}
              </h3>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                {profile?.accountStatus || "Active"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Mail className="size-3" /> {profile?.email} · Role: Customer
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-muted-foreground">
          <span>Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "2026"}</span>
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSaveProfile} className="soft-card p-6 space-y-6">
        <div>
          <h4 className="font-display text-base font-bold text-foreground">
            Personal & Travel Profile
          </h4>
          <p className="text-xs text-muted-foreground">
            Information used for air booking validation, security compliance, and contact notifications.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div>
            <label className="font-semibold text-foreground block mb-1">Full Legal Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Registered Email</label>
            <input
              type="email"
              disabled
              value={profile?.email || ""}
              className="w-full rounded-xl border border-input bg-secondary/50 p-2.5 text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Phone Number</label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-2 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Nationality</label>
            <input
              type="text"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Identity & Frequent Flyer */}
        <div className="border-t border-border pt-4">
          <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Government ID & Frequent Flyer Program
          </h5>

          <div className="grid gap-4 sm:grid-cols-3 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Passport Number</label>
              <input
                type="text"
                placeholder="A1234567"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Passport Expiry</label>
              <input
                type="date"
                value={passportExpiry}
                onChange={(e) => setPassportExpiry(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Frequent Flyer #</label>
              <input
                type="text"
                placeholder="AM-992144"
                value={frequentFlyerNumber}
                onChange={(e) => setFrequentFlyerNumber(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="border-t border-border pt-4">
          <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Residential Address
          </h5>

          <div className="grid gap-4 sm:grid-cols-4 text-xs">
            <div className="sm:col-span-2">
              <label className="font-semibold text-foreground block mb-1">Street Address</label>
              <input
                type="text"
                value={address.street || ""}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                placeholder="104 Skyline Residency, MG Road"
                className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">City</label>
              <input
                type="text"
                value={address.city || ""}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                placeholder="Bengaluru"
                className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Pincode</label>
              <input
                type="text"
                value={address.pincode || ""}
                onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                placeholder="560001"
                className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="border-t border-border pt-4">
          <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Emergency Contact Information
          </h5>

          <div className="grid gap-4 sm:grid-cols-3 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Contact Name</label>
              <input
                type="text"
                value={emergencyContact.name || ""}
                onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                placeholder="e.g. Priya Sharma"
                className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Contact Phone</label>
              <input
                type="tel"
                value={emergencyContact.phone || ""}
                onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
                placeholder="+91 98450 11223"
                className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Relationship</label>
              <input
                type="text"
                value={emergencyContact.relationship || ""}
                onChange={(e) =>
                  setEmergencyContact({ ...emergencyContact, relationship: e.target.value })
                }
                placeholder="Spouse / Parent / Sibling"
                className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-95 disabled:opacity-50"
          >
            {savingProfile ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="size-4" /> Save Profile Details
              </>
            )}
          </button>
        </div>
      </form>

      {/* Security: Change Password */}
      <form onSubmit={handleChangePassword} className="soft-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <div>
            <h4 className="font-display text-base font-bold text-foreground">
              Account Security & Password
            </h4>
            <p className="text-xs text-muted-foreground">
              Ensure your account uses a secure password of at least 8 characters.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 text-xs pt-2">
          <div>
            <label className="font-semibold text-foreground block mb-1">Current Password *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">New Password (8+ chars) *</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Confirm New Password *</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingPassword}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-xs font-bold hover:bg-secondary disabled:opacity-50"
          >
            {savingPassword ? "Updating Password..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
