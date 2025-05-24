const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Импортируем схемы
const MerkleProofCircuit = require('./circuits/merkle_proof');

// Импортируем протоколы
const Groth16Protocol = require('./protocols/groth16');
const PlonkProtocol = require('./protocols/plonk');
const FflonkProtocol = require('./protocols/fflonk');

const DEPTHS = [4, 8, 12, 16];
const PROTOCOLS = [
    new Groth16Protocol(),
    new PlonkProtocol(),
    new FflonkProtocol()
];
const ITERATIONS = 5; // Количество итераций для каждого теста

// Функции для статистических вычислений
function calculateStats(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Стандартное отклонение
    const squareDiffs = values.map(value => {
        const diff = value - mean;
        return diff * diff;
    });
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    return {
        mean,
        median,
        stdDev,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        values
    };
}

async function runBenchmark() {
    const allResults = [];
    const circuit = new MerkleProofCircuit();

    for (const levels of DEPTHS) {
        try {
            console.log(`\nStarting benchmark for depth=${levels}...`);
            const params = { levels };

            // Подготовка схемы (делаем один раз для всех итераций)
            console.log("Building Merkle tree...");
            await circuit.generateInput(params);
            console.log("Generating input file...");
            circuit.createCircuitFile(params);
            console.log("Compiling circuit...");
            await circuit.compile(params);

            // Проверяем наличие pot14_final.ptau
            const ptauPath = path.join(__dirname, '../build/pot14_final.ptau');
            if (!fs.existsSync(ptauPath)) {
                throw new Error("pot14_final.ptau not found in build directory");
            }
            console.log("Found pot14_final.ptau");

            // Генерация witness (делаем один раз для всех итераций)
            console.log("Generating witness...");
            const witnessStart = Date.now();
            const wasmPath = circuit.getWasmPath(params);
            const inputPath = circuit.getInputPath(params);
            const witnessPath = path.join(__dirname, '../build', `witness_${levels}.wtns`);
            execSync(`node ${wasmPath}/generate_witness.js ${wasmPath}/merkle_proof_${levels}.wasm ${inputPath} ${witnessPath}`, { stdio: "inherit" });
            const witnessTime = Date.now() - witnessStart;
            console.log(`Witness generation completed in ${witnessTime}ms`);

            // Тестирование протоколов
            for (const protocol of PROTOCOLS) {
                try {
                    console.log(`\nStarting ${protocol.name} protocol...`);

                    // Массивы для сбора результатов
                    const setupTimes = [];
                    const proofTimes = [];
                    const verifyTimes = [];
                    const isValidResults = [];

                    // Выполняем несколько итераций
                    for (let i = 0; i < ITERATIONS; i++) {
                        console.log(`\nIteration ${i + 1}/${ITERATIONS}`);

                        // Setup
                        const setupTime = await protocol.setup(circuit, params);
                        setupTimes.push(setupTime);

                        // Proof
                        const proofTime = await protocol.generateProof(circuit, params);
                        proofTimes.push(proofTime);

                        // Verify
                        const { isValid, verifyTime } = await protocol.verify(circuit, params);
                        verifyTimes.push(verifyTime);
                        isValidResults.push(isValid);
                    }

                    // Собираем статистику
                    const setupStats = calculateStats(setupTimes);
                    const proofStats = calculateStats(proofTimes);
                    const verifyStats = calculateStats(verifyTimes);
                    const isValid = isValidResults.every(v => v);

                    // Размер proof (берем один раз, так как он не меняется)
                    const proofPath = protocol.getProofPath(circuit, params);
                    const proofSize = fs.existsSync(proofPath) ? fs.statSync(proofPath).size : 0;

                    // Сохраняем результаты
                    allResults.push({
                        levels,
                        protocol: protocol.name,
                        setup: setupStats,
                        proof: proofStats,
                        verify: verifyStats,
                        witnessTime,
                        proofSize,
                        isValid
                    });

                    console.log(`\nResults for ${protocol.name} (depth=${levels}):`);
                    console.log('Setup:', setupStats);
                    console.log('Proof:', proofStats);
                    console.log('Verify:', verifyStats);
                    console.log(`Proof size: ${proofSize} bytes`);
                    console.log(`Valid: ${isValid}`);

                } catch (err) {
                    console.error(`Error in ${protocol.name} protocol:`, err);
                    throw err;
                }
            }
        } catch (err) {
            console.error(`Error in depth ${levels}:`, err);
            throw err;
        }
    }

    // Сохраняем все результаты
    const resultsPath = path.join(__dirname, '../build/benchmark_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2));
    console.log("\nBenchmark complete! Results saved to build/benchmark_results.json");

    // Сохраняем сводную статистику
    const summary = allResults.map(result => ({
        levels: result.levels,
        protocol: result.protocol,
        setup: {
            mean: result.setup.mean,
            median: result.setup.median,
            stdDev: result.setup.stdDev
        },
        proof: {
            mean: result.proof.mean,
            median: result.proof.median,
            stdDev: result.proof.stdDev
        },
        verify: {
            mean: result.verify.mean,
            median: result.verify.median,
            stdDev: result.verify.stdDev
        },
        witnessTime: result.witnessTime,
        proofSize: result.proofSize,
        isValid: result.isValid
    }));

    const summaryPath = path.join(__dirname, '../build/benchmark_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log("Summary statistics saved to build/benchmark_summary.json");
}

console.log("Starting benchmark...");
runBenchmark().catch(err => {
    console.error("Error during benchmark:", err);
    process.exit(1);
});