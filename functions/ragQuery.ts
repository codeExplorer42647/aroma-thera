import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Simple BM25-like keyword scoring
function scoreChunk(chunk, queryTerms) {
  const text = (chunk.content + ' ' + (chunk.keywords || []).join(' ')).toLowerCase();
  let score = 0;
  for (const term of queryTerms) {
    const regex = new RegExp(term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = (text.match(regex) || []).length;
    score += matches * (term.length > 6 ? 2 : 1); // longer terms get higher weight
  }
  return score;
}

function extractQueryTerms(query) {
  // French + English stop words
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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { query, topic_hint, top_k = 6 } = await req.json();

  if (!query) {
    return Response.json({ error: 'query required' }, { status: 400 });
  }

  // Get all chunks (we'll filter and score client-side)
  // Try topic filter first for efficiency
  let chunks = [];

  if (topic_hint) {
    chunks = await base44.asServiceRole.entities.KnowledgeChunk.filter(
      { topic: topic_hint }, '-chunk_index', 200
    );
  }

  // If few results or no topic, get broader set
  if (chunks.length < 20) {
    const allChunks = await base44.asServiceRole.entities.KnowledgeChunk.list('-chunk_index', 400);
    // Merge and deduplicate
    const ids = new Set(chunks.map(c => c.id));
    chunks = [...chunks, ...allChunks.filter(c => !ids.has(c.id))];
  }

  // Score and rank
  const queryTerms = extractQueryTerms(query);
  const scored = chunks
    .map(chunk => ({ ...chunk, score: scoreChunk(chunk, queryTerms) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, top_k);

  // Format context for LLM
  const context = scored.map((chunk, i) =>
    `[Source ${i + 1}: ${chunk.source_title}]\n${chunk.content}`
  ).join('\n\n---\n\n');

  return Response.json({
    context,
    chunks_found: scored.length,
    query_terms: queryTerms
  });
});