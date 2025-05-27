import Model from './model.js';
import View from './view.js';
import { requestNotificationPermissionAndSubscribe } from './push.js';

class Presenter {
  constructor() {
    this.model = Model;
    this.view = View;
    this.initialized = false;
  }

  init() {
    if (this.initialized) {
      console.log('Presenter already initialized');
      return;
    }

    console.log('🚀 Initializing Presenter...');
    
    this.view.registerRouteHandlers(() => this.route());
    
    this.route().catch(error => {
      console.error('Initial routing failed:', error);
      this.view.renderError('Gagal memuat aplikasi');
    });

    this.initialized = true;
    console.log('✅ Presenter initialized successfully');
  }

  async route() {
    if (this.view.handleSkipLink()) return;

    const hash = this.view.getHash() || 'login';

    this.view.updateNavVisibility(!!this.model.token, hash);
    this.view.startViewTransition(() => this.routeToPage(hash));
  }

  async routeToPage(hash) {
    switch (hash) {
      case 'home':
        await this.showHome();
        break;
      case 'add':
        this.showAddStory();
        break;
       case 'favorites':
        await View.renderFavorites();
        break;
      case 'login':
        this.showLogin();
        break;
      case 'register':
        this.showRegister();
        break;
      case 'logout':
        this.logout();
        break;
      default:
        this.view.renderError('Halaman tidak ditemukan');
        break;
    }
  }

  async showHome() {
    this.view.renderLoading();
    const stories = await this.model.fetchStories();
    this.view.renderHome(stories);
    this.view.showMarkers(stories);
    this.view.focusMainContent();
  }

  showAddStory() {
    this.view.renderAddStory(async (formData) => {
      if (
        !formData.description ||
        !formData.lat ||
        !formData.lon ||
        (formData.photoData === '' && !formData.photoFile)
      ) {
        return {
          success: false,
          message: 'Semua field wajib diisi dan lokasi harus dipilih.'
        };
      }

      const submitData = new FormData();
      submitData.append('description', formData.description);
      submitData.append('lat', formData.lat);
      submitData.append('lon', formData.lon);

      if (formData.photoData) {
        const arr = formData.photoData.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
        const photoBlob = new Blob([u8arr], { type: mime });
        submitData.append('photo', photoBlob, 'photo.png');
      } else {
        submitData.append('photo', formData.photoFile);
      }

      try {
        const success = await this.model.addStory(submitData);
        return {
          success: success,
          message: success ? 'Story berhasil ditambahkan!' : 'Gagal menambahkan story.'
        };
      } catch (error) {
        return {
          success: false,
          message: `Terjadi kesalahan: ${error.message}`
        };
      }
    });
    this.view.focusMainContent();
  }

  showLogin() {
    this.view.renderLogin(async (formData) => {
      const result = await this.model.login(formData.email, formData.password);
      if (result === true) {
        await requestNotificationPermissionAndSubscribe(this.model.token);
        this.view.navigateTo('home'); // Pastikan ini dipanggil setelah login berhasil
      }
      return {
        success: result === true,
        message: result === true ? '' : 'Login gagal. Periksa email dan password.'
      };
    });
    this.view.focusMainContent();
  }

  showRegister() {
    this.view.renderRegister(async (formData) => {
      const result = await this.model.register(formData.name, formData.email, formData.password);
      return {
        success: !result.error,
        message: result.message || 'Registrasi gagal.'
      };
    });
    this.view.focusMainContent();
  }

  logout() {
    this.model.logout();
    this.view.navigateTo('login');
  }
}

export default new Presenter();
