import AlertBanner from "./AlertBanner";
import { Leaf, Droplets, Clock, Calendar, BookOpen, CheckCircle } from "lucide-react";

export default function DiagnosticProtocol({ protocol }) {
  const heIngredients = (protocol.synergy || []).filter(i => i.type !== "HV");
  const hvIngredient = protocol.carrier || null;
  const hasPhotosensitizing = heIngredients.some(i => i.is_photosensitizing);
  const hasDermocaustic = heIngredients.some(i => i.is_dermocaustic);

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{
          width: 52, height: 52,
          background: "linear-gradient(135deg, rgba(135,169,107,0.2), rgba(135,169,107,0.4))",
          borderRadius: "50%", display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 0.75rem"
        }}>
          <CheckCircle size={26} color="#6B8F52" />
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "#3D2B1F", marginBottom: "0.3rem" }}>
          Votre Protocole Personnalisé
        </h2>
        {protocol.application_route && (
          <span className="tag-sage">{protocol.application_route}</span>
        )}
      </div>

      {/* Summary */}
      {protocol.summary && (
        <div className="aroma-card" style={{ padding: "1.4rem", marginBottom: "1.25rem" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.9rem", color: "#5A4A3A", lineHeight: 1.7, margin: 0 }}>
            {protocol.summary}
          </p>
        </div>
      )}

      {/* Safety Alerts */}
      {hasPhotosensitizing && (
        <AlertBanner type="photosensitizing" message="Évitez toute exposition solaire dans les 12h suivant l'application cutanée." />
      )}
      {hasDermocaustic && (
        <AlertBanner type="dermocaustic" message="Dilution obligatoire dans l'huile végétale. Ne jamais appliquer pur sur la peau." />
      )}

      {/* Synergie card */}
      <div className="aroma-card" style={{ padding: "1.75rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <Droplets size={16} color="#A0522D" />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", fontWeight: 700, color: "#A0522D", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Composition de la Synergie — Flacon {hvIngredient?.volume_ml || 30} ml
          </span>
        </div>

        {/* HE list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.25rem" }}>
          {heIngredients.map((ing, i) => (
            <IngredientRow key={i} ingredient={ing} isHE />
          ))}
        </div>

        {/* Divider */}
        <div className="botanical-divider" style={{ margin: "1rem 0" }} />

        {/* Carrier Oil */}
        {hvIngredient && (
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", fontWeight: 600, color: "#87A96B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
              Huile Végétale Porteuse
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.75rem 1rem",
              background: "rgba(135,169,107,0.06)",
              borderRadius: 10, border: "1px solid rgba(135,169,107,0.15)"
            }}>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#3D2B1F" }}>
                  {hvIngredient.name}
                </div>
                {hvIngredient.rationale && (
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "#7A6558", marginTop: "0.2rem" }}>
                    {hvIngredient.rationale}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: "#6B8F52" }}>
                  {hvIngredient.volume_ml || 30} ml
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "#9AA889" }}>QSP flacon</div>
              </div>
            </div>
          </div>
        )}

        {/* Totals */}
        {(protocol.total_drops_he || protocol.total_percentage) && (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem", marginTop: "1.25rem"
          }}>
            {protocol.total_drops_he && (
              <Stat label="Total Gouttes HE" value={`${protocol.total_drops_he} gttes`} color="#A0522D" />
            )}
            {protocol.total_percentage && (
              <Stat label="Dilution Totale" value={`${protocol.total_percentage}%`} color="#87A96B" />
            )}
          </div>
        )}
      </div>

      {/* Protocol Instructions */}
      {protocol.protocol_instructions && (
        <div className="aroma-card" style={{ padding: "1.4rem", marginBottom: "1.25rem" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", fontWeight: 700, color: "#6B8F52", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>
            📋 Mode d'emploi
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "#3D2B1F", lineHeight: 1.7, margin: 0 }}>
            {protocol.protocol_instructions}
          </p>
          <div style={{ display: "flex", gap: "0.65rem", marginTop: "0.9rem", flexWrap: "wrap" }}>
            {protocol.frequency && (
              <PillBadge icon={<Clock size={12} />} label={protocol.frequency} color="#6B8F52" bg="rgba(135,169,107,0.1)" />
            )}
            {protocol.duration && (
              <PillBadge icon={<Calendar size={12} />} label={protocol.duration} color="#A0522D" bg="rgba(160,82,45,0.08)" />
            )}
          </div>
        </div>
      )}

      {/* General Advice */}
      {protocol.general_advice && (
        <div className="aroma-card" style={{ padding: "1.4rem", marginBottom: "1.25rem" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", fontWeight: 700, color: "#87A96B", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>
            💡 Conseils Complémentaires
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.87rem", color: "#5A4A3A", lineHeight: 1.7, margin: 0 }}>
            {protocol.general_advice}
          </p>
        </div>
      )}

      {/* Warnings */}
      {protocol.warnings && protocol.warnings.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          {protocol.warnings.map((w, i) => (
            <div key={i} style={{
              display: "flex", gap: "0.5rem", alignItems: "flex-start",
              padding: "0.5rem 0.75rem",
              background: "rgba(230,126,34,0.07)", borderRadius: 8,
              border: "1px solid rgba(230,126,34,0.18)", marginBottom: "0.4rem"
            }}>
              <span style={{ color: "#E67E22", fontSize: "0.85rem", flexShrink: 0 }}>⚠</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#7A6558", lineHeight: 1.55 }}>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* When to see doctor */}
      {protocol.when_to_see_doctor && (
        <div style={{
          background: "linear-gradient(135deg, rgba(160,82,45,0.08), rgba(160,82,45,0.03))",
          border: "1px solid rgba(160,82,45,0.2)", borderRadius: 14,
          padding: "1.2rem 1.4rem", marginBottom: "1.25rem"
        }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", fontWeight: 700, color: "#A0522D", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.45rem" }}>
            🩺 Quand Consulter un Médecin
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.87rem", color: "#7A4020", lineHeight: 1.65, margin: 0 }}>
            {protocol.when_to_see_doctor}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function IngredientRow({ ingredient }) {
  return (
    <div style={{
      padding: "0.9rem 1rem",
      background: "rgba(254,254,254,0.9)",
      borderRadius: 12,
      border: "1px solid rgba(135,169,107,0.18)",
      boxShadow: "0 1px 6px rgba(61,43,31,0.04)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
            <Leaf size={13} color="#87A96B" />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.92rem", fontWeight: 600, color: "#3D2B1F" }}>
              {ingredient.name}
            </span>
            {ingredient.type && (
              <span style={{ background: "rgba(135,169,107,0.12)", border: "1px solid rgba(135,169,107,0.25)", borderRadius: 50, padding: "0.1rem 0.55rem", fontFamily: "Inter, sans-serif", fontSize: "0.65rem", fontWeight: 600, color: "#6B8F52" }}>
                {ingredient.type}
              </span>
            )}
            {ingredient.is_photosensitizing && (
              <span style={{ background: "rgba(243,156,18,0.12)", borderRadius: 50, padding: "0.1rem 0.5rem", fontFamily: "Inter, sans-serif", fontSize: "0.62rem", color: "#856404" }}>
                ☀ Photosensibilisant
              </span>
            )}
            {ingredient.is_dermocaustic && (
              <span style={{ background: "rgba(231,76,60,0.1)", borderRadius: 50, padding: "0.1rem 0.5rem", fontFamily: "Inter, sans-serif", fontSize: "0.62rem", color: "#922B21" }}>
                🔴 Dermocaustique
              </span>
            )}
          </div>
          {ingredient.latin_name && (
            <em style={{ fontFamily: "Inter, sans-serif", fontSize: "0.73rem", color: "#9AA889" }}>
              {ingredient.latin_name}
            </em>
          )}
          {ingredient.role && (
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#7A6558", margin: "0.3rem 0 0", lineHeight: 1.5 }}>
              {ingredient.role}
            </p>
          )}
          {ingredient.source_reference && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.3rem" }}>
              <BookOpen size={10} color="#9AA889" />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.68rem", color: "#9AA889", fontStyle: "italic" }}>
                {ingredient.source_reference}
              </span>
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {ingredient.drops != null && (
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: 700, color: "#A0522D", lineHeight: 1 }}>
              {ingredient.drops}
            </div>
          )}
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.68rem", color: "#9AA889" }}>
            {ingredient.drops != null ? "gouttes" : ""}
          </div>
          {ingredient.percentage != null && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "#87A96B", marginTop: "0.15rem" }}>
              {ingredient.percentage}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      textAlign: "center", padding: "0.85rem",
      background: "rgba(245,245,220,0.6)", borderRadius: 12,
      border: "1px solid rgba(135,169,107,0.12)"
    }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color, marginBottom: "0.2rem" }}>
        {value}
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.68rem", color: "#9AA889", fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

function PillBadge({ icon, label, color, bg }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "0.35rem",
      padding: "0.3rem 0.8rem", borderRadius: 50, background: bg,
      fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color, fontWeight: 500
    }}>
      {icon}{label}
    </div>
  );
}