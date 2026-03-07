import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Splits text into meaningful chunks of ~1500 chars with overlap
function splitIntoChunks(text, chunkSize = 1500, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + chunkSize;
    // Try to break at paragraph boundary
    if (end < text.length) {
      const breakAt = text.lastIndexOf('\n\n', end);
      if (breakAt > start + 500) end = breakAt;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 100) chunks.push(chunk);
    start = end - overlap;
  }
  return chunks;
}

// Extract keywords from chunk using simple NLP
function extractKeywords(text) {
  const aromatherapyTerms = [
    'lavender', 'tea tree', 'eucalyptus', 'peppermint', 'bergamot', 'ylang',
    'chamomile', 'rosemary', 'frankincense', 'geranium', 'lemon', 'orange',
    'lavande', 'menthe', 'romarin', 'camomille', 'géranium', 'citron',
    'huile essentielle', 'essential oil', 'aromatherapy', 'aromathérapie',
    'phytotherapy', 'phytothérapie', 'terpene', 'monoterpene', 'sesquiterpene',
    'linalool', 'limonene', 'cineole', 'menthol', 'thymol', 'carvacrol',
    'anxiety', 'stress', 'insomnia', 'pain', 'infection', 'inflammation',
    'anxiété', 'insomnie', 'douleur', 'infection', 'inflammation',
    'pregnancy', 'grossesse', 'children', 'enfant', 'dilution', 'carrier oil',
    'topical', 'inhalation', 'diffusion', 'massage', 'contraindication',
    'contre-indication', 'photosensitive', 'photosensibilisant', 'dermocaustic'
  ];
  
  const lowerText = text.toLowerCase();
  const found = aromatherapyTerms.filter(term => lowerText.includes(term.toLowerCase()));
  
  // Also extract capitalized words (likely plant names)
  const capitalWords = (text.match(/\b[A-Z][a-z]{3,}\b/g) || [])
    .filter(w => !['The', 'This', 'That', 'With', 'From', 'When', 'Where', 'They', 'These'].includes(w));
  
  return [...new Set([...found, ...capitalWords.slice(0, 5)])];
}

function detectTopic(text) {
  const lower = text.toLowerCase();
  if (lower.match(/lavend|lavande/)) return 'lavender';
  if (lower.match(/tea tree|melaleuca/)) return 'tea tree';
  if (lower.match(/eucalyptus/)) return 'eucalyptus';
  if (lower.match(/peppermint|menthe poivr/)) return 'peppermint';
  if (lower.match(/bergamot|bergamote/)) return 'bergamot';
  if (lower.match(/chamomil|camomille/)) return 'chamomile';
  if (lower.match(/rosemary|romarin/)) return 'rosemary';
  if (lower.match(/geranium|géranium/)) return 'geranium';
  if (lower.match(/frankincense|boswellia/)) return 'frankincense';
  if (lower.match(/ylang/)) return 'ylang-ylang';
  if (lower.match(/anxiet|stress|nervous|nerveux|anxiét/)) return 'anxiety-stress';
  if (lower.match(/insomni|sleep|sommeil/)) return 'sleep';
  if (lower.match(/pain|douleur|analges/)) return 'pain';
  if (lower.match(/infect|antibacter|antimicro/)) return 'infection';
  if (lower.match(/skin|peau|derma|cutane/)) return 'skin';
  if (lower.match(/respir|bronch|cough|toux/)) return 'respiratory';
  if (lower.match(/digest|intestin|gastro/)) return 'digestion';
  if (lower.match(/pregnanc|grossesse|maternit/)) return 'pregnancy';
  if (lower.match(/children|enfant|bébé|baby/)) return 'children';
  if (lower.match(/dilution|carrier|porteur|blend|mélange/)) return 'blending';
  return 'general';
}

// Clean markdown artifacts
function cleanText(text) {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links -> text
    .replace(/#{1,6}\s/g, '') // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/`([^`]+)`/g, '$1') // code
    .replace(/---[\s\S]*?---/m, '') // frontmatter
    .replace(/<[^>]+>/g, '') // HTML tags
    .replace(/\n{3,}/g, '\n\n') // excess newlines
    .trim();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { source_id, file_url, title, author, language } = await req.json();

  // Fetch and clean the markdown file
  const response = await fetch(file_url);
  const rawText = await response.text();
  const cleanedText = cleanText(rawText);

  // Split into chunks
  const chunks = splitIntoChunks(cleanedText, 1500, 200);

  // Batch insert chunks (max 50 at a time to avoid timeout)
  const BATCH = 50;
  let totalInserted = 0;

  for (let i = 0; i < Math.min(chunks.length, 500); i += BATCH) {
    const batch = chunks.slice(i, i + BATCH).map((content, j) => ({
      source_id,
      source_title: title,
      content,
      keywords: extractKeywords(content),
      topic: detectTopic(content),
      chunk_index: i + j
    }));

    await base44.asServiceRole.entities.KnowledgeChunk.bulkCreate(batch);
    totalInserted += batch.length;
  }

  // Update source status
  await base44.asServiceRole.entities.KnowledgeSource.update(source_id, {
    status: 'indexed',
    chunks_count: totalInserted
  });

  return Response.json({ success: true, chunks_indexed: totalInserted });
});