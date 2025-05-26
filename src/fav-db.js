import { openDB } from 'idb';

const DB_NAME = 'story-fav-db';
const STORE_NAME = 'favorites';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    }
  });
}

async function fetchImageAsBlob(url) {
  const response = await fetch(url);
  return await response.blob();
}

export async function addFavorite(story) {
  const db = await getDB();
  try {
    const imageBlob = await fetchImageAsBlob(story.photoUrl);
    const storyWithBlob = { ...story, photoBlob: imageBlob };
    await db.put(STORE_NAME, storyWithBlob);
  } catch (error) {
    await db.put(STORE_NAME, story);
  }
}

export async function removeFavorite(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function getAllFavorites() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function isFavorite(id) {
  const db = await getDB();
  return !!(await db.get(STORE_NAME, id));
}
