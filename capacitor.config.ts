import type { CapacitorConfig } from '@capacitor/cli';

const googleMapsApiKey = (process.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '';

const config: CapacitorConfig = {
  appId: 'com.rumahkeripik.courier',
  appName: 'Rumah Keripik Kurir',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#120f0d',
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
    GoogleMaps: {
      androidApiKey: googleMapsApiKey,
    },
  },
};

export default config;
