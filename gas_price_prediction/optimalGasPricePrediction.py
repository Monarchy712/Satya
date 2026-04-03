import pandas as pd
import numpy as np
import requests
import tensorflow as tf
import time
from config import ETHERSCAN_API_KEY

API_KEY = ETHERSCAN_API_KEY
BASE_URL = "https://api.etherscan.io/v2/api"

TARGET_CONFIRMATION_TIME = 20  # SLA (edit later)
INTERVAL = 5  # seconds


def gwei_to_wei(gwei):
    return int(gwei * 1e9)


# -------------------------------
# GAS ORACLE
# -------------------------------
def get_gas_oracle():
    url = f'{BASE_URL}?chainid=1&module=gastracker&action=gasoracle&apikey={API_KEY}'
    res = requests.get(url).json()["result"]

    return {
        "base_fee": float(res["suggestBaseFee"]),
        "safe": float(res["SafeGasPrice"]),
        "fast": float(res["FastGasPrice"]),
        "gas_used_ratio": list(map(float, res["gasUsedRatio"].split(",")))
    }


# -------------------------------
# CONGESTION SCORE
# -------------------------------
def compute_congestion_score(data):
    avg_util = sum(data["gas_used_ratio"]) / len(data["gas_used_ratio"])
    base_fee = data["base_fee"]

    return avg_util * (1 + base_fee / 100)


# -------------------------------
# GAS ESTIMATE
# -------------------------------
def get_confirmation_time(gas_price_wei):
    url = (
        f"{BASE_URL}"
        f"?chainid=1&module=gastracker"
        f"&action=gasestimate"
        f"&gasprice={gas_price_wei}"
        f"&apikey={API_KEY}"
    )

    res = requests.get(url).json()
    return int(res["result"])


# -------------------------------
# OPTIMIZER
# -------------------------------
def find_optimal_gas_price(min_gwei, max_gwei, target_time):
    left, right = min_gwei, max_gwei
    best = max_gwei

    for _ in range(8):  # fewer iterations for speed
        mid = (left + right) / 2
        t = get_confirmation_time(gwei_to_wei(mid))

        if t <= target_time:
            best = mid
            right = mid
        else:
            left = mid

    return best


# -------------------------------
# MAIN LOOP (runs every 10 sec)
# -------------------------------
def run_loop():
    while True:
        try:
            gas_data = get_gas_oracle()
            congestion = compute_congestion_score(gas_data)

            print("\n--- NETWORK STATE ---")
            print(f"Base Fee: {gas_data['base_fee']} Gwei")
            print(f"Congestion Score: {congestion:.3f}")

            min_gwei = gas_data["safe"]
            max_gwei = gas_data["fast"] * 2

            optimal_gwei = find_optimal_gas_price(
                min_gwei,
                max_gwei,
                TARGET_CONFIRMATION_TIME
            )

            priority_fee = optimal_gwei - gas_data["base_fee"]

            print("\n==============================")
            print(f"Congestion Score: {congestion:.3f}")
            print(f"Optimal Gas Price: {optimal_gwei:.2f} Gwei")
            print(f"Priority Fee: {priority_fee:.2f} Gwei")
            print("==============================")

        except Exception as e:
            print("Error:", e)

        # wait 10 seconds before next recalculation
        time.sleep(INTERVAL)  # simple loop approach :contentReference[oaicite:0]{index=0}


if __name__ == "__main__":
    run_loop()