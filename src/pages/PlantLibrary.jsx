import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AlertBanner from "@/components/diagnostic/AlertBanner";
import Disclaimer from "@/components/diagnostic/Disclaimer";
import { Search, Leaf, X, Sun, Droplets, Baby, Sparkles, Loader2 } from "lucide-react";

const PLANT_TYPES = ["Tous", "huile_essentielle", "hydrolat", "huile_vegetale", "plante_seche", "teinture"];
const TYPE_LABELS = {
  huile_essentielle: "Huile Essentielle",
  hydrolat: "Hydrolat",
  huile_vegetale: "Huile Végétale",
  plante_seche: "Plante Sèche",
  teinture: "Teinture"
};

export default function PlantLibrary() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Tous");
  const [selected, setSelected] = useState(null);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genName, setGenName] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    base44.entities.Plant.list("-created_date", 100).then((data) => {
      setPlants(data);
      setLoading(false);
    });
  }, []);

  const generatePlantProfile = async () => {
    if (!genName.trim()) return;
    setGenerating(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Recherche dans les sources médicales indexées (notamment Price, Bone et Rhind) toutes les données sur la plante "${genName.trim()}". Analyse le texte de manière exhaustive. Génère un profil complet et précis en aromathérapie/phytothérapie clinique. Réponds UNIQUEMENT en français.`,
      response_json_schema: {
        type: "object",
        properties: {
          common_name: { type: "string" },
          latin_name: { type: "string" },
          chemotype: { type: "string" },
          plant_type: { type: "string", enum: ["huile_essentielle", "hydrolat", "huile_vegetale", "plante_seche", "teinture"] },
          description: { type: "string" },
          properties: { type: "array", items: { type: "string" } },
          indications: { type: "array", items: { type: "string" } },
          contraindications: { type: "array", items: { type: "string" } },
          usage_routes: { type: "array", items: { type: "string" } },
          max_dilution_cutaneous: { type: "number" },
          is_photosensitizing: { type: "boolean" },
          is_dermocaustic: { type: "boolean" },
          is_safe_pregnancy: { type: "boolean" },
          aroma_notes: { type: "string" },
          origin: { type: "string" },
          protocol_notes: { type: "string" }
        }
      }
    });

    // Normalize arrays
    const plantData = {
      ...res,
      common_name: res.common_name || genName.trim(),
      properties: Array.isArray(res.properties) ? res.properties : [],
      indications: Array.isArray(res.indications) ? res.indications : [],
      contraindications: Array.isArray(res.contraindications) ? res.contraindications : [],
      usage_routes: Array.isArray(res.usage_routes) ? res.usage_routes : [],
    };

    const created = await base44.entities.Plant.create(plantData);
    setPlants(prev => [created, ...prev]);
    setGenerating(false);
    setShowGenModal(false);
    setGenName("");
    setSelected(created);
  };

  const filtered = plants.filter((p) => {
    const matchSearch = !search ||
    p.common_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.latin_name?.toLowerCase().includes(search.toLowerCase()) ||
    (p.properties || []).some((pr) => pr.toLowerCase().includes(search.toLowerCase()));
    const matchType = filterType === "Tous" || p.plant_type === filterType;
    return matchSearch && matchType;
  });

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <Leaf size={40} color="#87A96B" className="leaf-loading" style={{ margin: "0 auto 1rem" }} />
        <p style={{ fontFamily: "Inter, sans-serif", color: "#9AA889" }}>Chargement de la bibliothèque…</p>
      </div>);

  }

  return (
    <div className="fade-in-up">
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#3D2B1F", marginBottom: "0.5rem" }}>
          Bibliothèque des Plantes
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", color: "#7A6558", fontSize: "0.9rem", marginBottom: "1rem" }}>
          {plants.length} plantes & huiles référencées
        </p>
        <button
          onClick={() => { setShowGenModal(true); setGenName(""); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "linear-gradient(135deg, #6B8F52, #4A6B38)",
            color: "white", border: "none", borderRadius: 50,
            padding: "0.6rem 1.4rem", fontFamily: "Inter, sans-serif",
            fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 15px rgba(135,169,107,0.35)", transition: "all 0.2s ease"
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
        >
          <Sparkles size={15} />
          Générer une plante (IA)
        </button>
      </div>

      {/* Generate Modal */}
      {showGenModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(61,43,31,0.45)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
        }} onClick={(e) => e.target === e.currentTarget && !generating && setShowGenModal(false)}>
          <div className="aroma-card" style={{ width: "100%", maxWidth: 440, padding: "2rem" }}>
            {generating ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <Loader2 size={36} color="#87A96B" style={{ margin: "0 auto 1rem", animation: "spin 1s linear infinite" }} />
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#3D2B1F", marginBottom: "0.3rem" }}>
                  Analyse de la littérature en cours...
                </p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#9AA889" }}>
                  Price, Bone, Rhind et autres sources consultées
                </p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", color: "#3D2B1F", marginBottom: "0.4rem" }}>
                  Générer une fiche de plante
                </h3>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#9AA889", marginBottom: "1.25rem" }}>
                  L'IA analyse les sources médicales indexées pour créer une fiche complète.
                </p>
                <input
                  type="text"
                  className="aroma-input"
                  placeholder="Ex : Lavande vraie, Tea tree, Eucalyptus…"
                  value={genName}
                  onChange={e => setGenName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && generatePlantProfile()}
                  autoFocus
                  style={{ marginBottom: "1.25rem" }}
                />
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowGenModal(false)}
                    style={{ background: "transparent", border: "1px solid rgba(61,43,31,0.15)", borderRadius: 50, padding: "0.55rem 1.25rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#7A6558", cursor: "pointer" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={generatePlantProfile}
                    disabled={!genName.trim()}
                    style={{
                      background: genName.trim() ? "linear-gradient(135deg, #6B8F52, #4A6B38)" : "rgba(135,169,107,0.3)",
                      color: "white", border: "none", borderRadius: 50,
                      padding: "0.55rem 1.4rem", fontFamily: "Inter, sans-serif",
                      fontSize: "0.85rem", fontWeight: 600,
                      cursor: genName.trim() ? "pointer" : "not-allowed",
                      display: "inline-flex", alignItems: "center", gap: "0.4rem"
                    }}
                  >
                    <Sparkles size={14} />
                    Générer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <Search size={16} color="#9AA889" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            className="aroma-input"
            placeholder="Rechercher une plante, propriété…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "2.5rem" }} />

        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {PLANT_TYPES.map((type) =>
          <button
            key={type}
            onClick={() => setFilterType(type)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: 50,
              border: filterType === type ? "2px solid #87A96B" : "1.5px solid rgba(135,169,107,0.25)",
              background: filterType === type ? "rgba(135,169,107,0.12)" : "transparent",
              fontFamily: "Inter, sans-serif",
              fontSize: "0.75rem",
              color: filterType === type ? "#6B8F52" : "#7A6558",
              fontWeight: filterType === type ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap"
            }}>

              {type === "Tous" ? "Toutes" : TYPE_LABELS[type]}
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ?
      <div className="aroma-card" style={{ padding: "3rem", textAlign: "center" }}>
          <Leaf size={36} color="#B8D0A0" style={{ margin: "0 auto 1rem" }} />
          <p style={{ fontFamily: "Inter, sans-serif", color: "#9AA889" }}>
            {plants.length === 0 ? "La bibliothèque est vide. Ajoutez des plantes depuis le tableau de bord." : "Aucun résultat pour cette recherche."}
          </p>
        </div> :

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
          {filtered.map((plant) =>
        <PlantCard key={plant.id} plant={plant} onSelect={setSelected} />
        )}
        </div>
      }

      {selected &&
      <PlantModal plant={selected} onClose={() => setSelected(null)} />
      }

      <Disclaimer />
    </div>);

}

function PlantCard({ plant, onSelect }) {
  return (
    <div
      className="aroma-card"
      style={{ padding: "1.5rem", cursor: "pointer", transition: "transform 0.3s, box-shadow 0.3s" }}
      onClick={() => onSelect(plant)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 10px 35px rgba(61,43,31,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(61,43,31,0.06)";
      }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.85rem" }}>
        <div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", color: "#3D2B1F", marginBottom: "0.2rem" }}>
            {plant.common_name}
          </h3>
          <em style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "#9AA889" }}>
            {plant.latin_name}
          </em>
        </div>
        <div style={{ display: "flex", gap: "0.3rem" }}>
          {plant.is_photosensitizing && <Sun size={14} color="#F39C12" title="Photosensibilisant" />}
          {plant.is_dermocaustic && <Droplets size={14} color="#E74C3C" title="Dermocaustique" />}
          {!plant.is_safe_pregnancy && <Baby size={14} color="#8E44AD" title="Déconseillé grossesse" />}
        </div>
      </div>

      {plant.plant_type &&
      <span className="tag-sage" style={{ marginBottom: "0.85rem", display: "inline-block" }}>
          {TYPE_LABELS[plant.plant_type] || plant.plant_type}
        </span>
      }

      {plant.properties && plant.properties.length > 0 &&
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
          {plant.properties.slice(0, 3).map((p, i) =>
        <span key={i} style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "0.7rem",
          color: "#7A6558",
          background: "rgba(61,43,31,0.05)",
          padding: "0.2rem 0.5rem",
          borderRadius: 6
        }}>{p}</span>
        )}
          {plant.properties.length > 3 &&
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "#9AA889" }}>
              +{plant.properties.length - 3}
            </span>
        }
        </div>
      }
    </div>);

}

function PlantModal({ plant, onClose }) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(61,43,31,0.4)",
      backdropFilter: "blur(6px)",
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem"
    }} onClick={onClose}>
      <div
        className="aroma-card"
        style={{
          width: "100%",
          maxWidth: 600,
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "2rem",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}>

        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "rgba(61,43,31,0.06)",
            border: "none",
            borderRadius: "50%",
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer"
          }}>

          <X size={16} color="#7A6558" />
        </button>

        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "#3D2B1F", marginBottom: "0.3rem" }} className="text-black">
          {plant.common_name}
        </h2>
        <em style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#9AA889", display: "block", marginBottom: "0.75rem" }}>
          {plant.latin_name} {plant.chemotype ? `CT ${plant.chemotype}` : ""}
        </em>

        {plant.plant_type &&
        <span className="tag-sage" style={{ marginBottom: "1.25rem", display: "inline-block" }}>
            {TYPE_LABELS[plant.plant_type]}
          </span>
        }

        {/* Safety Alerts */}
        {plant.is_photosensitizing && <AlertBanner type="photosensitizing" message="Évitez l'exposition solaire 12h après application." />}
        {plant.is_dermocaustic && <AlertBanner type="dermocaustic" message="Toujours diluer. Ne jamais appliquer pur sur la peau." />}
        {!plant.is_safe_pregnancy && <AlertBanner type="pregnancy" message="Déconseillé pendant la grossesse et l'allaitement." />}

        <Section title="Description" content={plant.description} />
        <TagSection title="Propriétés" tags={plant.properties} color="sage" />
        <TagSection title="Indications" tags={plant.indications} color="sage" />
        <TagSection title="Contre-indications" tags={plant.contraindications} color="sienna" />
        <TagSection title="Voies d'utilisation" tags={plant.usage_routes} color="sage" />

        {plant.max_dilution_cutaneous &&
        <div style={{ marginBottom: "1.25rem" }}>
            <SectionTitle>Dilution cutanée max</SectionTitle>
            <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            background: plant.max_dilution_cutaneous > 10 ? "rgba(160,82,45,0.08)" : "rgba(135,169,107,0.08)",
            borderRadius: 8,
            border: `1px solid ${plant.max_dilution_cutaneous > 10 ? "rgba(160,82,45,0.2)" : "rgba(135,169,107,0.2)"}`
          }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: 700, color: plant.max_dilution_cutaneous > 10 ? "#A0522D" : "#87A96B" }}>
                {plant.max_dilution_cutaneous}%
              </span>
              {plant.max_dilution_cutaneous > 10 && <AlertBanner type="concentration" />}
            </div>
          </div>
        }

        <Section title="Notes de protocole" content={plant.protocol_notes} />
        <Section title="Notes olfactives" content={plant.aroma_notes} />
        {plant.origin &&
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#9AA889", marginBottom: "0.5rem" }}>
            🌍 Origine : {plant.origin}
          </div>
        }

        <Disclaimer />
      </div>
    </div>);

}

function SectionTitle({ children }) {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", fontWeight: 600, color: "#87A96B", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>
      {children}
    </div>);

}

function Section({ title, content }) {
  if (!content) return null;
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <SectionTitle>{title}</SectionTitle>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.87rem", color: "#5A4A3A", lineHeight: 1.65 }}>{content}</p>
    </div>);

}

function TagSection({ title, tags, color }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <SectionTitle>{title}</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {tags.map((tag, i) =>
        <span key={i} className={color === "sage" ? "tag-sage" : "tag-sienna"}>{tag}</span>
        )}
      </div>
    </div>);

}