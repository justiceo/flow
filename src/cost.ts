import fs from 'fs/promises';

export async function getModelCost(modelName: string) {
    try {
        const data = await fs.readFile('./costs/model-costs.json', 'utf-8');
        const models = JSON.parse(data);
        
        for (const modelData of models) {
            if (modelData.model.toLowerCase() === modelName.toLowerCase()) {
                return {
                    tokensInCost: modelData.input_cost_10k,
                    tokensOutCost: modelData.output_cost_10k
                };
            }
        }
        
        // Return null if model is not found
        return null;
    } catch (error) {
        console.error("Error reading or parsing file:", error);
        return null;
    }
}

(async () => {
    console.log(await getModelCost('claude-3.5-sonnet (june)'));
})();
