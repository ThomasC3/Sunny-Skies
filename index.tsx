/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Chat, Type } from '@google/genai';

// --- DOM Element Selection ---
const form = document.getElementById('generator-form') as HTMLFormElement;
const anomalyInput = document.getElementById('anomaly-input') as HTMLInputElement;
const locationInput = document.getElementById('location-input') as HTMLInputElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const generateBtnLoader = generateBtn.querySelector('.btn-loader') as HTMLDivElement;
const suggestBtn = document.getElementById('suggest-btn') as HTMLButtonElement;

// Location & Weather Elements
const locationLoader = document.getElementById('location-loader') as HTMLDivElement;
const locationSuggestions = document.getElementById('location-suggestions') as HTMLDivElement;
const contextContainer = document.getElementById('context-container') as HTMLDivElement;
const weatherContainer = document.getElementById('weather-container') as HTMLDivElement;
const weatherLocationName = document.getElementById('weather-location-name') as HTMLHeadingElement;
const weatherGrid = document.getElementById('weather-grid') as HTMLDivElement;

// Live View Elements
const liveViewContainer = document.getElementById('live-view-container') as HTMLDivElement;
const liveViewWrapper = document.getElementById('live-view-wrapper') as HTMLDivElement;
const liveViewLoader = document.getElementById('live-view-loader') as HTMLDivElement;
const liveViewImage = document.getElementById('live-view-image') as HTMLImageElement;
const liveViewError = document.getElementById('live-view-error') as HTMLDivElement;

const resultWrapper = document.getElementById('result-wrapper');
const resultContainer = document.getElementById('result-container');
const sunLoader = document.getElementById('sun-loader');
const imagePlaceholder = document.getElementById('image-placeholder');
const generatedImage = document.getElementById('generated-image') as HTMLImageElement;
const errorMessage = document.getElementById('error-message');

// AI Assistant Elements
const assistantBtn = document.getElementById('assistant-btn') as HTMLButtonElement;
const assistantModal = document.getElementById('assistant-modal');
const assistantContainer = document.getElementById('assistant-container');
const assistantCloseBtn = document.getElementById('assistant-close-btn');
const chatHistory = document.getElementById('chat-history');
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const typingIndicator = document.getElementById('typing-indicator');

// Advanced Data Layer Elements
const advancedToggle = document.getElementById('advanced-toggle') as HTMLInputElement;
const advancedDataContainer = document.getElementById('advanced-data-container') as HTMLDivElement;
const goesCheckbox = document.getElementById('data-goes') as HTMLInputElement;
const demCheckbox = document.getElementById('data-dem') as HTMLInputElement;
const oceanCheckbox = document.getElementById('data-ocean') as HTMLInputElement;
const cdrCheckbox = document.getElementById('data-cdr') as HTMLInputElement;
const noaaCheckbox = document.getElementById('data-noaa') as HTMLInputElement;

// --- State Management ---
let isGenerating = false;
let isSuggesting = false;
let isAssistantOpen = false;
let isAssistantTyping = false;
let selectedLocation: { name: string; latitude: number; longitude: number; country: string; } | null = null;
let currentWeather: any | null = null;
let liveViewImageData: { b64: string; mimeType: string; } | null = null;
let debounceTimer: number;

// --- API Initialization ---
let ai: GoogleGenAI;
let chat: Chat;

try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: "You are a creative partner. Your goal is to help brainstorm vivid, imaginative, and technically plausible fantastical weather anomalies for a simulation engine. Ask clarifying questions to refine ideas. When an idea is solid, present it clearly by saying 'Here is your final prompt:' followed by the concise anomaly description."
    }
  });
} catch (error) {
  console.error(error);
  displayError('Failed to initialize AI. API Key might be missing.', true);
  generateBtn.disabled = true;
  suggestBtn.disabled = true;
  assistantBtn.disabled = true;
}

// --- UI Update Functions ---
function setLoading(loading: boolean) {
  isGenerating = loading;
  generateBtn.disabled = loading || isSuggesting || !selectedLocation || !liveViewImageData;
  suggestBtn.disabled = loading || isSuggesting;
  assistantBtn.disabled = loading || isSuggesting;
  locationInput.disabled = loading || isSuggesting;
  
  generateBtnLoader.classList.toggle('hidden', !loading);
  generateBtn.classList.toggle('loading', loading);
}

