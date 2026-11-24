from flask import Flask, request, jsonify, render_template, Response
import subprocess
import os
import threading
import uuid
import json
import time
import shutil
import re
from urllib.parse import urlparse, urljoin, parse_qs, urlunparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

app = Flask(__name__)

# Shared state for HLS download jobs.
hls_jobs = {}

BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://10minuteschool.com',
    'Referer': 'https://10minuteschool.com/',
}


def _parse_ts_url(ts_url):
    """Extract base URL, resolution, video ID, and token from a .ts or .m3u8 URL.

    Expected pattern:
        https://domain/videos/{video_id}/{resolution}/{resolution}_outN.ts?token_params
    """
    ts_url = (ts_url or '').strip().strip('"\'`')
    parsed = urlparse(ts_url)
    path_parts = [p for p in parsed.path.rstrip('/').split('/') if p]

    video_id = 'video'
    resolution = '720'
    base_url = ''

    if 'videos' in path_parts:
        idx = path_parts.index('videos')
        if idx + 1 < len(path_parts):
            video_id = path_parts[idx + 1]
        if idx + 2 < len(path_parts):
            resolution = path_parts[idx + 2]
        base_path = '/' + '/'.join(path_parts[: idx + 2])
        base_url = urlunparse((parsed.scheme, parsed.netloc, base_path, '', '', ''))
    else:
        # Search for standard resolution folder in path (1080, 720, 480, 360, 240)
        res_idx = None
        for i, part in enumerate(path_parts):
            if part in ('1080', '720', '480', '360', '240') or re.match(r'^\d{3,4}$', part):
                res_idx = i
                resolution = part
                break
        if res_idx is not None and res_idx > 0:
            video_id = path_parts[res_idx - 1]
            base_path = '/' + '/'.join(path_parts[:res_idx])
            base_url = urlunparse((parsed.scheme, parsed.netloc, base_path, '', '', ''))
        elif len(path_parts) >= 2:
            base_path = '/' + '/'.join(path_parts[:-2])
            base_url = urlunparse((parsed.scheme, parsed.netloc, base_path, '', '', ''))
        else:
            raise ValueError('Could not determine video path structure from URL.')

    token = parsed.query  # full query string (md5=…&expires=…)

    return {
        'base_url': base_url,
        'resolution': resolution,
        'video_id': video_id,
        'token': token,
    }


@app.route('/')
def home():
    return render_template('index.html')

@app.route('/run-merge', methods=['POST'])
def run_merge():
    video = request.form.get('video')
    audio = request.form.get('audio')
    output = request.form.get('output')

    if not video or not audio or not output:
        return jsonify({"success": False, "error": "Video file, audio file, and output filename are required."})

    if not os.path.exists(video) or not os.path.exists(audio):
        return jsonify({"success": False, "error": "The video or audio file was not found in this folder."})

    # Normalize the extension so the output does not end in .mp4.mp4.
    output_clean = output.strip()
    if output_clean.lower().endswith('.mp4'):
        output_clean = output_clean[:-4]
    output_final = output_clean + '.mp4'

    # Pass arguments as a list so filenames containing spaces are handled correctly.
    command = ['ffmpeg', '-i', video, '-i', audio, '-c:v', 'copy', '-c:a', 'aac', '-y', output_final]
    
    try:
        subprocess.run(command, check=True)
        return jsonify({"success": True})
    except subprocess.CalledProcessError as e:
        return jsonify({"success": False, "error": f"FFmpeg Error: {str(e)}"})
    except FileNotFoundError:
        return jsonify({"success": False, "error": "FFmpeg was not found. Install it and make sure it is available on PATH (ffmpeg -version)."})

@app.route('/run-download', methods=['POST'])
def run_download():
    url = request.form.get('url')
    output = request.form.get('output')

    if not url or not output:
        return jsonify({"success": False, "error": "A URL and output filename are required."})

    # Normalize the extension so the output does not end in .mp4.mp4.
    output_clean = output.strip()
    if output_clean.lower().endswith('.mp4'):
        output_clean = output_clean[:-4]
    output_final = output_clean + '.mp4'

    # Force the output container and pass arguments as a list for filenames with spaces.
    command = ['ffmpeg', '-i', url, '-c', 'copy', '-f', 'mp4', '-y', output_final]
    
    try:
        subprocess.run(command, check=True)
        return jsonify({"success": True})
    except subprocess.CalledProcessError as e:
        return jsonify({"success": False, "error": f"FFmpeg error: {str(e)}. Check the URL and try again."})
    except FileNotFoundError:
        return jsonify({"success": False, "error": "FFmpeg was not found. Install it and make sure it is available on PATH (ffmpeg -version)."})

