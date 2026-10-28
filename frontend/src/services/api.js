const API_BASE = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000/api';

export async function generateItinerary(tripData) {
  try {
    const response = await fetch(`${API_BASE}/trips/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error("API error:", err);
    throw err;
  }
}