import React from 'react';

/**
 * Parses markdown bold (**text**), italic (*text*), strikethrough (~~text~~), and linebreaks
 * and renders formatted React elements in the screen's native font styling.
 */
export function renderFormattedMarkdown(text) {
  if (!text) return null;

  const lines = String(text).split('\n');

  return lines.map((line, lineIdx) => {
    // Regex matching **bold**, ~~strikethrough~~, *italic*
    const regex = /(\*\*[\s\S]*?\*\*|~~[\s\S]*?~~|\*[\s\S]*?\*)/g;
    const parts = line.split(regex);

    const renderedLine = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={partIdx} style={{ fontWeight: '700', color: 'inherit' }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
        return (
          <del key={partIdx} style={{ textDecoration: 'line-through', opacity: 0.75 }}>
            {part.slice(2, -2)}
          </del>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={partIdx} style={{ fontStyle: 'italic', color: 'inherit' }}>
            {part.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={partIdx}>{part}</React.Fragment>;
    });

    return (
      <React.Fragment key={lineIdx}>
        {renderedLine}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}
