const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { generateCircomMerkleInputFile } = require("./generate_merkle_tree");
const {buildCircomCircuit} = require("./build_circuit");

const CIRCUIT_TEMPLATE_PATH = path.join(__dirname, "../circuits/merkle_proof.circom");
const BUILD_DIR = path.join(__dirname, "../build");
const INPUTS_DIR = path.join(__dirname, "../inputs");
const DEPTHS = [4, 8, 12, 16];
const PROTOCOLS = ["groth16", "plonk", "fflonk"];

if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true });
if (!fs.existsSync(INPUTS_DIR)) fs.mkdirSync(INPUTS_DIR, { recursive: true });

function makeCircuitFile(levels, outPath) {
    console.log(`Creating circuit file for depth ${levels}...`);
    const template = fs.readFileSync(CIRCUIT_TEMPLATE_PATH, "utf-8");
    const mainRegex = /component main \{public \[root\]\} = MerkleProof\(\d+\);/;
    const newMain = `component main {public [root]} = MerkleProof(${levels});`;
    const newContent = template.replace(mainRegex, newMain);
    
    // Создаем директорию для схемы, если её нет
    const circuitDir = path.dirname(outPath);
    if (!fs.existsSync(circuitDir)) {
        fs.mkdirSync(circuitDir, { recursive: true });
    }
    
    fs.writeFileSync(outPath, newContent);
    console.log(`Circuit file created at ${outPath}`);
}

