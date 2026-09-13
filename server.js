// server.js
/**
 * Simple development server for local testing only
 * This server simply serves static files and is not intended for production use
 */
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedLocales = [
    'en-US', 'de-DE', 'it-IT', 'fr-FR',
    'es-ES', 'pt-PT', 'pl-PL', 'cs-CZ'
];

app.disable('x-powered-by');

app.use((req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    });

    if (req.path === '/js/config.js') {
        res.set('Cache-Control', 'no-store');
    }

    next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle API requests for translations
app.get(/^\/locales\/([^/]+)$/i, (req, res, next) => {
    try {
        const filename = req.params[0];
        
        // Extract locale from filename (e.g. "translation.en-US.json" -> "en-US")
        const localeMatch = filename.match(/^translation\.([^\.]+)\.json$/);
        
        if (!localeMatch || !localeMatch[1]) {
            return res.status(400).send('Invalid locale format in filename');
        }
        
        const requestedLocale = localeMatch[1];
        const matchedLocale = allowedLocales.find(locale => locale.toLocaleLowerCase() === requestedLocale.toLocaleLowerCase());
        
        // Validate that the requested locale is in our allowed list
        if (!matchedLocale) {
            return res.status(403).send('Locale not supported');
        }
        
        // Construct a safe file path after validation
        const filePath = path.join(__dirname, 'public', 'locales', `translation.${matchedLocale}.json`);
        
        // Check if file exists
        if (require('fs').existsSync(filePath)) {
            // If the translation file exists, serve it
            res.sendFile(filePath);
        } else {
            // If file doesn't exist, return 404
            res.status(404).send('Translation file not found');
        }
    } catch (err) {
        next(err);
    }
});

// For HTML page routes, serve the appropriate HTML file
app.get(['/', '/index.html', '/event-details.html'], (req, res) => {
    // Check if the request is for event-details.html
    if (req.path === '/event-details.html' || req.path.includes('event-details')) {
        res.sendFile(path.join(__dirname, 'public', 'event-details.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// For any other route that wasn't caught by static or explicit routes above
app.use((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return res.status(404).send('Not found');
    }

    // Check if it appears to be an HTML navigation request
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
        // For HTML requests, serve the index for client-side routing
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        // Otherwise, return 404
        res.status(404).send('Not found');
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Development server error:', err?.message || 'unknown error');
    res.status(500).send('Something went wrong!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`- View events list at http://localhost:${PORT}/`);
    console.log(`- View event details at http://localhost:${PORT}/event-details.html?id=[EVENT_ID]`);
});
