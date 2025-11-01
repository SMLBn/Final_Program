IntelliGrade Backend - FastAPI (Logistic Regression)
-----------------------------------------------------

Files:
- main.py : FastAPI app with endpoints (/students, /student/{id}, /predict/{id}, /stats, /train)
- intelligrade_dataset_1000.csv : Synthetic dataset (1000 rows)
- train_model.py : Script to train the logistic regression model offline
- requirements.txt : Python dependencies

Quick run:
1. Create venv and activate.
2. pip install -r requirements.txt
3. (Optional) python train_model.py  # creates model.joblib
4. uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Endpoints:
GET /students
GET /student/<built-in function id>
GET /stats
GET /predict/<built-in function id>
POST /train  # trains logistic regression and saves model.joblib

CORS is enabled to allow easy frontend integration.
