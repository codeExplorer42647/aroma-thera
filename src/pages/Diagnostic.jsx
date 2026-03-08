import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AlertBanner from "@/components/diagnostic/AlertBanner";
import Disclaimer from "@/components/diagnostic/Disclaimer";
import DiagnosticProtocol from "@/components/diagnostic/DiagnosticProtocol";
import { Leaf, Send, RotateCcw, Loader2, MessageCircle, BookOpen, Search } from "lucide-react";

// ─── LLM JSON Schema ──────────────────────────────────────────────────────────
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    is_complete: { type: "boolean" },
    next_question: { type: "string" },
    protocol: {
      type: "object",
      properties: {
        summary: { type: "string" },
        synergy: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              latin_name: { type: "string" },
              type: { type: "string", description: "HE | HV | Extrait" },
              drops: { type: "number" },
              percentage: { type: "number" },
              role: { type: "string" },
              is_photosensitizing: { type: "boolean" },
              is_dermocaustic: { type: "boolean" },
              source_reference: { type: "string" }
            }
          }
        },
        carrier: {
          type: "object",
          properties: {
            name: { type: "string" },
            volume_ml: { type: "number" },
            rationale: { type: "string" }
          }
        },
        total_drops_he: { type: "number" },
        total_percentage: { type: "number" },
        application_route: { type: "string", description: "cutanée | orale | respiratoire | mixte" },
        oral_details: {
          type: "object",
          description: "Renseigné uniquement si voie orale utilisée",
          properties: {
            drops_per_dose: { type: "number" },
            support: { type: "string", description: "Ex: capsule végétale, miel, huile d'olive" },
            doses_per_day: { type: "number" },
            meal_timing: { type: "string", description: "Ex: avant les repas, pendant, à jeun" }
          }
        },
        respiratory_details: {
          type: "object",
          description: "Renseigné uniquement si voie respiratoire utilisée",
          properties: {
            method: { type: "string", description: "Ex: diffusion, inhalation sèche, bol d'inhalation" },
            duration_minutes: { type: "number" },
            frequency_per_day: { type: "number" }
          }
        },
        frequency: { type: "string" },
        treatment_duration: { type: "string", description: "Durée totale recommandée (court/moyen/long terme)" },
        protocol_instructions: { type: "string" },
        general_advice: { type: "string" },
        when_to_see_doctor: { type: "string" },
        warnings: { type: "array", items: { type: "string" } }
      }
    }
  },
  required: ["is_complete"]
};

// ─── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(ragContext, readingStrategy) {
  return `Tu es ArômaThéra, un expert en aromathérapie clinique et phytothérapie, spécialisé dans les synergies d'huiles essentielles. Tu conduis un entretien de santé conversationnel pour établir un protocole de soin personnalisé.

${ragContext ? `## SOURCES DOCUMENTAIRES — CHAPITRES COMPLETS SÉLECTIONNÉS
${readingStrategy ? `📚 Stratégie de lecture appliquée : ${readingStrategy}\n` : ''}
Les textes ci-dessous sont des chapitres INTÉGRAUX extraits des ouvrages de référence (Price, Bone, Rhind, Franchomme). Lis-les exhaustivement avant de formuler ta réponse.

RÈGLE ABSOLUE D'ANALYSE TRANSVERSALE :
1. Ne te contente pas de citer des ingrédients. Analyse la logique thérapeutique GLOBALE de chaque auteur.
2. Si une source mentionne une interaction médicamenteuse, une toxicité ou une contre-indication n'importe où dans le texte extrait, elle DOIT primer sur toute recommandation.
3. Croise impérativement les informations entre sources : vérifie une plante suggérée dans les contre-indications d'une autre source avant de valider.
4. Cite explicitement la source et le chapitre (source_reference) pour chaque ingrédient.

${ragContext}

