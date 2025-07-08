import React, { useState, useEffect, useRef } from "react";

// Main App component
const App = () => {
  // State to hold all parsed email data from the CSV
  const [emailData, setEmailData] = useState([]);
  // State to hold data currently displayed after applying filters
  const [filteredEmailData, setFilteredEmailData] = useState([]);
  // State for search term for 'Email Name' column
  const [searchTerm, setSearchTerm] = useState("");
  // States for minimum and maximum Open Rate filter
  const [minOpenRate, setMinOpenRate] = useState("");
  const [maxOpenRate, setMaxOpenRate] = useState("");
  // States for minimum and maximum Click Rate filter
  const [minClickRate, setMinClickRate] = useState("");
  const [maxClickRate, setMaxClickRate] = useState("");

  // State for the currently selected email row in the table
  const [selectedEmail, setSelectedEmail] = useState(null);
  // State to store AI-generated insights
  const [aiInsight, setAiInsight] = useState("");
  // State to indicate if AI insight is currently being generated
  const [loadingInsight, setLoadingInsight] = useState(false);
  // State to track if PapaParse library has been successfully loaded
  const [isPapaParseLoaded, setIsPapaParseLoaded] = useState(false);

  // Ref for the file input element to allow programmatic clearing
  const fileInputRef = useRef(null);

  /**
   * Custom function to display a modal-style alert message.
   * This replaces `window.alert()` for better UI/UX in a web app.
   * @param {string} message - The message to display in the alert.
   */
  const showCustomAlert = (message) => {
    // Remove any existing custom alert modals to prevent stacking
    const existingModal = document.getElementById("customAlertModal");
    if (existingModal) existingModal.remove();

    // Create the modal HTML structure
    const messageBox = document.createElement("div");
    messageBox.id = "customAlertModal"; // Assign an ID for easy removal
    messageBox.className =
      "fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50";
    messageBox.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
                <h3 class="text-lg font-bold mb-4 text-gray-800">Notification</h3>
                <p class="font-sans text-gray-700 mb-6">${message}</p>
                <div class="flex justify-end">
                    <button id="alertCloseBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105">
                        OK
                    </button>
                </div>
            </div>
        `;
    document.body.appendChild(messageBox);

    // Add event listener to the close button
    document.getElementById("alertCloseBtn").addEventListener("click", () => {
      messageBox.remove(); // Remove the modal when OK is clicked
    });
  };

  // Effect to dynamically load PapaParse library for CSV parsing
  useEffect(() => {
    // Check if PapaParse is already available globally
    if (typeof Papa !== "undefined") {
      setIsPapaParseLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js";
    script.async = true; // Load script asynchronously
    script.onload = () => {
      setIsPapaParseLoaded(true);
      console.log("PapaParse loaded successfully.");
    };
    script.onerror = () => {
      console.error("Failed to load PapaParse script.");
      showCustomAlert(
        "Failed to load PapaParse library. Please check your internet connection or try again later."
      );
    };
    document.head.appendChild(script);

    // Cleanup function: remove the script from the DOM if the component unmounts
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []); // Empty dependency array ensures this effect runs only once on component mount

  // Effect to apply filters whenever the raw email data or any filter criteria change
  useEffect(() => {
    applyFilters();
  }, [
    emailData,
    searchTerm,
    minOpenRate,
    maxOpenRate,
    minClickRate,
    maxClickRate,
  ]);

  /**
   * Handles the file upload event, parses the CSV, and updates the state.
   * @param {Event} event - The file input change event.
   */
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check if PapaParse is loaded before attempting to parse the file
      if (!isPapaParseLoaded) {
        showCustomAlert(
          "PapaParse library is still loading. Please wait a moment and try uploading again."
        );
        return;
      }

      // Use PapaParse to parse the CSV file
      Papa.parse(file, {
        header: true, // Treat the first row of the CSV as headers
        skipEmptyLines: true, // Ignore empty lines in the CSV
        complete: (results) => {
          // Map over the parsed data to convert specific columns to numbers
          const parsedData = results.data.map((row) => ({
            ...row,
            // Convert relevant metrics to numbers, defaulting to 0 if empty or invalid
            Sent: parseInt(row["Sent"] || "0"),
            Delivered: parseInt(row["Delivered"] || "0"),
            "Open Rate": parseFloat(row["Open Rate"] || "0"),
            "Click Rate": parseFloat(row["Click Rate"] || "0"),
            "Hard Bounce Rate": parseFloat(row["Hard Bounce Rate"] || "0"),
            "Unsubscribe Rate": parseFloat(row["Unsubscribe Rate"] || "0"),
            "Bounce Rate": parseFloat(row["Bounce Rate"] || "0"),
            "Spam Rate": parseFloat(row["Spam Rate"] || "0"),
            "Delivery Rate": parseFloat(row["Delivery Rate"] || "0"),
          }));
          setEmailData(parsedData); // Store the raw parsed data
          setFilteredEmailData(parsedData); // Initially, filtered data is the same as raw data
          setSelectedEmail(null); // Clear any previously selected email
          setAiInsight(""); // Clear any previous AI insight
          // Clear the file input element's value to allow re-uploading the same file
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
        error: (error) => {
          console.error("Error parsing CSV:", error.message);
          showCustomAlert(
            `Error parsing CSV file: ${error.message}. Please ensure it's a valid CSV.`
          );
        },
      });
    }
  };

  /**
   * Applies all active filters to the email data and updates the `filteredEmailData` state.
   */
  const applyFilters = () => {
    let currentFilteredData = emailData; // Start with the full dataset

    // Filter by Email Name (case-insensitive search)
    if (searchTerm) {
      currentFilteredData = currentFilteredData.filter(
        (email) =>
          email["Email Name"] &&
          email["Email Name"].toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by Open Rate (min and max)
    const minO = parseFloat(minOpenRate);
    const maxO = parseFloat(maxOpenRate);
    if (!isNaN(minO)) {
      currentFilteredData = currentFilteredData.filter(
        (email) => email["Open Rate"] >= minO
      );
    }
    if (!isNaN(maxO)) {
      currentFilteredData = currentFilteredData.filter(
        (email) => email["Open Rate"] <= maxO
      );
    }

    // Filter by Click Rate (min and max)
    const minC = parseFloat(minClickRate);
    const maxC = parseFloat(maxClickRate);
    if (!isNaN(minC)) {
      currentFilteredData = currentFilteredData.filter(
        (email) => email["Click Rate"] >= minC
      );
    }
    if (!isNaN(maxC)) {
      currentFilteredData = currentFilteredData.filter(
        (email) => email["Click Rate"] <= maxC
      );
    }

    setFilteredEmailData(currentFilteredData); // Update the state with the filtered data
    setSelectedEmail(null); // Clear selected email when filters change to avoid stale selection
    setAiInsight(""); // Clear AI insight when filters change
  };

  /**
   * Handles a click on an email row in the table, setting it as the selected email.
   * @param {Object} email - The email data object for the clicked row.
   */
  const handleRowClick = (email) => {
    setSelectedEmail(email);
    setAiInsight(""); // Clear previous insight when a new email is selected
  };

  /**
   * Calls the Gemini API to get AI-powered insights for the currently selected email.
   */
  const getAiInsights = async () => {
    if (!selectedEmail) {
      showCustomAlert(
        "Please select an email row from the table first to get insights."
      );
      return;
    }

    setLoadingInsight(true); // Set loading state to true
    setAiInsight(""); // Clear any previous insight text

    // Construct the prompt for the AI model based on the selected email's data
    const prompt = `As an email marketing analyst, analyze the following email's performance. Consider its Open Rate, Click Rate, Bounce Rate, and other provided metrics. Provide potential reasons for these metrics and suggest actionable insights for improvement.

Email Name: ${selectedEmail["Email Name"]}
Sent: ${selectedEmail["Sent"]}
Delivered: ${selectedEmail["Delivered"]}
Open Rate: ${selectedEmail["Open Rate"]}%
Click Rate: ${selectedEmail["Click Rate"]}%
Hard Bounce Rate: ${selectedEmail["Hard Bounce Rate"]}%
Unsubscribe Rate: ${selectedEmail["Unsubscribe Rate"]}%
Bounce Rate: ${selectedEmail["Bounce Rate"]}%
Spam Reports: ${selectedEmail["Spam Reports"]}
Spam Rate: ${selectedEmail["Spam Rate"]}%
Delivery Rate: ${selectedEmail["Delivery Rate"]}%
`;

    // Prepare the payload for the Gemini API call
    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = { contents: chatHistory };
    // API key is left empty; Canvas environment will provide it at runtime for allowed models
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
      // Make the API call to Gemini
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json(); // Parse the JSON response

      // Check if the response contains valid content
      if (
        result.candidates &&
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0
      ) {
        const text = result.candidates[0].content.parts[0].text;
        setAiInsight(text); // Set the AI insight text
      } else {
        setAiInsight("Failed to get insights. Unexpected response from AI.");
        console.error("Unexpected AI response structure:", result);
      }
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      setAiInsight("Error generating insights. Please try again.");
    } finally {
      setLoadingInsight(false); // Reset loading state
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-800">
      {/* Tailwind CSS CDN: Ensures styling is applied. */}
      <script src="https://cdn.tailwindcss.com"></script>
      {/* Inter font: Provides a modern and readable typeface. */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style>
        {`
                /* Custom styles for the Inter font, applied globally */
                body {
                    font-family: 'Inter', sans-serif;
                }
                /* Custom scrollbar styling for the table container for better aesthetics */
                .table-container::-webkit-scrollbar {
                    height: 8px; /* Height of the horizontal scrollbar */
                }
                .table-container::-webkit-scrollbar-thumb {
                    background-color: #cbd5e0; /* Color of the scrollbar thumb (gray-300) */
                    border-radius: 4px; /* Rounded corners for the thumb */
                }
                .table-container::-webkit-scrollbar-track {
                    background-color: #f7fafc; /* Color of the scrollbar track (gray-50) */
                }
                /* Styling for clickable table rows */
                .table-row-clickable {
                    cursor: pointer; /* Indicate that the row is interactive */
                }
                /* Hover effect for clickable table rows */
                .table-row-clickable:hover {
                    background-color: #e0f2f7; /* Light blue background on hover */
                }
                /* Styling for the selected table row */
                .table-row-selected {
                    background-color: #bfdbfe; /* Tailwind blue-200 for selected row */
                }
                `}
      </style>

      <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-center text-blue-800 mb-6">
          Email Metrics Dashboard
        </h1>

        {/* File Upload Section */}
        <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <label
            htmlFor="csv-upload"
            className="block text-lg font-medium text-blue-700 mb-2"
          >
            Upload your Email Metrics CSV File:
          </label>
          {/* Conditionally render the file input based on whether PapaParse is loaded */}
          {isPapaParseLoaded ? (
            <input
              type="file"
              id="csv-upload"
              ref={fileInputRef} // Attach ref to clear input value
              accept=".csv" // Only accept CSV files
              onChange={handleFileUpload} // Call handler on file selection
              className="block w-full text-sm text-gray-700
                                       file:mr-4 file:py-2 file:px-4
                                       file:rounded-full file:border-0
                                       file:text-sm file:font-semibold
                                       file:bg-blue-100 file:text-blue-700
                                       hover:file:bg-blue-200"
            />
          ) : (
            <p className="text-gray-500 italic">
              Loading CSV parser... Please wait.
            </p>
          )}

          <p className="mt-2 text-sm text-gray-500">
            Upload a CSV file containing email performance data. The first row
            should be headers.
          </p>
        </div>

        {/* Conditional rendering: Filters and Data sections appear only if data is loaded */}
        {emailData.length > 0 && (
          <>
            {/* Filters Section */}
            <div className="mb-8 p-6 bg-purple-50 rounded-lg border border-purple-200">
              <h2 className="text-xl font-semibold text-purple-700 mb-4">
                Apply Filters
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Email Name Search Input */}
                <div>
                  <label
                    htmlFor="search-email-name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Search Email Name:
                  </label>
                  <input
                    type="text"
                    id="search-email-name"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    placeholder="e.g., Weekly Newsletter"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)} // Update search term state
                  />
                </div>

                {/* Open Rate Filter Inputs */}
                <div>
                  <label
                    htmlFor="min-open-rate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Open Rate (%):
                  </label>
                  <div className="flex space-x-2 mt-1">
                    <input
                      type="number"
                      id="min-open-rate"
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      placeholder="Min"
                      value={minOpenRate}
                      onChange={(e) => setMinOpenRate(e.target.value)} // Update min open rate state
                    />
                    <input
                      type="number"
                      id="max-open-rate"
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      placeholder="Max"
                      value={maxOpenRate}
                      onChange={(e) => setMaxOpenRate(e.target.value)} // Update max open rate state
                    />
                  </div>
                </div>

                {/* Click Rate Filter Inputs */}
                <div>
                  <label
                    htmlFor="min-click-rate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Click Rate (%):
                  </label>
                  <div className="flex space-x-2 mt-1">
                    <input
                      type="number"
                      id="min-click-rate"
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      placeholder="Min"
                      value={minClickRate}
                      onChange={(e) => setMinClickRate(e.target.value)} // Update min click rate state
                    />
                    <input
                      type="number"
                      id="max-click-rate"
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      placeholder="Max"
                      value={maxClickRate}
                      onChange={(e) => setMaxClickRate(e.target.value)} // Update max click rate state
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Data Display Section (Table) */}
            <div className="bg-green-50 rounded-lg border border-green-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-green-700 mb-4">
                Email Performance Data
              </h2>
              {filteredEmailData.length > 0 ? (
                <div className="overflow-x-auto rounded-md shadow table-container">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-green-100">
                      <tr>
                        {/* Dynamically render table headers from the first data row's keys */}
                        {Object.keys(filteredEmailData[0]).map((key) => (
                          <th
                            key={key}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Render table rows based on filtered data */}
                      {filteredEmailData.map((row, index) => (
                        <tr
                          key={index} // Using index as key, consider unique ID if available in data
                          className={`table-row-clickable ${
                            selectedEmail === row
                              ? "table-row-selected"
                              : index % 2 === 0
                              ? "bg-white"
                              : "bg-gray-50"
                          }`}
                          onClick={() => handleRowClick(row)} // Set selected email on row click
                        >
                          {/* Render table cells for each value in the row */}
                          {Object.values(row).map((value, idx) => (
                            <td
                              key={idx}
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                            >
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-600 py-8">
                  No email data to display or no results match your filters.
                </p>
              )}
            </div>

            {/* AI Insights Section */}
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
              <h2 className="text-xl font-semibold text-orange-700 mb-4">
                AI-Powered Email Insights
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Select an email row from the table above, then click the button
                below to get an AI-driven analysis of its performance.
              </p>
              <button
                onClick={getAiInsights} // Call AI insights function
                className={`w-full py-3 px-6 rounded-md text-lg font-semibold transition duration-300 ease-in-out
                                            ${
                                              selectedEmail && !loadingInsight // Button is enabled if an email is selected and not loading
                                                ? "bg-orange-500 text-white hover:bg-orange-600 shadow-md"
                                                : "bg-gray-300 text-gray-600 cursor-not-allowed"
                                            }`}
                disabled={!selectedEmail || loadingInsight} // Disable if no email selected or loading
              >
                {loadingInsight
                  ? "Generating insights..."
                  : "✨ Get AI Insights on Selected Email"}
              </button>

              {/* Display AI insight if available */}
              {aiInsight && (
                <div className="mt-6 p-4 bg-orange-100 border border-orange-300 rounded-md shadow-inner">
                  <h3 className="text-md font-semibold text-orange-800 mb-2">
                    Analysis for "{selectedEmail?.["Email Name"]}"
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {aiInsight}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
