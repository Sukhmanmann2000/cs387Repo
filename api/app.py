import time, json
from flask import Flask, request

app = Flask(__name__)

@app.route('/time')
def get_current_time():
    return {'time': time.time()}

@app.route('/help', methods=['POST'])
def get_current():
    if request.method == 'POST':
        data = json.loads(request.data)
        print(data)
        return {'time': 10}