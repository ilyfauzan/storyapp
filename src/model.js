const API_BASE = 'https://story-api.dicoding.dev/v1';

const Model = {
  token: localStorage.getItem('token') || null,

  async register(name, email, password) {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    return data;
  },

 async login(email, password) {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }), // ← Hapus 'name'
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    console.log('Login response:', data);
    
    if (!data.error && data.loginResult && data.loginResult.token) {
      this.token = data.loginResult.token;
      localStorage.setItem('token', this.token);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
},

  logout() {
    this.token = null;
    localStorage.removeItem('token');
  },

  async fetchStories() {
    if (!this.token) return [];
    const res = await fetch(`${API_BASE}/stories?location=1`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    const data = await res.json();
    if (!data.error) {
      return data.listStory;
    }
    return [];
  },

  async addStory(formData) {
    if (!this.token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}/stories`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });
    const data = await res.json();
    return !data.error;
  },
};

export default Model;