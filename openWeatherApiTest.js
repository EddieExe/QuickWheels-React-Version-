// openWeatherApiTest.js
// Replace YOUR_OPENWEATHER_API_KEY below with your actual OpenWeather API key.
// Then run this in a browser console or in a Node 18+ environment.

const API_KEY = '3fa41897c753b25f1da40e30097ab727';
const city = 'Mumbai';

fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`)
  .then((res) => res.json())
  .then((data) => {
    console.log('✅ Weather API Works!');
    console.log('Temperature:', data.main?.temp, '°C');
    console.log('Condition:', data.weather?.[0]?.main);
    console.log('Humidity:', data.main?.humidity, '%');
  })
  .catch((err) => console.error('❌ API Error:', err));
