import os
import time
import json
import mimetypes
import requests
import re
import xml.etree.ElementTree as ET
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

# =========================
# ENDPOINTS & SETTINGS
# =========================
OUTPUT_FILE = "uploaded_image_ids.txt"
MAX_WORKERS = 3

UPLOAD_URL = "https://apis.roblox.com/assets/v1/assets"
OPERATION_URL = "https://apis.roblox.com/assets/v1/"
DECAL_INFO_URL = "https://apis.roblox.com/asset-delivery-api/v1/assetId/"

VALID_EXTENSIONS = {".png", ".jpg", ".jpeg"}

# Global configuration placeholders (will be populated at runtime)
API_KEY = ""
OWNER_ID = 0
OWNER_TYPE = ""

# =========================
# POWERSHELL ENV MANAGEMENT
# =========================

def get_env_var(name):
    """Retrieves a user-level environment variable using PowerShell."""
    try:
        cmd = f"[System.Environment]::GetEnvironmentVariable('{name}', 'User')"
        result = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except Exception:
        return ""

def set_env_var(name, value):
    """Permanently saves a user-level environment variable using PowerShell."""
    try:
        cmd = f"[System.Environment]::SetEnvironmentVariable('{name}', '{value}', 'User')"
        subprocess.run(["powershell", "-Command", cmd], check=True)
    except Exception as e:
        print(f"⚠️ Failed to save environment variable {name}: {e}")

def setup_configuration():
    """Handles the interactive persistent configuration menu."""
    global API_KEY, OWNER_ID, OWNER_TYPE
    
    print("🛠️  ROBLOX BULK UPLOADER CONFIGURATION\n" + "="*40)
    
    # 1. Handle API Key
    existing_key = get_env_var("ROBLOX_API_KEY")
    if existing_key:
        masked_key = existing_key[:8] + "..." + existing_key[-4:] if len(existing_key) > 12 else "Saved Key"
        confirm = input(f"Existing API Key found ({masked_key}). Use this key? (Y/n): ").strip().lower()
        if confirm == 'n':
            API_KEY = input("Please enter your new Roblox API Key: ").strip()
            set_env_var("ROBLOX_API_KEY", API_KEY)
        else:
            API_KEY = existing_key
    else:
        API_KEY = input("Please enter your Roblox API Key: ").strip()
        set_env_var("ROBLOX_API_KEY", API_KEY)

    # 2. Handle Owner Type
    existing_type = get_env_var("ROBLOX_OWNER_TYPE") # "user" or "group"
    if existing_type in ["user", "group"]:
        confirm = input(f"Previous Owner Type found ('{existing_type}'). Confirm? (Y/n): ").strip().lower()
        if confirm == 'n':
            while True:
                OWNER_TYPE = input("Select Owner Type (user/group): ").strip().lower()
                if OWNER_TYPE in ["user", "group"]:
                    set_env_var("ROBLOX_OWNER_TYPE", OWNER_TYPE)
                    break
                print("❌ Invalid selection. Choose 'user' or 'group'.")
        else:
            OWNER_TYPE = existing_type
    else:
        while True:
            OWNER_TYPE = input("Select Owner Type (user/group): ").strip().lower()
            if OWNER_TYPE in ["user", "group"]:
                set_env_var("ROBLOX_OWNER_TYPE", OWNER_TYPE)
                break
            print("❌ Invalid selection. Choose 'user' or 'group'.")

    # 3. Handle Owner ID
    existing_id = get_env_var("ROBLOX_OWNER_ID")
    if existing_id:
        confirm = input(f"Previous Owner ID found ({existing_id}). Confirm? (Y/n): ").strip().lower()
        if confirm == 'n':
            OWNER_ID = input(f"Please enter your target Roblox {OWNER_TYPE.upper()} ID: ").strip()
            set_env_var("ROBLOX_OWNER_ID", OWNER_ID)
        else:
            OWNER_ID = existing_id
    else:
        OWNER_ID = input(f"Please enter your target Roblox {OWNER_TYPE.upper()} ID: ").strip()
        set_env_var("ROBLOX_OWNER_ID", OWNER_ID)
        
    try:
        OWNER_ID = int(OWNER_ID)
    except ValueError:
        print("❌ Error: Owner ID must be a purely numeric value.")
        exit(1)
        
    print("="*40 + "\n✅ Configuration Loaded and Saved!\n")

# =========================
# CORE FUNCTIONS
# =========================

def get_images():
    """Targets the 'frames' folder in the same directory as the script."""
    frames_dir = os.path.join(os.getcwd(), "frames")
    if not os.path.exists(frames_dir):
        return []
    return sorted([
        f for f in os.listdir(frames_dir)
        if os.path.splitext(f)[1].lower() in VALID_EXTENSIONS
    ])

