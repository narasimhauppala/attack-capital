from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import torchaudio
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2Processor
import numpy as np
import base64
import io
import logging
from typing import Optional
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AMD ML Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variables
model = None
processor = None
device = None

class AudioRequest(BaseModel):
    audio: str  # Base64 encoded audio
    sample_rate: int = 8000

class PredictionResponse(BaseModel):
    label: str
    confidence: float
    human_probability: float
    machine_probability: float

def load_model():
    """Load the wav2vec2 model for AMD"""
    global model, processor, device
    
    try:
        logger.info("Loading wav2vec2 model...")
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {device}")
        
        # Use a pre-trained wav2vec2 model
        # In production, you'd fine-tune this on AMD-specific data
        model_name = "facebook/wav2vec2-base"
        
        processor = Wav2Vec2Processor.from_pretrained(model_name)
        
        # For this demo, we'll use a simple binary classification
        # In production, you'd load a model fine-tuned on human vs machine audio
        model = Wav2Vec2ForSequenceClassification.from_pretrained(
            model_name,
            num_labels=2,  # human vs machine
            ignore_mismatched_sizes=True
        )
        
        model.to(device)
        model.eval()
        
        logger.info("Model loaded successfully!")
        return True
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return False

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    success = load_model()
    if not success:
        logger.error("Failed to load model on startup")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "AMD ML Service",
        "model_loaded": model is not None,
        "device": str(device) if device else "unknown"
    }

@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy" if model is not None else "unhealthy",
        "model_loaded": model is not None,
        "processor_loaded": processor is not None,
        "device": str(device) if device else "unknown",
        "cuda_available": torch.cuda.is_available()
    }

def process_audio(audio_data: bytes, sample_rate: int = 8000) -> PredictionResponse:
    """Process audio and return AMD prediction"""
    try:
        # Convert bytes to tensor
        audio_io = io.BytesIO(audio_data)
        waveform, sr = torchaudio.load(audio_io)
        
        # Resample if necessary
        if sr != 16000:
            resampler = torchaudio.transforms.Resample(sr, 16000)
            waveform = resampler(waveform)
        
        # Convert to mono if stereo
        if waveform.shape[0] > 1:
            waveform = torch.mean(waveform, dim=0, keepdim=True)
        
        # Process audio
        inputs = processor(
            waveform.squeeze().numpy(),
            sampling_rate=16000,
            return_tensors="pt",
            padding=True
        )
        
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Get prediction
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=-1)
            
            human_prob = probabilities[0][0].item()
            machine_prob = probabilities[0][1].item()
            
            # Determine label based on higher probability
            label = "human" if human_prob > machine_prob else "machine"
            confidence = max(human_prob, machine_prob)
            
            # Apply heuristics based on audio features
            # In production, you'd have more sophisticated logic
            audio_length = waveform.shape[1] / 16000  # seconds
            
            # Short audio (< 1s) is likely human
            if audio_length < 1.0 and human_prob > 0.3:
                label = "human"
                confidence = max(confidence, 0.75)
            
            # Very long audio (> 5s) is likely machine
            elif audio_length > 5.0 and machine_prob > 0.3:
                label = "machine"
                confidence = max(confidence, 0.75)
            
            logger.info(f"Prediction: {label} (confidence: {confidence:.2f})")
            
            return PredictionResponse(
                label=label,
                confidence=confidence,
                human_probability=human_prob,
                machine_probability=machine_prob
            )
            
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        raise HTTPException(status_code=500, detail=f"Audio processing error: {str(e)}")

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: AudioRequest):
    """
    Predict if audio is human or machine
    
    Args:
        request: AudioRequest with base64 encoded audio
        
    Returns:
        PredictionResponse with label and confidence
    """
    if model is None or processor is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Decode base64 audio
        audio_data = base64.b64decode(request.audio)
        
        # Process and predict
        result = process_audio(audio_data, request.sample_rate)
        
        return result
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time audio streaming from Twilio Media Streams
    """
    await websocket.accept()
    logger.info("WebSocket connection established")
    
    audio_buffer = []
    sample_rate = 8000
    retry_count = 0
    max_retries = 2
    
    try:
        while True:
            data = await websocket.receive_text()
            message = eval(data)  # Parse Twilio Media Stream message
            
            if message.get("event") == "start":
                logger.info(f"Stream started: {message.get('start')}")
                sample_rate = message.get("start", {}).get("mediaFormat", {}).get("sampleRate", 8000)
                
            elif message.get("event") == "media":
                # Twilio sends audio as base64 encoded mulaw
                payload = message.get("media", {}).get("payload", "")
                
                if payload:
                    # Decode and buffer audio
                    audio_chunk = base64.b64decode(payload)
                    audio_buffer.append(audio_chunk)
                    
                    # Process every 3 seconds of audio (or when buffer is large enough)
                    buffer_size = sum(len(chunk) for chunk in audio_buffer)
                    if buffer_size >= sample_rate * 3:  # 3 seconds
                        try:
                            # Combine buffer
                            combined_audio = b''.join(audio_buffer)
                            
                            # Process and predict
                            result = process_audio(combined_audio, sample_rate)
                            
                            # Send prediction back
                            await websocket.send_json({
                                "event": "prediction",
                                "label": result.label,
                                "confidence": result.confidence,
                                "human_probability": result.human_probability,
                                "machine_probability": result.machine_probability
                            })
                            
                            # If confident, we can stop
                            if result.confidence > 0.7:
                                logger.info(f"Confident prediction: {result.label} ({result.confidence:.2f})")
                                
                                # Retry logic for low confidence
                                if result.confidence < 0.7 and retry_count < max_retries:
                                    retry_count += 1
                                    logger.info(f"Low confidence, retry {retry_count}/{max_retries}")
                                    audio_buffer = []  # Clear buffer and continue
                                else:
                                    await websocket.send_json({
                                        "event": "final",
                                        "label": result.label,
                                        "confidence": result.confidence
                                    })
                                    break
                            
                            # Clear buffer
                            audio_buffer = []
                            
                        except Exception as e:
                            logger.error(f"Processing error: {e}")
                            # Continue buffering
                            
            elif message.get("event") == "stop":
                logger.info("Stream stopped")
                break
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket.close()
        logger.info("WebSocket connection closed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
