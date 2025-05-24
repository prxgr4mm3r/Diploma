const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const CIRCUIT_NAME = "merkle_proof";
const BUILD_DIR = path.join(__dirname, "../build");

if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
}

function runPowersOfTauCeremony() {
    // 1. Новый ptau-файл
    execSync(`npx snarkjs powersoftau new bn128 14 ${path.join(BUILD_DIR, "pot14_0000.ptau") } -v`, { stdio: "inherit" });

    // 2. Вклад (contribution)
    execSync(`npx snarkjs powersoftau contribute ${path.join(BUILD_DIR, "pot14_0000.ptau")} ${path.join(BUILD_DIR, "pot14_0001.ptau")} --name="First contribution" -v -e="Some random entropy"`, { stdio: "inherit" });

    // 3. Подготовка к фазе 2
    execSync(`npx snarkjs powersoftau prepare phase2 ${path.join(BUILD_DIR, "pot14_0001.ptau")} ${path.join(BUILD_DIR, "pot14_final.ptau")} -v`, { stdio: "inherit" });

    // 4. Проверка
    execSync(`npx snarkjs powersoftau verify ${path.join(BUILD_DIR, "pot14_final.ptau")}`, { stdio: "inherit" });
}

async function setupGroth16() {
    console.log("Налаштування протоколу Groth16...");
    await execSync(`npx snarkjs groth16 setup ${path.join(BUILD_DIR, `${CIRCUIT_NAME}.r1cs`)} ${path.join(BUILD_DIR, "pot14_final.ptau")} ${path.join(BUILD_DIR, `${CIRCUIT_NAME}_groth16.zkey`)} -v`, { stdio: "inherit" });
    await execSync(`npx snarkjs zkey export verificationkey ${path.join(BUILD_DIR, `${CIRCUIT_NAME}_groth16.zkey`)} ${path.join(BUILD_DIR, `${CIRCUIT_NAME}_groth16_verification_key.json`)} -v`, { stdio: "inherit" });
    console.log("Налаштування Groth16 завершено!");
}

async function setupPlonk() {
    console.log("Налаштування протоколу PLONK...");
    await execSync(`npx snarkjs plonk setup ${path.join(BUILD_DIR, `${CIRCUIT_NAME}.r1cs`)} ${path.join(BUILD_DIR, "pot14_final.ptau")} ${path.join(BUILD_DIR, `${CIRCUIT_NAME}_plonk.zkey`)} -v`, { stdio: "inherit" });
    await execSync(`npx snarkjs zkey export verificationkey ${path.join(BUILD_DIR, `${CIRCUIT_NAME}_plonk.zkey`)} ${path.join(BUILD_DIR, `${CIRCUIT_NAME}_plonk_verification_key.json`)} -v`, { stdio: "inherit" });
    console.log("Налаштування PLONK завершено!");
}

async function main() {
    runPowersOfTauCeremony();
    // Проверяем, что схема скомпилирована
    // if (!fs.existsSync(path.join(BUILD_DIR, `${CIRCUIT_NAME}.r1cs`))) {
    //     console.error("Файли компіляції не знайдено. Спочатку запустіть build_circuit.js");
    //     process.exit(1);
    // }
    // await setupGroth16();
    // await setupPlonk();
    // console.log("Налаштування всіх протоколів завершено!");
}

main().catch(err => {
    console.error("Помилка:", err);
    process.exit(1);
});
process.exit(0);
