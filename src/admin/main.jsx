import MobileApp from '../mobile/MobileApp.jsx';
import { bootMobileApp } from '../mobile/bootMobileApp.jsx';
import AdminHome from './AdminHome.jsx';

// CondoFlow Gestão: the condominium admins' app (same sign-in and session as CondoFlow)
bootMobileApp(<MobileApp Home={AdminHome} brandKey="admin.brand" taglineKey="admin.tagline" />);
