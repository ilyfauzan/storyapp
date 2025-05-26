
const VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function requestNotificationPermissionAndSubscribe(token) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notification tidak didukung di browser ini.');
    return;
  }

  try {
    if (Notification.permission === 'granted') {
      console.log('Notifikasi sudah diizinkan sebelumnya.');
    } else if (Notification.permission === 'denied') {
      console.warn('Izin notifikasi sudah pernah ditolak. Silakan ubah izin di pengaturan browser.');
      return;
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Izin notifikasi ditolak.');
        return;
      }
      console.log('Izin notifikasi diberikan.');
    }

    await navigator.serviceWorker.register('/service-worker.js');
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

  
    const p256dh = arrayBufferToBase64(subscription.getKey('p256dh'));
    const auth = arrayBufferToBase64(subscription.getKey('auth'));
    const endpoint = subscription.endpoint;

    const body = {
      endpoint,
      keys: {
        p256dh,
        auth
      }
    };

    const res = await fetch('https://story-api.dicoding.dev/v1/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      console.log('Gagal subscribe push notification.');
      const err = await res.text();
      console.log('Pesan error:', err);
      return;
    }

    console.log('Push notification diaktifkan!');
  } catch (error) {
    console.error('Error saat subscribe push notification:', error);
  }
}
