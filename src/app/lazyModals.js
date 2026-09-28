import React from 'react';

// Modals loaded on demand (code splitting)
export const CreateTimelineModal = React.lazy(() => import('../components/CreateTimelineModal'));
export const EditTimelineSettingsModal = React.lazy(() => import('../components/EditTimelineSettingsModal'));
export const CreateTimeboardModal = React.lazy(() => import('../components/CreateTimeboardModal'));
export const TimeboardSettingsModal = React.lazy(() => import('../components/TimeboardSettingsModal'));
export const CreateEventModal = React.lazy(() => import('../components/CreateEventModal'));
export const DeleteEventModal = React.lazy(() => import('../components/DeleteEventModal'));
export const DeleteTimelineModal = React.lazy(() => import('../components/DeleteTimelineModal'));
export const AmortizationModal = React.lazy(() => import('../components/AmortizationModal'));
export const EditInstallmentModal = React.lazy(() => import('../components/EditInstallmentModal'));
export const CreatePocketModal = React.lazy(() => import('../components/CreatePocketModal'));
export const DeletePocketModal = React.lazy(() => import('../components/DeletePocketModal'));
export const AccountOutflowModal = React.lazy(() => import('../components/AccountOutflowModal'));
