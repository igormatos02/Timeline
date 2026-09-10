import { translations } from './translations.js';

export function createT(language = 'en') {
  return (path, params = {}) => {
    if (!path || typeof path !== 'string') return '';
    const keys = path.split('.');
    let result = translations[language];

    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        let fallbackResult = translations.en;
        for (const fbKey of keys) {
          if (fallbackResult && typeof fallbackResult === 'object' && fbKey in fallbackResult) {
            fallbackResult = fallbackResult[fbKey];
          } else {
            fallbackResult = null;
            break;
          }
        }
        result = fallbackResult || path;
        break;
      }
    }

    if (typeof result === 'string') {
      let interpolated = result;
      for (const [pKey, pVal] of Object.entries(params)) {
        interpolated = interpolated.replace(new RegExp(`\\{${pKey}\\}`, 'g'), pVal);
      }
      return interpolated;
    }

    return result || path;
  };
}