async function runBenchmark() {
    const results = [];
    for (const levels of DEPTHS) {
        try {
            console.log(`\nStarting benchmark for depth=${levels}...`);

            console.log("Building Merkle tree...");
            // Генерація дерева Меркла
            const inputFileName = `input_merkle_${levels}.json`;
            await generateCircomMerkleInputFile(levels, inputFileName);
            const inputPath = path.join(INPUTS_DIR, inputFileName);
            console.log(`Input file created at ${inputPath}`);

            console.log("Generating input file...");
            // Создаём временный circom-файл
            const circuitPath = path.join(__dirname, "../circuits", `merkle_proof_${levels}.circom`);
            makeCircuitFile(levels, circuitPath);

            console.log("Compiling circuit...");
            // Компиляция circom
            const r1csPath = path.join(BUILD_DIR, "circom", `merkle_proof_${levels}.r1cs`);
            const wasmPath = path.join(BUILD_DIR, "circom", `merkle_proof_${levels}_js`);
            const circuitName = `merkle_proof_${levels}.circom`;
            buildCircomCircuit(circuitName);
            console.log("Circuit compilation completed");

            // Проверяем наличие powersOfTau28_hez_final_15.ptau
            const ptauPath = path.join(BUILD_DIR, "powersOfTau28_hez_final_20.ptau");
            if (!fs.existsSync(ptauPath)) {
                throw new Error("powersOfTau28_hez_final_20.ptau not found in build directory");
            }
            console.log("Found powersOfTau28_hez _final_20.ptau");

            console.log("");
            for (const protocol of PROTOCOLS) {
                try {
                    console.log(`Starting ${protocol} protocol...`);
                    const zkeyPath = path.join(BUILD_DIR, `merkle_proof_${levels}_${protocol}.zkey`);
                    const vkeyPath = path.join(BUILD_DIR, `merkle_proof_${levels}_${protocol}_verification_key.json`);
                    const proofPath = path.join(BUILD_DIR, `merkle_proof_${levels}_${protocol}_proof.json`);
                    const publicPath = path.join(BUILD_DIR, `merkle_proof_${levels}_${protocol}_public.json`);
                    const witnessPath = path.join(BUILD_DIR, `witness_${levels}.wtns`);

                    // Trusted setup
                    console.log(`Running ${protocol} setup...`);
                    const setupStart = Date.now();
                    if (protocol === "groth16") {
                        execSync(`npx snarkjs groth16 setup ${r1csPath} ${ptauPath} ${zkeyPath}`, { stdio: "inherit" });
                        execSync(`npx snarkjs zkey export verificationkey ${zkeyPath} ${vkeyPath}`, { stdio: "inherit" });
                    } else if (protocol === "plonk") {
                        execSync(`npx snarkjs plonk setup ${r1csPath} ${ptauPath} ${zkeyPath}`, { stdio: "inherit" });
                        execSync(`npx snarkjs zkey export verificationkey ${zkeyPath} ${vkeyPath}`, { stdio: "inherit" });
                    } else if (protocol === "fflonk") {
                        execSync(`npx snarkjs fflonk setup ${r1csPath} ${ptauPath} ${zkeyPath}`, { stdio: "inherit" });
                        execSync(`npx snarkjs zkey export verificationkey ${zkeyPath} ${vkeyPath}`, { stdio: "inherit" });
                    }
                    const setupTime = Date.now() - setupStart;
                    console.log(`${protocol} setup completed in ${setupTime}ms`);

                    // Witness
                    console.log("Generating witness...");
                    const witnessStart = Date.now();
                    execSync(`node ${wasmPath}/generate_witness.js ${wasmPath}/merkle_proof_${levels}.wasm ${inputPath} ${witnessPath}`, { stdio: "inherit" });
                    const witnessTime = Date.now() - witnessStart;
                    console.log(`Witness generation completed in ${witnessTime}ms`);

                    // Proof
                    console.log(`Generating ${protocol} proof...`);
                    const proofStart = Date.now();
                    if (protocol === "groth16") {
                        execSync(`npx snarkjs groth16 prove ${zkeyPath} ${witnessPath} ${proofPath} ${publicPath}`, { stdio: "inherit" });
                    } else if (protocol === "plonk") {
                        execSync(`npx snarkjs plonk prove ${zkeyPath} ${witnessPath} ${proofPath} ${publicPath}`, { stdio: "inherit" });
                    } else if (protocol === "fflonk") {
                        execSync(`npx snarkjs fflonk prove ${zkeyPath} ${witnessPath} ${proofPath} ${publicPath}`, { stdio: "inherit" });
                    }
                    const proofTime = Date.now() - proofStart;
                    console.log(`${protocol} proof generation completed in ${proofTime}ms`);

                    // Verify
                    console.log(`Verifying ${protocol} proof...`);
                    const verifyStart = Date.now();
                    let isValid = false;
                    if (protocol === "groth16") {
                        try {
                            execSync(`npx snarkjs groth16 verify ${vkeyPath} ${publicPath} ${proofPath}`, { stdio: "inherit" });
                            isValid = true;
                        } catch {
                            isValid = false;
                        }
                    } else if (protocol === "plonk") {
                        try {
                            execSync(`npx snarkjs plonk verify ${vkeyPath} ${publicPath} ${proofPath}`, { stdio: "inherit" });
                            isValid = true;
                        } catch {
                            isValid = false;
                        }
                    } else if (protocol === "fflonk") {
                        try {
                            execSync(`npx snarkjs fflonk verify ${vkeyPath} ${publicPath} ${proofPath}`, { stdio: "inherit" });
                            isValid = true;
                        } catch {
                            isValid = false;
                        }
                    }
                    const verifyTime = Date.now() - verifyStart;
                    console.log(`${protocol} verification completed in ${verifyTime}ms (valid: ${isValid})`);

                    // Размер proof
                    const proofSize = fs.existsSync(proofPath) ? fs.statSync(proofPath).size : 0;
                    results.push({
                        levels,
                        protocol,
                        setupTime,
                        witnessTime,
                        proofTime,
                        verifyTime,
                        proofSize,
                        isValid
                    });
                    console.log(`Completed: depth=${levels}, protocol=${protocol}`);
                } catch (err) {
                    console.error(`Error in ${protocol} protocol:`, err);
                    throw err;
                }
            }
        } catch (err) {
            console.error(`Error in depth ${levels}:`, err);
            throw err;
        }
    }
    fs.writeFileSync(path.join(BUILD_DIR, "benchmark_results.json"), JSON.stringify(results, null, 2));
    console.log("\nBenchmark complete! Results saved to build/benchmark_results.json");
}

console.log("Starting benchmark...");
runBenchmark().catch(err => {
    console.error("Error during benchmark:", err);
    process.exit(1);
});