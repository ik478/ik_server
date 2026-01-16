from flask import Flask, render_template
from flask_socketio import SocketIO
import subprocess

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/ssh')
def ssh():
    return render_template('ssh.html')

@app.route('/desktop')
def desktop():
    return render_template('desktop.html')

@socketio.on('command')
def handle_command(cmd):
    try:
        output = subprocess.check_output(
            cmd, shell=True, stderr=subprocess.STDOUT
        ).decode()
    except subprocess.CalledProcessError as e:
        output = e.output.decode()

    socketio.emit('output', output)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
