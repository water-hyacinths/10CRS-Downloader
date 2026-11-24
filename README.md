# 10CRS Downloader

A small local web application for combining, downloading, and converting video and audio files. The interface runs in a browser, while Flask calls FFmpeg on the computer running the server.

## What the project does

Use this tool to prepare lesson media when video and audio are provided as separate files or links. It can combine local files, download a video from an m3u8 URL, download and combine separate video/audio URLs, and convert a local video into an MP4 file.

## Features and use cases

- **Merge Files:** combine a local video and audio file into an MP4. The video stream is copied without re-encoding; audio is encoded as AAC.
- **Download Video:** download a media stream from an m3u8 URL into an MP4 file.
- **Download & Merge:** download separate video and audio URLs and combine them into one MP4. The URLs may be temporary, so start promptly.
- **Convert Video:** re-encode a local video to H.264/AAC, or try remuxing it without re-encoding.
- **Quality options:** choose CRF 18 for higher quality, CRF 23 for a balanced result, or CRF 28 for a smaller file. Lower CRF values generally mean higher quality and larger files.
- **Browser interface:** choose files with the file picker or drag and drop them, name the output, and view operation status.

## Project structure

```text
10CRS-Downloader/
├── Server.py                 # Flask application and FFmpeg endpoints
├── requirements.txt          # Python dependencies
├── README.md                 # Project overview and instructions
├── templates/
│   └── index.html            # Browser page markup
└── static/
    ├── css/
    │   └── styles.css        # Page styles
    └── js/
        └── app.js            # Tabs, file selection, and API requests
```

Flask serves `templates/index.html` at `/` and the CSS and JavaScript from `static/`. The browser sends requests to the four media-operation endpoints in `Server.py`; those endpoints invoke FFmpeg.

---

## Prerequisites

You need **three things** installed before you can run the project: **Python**, **FFmpeg**, and **Git** (optional, only if you want to clone the repo).

### 1. Python 3.10 or newer

<details>
<summary><strong>Windows</strong></summary>

1. Go to <https://www.python.org/downloads/> and download the latest Python installer.
2. Run the installer. **Check the box "Add python.exe to PATH"** at the bottom of the first screen — this is important!
3. Click **Install Now** and wait for it to finish.
4. Verify by opening **PowerShell** or **Command Prompt** and running:

   ```powershell
   python --version
   ```

   You should see something like `Python 3.12.x`.

</details>

<details>
<summary><strong>macOS</strong></summary>

**Option A — Official installer:**

1. Go to <https://www.python.org/downloads/> and download the macOS installer.
2. Run the `.pkg` file and follow the prompts.

**Option B — Homebrew (recommended if you use Homebrew):**

```bash
brew install python
```

Verify:

```bash
python3 --version
```

</details>

<details>
<summary><strong>Linux (Ubuntu / Debian)</strong></summary>

```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

Verify:

```bash
python3 --version
```

> **Note:** On Linux, use `python3` and `pip3` instead of `python` and `pip`.

</details>

---

### 2. FFmpeg

FFmpeg is the tool that does all the video/audio processing. It **must** be on your system PATH.

<details>
<summary><strong>Windows</strong></summary>

**Option A — Winget (Windows 10/11):**

```powershell
winget install Gyan.FFmpeg
```

This automatically adds FFmpeg to your PATH. Restart your terminal after installing.

**Option B — Manual install:**

1. Go to <https://www.gyan.dev/ffmpeg/builds/> and download the **ffmpeg-release-essentials.zip** file.
2. Extract the zip file. Inside you will find a `bin` folder containing `ffmpeg.exe`, `ffprobe.exe`, and `ffplay.exe`.
3. Copy the full path of the `bin` folder (for example `C:\ffmpeg\bin`).
4. Add it to your system PATH:
   - Press **Win + S**, search for **"Environment Variables"**, and click **"Edit the system environment variables"**.
   - Click **Environment Variables** → Under **System variables**, find **Path** → Click **Edit**.
   - Click **New** and paste the path to the `bin` folder.
   - Click **OK** on all dialogs.
5. Restart any open terminals.

Verify:

```powershell
ffmpeg -version
```

</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
brew install ffmpeg
```

Verify:

```bash
ffmpeg -version
```

</details>

<details>
<summary><strong>Linux (Ubuntu / Debian)</strong></summary>

```bash
sudo apt update
sudo apt install ffmpeg
```

Verify:

```bash
ffmpeg -version
```

</details>

---

### 3. Git (optional — only needed to clone the repository)

<details>
<summary><strong>Windows</strong></summary>

Download from <https://git-scm.com/download/win> and run the installer with default settings.

