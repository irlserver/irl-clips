/**
 * Get query parameter from URL with type conversion and default value
 * @param {string} param - Parameter name
 * @param {any} defaultValue - Default value if parameter is missing
 * @returns {any} Parsed parameter value
 */
export function getQueryParam(param, defaultValue) {
  const urlParams = new URLSearchParams(window.location.search);
  const value = urlParams.get(param);

  if (value === null) return defaultValue;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  if (!isNaN(value)) return parseFloat(value);

  return value;
}

/**
 * Validate required query parameters
 * @param {string[]} requiredParams - Array of required parameter names
 * @throws {Error} If any required parameter is missing
 */
export function validateRequiredParams(requiredParams) {
  const missing = requiredParams.filter((param) => {
    const value = getQueryParam(param, null);
    return value === null || value === "";
  });

  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(", ")}`);
  }
}