def make_creation_context():
    if OWNER_TYPE == "user":
        return {"creator": {"userId": OWNER_ID}}
    elif OWNER_TYPE == "group":
        return {"creator": {"groupId": OWNER_ID}}
    else:
        raise ValueError("OWNER_TYPE must be 'user' or 'group'")

def upload_image(full_filepath):
    """Expects the complete relative path to open the file successfully."""
    mime = mimetypes.guess_type(full_filepath)[0] or "application/octet-stream"
    # Extract just the filename for Roblox's DisplayName property
    display_name = os.path.splitext(os.path.basename(full_filepath))[0]

    payload = {
        "assetType": "Decal",
        "displayName": display_name,
        "description": "Bulk Uploaded Asset",
        "creationContext": make_creation_context()
    }

    headers = {"x-api-key": API_KEY}

    with open(full_filepath, "rb") as f:
        files = {
            "request": (None, json.dumps(payload), "application/json"),
            "fileContent": (os.path.basename(full_filepath), f, mime)
        }
        return requests.post(UPLOAD_URL, headers=headers, files=files)

def check_operation_status(operation_path):
    url = f"{OPERATION_URL}{operation_path}"
    headers = {"x-api-key": API_KEY}
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None

def get_image_id_from_decal(decal_id):
    url = f"{DECAL_INFO_URL}{decal_id}"
    headers = {"x-api-key": API_KEY, "Accept": "application/json"}
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code != 200: return None
        
        location_url = r.json().get("location")
        if not location_url: return None

        cdn_response = requests.get(location_url, timeout=10)
        if cdn_response.status_code != 200: return None

        root = ET.fromstring(cdn_response.content)
        url_element = root.find(".//url")
        if url_element is not None and url_element.text:
            texture_url = url_element.text.strip()
            match = re.search(r"id=(\d+)", texture_url)
            if match: return match.group(1)
    except Exception:
        pass
    return None

def append_result(name, image_id):
    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
        f.write(f"{name} -- {image_id}\n")

def process_single_image(img_filename):
    """Main thread operation logic."""
    full_path = os.path.join("frames", img_filename)
    name = os.path.splitext(img_filename)[0]
    
    print(f"📡 [START] Uploading: {img_filename}")
    try:
        res = upload_image(full_path)
        if res.status_code not in (200, 201):
            return f"✖ [FAIL] {img_filename} - Upload HTTP Error: {res.status_code}"

        initial_data = res.json()
        operation_path = initial_data.get("path")
        if not operation_path:
            return f"✖ [FAIL] {img_filename} - Failed to yield backend tracking handle."

        decal_id = None
        for _ in range(15):
            time.sleep(2)
            op_status = check_operation_status(operation_path)
            if op_status and op_status.get("done") == True:
                response_data = op_status.get("response", {})
                decal_id = response_data.get("assetId") or response_data.get("id")
                break

        if not decal_id:
            return f"✖ [TIMEOUT] {img_filename} - Processing queue took too long."

        print(f"✔ [DECAL READY] {img_filename} -> Decal ID: {decal_id}. Fetching Image ID...")

        image_id = None
        for attempt in range(5):
            time.sleep(3)
            image_id = get_image_id_from_decal(decal_id)
            if image_id: break
            print(f"  ...Retrying Image ID map extraction for {name} (Attempt {attempt+1}/5)")

        if image_id:
            append_result(name, image_id)
            return f"🎉 [SUCCESS] Saved: {name} -- {image_id}"
        else:
            return f"✖ [EXTRACT FAIL] {img_filename} - Could not resolve underlying Image ID."
    except Exception as e:
        return f"✖ [ERROR] Unexpected exception on {img_filename}: {str(e)}"

# =========================
# EXECUTION ENTRY POINT
# =========================

def main():
    setup_configuration()

    images = get_images()
    if not images:
        print("❌ Error: No valid asset files (.png, .jpg) detected inside your '/frames' directory.")
        print("Please check that the 'frames' folder is in the exact same folder as this script.")
        return

    open(OUTPUT_FILE, "w", encoding="utf-8").close()
    print(f"Discovered {len(images)} images inside '/frames'. Launching multi-threaded batch engine...\n")

    success_count = 0
    fail_count = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(process_single_image, img): img for img in images}
        for future in as_completed(futures):
            result_string = future.result()
            print(result_string)
            if "SUCCESS" in result_string:
                success_count += 1
            else:
                fail_count += 1

    print("\n==============================================")
    print("JOB MATRIX STATUS REPORT")
    print(f"Successfully Resolved: {success_count} files")
    print(f"Failed or Blocked   : {fail_count} files")
    print(f"Output Matrix Log saved within: {OUTPUT_FILE}")
    print("==============================================")

if __name__ == "__main__":
    main()
    input("\nProcessing Complete. Press Enter to exit...")
