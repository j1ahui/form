FORM.

a full-stack web app using a flask backend, a jsx frontend. makes deductions about your personal stature then adjusts exercises unique to you and your needs.
allows for tracking of workouts, exercise frequency, pbs. cosine similarity uses this, responds to your likes, pushing recommendations out.

## What makes this project different to others?, aka important to me.

I still have more big plans coming whether its for ui or cool features, but for now, whats on the radar is implementing computer vision to 
observe and analyse your execution on a chosen exercise. (enhancing exercise performance, I hope) something I believe many beginner trainers struggle with, including me when I was a beginner.

## Prerequisites

node.js, python 3.10+, postgresql

## Setup and Moving around 

```bash
cd backend
pip3 install -r requirements.txt
cp .env.example .env      (add your secret_key)
flask run
```

```bash
cd frontend
nom install
npm run dev -- --host 127.0.0.1 (keeps frontend on same server as flask)
```
