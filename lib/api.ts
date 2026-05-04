const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const apiFetch = (path: string, options?: RequestInit) => {
  return fetch(`${basePath}${path}`, options);
};