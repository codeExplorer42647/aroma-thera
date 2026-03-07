import { useState } from "react";
import { base44 } from "@/api/base44Client";
import StepIndicator from "@/components/diagnostic/StepIndicator";
import AlertBanner from "@/components/diagnostic/AlertBanner";
import Disclaimer from "@/components/diagnostic/Disclaimer";
import { Leaf, ChevronRight, ChevronLeft, Loader2, CheckCircle } from "lucide-react";

const SYMPTOMS = [
  "Stress & Anxiété", "Troubles du sommeil", "Douleurs musculaires", "Maux de tête",
  "Problèmes digestifs", "Fatigue chronique", "Infections respiratoires", "Problèmes cutanés",
  "Troubles de l'humeur", "Douleurs articulaires", "Immunité faible", "Autre"
];

const HISTORY_OPTIONS = [
  "Épilepsie", "Asthme", "Allergie cutanée", "Hypertension",
  "Diabète", "Maladies rénales", "Maladies hépatiques", "Cancer", "Aucun"
];

const initialState = {
  step: 1,
  symptom: "",
  symptom_detail: "",
  age: "",
  weight: "",
  medical_history: [],
  is_pregnant: false,
  is_breastfeeding: false,
  current_medications: "",
  ai_recommendation: "",
  status: "in_progress"
};

