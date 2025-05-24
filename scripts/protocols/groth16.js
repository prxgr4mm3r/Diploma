const path = require('path');
const BaseProtocol = require('./base');

class Groth16Protocol extends BaseProtocol {
    constructor() {
        super('groth16');
    }

    async setup(circuit, params) {
        const r1csPath = circuit.getR1CSPath(params);
        const ptauPath = path.join(this.buildDir, 'powersOfTau28_hez_final_20.ptau');
        const zkeyPath = this.getZKeyPath(circuit, params);
        const vkeyPath = this.getVKeyPath(circuit, params);

        console.log(`Running ${this.name} setup...`);
        const setupStart = Date.now();

        this.executeCommand(`npx snarkjs groth16 setup ${r1csPath} ${ptauPath} ${zkeyPath}`);
        this.executeCommand(`npx snarkjs zkey export verificationkey ${zkeyPath} ${vkeyPath}`);

        const setupTime = Date.now() - setupStart;
        console.log(`${this.name} setup completed in ${setupTime}ms`);
        return setupTime;
    }

    async generateProof(circuit, params) {
        const zkeyPath = this.getZKeyPath(circuit, params);
        const witnessPath = this.getWitnessPath(circuit, params);
        const proofPath = this.getProofPath(circuit, params);
        const publicPath = this.getPublicPath(circuit, params);

        console.log(`Generating ${this.name} proof...`);
        const proofStart = Date.now();

        this.executeCommand(`npx snarkjs groth16 prove ${zkeyPath} ${witnessPath} ${proofPath} ${publicPath}`);

        const proofTime = Date.now() - proofStart;
        console.log(`${this.name} proof generation completed in ${proofTime}ms`);
        return proofTime;
    }

    async verify(circuit, params) {
        const vkeyPath = this.getVKeyPath(circuit, params);
        const publicPath = this.getPublicPath(circuit, params);
        const proofPath = this.getProofPath(circuit, params);

        console.log(`Verifying ${this.name} proof...`);
        const verifyStart = Date.now();

        const isValid = this.executeCommand(`npx snarkjs groth16 verify ${vkeyPath} ${publicPath} ${proofPath}`);

        const verifyTime = Date.now() - verifyStart;
        console.log(`${this.name} verification completed in ${verifyTime}ms (valid: ${isValid})`);
        return { isValid, verifyTime };
    }
}

module.exports = Groth16Protocol; 