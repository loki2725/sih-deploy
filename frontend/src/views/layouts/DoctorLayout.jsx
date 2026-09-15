import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  Settings,
  Brain,
  LogOut,
  CalendarClock,
  Menu,
  X,
} from "lucide-react";
import { T } from "@/models/constant.js";

export function DoctorLayout({ active, setActive, children, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const nav = [
    { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { key: "patients", icon: Users, label: "My Patients" },
    { key: "appointments", icon: CalendarClock, label: "Appointments" },
    { key: "records", icon: HeartPulse, label: "Health Records" },
    { key: "settings", icon: Settings, label: "Settings" },
  ];

  const handleNavClick = (key) => {
    setActive(key);
    setDrawerOpen(false); // close the drawer after picking a page on mobile
  };

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: T.canvas }}
    >
      {/* Mobile-only top bar with hamburger toggle */}
      <header
        className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
        style={{ background: T.ink }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-1 cursor-pointer"
        >
          <Menu size={22} color="#fff" />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: T.primary }}
          >
            <Brain size={14} color="#fff" />
          </div>
          <span className="text-white font-semibold text-sm">NeuroNest</span>
        </div>
        {/* spacer so the brand stays visually centered against the menu icon */}
        <div className="w-6" />
      </header>

      {/* Desktop/tablet sidebar - always visible from md up */}
      <aside
        className="hidden md:flex w-60 flex-col p-5"
        style={{ background: T.ink }}
      >
        <div className="flex items-center gap-2 mb-8 px-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: T.primary }}
          >
            <Brain size={16} color="#fff" />
          </div>
          <span className="text-white font-semibold text-sm">NeuroNest</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {nav.map((n) => {
            const Icon = n.icon;
            const isActive = active === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setActive(n.key)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left cursor-pointer"
                style={{
                  background: isActive
                    ? "rgba(255,255,255,0.08)"
                    : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                }}
              >
                <Icon size={16} /> {n.label}
              </button>
            );
          })}
        </nav>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <LogOut size={16} /> Logout
        </button>
      </aside>

      {/* Mobile slide-in drawer - only rendered while open, with a
          backdrop that closes it on tap */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="w-64 flex flex-col p-5 h-full overflow-auto"
            style={{ background: T.ink }}
          >
            <div className="flex items-center justify-between mb-8 px-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: T.primary }}
                >
                  <Brain size={16} color="#fff" />
                </div>
                <span className="text-white font-semibold text-sm">
                  NeuroNest
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 cursor-pointer"
              >
                <X size={18} color="#fff" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 flex-1">
              {nav.map((n) => {
                const Icon = n.icon;
                const isActive = active === n.key;
                return (
                  <button
                    key={n.key}
                    onClick={() => handleNavClick(n.key)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left cursor-pointer"
                    style={{
                      background: isActive
                        ? "rgba(255,255,255,0.08)"
                        : "transparent",
                      color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                    }}
                  >
                    <Icon size={16} /> {n.label}
                  </button>
                );
              })}
            </nav>

            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>

          {/* Backdrop - tapping it closes the drawer */}
          <div
            className="flex-1 cursor-pointer"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setDrawerOpen(false)}
          />
        </div>
      )}

      <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
    </div>
  );
}
