import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rumahkeripik.courier',
  appName: 'Rumah Keripik Kurir',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Whitelist domain eksternal (blueprint §8): tile peta Carto basemaps + routing ORS/OSRM.
    allowNavigation: [
      'basemaps.cartocdn.com',
      'tiles.basemaps.cartocdn.com',
      'tiles-a.basemaps.cartocdn.com',
      'tiles-b.basemaps.cartocdn.com',
      'tiles-c.basemaps.cartocdn.com',
      'tiles-d.basemaps.cartocdn.com',
      'api.openrouteservice.org',
      'router.project-osrm.org',
      'routing.openstreetmap.de',
      'valhalla1.openstreetmap.de',
    ],
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#faf7f4',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#faf7f4',
      overlaysWebView: false,
    },
    BackgroundGeolocation: {
      backgroundMessage: 'Melacak lokasi kurir. Nonaktifkan battery optimization untuk hasil terbaik.',
      backgroundTitle: 'Rumah Keripik — Lacak Lokasi',
    },
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    CapacitorUpdater: {
      autoUpdate: true,
      autoDeleteFailed: true,
      autoDeletePrevious: true,
      directUpdate: 'onLaunch',
    },
  },
};

export default config;