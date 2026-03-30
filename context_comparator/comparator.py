import os
from google import genai
import numpy as np

def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    return f'{(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))):.2f}'


def compare_texts(text1, text2):
    
    key_path = os.path.join(os.path.dirname(__file__), 'api_key.txt')
    with open(key_path, 'r') as f:
        api_key = f.read().strip()

    # Configure API
    client = genai.Client(api_key=api_key)

    # Generate embeddings
    emb1 = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text1
    ).embeddings[0]

    emb2 = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text2
    ).embeddings[0]

    similarity = cosine_similarity(emb1.values, emb2.values)

    print("Similarity score:", similarity)

compare_texts("I love you", "love you")