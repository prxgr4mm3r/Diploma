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
    const chartsDir = path.join(__dirname, '../charts');
    if (!fs.existsSync(chartsDir)) {
        fs.mkdirSync(chartsDir, { recursive: true });
    }

    // 1. Общий график времени выполнения для всех операций
    const timeChartConfig = {
        type: 'bar',
        data: {
            labels: Object.keys(groupedResults),
            datasets: [
                {
                    label: 'Groth16 Setup',
                    data: Object.values(groupedResults).map(r => r.groth16.setup.mean),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'PLONK Setup',
                    data: Object.values(groupedResults).map(r => r.plonk.setup.mean),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'FFLONK Setup',
                    data: Object.values(groupedResults).map(r => r.fflonk.setup.mean),
                    backgroundColor: 'rgba(75, 192, 75, 0.5)',
                    borderColor: 'rgba(75, 192, 75, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Groth16 Proof',
                    data: Object.values(groupedResults).map(r => r.groth16.proof.mean),
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'PLONK Proof',
                    data: Object.values(groupedResults).map(r => r.plonk.proof.mean),
                    backgroundColor: 'rgba(153, 102, 255, 0.5)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                },
                {
                    label: 'FFLONK Proof',
                    data: Object.values(groupedResults).map(r => r.fflonk.proof.mean),
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
                    text: 'Середній час виконання операцій (мс)',
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
                        text: 'Час (мс)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Глибина дерева'
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
                    text: 'Розмір доказу (байт)',
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
                        text: 'Розмір (байт)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Глибина дерева'
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
                        r.groth16.setup.mean + r.groth16.proof.mean + r.groth16.verify.mean
                    ),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: true
                },
                {
                    label: 'PLONK Total Time',
                    data: Object.values(groupedResults).map(r => 
                        r.plonk.setup.mean + r.plonk.proof.mean + r.plonk.verify.mean
                    ),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    fill: true
                },
                {
                    label: 'FFLONK Total Time',
                    data: Object.values(groupedResults).map(r => 
                        r.fflonk.setup.mean + r.fflonk.proof.mean + r.fflonk.verify.mean
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
                    text: 'Порівняння середнього загального часу виконання (мс)',
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
                        text: 'Час (мс)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Глибина дерева'
                    }
                }
            }
        }
    };

    // 4. График стандартных отклонений
    const stdDevChartConfig = {
        type: 'bar',
        data: {
            labels: Object.keys(groupedResults),
            datasets: [
                {
                    label: 'Groth16 Setup',
                    data: Object.values(groupedResults).map(r => r.groth16.setup.stdDev),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'PLONK Setup',
                    data: Object.values(groupedResults).map(r => r.plonk.setup.stdDev),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'FFLONK Setup',
                    data: Object.values(groupedResults).map(r => r.fflonk.setup.stdDev),
                    backgroundColor: 'rgba(75, 192, 75, 0.5)',
                    borderColor: 'rgba(75, 192, 75, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Groth16 Proof',
                    data: Object.values(groupedResults).map(r => r.groth16.proof.stdDev),
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'PLONK Proof',
                    data: Object.values(groupedResults).map(r => r.plonk.proof.stdDev),
                    backgroundColor: 'rgba(153, 102, 255, 0.5)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                },
                {
                    label: 'FFLONK Proof',
                    data: Object.values(groupedResults).map(r => r.fflonk.proof.stdDev),
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
                    text: 'Стандартне відхилення часу виконання (мс)',
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
                        text: 'Стандартне відхилення (мс)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Глибина дерева'
                    }
                }
            }
        }
    };

    // 5. Графики для каждого протокола отдельно
    const protocols = ['groth16', 'plonk', 'fflonk'];
    const protocolColors = {
        groth16: { bg: 'rgba(54, 162, 235, 0.5)', border: 'rgba(54, 162, 235, 1)' },
        plonk: { bg: 'rgba(255, 99, 132, 0.5)', border: 'rgba(255, 99, 132, 1)' },
        fflonk: { bg: 'rgba(75, 192, 75, 0.5)', border: 'rgba(75, 192, 75, 1)' }
    };

    for (const protocol of protocols) {
        const protocolChartConfig = {
            type: 'bar',
            data: {
                labels: Object.keys(groupedResults),
                datasets: [
                    {
                        label: 'Setup',
                        data: Object.values(groupedResults).map(r => r[protocol].setup.mean),
                        backgroundColor: protocolColors[protocol].bg,
                        borderColor: protocolColors[protocol].border,
                        borderWidth: 1
                    },
                    {
                        label: 'Proof',
                        data: Object.values(groupedResults).map(r => r[protocol].proof.mean),
                        backgroundColor: protocolColors[protocol].bg.replace('0.5', '0.7'),
                        borderColor: protocolColors[protocol].border,
                        borderWidth: 1
                    },
                    {
                        label: 'Verify',
                        data: Object.values(groupedResults).map(r => r[protocol].verify.mean),
                        backgroundColor: protocolColors[protocol].bg.replace('0.5', '0.3'),
                        borderColor: protocolColors[protocol].border,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `${protocol.toUpperCase()} - Час виконання операцій (мс)`,
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
                            text: 'Час (мс)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Глибина дерева'
                        }
                    }
                }
            }
        };

        const protocolChart = await chartJSNodeCanvas.renderToBuffer(protocolChartConfig);
        fs.writeFileSync(path.join(chartsDir, `${protocol}_operations.png`), protocolChart);
    }

    // 6. Графики для каждой глубины отдельно
    for (const depth of Object.keys(groupedResults)) {
        const depthChartConfig = {
            type: 'bar',
            data: {
                labels: ['Setup', 'Proof', 'Verify'],
                datasets: [
                    {
                        label: 'Groth16',
                        data: [
                            groupedResults[depth].groth16.setup.mean,
                            groupedResults[depth].groth16.proof.mean,
                            groupedResults[depth].groth16.verify.mean
                        ],
                        backgroundColor: protocolColors.groth16.bg,
                        borderColor: protocolColors.groth16.border,
                        borderWidth: 1
                    },
                    {
                        label: 'PLONK',
                        data: [
                            groupedResults[depth].plonk.setup.mean,
                            groupedResults[depth].plonk.proof.mean,
                            groupedResults[depth].plonk.verify.mean
                        ],
                        backgroundColor: protocolColors.plonk.bg,
                        borderColor: protocolColors.plonk.border,
                        borderWidth: 1
                    },
                    {
                        label: 'FFLONK',
                        data: [
                            groupedResults[depth].fflonk.setup.mean,
                            groupedResults[depth].fflonk.proof.mean,
                            groupedResults[depth].fflonk.verify.mean
                        ],
                        backgroundColor: protocolColors.fflonk.bg,
                        borderColor: protocolColors.fflonk.border,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Порівняння протоколів при глибині ${depth}`,
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
                            text: 'Час (мс)'
                        }
                    }
                }
            }
        };

        const depthChart = await chartJSNodeCanvas.renderToBuffer(depthChartConfig);
        fs.writeFileSync(path.join(chartsDir, `depth_${depth}_comparison.png`), depthChart);
    }

    // 7. График соотношения размера доказательства к времени выполнения
    const efficiencyChartConfig = {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Groth16',
                    data: Object.entries(groupedResults).map(([depth, r]) => ({
                        x: r.groth16.proofSize,
                        y: r.groth16.setup.mean + r.groth16.proof.mean + r.groth16.verify.mean
                    })),
                    backgroundColor: protocolColors.groth16.bg,
                    borderColor: protocolColors.groth16.border,
                    borderWidth: 1
                },
                {
                    label: 'PLONK',
                    data: Object.entries(groupedResults).map(([depth, r]) => ({
                        x: r.plonk.proofSize,
                        y: r.plonk.setup.mean + r.plonk.proof.mean + r.plonk.verify.mean
                    })),
                    backgroundColor: protocolColors.plonk.bg,
                    borderColor: protocolColors.plonk.border,
                    borderWidth: 1
                },
                {
                    label: 'FFLONK',
                    data: Object.entries(groupedResults).map(([depth, r]) => ({
                        x: r.fflonk.proofSize,
                        y: r.fflonk.setup.mean + r.fflonk.proof.mean + r.fflonk.verify.mean
                    })),
                    backgroundColor: protocolColors.fflonk.bg,
                    borderColor: protocolColors.fflonk.border,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Співвідношення розміру доказу та часу виконання',
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
                        text: 'Загальний час (мс)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Розмір доказу (байт)'
                    }
                }
            }
        }
    };

    // Сохраняем все графики
    const timeChart = await chartJSNodeCanvas.renderToBuffer(timeChartConfig);
    const sizeChart = await chartJSNodeCanvas.renderToBuffer(sizeChartConfig);
    const comparisonChart = await chartJSNodeCanvas.renderToBuffer(comparisonChartConfig);
    const stdDevChart = await chartJSNodeCanvas.renderToBuffer(stdDevChartConfig);
    const efficiencyChart = await chartJSNodeCanvas.renderToBuffer(efficiencyChartConfig);

    fs.writeFileSync(path.join(chartsDir, 'time_comparison.png'), timeChart);
    fs.writeFileSync(path.join(chartsDir, 'proof_size.png'), sizeChart);
    fs.writeFileSync(path.join(chartsDir, 'protocol_comparison.png'), comparisonChart);
    fs.writeFileSync(path.join(chartsDir, 'std_dev_comparison.png'), stdDevChart);
    fs.writeFileSync(path.join(chartsDir, 'efficiency_comparison.png'), efficiencyChart);

    console.log('Графіки збережено в директорії charts/');
}

createCharts().catch(console.error); 