import { useEffect, useState } from "react";
import { getSettings, updateSettings, sendConfirmationEmail } from "../api/authApi";
import type { SettingsDto } from "../types/auth";
import { useAuth } from "../context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingConfirm, setSendingConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const s = await getSettings();
      setSettings(s);
      setEmail(s.email);
      setNotifications(s.notificationsEnabled);
    } catch {
      setMessage({ type: "danger", text: "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateSettings({
        email: email !== settings?.email ? email : undefined,
        notificationsEnabled: notifications,
      });
      setSettings(updated);
      setMessage({ type: "success", text: email !== settings?.email
        ? "Settings saved. Please confirm your new email address."
        : "Settings saved." });
    } catch (err) {
      setMessage({ type: "danger", text: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSendConfirmation() {
    setSendingConfirm(true);
    setMessage(null);
    try {
      await sendConfirmationEmail();
      setMessage({ type: "success", text: "Confirmation email sent! Check your inbox." });
    } catch (err) {
      setMessage({ type: "danger", text: err instanceof Error ? err.message : "Failed to send" });
    } finally {
      setSendingConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <h2 className="mb-4">Settings</h2>

        {message && (
          <div className={`alert alert-${message.type} alert-dismissible`}>
            {message.text}
            <button className="btn-close" onClick={() => setMessage(null)} />
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Email Section */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Email</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="d-flex align-items-center gap-2">
                {settings?.emailConfirmed ? (
                  <span className="badge bg-success">
                    <i className="bi bi-check-circle me-1" />Confirmed
                  </span>
                ) : (
                  <>
                    <span className="badge bg-warning text-dark">Not Confirmed</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={handleSendConfirmation}
                      disabled={sendingConfirm || email !== settings?.email}
                    >
                      {sendingConfirm ? "Sending..." : "Send Confirmation Email"}
                    </button>
                  </>
                )}
              </div>
              {email !== settings?.email && (
                <div className="form-text text-info mt-2">
                  Save to update your email. You'll need to confirm the new address.
                </div>
              )}
            </div>
          </div>

          {/* Notifications Section */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Notifications</h5>
            </div>
            <div className="card-body">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="notificationsEnabled"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="notificationsEnabled">
                  Email notifications for new matches
                </label>
              </div>
              {notifications && !settings?.emailConfirmed && (
                <div className="form-text text-warning mt-2">
                  You need to confirm your email before notifications can be sent.
                </div>
              )}
              <p className="form-text mt-2 mb-0">
                When enabled, you'll receive an email when new tender matches are found for your company.
              </p>
            </div>
          </div>

          {/* Account Info */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Account</h5>
            </div>
            <div className="card-body">
              <p className="mb-1"><strong>Name:</strong> {user?.fullName}</p>
              <p className="mb-0"><strong>Role:</strong> {user?.role}</p>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
