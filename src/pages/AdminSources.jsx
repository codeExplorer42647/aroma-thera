import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen, Loader2, CheckCircle, AlertCircle, Database, Zap, Plus, Upload, X, FileText } from "lucide-react";

const SOURCES = [
  {
    title: "Aromatherapy for Health Professionals",
    author: "Shirley Price, Len Price & Penny Price",
    language: "en",
    file_url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69aca7b7965469fd2fc502a9/da73cb76d_AromatherapyforHealthProfessionalsRevisedReprint-ShirleyPriceLenPricePennyPrice.md"
  },
  {
    title: "Contemporary Phytomedicines",
    author: "Amritpal Singh Saroya",
    language: "fr",
    file_url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69aca7b7965469fd2fc502a9/4bc9ec1a4_ContemporaryPhytomedicines-AmritpalSinghSaroya.md"
  },
  {
    title: "Essential Oils — A Comprehensive Handbook for Aromatic Therapy (3rd Ed.)",
    author: "Jennifer Peace Rhind",
    language: "fr",
    file_url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69aca7b7965469fd2fc502a9/edfa037bb_EssentialOilsFullyRevisedandUpdated3rdEdition_AComprehensiveHandbookforAromaticTherapy-JenniferPeaceRhind.md"
  },
  {
    title: "Le guide de la médecine globale et intégrative",
    author: "Luc Bodin",
    language: "fr",
    file_url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69aca7b7965469fd2fc502a9/8916d2487_Leguidedelamdecineglobaleetintgrative.md"
  }
];

