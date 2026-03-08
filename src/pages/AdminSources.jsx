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

const EMPTY_FORM = { title: "", author: "", language: "fr" };

export default function AdminSources() {
  const [sources, setSources] = useState([]);
  const [indexing, setIndexing] = useState({});
  const [loading, setLoading] = useState(true);
  const [totalChunks, setTotalChunks] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [importForm, setImportForm] = useState(EMPTY_FORM);
  const [importFile, setImportFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef(null);

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

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    setImportError("");
    if (!importFile) { setImportError("Veuillez sélectionner un fichier."); return; }
    if (!importForm.title.trim()) { setImportError("Le titre est requis."); return; }

    setUploading(true);
    // Upload the file
    const { file_url } = await base44.integrations.Core.UploadFile({ file: importFile });

    // Create source record
    const sourceRecord = await base44.entities.KnowledgeSource.create({
      title: importForm.title.trim(),
      author: importForm.author.trim(),
      language: importForm.language,
      file_url,
      status: 'pending'
    });
    setSources(prev => [...prev, sourceRecord]);

    // Trigger indexing
    setUploading(false);
    setShowImport(false);
    setImportForm(EMPTY_FORM);
    setImportFile(null);

    await handleIndex({ ...importForm, title: importForm.title.trim(), file_url, _id: sourceRecord.id, _record: sourceRecord });
  };

  const handleIndexById = async (record) => {
    const key = record.title;
    setIndexing(prev => ({ ...prev, [key]: 'indexing' }));
    await base44.functions.invoke('indexSource', {
      source_id: record.id,
      file_url: record.file_url,
      title: record.title,
      author: record.author,
      language: record.language
    });
    setIndexing(prev => ({ ...prev, [key]: 'done' }));
    await loadSources();
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <Loader2 size={36} color="#87A96B" className="leaf-loading" style={{ margin: "0 auto" }} />
      </div>
    );
  }

  const allIndexed = SOURCES.every(s => getSourceStatus(s.title)?.status === 'indexed');
  // Custom sources = sources in DB that are not in the static SOURCES list
  const staticTitles = new Set(SOURCES.map(s => s.title));
  const customSources = sources.filter(s => !staticTitles.has(s.title));

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
          { label: "Sources totales", value: SOURCES.length + customSources.length, icon: BookOpen, color: "#87A96B" },
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

      {/* Toolbar */}
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        {!allIndexed && (
          <button
            onClick={handleIndexAll}
            className="btn-sage"
            disabled={Object.keys(indexing).length > 0}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Zap size={16} />
            Indexer toutes les sources
          </button>
        )}
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => { setShowImport(!showImport); setImportError(""); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              background: showImport ? "rgba(160,82,45,0.08)" : "transparent",
              border: "1.5px solid rgba(160,82,45,0.35)",
              borderRadius: 50, padding: "0.55rem 1.2rem",
              fontFamily: "Inter, sans-serif", fontSize: "0.85rem",
              color: "#A0522D", cursor: "pointer", transition: "all 0.2s"
            }}
          >
            {showImport ? <X size={15} /> : <Plus size={15} />}
            {showImport ? "Annuler" : "Importer une source"}
          </button>
        </div>
      </div>

      {/* Import Form */}
      {showImport && (
        <form onSubmit={handleImportSubmit} className="aroma-card fade-in-up" style={{ padding: "1.75rem", marginBottom: "1.5rem" }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#3D2B1F", marginBottom: "1.25rem" }}>
            Nouvelle source documentaire
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#7A6558", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                Titre *
              </label>
              <input
                className="aroma-input"
                placeholder="Titre du livre"
                value={importForm.title}
                onChange={e => setImportForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#7A6558", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                Auteur
              </label>
              <input
                className="aroma-input"
                placeholder="Auteur(s)"
                value={importForm.author}
                onChange={e => setImportForm(f => ({ ...f, author: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#7A6558", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                Langue
              </label>
              <select
                className="aroma-input"
                value={importForm.language}
                onChange={e => setImportForm(f => ({ ...f, language: e.target.value }))}
                style={{ cursor: "pointer" }}
              >
                <option value="fr">Français</option>
                <option value="en">Anglais</option>
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#7A6558", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                Fichier Markdown / Texte *
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: importFile ? "1.5px solid rgba(135,169,107,0.5)" : "1.5px dashed rgba(135,169,107,0.4)",
                  borderRadius: 12, padding: "0.65rem 1rem",
                  background: importFile ? "rgba(135,169,107,0.06)" : "rgba(254,254,254,0.9)",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "0.6rem",
                  fontFamily: "Inter, sans-serif", fontSize: "0.85rem",
                  color: importFile ? "#6B8F52" : "#9AA889", transition: "all 0.2s"
                }}
              >
                {importFile ? <FileText size={15} color="#6B8F52" /> : <Upload size={15} color="#9AA889" />}
                {importFile ? importFile.name : "Cliquez pour sélectionner un fichier (.md, .txt)"}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,text/plain,text/markdown"
                style={{ display: "none" }}
                onChange={e => setImportFile(e.target.files[0] || null)}
              />
            </div>
          </div>

          {importError && (
            <div style={{ color: "#E74C3C", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <AlertCircle size={14} /> {importError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => { setShowImport(false); setImportFile(null); setImportForm(EMPTY_FORM); }}
              style={{ background: "transparent", border: "1px solid rgba(61,43,31,0.15)", borderRadius: 50, padding: "0.55rem 1.25rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#7A6558", cursor: "pointer" }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-sienna"
              disabled={uploading}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            >
              {uploading ? <Loader2 size={15} className="leaf-loading" /> : <Upload size={15} />}
              {uploading ? "Upload en cours…" : "Importer & Indexer"}
            </button>
          </div>
        </form>
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

      {/* Custom imported sources */}
      {customSources.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#3D2B1F", marginBottom: "1rem" }}>
            Sources importées
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {customSources.map((record) => {
              const state = indexing[record.title];
              const isIndexing = state === 'indexing' || state === 'creating';
              const isDone = record.status === 'indexed';

              return (
                <div key={record.id} className="aroma-card" style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                        <FileText size={16} color="#A0522D" />
                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#3D2B1F" }}>
                          {record.title}
                        </h3>
                      </div>
                      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#9AA889", marginBottom: "0.5rem" }}>
                        {record.author || "—"} · {record.language === 'fr' ? 'Français' : 'Anglais'}
                      </p>
                      {isDone ? (
                        <span style={{ background: "rgba(135,169,107,0.12)", border: "1px solid rgba(135,169,107,0.25)", borderRadius: 50, padding: "0.2rem 0.7rem", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "#6B8F52", fontWeight: 600 }}>
                          ✓ Indexé — {record.chunks_count} chunks
                        </span>
                      ) : (
                        <span style={{ background: "rgba(61,43,31,0.05)", borderRadius: 50, padding: "0.2rem 0.7rem", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "#9AA889" }}>
                          {record.status === 'pending' ? 'En attente' : record.status}
                        </span>
                      )}
                    </div>
                    <div>
                      {isIndexing ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Loader2 size={16} color="#87A96B" className="leaf-loading" />
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#87A96B" }}>Indexation…</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleIndexById(record)}
                          style={{
                            background: isDone ? "transparent" : undefined,
                            border: isDone ? "1px solid rgba(135,169,107,0.3)" : undefined,
                            borderRadius: isDone ? 8 : undefined,
                            padding: isDone ? "0.35rem 0.75rem" : undefined,
                            fontFamily: "Inter, sans-serif", fontSize: "0.75rem",
                            color: "#87A96B", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem"
                          }}
                          className={isDone ? "" : "btn-sage"}
                        >
                          <Database size={13} />
                          {isDone ? "Ré-indexer" : "Indexer"}
                        </button>
                      )}
                    </div>
                  </div>
                  {isIndexing && (
                    <div style={{ height: 3, background: "rgba(135,169,107,0.15)", borderRadius: 50, marginTop: "1rem", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "linear-gradient(90deg, #87A96B, #6B8F52, #87A96B)", backgroundSize: "200% 100%", borderRadius: 50, animation: "shimmer 1.5s ease infinite", width: "60%" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          💡 <strong>Comment ça fonctionne :</strong> Les ouvrages sont analysés de manière exhaustive par l'IA (méthode Long Context). Lors de la création d'une fiche ou d'un diagnostic, l'IA croise les données de l'ensemble des chapitres pour garantir une sécurité et une précision maximales.
        </p>
      </div>
    </div>
  );
}