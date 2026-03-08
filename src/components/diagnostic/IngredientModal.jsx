import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  X, Leaf, AlertTriangle, ShieldCheck, BookOpen, Plus, Check, Loader2,
  Droplets, Sun, FlaskConical, Library
} from "lucide-react";

// Module-level cache to avoid regenerating sheets across multiple clicks
const sheetCache = new Map();

export default function IngredientModal({ ingredient, onClose }) {
  const [sheet, setSheet] = useState(null);
  const [loadingSheet, setLoadingSheet] = useState(true);
  const [addingToLibrary, setAddingToLibrary] = useState(false);
  const [addedToLibrary, setAddedToLibrary] = useState(false);
  const [isFromLibrary, setIsFromLibrary] = useState(false);

  useEffect(() => {
    loadSheet();
  }, [ingredient.name]);

  async function loadSheet() {
    setLoadingSheet(true);
    const nameKey = ingredient.name?.toLowerCase().trim();

    // 1. Check module-level cache first
    if (sheetCache.has(nameKey)) {
      const cached = sheetCache.get(nameKey);
      setSheet(cached.sheet);
      setIsFromLibrary(cached.fromLibrary);
      setAddedToLibrary(cached.fromLibrary);
      setLoadingSheet(false);
      return;
    }

    // 2. Check if already in the Plant library
    const plants = await base44.entities.Plant.list("-created_date", 200);
    const found = plants.find(p =>
      p.common_name?.toLowerCase().trim() === nameKey
    );

    if (found) {
      const librarySheet = {
        description: found.description || "",
        properties: Array.isArray(found.properties) ? found.properties : [],
        contraindications: Array.isArray(found.contraindications) ? found.contraindications : [],
        safe_use_tips: [],
        recommended_routes: Array.isArray(found.usage_routes) ? found.usage_routes.join(", ") : "",
        max_dilution: found.max_dilution_cutaneous ? `${found.max_dilution_cutaneous}%` : null,
        drug_interactions: found.protocol_notes || null,
      };
      sheetCache.set(nameKey, { sheet: librarySheet, fromLibrary: true });
      setSheet(librarySheet);
      setIsFromLibrary(true);
      setAddedToLibrary(true);
      setLoadingSheet(false);
      return;
    }

    // 3. Generate via LLM
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un expert en aromathérapie clinique. Génère une fiche détaillée pour l'ingrédient suivant :

Nom commun : ${ingredient.name}
Nom latin : ${ingredient.latin_name || "inconnu"}
Type : ${ingredient.type || "HE"}
Rôle thérapeutique dans le protocole : ${ingredient.role || ""}

Fournis une fiche structurée avec :
1. Les propriétés thérapeutiques principales (3-5 points)
2. Les principales contre-indications et précautions (3-5 points)
3. Les conseils d'utilisation sécurisée (3-5 points)
4. La voie d'administration recommandée
5. La dilution maximale recommandée (si HE cutanée)
6. Les interactions connues avec des médicaments courants

Réponds UNIQUEMENT en français.`,
      response_json_schema: {
        type: "object",
        properties: {
          properties: { type: "array", items: { type: "string" } },
          contraindications: { type: "array", items: { type: "string" } },
          safe_use_tips: { type: "array", items: { type: "string" } },
          recommended_routes: { type: "string" },
          max_dilution: { type: "string" },
          drug_interactions: { type: "string" },
          description: { type: "string" }
        }
      }
    });

    // Normalize arrays in case LLM returns unexpected types
    const normalized = {
      ...res,
      properties: Array.isArray(res?.properties) ? res.properties : [],
      contraindications: Array.isArray(res?.contraindications) ? res.contraindications : [],
      safe_use_tips: Array.isArray(res?.safe_use_tips) ? res.safe_use_tips : [],
    };

    sheetCache.set(nameKey, { sheet: normalized, fromLibrary: false });
    setSheet(normalized);
    setIsFromLibrary(false);
    setLoadingSheet(false);
  }

  async function handleAddToLibrary() {
    setAddingToLibrary(true);
    const plantData = {
      common_name: ingredient.name,
      latin_name: ingredient.latin_name || "",
      plant_type: ingredient.type === "HV" ? "huile_vegetale" : "huile_essentielle",
      description: sheet?.description || ingredient.role || "",
      properties: Array.isArray(sheet?.properties) ? sheet.properties : [],
      contraindications: Array.isArray(sheet?.contraindications) ? sheet.contraindications : [],
      is_photosensitizing: ingredient.is_photosensitizing || false,
      is_dermocaustic: ingredient.is_dermocaustic || false,
      protocol_notes: ingredient.source_reference || "",
      max_dilution_cutaneous: sheet?.max_dilution
        ? parseFloat(sheet.max_dilution.replace(/[^0-9.]/g, "")) || null
        : null
    };
    await base44.entities.Plant.create(plantData);
    const nameKey = ingredient.name?.toLowerCase().trim();
    sheetCache.set(nameKey, { sheet, fromLibrary: true });
    setAddingToLibrary(false);
    setAddedToLibrary(true);
    setIsFromLibrary(true);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(61,43,31,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem"
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#FEFEFE", borderRadius: 20, maxWidth: 560, width: "100%",
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(61,43,31,0.25)",
        border: "1px solid rgba(135,169,107,0.2)"
      }}>
        {/* Header */}
        <div style={{
          padding: "1.5rem 1.75rem 1.25rem",
          background: "#FEFEFE",
          borderBottom: "1px solid rgba(135,169,107,0.12)",
          position: "sticky", top: 0, borderRadius: "20px 20px 0 0"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "linear-gradient(135deg, #87A96B, #6B8F52)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  <Leaf size={15} color="white" />
                </div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", color: "#3D2B1F", margin: 0 }}>
                  {ingredient.name}
                </h2>
                <TypeBadge type={ingredient.type} />
                {isFromLibrary && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "0.25rem",
                    background: "rgba(135,169,107,0.12)", border: "1px solid rgba(135,169,107,0.3)",
                    borderRadius: 50, padding: "0.15rem 0.55rem",
                    fontFamily: "Inter, sans-serif", fontSize: "0.63rem", color: "#6B8F52", fontWeight: 600
                  }}>
                    <Library size={9} /> En bibliothèque
                  </span>
                )}
              </div>
              {ingredient.latin_name && (
                <em style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#9AA889", marginLeft: "2.6rem" }}>
                  {ingredient.latin_name}
                </em>
              )}
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.5rem", marginLeft: "2.6rem" }}>
                {ingredient.is_photosensitizing && <SafetyTag icon={<Sun size={10} />} label="Photosensibilisant" color="#856404" bg="rgba(243,156,18,0.12)" />}
                {ingredient.is_dermocaustic && <SafetyTag icon={<AlertTriangle size={10} />} label="Dermocaustique" color="#922B21" bg="rgba(231,76,60,0.1)" />}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: "rgba(135,169,107,0.1)", border: "none", borderRadius: "50%",
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0
            }}>
              <X size={16} color="#6B5744" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem 1.75rem" }}>
          {ingredient.role && (
            <div style={{
              padding: "0.85rem 1rem", background: "rgba(135,169,107,0.06)",
              borderRadius: 10, border: "1px solid rgba(135,169,107,0.15)", marginBottom: "1.25rem"
            }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", fontWeight: 700, color: "#87A96B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
                Rôle dans le protocole
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#5A4A3A", margin: 0, lineHeight: 1.6 }}>
                {ingredient.role}
              </p>
            </div>
          )}

          {loadingSheet ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem", gap: "0.75rem" }}>
              <Loader2 size={28} color="#87A96B" style={{ animation: "spin 1s linear infinite" }} />
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#9AA889", margin: 0 }}>
                Génération de la fiche en cours…
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : sheet ? (
            <>
              {sheet.description && (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "#5A4A3A", lineHeight: 1.7, marginBottom: "1.25rem" }}>
                  {sheet.description}
                </p>
              )}

              {sheet.properties?.length > 0 && (
                <Section icon={<FlaskConical size={14} color="#6B8F52" />} title="Propriétés thérapeutiques" color="#6B8F52">
                  {sheet.properties.map((p, i) => <ListItem key={i} text={p} color="#6B8F52" />)}
                </Section>
              )}

              {sheet.contraindications?.length > 0 && (
                <Section icon={<AlertTriangle size={14} color="#C0392B" />} title="Contre-indications & précautions" color="#C0392B">
                  {sheet.contraindications.map((c, i) => <ListItem key={i} text={c} color="#C0392B" />)}
                </Section>
              )}

              {sheet.safe_use_tips?.length > 0 && (
                <Section icon={<ShieldCheck size={14} color="#A0522D" />} title="Conseils d'utilisation sécurisée" color="#A0522D">
                  {sheet.safe_use_tips.map((t, i) => <ListItem key={i} text={t} color="#A0522D" />)}
                </Section>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginBottom: "1.25rem" }}>
                {sheet.recommended_routes && (
                  <InfoBlock label="Voies recommandées" value={sheet.recommended_routes} icon={<Droplets size={13} color="#87A96B" />} />
                )}
                {sheet.max_dilution && (
                  <InfoBlock label="Dilution max" value={sheet.max_dilution} icon={<FlaskConical size={13} color="#A0522D" />} />
                )}
              </div>

              {sheet.drug_interactions && (
                <div style={{
                  padding: "0.85rem 1rem", background: "rgba(230,126,34,0.06)",
                  borderRadius: 10, border: "1px solid rgba(230,126,34,0.18)", marginBottom: "1.25rem"
                }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", fontWeight: 700, color: "#E67E22", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.35rem" }}>
                    ⚡ Interactions médicamenteuses
                  </div>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#7A4020", margin: 0, lineHeight: 1.6 }}>
                    {sheet.drug_interactions}
                  </p>
                </div>
              )}

              {ingredient.source_reference && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1.25rem" }}>
                  <BookOpen size={12} color="#9AA889" />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "#9AA889", fontStyle: "italic" }}>
                    {ingredient.source_reference}
                  </span>
                </div>
              )}
            </>
          ) : null}

          {/* Add to library button — hidden if already in library */}
          {!isFromLibrary && !loadingSheet && (
            <button
              onClick={handleAddToLibrary}
              disabled={addingToLibrary || addedToLibrary}
              style={{
                width: "100%", padding: "0.75rem",
                background: addedToLibrary
                  ? "linear-gradient(135deg, #6B8F52, #4A6B38)"
                  : "linear-gradient(135deg, rgba(135,169,107,0.15), rgba(135,169,107,0.25))",
                border: "1.5px solid rgba(135,169,107,0.35)",
                borderRadius: 12, cursor: addedToLibrary ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                fontFamily: "Inter, sans-serif", fontSize: "0.85rem", fontWeight: 600,
                color: addedToLibrary ? "white" : "#6B8F52",
                transition: "all 0.2s ease",
                opacity: addingToLibrary ? 0.7 : 1
              }}
            >
              {addingToLibrary
                ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Ajout en cours…</>
                : addedToLibrary
                  ? <><Check size={15} /> Ajouté à la bibliothèque</>
                  : <><Plus size={15} /> Ajouter à la bibliothèque de plantes</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  const colors = {
    HE: { bg: "rgba(135,169,107,0.12)", border: "rgba(135,169,107,0.3)", color: "#6B8F52" },
    HV: { bg: "rgba(160,82,45,0.1)", border: "rgba(160,82,45,0.25)", color: "#A0522D" },
    Extrait: { bg: "rgba(91,141,184,0.1)", border: "rgba(91,141,184,0.25)", color: "#3A6B8A" }
  };
  const c = colors[type] || colors.HE;
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 50,
      padding: "0.15rem 0.6rem", fontFamily: "Inter, sans-serif",
      fontSize: "0.65rem", fontWeight: 700, color: c.color, letterSpacing: "0.04em"
    }}>
      {type || "HE"}
    </span>
  );
}

function SafetyTag({ icon, label, color, bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.25rem",
      background: bg, borderRadius: 50, padding: "0.15rem 0.55rem",
      fontFamily: "Inter, sans-serif", fontSize: "0.65rem", color, fontWeight: 500
    }}>
      {icon}{label}
    </span>
  );
}

function Section({ icon, title, color, children }) {
  return (
    <div style={{ marginBottom: "1.1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
        {icon}
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {children}
      </div>
    </div>
  );
}

function ListItem({ text, color }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
      <span style={{ color, fontSize: "0.65rem", marginTop: "0.3rem", flexShrink: 0 }}>●</span>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.83rem", color: "#5A4A3A", lineHeight: 1.6 }}>{text}</span>
    </div>
  );
}

function InfoBlock({ label, value, icon }) {
  return (
    <div style={{
      padding: "0.7rem 0.9rem", background: "rgba(245,245,220,0.6)",
      borderRadius: 10, border: "1px solid rgba(135,169,107,0.12)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.25rem" }}>
        {icon}
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.65rem", color: "#9AA889", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#3D2B1F", fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}