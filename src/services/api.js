const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const response = await fetch(`${API_URL}${normalizedEndpoint}`, {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const responseText = await response.text();
  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }
  }

  if (!response.ok) {
    throw new Error(
      data.message || `Request gagal dengan status ${response.status}`
    );
  }

  return data;
}

export default API_URL;

console.log("API URL:", API_URL);