@app.route('/run-link-merge', methods=['POST'])
def run_link_merge():
    video_url = request.form.get('video_url')
    audio_url = request.form.get('audio_url')
    output    = request.form.get('output')

    if not video_url or not audio_url or not output:
        return jsonify({"success": False, "error": "Video URL, audio URL, and output filename are required."})

    # Normalize the extension so the output does not end in .mp4.mp4.
    output_clean = output.strip()
    if output_clean.lower().endswith('.mp4'):
        output_clean = output_clean[:-4]
    output_final = output_clean + '.mp4'

    # FFmpeg downloads both URLs directly, copies the video stream, and encodes audio as AAC.
    command = [
        'ffmpeg',
        '-i', video_url,
        '-i', audio_url,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-f', 'mp4',
        '-y', output_final
    ]

    try:
        subprocess.run(command, check=True)
        return jsonify({"success": True})
    except subprocess.CalledProcessError as e:
        return jsonify({"success": False, "error": f"FFmpeg error: {str(e)}. Check that both links are valid and have not expired."})
    except FileNotFoundError:
        return jsonify({"success": False, "error": "FFmpeg was not found. Install it and make sure it is available on PATH (ffmpeg -version)."})

@app.route('/run-convert', methods=['POST'])
def run_convert():
    source  = request.form.get('source')
    output  = request.form.get('output')
    quality = request.form.get('quality', '23')

    if not source or not output:
        return jsonify({"success": False, "error": "A source file and output filename are required."})

    if not os.path.exists(source):
        return jsonify({"success": False, "error": f'"{source}" was not found in this folder. Place the file next to server.py.'})

    # Normalize the extension so the output does not end in .mp4.mp4.
    output_clean = output.strip()
    if output_clean.lower().endswith('.mp4'):
        output_clean = output_clean[:-4]
    output_final = output_clean + '.mp4'

    # Prevent FFmpeg from overwriting the source file.
    if os.path.abspath(source) == os.path.abspath(output_final):
        return jsonify({"success": False, "error": "The output filename matches the source file. Choose a different name."})

    if quality == 'copy':
        # Remux the streams without re-encoding; some codecs are not supported by MP4.
        command = ['ffmpeg', '-i', source, '-c', 'copy', '-f', 'mp4', '-y', output_final]
    else:
        # Convert video to H.264 and audio to AAC; lower CRF means higher quality and a larger file.
        # Move MP4 metadata to the beginning so playback can start before the whole file is downloaded.
        command = [
            'ffmpeg', '-i', source,
            '-c:v', 'libx264', '-crf', quality, '-preset', 'medium',
            '-c:a', 'aac', '-b:a', '192k',
            '-movflags', '+faststart',
            '-f', 'mp4', '-y', output_final
        ]

    try:
        result = subprocess.run(command, capture_output=True, text=True, errors='replace')
        if result.returncode != 0:
            # FFmpeg can leave an empty output file when conversion fails.
            if os.path.exists(output_final) and os.path.getsize(output_final) == 0:
                try:
                    os.remove(output_final)
                except OSError:
                    pass
            tail = (result.stderr or '').strip().splitlines()[-3:]
            detail = ' | '.join(tail) if tail else 'Unknown error'
            if quality == 'copy':
                detail += ' — If remuxing fails, try one of the other quality options.'
            return jsonify({"success": False, "error": f"FFmpeg error: {detail}"})
        return jsonify({"success": True})
    except FileNotFoundError:
        return jsonify({"success": False, "error": "FFmpeg was not found. Install it and make sure it is available on PATH (ffmpeg -version)."})


# ---------------------------------------------------------------------------
# HLS download routes
# ---------------------------------------------------------------------------

