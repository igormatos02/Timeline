export const TimelineAssociationType = Object.freeze({
  DYNAMIC: 'DYNAMIC', // General movement belonging directly to the Timeboard (timelineId is null)
  RECORD: 'RECORD'    // Associated with a specific persisted timeline/contract in the database
});