---\n` : ""}

## TON RÔLE CONVERSATIONNEL
- Pose UNE question à la fois, de façon naturelle et bienveillante.
- Analyse l'historique pour décider si tu as assez d'informations pour conclure.
- Tu DOIS impérativement avoir obtenu une réponse sur : symptôme précis, âge, poids, antécédents médicaux, grossesse/allaitement, traitements en cours (notamment anticoagulants/hormonaux) — avant de générer un protocole.
- Si l'une de ces informations manque, continue à questionner (is_complete = false).

## PROTOCOLE FINAL (is_complete = true)
- Génère OBLIGATOIREMENT une synergie multi-ingrédients :
  • 2 à 3 Huiles Essentielles (HE) complémentaires et synergiques
  • 1 Huile Végétale (HV) ou base porteuse adaptée
- Calcule les gouttes avec la formule exacte : Gouttes = Volume(ml) × %dilution × 25
  • Flacon par défaut : 30 ml
  • Dilution cutanée générale : max 3% (max 10% pour usage localisé)
- Justifie chaque HE avec sa source documentaire (champ source_reference : "Auteur, Titre, Chapitre").
- Adapte strictement au profil de sécurité (grossesse, antécédents, traitements).
- Réponds TOUJOURS en français.

## FORMAT DE RÉPONSE JSON
{ "is_complete": false, "next_question": "..." }  ← si informations insuffisantes
{ "is_complete": true, "protocol": { ... } }        ← si diagnostic complet`;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Diagnostic() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(""); // "searching" | "analyzing" | "thinking"
  const [protocol, setProtocol] = useState(null);
  const [ragContext, setRagContext] = useState("");
  const [ragReadingStrategy, setRagReadingStrategy] = useState("");
  const [ragLoaded, setRagLoaded] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Start conversation on mount
  useEffect(() => {
    startConversation();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startConversation = async () => {
    setMessages([{
      role: "assistant",
      content: "Bonjour ! Je suis ArômaThéra, votre conseiller en aromathérapie et phytothérapie. 🌿\n\nPour vous proposer un protocole personnalisé et sûr, je vais vous poser quelques questions.\n\n**Quel est le symptôme ou l'inconfort principal pour lequel vous souhaitez un accompagnement naturel ?**"
    }]);
  };

  const fetchRagContext = async (userMessage) => {
    if (ragLoaded) return { context: ragContext, strategy: ragReadingStrategy };

    setLoadingPhase("searching");
    const topicKeywords = ["stress", "anxiété", "sommeil", "douleur", "digestion", "fatigue", "respiratoire", "peau", "infection"];
    const lower = userMessage.toLowerCase();
    const topic = topicKeywords.find(t => lower.includes(t)) || "general";

    const ragRes = await base44.functions.invoke("ragQuery", {
      query: userMessage + " aromathérapie huile essentielle synergie traitement contre-indication",
      topic_hint: topic,
      top_k: 5
    });

    const ctx = ragRes?.data?.context || "";
    const strategy = ragRes?.data?.reading_strategy || "";
    setRagContext(ctx);
    setRagReadingStrategy(strategy);
    setRagLoaded(true);
    setLoadingPhase("analyzing");
    return { context: ctx, strategy };
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setLoadingPhase("thinking");

    // Fetch RAG context (long context chapters) on first user message
    const { context: ctx, strategy } = await fetchRagContext(text);

    setLoadingPhase("analyzing");

    // Build conversation history string for the LLM
    const historyText = newMessages
      .map(m => `${m.role === "user" ? "Patient" : "ArômaThéra"}: ${m.content}`)
      .join("\n\n");

    const prompt = `${buildSystemPrompt(ctx, strategy)}

## HISTORIQUE DE LA CONVERSATION
${historyText}

Réponds maintenant en JSON strict selon le schéma fourni.`;

    setLoadingPhase("thinking");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: RESPONSE_SCHEMA
    });

    if (res?.is_complete && res?.protocol) {
      setProtocol(res.protocol);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "J'ai maintenant toutes les informations nécessaires. J'ai analysé les chapitres pertinents de nos sources de référence pour vous proposer un protocole fondé sur la littérature spécialisée. Voici votre synergie personnalisée ✨"
      }]);
    } else {
      const question = res?.next_question || "Pouvez-vous me donner plus de détails ?";
      setMessages(prev => [...prev, { role: "assistant", content: question }]);
    }

    setLoading(false);
    setLoadingPhase("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleReset = () => {
    setMessages([]);
    setProtocol(null);
    setInput("");
    setRagContext("");
    setRagReadingStrategy("");
    setRagLoaded(false);
    setLoadingPhase("");
    startConversation();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fade-in-up" style={{ maxWidth: 700, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#3D2B1F", marginBottom: "0.4rem" }}>
          Diagnostic Conversationnel
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", color: "#7A6558", fontSize: "0.88rem" }}>
          Répondez aux questions pour obtenir une synergie personnalisée
        </p>
      </div>

      {/* Chat Area */}
      <div className="aroma-card" style={{ padding: "1.5rem", marginBottom: "1rem", minHeight: 300, maxHeight: 480, overflowY: "auto" }}>
        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.75rem 1rem", marginBottom: "0.5rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #87A96B, #6B8F52)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {loadingPhase === "searching"
                ? <Search size={14} color="white" className="leaf-loading" />
                : loadingPhase === "analyzing"
                  ? <BookOpen size={14} color="white" className="leaf-loading" />
                  : <Leaf size={14} color="white" className="leaf-loading" />
              }
            </div>
            <div>
              <div style={{ display: "flex", gap: 4, marginBottom: "0.35rem" }}>
                {[0, 1, 2].map(j => (
                  <div key={j} style={{
                    width: 7, height: 7, borderRadius: "50%", background: "#87A96B",
                    animation: `dotPulse 1.2s ease-in-out ${j * 0.2}s infinite`
                  }} />
                ))}
              </div>
              {loadingPhase === "searching" && (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "#87A96B", fontStyle: "italic" }}>
                  Exploration de la table des matières des ouvrages de référence…
                </div>
              )}
              {loadingPhase === "analyzing" && (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "#A0522D", fontStyle: "italic" }}>
                  Analyse exhaustive des chapitres sélectionnés en cours… {ragReadingStrategy && <span style={{ opacity: 0.8 }}>({ragReadingStrategy})</span>}
                </div>
              )}
              {loadingPhase === "thinking" && (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "#6B5744", fontStyle: "italic" }}>
                  Synthèse croisée des sources et validation du protocole…
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Protocol Result */}
      {protocol && (
        <div style={{ marginBottom: "1rem" }}>
          <DiagnosticProtocol protocol={protocol} />
        </div>
      )}

      {/* Input Area */}
      {!protocol && (
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <textarea
            ref={inputRef}
            className="aroma-input"
            rows={2}
            placeholder="Répondez à la question ci-dessus…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            style={{ resize: "none", flex: 1, lineHeight: 1.5 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="btn-sage"
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              width: 48, height: 48, padding: 0, borderRadius: 14,
              opacity: !input.trim() || loading ? 0.5 : 1,
              alignSelf: "flex-end"
            }}
          >
            {loading ? <Loader2 size={18} className="leaf-loading" /> : <Send size={18} />}
          </button>
        </div>
      )}

      {/* Reset */}
      {(messages.length > 1 || protocol) && (
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <button
            onClick={handleReset}
            style={{
              background: "transparent",
              border: "1.5px solid rgba(135,169,107,0.3)",
              borderRadius: 50,
              padding: "0.5rem 1.25rem",
              fontFamily: "Inter, sans-serif",
              fontSize: "0.82rem",
              color: "#6B8F52",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            <RotateCcw size={14} /> Nouveau diagnostic
          </button>
        </div>
      )}

      <Disclaimer />

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

// ─── Chat Bubble ───────────────────────────────────────────────────────────────
function ChatBubble({ message }) {
  const isAssistant = message.role === "assistant";

  // Simple markdown bold rendering
  const renderContent = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div style={{
      display: "flex",
      gap: "0.75rem",
      marginBottom: "1rem",
      flexDirection: isAssistant ? "row" : "row-reverse"
    }}>
      {isAssistant && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #87A96B, #6B8F52)",
          display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2
        }}>
          <Leaf size={14} color="white" />
        </div>
      )}
      {!isAssistant && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: "rgba(160,82,45,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2
        }}>
          <MessageCircle size={14} color="#A0522D" />
        </div>
      )}
      <div style={{
        maxWidth: "80%",
        background: isAssistant ? "rgba(135,169,107,0.08)" : "rgba(160,82,45,0.07)",
        border: isAssistant ? "1px solid rgba(135,169,107,0.18)" : "1px solid rgba(160,82,45,0.15)",
        borderRadius: isAssistant ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
        padding: "0.75rem 1rem",
      }}>
        <p style={{
          fontFamily: "Inter, sans-serif", fontSize: "0.88rem",
          color: "#3D2B1F", lineHeight: 1.65, margin: 0,
          whiteSpace: "pre-wrap"
        }}>
          {renderContent(message.content)}
        </p>
      </div>
    </div>
  );
}