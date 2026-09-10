import * as api from '../services/api.js';

export function getObligatorIdentifier(ev) {
  if (!ev) return '';
  if (ev.obligatorIdentification) return String(ev.obligatorIdentification);
  if (ev.obligator_identification) return String(ev.obligator_identification);
  if (ev.obligationIdentifier) return String(ev.obligationIdentifier);
  if (ev.obligation_identifier) return String(ev.obligation_identifier);
  if (ev.obligationPerson?.obligatorIdentification) return String(ev.obligationPerson.obligatorIdentification);
  if (ev.obligationPerson?.obligator_identification) return String(ev.obligationPerson.obligator_identification);
  if (ev.obligationPerson?.taxId) return String(ev.obligationPerson.taxId);
  if (ev.obligationPerson?.tax_id) return String(ev.obligationPerson.tax_id);

  const personId = ev.obligationPersonId || ev.obligation_person_id;
  const tbId = ev.timeboardId || ev.timeboard_id;
  if (personId && tbId) {
    const cached = api.getLocalPersons(tbId);
    const found = cached.find((p) => p.id === personId);
    if (found) {
      return String(found.obligatorIdentification || found.obligator_identification || found.taxId || found.tax_id || '');
    }
  }
  return '';
}

/**
 * Ordena eventos de um mesmo dia:
 * 1º Critério: Nome/título do evento (alfabético)
 * 2º Critério: Identificador do obligator (alfabético/numérico)
 */
export function compareEventsWithinDay(a, b) {
  const titleA = (a?.title || a?.name || a?.description || '').trim();
  const titleB = (b?.title || b?.name || b?.description || '').trim();
  const titleComp = titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
  if (titleComp !== 0) return titleComp;

  const idA = getObligatorIdentifier(a).trim();
  const idB = getObligatorIdentifier(b).trim();
  return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
}