export default function Diagnostic() {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleHistory = (item) => {
    const list = form.medical_history;
    if (item === "Aucun") {
      setForm(prev => ({ ...prev, medical_history: ["Aucun"] }));
    } else {
      const next = list.includes(item)
        ? list.filter(x => x !== item)
        : [...list.filter(x => x !== "Aucun"), item];
      setForm(prev => ({ ...prev, medical_history: next }));
    }
  };

  const canNext = () => {
    if (form.step === 1) return form.symptom !== "";
    if (form.step === 2) return form.age !== "" && form.weight !== "";
    return true;
  };

  const handleNext = () => {
    if (form.step < 5) setForm(prev => ({ ...prev, step: prev.step + 1 }));
    else handleSubmit();
  };

  const handleBack = () => {
    if (form.step > 1) setForm(prev => ({ ...prev, step: prev.step - 1 }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    const prompt = buildPrompt();
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                plant_name: { type: "string" },
                latin_name: { type: "string" },
                usage: { type: "string" },
                protocol: { type: "string" },
                drops_per_use: { type: "number" },
                frequency: { type: "string" },
                duration: { type: "string" },
                route: { type: "string" },
                is_photosensitizing: { type: "boolean" },
                is_dermocaustic: { type: "boolean" },
                warnings: { type: "array", items: { type: "string" } }
              }
            }
          },
          general_advice: { type: "string" },
          when_to_see_doctor: { type: "string" }
        }
      }
    });
    setRecommendation(res);
    setForm(prev => ({ ...prev, status: "completed" }));
    setLoading(false);
  };

  const buildPrompt = () => `
Tu es un expert en aromathérapie et phytothérapie. Génère une recommandation personnalisée basée sur ce profil patient :

SYMPTÔME PRINCIPAL : ${form.symptom}
Détails : ${form.symptom_detail || "Non précisé"}

PROFIL :
- Âge : ${form.age} ans
- Poids : ${form.weight} kg

ANTÉCÉDENTS MÉDICAUX : ${form.medical_history.length ? form.medical_history.join(", ") : "Aucun"}

ÉTAT PARTICULIER :
- Grossesse : ${form.is_pregnant ? "OUI" : "Non"}
- Allaitement : ${form.is_breastfeeding ? "OUI" : "Non"}

TRAITEMENTS EN COURS : ${form.current_medications || "Aucun"}

RÈGLES DE SÉCURITÉ OBLIGATOIRES :
1. Si grossesse ou allaitement : éviter toutes les HE sauf exceptions bien documentées
2. Indiquer clairement si photosensibilisant ou dermocaustique
3. Protocoles cutanés : ne jamais dépasser 3% de dilution en usage général, 10% maximum
4. Calculer le nombre de gouttes avec la formule : Volume(ml) × %dilution × 25
5. Durée max recommandée : 3 semaines sauf indication contraire
6. Mentionner toujours : "Consultez un professionnel de santé"

Propose 2-3 huiles essentielles ou plantes adaptées avec protocoles précis en français.
  `;

  const resetForm = () => {
    setForm(initialState);
    setRecommendation(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <Leaf size={48} color="#87A96B" className="leaf-loading" style={{ margin: "0 auto" }} />
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#3D2B1F", fontSize: "1.5rem", marginBottom: "0.75rem" }}>
          Analyse en cours…
        </h2>
        <p style={{ fontFamily: "Inter, sans-serif", color: "#7A6558", fontSize: "0.9rem" }}>
          Notre système analyse votre profil pour des recommandations personnalisées
        </p>
      </div>
    );
  }

  if (recommendation) {
    return <RecommendationView data={recommendation} profile={form} onReset={resetForm} />;
  }

  return (
    <div className="fade-in-up" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#3D2B1F", marginBottom: "0.5rem" }}>
          Diagnostic Personnalisé
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", color: "#7A6558", fontSize: "0.9rem" }}>
          Répondez à 5 questions pour obtenir vos recommandations
        </p>
      </div>

      <div className="aroma-card" style={{ padding: "2rem" }}>
        <StepIndicator currentStep={form.step} />

        {form.step === 1 && <Step1 form={form} updateField={updateField} symptoms={SYMPTOMS} />}
        {form.step === 2 && <Step2 form={form} updateField={updateField} />}
        {form.step === 3 && <Step3 form={form} toggleHistory={toggleHistory} options={HISTORY_OPTIONS} />}
        {form.step === 4 && <Step4 form={form} updateField={updateField} />}
        {form.step === 5 && <Step5 form={form} updateField={updateField} />}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", gap: "1rem" }}>
          {form.step > 1 ? (
            <button
              onClick={handleBack}
              style={{
                background: "transparent",
                border: "1.5px solid rgba(135,169,107,0.3)",
                borderRadius: 50,
                padding: "0.65rem 1.5rem",
                fontFamily: "Inter, sans-serif",
                fontSize: "0.88rem",
                color: "#6B8F52",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <ChevronLeft size={16} /> Retour
            </button>
          ) : <div />}

          <button
            onClick={handleNext}
            disabled={!canNext()}
            className="btn-sage"
            style={{ opacity: canNext() ? 1 : 0.5, display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            {form.step === 5 ? "Obtenir mon diagnostic" : "Suivant"}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Step1({ form, updateField, symptoms }) {
  return (
    <div className="fade-in-up">
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", color: "#3D2B1F", marginBottom: "0.4rem" }}>
        Quel est votre symptôme principal ?
      </h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#9AA889", marginBottom: "1.25rem" }}>
        Sélectionnez le symptôme qui vous concerne le plus
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.6rem", marginBottom: "1.25rem" }}>
        {symptoms.map(s => (
          <button
            key={s}
            onClick={() => updateField("symptom", s)}
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: 10,
              border: form.symptom === s ? "2px solid #87A96B" : "1.5px solid rgba(135,169,107,0.2)",
              background: form.symptom === s ? "rgba(135,169,107,0.12)" : "rgba(255,255,255,0.6)",
              fontFamily: "Inter, sans-serif",
              fontSize: "0.8rem",
              color: form.symptom === s ? "#6B8F52" : "#5A4A3A",
              cursor: "pointer",
              fontWeight: form.symptom === s ? 600 : 400,
              transition: "all 0.2s ease",
              textAlign: "left"
            }}
          >{s}</button>
        ))}
      </div>
      <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#7A6558", display: "block", marginBottom: "0.4rem" }}>
        Précisez (optionnel)
      </label>
      <textarea
        className="aroma-input"
        rows={2}
        placeholder="Décrivez votre symptôme en détail..."
        value={form.symptom_detail}
        onChange={e => updateField("symptom_detail", e.target.value)}
        style={{ resize: "none" }}
      />
    </div>
  );
}

function Step2({ form, updateField }) {
  return (
    <div className="fade-in-up">
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", color: "#3D2B1F", marginBottom: "0.4rem" }}>
        Votre profil physique
      </h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#9AA889", marginBottom: "1.5rem" }}>
        Ces données permettent d'ajuster les dosages avec précision
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        <div>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#7A6558", display: "block", marginBottom: "0.4rem" }}>
            Âge (années) *
          </label>
          <input
            type="number"
            className="aroma-input"
            placeholder="Ex: 35"
            value={form.age}
            onChange={e => updateField("age", e.target.value)}
            min={0}
            max={120}
          />
        </div>
        <div>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#7A6558", display: "block", marginBottom: "0.4rem" }}>
            Poids (kg) *
          </label>
          <input
            type="number"
            className="aroma-input"
            placeholder="Ex: 70"
            value={form.weight}
            onChange={e => updateField("weight", e.target.value)}
            min={0}
          />
        </div>
      </div>
    </div>
  );
}

function Step3({ form, toggleHistory, options }) {
  return (
    <div className="fade-in-up">
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", color: "#3D2B1F", marginBottom: "0.4rem" }}>
        Antécédents médicaux
      </h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#9AA889", marginBottom: "1.25rem" }}>
        Sélectionnez tout ce qui s'applique
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
        {options.map(opt => {
          const selected = form.medical_history.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => toggleHistory(opt)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: 50,
                border: selected ? "2px solid #A0522D" : "1.5px solid rgba(160,82,45,0.2)",
                background: selected ? "rgba(160,82,45,0.1)" : "rgba(255,255,255,0.6)",
                fontFamily: "Inter, sans-serif",
                fontSize: "0.8rem",
                color: selected ? "#A0522D" : "#5A4A3A",
                cursor: "pointer",
                fontWeight: selected ? 600 : 400,
                transition: "all 0.2s ease"
              }}
            >{opt}</button>
          );
        })}
      </div>
    </div>
  );
}

