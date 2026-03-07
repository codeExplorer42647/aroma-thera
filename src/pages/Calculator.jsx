import { useState } from "react";
import { base44 } from "@/api/base44Client";
import AlertBanner from "@/components/diagnostic/AlertBanner";
import Disclaimer from "@/components/diagnostic/Disclaimer";
import { Plus, Trash2, Calculator as CalcIcon, Leaf, AlertTriangle } from "lucide-react";

const USAGE_TYPES = [
  { value: "cutane_general", label: "Cutané — Usage général", maxPercent: 10, recommended: 3, note: "Max 10% — Recommandé : 2-3%" },
  { value: "cutane_localise", label: "Cutané — Zone localisée", maxPercent: 15, recommended: 5, note: "Max 15%" },
  { value: "cutane_visage", label: "Cutané — Visage", maxPercent: 2, recommended: 1, note: "Max 2% — Peau sensible" },
  { value: "diffusion", label: "Diffusion atmosphérique", maxPercent: 100, recommended: null, note: "Pur ou dilué dans eau de diffuseur" },
  { value: "bain", label: "Bain aromatique", maxPercent: 5, recommended: 2, note: "Max 5% — Toujours diluer dans un dispersant" },
];

const COMMON_HE = [
  "Lavande vraie", "Tea Tree", "Eucalyptus radié", "Menthe poivrée",
  "Ylang-Ylang", "Bergamote", "Citron", "Romarin à cinéole",
  "Géranium rosat", "Camomille romaine", "Frankincense", "Autre"
];

const emptyIngredient = () => ({ id: Date.now(), name: "", drops: 1, percentage: 0 });

