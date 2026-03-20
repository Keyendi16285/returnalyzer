FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the code
COPY . .

# # Ensure permissions are correct (optional but helpful)
# RUN chmod -R 755 /app/static

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]