@app.route('/probe-resolutions', methods=['POST'])
def probe_resolutions():
    data = request.get_json(force=True)
    ts_url = (data.get('ts_url') or '').strip().strip('"\'`')

    if not ts_url:
        return jsonify({"success": False, "error": "A .ts URL is required."})

    try:
        info = _parse_ts_url(ts_url)
    except (ValueError, IndexError) as e:
        return jsonify({"success": False, "error": f"Could not parse the URL: {e}"})

    base_url   = info['base_url']
    active_res = int(info['resolution']) if info['resolution'].isdigit() else 720
    token      = info['token']

    resolutions = []

    # --- Strategy 1: try fetching the master playlist ---
    master_url = f"{base_url}/main.m3u8?{token}" if token else f"{base_url}/main.m3u8"
    try:
        resp = requests.get(master_url, headers=BROWSER_HEADERS, timeout=4)
        if resp.status_code == 200:
            body = resp.text
            for line in body.splitlines():
                line = line.strip()
                if line.startswith('#EXT-X-STREAM-INF'):
                    m = re.search(r'RESOLUTION=\d+x(\d+)', line)
                    if m:
                        resolutions.append(int(m.group(1)))
    except requests.RequestException:
        pass

    # --- Strategy 2 (fallback): Fast parallel probe of candidate resolutions ---
    if not resolutions:
        candidates = [1080, 720, 480, 360, 240]

        def _probe_res(res):
            probe_url = f"{base_url}/{res}/{res}_out0.ts"
            if token:
                probe_url += f"?{token}"
            try:
                # Use GET with stream=True so CDNs don't reject HEAD method with 405
                r = requests.get(probe_url, headers=BROWSER_HEADERS, stream=True, timeout=3)
                if r.status_code == 200:
                    r.close()
                    return res
                r.close()
            except requests.RequestException:
                pass
            return None

        with ThreadPoolExecutor(max_workers=5) as pool:
            results = pool.map(_probe_res, candidates)
            for r in results:
                if r is not None:
                    resolutions.append(r)

    # Make sure the active resolution is in the list and sort descending.
    if active_res not in resolutions:
        resolutions.append(active_res)
    resolutions = sorted(set(resolutions), reverse=True)

    return jsonify({"success": True, "resolutions": resolutions, "active": active_res})


@app.route('/run-hls', methods=['POST'])
def run_hls():
    data = request.get_json(force=True)
    ts_url      = (data.get('ts_url') or '').strip().strip('"\'`')
    resolution  = data.get('resolution')
    output_name = (data.get('output_name') or '').strip()

    if not ts_url or resolution is None or not output_name:
        return jsonify({"success": False, "error": "ts_url, resolution, and output_name are required."})

    try:
        info = _parse_ts_url(ts_url)
    except (ValueError, IndexError) as e:
        return jsonify({"success": False, "error": f"Could not parse the URL: {e}"})

    resolution = int(resolution)
    job_id = str(uuid.uuid4())

    # Ensure output directories exist.
    os.makedirs('downloads', exist_ok=True)
    work_dir  = os.path.join('work', job_id)
    parts_dir = os.path.join(work_dir, 'parts')
    os.makedirs(parts_dir, exist_ok=True)

    hls_jobs[job_id] = {
        'pct': 0,
        'msg': 'Starting…',
        'status': 'running',
        'file': None,
    }

    thread = threading.Thread(
        target=_hls_worker,
        args=(job_id, info, resolution, output_name, work_dir, parts_dir),
        daemon=True,
    )
    thread.start()

    return jsonify({"job_id": job_id})