export default function Calculator() {
  const [volume, setVolume] = useState(30);
  const [usageType, setUsageType] = useState("cutane_general");
  const [ingredients, setIngredients] = useState([{ ...emptyIngredient(), name: "" }]);
  const [blendName, setBlendName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [manualMode, setManualMode] = useState(false); // drops vs percentage input

  const currentUsage = USAGE_TYPES.find(u => u.value === usageType);

  // Formula: Nombre_gouttes = Volume(ml) × (%dilution/100) × 25
  const calcDropsFromPercent = (vol, pct) => Math.round(vol * (pct / 100) * 25);
  const calcPercentFromDrops = (vol, drops) => parseFloat(((drops / (vol * 25)) * 100).toFixed(2));

  const updateIngredient = (id, field, value) => {
    setIngredients(prev => prev.map(ing => {
      if (ing.id !== id) return ing;
      if (field === "drops") {
        const drops = Math.max(0, parseInt(value) || 0);
        return { ...ing, drops, percentage: calcPercentFromDrops(volume, drops) };
      }
      if (field === "percentage") {
        const pct = Math.max(0, parseFloat(value) || 0);
        return { ...ing, percentage: pct, drops: calcDropsFromPercent(volume, pct) };
      }
      return { ...ing, [field]: value };
    }));
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, emptyIngredient()]);
  };

  const removeIngredient = (id) => {
    if (ingredients.length > 1) {
      setIngredients(prev => prev.filter(i => i.id !== id));
    }
  };

  const totalDrops = ingredients.reduce((sum, i) => sum + (i.drops || 0), 0);
  const totalPercent = parseFloat(calcPercentFromDrops(volume, totalDrops).toFixed(2));
  const maxPercent = currentUsage?.maxPercent || 10;
  const isOverLimit = totalPercent > maxPercent;

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    setIngredients(prev => prev.map(ing => ({
      ...ing,
      drops: calcDropsFromPercent(newVol, ing.percentage)
    })));
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Blend.create({
      name: blendName || `Mélange — ${new Date().toLocaleDateString("fr-FR")}`,
      total_volume_ml: volume,
      usage_type: usageType.split("_")[0],
      ingredients: ingredients.map(i => ({ plant_name: i.name, drops: i.drops, percentage: i.percentage })),
      total_drops_he: totalDrops,
      total_percentage: totalPercent,
      has_warning: isOverLimit,
      notes: `Volume: ${volume}ml — Dilution: ${totalPercent}%`
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="fade-in-up" style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#3D2B1F", marginBottom: "0.5rem" }}>
          Calculateur de Mélanges
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", color: "#7A6558", fontSize: "0.9rem" }}>
          Formule précise : Gouttes = Volume (ml) × % dilution × 25
        </p>
      </div>

      {/* Config */}
      <div className="aroma-card" style={{ padding: "1.75rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#3D2B1F", marginBottom: "1.25rem" }}>
          Configuration du mélange
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
          <div>
            <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#7A6558", display: "block", marginBottom: "0.4rem" }}>
              Volume total (mL)
            </label>
            <input
              type="number"
              className="aroma-input"
              value={volume}
              onChange={e => handleVolumeChange(Math.max(1, parseFloat(e.target.value) || 1))}
              min={1}
              style={{ fontWeight: 600 }}
            />
          </div>
          <div>
            <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#7A6558", display: "block", marginBottom: "0.4rem" }}>
              Type d'utilisation
            </label>
            <select
              className="aroma-input"
              value={usageType}
              onChange={e => setUsageType(e.target.value)}
            >
              {USAGE_TYPES.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{
          padding: "0.7rem 1rem",
          background: "rgba(135,169,107,0.08)",
          borderRadius: 10,
          border: "1px solid rgba(135,169,107,0.2)",
          fontFamily: "Inter, sans-serif",
          fontSize: "0.8rem",
          color: "#6B8F52"
        }}>
          ℹ️ {currentUsage?.note}
        </div>

        <div style={{ marginTop: "1rem" }}>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#7A6558", display: "block", marginBottom: "0.4rem" }}>
            Nom du mélange (optionnel)
          </label>
          <input
            type="text"
            className="aroma-input"
            placeholder="Ex: Relaxation Nuit, Immunité Hiver..."
            value={blendName}
            onChange={e => setBlendName(e.target.value)}
          />
        </div>
      </div>

      {/* Ingredients */}
      <div className="aroma-card" style={{ padding: "1.75rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#3D2B1F" }}>
            Huiles Essentielles
          </h3>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={() => setManualMode(!manualMode)}
              style={{
                background: "transparent",
                border: "1px solid rgba(135,169,107,0.3)",
                borderRadius: 8,
                padding: "0.35rem 0.75rem",
                fontFamily: "Inter, sans-serif",
                fontSize: "0.75rem",
                color: "#6B8F52",
                cursor: "pointer"
              }}
            >
              {manualMode ? "💧 Mode Gouttes" : "% Mode Pourcentage"}
            </button>
          </div>
        </div>

        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 90px 90px 36px",
          gap: "0.75rem",
          marginBottom: "0.5rem",
          padding: "0 0.25rem"
        }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "#9AA889", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Huile essentielle</span>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "#9AA889", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>💧 Gouttes</span>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "#9AA889", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>% Dil.</span>
          <span></span>
        </div>

        {ingredients.map((ing, idx) => (
          <div key={ing.id} style={{
            display: "grid",
            gridTemplateColumns: "1fr 90px 90px 36px",
            gap: "0.75rem",
            marginBottom: "0.6rem",
            alignItems: "center"
          }}>
            <select
              className="aroma-input"
              value={ing.name}
              onChange={e => updateIngredient(ing.id, "name", e.target.value)}
              style={{ padding: "0.55rem 0.75rem" }}
            >
              <option value="">Sélectionner…</option>
              {COMMON_HE.map(h => <option key={h} value={h}>{h}</option>)}
            </select>

            <input
              type="number"
              className="aroma-input"
              value={ing.drops}
              onChange={e => updateIngredient(ing.id, "drops", e.target.value)}
              min={0}
              style={{ textAlign: "center", padding: "0.55rem 0.5rem" }}
            />

            <div style={{ position: "relative" }}>
              <input
                type="number"
                className="aroma-input"
                value={ing.percentage}
                onChange={e => updateIngredient(ing.id, "percentage", e.target.value)}
                min={0}
                step={0.1}
                style={{ textAlign: "center", padding: "0.55rem 1.4rem 0.55rem 0.5rem" }}
              />
              <span style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "#9AA889" }}>%</span>
            </div>

            <button
              onClick={() => removeIngredient(ing.id)}
              style={{
                background: "rgba(220,50,50,0.08)",
                border: "none",
                borderRadius: 8,
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: ingredients.length === 1 ? "not-allowed" : "pointer",
                opacity: ingredients.length === 1 ? 0.3 : 1
              }}
              disabled={ingredients.length === 1}
            >
              <Trash2 size={14} color="#E74C3C" />
            </button>
          </div>
        ))}

        <button
          onClick={addIngredient}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "transparent",
            border: "1.5px dashed rgba(135,169,107,0.35)",
            borderRadius: 10,
            padding: "0.6rem 1rem",
            width: "100%",
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            fontSize: "0.82rem",
            color: "#87A96B",
            marginTop: "0.5rem",
            justifyContent: "center"
          }}
        >
          <Plus size={15} /> Ajouter une huile essentielle
        </button>
      </div>

      {/* Result Summary */}
      <div className="aroma-card" style={{ padding: "1.75rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#3D2B1F", marginBottom: "1.25rem" }}>
          Résultat du Calcul
        </h3>

        {isOverLimit && (
          <AlertBanner
            type="concentration"
            message={`Concentration actuelle ${totalPercent}% dépasse la limite recommandée de ${maxPercent}% pour ce type d'utilisation.`}
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
          {[
            { label: "Total Gouttes HE", value: `${totalDrops} gttes`, color: "#87A96B" },
            { label: "Dilution Totale", value: `${totalPercent}%`, color: isOverLimit ? "#E74C3C" : "#87A96B" },
            { label: "Limite Max", value: `${maxPercent}%`, color: "#A0522D" }
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              textAlign: "center",
              padding: "1rem",
              background: "rgba(245,245,220,0.7)",
              borderRadius: 12,
              border: "1px solid rgba(135,169,107,0.15)"
            }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color, marginBottom: "0.3rem" }}>
                {value}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "#9AA889", fontWeight: 500 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Ingredients list */}
        {ingredients.filter(i => i.name && i.drops > 0).map((ing, idx) => (
          <div key={idx} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.6rem 0.9rem",
            background: "rgba(135,169,107,0.05)",
            borderRadius: 8,
            marginBottom: "0.4rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#87A96B" }} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#3D2B1F" }}>{ing.name}</span>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <span className="tag-sage">{ing.drops} gttes</span>
              <span className="tag-sienna">{ing.percentage}%</span>
            </div>
          </div>
        ))}

        <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-sage"
            style={{ flex: 1, justifyContent: "center", display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            {saving ? "Sauvegarde…" : saved ? "✓ Sauvegardé !" : "💾 Sauvegarder le mélange"}
          </button>
        </div>
      </div>

      {/* Formula explanation */}
      <div className="aroma-card" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
          <CalcIcon size={16} color="#A0522D" />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", fontWeight: 600, color: "#A0522D", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Formule de calcul
          </span>
        </div>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "0.88rem",
          color: "#3D2B1F",
          background: "rgba(160,82,45,0.06)",
          padding: "0.75rem 1rem",
          borderRadius: 8,
          fontWeight: 500,
          letterSpacing: "0.02em"
        }}>
          Gouttes = Volume (ml) × % dilution × 25
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#7A6558", marginTop: "0.6rem", lineHeight: 1.6 }}>
          Exemple : 30ml × 3% × 25 = <strong>22,5 gouttes ≈ 23 gouttes</strong> d'HE au total.
          Le reste est complété par l'huile végétale porteuse.
        </p>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.73rem", color: "#9AA889", marginTop: "0.4rem", lineHeight: 1.6, borderTop: "1px solid rgba(135,169,107,0.15)", paddingTop: "0.5rem" }}>
          ⚠️ <em>Estimation valable pour un compte-gouttes standard de pharmacie (20 gttes/ml). La taille réelle d'une goutte varie selon la viscosité de l'huile : les huiles épaisses (Santal, Myrrhe, Vétiver) produisent des gouttes plus grosses, les huiles fines (Citrus, Menthe) des gouttes plus petites.</em>
        </p>
      </div>

      <Disclaimer />
    </div>
  );
}