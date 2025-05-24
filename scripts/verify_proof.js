const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

// Шляхи
const CIRCUIT_NAME = "merkle_proof";
const BUILD_DIR = path.join(__dirname, "../build");
const PROTOCOLS = ["groth16", "plonk"];

async function verifyProofs() {
    // Верифікація доказів для різних протоколів
    for (const protocol of PROTOCOLS) {
        console.log(`Верифікація доказу для протоколу ${protocol}...`);
        
        const proofPath = path.join(BUILD_DIR, `${CIRCUIT_NAME}_${protocol}_proof.json`);
        const publicPath = path.join(BUILD_DIR, `${CIRCUIT_NAME}_${protocol}_public.json`);
        const vkeyPath = path.join(BUILD_DIR, `${CIRCUIT_NAME}_${protocol}_verification_key.json`);
        
        // Дебаг
        console.log("proofPath: ", proofPath);
        console.log("publicPath: ", publicPath);
        console.log("vkeyPath: ", vkeyPath);

        if (!fs.existsSync(proofPath) || !fs.existsSync(publicPath) || !fs.existsSync(vkeyPath)) {
            console.error(`Файли для верифікації ${protocol} не знайдено. Спочатку згенеруйте докази.`);
            continue;
        }
        
        const proof = JSON.parse(fs.readFileSync(proofPath, "utf-8"));
        const publicSignals = JSON.parse(fs.readFileSync(publicPath, "utf-8"));
        const vkey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"));
        
        const verifyStartTime = performance.now();
        
        let isValid;
        
        if (protocol === "groth16") {
            isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
        } else if (protocol === "plonk") {
            isValid = await snarkjs.plonk.verify(vkey, publicSignals, proof);
        }
        
        const verifyEndTime = performance.now();
        const verifyTime = verifyEndTime - verifyStartTime;
        
        // Зберігаємо результат верифікації та час
        fs.writeFileSync(
            path.join(BUILD_DIR, `${CIRCUIT_NAME}_${protocol}_verification.json`),
            JSON.stringify({ isValid, time: verifyTime }, null, 2)
        );
        
        if (isValid) {
            console.log(`Доказ для ${protocol} успішно верифіковано за ${verifyTime.toFixed(2)} мс`);
        } else {
            console.error(`Доказ для ${protocol} НЕ верифіковано!`);
        }
    }
    
    console.log("Верифікація всіх доказів завершена!");
}

verifyProofs().catch(err => {
    console.error("Помилка:", err);
    process.exit(0);
});
process.exit(0);
