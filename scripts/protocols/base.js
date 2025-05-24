const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BaseProtocol {
    constructor(name) {
        this.name = name;
        this.buildDir = path.join(__dirname, '../../build');
    }

    // Метод для настройки протокола
    async setup(circuit, params) {
        throw new Error('Method setup must be implemented');
    }

    // Метод для генерации доказательства
    async generateProof(circuit, params) {
        throw new Error('Method generateProof must be implemented');
    }

    // Метод для верификации доказательства
    async verify(circuit, params) {
        throw new Error('Method verify must be implemented');
    }

    // Общие утилиты
    getZKeyPath(circuit, params) {
        return path.join(this.buildDir, `${circuit.name}_${params.levels}_${this.name}.zkey`);
    }

    getVKeyPath(circuit, params) {
        return path.join(this.buildDir, `${circuit.name}_${params.levels}_${this.name}_verification_key.json`);
    }

    getProofPath(circuit, params) {
        return path.join(this.buildDir, `${circuit.name}_${params.levels}_${this.name}_proof.json`);
    }

    getPublicPath(circuit, params) {
        return path.join(this.buildDir, `${circuit.name}_${params.levels}_${this.name}_public.json`);
    }

    getWitnessPath(circuit, params) {
        return path.join(this.buildDir, `witness_${params.levels}.wtns`);
    }

    // Общие методы для выполнения команд
    executeCommand(command) {
        try {
            execSync(command, { stdio: 'inherit' });
            return true;
        } catch (error) {
            console.error(`Error executing command: ${command}`);
            console.error(error);
            return false;
        }
    }
}

module.exports = BaseProtocol; 