import os
import zipfile
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nucleus.packager")

def zip_project():
    # Resolve the Backend root directory (parent of the scripts/ folder)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    zip_name = "nucleus_submission.zip"
    zip_path = os.path.join(base_dir, zip_name)
    
    exclude_dirs = {".git", "venv", ".pytest_cache", "__pycache__", "cache", "scratch", "scripts"}
    exclude_files = {".env", zip_name}
    
    logger.info(f"Creating submission package archive at: {zip_path}...")
    
    count = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(base_dir):
            # Modify dirs in-place to prune excluded directories from search recursion
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith("__pycache__")]
            
            for file in files:
                # Exclude environment configuration and logging/document files
                if file in exclude_files:
                    continue
                if file.endswith('.log') or file.endswith('.pdf') or file.endswith('.pyc'):
                    continue
                    
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, base_dir)
                zipf.write(file_path, arcname)
                logger.info(f"  + Included: {arcname}")
                count += 1
                
    logger.info(f"SUCCESS: Package created with {count} files. Excluded .env, venv, and cache folders.")

if __name__ == "__main__":
    zip_project()
