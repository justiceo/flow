/**
 * This module provides a function to retrieve cost information for specific models
 * based on data stored in a JSON file. It reads the file asynchronously, parses the
 * JSON data, and searches for the cost details of the requested model.
 *
 * Usage:
 * Import the `getModelCost` function and call it with a model name to retrieve
 * the associated input and output token costs.
 */

import fs from "fs/promises";

// Asynchronous function to retrieve the cost details of a specific model
export async function getModelCost(modelName: string) {
  try {
    // Read the model cost data file as a UTF-8 string
    const data = await fs.readFile("./src/costs/model-costs.json", "utf-8");

    // Parse the JSON string into a JavaScript object
    const models = JSON.parse(data);

    // Loop through the array of model cost data to find a matching model
    for (const modelData of models) {
      // Compare model names case-insensitively
      if (modelData.model.toLowerCase() === modelName.toLowerCase()) {
        // Return the input and output token costs for the matching model
        return {
          tokensInCost: modelData.input_cost_10k, // Cost per 10k input tokens
          tokensOutCost: modelData.output_cost_10k, // Cost per 10k output tokens
        };
      }
    }

    // Return null if no matching model is found
    return null;
  } catch (error) {
    // Return null if an error occurs during file reading or JSON parsing
    return null;
  }
}
