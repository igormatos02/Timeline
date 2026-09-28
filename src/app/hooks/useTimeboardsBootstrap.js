import { useEffect } from 'react';
import * as api from '../../services/api';

// Extracted from App.jsx (App).
export function useTimeboardsBootstrap({
  currentUser,
  pendingInvite,
  setActiveFinancialTab,
  setActiveTimeboardId,
  setActiveTimelineId,
  setCurrentView,
  setMyTimeboards,
  setPendingInvite,
  setSharedTimeboards,
  setTimeboards,
  showToast,
  t
}) {
  useEffect(() => {
    const inviteCode = pendingInvite?.code || api.getPendingInviteCode();
    if (!currentUser?.id || (!inviteCode && !pendingInvite?.timeboardId)) return;

    let isMounted = true;
    (async () => {
      try {
        const result = inviteCode
          ? await api.acceptInviteByCode(inviteCode)
          : await api.acceptTimeboardInvite(pendingInvite.timeboardId);
        if (!isMounted) return;
        const acceptedTimeboardId = result?.timeboard?.id || pendingInvite?.timeboardId;

        showToast(t('invite.acceptedToast'), 'success');
        api.setPendingInviteCode(null);

        // Clean up URL parameters
        try {
          const url = new URL(window.location);
          ['invite', 'inviteTimeboardId', 'tbId', 'email'].forEach((param) => url.searchParams.delete(param));
          window.history.replaceState({}, '', url.pathname);
        } catch (e) { }

        setPendingInvite(null);

        // Fetch fresh timeboards for user and select the accepted timeboard
        const freshData = await api.fetchTimeboards(currentUser.id);
        if (freshData && typeof freshData === 'object' && !Array.isArray(freshData)) {
          const my = freshData.myTimeboards || [];
          const shared = freshData.sharedTimeboards || [];
          const all = freshData.all || [...my, ...shared];
          setMyTimeboards(my);
          setSharedTimeboards(shared);
          setTimeboards(all);
        }
        if (acceptedTimeboardId) {
          setActiveTimeboardId(acceptedTimeboardId);
          setActiveTimelineId(null);
          setActiveFinancialTab(null);
          setCurrentView('workspace');
          localStorage.setItem('chrono_current_view', 'workspace');
          localStorage.setItem('chrono_active_timeboard_id', acceptedTimeboardId);
        }
      } catch (err) {
        console.error('Error accepting timeboard invite:', err);
        api.setPendingInviteCode(null);
        setPendingInvite(null);
        showToast(err.message || t('invite.acceptFailed'), 'error');
      }
    })();

    return () => { isMounted = false; };
  }, [currentUser?.id, pendingInvite?.timeboardId, pendingInvite?.code]);

  return {
    
  };
}
