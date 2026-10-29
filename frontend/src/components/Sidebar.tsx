import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  CircleHelp,
  LayoutDashboard,
  Settings,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ViewKey } from "../types";

interface SidebarProps {
  activeView: ViewKey;
  isMobileOpen: boolean;
  onNavigate: (view: ViewKey) => void;
  onClose: () => void;
}

const mainNavigation: { label: ViewKey; icon: LucideIcon }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "All Debts", icon: WalletCards },
  { label: "Money Owed to Me", icon: ArrowDownLeft },
  { label: "Money I Owe", icon: ArrowUpRight },
  { label: "Repayments", icon: ArrowLeftRight },
  { label: "Reminders", icon: Bell },
];

export function Sidebar({
  activeView,
  isMobileOpen,
  onNavigate,
  onClose,
}: SidebarProps) {
  return (
    <>
      {isMobileOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${isMobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark">
            <WalletCards size={21} strokeWidth={2.2} />
          </div>
          <span>owemate</span>
          <button
            className="icon-button close-sidebar"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">A</div>
          <div className="workspace-copy">
            <strong>Akoka Stores</strong>
            <span>Personal workspace</span>
          </div>
          <span className="switcher-caret">⌄</span>
        </div>
        <p className="nav-caption">MENU</p>
        <nav className="main-navigation" aria-label="Main navigation">
          {mainNavigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeView === label ? "active" : ""}`}
              onClick={() => onNavigate(label)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Reminders" && <span className="nav-count">2</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${activeView === "Settings" ? "active" : ""}`}
            onClick={() => onNavigate("Settings")}
          >
            <Settings size={18} strokeWidth={1.8} />
            <span>Settings</span>
          </button>
          <div className="help-card">
            <div>
              <CircleHelp size={17} />
              <strong>Need a hand?</strong>
            </div>
            <p>Visit our help center for tips.</p>
            <button onClick={() => onNavigate("Settings")}>
              Get support <span>↗</span>
            </button>
          </div>
          <div className="profile-row">
            <div className="profile-avatar">AO</div>
            <div className="profile-copy">
              <strong>Ada Okafor</strong>
              <span>ada@akokastores.ng</span>
            </div>
            <button className="profile-menu" aria-label="Account options">
              ···
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
