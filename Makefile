.PHONY: install data train evaluate test run-backend run-frontend docker-up docker-down

install:
	pip install -r requirements.txt
	cd frontend && npm install

data:
	python src/data/generate_data.py --records 50000

train:
	python src/train.py

evaluate:
	python src/evaluate.py

test:
	python -m pytest tests/

run-backend:
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

run-frontend:
	cd frontend && npm run dev

docker-up:
	docker compose up --build

docker-down:
	docker compose down
