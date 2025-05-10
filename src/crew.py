from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import requests
import os
from pathlib import Path
import yt_dlp
import json
from bs4 import BeautifulSoup
import urllib.parse
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

def rewrite_description(description: str) -> str:
    """Réécrit la description pour optimiser la recherche"""
    try:
        llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.7)
        prompt = f"""
        Réécris cette description de vidéo YouTube pour optimiser la recherche.
        La description : {description}
        
        Tu dois retourner UNIQUEMENT le titre réécrit, sans autre texte.
        Format: [titre exact] [artiste] official music video
        
        Par exemple:
        Input: "je veux la video de drake gods plan"
        Output: Drake - God's Plan Official Music Video
        """
        response = llm.invoke(prompt)
        optimized = response.content.strip()
        print(f"Description optimisée: {optimized}")
        return optimized
    except Exception as e:
        print(f"Erreur lors de la réécriture: {e}")
        return description

class YouTubeSearchTool:
    """Outil de recherche YouTube simplifié"""
    def search(self, query: str) -> str:
        try:
            # Encoder la requête pour l'URL
            search_query = urllib.parse.quote(query)
            
            # Faire une requête à YouTube
            url = f"https://www.youtube.com/results?search_query={search_query}"
            response = requests.get(url)
            
            # Parser la page
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Chercher les données de la vidéo dans le script
            for script in soup.find_all('script'):
                if 'var ytInitialData = ' in str(script):
                    data = str(script).split('var ytInitialData = ')[1].split(';</script>')[0]
                    json_data = json.loads(data)
                    
                    # Extraire les informations de la première vidéo
                    videos = json_data['contents']['twoColumnSearchResultsRenderer']['primaryContents']['sectionListRenderer']['contents'][0]['itemSectionRenderer']['contents']
                    
                    for video in videos:
                        if 'videoRenderer' in video:
                            video_data = video['videoRenderer']
                            video_id = video_data['videoId']
                            title = video_data['title']['runs'][0]['text']
                            channel = video_data['ownerText']['runs'][0]['text']
                            thumbnail = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
                            url = f"https://www.youtube.com/watch?v={video_id}"
                            
                            return {
                                'url': url,
                                'title': title,
                                'channel': channel,
                                'thumbnail': thumbnail
                            }
                    
            return None
            
        except Exception as e:
            print(f"Erreur dans YouTubeSearchTool: {e}")
            return None

def process_video_request(description: str):
    try:
        # 1. Optimiser la description pour la recherche
        optimized_description = rewrite_description(description)
        print(f"Description optimisée: {optimized_description}")

        # 2. Rechercher la vidéo
        youtube_tool = YouTubeSearchTool()
        video_info = youtube_tool.search(optimized_description)
        
        if not video_info:
            print("Aucune vidéo trouvée")
            return None

        # Affichage dans le terminal
        print("\n=== Résultat de la recherche ===")
        print(f"Titre    : {video_info['title']}")
        print(f"Chaîne   : {video_info['channel']}")
        print(f"URL      : {video_info['url']}")
        print(f"Miniature: {video_info['thumbnail']}")
        print("===============================\n")

        return video_info

    except Exception as e:
        print(f"Erreur dans process_video_request: {e}")
        return None

def download_with_ytdlp(url: str) -> bool:
    """Télécharge une vidéo YouTube"""
    # Use pathlib for cross-platform path handling
    output_path = Path("downloads")
    print("\n=== DÉBUT DU TÉLÉCHARGEMENT ===")
    print(f"URL à télécharger: {url}")

    # Create downloads directory if it doesn't exist
    output_path.mkdir(exist_ok=True)

    def download_hook(d):
        if d['status'] == 'downloading':
            try:
                percent = d.get('_percent_str', 'N/A')
                speed = d.get('_speed_str', 'N/A')
                print(f"\rTéléchargement : {percent} | Vitesse : {speed}", end='', flush=True)
            except:
                print(f"\rTéléchargement en cours...", end='', flush=True)
        elif d['status'] == 'finished':
            print("\nTéléchargement terminé!")

    # Configuration with options for forcing new download
    ydl_opts = {
        'format': 'bestvideo+bestaudio/best',
        'outtmpl': str(output_path / '%(title)s.%(ext)s'),  # Use pathlib for path joining
        'progress_hooks': [download_hook],
        'merge_output_format': 'mp4',
        'quiet': False,
        'no_warnings': True,
        'ignoreerrors': True,
        'nooverwrites': True,  # Don't overwrite existing files
        'writethumbnail': False,
        'writeinfojson': False,
    }

    try:
        print(f"\nDémarrage du téléchargement...")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            clean_url = url.strip('"').strip()
            # Get video info first
            video_info = ydl.extract_info(clean_url, download=False)
            # Build expected filename
            expected_filename = Path(ydl.prepare_filename(video_info))
            
            # If file exists, delete it
            if expected_filename.exists():
                expected_filename.unlink()
                
            # Now download the video
            ydl.download([clean_url])
            print("\nTéléchargement réussi!")
            return True
            
    except Exception as e:
        print(f"\nErreur lors du téléchargement : {str(e)}")
        return False