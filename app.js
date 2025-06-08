// Enhanced Photoelectric Effect Simulator
class PhotoelectricSimulator {
    constructor() {
        this.materials = [
            {"name": "Cesium (Cs)", "workFunction": 2.10, "symbol": "Cs"},
            {"name": "Sodium (Na)", "workFunction": 2.28, "symbol": "Na"},
            {"name": "Potassium (K)", "workFunction": 2.30, "symbol": "K"},
            {"name": "Aluminum (Al)", "workFunction": 4.08, "symbol": "Al"},
            {"name": "Copper (Cu)", "workFunction": 4.70, "symbol": "Cu"},
            {"name": "Silver (Ag)", "workFunction": 4.73, "symbol": "Ag"},
            {"name": "Gold (Au)", "workFunction": 5.10, "symbol": "Au"}
        ];
        
        this.constants = {
            h: 4.136e-15,  // eV·s
            c: 2.998e8,    // m/s
            e: 1.602e-19,  // C
            hc: 1.240e-6   // eV·m
        };
        
        this.currentMaterial = null;
        this.wavelength = 400; // nm
        this.intensity = 5.0;  // μW/cm²
        this.voltage = 0.0;    // V
        this.measurementRounds = 10;
        this.noiseLevel = 0.05;
        
        this.experimentalData = [];
        this.plotData = [];
        
        this.initializeUI();
        this.setupEventListeners();
        this.initializePlot();
    }
    