function Step4({ form, updateField }) {
  const Toggle = ({ label, field, value, onChange, danger }) => (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "1rem 1.25rem",
      background: value ? (danger ? "rgba(160,82,45,0.06)" : "rgba(135,169,107,0.06)") : "rgba(255,255,255,0.5)",
      borderRadius: 12,
      border: value ? `1.5px solid ${danger ? "rgba(160,82,45,0.25)" : "rgba(135,169,107,0.25)"}` : "1.5px solid rgba(0,0,0,0.06)",
      marginBottom: "0.75rem",
      cursor: "pointer",
      transition: "all 0.2s ease"
    }}
      onClick={() => onChange(!value)}
    >
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.9rem", color: "#3D2B1F", fontWeight: 500 }}>{label}</span>
      <div style={{
        width: 44,
        height: 24,
        borderRadius: 50,
        background: value ? (danger ? "#A0522D" : "#87A96B") : "rgba(0,0,0,0.12)",
        position: "relative",
        transition: "background 0.25s ease"
      }}>
        <div style={{
          position: "absolute",
          top: 2,
          left: value ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          transition: "left 0.25s ease"
        }} />
      </div>
    </div>
  );

  return (
    <div className="fade-in-up">
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", color: "#3D2B1F", marginBottom: "0.4rem" }}>
        État particulier
      </h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#9AA889", marginBottom: "1.5rem" }}>
        Information cruciale pour la sécurité des recommandations
      </p>
      <Toggle
        label="🤰 Grossesse en cours"
        field="is_pregnant"
        value={form.is_pregnant}
        onChange={v => updateField("is_pregnant", v)}
        danger={true}
      />
      <Toggle
        label="🤱 Allaitement"
        field="is_breastfeeding"
        value={form.is_breastfeeding}
        onChange={v => updateField("is_breastfeeding", v)}
        danger={true}
      />
      {(form.is_pregnant || form.is_breastfeeding) && (
        <AlertBanner type="pregnancy" message="Certaines huiles essentielles sont formellement contre-indiquées. Seules les recommandations sûres vous seront proposées." />
      )}
    </div>
  );
}

function Step5({ form, updateField }) {
  return (
    <div className="fade-in-up">
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", color: "#3D2B1F", marginBottom: "0.4rem" }}>
        Traitements en cours
      </h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#9AA889", marginBottom: "1.25rem" }}>
        Listez vos médicaments et compléments actuels (interactions possibles)
      </p>
      <textarea
        className="aroma-input"
        rows={4}
        placeholder="Ex: Aspirine 100mg, Metformine, Vitamine D... ou 'Aucun traitement'"
        value={form.current_medications}
        onChange={e => updateField("current_medications", e.target.value)}
        style={{ resize: "none" }}
      />
      <p style={{
        fontFamily: "Inter, sans-serif",
        fontSize: "0.75rem",
        color: "#9AA889",
        marginTop: "0.75rem",
        padding: "0.6rem 0.9rem",
        background: "rgba(135,169,107,0.06)",
        borderRadius: 8
      }}>
        💡 Ces informations permettent de vérifier les interactions avec les huiles essentielles et plantes recommandées.
      </p>
    </div>
  );
}

