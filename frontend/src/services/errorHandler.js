/**
 * Business-friendly error message transformer.
 * Converts technical exceptions, HTTP status codes, and developer diagnostics into clean business notifications.
 */
export function formatBusinessError(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;

  // Handle direct string errors
  if (typeof err === 'string') {
    return sanitizeTechnicalText(err, fallback);
  }

  // Handle Axios / backend responses
  const detail = err.response?.data?.detail;
  if (detail) {
    if (typeof detail === 'string') {
      return sanitizeTechnicalText(detail, fallback);
    }
    if (typeof detail === 'object') {
      if (detail.error === 'SEARCH_PROVIDER_NOT_CONFIGURED') {
        return "Buyer discovery isn't connected yet. Please update your discovery settings.";
      }
      if (detail.error === 'DEMO_DATA_OUTREACH_BLOCKED') {
        return "Demo data cannot be sent live outreach.";
      }
      if (detail.message) {
        return sanitizeTechnicalText(detail.message, fallback);
      }
    }
  }

  // HTTP status code handling
  const status = err.response?.status;
  if (status === 401) {
    return "Authentication required. Please check your application configuration.";
  }
  if (status === 403) {
    return "Access to this service is restricted. Please check your application configuration.";
  }
  if (status === 404) {
    return "The requested information could not be found.";
  }
  if (status === 422) {
    return "Please verify the entered details and try again.";
  }
  if (status === 429) {
    return "Discovery rate limit reached. Please wait a moment before trying again.";
  }
  if (status === 502 || status === 503) {
    return "That service is temporarily unavailable. Please try again.";
  }
  if (status >= 500) {
    return "Our service is temporarily busy. Please try again in a moment.";
  }

  // Network / server connection errors
  if (err.message) {
    if (err.message.includes('ECONNREFUSED')) {
      return "Unable to connect right now.";
    }
    if (err.message.includes('Network Error')) {
      return "Unable to connect to the export platform. Please check your connection.";
    }
    if (err.message.includes('timeout')) {
      return "The operation took longer than expected. Please try again.";
    }
  }

  return fallback;
}

function sanitizeTechnicalText(text, fallback) {
  if (!text) return fallback;
  
  // If technical details or stack traces are present, return friendly business message
  const technicalPatterns = [
    /search_api_key/i,
    /gemini_api_key/i,
    /gmail_app_password/i,
    /smtp/i,
    /search_engine_id/i,
    /cx id/i,
    /500 internal/i,
    /fastapi/i,
    /uvicorn/i,
    /traceback/i,
    /exception/i,
    /errno/i,
    /axios/i,
    /status code/i,
    /unauthorized/i,
    /econnrefused/i
  ];

  for (const pattern of technicalPatterns) {
    if (pattern.test(text)) {
      if (/search/i.test(text)) {
        return "Buyer discovery is currently unavailable. Please check your configuration.";
      }
      if (/gemini|ai|model/i.test(text)) {
        return "AI qualification service is currently unavailable. Please try again later.";
      }
      if (/smtp|gmail|mail/i.test(text)) {
        return "Email account connection issue. Please check your email settings.";
      }
      if (/unauthorized/i.test(text)) {
        return "Your connection needs attention. Please check Settings.";
      }
      return fallback;
    }
  }

  return text;
}

export default formatBusinessError;
