// Professional Satellite Explorer JavaScript Module
class SatelliteExplorer {
    constructor() {
        this.map = null;
        this.satMarkersLayer = null;
        this.countryLayer = null;
        this.currentLocation = { lat: 26.1626, lng: 32.7094 };
        this.init();
    }

    async init() {
        this.initializeMap();
        this.bindEventListeners();
        this.initializeAnimations();
        this.presetDefaultLocation();
    }

    // Map Initialization
    initializeMap() {
        this.map = L.map('map', { 
            zoomControl: true,
            attributionControl: false,
            fadeAnimation: true,
            zoomAnimation: true
        }).setView([this.currentLocation.lat, this.currentLocation.lng], 5);

        // Custom tile layer with professional styling
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '© Esri'
        }).addTo(this.map);

        // Initialize layers
        this.satMarkersLayer = L.layerGroup().addTo(this.map);
        this.countryLayer = L.geoJSON(null, { 
            style: { 
                color: '#FFD166', 
                weight: 3, 
                fill: false,
                opacity: 0.8
            } 
        }).addTo(this.map);

        // Add custom map controls
        this.addCustomMapControls();
    }

    addCustomMapControls() {
        const customControl = L.control({ position: 'topright' });
        customControl.onAdd = function() {
            const div = L.DomUtil.create('div', 'custom-map-control');
            div.innerHTML = `
                <div class="map-legend">
                    <div class="legend-item">
                        <span class="legend-color" style="background: #FFD166;"></span>
                        <span>Satellite Tracks</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #2D4D7F;"></span>
                        <span>Ground Stations</span>
                    </div>
                </div>
            `;
            return div;
        };
        customControl.addTo(this.map);
    }

    // Event Listeners
    bindEventListeners() {
        // Location services
        document.getElementById('useLocationBtn').addEventListener('click', () => {
            this.requestUserLocation();
        });

        // Satellite tracking
        document.getElementById('findAboveBtn').addEventListener('click', () => {
            this.findSatellitesAbove();
        });

        document.getElementById('trackIdBtn').addEventListener('click', () => {
            this.trackSpecificSatellite();
        });

        // Earth imagery
        document.getElementById('getImageBtn').addEventListener('click', () => {
            this.fetchEarthImage();
        });

        // Country search
        document.getElementById('countryBtn').addEventListener('click', () => {
            this.searchCountry();
        });

        // Help system
        document.getElementById('helpBtn').addEventListener('click', () => {
            this.showMissionGuide();
        });

        // Input change handlers
        ['latInput', 'lngInput'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.updateLocation();
            });
        });

        // Enter key handlers
        document.getElementById('countryInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCountry();
        });

        document.getElementById('satIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.trackSpecificSatellite();
        });
    }

    // Location Services
    requestUserLocation() {
        const btn = document.getElementById('useLocationBtn');
        const originalText = btn.innerText;
        
        btn.innerText = 'Acquiring GPS...';
        btn.disabled = true;

        if (!navigator.geolocation) {
            this.showAlert('Geolocation is not supported by this browser', 'error');
            this.resetButton(btn, originalText);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lng = position.coords.longitude.toFixed(6);
                
                this.updateInputs(lat, lng);
                this.updateLocationStatus(`GPS Lock Acquired: ${lat}, ${lng}`);
                this.map.setView([lat, lng], 10);
                this.fetchWeatherData(lat, lng);
                
                // Add location marker
                this.addLocationMarker(lat, lng);
                
                this.resetButton(btn, originalText);
            },
            (error) => {
                let message = 'Location access denied';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out';
                        break;
                }
                this.showAlert(message, 'error');
                this.resetButton(btn, originalText);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }

    updateInputs(lat, lng) {
        document.getElementById('latInput').value = lat;
        document.getElementById('lngInput').value = lng;
        this.currentLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
    }

    updateLocationStatus(message) {
        document.getElementById('locationStatus').textContent = message;
        document.getElementById('locationStatus').classList.add('status-active');
    }

    addLocationMarker(lat, lng) {
        this.satMarkersLayer.clearLayers();
        const marker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-location-marker',
                html: '<div class="marker-pulse"></div>',
                iconSize: [20, 20]
            })
        }).addTo(this.satMarkersLayer);
        
        marker.bindPopup(`
            <div class="marker-popup">
                <h6>Ground Station</h6>
                <p>Coordinates: ${lat}, ${lng}</p>
                <p>Status: Active</p>
            </div>
        `).openPopup();
    }

    updateLocation() {
        const lat = document.getElementById('latInput').value;
        const lng = document.getElementById('lngInput').value;
        
        if (lat && lng && this.isValidCoordinate(lat, lng)) {
            this.currentLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
            this.map.setView([lat, lng], 8);
            this.fetchWeatherData(lat, lng);
        }
    }

    isValidCoordinate(lat, lng) {
        return !isNaN(lat) && !isNaN(lng) && 
               lat >= -90 && lat <= 90 && 
               lng >= -180 && lng <= 180;
    }

    // Satellite Tracking Functions
    async findSatellitesAbove() {
        const lat = document.getElementById('latInput').value;
        const lng = document.getElementById('lngInput').value;
        
        if (!lat || !lng) {
            this.showAlert('Please set your location coordinates first', 'warning');
            return;
        }

        const btn = document.getElementById('findAboveBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Scanning Orbital Space...';
        btn.disabled = true;

        try {
            const response = await fetch(`/api/n2yo/above?lat=${lat}&lng=${lng}`);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            
            const data = await response.json();
            this.renderSatelliteList(data.above || []);
            
            if (data.above && data.above.length > 0) {
                this.updateLocationStatus(`Found ${data.above.length} satellites overhead`);
            }
        } catch (error) {
            console.error('Satellite tracking error:', error);
            this.showAlert('Unable to retrieve satellite data. Check your connection.', 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    renderSatelliteList(satellites) {
        const container = document.getElementById('satList');
        container.innerHTML = '';
        
        if (!satellites || satellites.length === 0) {
            container.innerHTML = `
                <div class="no-satellites">
                    <div class="no-data-icon">📡</div>
                    <p>No satellites detected above your location</p>
                    <small>Try a different time or location</small>
                </div>
            `;
            return;
        }

        satellites.forEach((sat, index) => {
            const item = document.createElement('button');
            item.className = 'satellite-item';
            item.innerHTML = `
                <div class="satellite-name">${sat.satname}</div>
                <div class="satellite-id">NORAD ID: ${sat.satid}</div>
                <div class="satellite-altitude">${sat.satalt ? `${sat.satalt.toFixed(0)} km altitude` : 'Altitude unknown'}</div>
            `;
            
            item.addEventListener('click', () => {
                this.trackSatelliteById(sat.satid, sat.satname);
                // Add visual feedback
                item.classList.add('selected');
                setTimeout(() => item.classList.remove('selected'), 2000);
            });
            
            container.appendChild(item);
            
            // Animate item appearance
            setTimeout(() => item.classList.add('fade-in', 'visible'), index * 100);
        });
    }

    async trackSpecificSatellite() {
        const satId = document.getElementById('satIdInput').value;
        if (!satId) {
            this.showAlert('Please enter a NORAD ID (e.g., 25544 for ISS)', 'warning');
            return;
        }
        
        await this.trackSatelliteById(satId, `Satellite ${satId}`);
    }

    async trackSatelliteById(satId, name) {
        const lat = this.currentLocation.lat;
        const lng = this.currentLocation.lng;
        
        try {
            const response = await fetch(`/api/n2yo/passes?satId=${satId}&lat=${lat}&lng=${lng}`);
            if (!response.ok) throw new Error(`Pass prediction error: ${response.status}`);
            
            const data = await response.json();
            
            if (!data.passes || data.passes.length === 0) {
                this.showAlert(`No upcoming passes found for ${name}`, 'info');
                return;
            }

            const pass = data.passes[0];
            const passTime = new Date(pass.startUTC * 1000);
            
            // Create enhanced popup content
            const popupContent = this.createPassPopup(name, pass, passTime);
            
            // Clear existing markers and add new pass visualization
            this.satMarkersLayer.clearLayers();
            
            // Add ground station marker
            const groundMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'ground-station-marker',
                    html: '<div class="station-icon">🏢</div>',
                    iconSize: [30, 30]
                })
            }).addTo(this.satMarkersLayer);
            
            // Add satellite pass visualization
            this.visualizeSatellitePass(pass, lat, lng);
            
            groundMarker.bindPopup(popupContent).openPopup();
            this.map.setView([lat, lng], 8);
            
            this.updateLocationStatus(`Tracking ${name} - Next pass: ${passTime.toLocaleDateString()}`);
            
        } catch (error) {
            console.error('Pass prediction error:', error);
            this.showAlert('Unable to predict satellite passes', 'error');
        }
    }

    createPassPopup(name, pass, passTime) {
        const duration = Math.round(pass.duration);
        const maxElevation = pass.maxEl;
        
        return `
            <div class="pass-popup">
                <h6 class="pass-title">${name}</h6>
                <div class="pass-details">
                    <div class="pass-row">
                        <span class="pass-label">Next Pass:</span>
                        <span class="pass-value">${passTime.toLocaleString()}</span>
                    </div>
                    <div class="pass-row">
                        <span class="pass-label">Duration:</span>
                        <span class="pass-value">${duration} seconds</span>
                    </div>
                    <div class="pass-row">
                        <span class="pass-label">Max Elevation:</span>
                        <span class="pass-value">${maxElevation}°</span>
                    </div>
                    <div class="pass-status ${maxElevation > 30 ? 'excellent' : maxElevation > 15 ? 'good' : 'fair'}">
                        ${maxElevation > 30 ? 'Excellent visibility' : maxElevation > 15 ? 'Good visibility' : 'Fair visibility'}
                    </div>
                </div>
            </div>
        `;
    }

    visualizeSatellitePass(pass, lat, lng) {
        // Create satellite track visualization
        const trackPoints = [];
        const steps = 20;
        
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const trackLat = lat + (Math.sin(progress * Math.PI) * 0.5);
            const trackLng = lng + (Math.cos(progress * Math.PI * 2) * 0.8);
            trackPoints.push([trackLat, trackLng]);
        }
        
        // Add track line
        L.polyline(trackPoints, {
            color: '#FFD166',
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 5'
        }).addTo(this.satMarkersLayer);
        
        // Add start and end markers
        L.marker(trackPoints[0], {
            icon: L.divIcon({
                className: 'pass-marker start-marker',
                html: '<div>START</div>',
                iconSize: [50, 20]
            })
        }).addTo(this.satMarkersLayer);
        
        L.marker(trackPoints[trackPoints.length - 1], {
            icon: L.divIcon({
                className: 'pass-marker end-marker',
                html: '<div>END</div>',
                iconSize: [50, 20]
            })
        }).addTo(this.satMarkersLayer);
    }

    // Earth Imagery Functions
    async fetchEarthImage() {
        const lat = document.getElementById('latInput').value;
        const lng = document.getElementById('lngInput').value;
        
        if (!lat || !lng) {
            this.showAlert('Please set coordinates first', 'warning');
            return;
        }

        const btn = document.getElementById('getImageBtn');
        const imgInfo = document.getElementById('imgInfo');
        const originalText = btn.textContent;
        
        btn.textContent = 'Acquiring Satellite Imagery...';
        btn.disabled = true;
        imgInfo.textContent = 'Requesting image from NASA Earth Imagery API...';
        imgInfo.className = 'image-info loading';

        try {
            const response = await fetch(`/api/nasa/earth-image?lat=${lat}&lng=${lng}`);
            if (!response.ok) throw new Error(`NASA API Error: ${response.status}`);
            
            const blob = await response.blob();
            const imgEl = document.getElementById('earthImg');
            
            // Create object URL and display image
            if (imgEl.src) URL.revokeObjectURL(imgEl.src);
            imgEl.src = URL.createObjectURL(blob);
            imgEl.classList.remove('d-none');
            imgEl.classList.add('fade-in', 'visible');
            
            imgInfo.textContent = `Latest satellite image captured for coordinates: ${lat}, ${lng}`;
            imgInfo.className = 'image-info success';
            
        } catch (error) {
            console.error('Earth imagery error:', error);
            imgInfo.textContent = 'Unable to retrieve satellite imagery. Try different coordinates.';
            imgInfo.className = 'image-info error';
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    // Weather Data Functions
    async fetchWeatherData(lat, lng) {
        try {
            const response = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
            if (!response.ok) throw new Error(`Weather API Error: ${response.status}`);
            
            const data = await response.json();
            this.displayWeatherData(data);
            
        } catch (error) {
            console.error('Weather data error:', error);
            document.getElementById('weatherBox').innerHTML = `
                <div class="weather-error">
                    <div class="error-icon"><i class="bi bi-x-circle-fill text-danger"></i></div>
                    <p>Weather data unavailable</p>
                </div>
            `;
        }
    }

    displayWeatherData(data) {
        const weatherBox = document.getElementById('weatherBox');
        const condition = data.weather[0];
        const temp = Math.round(data.main.temp);
        const windSpeed = data.wind.speed;
        const humidity = data.main.humidity;
        const visibility = data.visibility ? (data.visibility / 1000).toFixed(1) : 'N/A';
        
        weatherBox.innerHTML = `
            <div class="weather-data">
                <div class="weather-location">${data.name || 'Current Location'}</div>
                <div class="weather-condition">${condition.description}</div>
                <div class="weather-details">
                    <div class="weather-detail">
                        <span class="weather-label">Temperature:</span>
                        <span class="weather-value">${temp}°C</span>
                    </div>
                    <div class="weather-detail">
                        <span class="weather-label">Wind Speed:</span>
                        <span class="weather-value">${windSpeed} m/s</span>
                    </div>
                    <div class="weather-detail">
                        <span class="weather-label">Humidity:</span>
                        <span class="weather-value">${humidity}%</span>
                    </div>
                    <div class="weather-detail">
                        <span class="weather-label">Visibility:</span>
                        <span class="weather-value">${visibility} km</span>
                    </div>
                </div>
            </div>
        `;
        
        weatherBox.classList.add('fade-in', 'visible');
    }

    // Country Search Functions
    async searchCountry() {
        const countryName = document.getElementById('countryInput').value.trim();
        if (!countryName) {
            this.showAlert('Please enter a country name', 'warning');
            return;
        }

        const btn = document.getElementById('countryBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Locating...';
        btn.disabled = true;

        try {
            const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=false`);
            if (!response.ok) throw new Error('Country not found');
            
            const countries = await response.json();
            const country = countries[0];
            
            // Get country coordinates
            const latlng = country.capitalInfo?.latlng || country.latlng;
            if (!latlng) throw new Error('Coordinates not available');
            
            // Update map and add country marker
            this.map.fitBounds([
                [latlng[0] - 3, latlng[1] - 3],
                [latlng[0] + 3, latlng[1] + 3]
            ]);
            
            this.satMarkersLayer.clearLayers();
            const countryMarker = L.marker(latlng, {
                icon: L.divIcon({
                    className: 'country-marker',
                    html: `<div class="country-flag">${country.flag || '🏛️'}</div>`,
                    iconSize: [40, 40]
                })
            }).addTo(this.satMarkersLayer);
            
            const popupContent = this.createCountryPopup(country);
            countryMarker.bindPopup(popupContent).openPopup();
            
            this.updateLocationStatus(`Located: ${country.name.common}`);
            
        } catch (error) {
            console.error('Country search error:', error);
            this.showAlert('Country not found. Please check spelling.', 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    createCountryPopup(country) {
        const capital = country.capital?.[0] || 'Not specified';
        const population = country.population ? country.population.toLocaleString() : 'Unknown';
        const area = country.area ? country.area.toLocaleString() + ' km²' : 'Unknown';
        
        return `
            <div class="country-popup">
                <h6>${country.name.common} ${country.flag || ''}</h6>
                <div class="country-details">
                    <div class="country-row">
                        <span class="country-label">Capital:</span>
                        <span class="country-value">${capital}</span>
                    </div>
                    <div class="country-row">
                        <span class="country-label">Population:</span>
                        <span class="country-value">${population}</span>
                    </div>
                    <div class="country-row">
                        <span class="country-label">Area:</span>
                        <span class="country-value">${area}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // UI Helper Functions
    showAlert(message, type = 'info') {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `custom-alert alert-${type}`;
        alert.innerHTML = `
            <div class="alert-content">
                <span class="alert-icon">${this.getAlertIcon(type)}</span>
                <span class="alert-message">${message}</span>
                <button class="alert-close">x</button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.add('fade-out');
                setTimeout(() => alert.remove(), 300);
            }
        }, 5000);
        
        // Manual close
        alert.querySelector('.alert-close').addEventListener('click', () => {
            alert.classList.add('fade-out');
            setTimeout(() => alert.remove(), 300);
        });
    }

    getAlertIcon(type) {
        const icons = {
            'info': 'ℹ',
            'success': 'Success',
            'warning': 'Warning!',
            'error': 'Error'
        };
        return icons[type] || icons['info'];
    }

    resetButton(button, originalText) {
        button.textContent = originalText;
        button.disabled = false;
    }

    showMissionGuide() {
        const guide = `
=== ORBITAL VIEW MISSION GUIDE ===

LOCATION SETUP
• Click "Activate GPS Location" for automatic positioning
• Or manually enter latitude/longitude coordinates
• Coordinates are required for all tracking operations

SATELLITE TRACKING
• "Scan Overhead Satellites" finds satellites above your location
• Enter NORAD ID (25544 = ISS) to track specific satellites
• Click any satellite in the list to view pass predictions

EARTH OBSERVATION
• "Capture Satellite Image" retrieves NASA imagery for your coordinates
• Images show the latest available satellite photography
• Resolution depends on satellite coverage and weather

ENVIRONMENTAL DATA
• Weather updates automatically when location changes
• Atmospheric conditions affect satellite visibility
• Clear skies provide best tracking conditions

NAVIGATION
• Use country search to explore different regions
• Map shows satellite tracks and ground stations
• Click markers for detailed information

TECHNICAL NOTES:
• All data sourced from professional APIs (N2YO, NASA, OpenWeather)
• Satellite predictions accurate to within minutes
• Real-time tracking updates every few seconds
• Best viewing times are during twilight hours

For technical support or educational resources, 
visit: orbital-view.space/support
        `;
        
        alert(guide);
    }

    // Animation System
    initializeAnimations() {
        // Intersection Observer for scroll animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        // Observe elements with fade-in class
        document.querySelectorAll('.fade-in').forEach(el => {
            observer.observe(el);
        });
    }

    // Default Setup
    presetDefaultLocation() {
        document.getElementById('latInput').value = this.currentLocation.lat.toFixed(6);
        document.getElementById('lngInput').value = this.currentLocation.lng.toFixed(6);
        this.updateLocationStatus('Default coordinates loaded (Egypt)');
        this.fetchWeatherData(this.currentLocation.lat, this.currentLocation.lng);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const app = new SatelliteExplorer();
    
    // Add global error handler
    window.addEventListener('error', (event) => {
        console.error('Application error:', event.error);
        app.showAlert('An unexpected error occurred. Please refresh the page.', 'error');
    });
    
    // Add performance monitoring
    window.addEventListener('load', () => {
        const loadTime = performance.now();
        console.log(`Application loaded in ${loadTime.toFixed(2)}ms`);
    });
});

// Service Worker registration for offline functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Additional CSS for custom components (injected dynamically)
const customCSS = `
    .custom-alert {
        position: fixed;
        top: 100px;
        right: 20px;
        max-width: 400px;
        z-index: 10000;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        opacity: 0;
        transform: translateX(100%);
        animation: slideIn 0.3s ease forwards;
    }

    .custom-alert.fade-out {
        animation: slideOut 0.3s ease forwards;
    }

    @keyframes slideIn {
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes slideOut {
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }

    .alert-content {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        color: white;
        font-weight: 500;
    }

    .alert-info .alert-content { background: #2D4D7F; }
    .alert-success .alert-content { background: #28a745; }
    .alert-warning .alert-content { background: #ffc107; color: #000; }
    .alert-error .alert-content { background: #dc3545; }

    .alert-close {
        background: none;
        border: none;
        color: inherit;
        font-size: 1.2rem;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
    }

    .alert-close:hover {
        opacity: 1;
    }

    .custom-location-marker .marker-pulse {
        width: 20px;
        height: 20px;
        background: #FFD166;
        border-radius: 50%;
        position: relative;
    }

    .custom-location-marker .marker-pulse::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: #FFD166;
        animation: pulse-ring 2s infinite;
    }

    @keyframes pulse-ring {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        100% {
            transform: scale(3);
            opacity: 0;
        }
    }

    .marker-popup h6 {
        color: #0B1B2B;
        margin-bottom: 0.5rem;
        font-weight: 600;
    }

    .pass-popup {
        min-width: 250px;
    }

    .pass-title {
        color: #2D4D7F;
        font-weight: 700;
        margin-bottom: 1rem;
        border-bottom: 2px solid #FFD166;
        padding-bottom: 0.5rem;
    }

    .pass-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
    }

    .pass-label {
        color: #666;
        font-weight: 500;
    }

    .pass-value {
        color: #0B1B2B;
        font-weight: 600;
    }

    .pass-status {
        margin-top: 1rem;
        padding: 0.5rem;
        border-radius: 5px;
        text-align: center;
        font-weight: 600;
    }

    .pass-status.excellent {
        background: #d4edda;
        color: #155724;
    }

    .pass-status.good {
        background: #fff3cd;
        color: #856404;
    }

    .pass-status.fair {
        background: #f8d7da;
        color: #721c24;
    }

    .satellite-item.selected {
        background: #FFD166 !important;
        transform: translateX(10px) scale(1.02);
    }

    .no-satellites {
        text-align: center;
        padding: 2rem;
        color: #666;
    }

    .no-data-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }

    .country-marker .country-flag {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border-radius: 50%;
        font-size: 1.5rem;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }

    .country-popup {
        min-width: 200px;
    }

    .country-popup h6 {
        color: #2D4D7F;
        font-weight: 700;
        margin-bottom: 1rem;
        text-align: center;
    }

    .country-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
    }

    .country-label {
        color: #666;
        font-weight: 500;
    }

    .country-value {
        color: #0B1B2B;
        font-weight: 600;
    }

    .custom-map-control {
        background: white;
        padding: 10px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .map-legend {
        font-size: 0.8rem;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
    }

    .legend-color {
        width: 16px;
        height: 3px;
        border-radius: 2px;
    }

    .pass-marker {
        background: #2D4D7F;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-align: center;
    }

    .start-marker {
        background: #28a745;
    }

    .end-marker {
        background: #dc3545;
    }
`;

// Inject custom CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = customCSS;
document.head.appendChild(styleSheet);
