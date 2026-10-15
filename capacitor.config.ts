import type { CapacitorConfig } from '@capacitor/cli';

// Two Android apps from the same code: CondoFlow (members, android/) and CondoFlow Gestão (condominium admins,
// android-admin/). CONDOFLOW_APP=admin picks the admin app (npm run cap:sync:admin); the default is the members' app.
const isAdminApp = process.env.CONDOFLOW_APP === 'admin';

const config: CapacitorConfig = isAdminApp
  ? {
      appId: 'app.condoflow.admin',
      appName: 'CondoFlow Gestão',
      webDir: 'dist-admin',
      android: { path: 'android-admin', allowMixedContent: false },
      plugins: {
        SocialLogin: { providers: { google: true, facebook: false, apple: false, twitter: false } }
      }
    }
  : {
      appId: 'app.condoflow.client',
      appName: 'CondoFlow',
      webDir: 'dist-mobile',
      android: { allowMixedContent: false },
      plugins: {
        SocialLogin: { providers: { google: true, facebook: false, apple: false, twitter: false } }
      }
    };

export default config;