function displayError(message: string, isSevere = false) {
  sunLoader.classList.add('hidden');
  imagePlaceholder.classList.add('hidden');
  generatedImage.classList.add('hidden');
  generatedImage.classList.remove('visible');
  
  // Clear any existing overlay
  const existingOverlay = document.getElementById('svg-overlay');
  if (existingOverlay) existingOverlay.remove();

  let finalMessage = message;
  if (message.includes('SAFETY')) {
      finalMessage = 'The simulation could not be generated due to safety filters. Please try a different or less ambiguous prompt.';
  } else if (message.includes('API_KEY')) {
      finalMessage = 'There is an issue with the API key configuration. Please contact the administrator.';
  } else if (isSevere) {
      finalMessage = `A critical error occurred: ${message}`;
  }

  errorMessage.textContent = `Error: ${finalMessage}`;
  errorMessage.classList.remove('hidden');
}

// --- Helper Functions ---
function debounce(func: (...args: any[]) => void, delay: number) {
    return function(this: any, ...args: any[]) {
        clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => func.apply(this, args), delay);
    };
}

function getAdvancedDataPrompt(): string {
    const advancedLayers = [];
    if (goesCheckbox?.checked) advancedLayers.push("GOES-16 satellite imagery");
    if (demCheckbox?.checked) advancedLayers.push("Digital Elevation Models for terrain analysis");
    if (oceanCheckbox?.checked) advancedLayers.push("NWLON/PORTS oceanographic data for coastal interaction");
    if (cdrCheckbox?.checked) advancedLayers.push("long-term Climate Data Records for historical context");
    if (noaaCheckbox?.checked) advancedLayers.push("numerical prediction data from NOAA-EMC models for foundational physics");

    if (advancedLayers.length > 0) {
      return ` Further enrich the simulation using the following advanced data layers: ${advancedLayers.join(', ')}.`;
    }
    return '';
}

// --- Geocoding and Weather Logic ---
async function searchLocations(query: string) {
    if (query.length < 3) {
        locationSuggestions.innerHTML = '';
        locationSuggestions.classList.add('hidden');
        return;
    }
    locationLoader.classList.remove('hidden');

    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        if (!response.ok) throw new Error('Failed to fetch location data.');
        const data = await response.json();
        
        locationSuggestions.innerHTML = '';
        if (data.results && data.results.length > 0) {
            data.results.forEach((loc: any) => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `${loc.name} <small>${[loc.admin1, loc.country].filter(Boolean).join(', ')}</small>`;
                item.onclick = () => selectLocation(loc);
                locationSuggestions.appendChild(item);
            });
            locationSuggestions.classList.remove('hidden');
        } else {
            locationSuggestions.innerHTML = '<div class="suggestion-item" style="cursor:default;">No results found.</div>';
            locationSuggestions.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Geocoding Error:', error);
        locationSuggestions.innerHTML = '<div class="suggestion-item" style="cursor:default;">Could not fetch locations.</div>';
        locationSuggestions.classList.remove('hidden');
    } finally {
        locationLoader.classList.add('hidden');
    }
}

