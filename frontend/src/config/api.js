export const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE_URL;

// Build absolute endpoint from BACKEND_BASE.
// Example: apiUrl("/get_fees.php") -> "<base>/get_fees.php"
export const apiUrl = (path) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_BASE}${p}`;
};
