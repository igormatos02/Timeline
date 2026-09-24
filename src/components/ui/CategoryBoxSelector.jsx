import React from 'react';
import OptionBoxGroup from './OptionBoxGroup.jsx';

/**
 * CategoryBoxSelector - category choice as compact selection boxes (icon + name, description as tooltip).
 *
 * Props:
 *   value              - selected category id
 *   onChange           - (categoryId) => void
 *   categoryMeta       - { [id]: { icon, color } } in display order
 *   translationPrefix  - key prefix for the category names (e.g. 'incomeCategories')
 *   descriptionPrefix  - key prefix for the category descriptions, shown as tooltip (optional)
 *   label              - field label
 *   t                  - translation function
 */
export default function CategoryBoxSelector({ value, onChange, categoryMeta, translationPrefix, descriptionPrefix, label, t }) {
  const options = Object.entries(categoryMeta).map(([id, meta]) => ({
    id,
    label: t(`${translationPrefix}.${id}`),
    icon: meta.icon,
    color: meta.color,
    tooltip: descriptionPrefix ? t(`${descriptionPrefix}.${id}`) : undefined
  }));

  return <OptionBoxGroup label={label} options={options} value={value} onChange={onChange} />;
}