def _hls_worker(job_id, info, resolution, output_name, work_dir, parts_dir):
    """Background worker that downloads HLS segments and stitches them."""
    job = hls_jobs[job_id]
    base_url = info['base_url']
    token    = info['token']

    try:
        # 1. Build and fetch the playlist.
        playlist_url = f"{base_url}/{resolution}/{resolution}_out.m3u8"
        if token:
            playlist_url += f"?{token}"

        job['msg'] = 'Fetching playlist…'
        resp = requests.get(playlist_url, headers=BROWSER_HEADERS, timeout=15)
        resp.raise_for_status()
        playlist_text = resp.text

        # 2. Parse segment URLs (lines that are not comments/blank).
        raw_segments = [
            line.strip() for line in playlist_text.splitlines()
            if line.strip() and not line.strip().startswith('#')
        ]

        # Resolve relative URLs against the playlist URL, ensuring token is appended
        playlist_base = playlist_url.split('?')[0].rsplit('/', 1)[0] + '/'
        segments = []
        for seg in raw_segments:
            seg_url = seg if seg.startswith('http') else urljoin(playlist_base, seg)
            if token and '?' not in seg_url:
                seg_url = f"{seg_url}?{token}"
            segments.append(seg_url)

        total = len(segments)
        if total == 0:
            raise RuntimeError('The playlist contains no segments.')

        # 3. Write segment list for reference / debugging.
        segs_file = os.path.join(work_dir, 'segs.txt')
        with open(segs_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(segments))

        # 4. Download segments in parallel.
        completed = 0
        lock = threading.Lock()

        def _download_segment(index, url):
            nonlocal completed
            filename = f"{resolution}_out{index}.ts"
            dest = os.path.join(parts_dir, filename)

            # Resume support: skip segments already on disk.
            if os.path.exists(dest) and os.path.getsize(dest) > 0:
                with lock:
                    completed += 1
                    job['pct'] = int(completed / total * 90)
                    job['msg'] = f'Downloading segment {completed} / {total}…'
                return

            r = requests.get(url, headers=BROWSER_HEADERS, timeout=(10, 120))
            r.raise_for_status()
            with open(dest, 'wb') as f:
                f.write(r.content)

            with lock:
                completed += 1
                job['pct'] = int(completed / total * 90)
                job['msg'] = f'Downloading segment {completed} / {total}…'

        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {
                pool.submit(_download_segment, idx, url): idx
                for idx, url in enumerate(segments)
            }
            for future in as_completed(futures):
                exc = future.exception()
                if exc:
                    raise RuntimeError(f'Segment {futures[future]} failed: {exc}')

        # 5. Stitch all .ts files into a single combined file.
        job['msg'] = 'Stitching segments…'
        job['pct'] = 92
        all_ts = os.path.join(work_dir, 'all.ts')
        with open(all_ts, 'wb') as out:
            for idx in range(total):
                part = os.path.join(parts_dir, f"{resolution}_out{idx}.ts")
                with open(part, 'rb') as p:
                    shutil.copyfileobj(p, out)

        # 6. Convert to MP4 with FFmpeg.
        job['msg'] = 'Converting to MP4…'
        job['pct'] = 95

        # Normalize output name.
        out_clean = output_name.strip()
        if out_clean.lower().endswith('.mp4'):
            out_clean = out_clean[:-4]
        output_final = os.path.join('downloads', out_clean + '.mp4')

        command = ['ffmpeg', '-i', all_ts, '-c', 'copy', '-f', 'mp4', '-y', output_final]
        result = subprocess.run(command, capture_output=True, text=True, errors='replace')
        if result.returncode != 0:
            tail = (result.stderr or '').strip().splitlines()[-3:]
            detail = ' | '.join(tail) if tail else 'Unknown error'
            raise RuntimeError(f'FFmpeg error: {detail}')

        # 7. Cleanup work directory on success.
        shutil.rmtree(work_dir, ignore_errors=True)

        job['pct'] = 100
        job['msg'] = 'Done!'
        job['status'] = 'done'
        job['file'] = out_clean + '.mp4'

    except Exception as e:
        job['status'] = 'error'
        job['msg'] = str(e)


@app.route('/hls-progress/<job_id>')
def hls_progress(job_id):
    def generate():
        if job_id not in hls_jobs:
            yield f"data: {json.dumps({'pct': 0, 'msg': 'Job not found.'})}\n\n"
            yield "data: [DONE]\n\n"
            return

        while True:
            job = hls_jobs[job_id]
            payload = {'pct': job['pct'], 'msg': job['msg'], 'status': job['status']}

            if job['status'] == 'done':
                payload['file'] = job['file']
                yield f"data: {json.dumps(payload)}\n\n"
                yield "data: [DONE]\n\n"
                hls_jobs.pop(job_id, None)
                return

            if job['status'] == 'error':
                yield f"data: {json.dumps(payload)}\n\n"
                yield "data: [DONE]\n\n"
                hls_jobs.pop(job_id, None)
                return

            yield f"data: {json.dumps(payload)}\n\n"
            time.sleep(0.5)

    return Response(generate(), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


if __name__ == '__main__':
    print("\nServer is running. Open http://127.0.0.1:5000 in your browser.")
    app.run(host='0.0.0.0', port=5000)




