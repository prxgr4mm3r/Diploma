const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Шляхи
const CIRCUIT_NAME = "merkle_proof";
const CIRCUIT_PATH = path.join(__dirname, "../circuits", `${CIRCUIT_NAME}.circom`);
const BUILD_DIR = path.join(__dirname, "../build/circom");

// Створюємо папку для результатів
if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
}

console.log("Компіляція схеми...");

async function buildCircomCircuit(circuitName) {
    // Запускаємо компіляцію з circom
    try {
        const circuitPath = path.join(__dirname, "../circuits", circuitName);
        console.log(`Compiling circuit from: ${circuitPath}`);
        
        execSync(`circom --version`, { stdio: "inherit" });
        execSync(`circom ${circuitPath} --r1cs --wasm --sym -o ${BUILD_DIR}`, { stdio: "inherit" });
        console.log(`Схема успішно скомпільована. Результати збережено в папці ${BUILD_DIR}`);
    } catch (error) {
        console.error("Помилка при компіляції схеми:", error.message);
        throw error;
    }
}

module.exports = { buildCircomCircuit };