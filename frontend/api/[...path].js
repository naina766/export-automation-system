// Vercel Serverless Function: Secure API Proxy with Server-Side Key Injection
// Keeps EXPORT_API_KEY 100% server-side on Vercel without exposing secrets to client browser.

export const config = {
  api: {
    bodyParser: false, // Stream request body directly for multipart/json payloads
  },
};

export default async function handler(req, res) {
  const backendUrl = process.env.BACKEND_API_URL || "https://export-automation-system.onrender.com";
  const apiKey = process.env.EXPORT_API_KEY || process.env.API_KEY || "";

  // Extract path from query params or URL
  const { path } = req.query;
  const pathStr = Array.isArray(path) ? path.join('/') : (path || '');

  // Preserve query parameters
  const parsedUrl = new URL(req.url, 'http://localhost');
  const searchParams = parsedUrl.searchParams;
  searchParams.delete('path');
  const queryString = searchParams.toString();

  const targetUrl = `${backendUrl.replace(/\/+$/, '')}/api/${pathStr}${queryString ? '?' + queryString : ''}`;

  // Copy incoming headers and inject server-side API Key
  const headers = {};
  for (const [key, val] of Object.entries(req.headers)) {
    if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'connection') {
      headers[key] = val;
    }
  }

  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = req;
      fetchOptions.duplex = 'half';
    }

    const response = await fetch(targetUrl, fetchOptions);

    res.status(response.status);
    response.headers.forEach((val, key) => {
      if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, val);
      }
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    res.status(502).json({
      detail: "Bad Gateway: unable to connect to backend service."
    });
  }
}
