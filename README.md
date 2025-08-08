# Sunny Skies: Anomaly Simulation Engine

## Product Overview Guide

Welcome to the Sunny Skies anomaly simulation engine. This guide will walk you through the features of the application and how to use them to generate stunning, high-fidelity simulations of fantastical weather events.

### Core Components

1.  **Fantastical Anomaly Input**: This is the heart of your simulation. Define the core weather event you want to visualize. Be descriptive and imaginative for the best results.
    *   **Examples**: "A geyser of iridescent temporal fog," "A recursive storm of fractal lightning," or "Cascading auroral tendrils of liquid light."
    *   **AI Suggestion**: Click the ✨ icon to have the AI generate a unique and creative anomaly idea for you.
    *   **AI Assistant**: Click the 💬 icon to open a chat window with your AI assistant. Here, you can brainstorm, refine, and elaborate on your ideas until you have the perfect prompt, which you can then use directly in the simulation.

2.  **Location Input**: Specify the real-world location for your simulation. As you type, an autocomplete search will provide suggestions.
    *   **Function**: Selecting a location automatically fetches two key pieces of context:
        1.  **Real-Time Weather**: Current conditions (temperature, wind, cloud cover, etc.) are fetched from Open-Meteo.com.
        2.  **Live View**: A real-time satellite photograph of the location is generated via AI to provide a visual baseline of the terrain and environment. This is your "WeatherNext" data feed.
    *   **Impact**: This context is crucial. The simulation AI analyzes both the numerical weather data and the visual "Live View" image to ground your fantastical anomaly in the reality of the chosen location, making the final image more detailed and plausible.

3.  **Advanced Data Layers**: To reduce clutter, these options are hidden by default. Click the toggle next to the "Advanced Data Layers" title to reveal them. This section allows you to instruct the AI to incorporate additional real-world data feeds, enhancing the simulation's accuracy, detail, and scientific plausibility.
    *   **GOES-16 Satellite**: Integrates real-time geostationary satellite imagery for cloud patterns, atmospheric motion, and storm tracking.
    *   **Terrain Model (DEM)**: Uses high-resolution Digital Elevation Models to accurately simulate how the anomaly interacts with local terrain like mountains and valleys.
    *   **Oceanographic Data**: Incorporates real-time water levels, tides, and currents (from NWLON/PORTS) for simulations taking place over or near bodies of water.
    *   **Climate Records (CDR)**: Leverages long-term Climate Data Records to ground the anomaly in the region's historical weather patterns and normals.
    *   **NOAA-EMC Models**: Incorporates principles from NOAA's Environmental Modeling Center (EMC) numerical models for professional-grade atmospheric and oceanic prediction.

4.  **Simulation Style**: Choose the visual style for your simulation.
    *   **Images**: Creates a cinematic, photorealistic, ground-level view of the event.
    *   **Satellite**: Provides a top-down, tactical simulation view, as if seen from a weather satellite.

5.  **Simulate Anomaly Button**: Once your parameters are set, press this button to generate the simulation. The engine synthesizes all your inputs—the anomaly, location, live view, real-time weather, advanced data, and style—to create a unique, high-fidelity image.

### Workflow Example

1.  **Idea**: You want to see "bioluminescent rain." You open the **AI Assistant** to refine this idea. The assistant helps you flesh it out to "A shower of shimmering, bioluminescent fungal spores that illuminate the forest canopy." You click "Use This Prompt."
2.  **Location**: You type "Redwood National Park" into the **Location** input and select it. The current weather conditions and a "Live View" satellite image of the park are fetched and displayed.
3.  **AI Analysis**: You click **Simulate Anomaly**. The engine first sends the "Live View" satellite image to the AI, which analyzes the tall trees and coastal fog. It generates a new, enriched prompt behind the scenes, like "A shower of shimmering, bioluminescent fungal spores drifts through the dense canopy of giant redwood trees, their glow reflecting off the damp, foggy air characteristic of the Northern California coast."
4.  **Generate**: This new, context-aware prompt is then used to generate the final simulation. The result is a stunning image of glowing rain falling through the massive trees of Redwood National Park, with lighting and atmosphere that feel authentic to the location.

## Developer Documentation

### Project Overview

This is a web-based application that leverages the Google Gemini API to generate high-fidelity, context-aware images of fantastical weather anomalies. It integrates with the Open-Meteo API for real-time weather data and uses a multi-step AI process to ground simulations in a visual, location-specific context. The frontend is built with TypeScript, HTML, and CSS, without a framework.

### Setup and Running Locally

1.  **Prerequisites**: A modern web browser and a code editor.
2.  **Clone the Repository**:
    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```
3.  **API Key Configuration**: The application requires a Google Gemini API key. This key must be provided as an environment variable.
    *   Create a file named `.env` in the root of the project directory.
    *   Add your API key to this file:
        ```
        API_KEY=your_google_gemini_api_key_here
        ```
    *   **IMPORTANT**: The application code in `index.tsx` reads the key directly from `process.env.API_KEY`. Do not hardcode the key in the source files. The build process (or a local development server) must make this environment variable available to the browser environment.

4.  **Serving the Application**: Use a simple local web server that can handle single-page applications and environment variables. The `live-server` package with a proxy for environment variables is a good option, but any server will do.
    ```bash
    # Example using a generic server
    # Ensure your server is configured to serve index.html as the entry point
    npm install -g live-server
    live-server .
    ```

### Code Structure

*   `index.html`: The main HTML file containing the structure of the application.
*   `index.css`: The stylesheet for the application, defining the visual theme and layout.
*   `index.tsx`: The core logic of the application, written in TypeScript. It handles user input, API calls, state management, and DOM manipulation.
*   `LICENSE`: Contains the full text of the Apache 2.0 license.
*   `metadata.json`: Configuration for the application's frame environment.
*   `README.md`: This file.

### Key Technical Details

*   **Gemini API Integration**: The `@google/genai` library is used for all interactions with the Gemini models.
    *   **Context-Aware Simulation**: This is a multi-step process.
        1.  **Live View Generation**: When a location is selected, the `imagen-3.0-generate-002` model generates a satellite image to serve as a visual reference.
        2.  **Prompt Enrichment**: For the final simulation, `gemini-2.5-flash` is called with a multimodal prompt containing the "Live View" image and the user's anomaly text. It analyzes the image and returns a new, more detailed text prompt.
        3.  **Final Image Generation**: The `imagen-3.0-generate-002` model is called again, this time using the enriched prompt from the previous step to generate the final, context-aware image.
    *   **Data Overlay**: In parallel, `gemini-2.5-flash` generates a JSON object with telemetry data, which is then rendered as an SVG overlay on top of the final image.
    *   **Chat/Assistant**: `gemini-2.5-flash` is used in a chat session to provide a brainstorming partner for the user.
*   **Weather Data**: The Open-Meteo Geocoding API is used to find locations, and the Forecast API is used to fetch current weather conditions for the selected coordinates.
*   **Error Handling**: The application includes logic to catch and display errors from API calls (e.g., safety violations, network issues, invalid API key) to provide clear feedback to the user.
*   **UI/UX**: The UI is designed to be intuitive and responsive, featuring loading states, tooltips, and an interactive AI assistant to guide the user.

## License

This project is licensed under the Apache License, Version 2.0. You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0) or in the [LICENSE](LICENSE) file included in this repository.

Enjoy exploring the skies!
