const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

// Шляхи
const CIRCUIT_NAME = "merkle_proof";
const BUILD_DIR = path.join(__dirname, "../build");
const INPUT_PATH = path.join(__dirname, "../inputs/input.json");
const PROTOCOLS = ["groth16", "plonk"];

async function generateProofs() {
    // Завантаження вхідних даних
    if (!fs.existsSync(INPUT_PATH)) {
        console.error("Файл з вхідними даними не знайдено. Спочатку запустіть generate_merkle_tree.js");
        process.exit(1);
    }
    
    const input = JSON.parse(fs.readFileSync(INPUT_PATH, "utf-8"));
    
    // Генерація доказів для різних протоколів
    for (const protocol of PROTOCOLS) {
        console.log(`Генерація доказу для протоколу ${protocol}...`);
        
        const proofStartTime = performance.now();
        
        let proof, publicSignals;
        
        if (protocol === "groth16") {
            // Генерація доказу для Groth16
            ({proof, publicSignals} = await snarkjs.groth16.fullProve(
                input,
                path.join(BUILD_DIR, `${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm`),
                path.join(BUILD_DIR, `${CIRCUIT_NAME}_groth16.zkey`)
            ));
        } else if (protocol === "plonk") {
            // Генерація доказу для PLONK
            ({proof, publicSignals} = await snarkjs.plonk.fullProve(
                input,
                path.join(BUILD_DIR, `${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm`),
                path.join(BUILD_DIR, `${CIRCUIT_NAME}_plonk.zkey`)
            ));
        }
        
        const proofEndTime = performance.now();
        const proofTime = proofEndTime - proofStartTime;
        
        // Зберігаємо доказ та публічні сигнали
        fs.writeFileSync(
            path.join(BUILD_DIR, `${CIRCUIT_NAME}_${protocol}_proof.json`),
            JSON.stringify(proof, null, 2)
        );
        
        fs.writeFileSync(
            path.join(BUILD_DIR, `${CIRCUIT_NAME}_${protocol}_public.json`),
            JSON.stringify(publicSignals, null, 2)
        );
        
        // Зберігаємо час генерації
        fs.writeFileSync(
            path.join(BUILD_DIR, `${CIRCUIT_NAME}_${protocol}_proof_time.json`),
            JSON.stringify({ time: proofTime }, null, 2)
        );
        
        console.log(`Доказ для ${protocol} згенеровано за ${proofTime.toFixed(2)} мс`);
        console.log(`Розмір доказу: ${Buffer.from(JSON.stringify(proof)).length} байт`);
    }
    
    console.log("Генерація всіх доказів завершена!");
}

generateProofs().catch(err => {
    console.error("Помилка:", err);
    process.exit(1);
});

process.exit(0);
