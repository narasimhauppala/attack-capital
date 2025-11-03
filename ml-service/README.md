# ML Service# AMD ML Service - Wav2Vec2



FastAPI service for audio-based AMD using wav2vec2 model.FastAPI service for Answering Machine Detection using wav2vec2 model.



## Note## Setup



This service has WebSocket connection issues when used with Twilio Media Streams through tunneling services (ngrok/cloudflare). The code is correct but infrastructure limitations prevent it from working in the current setup.### Local Development



## Local Testing1. **Create virtual environment:**

   ```bash

```bash   python -m venv venv

cd ml-service   source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt   ```

python app.py

```2. **Install dependencies:**

   ```bash

Service runs on http://localhost:8000   pip install -r requirements.txt

   ```

The service is included in docker-compose.yml and starts automatically with the main app.

3. **Run the service:**
   ```bash
   python app.py
   # Or with uvicorn:
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Test the service:**
   ```bash
   curl http://localhost:8000/health
   ```

### Docker Deployment

1. **Build the image:**
   ```bash
   docker build -t amd-ml-service .
   ```

2. **Run the container:**
   ```bash
   docker run -p 8000:8000 amd-ml-service
   ```

### Docker Compose (Recommended)

Add to your main `docker-compose.yml`:

```yaml
  ml-service:
    build: ./ml-service
    ports:
      - "8000:8000"
    environment:
      - MODEL_NAME=facebook/wav2vec2-base
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## API Endpoints

### GET `/`
Health check - returns service status

### GET `/health`
Detailed health check with model status

### POST `/predict`
Predict if audio is human or machine

**Request:**
```json
{
  "audio": "base64_encoded_audio_data",
  "sample_rate": 8000
}
```

**Response:**
```json
{
  "label": "human",
  "confidence": 0.85,
  "human_probability": 0.85,
  "machine_probability": 0.15
}
```

### WebSocket `/ws/stream`
Real-time audio streaming for Twilio Media Streams

**Events:**
- `start`: Stream initialization
- `media`: Audio chunks (base64 encoded mulaw)
- `prediction`: Interim prediction
- `final`: Final prediction when confident
- `stop`: Stream ended

## Model Information

- **Base Model**: `facebook/wav2vec2-base`
- **Task**: Binary classification (human vs machine)
- **Input**: Audio at 16kHz (automatically resampled)
- **Output**: Probability distribution over [human, machine]

## Production Considerations

1. **Fine-tuning**: The current model uses a pre-trained wav2vec2. For better accuracy, fine-tune on AMD-specific dataset.

2. **Model Optimization**: Consider using ONNX or TensorRT for faster inference.

3. **Retry Logic**: Implements up to 2 retries for low-confidence predictions.

4. **Timeout**: 3-second audio chunks for analysis to maintain <3s latency requirement.

## Environment Variables

- `MODEL_NAME`: HuggingFace model name (default: facebook/wav2vec2-base)
- `DEVICE`: Force CPU or GPU (auto-detected by default)
- `MAX_RETRIES`: Maximum retry attempts for low confidence (default: 2)

## Testing

Test with curl:

```bash
# Health check
curl http://localhost:8000/health

# Predict (with base64 audio)
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"audio": "your_base64_audio", "sample_rate": 8000}'
```

## Integration with Next.js App

The Next.js app will:
1. Receive call from Twilio
2. Connect to this ML service via WebSocket (`/ws/stream`)
3. Stream audio from Twilio Media Streams to ML service
4. Receive real-time predictions
5. Return result to Twilio and update database

See `lib/amd/detector-factory.ts` for the HuggingFace detector implementation.
