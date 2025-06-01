class RambleApp {
    constructor() {
        this.recordBtn = document.getElementById('recordBtn');
        this.status = document.getElementById('status');
        this.output = document.getElementById('output');
        this.outputText = document.getElementById('outputText');
        
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        this.init();
    }
    
    init() {
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.status.textContent = 'click to start recording';
    }
    
    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                this.processAudio();
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            this.recordBtn.classList.add('recording');
            this.status.textContent = 'recording... click to stop';
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.status.textContent = 'microphone access denied';
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            
            this.recordBtn.classList.remove('recording');
            this.recordBtn.classList.add('processing');
            this.status.textContent = 'processing...';
        }
    }
    
    async processAudio() {
        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            
            const response = await fetch('http://localhost:3000/api/process', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            this.displayResult(result.coherentText);
            
        } catch (error) {
            console.error('Error processing audio:', error);
            this.status.textContent = 'error processing audio. try again.';
        } finally {
            this.recordBtn.classList.remove('processing');
            this.status.textContent = 'click to start recording';
        }
    }
    
    displayResult(text) {
        this.outputText.textContent = text;
        this.output.style.display = 'block';
        this.output.scrollIntoView({ behavior: 'smooth' });
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RambleApp();
});