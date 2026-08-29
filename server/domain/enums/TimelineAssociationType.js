export const TimelineAssociationType = Object.freeze({
  DYNAMIC: 'dynamic', // General movement belonging directly to the Timeboard (timelineId is null)
  RECORD: 'record'    // Associated with a specific persisted timeline/contract in the database
});
