// What a push notification of the CondoFlow app is about (each one can be turned off by the person)
export const PushNotificationKind = Object.freeze({
  POST: 'post', // a condominium post was published
  REMINDER: 'reminder' // a reminder reached its date
});

// Platforms a device token can come from
export const PushPlatform = Object.freeze({
  ANDROID: 'android'
});
