import 'leaflet/dist/leaflet.css';
import './style.css';
import feather from 'feather-icons';
window.feather = feather;

import Presenter from './presenter.js';
import View from './view.js';

if (!document.startViewTransition) {
  document.startViewTransition = (callback) => {
    callback();
    return {
      ready: Promise.resolve(),
      updateCallbackDone: Promise.resolve(),
      finished: Promise.resolve()
    };
  };
}

const AppState = {
  isOnline: navigator.onLine,
  serviceWorkerRegistration: null,
  
  setOnlineStatus(status) {
    this.isOnline = status;
    View.updateNetworkStatus(status);
  },
  
  getOnlineStatus() {
    return this.isOnline;
  }
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      AppState.serviceWorkerRegistration = registration;
      console.log('✅ Service Worker registered successfully:', registration.scope);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 New Service Worker installing...');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🆕 New Service Worker installed, refresh recommended');
            View.showUpdateAvailableNotification();
          }
        });
      });
      
      if (registration.waiting) {
        console.log('⏳ Service Worker waiting to activate');
        View.showUpdateAvailableNotification();
      }
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
}

window.addEventListener('online', () => {
  console.log('📶 App is online');
  AppState.setOnlineStatus(true);
});

window.addEventListener('offline', () => {
  console.log('📵 App is offline');
  AppState.setOnlineStatus(false);
});

window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  
  if (!AppState.isOnline) {
    View.showOfflineError();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  event.preventDefault();
  
  if (event.reason?.message?.includes('fetch') || 
      event.reason?.message?.includes('network')) {
    if (!AppState.isOnline) {
      View.showOfflineError();
    }
  }
});

const perfObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      console.log(`⚡ Page load time: ${entry.loadEventEnd - entry.loadEventStart}ms`);
    }
  }
});

if ('PerformanceObserver' in window) {
  perfObserver.observe({ entryTypes: ['navigation'] });
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.feather) {
    window.feather.replace();
  }
  
  View.setAppState(AppState);
  
  Presenter.init();
  
  console.log('🚀 Story SPA initialized successfully');
  console.log('📱 PWA features:', {
    serviceWorker: 'serviceWorker' in navigator,
    notifications: 'Notification' in window,
    caching: 'caches' in window,
    installPrompt: 'BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window
  });
});

if (typeof window !== 'undefined') {
  window.StoryApp = {
    presenter: Presenter,
    state: AppState,
    isOnline: () => AppState.getOnlineStatus(),
    cacheInfo: async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('Available caches:', cacheNames);
        
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          console.log(`Cache ${name}:`, keys.map(req => req.url));
        }
      }
    },
    clearCaches: async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('All caches cleared');
      }
    },
    refreshApp: () => {
      window.location.reload();
    }
  };
}
