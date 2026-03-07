import { ShieldCheck } from "lucide-react";

export default function Disclaimer() {
  return (
    <div style={{
      background: "rgba(61,43,31,0.04)",
      border: "1px solid rgba(61,43,31,0.12)",
      borderRadius: 12,
      padding: "1rem 1.25rem",
      display: "flex",
      gap: "0.75rem",
      alignItems: "flex-start",
      marginTop: "1.5rem"
    }}>
      <ShieldCheck size={16} color="#A0522D" style={{ flexShrink: 0, marginTop: 2 }} />
      <p style={{
        fontFamily: "Inter, sans-serif",
        fontSize: "0.73rem",
        color: "#7A6558",
        lineHeight: 1.65,
        margin: 0
      }}>
        <strong style={{ color: "#A0522D" }}>Avertissement légal :</strong> Ce protocole est fourni à titre informatif uniquement. 
        Il ne constitue pas un avis médical et ne remplace pas la consultation d'un médecin ou d'un professionnel de santé qualifié. 
        Les huiles essentielles sont des substances actives — consultez toujours un professionnel de santé avant usage, 
        particulièrement en cas de grossesse, d'allaitement, chez l'enfant ou en cas de pathologies chroniques.
      </p>
    </div>
  );
}