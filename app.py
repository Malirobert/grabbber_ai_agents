from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
from src.crew import process_video_request, download_with_ytdlp
import os
import logging
import yt_dlp
from pathlib import Path
import time

# Configuration des logs
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["chrome-extension://*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Define downloads directory path
DOWNLOADS_DIR = Path('downloads')

@app.route('/')
def index():
    logger.info("Page d'accueil chargée")
    return render_template('index.html')

@app.route('/process_video', methods=['POST', 'OPTIONS'])
def process_video():
    if request.method == 'OPTIONS':
        return '', 204
        
    logger.info("Nouvelle requête de recherche reçue")
    try:
        data = request.json
        description = data.get('description')
        logger.info(f"Description reçue: {description}")
        
        if not description:
            logger.error("Pas de description fournie")
            return jsonify({'success': False, 'error': 'No description provided'})
        
        result = process_video_request(description)
        logger.info(f"Résultat de la recherche: {result}")
        
        if result and result.get('url'):
            return jsonify({
                'success': True,
                'url': result['url'],
                'title': result['title'],
                'channel': result['channel'],
                'thumbnail': result['thumbnail']
            })
        else:
            logger.error("Aucune vidéo trouvée")
            return jsonify({'success': False, 'error': 'No video found'})

    except Exception as e:
        logger.exception("Erreur lors du traitement de la requête")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/download', methods=['POST', 'OPTIONS'])
def download_video():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.get_json()
        url = data.get('url')
        if not url:
            return jsonify({'success': False, 'error': 'URL is required'}), 400

        # Create downloads directory if it doesn't exist
        DOWNLOADS_DIR.mkdir(exist_ok=True)

        # Clean up partial downloads
        for file in DOWNLOADS_DIR.glob('*'):
            if file.suffix in ['.part', '.ytdl']:
                try:
                    file.unlink()
                except:
                    pass

        # Utiliser le timestamp comme identifiant unique
        download_timestamp = str(int(time.time()))
        
        # Use the robust download_with_ytdlp function
        success = download_with_ytdlp(url)
        if not success:
            return jsonify({'success': False, 'error': 'Download failed'}), 500

        # Find the most recent file in the downloads directory
        files = [(f, f.stat().st_ctime) 
                for f in DOWNLOADS_DIR.iterdir() 
                if f.is_file() 
                and f.suffix not in ['.part', '.ytdl']]
        
        if not files:
            return jsonify({'success': False, 'error': 'No file found after download'}), 500
            
        # Sort by creation time and take the most recent
        latest_file = max(files, key=lambda x: x[1])[0]
        
        return jsonify({'success': True, 'filename': latest_file.name})
    except Exception as e:
        logger.error(f"Erreur lors du téléchargement: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    response = send_from_directory(DOWNLOADS_DIR, filename, as_attachment=True)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

if __name__ == '__main__':
    print("=== DÉMARRAGE DU SERVEUR ===")
    # Create downloads directory if it doesn't exist
    DOWNLOADS_DIR.mkdir(exist_ok=True)
    app.run(debug=True, use_reloader=True, host='0.0.0.0', port=5000)