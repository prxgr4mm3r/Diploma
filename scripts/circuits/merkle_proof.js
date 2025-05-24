const fs = require('fs');
const path = require('path');
const BaseCircuit = require('./base');
const { generateCircomMerkleInputFile } = require('../generate_merkle_tree');
const { buildCircomCircuit } = require('../build_circuit');

class MerkleProofCircuit extends BaseCircuit {
    constructor() {
        super('merkle_proof', path.join(__dirname, '../../circuits/merkle_proof.circom'));
    }

    async generateInput(params) {
        const inputFileName = `input_${this.name}_${params.levels}.json`;
        await generateCircomMerkleInputFile(params.levels, inputFileName);
        return this.getInputPath(params);
    }

    createCircuitFile(params) {
        console.log(`Creating circuit file for depth ${params.levels}...`);
        const template = fs.readFileSync(this.templatePath, 'utf-8');
        const mainRegex = /component main \{public \[root\]\} = MerkleProof\(\d+\);/;
        const newMain = `component main {public [root]} = MerkleProof(${params.levels});`;
        const newContent = template.replace(mainRegex, newMain);
        
        const circuitPath = this.getCircuitPath(params);
        const circuitDir = path.dirname(circuitPath);
        if (!fs.existsSync(circuitDir)) {
            fs.mkdirSync(circuitDir, { recursive: true });
        }
        
        fs.writeFileSync(circuitPath, newContent);
        console.log(`Circuit file created at ${circuitPath}`);
    }

    async compile(params) {
        console.log('Compiling circuit...');
        const circuitName = `${this.name}_${params.levels}.circom`;
        buildCircomCircuit(circuitName);
        console.log('Circuit compilation completed');
    }
}

module.exports = MerkleProofCircuit; 