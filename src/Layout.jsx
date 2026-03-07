import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Leaf, FlaskConical, BookOpen, Calculator, Menu, X } from "lucide-react";

const navItems = [
  { name: "Accueil", page: "Home", icon: Leaf },
  { name: "Diagnostic", page: "Diagnostic", icon: FlaskConical },
  { name: "Calculateur", page: "Calculator", icon: Calculator },
  { name: "Plantes", page: "PlantLibrary", icon: BookOpen },
];

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F5DC" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
      `}</style>

      {/* Top Navigation */}
      <nav style={{
        background: "rgba(254,254,254,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(135,169,107,0.18)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 2px 20px rgba(61,43,31,0.06)"
      }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link to={createPageUrl("Home")} className="flex items-center gap-3 no-underline" style={{ textDecoration: "none" }}>
            <div style={{
              width: 38,
              height: 38,
              background: "linear-gradient(135deg, #87A96B, #6B8F52)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(135,169,107,0.35)"
            }}>
              <Leaf size={20} color="white" />
            </div>
            <div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "#3D2B1F",
                lineHeight: 1.1
              }}>ArômaThéra</div>
              <div style={{ fontSize: "0.65rem", color: "#87A96B", letterSpacing: "0.08em", fontFamily: "Inter, sans-serif" }}>AROMATHÉRAPIE & PHYTOTHÉRAPIE</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map(({ name, page, icon: Icon }) => {
              const isActive = currentPageName === page;
              return (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.5rem 1rem",
                    borderRadius: 50,
                    textDecoration: "none",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "0.85rem",
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? "linear-gradient(135deg, #87A96B, #6B8F52)" : "transparent",
                    color: isActive ? "white" : "#6B5744",
                    transition: "all 0.25s ease",
                    boxShadow: isActive ? "0 4px 12px rgba(135,169,107,0.3)" : "none"
                  }}
                >
                  <Icon size={15} />
                  {name}
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6B5744" }}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div style={{
            background: "rgba(254,254,254,0.98)",
            borderTop: "1px solid rgba(135,169,107,0.15)",
            padding: "1rem 1.5rem"
          }}>
            {navItems.map(({ name, page, icon: Icon }) => {
              const isActive = currentPageName === page;
              return (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    borderRadius: 12,
                    textDecoration: "none",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "0.9rem",
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? "rgba(135,169,107,0.12)" : "transparent",
                    color: isActive ? "#6B8F52" : "#6B5744",
                    marginBottom: "0.25rem"
                  }}
                >
                  <Icon size={18} />
                  {name}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Page Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        background: "rgba(61,43,31,0.04)",
        borderTop: "1px solid rgba(135,169,107,0.15)",
        marginTop: "4rem",
        padding: "2rem 1.5rem",
        textAlign: "center"
      }}>
        <div style={{ fontFamily: "'Playfair Display', serif", color: "#87A96B", fontSize: "1rem", marginBottom: "0.5rem" }}>
          ArômaThéra
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "#9AA889", maxWidth: 600, margin: "0 auto 0.5rem" }}>
          Cette application est fournie à titre informatif uniquement et ne remplace pas l'avis d'un professionnel de santé qualifié.
        </p>
        <p style={{ fontSize: "0.7rem", color: "#B8B8A0" }}>
          © 2026 ArômaThéra — Tous droits réservés
        </p>
      </footer>
    </div>
  );
}