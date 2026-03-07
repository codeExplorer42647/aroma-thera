import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Leaf, FlaskConical, Calculator, BookOpen, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  {
    icon: FlaskConical,
    title: "Diagnostic Personnalisé",
    description: "Questionnaire en 5 étapes pour des recommandations adaptées à votre profil et vos symptômes.",
    page: "Diagnostic",
    color: "#87A96B"
  },
  {
    icon: Calculator,
    title: "Calculateur de Mélanges",
    description: "Calculez précisément vos mélanges d'huiles essentielles avec les bonnes dilutions.",
    page: "Calculator",
    color: "#A0522D"
  },
  {
    icon: BookOpen,
    title: "Bibliothèque des Plantes",
    description: "Fiches détaillées : propriétés, contre-indications, protocoles pour chaque plante.",
    page: "PlantLibrary",
    color: "#87A96B"
  }
];

const safetyPoints = [
  "Alertes automatiques pour huiles photosensibilisantes",
  "Contre-indications grossesse & allaitement",
  "Avertissements de concentration cutanée",
  "Disclaimer médical sur chaque protocole"
];

export default function Home() {
  return (
    <div className="fade-in-up">
      {/* Hero Section */}
      <div style={{ textAlign: "center", padding: "3rem 1rem 4rem", maxWidth: 700, margin: "0 auto" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "rgba(135,169,107,0.12)",
          border: "1px solid rgba(135,169,107,0.25)",
          borderRadius: 50,
          padding: "0.4rem 1rem",
          marginBottom: "1.5rem"
        }}>
          <Sparkles size={14} color="#87A96B" />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#6B8F52", fontWeight: 500 }}>
            Aromathérapie & Phytothérapie Sécurisée
          </span>
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
          fontWeight: 700,
          color: "#3D2B1F",
          lineHeight: 1.15,
          marginBottom: "1.25rem"
        }}>
          La Nature au service<br />
          <em style={{ color: "#87A96B" }}>de votre santé</em>
        </h1>

        <p style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "1.05rem",
          color: "#7A6558",
          lineHeight: 1.7,
          marginBottom: "2.5rem"
        }}>
          Obtenez des recommandations personnalisées en aromathérapie et phytothérapie, 
          basées sur des sources scientifiques validées et adaptées à votre profil de santé.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to={createPageUrl("Diagnostic")} style={{ textDecoration: "none" }}>
            <button className="btn-sage" style={{ fontSize: "1rem", padding: "0.8rem 2rem" }}>
              Commencer le Diagnostic
            </button>
          </Link>
          <Link to={createPageUrl("PlantLibrary")} style={{ textDecoration: "none" }}>
            <button style={{
              background: "transparent",
              border: "1.5px solid rgba(135,169,107,0.4)",
              borderRadius: 50,
              padding: "0.8rem 2rem",
              fontFamily: "Inter, sans-serif",
              fontWeight: 500,
              fontSize: "1rem",
              color: "#6B8F52",
              cursor: "pointer",
              transition: "all 0.25s ease"
            }}>
              Explorer les Plantes
            </button>
          </Link>
        </div>
      </div>

      {/* Botanical Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "3rem", maxWidth: 500, margin: "0 auto 3rem" }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(135,169,107,0.4))" }} />
        <Leaf size={18} color="#87A96B" />
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(135,169,107,0.4), transparent)" }} />
      </div>

      {/* Feature Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "4rem" }}>
        {features.map(({ icon: Icon, title, description, page, color }) => (
          <Link key={page} to={createPageUrl(page)} style={{ textDecoration: "none" }}>
            <div className="aroma-card" style={{
              padding: "2rem",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              cursor: "pointer"
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(61,43,31,0.1)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(61,43,31,0.06)";
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                background: `linear-gradient(135deg, ${color}22, ${color}44)`,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
                border: `1px solid ${color}30`
              }}>
                <Icon size={22} color={color} />
              </div>
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.15rem",
                fontWeight: 600,
                color: "#3D2B1F",
                marginBottom: "0.6rem"
              }}>{title}</h3>
              <p style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "0.88rem",
                color: "#7A6558",
                lineHeight: 1.65
              }}>{description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Safety Section */}
      <div className="aroma-card" style={{ padding: "2.5rem", marginBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div style={{
            width: 40,
            height: 40,
            background: "linear-gradient(135deg, rgba(160,82,45,0.15), rgba(160,82,45,0.25))",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <ShieldCheck size={20} color="#A0522D" />
          </div>
          <div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.3rem",
              fontWeight: 600,
              color: "#3D2B1F"
            }}>Protocoles Sécurisés</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#9AA889" }}>
              Alertes et contre-indications intégrées
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
          {safetyPoints.map((point, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              padding: "0.75rem 1rem",
              background: "rgba(135,169,107,0.06)",
              borderRadius: 10,
              border: "1px solid rgba(135,169,107,0.15)"
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#87A96B", flexShrink: 0 }} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.83rem", color: "#5A4A3A" }}>
                {point}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legal Disclaimer */}
      <div className="disclaimer-box" style={{ marginBottom: "2rem" }}>
        <p style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "0.78rem",
          color: "#7A6558",
          lineHeight: 1.7,
          textAlign: "center"
        }}>
          <strong>⚕️ Avertissement médical :</strong> Les informations fournies par ArômaThéra sont à titre éducatif et informatif uniquement. 
          Elles ne constituent pas un avis médical et ne remplacent en aucun cas la consultation d'un médecin ou d'un professionnel de santé qualifié. 
          Consultez toujours un professionnel avant de commencer tout traitement.
        </p>
      </div>
    </div>
  );
}