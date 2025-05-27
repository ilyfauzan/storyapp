import L from 'leaflet';
import { requestNotificationPermissionAndSubscribe } from './push.js';
import { addFavorite, removeFavorite, isFavorite, getAllFavorites } from './fav-db.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const View = {
  main: document.getElementById('main-content'),
  isOffline: false,
  appState: null,

  setAppState(appState) {
    this.appState = appState;
  },

  showUpdateAvailableNotification() {
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      z-index: 1001;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <span>🔄 Update tersedia!</span>
      <button onclick="window.StoryApp.refreshApp()" style="
        background: white;
        color: #10b981;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">Refresh</button>
      <button onclick="this.parentElement.remove()" style="
        background: transparent;
        color: white;
        border: none;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 18px;
        transition: all 0.2s;
      " onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  },

  updateNetworkStatus(online) {
    let indicator = document.getElementById('network-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'network-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 14px;
        z-index: 1000;
        transition: all 0.3s ease;
        display: none;
      `;
      document.body.appendChild(indicator);
    }
    
    if (online) {
      indicator.textContent = '📶 Kembali online!';
      indicator.style.background = '#10b981';
      indicator.style.color = 'white';
      indicator.style.display = 'block';
      
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 3000);
    } else {
      indicator.textContent = '📵 Mode offline';
      indicator.style.background = '#ef4444';
      indicator.style.color = 'white';
      indicator.style.display = 'block';
    }
    
    this.isOffline = !online;
  },

  showOfflineError() {
    if (document.getElementById('offline-error-global')) return;
    
    const errorMessage = document.createElement('div');
    errorMessage.id = 'offline-error-global';
    errorMessage.style.cssText = `
      position: fixed;
      top: 80px;
      left: 20px;
      right: 20px;
      max-width: 400px;
      margin: 0 auto;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
      z-index: 999;
      animation: slideDown 0.3s ease-out;
    `;
    
    errorMessage.innerHTML = `
      <strong>📵 Mode Offline</strong><br>
      Aplikasi berjalan dalam mode offline. Beberapa fitur mungkin terbatas.<br>
      <small>Data yang ditampilkan adalah data tersimpan terakhir.</small>
      <button onclick="this.parentElement.remove()" style="
        position: absolute;
        top: 8px;
        right: 8px;
        background: transparent;
        border: none;
        color: #b91c1c;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
      ">&times;</button>
    `;
    
    document.body.appendChild(errorMessage);
    
    setTimeout(() => {
      if (errorMessage.parentElement) {
        errorMessage.remove();
      }
    }, 5000);
  },

  initNotificationStyles() {
    if (document.getElementById('notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  },

  registerRouteHandlers(routeCallback) {
    window.addEventListener('hashchange', routeCallback);
    window.addEventListener('load', () => {
      this.initAccessibilityFeatures(); 
      this.checkOfflineStatus();
      this.initNotificationStyles();
      routeCallback();
    });
    this.initViewTransitionStyles();
    this.setupOfflineHandling();
  },

  setupOfflineHandling() {
    window.addEventListener('online', () => {
      this.isOffline = false;
      this.hideOfflineMessage();
    });
    
    window.addEventListener('offline', () => {
      this.isOffline = true;
      this.showOfflineMessage();
    });
  },

  checkOfflineStatus() {
    this.isOffline = !navigator.onLine;
    if (this.isOffline) {
      this.showOfflineMessage();
    }
  },

  showOfflineMessage() {
    if (document.getElementById('offline-message')) return;
    
    const offlineMessage = document.createElement('div');
    offlineMessage.id = 'offline-message';
    offlineMessage.className = 'offline-error';
    offlineMessage.innerHTML = `
      <strong>📵 Mode Offline</strong><br>
      Anda sedang offline. Menampilkan data tersimpan terakhir.<br>
      <small>Beberapa fitur seperti menambah story tidak tersedia.</small>
    `;
    
    this.main.insertBefore(offlineMessage, this.main.firstChild);
  },

  hideOfflineMessage() {
    const offlineMessage = document.getElementById('offline-message');
    if (offlineMessage) {
      offlineMessage.remove();
    }
  },

  initAccessibilityFeatures() {
    const skipLink = document.querySelector('.skip-link');
    
    if (!skipLink) return;
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        const activeElement = document.activeElement;
        
        if (activeElement === document.body || 
            activeElement === document.documentElement ||
            activeElement.classList.contains('header') ||
            activeElement.tagName === 'HEADER') {
          e.preventDefault();
          skipLink.focus();
        }
      }
    }, true);
  },

  getHash() {
    return location.hash.replace('#', '');
  },

  navigateTo(hash) {
    location.hash = hash;
  },

  scrollToTop() {
    window.scrollTo(0, 0);
  },

  startViewTransition(callback) {
    if (document.startViewTransition) {
      document.startViewTransition(async () => {
        await callback();
      });
    } else {
      callback();
    }
    this.scrollToTop();
  },

  initViewTransitionStyles() {
    if (document.startViewTransition) {
      const style = document.createElement('style');
      style.textContent = `
        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation-duration: 0.3s;
        }
        ::view-transition-old(root) { animation-name: fade-out; }
        ::view-transition-new(root) { animation-name: fade-in; }
        @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      `;
      document.head.appendChild(style);
    }
  },

  handleSkipLink() {
    if (location.hash === '#main-content') {
      this.focusMainContent();
      return true; 
    }
    return false;
  },

  focusMainContent() {
    if (this.main) this.main.focus();
  },
  
  map: null,
  markersLayer: null,
  marker: null,
  cameraStream: null,

  async renderHome(stories) {
    this.stopCamera();

    const isOfflineData = Array.isArray(stories) && stories.length === 0 && this.isOffline;

    this.main.innerHTML = `
      <h2>Daftar Story</h2>
      ${isOfflineData ? `
        <div class="offline-error" style="margin-bottom: 2rem;">
          <strong>📵 Data Offline Tidak Tersedia</strong><br>
          Tidak ada data story yang tersimpan untuk mode offline.<br>
          <small>Sambungkan internet untuk melihat story terbaru.</small>
        </div>
      ` : ''}
      <ul class="story-list" aria-live="polite"></ul>
      <div id="map" aria-label="Peta lokasi story" style="height: 320px; margin-top: 2rem;"></div>
    `;

    const list = this.main.querySelector('.story-list');

    for (const story of stories) {
      const li = document.createElement('li');
      li.className = 'story-item';

      let imgSrc = story.photoUrl;
      if (story.photoBlob) {
        imgSrc = URL.createObjectURL(story.photoBlob);
      }

      li.innerHTML = `
        <img src="${imgSrc}" alt="Foto story oleh ${story.name}" loading="lazy" />
        <div class="story-content">
          <h3>${story.name}</h3>
          <p>${story.description}</p>
          <time datetime="${story.createdAt}">${new Date(story.createdAt).toLocaleString()}</time>
        </div>
      `;

      const favBtn = document.createElement('button');
      favBtn.className = 'fav-btn';
      favBtn.style.marginTop = '0.5rem';
      favBtn.style.fontWeight = 'bold';
      favBtn.style.cursor = 'pointer';

      favBtn.textContent = (await isFavorite(story.id)) ? '★ Favorit' : '☆ Favorit';

      favBtn.addEventListener('click', async () => {
        if (await isFavorite(story.id)) {
          await removeFavorite(story.id);
          favBtn.textContent = '☆ Favorit';
        } else {
          await addFavorite(story);
          favBtn.textContent = '★ Favorit';
        }
      });

      li.appendChild(favBtn);
      list.appendChild(li);
    }

    this.initMap();

    this.showMarkers(stories);
  },

  async renderFavorites() {
    this.stopCamera();

    this.main.innerHTML = `
      <h2>Story Favorit</h2>
      <ul class="story-list" aria-live="polite"></ul>
    `;

    const list = this.main.querySelector('.story-list');
    const favs = await getAllFavorites();

    if (favs.length === 0) {
      list.innerHTML = '<li style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #6b7280;">Belum ada story favorit.</li>';
      return;
    }

    for (const story of favs) {
      const li = document.createElement('li');
      li.className = 'story-item';

      li.innerHTML = `
        <img src="${story.photoUrl}" alt="Foto story oleh ${story.name}" loading="lazy" />
        <div class="story-content">
          <h3>${story.name}</h3>
          <p>${story.description}</p>
          <time datetime="${story.createdAt}">${new Date(story.createdAt).toLocaleString()}</time>
        </div>
      `;

      const delBtn = document.createElement('button');
      delBtn.className = 'fav-btn';
      delBtn.style.marginTop = '0.5rem';
      delBtn.style.fontWeight = 'bold';
      delBtn.style.cursor = 'pointer';
      delBtn.textContent = 'Hapus Favorit';

      delBtn.addEventListener('click', async () => {
        await removeFavorite(story.id);
        li.remove();
        if (list.children.length === 0) {
          list.innerHTML = '<li style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #6b7280;">Belum ada story favorit.</li>';
        }
      });

      li.appendChild(delBtn);
      list.appendChild(li);
    }
  },

  initMap() {
  // Check if a map instance already exists and remove it
  if (this.map) {
    this.map.remove(); // This will fully remove the map instance
  }

  // Get the map container
  const mapContainer = L.DomUtil.get('map');
  if (mapContainer != null) {
    mapContainer._leaflet_id = null; // Clear the reference to the old map
  }

  // Initialize the new map
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  });

  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenTopoMap contributors',
  });

  const watercolor = L.tileLayer(
    'https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg',
    {
      attribution: 'Map tiles by Stamen Design, under CC BY 3.0.',
    }
  );

  this.map = L.map('map', {
    center: [-6.200000, 106.816666],
    zoom: 13,
    layers: [osm],
    dragging: true // Ensure dragging is enabled
  });

  this.markersLayer = L.layerGroup().addTo(this.map);

  const baseLayers = {
    'OpenStreetMap': osm,
    'OpenTopoMap': topo,
    'Watercolor': watercolor,
  };

  L.control.layers(baseLayers).addTo(this.map);

  if (this.isOffline) {
    const mapContainer = document.getElementById('map');
    const offlineMapMsg = document.createElement('div');
    offlineMapMsg.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(239, 68, 68, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      z-index: 1000;
      pointer-events: none;
    `;
    offlineMapMsg.textContent = '📵 Map offline - Data terbatas';
    mapContainer.style.position = 'relative';
    mapContainer.appendChild(offlineMapMsg);
  }
},

  showMarkers(stories) {
    if (!this.map) this.initMap();

    this.markersLayer.clearLayers();

    const latLngs = [];

    stories.forEach((story) => {
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon]);
        marker.bindPopup(`
          <strong>${story.name}</strong><br/>
          ${story.description}<br/>
          <img src="${story.photoUrl}" alt="Foto story oleh ${story.name}" style="width:100px;"/>
        `);
        marker.addTo(this.markersLayer);
        latLngs.push([story.lat, story.lon]);
      }
    });

    if (latLngs.length > 0) {
      this.map.fitBounds(latLngs, { padding: [50, 50] });
    }
  },

  renderAddStory(onFormSubmit) {
    this.stopCamera();

    if (this.isOffline) {
      this.main.innerHTML = `
        <h2>Tambah Story Baru</h2>
        <div class="offline-error">
          <strong>📵 Fitur Tidak Tersedia Offline</strong><br>
          Menambah story memerlukan koneksi internet.<br>
          <small>Sambungkan internet untuk menggunakan fitur ini.</small>
        </div>
        <div style="text-align: center; margin-top: 2rem;">
          <button onclick="location.hash='home'" style="
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
          ">Kembali ke Home</button>
        </div>
      `;
      return;
    }

    this.main.innerHTML = `
      <h2>Tambah Story Baru</h2>
      <form id="storyForm" aria-label="Form tambah story baru">
        <label for="description">Deskripsi</label>
        <textarea id="description" name="description" required placeholder="Ceritakan pengalaman Anda..."></textarea>
        <label for="photoFile">Unggah Foto (atau gunakan kamera)</label>
        <input type="file" id="photoFile" name="photoFile" accept="image/*" capture="environment" />

        <label>Ambil Foto dengan Kamera</label>
        <div>
          <video id="video" width="320" height="240" autoplay style="border-radius:8px; background:#000;"></video><br/>
          <button type="button" id="captureBtn">Ambil Foto</button>
        </div>
        <canvas id="canvas" width="320" height="240" style="display:none; border-radius:8px;"></canvas>
        <input type="hidden" id="photoData" name="photoData" />

        <label>Lokasi (klik peta untuk memilih)</label>
        <div id="map" aria-label="Peta untuk memilih lokasi" style="height: 320px;"></div>

        <input type="hidden" id="lat" name="lat" />
        <input type="hidden" id="lon" name="lon" />

        <button type="submit">Kirim Story</button>
      </form>
      <div id="formMessage" role="alert" aria-live="assertive"></div>
    `;

    this.initMapForAddStory();
    this.initCamera();
    this.bindAddStoryForm(onFormSubmit);
  },

  bindAddStoryForm(onFormSubmit) {
    const form = document.getElementById('storyForm');
    const message = document.getElementById('formMessage');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!navigator.onLine) {
        message.textContent = '📵 Tidak dapat mengirim story dalam mode offline';
        message.style.color = 'red';
        return;
      }

      const formData = {
        description: form.description.value.trim(),
        photoFile: form.photoFile.files[0],
        photoData: form.photoData.value,
        lat: form.lat.value,
        lon: form.lon.value
      };

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Mengirim...';
      submitBtn.disabled = true;

      try {
        const result = await onFormSubmit(formData);

        if (result.success) {
          message.textContent = '✅ Story berhasil ditambahkan!';
          message.style.color = 'green';
          form.reset();
          this.resetAddStoryMarker();

          setTimeout(() => {
            location.hash = 'home';
          }, 1500);
        } else {
          message.textContent = '❌ ' + result.message;
          message.style.color = 'red';
        }
      } catch (error) {
        message.textContent = '❌ Terjadi kesalahan: ' + error.message;
        message.style.color = 'red';
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  },

  initMapForAddStory() {
    if (this.map) this.map.remove();

    this.map = L.map('map').setView([-2.5, 118], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    this.marker = null;

    this.map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (this.marker) {
        this.marker.setLatLng(e.latlng);
      } else {
        this.marker = L.marker(e.latlng).addTo(this.map);
      }
      document.getElementById('lat').value = lat.toFixed(6);
      document.getElementById('lon').value = lng.toFixed(6);

      const message = document.getElementById('formMessage');
      message.textContent = `📍 Lokasi dipilih: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      message.style.color = '#2563eb';
    });
  },

  initCamera() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('captureBtn');
    const photoData = document.getElementById('photoData');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
        .then((stream) => {
          this.cameraStream = stream;
          video.srcObject = stream;
          video.play();
        })
        .catch((error) => {
          console.error('Camera access failed:', error);
          captureBtn.disabled = true;
          captureBtn.textContent = 'Kamera tidak tersedia';

          const cameraContainer = video.parentElement;
          const fallbackMsg = document.createElement('div');
          fallbackMsg.style.cssText = `
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #b91c1c;
            padding: 12px;
            border-radius: 8px;
            margin-top: 8px;
            font-size: 14px;
          `;
          fallbackMsg.innerHTML = '📷 Kamera tidak dapat diakses. Gunakan upload file sebagai alternatif.';
          cameraContainer.appendChild(fallbackMsg);
        });
    } else {
      captureBtn.disabled = true;
      captureBtn.textContent = 'Kamera tidak didukung';
    }

    captureBtn.addEventListener('click', () => {
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.style.display = 'block';
      photoData.value = canvas.toDataURL('image/png');

      captureBtn.textContent = '✅ Foto diambil';
      setTimeout(() => {
        captureBtn.textContent = 'Ambil Foto Lagi';
      }, 2000);
    });
  },

  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
  },

  resetAddStoryMarker() {
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }

    const photoData = document.getElementById('photoData');
    const canvas = document.getElementById('canvas');
    if (photoData) photoData.value = '';
    if (canvas) canvas.style.display = 'none';
  },

  renderLogin(onFormSubmit) {
    this.stopCamera();
    this.main.innerHTML = `
      <h2>Login</h2>
      <form id="loginForm" aria-label="Form login">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required autocomplete="email" />
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required minlength="8" autocomplete="current-password" />
        <button type="submit">Login</button>
      </form>
      <div id="loginMessage" role="alert" aria-live="assertive"></div>
      <div id="loginLoading" style="display:none; margin-top:10px; font-weight:bold; color:#2563eb;">
        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top: 2px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px;"></div>
        Loading...
      </div>
    `;

    this.bindLoginForm(onFormSubmit);
  },

  bindLoginForm(onFormSubmit) {
    const form = document.getElementById('loginForm');
    const message = document.getElementById('loginMessage');
    const loading = document.getElementById('loginLoading');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      message.textContent = '';

      if (!navigator.onLine) {
        message.textContent = '📵 Login memerlukan koneksi internet';
        message.style.color = 'red';
        return;
      }

      loading.style.display = 'block';

      const formData = {
        email: form.email.value.trim(),
        password: form.password.value
      };

      try {
        const result = await onFormSubmit(formData);
        loading.style.display = 'none';

        if (result.success) {
          message.textContent = '✅ Login berhasil!';
          message.style.color = 'green';
          setTimeout(() => this.navigateTo('home'), 1000);
        } else {
          message.textContent = '❌ ' + result.message;
          message.style.color = 'red';
        }
      } catch (error) {
        loading.style.display = 'none';
        message.textContent = '❌ Terjadi kesalahan: ' + error.message;
        message.style.color = 'red';
      }
    });
  },

  renderRegister(onFormSubmit) {
    this.stopCamera();
    this.main.innerHTML = `
      <h2>Register</h2>
      <form id="registerForm" aria-label="Form registrasi">
        <label for="name">Nama</label>
        <input type="text" id="name" name="name" required autocomplete="name" />
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required autocomplete="email" />
        <label for="password">Password (min 8 karakter)</label>
        <input type="password" id="password" name="password" required minlength="8" autocomplete="new-password" />
        <button type="submit">Register</button>
      </form>
      <div id="registerMessage" role="alert" aria-live="assertive"></div>
    `;

    this.bindRegisterForm(onFormSubmit);
  },

  bindRegisterForm(onFormSubmit) {
    const form = document.getElementById('registerForm');
    const message = document.getElementById('registerMessage');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      message.textContent = '';

      if (!navigator.onLine) {
        message.textContent = '📵 Registrasi memerlukan koneksi internet';
        message.style.color = 'red';
        return;
      }

      const formData = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        password: form.password.value
      };

      try {
        const result = await onFormSubmit(formData);

        if (result.success) {
          message.textContent = '✅ Registrasi berhasil! Silakan login.';
          message.style.color = 'green';
          setTimeout(() => this.navigateTo('login'), 1500);
        } else {
          message.textContent = '❌ ' + result.message;
          message.style.color = 'red';
        }
      } catch (error) {
        message.textContent = '❌ Terjadi kesalahan: ' + error.message;
        message.style.color = 'red';
      }
    });
  },

  renderLoading() {
    this.stopCamera();
    this.main.innerHTML = `
      <div style="text-align: center; padding: 4rem 2rem;">
        <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top: 4px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 1rem; color: #6b7280;">Loading...</p>
        ${this.isOffline ? '<p style="color: #ef4444; font-size: 14px;">📵 Mode offline - Loading data tersimpan</p>' : ''}
      </div>
    `;
  },

  renderError(message) {
    this.stopCamera();
    this.main.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div style="background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 2rem; border-radius: 12px; max-width: 500px; margin: 0 auto;">
          <h3 style="margin: 0 0 1rem 0;">❌ Terjadi Kesalahan</h3>
          <p role="alert" style="margin: 0 0 1.5rem 0;">${message}</p>
          ${this.isOffline ? '<p style="font-size: 14px; margin: 0;">📵 Periksa koneksi internet Anda</p>' : ''}
        </div>
        <button onclick="location.hash='home'" style="
          margin-top: 2rem;
          background: #2563eb;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        ">Kembali ke Home</button>
      </div>
    `;
  },

  updateNavVisibility(loggedIn, hash) {
    const navHome = document.getElementById('nav-home');
    const navAdd = document.getElementById('nav-add');
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const navLogout = document.getElementById('nav-logout');
    const navFavorites = document.getElementById('nav-favorites');

    if (!loggedIn) {
      navHome.style.display = 'none';
      navAdd.style.display = 'none';
      navLogout.style.display = 'none';
      navLogin.style.display = 'inline-block';
      navFavorites.style.display = '';
      navRegister.style.display = 'inline-block';
    } else {
      navHome.style.display = 'inline-block';
      navAdd.style.display = 'inline-block';
      navLogout.style.display = 'inline-block';
      navLogin.style.display = 'none';
      navFavorites.style.display = 'inline-block';
      navRegister.style.display = 'none';
    }

    if (hash === 'login' || hash === 'register') {
      navHome.style.display = 'none';
      navAdd.style.display = 'none';
      navFavorites.style.display = 'none';
    }

    if (this.isOffline && navAdd) {
      navAdd.style.opacity = '0.5';
      navAdd.style.pointerEvents = 'none';
      navAdd.title = 'Tidak tersedia offline';
    } else if (navAdd) {
      navAdd.style.opacity = '1';
      navAdd.style.pointerEvents = 'auto';
      navAdd.title = '';
    }
  },

  async subscribePushIfNeeded(token) {
    if (navigator.onLine) {
      await requestNotificationPermissionAndSubscribe(token);
    }
  }
};

export default View;
