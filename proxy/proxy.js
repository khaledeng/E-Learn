// Install these packages: npm install express cors node-fetch
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Make sure this line is exactly correct
const path = require('path');

const app = express();
const PORT = 3000;


const API_KEYS = {
    // N2YO: "HDJU8W-547M4U-AK737Z-5KEA", 
    N2YO: "9UK5QD-3BZDNQ-KWUH2A-5KFI",
    NASA: "69dIc1IkaKKMSRhmHXTC78gY0gZE5YHoThXBYWPo",
    OPENWEATHER: "bf997f92aee76cee24f92d4f8f4112e4" // This is the corrected key
};

app.use(cors());

// A new route to serve the main HTML file at the root URL
app.get('/', (req, res) => {
    // res.sendFile(path.join(__dirname, 'public', 'Explorer.html'));
    res.sendFile(path.join(__dirname, 'public', 'OrbitalView.html'));
});


// To serve other static files (like CSS, JS, images) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/n2yo/above', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required.' });
        }
        const url = `https://api.n2yo.com/rest/v1/satellite/above/${lat}/${lng}/0/70/0/?apiKey=${API_KEYS.N2YO}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`N2YO API Error: ${response.statusText}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('N2YO Above error:', error);
        res.status(500).json({ error: 'Failed to fetch satellite data.' });
    }
});


app.get('/api/n2yo/passes', async (req, res) => {
    try {
        const { satId, lat, lng } = req.query;
        if (!satId || !lat || !lng) {
            return res.status(400).json({ error: 'Satellite ID, latitude, and longitude are required.' });
        }
        const url = `https://api.n2yo.com/rest/v1/satellite/radiopasses/${satId}/${lat}/${lng}/0/7/10/?apiKey=${API_KEYS.N2YO}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`N2YO API Error: ${response.statusText}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('N2YO Passes error:', error);
        res.status(500).json({ error: 'Failed to fetch pass data.' });
    }
});


app.get('/api/nasa/earth-image', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required.' });
        }
        const dim = 0.2;
        const url = `https://api.nasa.gov/planetary/earth/imagery?lat=${lat}&lon=${lng}&dim=${dim}&api_key=${API_KEYS.NASA}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`NASA API Error: ${response.statusText}`);
        }
        // Since the response is an image, it must be piped back as-is
        response.body.pipe(res);
    } catch (error) {
        console.error('NASA Earth Image error:', error);
        res.status(500).json({ error: 'Failed to fetch NASA image.' });
    }
});

// weather
app.get('/api/weather', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required.' });
        }
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${API_KEYS.OPENWEATHER}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`OpenWeatherMap API Error: ${response.statusText}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Weather error:', error);
        res.status(500).json({ error: 'Failed to fetch weather data.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});