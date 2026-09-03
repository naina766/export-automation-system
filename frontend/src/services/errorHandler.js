/**
 * Business-friendly error message transformer.
 * Prevents technical jargon, stack traces, and developer diagnostics from leaking into the UI.
 */
export function formatBusinessError(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;

  // Handle strings directly
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
        return "Buyer discovery is not configured yet. Please update your discovery settings.";
      }
      if (detail.message) {
        return sanitizeTechnicalText(detail.message, fallback);
      }
    }
  }

  // Network / server connection errors
  if (err.message && (err.message.includes('Network Error') || err.message.includes('ECONNREFUSED'))) {
    return "Unable to connect to the export platform. Please check your connection and try again.";
  }

  if (err.response?.status === 404) {
    return "The requested information could not be found.";
  }

  if (err.response?.status === 422) {
    return "Please verify the entered details and try again.";
  }

  if (err.response?.status >= 500) {
    return "Our service is temporarily busy. Please try again in a moment.";
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
    /errno/i
  ];

  for (const pattern of technicalPatterns) {
    if (pattern.test(text)) {
      if (/search/i.test(text)) {
        return "Buyer discovery service needs configuration in Settings.";
      }
      if (/gemini|ai|model/i.test(text)) {
        return "AI qualification service is currently unavailable. Please try again later.";
      }
      if (/smtp|gmail|mail/i.test(text)) {
        return "Email service connection issue. Please check your email settings.";
      }
      return fallback;
    }
  }

  return text;
}
