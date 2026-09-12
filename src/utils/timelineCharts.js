export const getCoordinatesForPercent = (percent) => {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
};

export const computePieSlices = (items) => {
  let cumulativePercent = 0;
  const normalizedItems = (items || []).filter((s) => (Number(s.percent ?? s.pct) || 0) > 0);

  if (normalizedItems.length === 1) {
    const s = normalizedItems[0];
    const pct = Number(s.percent ?? s.pct) || 0;
    return [{
      ...s,
      percent: pct,
      pathData: 'M 1 0 A 1 1 0 1 1 -0.999 0 A 1 1 0 1 1 1 0 L 0 0 Z'
    }];
  }

  const total = normalizedItems.reduce((acc, s) => acc + (Number(s.percent ?? s.pct) || 0), 0);
  const scale = total > 0 ? (total > 100 ? 1 / total : 1 / 100) : 1 / 100;

  return normalizedItems.map((slice) => {
    const percentVal = Number(slice.percent ?? slice.pct) || 0;
    const fraction = percentVal * scale;
    const startPercent = cumulativePercent;
    cumulativePercent += fraction;
    const endPercent = Math.min(0.99999, cumulativePercent);
    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);
    const largeArcFlag = fraction > 0.5 ? 1 : 0;
    const pathData = fraction >= 0.999
      ? 'M 1 0 A 1 1 0 1 1 -0.999 0 A 1 1 0 1 1 1 0 L 0 0 Z'
      : [
          `M ${startX} ${startY}`,
          `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
          'L 0 0 Z'
        ].join(' ');
    return { ...slice, percent: percentVal, pathData };
  });
};

export const computeDonutSlice = (percent) => {
  const usedFraction = Math.min(1, Math.max(0, Number(percent) / 100));
  const sliceX = Math.cos(2 * Math.PI * Math.min(0.99999, usedFraction));
  const sliceY = Math.sin(2 * Math.PI * Math.min(0.99999, usedFraction));
  const largeArcFlag = usedFraction > 0.5 ? 1 : 0;
  const pathData = usedFraction >= 0.999
    ? 'M 1 0 A 1 1 0 1 1 -0.999 0 A 1 1 0 1 1 1 0 L 0 0 Z'
    : `M 1 0 A 1 1 0 ${largeArcFlag} 1 ${sliceX} ${sliceY} L 0 0 Z`;
  return { pathData, usedFraction };
};

export const computeMonthDiff = (last7Months) => {
  const currentMonthTotal = last7Months[last7Months.length - 1]?.total || 0;
  const prevMonthTotal = last7Months[last7Months.length - 2]?.total || 0;
  let diffPercentStr = '0,0%';
  let isDiffPositive = currentMonthTotal >= prevMonthTotal;

  if (prevMonthTotal !== 0) {
    const diffPct = ((currentMonthTotal - prevMonthTotal) / Math.abs(prevMonthTotal)) * 100;
    isDiffPositive = diffPct >= 0;
    diffPercentStr = `${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1).replace('.', ',')}%`;
  } else if (currentMonthTotal !== 0) {
    isDiffPositive = currentMonthTotal > 0;
    diffPercentStr = currentMonthTotal > 0 ? '+100%' : '-100%';
  }
  return { diffPercentStr, isDiffPositive, currentMonthTotal, prevMonthTotal };
};

export const compute12MonthWindow = (reference = new Date()) => {
  const startYear = reference.getFullYear();
  const startMonth = reference.getMonth();
  const startMonthKey = `${startYear}-${String(startMonth + 1).padStart(2, '0')}`;
  const endTotalMonths = startMonth + 12;
  const endYear = startYear + Math.floor(endTotalMonths / 12);
  const endMonthNum = endTotalMonths % 12;
  const endMonthKey = `${endYear}-${String(endMonthNum + 1).padStart(2, '0')}`;
  return { startMonthKey, endMonthKey };
};

export const computeLastMonthsTotals = (events, months) => {
  const totals = new Map(months.map((m) => [m.key, 0]));
  events?.forEach((ev) => {
    if (!ev?.date || !ev?.amount) return;
    const key = ev.date.slice(0, 7);
    if (totals.has(key)) {
      totals.set(key, totals.get(key) + (parseFloat(ev.amount) || 0));
    }
  });
  return months.map((m) => ({ ...m, total: totals.get(m.key) }));
};