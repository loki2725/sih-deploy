import { T, R } from "@/models/constant.js";

export function Card({ children, className = "", style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`p-5 ${className}`}
      style={{
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: R.card,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  const styles = {
    primary: { background: T.primary, color: "#fff", border: "none" },
    ghost: {
      background: "transparent",
      color: T.primary,
      border: `1px solid ${T.line}`,
    },
    soft: { background: T.primarySoft, color: T.primaryDark, border: "none" },
    danger: { background: T.redSoft, color: T.red, border: "none" },
  };
  return (
    <button
      className={`px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 ${className}`}
      style={{ borderRadius: R.control, ...styles[variant] }}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, ...props }) {
  return (
    <label className="block mb-4">
      <span
        className="block text-xs font-medium mb-1.5"
        style={{ color: T.inkSoft }}
      >
        {label}
      </span>
      <input
        className="w-full px-3.5 py-2.5 text-sm outline-none"
        style={{
          border: `1px solid ${T.line}`,
          borderRadius: R.control,
          color: T.ink,
        }}
        {...props}
      />
    </label>
  );
}

export function Select({ label, options, ...props }) {
  return (
    <label className="block mb-4">
      <span
        className="block text-xs font-medium mb-1.5"
        style={{ color: T.inkSoft }}
      >
        {label}
      </span>
      <select
        className="w-full px-3.5 py-2.5 text-sm outline-none bg-white"
        style={{
          border: `1px solid ${T.line}`,
          borderRadius: R.control,
          color: T.ink,
        }}
        {...props}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function YesNo({ label, value, onChange }) {
  return (
    <div className="mb-4">
      <span
        className="block text-xs font-medium mb-1.5"
        style={{ color: T.inkSoft }}
      >
        {label}
      </span>
      <div className="flex gap-2">
        {["Yes", "No"].map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className="flex-1 py-2.5 text-sm font-medium rounded-lg"
            style={{
              background: value === opt ? T.primary : T.canvas,
              color: value === opt ? "#fff" : T.inkSoft,
              border: `1px solid ${value === opt ? T.primary : T.line}`,
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Badge({ children, tone = "mint" }) {
  const map = {
    mint: { bg: T.mintSoft, fg: T.mint },
    amber: { bg: T.amberSoft, fg: T.amber },
    red: { bg: T.redSoft, fg: T.red },
    primary: { bg: T.primarySoft, fg: T.primary },
  };
  const c = map[tone];
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-full inline-block"
      style={{ background: c.bg, color: c.fg }}
    >
      {children}
    </span>
  );
}

export function ProgressDots({ step, total }) {
  return (
    <div className="flex gap-1.5 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-full"
          style={{ background: i < step ? T.primary : T.line }}
        />
      ))}
    </div>
  );
}