function RecommendationView({ data, profile, onReset }) {
  return (
    <div className="fade-in-up" style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{
          width: 56,
          height: 56,
          background: "linear-gradient(135deg, rgba(135,169,107,0.2), rgba(135,169,107,0.35))",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1rem"
        }}>
          <CheckCircle size={28} color="#87A96B" />
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.9rem", color: "#3D2B1F", marginBottom: "0.4rem" }}>
          Vos Recommandations
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#9AA889" }}>
          Profil : {profile.age} ans · {profile.weight} kg · {profile.symptom}
        </p>
      </div>

      {/* Summary */}
      {data.summary && (
        <div className="aroma-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.9rem", color: "#5A4A3A", lineHeight: 1.7 }}>
            {data.summary}
          </p>
        </div>
      )}

      {/* Recommendations */}
      {(data.recommendations || []).map((rec, i) => (
        <div key={i} className="aroma-card" style={{ padding: "1.75rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#3D2B1F" }}>
                {rec.plant_name}
              </h3>
              {rec.latin_name && (
                <em style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#9AA889" }}>
                  {rec.latin_name}
                </em>
              )}
            </div>
            <span className="tag-sage">{rec.route || "Cutané"}</span>
          </div>

          {rec.is_photosensitizing && (
            <AlertBanner type="photosensitizing" message="Évitez l'exposition solaire pendant 12h après application cutanée." />
          )}
          {rec.is_dermocaustic && (
            <AlertBanner type="dermocaustic" message="Dilution obligatoire. Ne jamais appliquer pur sur la peau." />
          )}

          {rec.protocol && (
            <div style={{
              background: "rgba(135,169,107,0.06)",
              borderRadius: 10,
              padding: "1rem",
              marginBottom: "0.75rem",
              border: "1px solid rgba(135,169,107,0.15)"
            }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", fontWeight: 600, color: "#87A96B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>
                PROTOCOLE
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "#3D2B1F", lineHeight: 1.65, margin: 0 }}>
                {rec.protocol}
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {rec.drops_per_use && (
              <div style={{
                padding: "0.4rem 0.85rem",
                background: "rgba(160,82,45,0.08)",
                borderRadius: 8,
                fontFamily: "Inter, sans-serif",
                fontSize: "0.78rem",
                color: "#A0522D"
              }}>
                💧 {rec.drops_per_use} gouttes / utilisation
              </div>
            )}
            {rec.frequency && (
              <div style={{
                padding: "0.4rem 0.85rem",
                background: "rgba(135,169,107,0.08)",
                borderRadius: 8,
                fontFamily: "Inter, sans-serif",
                fontSize: "0.78rem",
                color: "#6B8F52"
              }}>
                🕐 {rec.frequency}
              </div>
            )}
            {rec.duration && (
              <div style={{
                padding: "0.4rem 0.85rem",
                background: "rgba(61,43,31,0.06)",
                borderRadius: 8,
                fontFamily: "Inter, sans-serif",
                fontSize: "0.78rem",
                color: "#6B5744"
              }}>
                📅 {rec.duration}
              </div>
            )}
          </div>

          {rec.warnings && rec.warnings.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              {rec.warnings.map((w, j) => (
                <div key={j} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.3rem" }}>
                  <span style={{ color: "#E67E22", fontSize: "0.8rem" }}>⚠</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#7A6558" }}>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* General Advice */}
      {data.general_advice && (
        <div className="aroma-card" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", fontWeight: 600, color: "#87A96B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
            CONSEILS GÉNÉRAUX
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "#5A4A3A", lineHeight: 1.7, margin: 0 }}>
            {data.general_advice}
          </p>
        </div>
      )}

      {/* When to see doctor */}
      {data.when_to_see_doctor && (
        <div style={{
          background: "linear-gradient(135deg, rgba(160,82,45,0.08), rgba(160,82,45,0.04))",
          border: "1px solid rgba(160,82,45,0.2)",
          borderRadius: 14,
          padding: "1.25rem",
          marginBottom: "1.25rem"
        }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", fontWeight: 600, color: "#A0522D", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            🩺 QUAND CONSULTER UN MÉDECIN
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.87rem", color: "#7A4020", lineHeight: 1.65, margin: 0 }}>
            {data.when_to_see_doctor}
          </p>
        </div>
      )}

      <Disclaimer />

      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <button onClick={onReset} className="btn-sage">
          Nouveau Diagnostic
        </button>
      </div>
    </div>
  );
}