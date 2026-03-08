import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Markdown → Sections (Long Context) ─────────────────────────────────────
// Splits a document by H1/H2 headings, preserving full chapter content.
// Falls back to logical page breaks (---) then 8000-char soft sections.

function splitIntoSections(rawText) {
  const lines = rawText.split('\n');
  const sections = [];
  let currentTitle = 'Introduction';
  let currentLines = [];
  let sectionIndex = 0;

  const flush = () => {
    const content = currentLines.join('\n').trim();
    if (content.length > 80) {
      sections.push({ title: currentTitle, content, index: sectionIndex++ });
    }
    currentLines = [];
  };

  for (const line of lines) {
    // Detect H1 or H2 headings as section boundaries
    const headingMatch = line.match(/^(#{1,2})\s+(.+)/);
    if (headingMatch) {
      flush();
      currentTitle = headingMatch[2].trim();
    } else if (line.trim() === '---' && currentLines.length > 10) {
      // Page break acts as section boundary if enough content
      flush();
      currentTitle = `Section ${sectionIndex + 1}`;
    } else {
      currentLines.push(line);
    }
  }
  flush();

  // Safety: if any section exceeds 12000 chars, split it at H3 boundaries
  const finalSections = [];
  for (const sec of sections) {
    if (sec.content.length <= 12000) {
      finalSections.push(sec);
      continue;
    }
    // Sub-split at H3
    const subLines = sec.content.split('\n');
    let subTitle = sec.title;
    let subLines2 = [];
    let subIndex = 0;
    for (const l of subLines) {
      const h3 = l.match(/^###\s+(.+)/);
      if (h3 && subLines2.length > 5) {
        const subContent = subLines2.join('\n').trim();
        if (subContent.length > 80) {
          finalSections.push({ title: `${sec.title} — ${subTitle}`, content: subContent, index: sec.index + subIndex++ });
        }
        subTitle = h3[1].trim();
        subLines2 = [];
      } else {
        subLines2.push(l);
      }
    }
    const last = subLines2.join('\n').trim();
    if (last.length > 80) {
      finalSections.push({ title: `${sec.title} — ${subTitle}`, content: last, index: sec.index + subIndex });
    }
  }

  return finalSections;
}

// ─── Section metadata ────────────────────────────────────────────────────────
function buildSummary(content) {
  // Extract first 400 chars as summary after removing markdown syntax
  const cleaned = content
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/`[^`]+`/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{2,}/g, ' ')
    .trim();
  return cleaned.slice(0, 400);
}

function detectTopics(content) {
  const lower = content.toLowerCase();
  const topicMap = {
    'anxiety-stress': /anxiet|stress|nervous|nerveux|anxiét|tension/,
    sleep: /insomni|sleep|sommeil|repos/,
    pain: /pain|douleur|analges|anti-inflam/,
    infection: /infect|antibacter|antimicro|antiviral|antisept/,
    skin: /skin|peau|derma|cutane|topical|wound/,
    respiratory: /respir|bronch|cough|toux|pulmon/,
    digestion: /digest|intestin|gastro|nausea|nausée/,
    pregnancy: /pregnanc|grossesse|maternit|lactat|allaitement/,
    children: /children|enfant|bébé|baby|pediatr/,
    blending: /dilution|carrier|porteur|blend|mélange|synerg/,
    pharmacology: /pharmaco|mechanism|propriét|biochem|constituant/,
    safety: /toxicit|contraindic|précaution|interac|warning|danger/,
    lavender: /lavend|lavande/,
    eucalyptus: /eucalyptus/,
    peppermint: /peppermint|menthe/,
    chamomile: /chamomil|camomille/,
    rosemary: /romarin|rosemary/,
    frankincense: /frankincense|boswellia/,
  };
  return Object.entries(topicMap)
    .filter(([, re]) => re.test(lower))
    .map(([topic]) => topic);
}

function extractKeywords(content) {
  const terms = [
    'lavender', 'tea tree', 'eucalyptus', 'peppermint', 'bergamot', 'ylang',
    'chamomile', 'rosemary', 'frankincense', 'geranium', 'lemon', 'orange',
    'lavande', 'menthe', 'romarin', 'camomille', 'géranium', 'citron',
    'huile essentielle', 'essential oil', 'aromatherapy', 'aromathérapie',
    'phytotherapy', 'phytothérapie', 'linalool', 'limonene', 'cineole',
    'anxiety', 'stress', 'insomnia', 'pain', 'infection', 'inflammation',
    'pregnancy', 'grossesse', 'dilution', 'carrier oil', 'inhalation',
    'contraindication', 'photosensibilisant', 'dermocaustic', 'toxicité',
  ];
  const lower = content.toLowerCase();
  const found = terms.filter(t => lower.includes(t));
  const caps = (content.match(/\b[A-Z][a-z]{3,}\b/g) || [])
    .filter(w => !['The', 'This', 'That', 'With', 'From', 'When'].includes(w));
  return [...new Set([...found, ...caps.slice(0, 8)])];
}

// ─── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { source_id, file_url, title, author, language } = await req.json();

  const response = await fetch(file_url);
  const rawText = await response.text();

  // Split into full sections (long context)
  const sections = splitIntoSections(rawText);

  // Build table of contents
  const tableOfContents = sections.map(s => ({
    index: s.index,
    title: s.title,
    char_count: s.content.length
  }));

  // Batch insert sections
  const BATCH = 20;
  let totalInserted = 0;

  for (let i = 0; i < sections.length; i += BATCH) {
    const batch = sections.slice(i, i + BATCH).map(sec => ({
      source_id,
      source_title: title,
      content: sec.content,
      summary: buildSummary(sec.content),
      section_title: sec.title,
      topics: detectTopics(sec.content),
      keywords: extractKeywords(sec.content),
      topic: detectTopics(sec.content)[0] || 'general',
      chunk_index: sec.index,
      char_count: sec.content.length
    }));

    await base44.asServiceRole.entities.KnowledgeChunk.bulkCreate(batch);
    totalInserted += batch.length;
  }

  // Update source with TOC and status
  await base44.asServiceRole.entities.KnowledgeSource.update(source_id, {
    status: 'indexed',
    chunks_count: totalInserted,
    table_of_contents: JSON.stringify(tableOfContents)
  });

  return Response.json({
    success: true,
    sections_indexed: totalInserted,
    table_of_contents: tableOfContents
  });
});