import React, { useEffect, useRef, useState } from 'react';

// Distance from the viewport at which a month starts rendering its cards (so it is ready before it shows)
const RENDER_AHEAD_MARGIN = '1500px 0px';

/**
 * Renders a month's cards only when the month comes near the viewport (large timeboards have thousands of
 * cards: rendering every month at once made each switch slow). Until then a placeholder keeps the estimated
 * height, so the scroll position and the "today" positioning stay right. Once rendered, it stays rendered.
 * `children` is a function, so the cards of far months are not even created.
 */
export default function LazyMonthBody({ eager = false, estimatedHeight = 0, children }) {
  const placeholderRef = useRef(null);
  const [isNear, setIsNear] = useState(eager);
  const shouldRender = eager || isNear;

  useEffect(() => {
    if (shouldRender) return undefined;
    const node = placeholderRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsNear(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setIsNear(true);
        observer.disconnect();
      }
    }, { rootMargin: RENDER_AHEAD_MARGIN });
    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldRender]);

  if (shouldRender) return children();
  return <div ref={placeholderRef} aria-hidden="true" style={{ minHeight: `${estimatedHeight}px` }} />;
}
