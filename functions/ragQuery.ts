import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Phase 1: Score sections by relevance to query ───────────────────────────
function scoreSection(section, queryTerms) {
  // Title match is weighted 4x, summary 2x, content 1x
  const titleText = (section.section_title || section.source_title || '').toLowerCase();
  const summaryText = (section.summary || '').toLowerCase();
  const contentText = (section.content || '').toLowerCase();
  const keywordsText = (section.keywords || []).join(' ').toLowerCase();
  const topicsText = (section.topics || []).join(' ').toLowerCase();

  let score = 0;
  for (const term of queryTerms) {
    const t = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(t, 'gi');
    score += (titleText.match(re) || []).length * 4;
    score += (summaryText.match(re) || []).length * 2;
    score += (contentText.match(re) || []).length * 1;
    score += (keywordsText.match(re) || []).length * 1.5;
    score += (topicsText.match(re) || []).length * 3;
    score += term.length > 6 ? score * 0.2 : 0; // bonus for longer terms
  }
  return score;
}

function extractQueryTerms(query) {
  const stopWords = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'à', 'en', 'dans', 'pour',
    'sur', 'avec', 'par', 'que', 'qui', 'est', 'sont', 'avoir', 'être', 'je', 'mon', 'ma', 'mes',
    'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'on', 'with', 'is', 'are', 'was',
    'how', 'what', 'when', 'where', 'my', 'comment', 'quoi', 'quel', 'quelle'
  ]);
  return query
    .toLowerCase()
    .replace(/[?!.,;]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
}

// ─── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { query, topic_hint, top_k = 5 } = await req.json();

  if (!query) {
    return Response.json({ error: 'query required' }, { status: 400 });
  }

  const queryTerms = extractQueryTerms(query);

  // ── Phase 1: Load ALL section metadata (titles + summaries only) ──────────
  // We fetch up to 1000 records but only use metadata fields for exploration
  const allSections = await base44.asServiceRole.entities.KnowledgeChunk.list('-chunk_index', 1000);

  if (!allSections.length) {
    return Response.json({ context: '', chapters_found: 0, query_terms: queryTerms });
  }

  // Score all sections using titles, summaries, topics, keywords
  const scored = allSections
    .map(sec => ({ ...sec, score: scoreSection(sec, queryTerms) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // ── Phase 2: Extract full content of top N sections ───────────────────────
  // Always include safety/toxicity sections if present
  const safetyRe = /toxicit|contraindic|précaution|interaction|safety|danger/i;
  const safetySections = scored.filter(s =>
    safetyRe.test(s.section_title || '') || (s.topics || []).includes('safety')
  ).slice(0, 2);

  const topSections = scored.slice(0, top_k);

  // Merge: top scored + safety, deduplicate by id
  const selectedIds = new Set();
  const selected = [];
  for (const s of [...topSections, ...safetySections]) {
    if (!selectedIds.has(s.id)) {
      selectedIds.add(s.id);
      selected.push(s);
    }
  }

  // Build reading strategy summary (for UI display)
  const readingStrategy = selected.map(s =>
    `"${s.section_title || 'Section'}" (${s.source_title})`
  ).join(', ');

  // Build rich context with full chapter content
  const context = selected.map((sec, i) => {
    const lines = [
      `═══ [Source ${i + 1}/${selected.length}] ${sec.source_title} ═══`,
      `📖 Chapitre : ${sec.section_title || 'N/A'}`,
      `🏷 Sujets : ${(sec.topics || []).join(', ') || 'général'}`,
      ``,
      sec.content
    ];
    return lines.join('\n');
  }).join('\n\n' + '─'.repeat(60) + '\n\n');

  return Response.json({
    context,
    chapters_found: selected.length,
    reading_strategy: readingStrategy,
    query_terms: queryTerms,
    total_chars: context.length
  });
});