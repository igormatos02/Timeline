import { useCallback, useState } from 'react';
import * as api from '../../services/api';

// Extracted from App.jsx (App).
export function useTimeboardPersons({
  activeTimeboardId,
  currentUser
}) {
  const [rawEvents, setRawEvents] = useState([]);
  const [currentUserPerson, setCurrentUserPerson] = useState(null);
  const [timeboardPersons, setTimeboardPersons] = useState([]);

  const reloadPersons = useCallback(() => {
    if (!activeTimeboardId || !currentUser?.id) {
      setCurrentUserPerson(null);
      setTimeboardPersons([]);
      return;
    }
    api.fetchPersons({ timeboardId: activeTimeboardId })
      .then((persons) => {
        if (Array.isArray(persons)) {
          setTimeboardPersons(persons);
          const match = persons.find(
            (p) => (p.userId && p.userId === currentUser.id) ||
                   (p.user_id && p.user_id === currentUser.id) ||
                   (p.email && currentUser.email && p.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim())
          );
          setCurrentUserPerson(match || null);
        } else {
          setTimeboardPersons([]);
        }
      })
      .catch(() => {
        setTimeboardPersons([]);
      });
  }, [activeTimeboardId, currentUser?.id, currentUser?.email]);

  return {
    currentUserPerson,
    rawEvents,
    reloadPersons,
    setRawEvents,
    setTimeboardPersons,
    timeboardPersons
  };
}
