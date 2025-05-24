const fs = require('fs');
const path = require('path');

class BaseCircuit {
    constructor(name, templatePath) {
        this.name = name;
        this.templatePath = templatePath;
        this.buildDir = path.join(__dirname, '../../build');
        this.inputsDir = path.join(__dirname, '../../inputs');
    }

    // Метод для генерации входных данных
    async generateInput(params) {
        throw new Error('Method generateInput must be implemented');
    }

    // Метод для создания файла схемы
    createCircuitFile(params) {
        throw new Error('Method createCircuitFile must be implemented');
    }

    // Метод для компиляции схемы
    async compile(params) {
        throw new Error('Method compile must be implemented');
    }

    // Общие утилиты
    ensureDirectories() {
        if (!fs.existsSync(this.buildDir)) {
            fs.mkdirSync(this.buildDir, { recursive: true });
        }
        if (!fs.existsSync(this.inputsDir)) {
            fs.mkdirSync(this.inputsDir, { recursive: true });
        }
    }

    getCircuitPath(params) {
        return path.join(this.buildDir, 'circom', `${this.name}_${params.levels}.circom`);
    }

    getR1CSPath(params) {
        return path.join(this.buildDir, 'circom', `${this.name}_${params.levels}.r1cs`);
    }

    getWasmPath(params) {
        return path.join(this.buildDir, 'circom', `${this.name}_${params.levels}_js`);
    }

    getInputPath(params) {
        return path.join(this.inputsDir, `input_${this.name}_${params.levels}.json`);
    }
}

module.exports = BaseCircuit; 