const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// Obfuscation settings (medium protection)
const obfuscatorOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.3,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false, // Keep false to preserve function names called from HTML
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 4,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false
};

console.log('Starting build process...\n');

// 1. Read translations
console.log('1. Reading translations...');
const textsPath = path.join(__dirname, 'src', 'texts.json');
const translations = JSON.parse(fs.readFileSync(textsPath, 'utf8'));
console.log('   Translations loaded successfully.');

// 2. Read source script
console.log('2. Reading source script...');
const scriptPath = path.join(__dirname, 'src', 'script.js');
let scriptContent = fs.readFileSync(scriptPath, 'utf8');
console.log('   Script loaded successfully.');

// 3. Embed translations into script
console.log('3. Embedding translations...');
const translationsJson = JSON.stringify(translations);
scriptContent = scriptContent.replace(
    'let translations = null;',
    `let translations = ${translationsJson};`
);
console.log('   Translations embedded successfully.');

// 4. Obfuscate script
console.log('4. Obfuscating script...');
const obfuscatedScript = JavaScriptObfuscator.obfuscate(scriptContent, obfuscatorOptions);
console.log('   Script obfuscated successfully.');

// 5. Write obfuscated script to output
console.log('5. Writing obfuscated script.js...');
fs.writeFileSync(path.join(__dirname, 'script.js'), obfuscatedScript.getObfuscatedCode());
console.log('   script.js written successfully.');

// 6. Obfuscate firebase-config.js
console.log('6. Obfuscating firebase-config.js...');
const firebaseConfigPath = path.join(__dirname, 'src', 'firebase-config.js');
const firebaseConfigContent = fs.readFileSync(firebaseConfigPath, 'utf8');
const obfuscatedFirebaseConfig = JavaScriptObfuscator.obfuscate(firebaseConfigContent, obfuscatorOptions);
fs.writeFileSync(path.join(__dirname, 'firebase-config.js'), obfuscatedFirebaseConfig.getObfuscatedCode());
console.log('   firebase-config.js written successfully.');

// 7. Delete texts.json from root if it exists
console.log('7. Cleaning up...');
const rootTextsPath = path.join(__dirname, 'texts.json');
if (fs.existsSync(rootTextsPath)) {
    fs.unlinkSync(rootTextsPath);
    console.log('   Removed texts.json from root.');
}

console.log('\nBuild completed successfully!');
console.log('Output files:');
console.log('  - script.js (obfuscated, with embedded translations)');
console.log('  - firebase-config.js (obfuscated)');
