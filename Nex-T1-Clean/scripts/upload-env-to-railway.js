const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  const vars = {};

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    // Handle KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Skip empty or comment-like values if any
      if (key) {
        vars[key] = value;
      }
    }
  });

  console.log(`Found ${Object.keys(vars).length} environment variables.`);

  // Construct CLI arguments
  // railway variables --set "KEY=VALUE" "KEY2=VALUE2" ...
  // We'll batch them to avoid command line length limits if necessary
  const BATCH_SIZE = 50;
  const entries = Object.entries(vars);
  
  const processBatch = (startIndex) => {
    if (startIndex >= entries.length) {
      console.log('All variables uploaded.');
      return;
    }

    const batch = entries.slice(startIndex, startIndex + BATCH_SIZE);
    const args = batch.map(([k, v]) => `--set "${k}=${v.replace(/"/g, '\\"')}"`).join(' ');
    
    console.log(`Uploading batch ${startIndex / BATCH_SIZE + 1}...`);
    
    exec(`railway variables ${args}`, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error uploading batch starting at ${startIndex}:`, error);
        console.error(stderr);
        return;
      }
      console.log(stdout);
      processBatch(startIndex + BATCH_SIZE);
    });
  };

  processBatch(0);

} catch (err) {
  console.error('Failed to read or parse .env.local:', err);
}
