const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for audio file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Main processing endpoint
app.post('/api/process', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        console.log('Processing audio file:', req.file.filename);

        // Step 1: Transcribe audio with Whisper
        const transcription = await transcribeAudio(req.file.path);
        console.log('Transcription:', transcription);

        // Step 2: Make text coherent with Claude
        const coherentText = await makeCoherent(transcription);
        console.log('Coherent text:', coherentText);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            originalText: transcription,
            coherentText: coherentText
        });

    } catch (error) {
        console.error('Error processing request:', error);
        
        // Clean up file if it exists
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Function to transcribe audio using OpenAI Whisper
async function transcribeAudio(audioPath) {
    try {
        const formData = new FormData();
        const audioBuffer = fs.readFileSync(audioPath);
        const audioFile = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });
        
        formData.append('file', audioFile);
        formData.append('model', 'whisper-1');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result.text;

    } catch (error) {
        console.error('Transcription error:', error);
        throw new Error('Failed to transcribe audio');
    }
}

// Function to make text coherent using OpenAI GPT
async function makeCoherent(text) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                max_tokens: 1000,
                messages: [{
                    role: 'user',
                    content: `Please take this rambling speech and make it more coherent and organized while preserving the original meaning, tone, and key ideas. Don't add new information, just restructure and clarify what's already there:\n\n"${text}"`
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result.choices[0].message.content;

    } catch (error) {
        console.error('OpenAI API error:', error);
        throw new Error('Failed to make text coherent');
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
    console.log(`Ramble server running on http://localhost:${port}`);
    console.log('Frontend available at http://localhost:3000');
});