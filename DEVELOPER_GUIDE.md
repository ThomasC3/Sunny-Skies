# Sunny Skies: Developer Documentation

## Project Overview

This is a web-based application that leverages the Google Gemini API to generate high-fidelity, context-aware images of fantastical weather anomalies. It integrates with the Open-Meteo API for real-time weather data and uses a multi-step AI process to ground simulations in a visual, location-specific context. The frontend is built with TypeScript, HTML, and CSS, without a framework.

## Setup and Running Locally

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

## Code Structure

*   `index.html`: The main HTML file containing the structure of the application.
*   `index.css`: The stylesheet for the application, defining the visual theme and layout.
*   `index.tsx`: The core logic of the application, written in TypeScript. It handles user input, API calls, state management, and DOM manipulation.
*   `LICENSE`: Contains the full text of the Apache 2.0 license.
*   `metadata.json`: Configuration for the application's frame environment.
*   `README.md`: A user-friendly guide to the application.
*   `DEVELOPER_GUIDE.md`: This file.

## Key Technical Details

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
