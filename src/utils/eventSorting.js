import * as api from '../services/api.js';

const identifierOfPerson = (person) => String(
  person?.obligatorIdentification || person?.obligator_identification || person?.taxId || person?.tax_id || ''
);

/**
 * Obligator identifier of an event (e.g. the condominium unit "1A").
 * personsById (optional Map id -> person) resolves events that only carry the obligation person id.
 */
export function getObligatorIdentifier(ev, personsById = null) {
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
  if (personId && personsById && personsById.has(String(personId))) {
    return identifierOfPerson(personsById.get(String(personId)));
  }
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

const compareText = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/**
 * Comparator for the events of a same day.
 * - Default: title (alphabetical), then obligator identifier.
 * - obligatorFirst (condoflow timeboards): obligator identifier first (events without one go last), then title.
 */
export function createEventDayComparator({ personsById = null, obligatorFirst = false } = {}) {
  return (a, b) => {
    const titleComp = compareText(
      (a?.title || a?.name || a?.description || '').trim(),
      (b?.title || b?.name || b?.description || '').trim()
    );
    const idA = getObligatorIdentifier(a, personsById).trim();
    const idB = getObligatorIdentifier(b, personsById).trim();

    if (obligatorFirst) {
      if (idA && !idB) return -1;
      if (!idA && idB) return 1;
      const idComp = compareText(idA, idB);
      return idComp !== 0 ? idComp : titleComp;
    }
    return titleComp !== 0 ? titleComp : compareText(idA, idB);
  };
}

// Personal timeboards: title, then obligator identifier
export const compareEventsWithinDay = createEventDayComparator();

// Map id -> person for createEventDayComparator
export function buildPersonsById(persons = []) {
  return new Map((persons || []).filter((p) => p && p.id).map((p) => [String(p.id), p]));
}
