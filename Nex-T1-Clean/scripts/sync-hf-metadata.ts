import fs from 'fs';
import path from 'path';

const HF_TOKEN = process.env.HF_TOKEN;
const ORG_NAME = 'nexis-labs';
const README_PATH = path.join(process.cwd(), 'hugging-face-card.md');

if (!HF_TOKEN) {
    console.error('Error: HF_TOKEN environment variable is not set.');
    process.exit(1);
}

async function fetchHFData(endpoint: string) {
    const response = await fetch(`https://huggingface.co/api/${endpoint}?author=${ORG_NAME}`, {
        headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
    }

    return response.json();
}

async function main() {
    try {
        console.log(`Fetching models and datasets for ${ORG_NAME}...`);
        const [models, datasets] = await Promise.all([
            fetchHFData('models'),
            fetchHFData('datasets'),
        ]);

        let content = fs.readFileSync(README_PATH, 'utf-8');

        // Generate Models section
        let modelsSection = '\n## 🤖 Models\n\n';
        if (models.length > 0) {
            modelsSection += models.map((m: unknown) => `- [${m.modelId}](https://huggingface.co/${m.modelId})`).join('\n');
        } else {
            modelsSection += 'No models found.';
        }

        // Generate Datasets section
        let datasetsSection = '\n## 📊 Datasets\n\n';
        if (datasets.length > 0) {
            datasetsSection += datasets.map((d: unknown) => `- [${d.id}](https://huggingface.co/datasets/${d.id})`).join('\n');
        } else {
            datasetsSection += 'No datasets found.';
        }

        // Append or replace sections
        const newContent = content + modelsSection + datasetsSection;

        // Write back to file
        // Note: In a real implementation, we might want to be smarter about replacing existing sections
        // For now, we'll just append for demonstration
        fs.writeFileSync(README_PATH, newContent);
        console.log('Successfully updated hugging-face-card.md with models and datasets.');

    } catch (error) {
        console.error('Error syncing metadata:', error);
    }
}

main();
