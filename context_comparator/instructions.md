# Context Comparator Integration Instructions

Hello Antigravity Assistant! Your user's teammate has developed a new feature in the `context_comparator` directory to compare text similarity using Google GenAI embeddings.

Your task is to help the user deeply integrate this new feature into the larger `Satya` project.

## Step-by-Step Integration Guide:

1. **Review How It Works**:
   - Open and analyze `context_comparator/comparator.py`. 
   - The primary function is `compare_texts(text1, text2)` which uses the `gemini-embedding-001` model to calculate cosine similarity between two text strings.
   - It reads a Google API key locally from a file named `api_key.txt`.

2. **Dependency Check**:
   - The original author has already appended all the required dependencies (such as `google-genai`, `numpy`, etc.) into the main `requirements.txt` at the root of the project.
   - Make sure your user runs `pip install -r requirements.txt` before trying to run the code.

3. **API Key Management**:
   - For security, verify that `context_comparator/api_key.txt` is listed in `context_comparator/.gitignore`.
   - Ask your user to provide their own Gemini API key and save it to `context_comparator/api_key.txt` locally if it hasn't synced across source control.
   - *Optional but Recommended:* If the main application handles environment variables (like a `.env` file), feel free to refactor `comparator.py` to pull the `GEMINI_API_KEY` from the environment instead of hardcoding a local file read.

4. **Incorporate into the Main Codebase**:
   - Work with your user to find the optimal place to utilize `context_comparator.comparator.compare_texts`.
   - Examples could include integrating it into an existing FastAPI endpoint, a batch-processing script, or connecting it to the frontend's search/similarity queries.
   - You can safely import it into other components using `from context_comparator.comparator import compare_texts`.

Please proceed to assist the user efficiently and robustly!
