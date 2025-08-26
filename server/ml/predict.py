# ml/predict.py
import sys
import json
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential # pyright: ignore[reportMissingImports]
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input # type: ignore
from tensorflow.keras.callbacks import EarlyStopping # type: ignore
import os

# === CONFIG ===
CSV_FILE = "/Users/rajatkumar/Desktop/dev-practice/StockTracker/server/ml/TCS.NS_technical_data.csv"
SEQ_LENGTH = 30  # days of historical data to use for next-day prediction
TEST_SPLIT = 0.2

# === STEP 1: Load CSV ===
df = pd.read_csv(CSV_FILE)

# Detect date column automatically
# (optional: parse as datetime for your own reference)
if 'Date' in df.columns:
    df['Date'] = pd.to_datetime(df['Date'])
else:
    df.rename(columns={df.columns[0]: 'Date'}, inplace=True)
    df['Date'] = pd.to_datetime(df['Date'])

df = df.sort_values('Date')

# === STEP 2: Fill missing values ===
# FutureWarning safe method:
df.ffill(inplace=True)
df.bfill(inplace=True)

# === STEP 3: Select Features & Target ===
# Assuming 'Close' is your target
target_col = 'Close'
feature_cols = [c for c in df.columns if c not in ['Date', target_col]]

features = df[feature_cols].astype(float)
target = df[[target_col]].astype(float)

# === STEP 4: Scale features and target ===
feature_scaler = MinMaxScaler()
target_scaler = MinMaxScaler()

features_scaled = feature_scaler.fit_transform(features)
target_scaled = target_scaler.fit_transform(target)

# === STEP 5: Data checks (prevent NaN loss) ===
def check_data(name, arr):
    print(f"[Check] {name} - NaNs: {np.isnan(arr).any()} / Infs: {np.isinf(arr).any()} / shape: {arr.shape}")

check_data("Features", features_scaled)
check_data("Target", target_scaled)

# === STEP 6: Create sequences for LSTM ===
def create_sequences(X, y, seq_length):
    X_seqs, y_seqs = [], []
    for i in range(len(X) - seq_length):
        X_seqs.append(X[i:i+seq_length])
        y_seqs.append(y[i+seq_length])
    return np.array(X_seqs), np.array(y_seqs)

X, y = create_sequences(features_scaled, target_scaled, SEQ_LENGTH)
print(f"X shape: {X.shape}, y shape: {y.shape}")

# === STEP 7: Train/test split ===
split_index = int(len(X) * (1 - TEST_SPLIT))
X_train, X_test = X[:split_index], X[split_index:]
y_train, y_test = y[:split_index], y[split_index:]

# === STEP 8: Build LSTM model ===
model = Sequential([
    Input(shape=(SEQ_LENGTH, X.shape[2])),
    LSTM(50, return_sequences=True),
    Dropout(0.2),
    LSTM(50),
    Dropout(0.2),
    Dense(1)
])
model.compile(optimizer='adam', loss='mean_squared_error')

# === STEP 9: Train the model with early stopping ===
early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)

history = model.fit(
    X_train, y_train,
    epochs=50,
    batch_size=32,
    validation_data=(X_test, y_test),
    callbacks=[early_stop]
)

# === STEP 10: Predict ===
pred_scaled = model.predict(X_test)
pred = target_scaler.inverse_transform(pred_scaled)
actual = target_scaler.inverse_transform(y_test)

# Show first few predictions
for i in range(5):
    print(f"Date: {df['Date'].iloc[split_index + SEQ_LENGTH + i].date()} | Actual: {actual[i][0]:.2f} | Predicted: {pred[i][0]:.2f}")

# === STEP 11: Save Model & Scalers ===
model.save("stock_lstm_model.h5")
import joblib
joblib.dump(feature_scaler, "feature_scaler.save")
joblib.dump(target_scaler, "target_scaler.save")
# Show only the first prediction

print("✅ Training complete! Model & scalers saved.")

# Read input from Node (or test manually)
data = {
    "symbol": "TCS",
    "date": "2025-08-12",
    "features": [3400, 3422.15, 58.2]  # Dummy features
}

# Simulate a prediction output
result = {
    "predicted_close": 3420.65,
    "confidence": 0.87,
    "risk": "Low"
}

# Print result as JSON
print(json.dumps(result))
