// Este es un stub para html5-qrcode
// En producción, se debería usar la biblioteca real de: https://github.com/mebjas/html5-qrcode
// Por ahora implementaremos una versión simplificada para desarrollo

class Html5Qrcode {
    constructor(elementId) {
        this.elementId = elementId;
        this.onScanSuccess = null;
        this.stream = null;
        this.scanning = false;
        console.log('Html5Qrcode inicializado para:', elementId);
    }
    
    async start(config, videoConstraints, onScanSuccess) {
        try {
            this.onScanSuccess = onScanSuccess;
            const videoElement = document.getElementById(this.elementId);
            
            if (!videoElement) {
                throw new Error(`Elemento con ID ${this.elementId} no encontrado`);
            }
            
            // Solicitar acceso a la cámara
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: config.facingMode || 'environment',
                    ...videoConstraints
                }
            });
            
            // Conectar stream al elemento video
            videoElement.srcObject = this.stream;
            videoElement.play();
            
            this.scanning = true;
            console.log('Cámara iniciada correctamente');
            
            // En modo desarrollo, simulamos escaneo
            this.simulateScanning();
            
        } catch (error) {
            console.error('Error iniciando cámara:', error);
            throw error;
        }
    }
    
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        const videoElement = document.getElementById(this.elementId);
        if (videoElement) {
            videoElement.srcObject = null;
        }
        
        this.scanning = false;
        console.log('Cámara detenida');
    }
    
    simulateScanning() {
        // En desarrollo, simulamos que se está escaneando
        // En producción, esto sería el procesamiento real de video
        if (!this.scanning) return;
        
        // Simular detección periódica (solo para desarrollo)
        setTimeout(() => {
            if (this.scanning && this.onScanSuccess) {
                // En desarrollo, usamos códigos de prueba
                const testBarcodes = [
                    '3017620422003',  // Nutella
                    '8715700155101',  // Coca-Cola
                    '5449000000996',  // Evian
                    '8410076442949',  // Aceite de oliva
                    '7613032629994'   // Nesquik
                ];
                
                // Simular escaneo aleatorio (1 de cada 3 intentos)
                if (Math.random() > 0.7) {
                    const randomBarcode = testBarcodes[Math.floor(Math.random() * testBarcodes.length)];
                    console.log('Simulando escaneo de código:', randomBarcode);
                    this.onScanSuccess(randomBarcode);
                }
                
                // Continuar simulación
                this.simulateScanning();
            }
        }, 1000);
    }
}

// Exportar globalmente
window.Html5Qrcode = Html5Qrcode;