const fs = require("fs");
const path = require("path");
const { buildPoseidon } = require("circomlibjs");

// Функція для генерації випадкового елемента
function generateRandomElement() {
    return Math.floor(Math.random() * 10000000);
}

// Функція для створення дерева Меркла
async function buildMerkleTree(levels) {
    // Генеруємо випадкові елементи
    const numElements = 2 ** (levels - 1);
    const elements = Array.from({ length: numElements }, generateRandomElement);
    const leaves = elements.map(el => BigInt(el));
    const layers = [leaves];

    // Создаем один экземпляр Poseidon для всего дерева
    const poseidon = await buildPoseidon();

    // Будуємо верхні рівні дерева
    for (let level = 0; level < levels; level++) {
        const currentLayer = layers[level];
        const nextLayer = [];

        for (let i = 0; i < currentLayer.length; i += 2) {
            // Якщо це останній елемент без пари, дублюємо його
            const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : currentLayer[i];
            const hash = poseidon([currentLayer[i], right]);
            const formatedHash = poseidon.F.toString(hash);
            nextLayer.push(formatedHash);
        }

        layers.push(nextLayer);
    }

    return { layers, root: layers[layers.length - 1][0], elements };
}

// Функція для генерації шляху Меркла для конкретного індексу
async function generateMerkleProof(tree, index, levels) {
    const pathElements = [];
    const pathIndices = [];
    let currentIndex = index;

    for (let i = 0; i < levels; i++) {
        const isRight = currentIndex % 2;
        const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
        
        // Проверяем, что мы не вышли за пределы текущего слоя
        if (siblingIndex >= tree.layers[i].length) {
            // Если вышли за пределы, используем текущий элемент
            pathElements.push(tree.layers[i][currentIndex]);
        } else {
            pathElements.push(tree.layers[i][siblingIndex]);
        }
        
        pathIndices.push(isRight ? 1 : 0);
        
        // Підіймаємося на рівень вгору
        currentIndex = Math.floor(currentIndex / 2);
    }

    return { pathElements, pathIndices };
}

async function generateCircomInput(tree, testElementIndex, levels) {
    const { pathElements, pathIndices } = await generateMerkleProof(tree, testElementIndex, levels);
    // Проверяем, что elements есть в tree
    if (!tree.elements || !Array.isArray(tree.elements)) {
        throw new Error("tree.elements is undefined. Проверьте, что buildMerkleTree возвращает elements.");
    }
    return {
        root: tree.root.toString(),
        leaf: tree.elements[testElementIndex].toString(),
        pathElements: pathElements.map(el => el.toString()),
        pathIndices: pathIndices
    };
}

async function generateCircomMerkleInputFile(levels, fileName) {
    console.time('Tree generation');
    const tree = await buildMerkleTree(levels);
    console.timeEnd('Tree generation');
    
    console.time('Proof generation');
    const testElementIndex = Math.floor(Math.random() * tree.elements.length);
    const input = await generateCircomInput(tree, testElementIndex, levels);
    console.timeEnd('Proof generation');
    
    const inputDir = path.join(__dirname, "../inputs");
    if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(inputDir, fileName),
        JSON.stringify(input, null, 2)
    );

    console.log(`Вхідні дані збережено в inputs/${fileName}`);
    console.log(`Корінь дерева Меркла: ${tree.root}`);
    console.log(`Тестовий елемент: ${tree.elements[testElementIndex]}`);
    console.log(`Індекс тестового елемента: ${testElementIndex}`);
}

// Головна функція
async function main() {
    // Параметри
    const levels = 16; // Глибина дерева
    const tree = await buildMerkleTree(levels);
    const testElementIndex = Math.floor(Math.random() * tree.elements.length);
    console.log(`Корінь дерева Меркла: ${tree.root}`);
    
    // Створюємо вхідні дані для Circom схеми
    const input = await generateCircomInput(tree, testElementIndex, levels);
    
    // Зберігаємо вхідні дані
    const inputDir = path.join(__dirname, "../inputs");
    if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(inputDir, "input.json"),
        JSON.stringify(input, null, 2)
    );
    
    console.log(`Вхідні дані збережено в inputs/input.json`);
    console.log(`Тестовий елемент: ${tree.elements[testElementIndex]}`);
    console.log(`Індекс тестового елемента: ${testElementIndex}`);
}

main().catch(err => {
    console.error("Помилка:", err);
    process.exit(1);
});

module.exports = {
    buildMerkleTree,
    generateMerkleProof,
    generateRandomElement,
    generateCircomMerkleInputFile
};