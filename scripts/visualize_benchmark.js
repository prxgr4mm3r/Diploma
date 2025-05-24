const fs = require('fs');
const path = require('path');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { createCanvas } = require('canvas');

// Конфигурация для Chart.js
const width = 1200;
const height = 800;
const chartCallback = (ChartJS) => {
    ChartJS.defaults.color = '#666';
    ChartJS.defaults.font.family = 'Arial';
    ChartJS.defaults.font.size = 14;
};
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

// Читаем результаты бенчмарка
const results = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/benchmark_results.json'), 'utf8'));

// Группируем результаты по глубине и протоколу
const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.levels]) {
        acc[result.levels] = {};
    }
    acc[result.levels][result.protocol] = result;
    return acc;
}, {});

// Создаем графики
async function createCharts() {
    // 1. График времени выполнения для разных операций
    const timeChartConfig = {
        type: 'bar',
        data: {
            labels: Object.keys(groupedResults),
            datasets: [
                {
                    label: 'Groth16 Setup',
                    data: Object.values(groupedResults).map(r => r.groth16.setupTime),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'PLONK Setup',
                    data: Object.values(groupedResults).map(r => r.plonk.setupTime),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'FFLONK Setup',
                    data: Object.values(groupedResults).map(r => r.fflonk.setupTime),
                    backgroundColor: 'rgba(75, 192, 75, 0.5)',
                    borderColor: 'rgba(75, 192, 75, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Groth16 Proof',
                    data: Object.values(groupedResults).map(r => r.groth16.proofTime),
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'PLONK Proof',
                    data: Object.values(groupedResults).map(r => r.plonk.proofTime),
                    backgroundColor: 'rgba(153, 102, 255, 0.5)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                },
                {
                    label: 'FFLONK Proof',
                    data: Object.values(groupedResults).map(r => r.fflonk.proofTime),
                    backgroundColor: 'rgba(102, 205, 102, 0.5)',
                    borderColor: 'rgba(102, 205, 102, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Время выполнения операций (мс)',
                    font: { size: 20 }
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Время (мс)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Глубина дерева'
                    }
                }
            }
        }
    };

    // 2. График размера доказательства
    const sizeChartConfig = {
        type: 'bar',
        data: {
            labels: Object.keys(groupedResults),
            datasets: [
                {
                    label: 'Groth16',
                    data: Object.values(groupedResults).map(r => r.groth16.proofSize),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'PLONK',
                    data: Object.values(groupedResults).map(r => r.plonk.proofSize),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'FFLONK',
                    data: Object.values(groupedResults).map(r => r.fflonk.proofSize),
                    backgroundColor: 'rgba(75, 192, 75, 0.5)',
                    borderColor: 'rgba(75, 192, 75, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Размер доказательства (байт)',
                    font: { size: 20 }
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Размер (байт)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Глубина дерева'
                    }
                }
            }
        }
    };

    // 3. График сравнения времени между протоколами
    const comparisonChartConfig = {
        type: 'line',
        data: {
            labels: Object.keys(groupedResults),
            datasets: [
                {
                    label: 'Groth16 Total Time',
                    data: Object.values(groupedResults).map(r => 
                        r.groth16.setupTime + r.groth16.proofTime + r.groth16.verifyTime
                    ),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: true
                },
                {
                    label: 'PLONK Total Time',
                    data: Object.values(groupedResults).map(r => 
                        r.plonk.setupTime + r.plonk.proofTime + r.plonk.verifyTime
                    ),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    fill: true
                },
                {
                    label: 'FFLONK Total Time',
                    data: Object.values(groupedResults).map(r => 
                        r.fflonk.setupTime + r.fflonk.proofTime + r.fflonk.verifyTime
                    ),
                    borderColor: 'rgba(75, 192, 75, 1)',
                    backgroundColor: 'rgba(75, 192, 75, 0.1)',
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Сравнение общего времени выполнения (мс)',
                    font: { size: 20 }
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Время (мс)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Глубина дерева'
                    }
                }
            }
        }
    };

    // Создаем директорию для графиков, если её нет
    const chartsDir = path.join(__dirname, '../charts');
    if (!fs.existsSync(chartsDir)) {
        fs.mkdirSync(chartsDir, { recursive: true });
    }

    // Сохраняем графики
    const timeChart = await chartJSNodeCanvas.renderToBuffer(timeChartConfig);
    const sizeChart = await chartJSNodeCanvas.renderToBuffer(sizeChartConfig);
    const comparisonChart = await chartJSNodeCanvas.renderToBuffer(comparisonChartConfig);

    fs.writeFileSync(path.join(chartsDir, 'time_comparison.png'), timeChart);
    fs.writeFileSync(path.join(chartsDir, 'proof_size.png'), sizeChart);
    fs.writeFileSync(path.join(chartsDir, 'protocol_comparison.png'), comparisonChart);

    console.log('Графики сохранены в директории charts/');
}

createCharts().catch(console.error); 