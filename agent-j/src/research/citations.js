function validUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function normalizedAnnotation(annotation) {
  const citation =
    annotation?.type === "url_citation"
      ? annotation
      : annotation?.url_citation;
  if (!citation) {
    return null;
  }
  const url = validUrl(citation.url);
  if (
    !url ||
    !Number.isInteger(citation.start_index) ||
    !Number.isInteger(citation.end_index)
  ) {
    return null;
  }
  return {
    start: citation.start_index,
    end: citation.end_index,
    url,
    title: String(citation.title || new URL(url).hostname).slice(0, 100),
  };
}

function escapeMarkdownLabel(value) {
  return value.replace(/[[\]]/g, "\\$&");
}

function stripUnverifiedUrls(text) {
  return text.replace(/https?:\/\/[^\s>)\]]+/gi, "[unverified link removed]");
}

export function citedMarkdownFromResponse(response) {
  const blocks = [];
  const sourceMap = new Map();
  const searchedSources = new Map();
  let webSearchCalls = 0;

  for (const item of response?.output ?? []) {
    if (item.type === "web_search_call" && item.status === "completed") {
      webSearchCalls += 1;
      for (const source of item.action?.sources ?? []) {
        const url = validUrl(source.url);
        if (url && !searchedSources.has(url)) {
          searchedSources.set(url, {
            url,
            title: String(source.title || new URL(url).hostname).slice(0, 100),
          });
        }
      }
      continue;
    }
    if (item.type !== "message") {
      continue;
    }
    for (const content of item.content ?? []) {
      if (content.type !== "output_text" || !content.text) {
        continue;
      }
      const annotations = (content.annotations ?? [])
        .map(normalizedAnnotation)
        .filter(Boolean)
        .filter(
          (citation) =>
            citation.start >= 0 &&
            citation.end > citation.start &&
            citation.end <= content.text.length,
        )
        .sort((left, right) => right.start - left.start);
      let text = content.text;
      const placeholders = [];
      for (const citation of annotations) {
        if (!sourceMap.has(citation.url)) {
          sourceMap.set(citation.url, citation);
        }
        const index = [...sourceMap.keys()].indexOf(citation.url) + 1;
        const placeholder = `\u0001CITATION_${placeholders.length}\u0002`;
        placeholders.push({
          placeholder,
          markdown: `[Source ${index}](${citation.url})`,
        });
        text =
          text.slice(0, citation.start) +
          placeholder +
          text.slice(citation.end);
      }
      text = stripUnverifiedUrls(text);
      for (const { placeholder, markdown } of placeholders) {
        text = text.replace(placeholder, markdown);
      }
      blocks.push(text.trim());
    }
  }

  for (const [url, source] of searchedSources) {
    if (sourceMap.size >= 8) {
      break;
    }
    if (!sourceMap.has(url)) {
      sourceMap.set(url, source);
    }
  }
  const sources = [...sourceMap.values()].slice(0, 8);
  let markdown = blocks.filter(Boolean).join("\n\n").trim();
  if (sources.length > 0) {
    const sourceLines = sources.map(
      (source, index) =>
        `${index + 1}. [${escapeMarkdownLabel(source.title)}](${source.url})`,
    );
    markdown += `\n\n**Sources**\n${sourceLines.join("\n")}`;
  }
  return {
    markdown,
    sources,
    webSearchCalls,
    hasRequiredEvidence:
      webSearchCalls > 0 && sources.length > 0 && blocks.length > 0,
  };
}