async function selectLocation(loc: any) {
    selectedLocation = {
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        country: loc.country,
    };
    locationInput.value = `${loc.name}, ${loc.country}`;
    locationSuggestions.innerHTML = '';
    locationSuggestions.classList.add('hidden');
    currentWeather = null;
    liveViewImageData = null;
    generateBtn.disabled = true;

    contextContainer.classList.remove('hidden');
    weatherLocationName.textContent = `Fetching conditions for ${selectedLocation.name}...`;
    weatherGrid.innerHTML = '';

    // Fetch weather and live view in parallel
    const weatherPromise = (async () => {
        try {
            const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,cloud_cover&temperature_unit=celsius&wind_speed_unit=kmh`);
            if (!weatherResponse.ok) throw new Error('Failed to fetch weather data.');
            const weatherData = await weatherResponse.json();
            currentWeather = weatherData.current;
            displayWeather();
        } catch (error) {
            console.error('Weather API Error:', error);
            weatherLocationName.textContent = `Could not load weather for ${selectedLocation.name}.`;
        }
    })();
    
    const liveViewPromise = generateLiveView(selectedLocation.name);

    await Promise.all([weatherPromise, liveViewPromise]);

    if(currentWeather && liveViewImageData) {
        generateBtn.disabled = isGenerating || isSuggesting;
    } else {
        generateBtn.disabled = true;
    }
}

async function generateLiveView(locationName: string) {
    liveViewLoader.classList.remove('hidden');
    liveViewImage.classList.add('hidden');
    liveViewError.classList.add('hidden');
    liveViewImageData = null;

    try {
        if (!ai) throw new Error('AI not initialized.');
        const prompt = `A realistic, high-resolution, real-time satellite photograph of ${locationName}, showing current weather conditions. Clean satellite view, no text or overlays.`;
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '4:3',
            }
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const image = response.generatedImages[0];
            liveViewImageData = {
                b64: image.image.imageBytes,
                mimeType: 'image/jpeg'
            };
            liveViewImage.src = `data:image/jpeg;base64,${image.image.imageBytes}`;
            liveViewImage.classList.remove('hidden');
        } else {
            throw new Error('No image was generated for the live view.');
        }

    } catch(error) {
        console.error('Live View Generation Error:', error);
        liveViewError.classList.remove('hidden');
        liveViewImageData = null;
    } finally {
        liveViewLoader.classList.add('hidden');
    }
}

function displayWeather() {
    if (!currentWeather || !selectedLocation) return;
    
    const units = {
        temperature_2m: '°C',
        apparent_temperature: '°C',
        precipitation: 'mm',
        wind_speed_10m: 'km/h',
        cloud_cover: '%',
    };

    weatherLocationName.textContent = `Current Conditions at ${selectedLocation.name}`;
    const metricsHTML = `
        <div class="weather-metric" tabindex="0" style="animation-delay: 0s" data-tooltip="Current temperature">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 4a.75.75 0 01.75.75v1.518a3 3 0 012.38 2.982v.25a.75.75 0 01-1.5 0v-.25a1.5 1.5 0 00-1.63-1.49l-.02.002a1.5 1.5 0 00-1.48 1.63v5.216a2.5 2.5 0 01-2.24 2.488l-.21.012a2.5 2.5 0 01-2.488-2.24l-.012-.21a2.5 2.5 0 012.24-2.488l.21-.012a.75.75 0 01.75.75v3.188a1 1 0 102 0V9.25a3 3 0 012.38-2.982V4.75A.75.75 0 0110 4z" clip-rule="evenodd" /></svg>
            <span class="value">${currentWeather.temperature_2m}${units.temperature_2m}</span><span class="label">Temp</span>
        </div>
        <div class="weather-metric" tabindex="0" style="animation-delay: 0.05s" data-tooltip="Apparent temperature">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5.518l-1.97-1.97a.75.75 0 00-1.06 1.06l3.25 3.25a.75.75 0 001.06 0l3.25-3.25a.75.75 0 10-1.06-1.06L10.75 10.518V5z" clip-rule="evenodd" /></svg>
            <span class="value">${currentWeather.apparent_temperature}${units.apparent_temperature}</span><span class="label">Feels Like</span>
        </div>
        <div class="weather-metric" tabindex="0" style="animation-delay: 0.1s" data-tooltip="Precipitation">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M15.9 4.1a.75.75 0 01.2 1.04l-4.25 6.5a.75.75 0 01-1.03.28l-2.5-1.5a.75.75 0 01-.28-1.03l4.25-6.5a.75.75 0 011.03-.28l2.5 1.5zm-3.9 9.9a.75.75 0 01.2 1.04l-4.25 6.5a.75.75 0 01-1.03.28l-2.5-1.5a.75.75 0 01-.28-1.03l4.25-6.5a.75.75 0 011.03-.28l2.5 1.5z" /></svg>
            <span class="value">${currentWeather.precipitation}${units.precipitation}</span><span class="label">Precip.</span>
        </div>
        <div class="weather-metric" tabindex="0" style="animation-delay: 0.15s" data-tooltip="Wind speed">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 5zm-2.94 2.05a.75.75 0 01.99-.44l1.5.866a.75.75 0 01-.44 1.4l-1.5-.866a.75.75 0 01-.55-.96zM13.49 8.05a.75.75 0 00-.55.96l1.5.866a.75.75 0 00.99-.44l-1.5-.866a.75.75 0 00-.44-.42zM10.75 11.25a.75.75 0 00-1.5 0v1.5a.75.75 0 001.5 0v-1.5zM4.75 11a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zm10.5 0a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75z" /></svg>
            <span class="value">${currentWeather.wind_speed_10m}${units.wind_speed_10m}</span><span class="label">Wind</span>
        </div>
        <div class="weather-metric" tabindex="0" style="animation-delay: 0.2s" data-tooltip="Cloud cover">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06l2.97-2.97H5.75a.75.75 0 010-1.5h8.69L11.47 3.53a.75.75 0 010-1.06z" clip-rule="evenodd" /></svg>
            <span class="value">${currentWeather.cloud_cover}${units.cloud_cover}</span><span class="label">Cloud Cover</span>
        </div>
    `;
    weatherGrid.innerHTML = metricsHTML;
}

// --- Main Simulation Logic ---
const overlaySchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'A concise, dramatic title for the anomaly.' },
      location: { type: Type.STRING, description: 'The location name (e.g., "Reykjavik, Iceland").' },
      telemetry: {
        type: Type.ARRAY,
        description: 'A list of 2-3 key weather metrics relevant to the anomaly.',
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING, description: 'The name of the metric (e.g., "Temp", "Wind").' },
            value: { type: Type.STRING, description: 'The value and unit (e.g., "15°C", "30 km/h").' }
          }
        }
      }
    }
  };

async function generateSimulation(e: Event) {
  e.preventDefault();
  if (isGenerating || !selectedLocation || !liveViewImageData) return;

  setLoading(true);

  // Clear previous SVG overlay
  const existingOverlay = document.getElementById('svg-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Prepare result area for new generation
  imagePlaceholder.classList.add('hidden');
  errorMessage.classList.add('hidden');
  generatedImage.classList.add('hidden');
  generatedImage.classList.remove('visible');
  generatedImage.src = '';
  sunLoader.classList.remove('hidden');

  const anomaly = anomalyInput.value;
  const style = (document.querySelector('input[name="style"]:checked') as HTMLInputElement).value;

  try {
    if (!ai) throw new Error('AI not initialized.');

    // --- Create multi-step generation promises ---

    // Promise for the final simulation image (which itself has two internal steps)
    const imageGenerationPromise = (async () => {
        // 1. Generate enriched prompt from live view
        const imagePart = { inlineData: { data: liveViewImageData.b64, mimeType: liveViewImageData.mimeType } };
        const textPart = { text: `Analyze this satellite image of ${selectedLocation.name}. Based on the terrain, clouds, and features, write a new, highly detailed, and vivid prompt for an image generation AI to create a fantastical weather anomaly: '${anomaly}'. The new prompt should describe how the anomaly realistically interacts with the specific environment shown in the image. The prompt must be a single, detailed paragraph. Do not add any conversational text, just output the prompt itself.` };

        const enrichmentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] }
        });
        const enrichedPrompt = enrichmentResponse.text;
        
        // 2. Generate final image using the enriched prompt
        const advancedData = getAdvancedDataPrompt();
        const finalImagePrompt = `Create a fantastical weather event: ${enrichedPrompt}. The style should be a dramatic, cinematic ${style}. Do NOT include text, labels, or watermarks. The image should be a pure visual. ${advancedData}`;

        return ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: finalImagePrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            }
        });
    })();


    // Promise for the data overlay JSON
    const dataGenerationPromise = (async () => {
        const weatherContext = currentWeather
            ? `Current weather: Temp ${currentWeather.temperature_2m}°C, Wind ${currentWeather.wind_speed_10m} km/h, Cloud Cover ${currentWeather.cloud_cover}%.`
            : 'Weather conditions are unknown.';
        const dataPrompt = `Summarize the following simulation parameters into a JSON object. The anomaly is "${anomaly}" at ${selectedLocation.name}. ${weatherContext}. Select the 2-3 most relevant weather metrics for the telemetry array.`;
        
        return ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: dataPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: overlaySchema
            }
        });
    })();


    // Await both promises in parallel
    const [imageResponse, dataResponse] = await Promise.all([
        imageGenerationPromise,
        dataGenerationPromise
    ]);


    // Process Final Image
    if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
      const b64Image = imageResponse.generatedImages[0].image.imageBytes;
      generatedImage.src = `data:image/jpeg;base64,${b64Image}`;
      generatedImage.classList.remove('hidden');
      generatedImage.classList.add('visible');
    } else {
      throw new Error('No image was generated for the simulation. The response may have been blocked.');
    }

    // Process and render data overlay
    try {
      const jsonData = JSON.parse(dataResponse.text);
      renderSvgOverlay(jsonData);
    } catch (jsonError) {
      console.error('Failed to parse JSON for overlay:', jsonError);
      // Don't show a fatal error, just log it. The image is still useful.
    }

  } catch (error) {
    console.error(error);
    displayError(error.message || 'An unknown error occurred during generation.');
  } finally {
    sunLoader.classList.add('hidden');
    setLoading(false);
  }
}

function renderSvgOverlay(data: any) {
  if (!data || !resultContainer) return;
  
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute('id', 'svg-overlay');
  svg.setAttribute('class', 'svg-overlay');
  svg.setAttribute('viewBox', '0 0 1600 900'); // Match 16:9 aspect ratio
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Add a subtle gradient/scrim at the bottom for readability
  const defs = document.createElementNS(svgNS, 'defs');
  const linearGradient = document.createElementNS(svgNS, 'linearGradient');
  linearGradient.setAttribute('id', 'scrim');
  linearGradient.setAttribute('x1', '0%');
  linearGradient.setAttribute('y1', '0%');
  linearGradient.setAttribute('x2', '0%');
  linearGradient.setAttribute('y2', '100%');
  linearGradient.innerHTML = `
    <stop offset="60%" style="stop-color:transparent;stop-opacity:0" />
    <stop offset="100%" style="stop-color:black;stop-opacity:0.6" />
  `;
  defs.appendChild(linearGradient);
  svg.appendChild(defs);

  const scrimRect = document.createElementNS(svgNS, 'rect');
  scrimRect.setAttribute('width', '1600');
  scrimRect.setAttribute('height', '900');
  scrimRect.setAttribute('fill', 'url(#scrim)');
  svg.appendChild(scrimRect);

  // Title
  if (data.title) {
    const titleText = document.createElementNS(svgNS, "text");
    titleText.setAttribute('x', '50');
    titleText.setAttribute('y', '830');
    titleText.setAttribute('class', 'svg-title');
    titleText.textContent = data.title.toUpperCase();
    svg.appendChild(titleText);
  }

  // Location
  if (data.location) {
    const locationText = document.createElementNS(svgNS, "text");
    locationText.setAttribute('x', '50');
    locationText.setAttribute('y', '865');
    locationText.setAttribute('class', 'svg-location');
    locationText.textContent = `LOC: ${data.location}`;
    svg.appendChild(locationText);
  }

  // Telemetry
  if (data.telemetry && Array.isArray(data.telemetry)) {
    let telemetryX = 1550;
    data.telemetry.forEach((metric: { label: string, value: string }) => {
      if (metric.label && metric.value) {
        const telemetryGroup = document.createElementNS(svgNS, 'g');
        telemetryGroup.setAttribute('class', 'svg-telemetry');
        
        const valueText = document.createElementNS(svgNS, 'text');
        valueText.setAttribute('x', String(telemetryX));
        valueText.setAttribute('y', '830');
        valueText.setAttribute('text-anchor', 'end');
        valueText.setAttribute('class', 'telemetry-value');
        valueText.textContent = metric.value;

        const labelText = document.createElementNS(svgNS, 'text');
        labelText.setAttribute('x', String(telemetryX));
        labelText.setAttribute('y', '865');
        labelText.setAttribute('text-anchor', 'end');
        labelText.setAttribute('class', 'telemetry-label');
        labelText.textContent = metric.label.toUpperCase();
        
        telemetryGroup.appendChild(valueText);
        telemetryGroup.appendChild(labelText);
        svg.appendChild(telemetryGroup);
        
        // A simple way to adjust spacing for the next metric
        const textWidth = Math.max(metric.label.length, metric.value.length) * 22;
        telemetryX -= (textWidth + 50);
      }
    });
  }
  
  resultContainer.appendChild(svg);
}


// --- AI Suggestion Logic ---
async function suggestAnomaly(e: Event) {
    e.preventDefault();
    if (isGenerating || isSuggesting) return;

    isSuggesting = true;
    suggestBtn.disabled = true;
    suggestBtn.classList.add('loading');
    anomalyInput.disabled = true;
    
    try {
        if (!ai) throw new Error('AI not initialized.');
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Brainstorm one, and only one, unique and visually spectacular fantastical weather anomaly. Provide just the name of the phenomenon, without any extra text, description or quotation marks. Examples: 'A rain of liquid temporal shards', 'A storm of recursive fractal lightning', 'A geyser of iridescent fog'."
        });
        anomalyInput.value = response.text.trim().replace(/^"|"$/g, '');
    } catch (error) {
        console.error('Suggestion Error:', error);
        displayError('Could not generate a suggestion.');
    } finally {
        isSuggesting = false;
        suggestBtn.disabled = isGenerating;
        suggestBtn.classList.remove('loading');
        anomalyInput.disabled = false;
    }
}

// --- AI Assistant Logic ---
function toggleAssistant(visible: boolean) {
    isAssistantOpen = visible;
    assistantModal.classList.toggle('visible', visible);
    if (visible) {
        chatInput.focus();
    }
}

function addMessageToHistory(sender: 'user' | 'ai', text: string) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${sender}-message`;
    
    // Check if the message indicates a final prompt
    const finalPromptPrefix = 'Here is your final prompt:';
    if (sender === 'ai' && text.startsWith(finalPromptPrefix)) {
        const promptText = text.substring(finalPromptPrefix.length).trim();
        const promptHTML = `
            <p>${finalPromptPrefix}</p>
            <blockquote>${promptText}</blockquote>
            <button class="use-prompt-btn">Use This Prompt</button>
        `;
        messageElement.innerHTML = promptHTML;
        const useBtn = messageElement.querySelector('.use-prompt-btn');
        useBtn.addEventListener('click', () => {
            anomalyInput.value = promptText;
            toggleAssistant(false);
        });
    } else {
        messageElement.textContent = text;
    }

    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function handleChatSubmit(e: Event) {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message || isAssistantTyping) return;

    addMessageToHistory('user', message);
    chatForm.reset();
    isAssistantTyping = true;
    typingIndicator.classList.remove('hidden');

    try {
        if (!chat) throw new Error('Chat not initialized.');
        const response = await chat.sendMessage({ message });
        
        isAssistantTyping = false;
        typingIndicator.classList.add('hidden');
        addMessageToHistory('ai', response.text);

    } catch (error) {
        console.error('Chat Error:', error);
        isAssistantTyping = false;
        typingIndicator.classList.add('hidden');
        addMessageToHistory('ai', 'Sorry, I encountered an error. Please try again.');
    }
}

// --- Event Listeners ---
form.addEventListener('submit', generateSimulation);
suggestBtn.addEventListener('click', suggestAnomaly);

locationInput.addEventListener('input', debounce((e: InputEvent) => {
    const inputElement = e.target as HTMLInputElement;
    const query = inputElement.value;

    // If input is cleared, reset location state completely
    if (query.trim() === '') {
        selectedLocation = null;
        currentWeather = null;
        liveViewImageData = null;
        contextContainer.classList.add('hidden');
        locationSuggestions.innerHTML = '';
        locationSuggestions.classList.add('hidden');
        generateBtn.disabled = true;
        return; // Exit early
    }

    // If user has manually typed something that doesn't match the selected location, invalidate it
    if (selectedLocation && query !== `${selectedLocation.name}, ${selectedLocation.country}`) {
         selectedLocation = null;
         currentWeather = null;
         liveViewImageData = null;
         contextContainer.classList.add('hidden');
         generateBtn.disabled = true;
    }

    searchLocations(query);
}, 300));

assistantBtn.addEventListener('click', () => toggleAssistant(true));
assistantCloseBtn.addEventListener('click', () => toggleAssistant(false));
assistantModal.addEventListener('click', (e) => {
    if (e.target === assistantModal) {
        toggleAssistant(false);
    }
});
chatForm.addEventListener('submit', handleChatSubmit);

advancedToggle.addEventListener('change', () => {
    if (advancedToggle.checked) {
        advancedDataContainer.style.maxHeight = advancedDataContainer.scrollHeight + 'px';
    } else {
        advancedDataContainer.style.maxHeight = '0px';
    }
});

// --- Initial State ---
document.addEventListener('DOMContentLoaded', () => {
  resultWrapper.classList.remove('hidden');
  imagePlaceholder.classList.remove('hidden');
  generateBtn.disabled = true; // Disabled until a location is selected
});