</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
brew install git
```

Or install **Xcode Command Line Tools** (which includes Git):

```bash
xcode-select --install
```

</details>

<details>
<summary><strong>Linux (Ubuntu / Debian)</strong></summary>

```bash
sudo apt install git
```

</details>

---

## Run locally — Step by step

### Step 1: Get the project

**Option A — Clone with Git:**

```bash
git clone https://github.com/YOUR_USERNAME/10CRS-Downloader.git
cd 10CRS-Downloader
```

> Replace `YOUR_USERNAME` with the actual GitHub username or organization.

**Option B — Download ZIP:**

Download the ZIP from the GitHub repository page, extract it, and open a terminal inside the extracted folder.

---

### Step 2: Create a virtual environment

A virtual environment keeps this project's packages separate from your system Python.

```bash
python -m venv .venv
```

> On Linux/macOS you may need to use `python3` instead of `python`.

---

### Step 3: Activate the virtual environment

**Windows (PowerShell):**

```powershell
.\.venv\Scripts\Activate.ps1
```

> If you get an execution-policy error, run this first:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

**Windows (Command Prompt):**

```cmd
.venv\Scripts\activate.bat
```

**Linux / macOS:**

```bash
source .venv/bin/activate
```

After activation you should see `(.venv)` at the beginning of your terminal prompt.

---

### Step 4: Install Python dependencies

```bash
pip install -r requirements.txt
```

This installs:

| Package    | Purpose                                       |
| ---------- | --------------------------------------------- |
| **Flask**  | Web framework — serves the UI and API routes  |
| **requests** | HTTP library — downloads HLS segments from URLs |

---

### Step 5: Start the server

```bash
python Server.py
```

You should see:

```
Server is running. Open http://127.0.0.1:5000 in your browser.
```

---

### Step 6: Open the app

Open your browser and go to:

👉 **<http://127.0.0.1:5000>**

You are ready to use the app!

---

## Usage tips

- For **Merge** and **Convert** operations, place the source media files **in the same folder** as `Server.py`. The app reads files from the server's working directory — it does not upload them through the browser.
- For **Download** and **Download & Merge** operations, the output files are saved to the project folder (or the `downloads/` subfolder for HLS downloads).
- **Quality settings** apply to the Convert tab: CRF 18 = high quality / large file, CRF 23 = balanced, CRF 28 = smaller file.
- To stop the server, press `Ctrl + C` in the terminal.

---

## Quick reference commands

```bash
# Full setup from scratch (Linux/macOS)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python Server.py

# Full setup from scratch (Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python Server.py
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `python` is not recognized | Make sure Python is installed and added to PATH. Try `python3` instead. |
| `ffmpeg` is not recognized | FFmpeg is not on your PATH. See the FFmpeg installation instructions above. |
| Execution policy error on Windows | Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` in PowerShell. |
| `ModuleNotFoundError: No module named 'flask'` | You forgot to activate the virtual environment or run `pip install -r requirements.txt`. |
| Port 5000 already in use | Another app is using port 5000. Stop it, or edit `Server.py` to change the port number in `app.run()`. |
| Merge/Convert says file not found | Place the media file in the same folder as `Server.py` and use the filename only (not the full path). |

---

## Efficiency improvements

The app is intended for personal, local use. These are practical next steps if it needs to handle bigger files, multiple users, or repeated work:

1. **Report real progress.** The browser currently displays approximate progress values while FFmpeg runs. Use FFmpeg's machine-readable `-progress` output and stream updates to the page with server-sent events or WebSockets.
2. **Run long jobs outside request handlers.** FFmpeg runs synchronously, so a browser request waits for the entire operation. A background job queue (for example, RQ or Celery) can keep requests responsive and allow cancellation, retries, and job status tracking.
3. **Avoid unnecessary re-encoding.** Stream copy is much faster and avoids quality loss when the source codecs are compatible with MP4. Re-encode only when compatibility requires it.
4. **Tune encoding deliberately.** For conversion, benchmark a faster preset such as `veryfast` against the current `medium` preset; it trades some compression efficiency for shorter encode time. Keep CRF selectable according to quality and storage needs.
5. **Validate and contain file paths.** Validate required form values, restrict source/output paths to an application media directory, reject unsafe filenames, and clean up temporary files. This is especially important before accepting uploads or allowing multiple users.
6. **Limit concurrent work.** Multiple FFmpeg conversions can use substantial CPU, memory, and disk bandwidth. A queue and a configurable concurrency limit help prevent the machine from becoming unresponsive.
7. **Measure before optimizing.** Record operation duration, media size, and FFmpeg exit status, then profile the slow operations with representative files before changing codecs or defaults.

### Safety note

The development server binds to all network interfaces. Do not expose it to the public internet as-is: it has no authentication, and users can request FFmpeg operations. For shared use, add authentication, strict input/path validation, resource limits, and a production WSGI server behind an appropriately configured reverse proxy.
