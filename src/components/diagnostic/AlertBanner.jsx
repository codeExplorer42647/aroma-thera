import { AlertTriangle, Sun, Droplets, Baby } from "lucide-react";

export default function AlertBanner({ type, message }) {
  const configs = {
    photosensitizing: {
      icon: Sun,
      title: "⚠️ Huile Photosensibilisante",
      bg: "linear-gradient(135deg, #FFF3CD, #FFEAA7)",
      border: "#F39C12",
      color: "#856404"
    },
    dermocaustic: {
      icon: Droplets,
      title: "🔴 Huile Dermocaustique",
      bg: "linear-gradient(135deg, #FADBD8, #F5B7B1)",
      border: "#E74C3C",
      color: "#922B21"
    },
    concentration: {
      icon: AlertTriangle,
      title: "⚠️ Concentration Élevée",
      bg: "linear-gradient(135deg, #FDEBD0, #FAD7A0)",
      border: "#E67E22",
      color: "#784212"
    },
    pregnancy: {
      icon: Baby,
      title: "🚫 Déconseillé Grossesse/Allaitement",
      bg: "linear-gradient(135deg, #F9EBF8, #F0C8EE)",
      border: "#8E44AD",
      color: "#6C3483"
    }
  };

  const config = configs[type] || configs.concentration;
  const Icon = config.icon;

  return (
    <div style={{
      background: config.bg,
      borderLeft: `4px solid ${config.border}`,
      borderRadius: 12,
      padding: "0.85rem 1.1rem",
      display: "flex",
      alignItems: "flex-start",
      gap: "0.65rem",
      marginBottom: "0.75rem"
    }}>
      <Icon size={16} color={config.border} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: config.color,
          marginBottom: "0.15rem"
        }}>{config.title}</div>
        {message && (
          <div style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "0.78rem",
            color: config.color,
            opacity: 0.85,
            lineHeight: 1.5
          }}>{message}</div>
        )}
      </div>
    </div>
  );
}