export default function AdminSources() {
  const [sources, setSources] = useState([]);
  const [indexing, setIndexing] = useState({});
  const [loading, setLoading] = useState(true);
  const [totalChunks, setTotalChunks] = useState(0);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoading(true);
    const [existingSources, chunks] = await Promise.all([
      base44.entities.KnowledgeSource.list(),
      base44.entities.KnowledgeChunk.list('-chunk_index', 1)
    ]);
    setSources(existingSources);
    // Count total
    const allChunks = await base44.entities.KnowledgeChunk.list('-chunk_index', 1000);
    setTotalChunks(allChunks.length);
    setLoading(false);
  };

  const handleIndex = async (sourceDef) => {
    setIndexing(prev => ({ ...prev, [sourceDef.title]: 'creating' }));

    // Create or find source record
    let sourceRecord = sources.find(s => s.title === sourceDef.title);
    if (!sourceRecord) {
      sourceRecord = await base44.entities.KnowledgeSource.create({
        title: sourceDef.title,
        author: sourceDef.author,
        language: sourceDef.language,
        file_url: sourceDef.file_url,
        status: 'pending'
      });
      setSources(prev => [...prev, sourceRecord]);
    }

    setIndexing(prev => ({ ...prev, [sourceDef.title]: 'indexing' }));

    const res = await base44.functions.invoke('indexSource', {
      source_id: sourceRecord.id,
      file_url: sourceDef.file_url,
      title: sourceDef.title,
      author: sourceDef.author,
      language: sourceDef.language
    });

    setIndexing(prev => ({ ...prev, [sourceDef.title]: 'done' }));
    await loadSources();
  };

  const handleIndexAll = async () => {
    for (const src of SOURCES) {
      const existing = sources.find(s => s.title === src.title);
      if (existing?.status === 'indexed') continue;
      await handleIndex(src);
    }
  };

  const getSourceStatus = (title) => {
    return sources.find(s => s.title === title);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <Loader2 size={36} color="#87A96B" className="leaf-loading" style={{ margin: "0 auto" }} />
      </div>
    );
  }

  const allIndexed = SOURCES.every(s => getSourceStatus(s.title)?.status === 'indexed');

  return (
    <div className="fade-in-up" style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#3D2B1F", marginBottom: "0.4rem" }}>
          Sources Documentaires
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", color: "#7A6558", fontSize: "0.9rem" }}>
          Base de connaissances RAG — Indexez les livres de référence pour enrichir l'IA
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Sources disponibles", value: SOURCES.length, icon: BookOpen, color: "#87A96B" },
          { label: "Sources indexées", value: sources.filter(s => s.status === 'indexed').length, icon: CheckCircle, color: "#6B8F52" },
          { label: "Chunks en base", value: totalChunks.toLocaleString(), icon: Database, color: "#A0522D" }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="aroma-card" style={{ padding: "1.25rem", textAlign: "center" }}>
            <Icon size={20} color={color} style={{ margin: "0 auto 0.5rem" }} />
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color }}>
              {value}
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "#9AA889" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Index All button */}
      {!allIndexed && (
        <div style={{ marginBottom: "1.5rem", textAlign: "right" }}>
          <button
            onClick={handleIndexAll}
            className="btn-sage"
            disabled={Object.keys(indexing).length > 0}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Zap size={16} />
            Indexer toutes les sources
          </button>
        </div>
      )}

      {/* Source list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {SOURCES.map((src) => {
          const record = getSourceStatus(src.title);
          const state = indexing[src.title];
          const isIndexing = state === 'indexing' || state === 'creating';
          const isDone = record?.status === 'indexed';

          return (
            <div key={src.title} className="aroma-card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                    <BookOpen size={16} color="#87A96B" />
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#3D2B1F" }}>
                      {src.title}
                    </h3>
                  </div>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#9AA889", marginBottom: "0.5rem" }}>
                    {src.author} · {src.language === 'fr' ? 'Français' : 'Anglais'}
                  </p>
                  {isDone && (
                    <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                      <span style={{
                        background: "rgba(135,169,107,0.12)",
                        border: "1px solid rgba(135,169,107,0.25)",
                        borderRadius: 50,
                        padding: "0.2rem 0.7rem",
                        fontFamily: "Inter, sans-serif",
                        fontSize: "0.72rem",
                        color: "#6B8F52",
                        fontWeight: 600
                      }}>
                        ✓ Indexé — {record?.chunks_count} chunks
                      </span>
                    </div>
                  )}
                  {!isDone && !record && (
                    <span style={{
                      background: "rgba(61,43,31,0.05)",
                      borderRadius: 50,
                      padding: "0.2rem 0.7rem",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "0.72rem",
                      color: "#9AA889"
                    }}>
                      Non indexé
                    </span>
                  )}
                </div>

                <div>
                  {isDone ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <CheckCircle size={18} color="#87A96B" />
                      <button
                        onClick={() => handleIndex(src)}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(135,169,107,0.3)",
                          borderRadius: 8,
                          padding: "0.35rem 0.75rem",
                          fontFamily: "Inter, sans-serif",
                          fontSize: "0.75rem",
                          color: "#87A96B",
                          cursor: "pointer"
                        }}
                      >
                        Ré-indexer
                      </button>
                    </div>
                  ) : isIndexing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Loader2 size={16} color="#87A96B" className="leaf-loading" />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#87A96B" }}>
                        {state === 'creating' ? 'Création…' : 'Indexation…'}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleIndex(src)}
                      className="btn-sage"
                      style={{ padding: "0.5rem 1.25rem", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      <Database size={14} />
                      Indexer
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {isIndexing && (
                <div style={{
                  height: 3,
                  background: "rgba(135,169,107,0.15)",
                  borderRadius: 50,
                  marginTop: "1rem",
                  overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #87A96B, #6B8F52, #87A96B)",
                    backgroundSize: "200% 100%",
                    borderRadius: 50,
                    animation: "shimmer 1.5s ease infinite",
                    width: "60%"
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>

      <div style={{
        marginTop: "2rem",
        padding: "1rem 1.25rem",
        background: "rgba(135,169,107,0.06)",
        borderRadius: 12,
        border: "1px solid rgba(135,169,107,0.15)"
      }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#6B8F52", lineHeight: 1.6 }}>
          💡 <strong>Comment ça fonctionne :</strong> Chaque livre est découpé en chunks de ~1500 caractères 
          et indexé dans la base de données. Lors d'un diagnostic, l'IA recherche les passages les plus 
          pertinents et les intègre dans son prompt pour des réponses basées sur vos sources.
        </p>
      </div>
    </div>
  );
}