    initializeUI() {
        // Populate material dropdown
        const materialSelect = document.getElementById('materialSelect');
        materialSelect.innerHTML = '<option value="">Select Material...</option>';
        
        this.materials.forEach((material, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${material.name} (φ = ${material.workFunction} eV)`;
            materialSelect.appendChild(option);
        });
        
        // Set default material
        materialSelect.value = 0;
        this.selectMaterial(0);
    }
    
    setupEventListeners() {
        // Material selection
        document.getElementById('materialSelect').addEventListener('change', (e) => {
            if (e.target.value !== '') {
                this.selectMaterial(parseInt(e.target.value));
            }
        });
        
        // Parameter sliders
        document.getElementById('wavelengthSlider').addEventListener('input', (e) => {
            this.wavelength = parseFloat(e.target.value);
            this.updateWavelengthDisplay();
            this.updatePhysicsParameters();
            this.updateVisualEffects();
        });
        
        document.getElementById('intensitySlider').addEventListener('input', (e) => {
            this.intensity = parseFloat(e.target.value);
            this.updateIntensityDisplay();
        });
        
        document.getElementById('voltageSlider').addEventListener('input', (e) => {
            this.voltage = parseFloat(e.target.value);
            this.updateVoltageDisplay();
        });
        
        document.getElementById('measurementRounds').addEventListener('change', (e) => {
            this.measurementRounds = parseInt(e.target.value);
        });
        
        // Measurement buttons
        document.getElementById('singleMeasurement').addEventListener('click', () => {
            this.performSingleMeasurement();
        });
        
        document.getElementById('voltageSeep').addEventListener('click', () => {
            this.performVoltageSweep();
        });
        
        document.getElementById('clearData').addEventListener('click', () => {
            this.clearAllData();
        });
        
        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });
    }
    
    selectMaterial(index) {
        this.currentMaterial = this.materials[index];
        document.getElementById('materialInfo').textContent = 
            `${this.currentMaterial.symbol} (φ = ${this.currentMaterial.workFunction} eV)`;
        document.getElementById('workFunction').textContent = 
            this.currentMaterial.workFunction.toFixed(2);
        this.updatePhysicsParameters();
    }
    
    updateWavelengthDisplay() {
        document.getElementById('wavelengthDisplay').textContent = this.wavelength;
        this.updatePhotonColor();
    }
    
    updateIntensityDisplay() {
        document.getElementById('intensityDisplay').textContent = this.intensity.toFixed(1);
    }
    
    updateVoltageDisplay() {
        document.getElementById('voltageDisplay').textContent = this.voltage.toFixed(2);
    }
    
    updatePhotonColor() {
        const beam = document.getElementById('photonBeam');
        beam.className = 'photon-beam';
        
        if (this.wavelength < 380) {
            beam.classList.add('uv');
        } else if (this.wavelength < 450) {
            beam.classList.add('blue');
        } else if (this.wavelength < 550) {
            beam.classList.add('green');
        } else if (this.wavelength < 590) {
            beam.classList.add('yellow');
        } else if (this.wavelength < 700) {
            beam.classList.add('red');
        } else {
            beam.classList.add('infrared');
        }
    }
    
    updatePhysicsParameters() {
        if (!this.currentMaterial) return;
        
        // Calculate photon energy: E = hc/λ
        const photonEnergy = (this.constants.hc * 1e9) / this.wavelength; // Convert nm to m
        document.getElementById('photonEnergy').textContent = photonEnergy.toFixed(3);
        
        // Calculate maximum kinetic energy: KEmax = hf - φ
        const maxKE = Math.max(0, photonEnergy - this.currentMaterial.workFunction);
        document.getElementById('maxKineticEnergy').textContent = maxKE.toFixed(3);
        
        // Calculate stopping potential: V₀ = KEmax/e
        const stoppingPotential = maxKE; // Already in eV, so V₀ = KE/e = KE (in eV)
        document.getElementById('stoppingPotential').textContent = stoppingPotential.toFixed(3);
        
        // Update electron flow visibility
        const electronFlow = document.getElementById('electronFlow');
        if (photonEnergy > this.currentMaterial.workFunction) {
            electronFlow.classList.add('active');
        } else {
            electronFlow.classList.remove('active');
        }
    }
    
    updateVisualEffects() {
        this.updatePhotonColor();
        this.updatePhysicsParameters();
    }
    
    // High-precision photoelectric current calculation
    calculatePhotocurrent(voltage, addNoise = true) {
        if (!this.currentMaterial) return 0;
        
        const photonEnergy = (this.constants.hc * 1e9) / this.wavelength;
        const workFunction = this.currentMaterial.workFunction;
        
        // No emission if photon energy < work function
        if (photonEnergy <= workFunction) return 0;
        
        const maxKE = photonEnergy - workFunction;
        const stoppingPotential = maxKE;
        
        // Current vs voltage relationship for photoelectric effect
        let current = 0;
        
        if (voltage > -stoppingPotential) {
            // Saturation current proportional to intensity and quantum efficiency
            const saturationCurrent = this.intensity * 0.1; // nA per μW/cm²
            
            // Current increases linearly from stopping potential to saturation
            const normalizedVoltage = (voltage + stoppingPotential) / (stoppingPotential + 2);
            current = saturationCurrent * Math.min(1, Math.max(0, normalizedVoltage));
        }
        
        // Add realistic noise if requested
        if (addNoise) {
            const noise = (Math.random() - 0.5) * 2 * this.noiseLevel * Math.max(0.01, current);
            current += noise;
            current = Math.max(0, current); // Current cannot be negative
        }
        
        return current;
    }
    
    // Perform multiple measurements for statistical analysis
    async performMultipleMeasurements(voltage) {
        const measurements = [];
        
        for (let i = 0; i < this.measurementRounds; i++) {
            const current = this.calculatePhotocurrent(voltage, true);
            measurements.push(current);
            
            // Small delay to simulate measurement time
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        return this.calculateStatistics(measurements);
    }
    
    calculateStatistics(measurements) {
        const n = measurements.length;
        const mean = measurements.reduce((sum, val) => sum + val, 0) / n;
        
        const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
        const stdDev = Math.sqrt(variance);
        const standardError = stdDev / Math.sqrt(n);
        
        return {
            mean: mean,
            stdDev: stdDev,
            standardError: standardError,
            measurements: measurements,
            count: n
        };
    }
    
    async performSingleMeasurement() {
        if (!this.currentMaterial) {
            alert('Please select a material first');
            return;
        }
        
        const button = document.getElementById('singleMeasurement');
        button.disabled = true;
        button.textContent = 'Measuring...';
        
        try {
            const stats = await this.performMultipleMeasurements(this.voltage);
            
            // Update displays
            document.getElementById('currentDisplay').textContent = stats.mean.toFixed(6);
            document.getElementById('errorDisplay').textContent = stats.standardError.toFixed(6);
            
            // Add to experimental data
            this.experimentalData.push({
                voltage: this.voltage,
                current: stats.mean,
                error: stats.standardError,
                wavelength: this.wavelength,
                material: this.currentMaterial.name,
                intensity: this.intensity,
                timestamp: new Date().toISOString(),
                rawMeasurements: stats.measurements
            });
            
            this.updatePlot();
            this.updateStatistics();
            
        } finally {
            button.disabled = false;
            button.textContent = 'Single Measurement';
        }
    }
    
    async performVoltageSweep() {
        if (!this.currentMaterial) {
            alert('Please select a material first');
            return;
        }
        
        const button = document.getElementById('voltageSeep');
        button.disabled = true;
        button.textContent = 'Sweeping...';
        
        const progressIndicator = document.getElementById('progressIndicator');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressIndicator.classList.remove('hidden');
        
        try {
            const voltageRange = { min: -3, max: 2, step: 0.1 };
            const voltages = [];
            
            for (let v = voltageRange.min; v <= voltageRange.max; v += voltageRange.step) {
                voltages.push(Math.round(v * 10) / 10); // Round to avoid floating point errors
            }
            
            const sweepData = [];
            
            for (let i = 0; i < voltages.length; i++) {
                const voltage = voltages[i];
                const progress = ((i + 1) / voltages.length) * 100;
                
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `Measuring ${voltage.toFixed(1)}V... (${i + 1}/${voltages.length})`;
                
                const stats = await this.performMultipleMeasurements(voltage);
                
                sweepData.push({
                    voltage: voltage,
                    current: stats.mean,
                    error: stats.standardError,
                    wavelength: this.wavelength,
                    material: this.currentMaterial.name,
                    intensity: this.intensity,
                    timestamp: new Date().toISOString(),
                    rawMeasurements: stats.measurements
                });
            }
            
            // Add sweep data to experimental data
            this.experimentalData = this.experimentalData.concat(sweepData);
            
            this.updatePlot();
            this.updateStatistics();
            
        } finally {
            progressIndicator.classList.add('hidden');
            button.disabled = false;
            button.textContent = 'Voltage Sweep';
        }
    }
    
    initializePlot() {
        const layout = {
            title: {
                text: 'I-V Characteristic Curve',
                font: { size: 16, color: '#21808D' }
            },
            xaxis: {
                title: 'Applied Voltage (V)',
                gridcolor: '#5E5240',
                gridwidth: 1,
                zeroline: true,
                zerolinecolor: '#5E5240',
                zerolinewidth: 2
            },
            yaxis: {
                title: 'Photocurrent (nA)',
                gridcolor: '#5E5240',
                gridwidth: 1,
                zeroline: true,
                zerolinecolor: '#5E5240',
                zerolinewidth: 2
            },
            plot_bgcolor: 'rgba(255, 255, 253, 0.9)',
            paper_bgcolor: 'rgba(255, 255, 253, 1)',
            font: { family: 'FKGroteskNeue, Inter, sans-serif', size: 12 },
            margin: { l: 60, r: 20, t: 50, b: 50 },
            showlegend: true,
            legend: {
                x: 0.7,
                y: 0.9,
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                bordercolor: '#5E5240',
                borderwidth: 1
            }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
            displaylogo: false
        };
        
        Plotly.newPlot('plotContainer', [], layout, config);
    }
    
    updatePlot() {
        if (this.experimentalData.length === 0) return;
        
        // Group data by material and wavelength for different series
        const groupedData = {};
        
        this.experimentalData.forEach(point => {
            const key = `${point.material}_${point.wavelength}nm`;
            if (!groupedData[key]) {
                groupedData[key] = {
                    voltages: [],
                    currents: [],
                    errors: [],
                    material: point.material,
                    wavelength: point.wavelength
                };
            }
            groupedData[key].voltages.push(point.voltage);
            groupedData[key].currents.push(point.current);
            groupedData[key].errors.push(point.error);
        });
        
        // Create traces for each group
        const traces = [];
        const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C'];
        let colorIndex = 0;
        
        Object.keys(groupedData).forEach(key => {
            const data = groupedData[key];
            const color = colors[colorIndex % colors.length];
            
            // Main data trace with error bars
            traces.push({
                x: data.voltages,
                y: data.currents,
                error_y: {
                    type: 'data',
                    array: data.errors,
                    visible: true,
                    color: color,
                    thickness: 1.5,
                    width: 3
                },
                mode: 'markers+lines',
                type: 'scatter',
                name: `${data.material} (${data.wavelength}nm)`,
                marker: {
                    color: color,
                    size: 6,
                    line: { color: 'white', width: 1 }
                },
                line: {
                    color: color,
                    width: 2
                }
            });
            
            colorIndex++;
        });
        
        Plotly.react('plotContainer', traces);
    }
    
    updateStatistics() {
        document.getElementById('dataPointsCount').textContent = this.experimentalData.length;
        
        if (this.experimentalData.length > 1) {
            // Calculate threshold voltage (where current becomes significant)
            const sortedData = [...this.experimentalData].sort((a, b) => a.voltage - b.voltage);
            const threshold = sortedData.find(point => point.current > 0.01);
            
            if (threshold) {
                document.getElementById('thresholdVoltage').textContent = `${threshold.voltage.toFixed(3)} V`;
            }
            
            // Calculate correlation coefficient for latest series
            if (sortedData.length > 2) {
                const voltages = sortedData.map(p => p.voltage);
                const currents = sortedData.map(p => p.current);
                const correlation = this.calculateCorrelation(voltages, currents);
                document.getElementById('correlation').textContent = correlation.toFixed(4);
            }
        }
        
        document.getElementById('noiseLevel').textContent = this.noiseLevel.toFixed(3);
    }
    
    calculateCorrelation(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
    }
    
    clearAllData() {
        this.experimentalData = [];
        this.plotData = [];
        
        // Reset displays
        document.getElementById('currentDisplay').textContent = '0.000000';
        document.getElementById('errorDisplay').textContent = '0.000000';
        document.getElementById('dataPointsCount').textContent = '0';
        document.getElementById('thresholdVoltage').textContent = 'N/A';
        document.getElementById('correlation').textContent = 'N/A';
        
        // Clear plot
        Plotly.react('plotContainer', []);
    }
    
    exportData() {
        if (this.experimentalData.length === 0) {
            alert('No data to export');
            return;
        }
        
        // Create CSV content with high precision
        let csvContent = 'Timestamp,Material,Work_Function_eV,Wavelength_nm,Photon_Energy_eV,Intensity_uW_per_cm2,Applied_Voltage_V,Photocurrent_nA,Standard_Error_nA,Measurement_Rounds,Raw_Measurements\n';
        
        this.experimentalData.forEach(point => {
            const photonEnergy = (this.constants.hc * 1e9) / point.wavelength;
            const workFunction = this.materials.find(m => m.name === point.material).workFunction;
            const rawMeasurements = point.rawMeasurements.map(m => m.toFixed(8)).join(';');
            
            csvContent += [
                point.timestamp,
                `"${point.material}"`,
                workFunction.toFixed(6),
                point.wavelength.toFixed(1),
                photonEnergy.toFixed(8),
                point.intensity.toFixed(3),
                point.voltage.toFixed(6),
                point.current.toFixed(8),
                point.error.toFixed(8),
                this.measurementRounds,
                `"${rawMeasurements}"`
            ].join(',') + '\n';
        });
        
        // Add metadata
        csvContent += '\n# Metadata\n';
        csvContent += `# Export Date: ${new Date().toISOString()}\n`;
        csvContent += `# Physics Constants Used:\n`;
        csvContent += `# Planck constant: ${this.constants.h} eV·s\n`;
        csvContent += `# Speed of light: ${this.constants.c} m/s\n`;
        csvContent += `# Elementary charge: ${this.constants.e} C\n`;
        csvContent += `# hc product: ${this.constants.hc} eV·m\n`;
        csvContent += `# Noise level: ${this.noiseLevel}\n`;
        
        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `photoelectric_data_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.simulator = new PhotoelectricSimulator();
});

// Utility functions for enhanced functionality
function formatScientific(value, precision = 3) {
    if (value === 0) return '0';
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exponent);
    return `${mantissa.toFixed(precision)}×10^${exponent}`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}