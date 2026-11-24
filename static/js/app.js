function switchTab(tab) {
  document.getElementById('panel-merge').style.display = (tab === 'merge') ? 'block' : 'none';
  document.getElementById('panel-dl').style.display   = (tab === 'dl')    ? 'block' : 'none';
  document.getElementById('panel-lm').style.display   = (tab === 'lm')    ? 'block' : 'none';
  document.getElementById('panel-cv').style.display   = (tab === 'cv')    ? 'block' : 'none';
  document.getElementById('panel-hls').style.display  = (tab === 'hls')   ? 'block' : 'none';
  document.getElementById('tab-merge-btn').classList.toggle('active', tab === 'merge');
  document.getElementById('tab-dl-btn').classList.toggle('active',    tab === 'dl');
  document.getElementById('tab-lm-btn').classList.toggle('active',    tab === 'lm');
  document.getElementById('tab-cv-btn').classList.toggle('active',    tab === 'cv');
  document.getElementById('tab-hls-btn').classList.toggle('active',   tab === 'hls');
}

function showStatus(panel, msg, type) {
  var el = document.getElementById('status-' + panel);
  el.style.display = 'block'; el.textContent = msg;
  var map = { info: ['var(--bg-accent)', 'var(--text-accent)', 'var(--border-accent)'], success: ['var(--bg-success)', 'var(--text-success)', 'var(--border-success)'], error: ['var(--bg-danger)', 'var(--text-danger)', 'var(--border-danger)'] };
  var c = map[type] || map.info;
  el.style.background = c[0]; el.style.color = c[1]; el.style.border = '0.5px solid ' + c[2];
}
function setProgress(panel, pct) { document.getElementById('prog-wrap-' + panel).style.display = 'block'; document.getElementById('prog-bar-' + panel).style.width = pct + '%'; }

var files = {v: null, a: null};
function ev(e, t) { e.preventDefault(); hoverZone(t, true); }
function el(t) { if(!files[t]) hoverZone(t, false); }
function ed(e, t) { e.preventDefault(); hoverZone(t, false); var f = e.dataTransfer.files[0]; if(f) setF(t, f); }
function fi(e, t) { var f = e.target.files[0]; if(f) setF(t, f); }
function hoverZone(t, on) { document.getElementById('zone-'+t).style.background = on ? 'var(--bg-accent)' : ''; document.getElementById('zone-'+t).style.borderColor = on ? 'var(--border-accent)' : ''; }
function setF(t, f) {
  files[t] = f;
  var z = document.getElementById('zone-'+t); z.classList.add('active');
  document.getElementById('icon-'+t).style.color = 'var(--text-accent)';
  document.getElementById('lbl-'+t).style.color = 'var(--text-accent)';
  document.getElementById('sub-'+t).style.display = 'none';
  document.getElementById('fn-'+t).textContent = '✓ ' + (f.name.length > 26 ? f.name.substring(0,23)+'...' : f.name);
  document.getElementById('merge-btn').disabled = !(files.v && files.a);
}

async function doMerge() {
  var name = document.getElementById('out-name').value.trim() || 'merged_class';
  var outName = name.endsWith('.mp4') ? name : name + '.mp4';
  var btn = document.getElementById('merge-btn');
  
  btn.disabled = true; btn.style.cursor = 'not-allowed';
  btn.innerHTML = '<i class="ti ti-loader"></i>&nbsp;Merging files...';
  setProgress('merge', 50);
  showStatus('merge', 'Merging the video and audio. Please wait...', 'info');

  try {
    let formData = new FormData();
    formData.append('video', files.v.name);
    formData.append('audio', files.a.name);
    formData.append('output', outName);

    let response = await fetch('/run-merge', { method: 'POST', body: formData });
    let result = await response.json();

    if (result.success) {
      setProgress('merge', 100);
      showStatus('merge', '"' + outName + '" was saved successfully.', 'success');
    } else throw new Error(result.error);
  } catch(e) { showStatus('merge', 'Error: ' + e.message, 'error'); }
  
  btn.disabled = false; btn.style.cursor = 'pointer';
  btn.innerHTML = '<i class="ti ti-arrows-join"></i>&nbsp;Merge Files';
}

function checkDlReady() {
  var url = document.getElementById('dl-url').value.trim();
  var name = document.getElementById('dl-name').value.trim();
  document.getElementById('dl-btn').disabled = !(url && name);
}

async function doDownload() {
  var url = document.getElementById('dl-url').value.trim();
  var name = document.getElementById('dl-name').value.trim();
  var outName = name.endsWith('.mp4') ? name : name + '.mp4';
  var btn = document.getElementById('dl-btn');
  
  btn.disabled = true; btn.style.cursor = 'not-allowed';
  btn.innerHTML = '<i class="ti ti-loader"></i>&nbsp;Downloading...';
  setProgress('dl', 70);
  showStatus('dl', 'FFmpeg is downloading the video. This may take a while depending on the file size...', 'info');

  try {
    let formData = new FormData();
    formData.append('url', url);
    formData.append('output', outName);

    let response = await fetch('/run-download', { method: 'POST', body: formData });
    let result = await response.json();

    if (result.success) {
      setProgress('dl', 100);
      showStatus('dl', '"' + outName + '" was downloaded and saved successfully.', 'success');
      document.getElementById('dl-url').value = ''; 
      checkDlReady();
    } else throw new Error(result.error);
  } catch(e) { showStatus('dl', 'Error: ' + e.message, 'error'); }
  
  btn.disabled = false; btn.style.cursor = 'pointer';
  btn.innerHTML = '<i class="ti ti-download"></i>&nbsp;Download Video';
}

function checkLmReady() {
  var vurl = document.getElementById('lm-vurl').value.trim();
  var aurl = document.getElementById('lm-aurl').value.trim();
  var name = document.getElementById('lm-name').value.trim();
  document.getElementById('lm-btn').disabled = !(vurl && aurl && name);
}

async function doLinkMerge() {
  var vurl   = document.getElementById('lm-vurl').value.trim();
  var aurl   = document.getElementById('lm-aurl').value.trim();
  var name   = document.getElementById('lm-name').value.trim();
  var outName = name.endsWith('.mp4') ? name : name + '.mp4';
  var btn    = document.getElementById('lm-btn');

  btn.disabled = true; btn.style.cursor = 'not-allowed';
  btn.innerHTML = '<i class="ti ti-loader"></i>&nbsp;Downloading and merging...';
  setProgress('lm', 30);
  showStatus('lm', 'FFmpeg is downloading the video and audio separately, then merging them...', 'info');

  try {
    let formData = new FormData();
    formData.append('video_url', vurl);
    formData.append('audio_url', aurl);
    formData.append('output', outName);

    setProgress('lm', 60);
    let response = await fetch('/run-link-merge', { method: 'POST', body: formData });
    let result = await response.json();

    if (result.success) {
      setProgress('lm', 100);
      showStatus('lm', '"' + outName + '" was downloaded and merged successfully.', 'success');
      document.getElementById('lm-vurl').value = '';
      document.getElementById('lm-aurl').value = '';
      checkLmReady();
    } else throw new Error(result.error);
  } catch(e) { showStatus('lm', 'Error: ' + e.message, 'error'); setProgress('lm', 0); }

  btn.disabled = false; btn.style.cursor = 'pointer';
  btn.innerHTML = '<i class="ti ti-arrows-join-2"></i>&nbsp;Download &amp; Merge';
}

var cvFile = null;
function cvOver(e) { e.preventDefault(); var z = document.getElementById('zone-c'); z.style.background = 'var(--bg-accent)'; z.style.borderColor = 'var(--border-accent)'; }
function cvLeave() { if (!cvFile) { var z = document.getElementById('zone-c'); z.style.background = ''; z.style.borderColor = ''; } }
function cvDrop(e) { e.preventDefault(); cvLeave(); var f = e.dataTransfer.files[0]; if (f) cvSet(f); }
function cvPick(e) { var f = e.target.files[0]; if (f) cvSet(f); }

function cvSet(f) {
  cvFile = f;
  document.getElementById('zone-c').classList.add('active');
  document.getElementById('icon-c').style.color = 'var(--text-accent)';
  document.getElementById('lbl-c').style.color = 'var(--text-accent)';
  document.getElementById('sub-c').style.display = 'none';
  document.getElementById('fn-c').textContent = '✓ ' + (f.name.length > 30 ? f.name.substring(0,27)+'...' : f.name);
  document.getElementById('cv-btn').disabled = false;
}

async function doConvert() {
  var name    = document.getElementById('cv-name').value.trim();
  var quality = document.getElementById('cv-quality').value;
  var btn     = document.getElementById('cv-btn');

  // Use the source filename if no output name was provided.
  if (!name) { var dot = cvFile.name.lastIndexOf('.'); name = dot > 0 ? cvFile.name.substring(0, dot) : cvFile.name; }
  var outName = name.endsWith('.mp4') ? name : name + '.mp4';

  btn.disabled = true; btn.style.cursor = 'not-allowed';
  btn.innerHTML = '<i class="ti ti-loader"></i>&nbsp;Converting...';
  setProgress('cv', 40);
  showStatus('cv', quality === 'copy'
    ? 'Remuxing without re-encoding. This should be faster...'
    : 'FFmpeg is re-encoding the video to H.264. Large files may take several minutes...', 'info');

  try {
    let formData = new FormData();
    formData.append('source', cvFile.name);
    formData.append('output', outName);
    formData.append('quality', quality);

    let response = await fetch('/run-convert', { method: 'POST', body: formData });
    let result = await response.json();

    if (result.success) {
      setProgress('cv', 100);
      showStatus('cv', '"' + outName + '" was saved successfully.', 'success');
    } else throw new Error(result.error);
  } catch(e) { showStatus('cv', 'Error: ' + e.message, 'error'); setProgress('cv', 0); }

  btn.disabled = false; btn.style.cursor = 'pointer';
  btn.innerHTML = '<i class="ti ti-refresh"></i>&nbsp;Convert Video';
}

// ─── HLS Download Tab ───────────────────────────────────────────────

var hlsSelectedRes = null;

function parseResFromUrl(url) {
  if (!url) return null;
  url = url.trim().replace(/^["'`]|["'`]$/g, '');
  var m = url.match(/\/(\d{3,4})\/|\b(\d{3,4})_out/);
  return m ? parseInt(m[1] || m[2], 10) : null;
}

function renderPills(resolutions, activeRes) {
  var container = document.getElementById('hls-pills-row');
  container.innerHTML = '';
  var allCandidates = [1080, 720, 480, 360, 240];

  allCandidates.forEach(function(r) {
    var pill = document.createElement('button');
    pill.className = 'res-pill';
    pill.textContent = r + 'p';
    pill.setAttribute('data-res', r);

    if (resolutions.indexOf(r) === -1) {
      pill.disabled = true;
    } else {
      pill.onclick = function() { selectRes(r); };
      if (r === activeRes) {
        pill.classList.add('active');
        hlsSelectedRes = r;
      }
    }
    container.appendChild(pill);
  });

  document.getElementById('hls-res-pills').style.display = 'block';
}

function checkHlsReady() {
  var url = (document.getElementById('hls-url').value || '').trim();
  var name = (document.getElementById('hls-name').value || '').trim();

  var detectBtn = document.getElementById('hls-detect-btn');
  if (detectBtn) detectBtn.disabled = !url;

  var clearBtn = document.getElementById('hls-clear-btn');
  if (clearBtn) clearBtn.disabled = !(url || name || hlsSelectedRes);

  var dlBtn = document.getElementById('hls-dl-btn');
  if (dlBtn) dlBtn.disabled = !(url && (hlsSelectedRes || parseResFromUrl(url)));
}

function clearHlsForm() {
  var urlInput = document.getElementById('hls-url');
  var nameInput = document.getElementById('hls-name');
  if (urlInput) urlInput.value = '';
  if (nameInput) nameInput.value = '';

  hlsSelectedRes = null;

  var pillsContainer = document.getElementById('hls-res-pills');
  if (pillsContainer) pillsContainer.style.display = 'none';
  var pillsRow = document.getElementById('hls-pills-row');
  if (pillsRow) pillsRow.innerHTML = '';

  var progWrap = document.getElementById('prog-wrap-hls');
  var progBar = document.getElementById('prog-bar-hls');
  if (progWrap) progWrap.style.display = 'none';
  if (progBar) progBar.style.width = '0%';

  var statusBox = document.getElementById('status-hls');
  if (statusBox) {
    statusBox.style.display = 'none';
    statusBox.textContent = '';
  }

  var detectBtn = document.getElementById('hls-detect-btn');
  if (detectBtn) {
    detectBtn.disabled = true;
    detectBtn.innerHTML = '<i class="ti ti-search"></i> Detect Resolutions';
  }

  var clearBtn = document.getElementById('hls-clear-btn');
  if (clearBtn) clearBtn.disabled = true;

  var dlBtn = document.getElementById('hls-dl-btn');
  if (dlBtn) {
    dlBtn.disabled = true;
    dlBtn.style.cursor = 'not-allowed';
    dlBtn.innerHTML = '<i class="ti ti-download"></i> Download Lecture';
  }

  if (urlInput) urlInput.focus();
}

function handleHlsUrlChange() {
  var urlInput = document.getElementById('hls-url');
  var rawUrl = urlInput.value.trim();
  var cleanUrl = rawUrl.replace(/^["'`]|["'`]$/g, '');
  if (rawUrl !== cleanUrl) {
    urlInput.value = cleanUrl;
  }

  if (cleanUrl) {
    var detected = parseResFromUrl(cleanUrl);
    if (detected && !hlsSelectedRes) {
      hlsSelectedRes = detected;
      renderPills([detected], detected);
    }

    var nameInput = document.getElementById('hls-name');
    // Only auto-fill suggestion if the user hasn't typed anything yet
    if (!nameInput.value.trim()) {
      var vidMatch = cleanUrl.match(/\/videos\/([a-zA-Z0-9_-]+)/);
      nameInput.value = vidMatch ? ('Lecture-' + vidMatch[1].slice(-6)) : ('Class-' + (hlsSelectedRes || 720) + 'p');
    }
  }

  checkHlsReady();
}

async function detectResolutions() {
  var url = (document.getElementById('hls-url').value || '').trim().replace(/^["'`]|["'`]$/g, '');
  if (!url) return;

  var btn = document.getElementById('hls-detect-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader"></i>&nbsp;Detecting...';

  try {
    let response = await fetch('/probe-resolutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ts_url: url })
    });
    let result = await response.json();

    if (result.error) throw new Error(result.error);

    var resolutions = result.resolutions || [];
    var active = hlsSelectedRes || result.active;

    renderPills(resolutions, active);
    checkHlsReady();

  } catch(e) {
    var fallbackRes = hlsSelectedRes || parseResFromUrl(url) || 720;
    renderPills([fallbackRes], fallbackRes);
    showStatus('hls', 'Note: Could not detect other resolutions (' + e.message + '). Active ' + fallbackRes + 'p is ready to download.', 'info');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="ti ti-search"></i>&nbsp;Detect Resolutions';
}

function selectRes(r) {
  hlsSelectedRes = r;
  var pills = document.querySelectorAll('#hls-pills-row .res-pill');
  pills.forEach(function(p) {
    p.classList.toggle('active', parseInt(p.getAttribute('data-res')) === r);
  });
  checkHlsReady();
}

async function startHlsDownload() {
  var url  = (document.getElementById('hls-url').value || '').trim().replace(/^["'`]|["'`]$/g, '');
  var name = document.getElementById('hls-name').value.trim();
  var btn  = document.getElementById('hls-dl-btn');

  if (!url) {
    showStatus('hls', 'Please paste a .ts URL first.', 'error');
    return;
  }

  if (!hlsSelectedRes) {
    hlsSelectedRes = parseResFromUrl(url) || 720;
  }

  if (!name) {
    name = 'Lecture-' + hlsSelectedRes + 'p';
    document.getElementById('hls-name').value = name;
  }

  // Normalize .mp4 extension
  var outName = name.endsWith('.mp4') ? name.slice(0, -4) : name;

  btn.disabled = true; btn.style.cursor = 'not-allowed';
  btn.innerHTML = '<i class="ti ti-loader"></i>&nbsp;Starting...';
  document.getElementById('hls-detect-btn').disabled = true;
  document.getElementById('hls-clear-btn').disabled = true;
  setProgress('hls', 0);
  showStatus('hls', 'Starting download...', 'info');

  try {
    let response = await fetch('/run-hls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ts_url: url,
        resolution: hlsSelectedRes,
        output_name: outName
      })
    });
    let result = await response.json();

    if (result.error) throw new Error(result.error);

    var jobId = result.job_id;

    // Open SSE stream for progress
    var evtSource = new EventSource('/hls-progress/' + jobId);

    evtSource.onmessage = function(event) {
      var data = event.data;

      if (data === '[DONE]') {
        evtSource.close();
        btn.disabled = false; btn.style.cursor = 'pointer';
        btn.innerHTML = '<i class="ti ti-download"></i>&nbsp;Download Lecture';
        document.getElementById('hls-detect-btn').disabled = false;
        document.getElementById('hls-clear-btn').disabled = false;
        return;
      }

      try {
        var info = JSON.parse(data);
        setProgress('hls', info.pct || 0);

        if (info.status === 'error') {
          showStatus('hls', 'Error: ' + (info.msg || 'Unknown error'), 'error');
          evtSource.close();
          btn.disabled = false; btn.style.cursor = 'pointer';
          btn.innerHTML = '<i class="ti ti-download"></i>&nbsp;Download Lecture';
          document.getElementById('hls-detect-btn').disabled = false;
          document.getElementById('hls-clear-btn').disabled = false;
        } else if (info.pct >= 100 && info.file) {
          setProgress('hls', 100);
          showStatus('hls', '✅ Done — saved to downloads/' + info.file, 'success');
        } else {
          showStatus('hls', info.msg || 'Working...', 'info');
        }
      } catch(parseErr) {
        // Ignore unparseable messages
      }
    };

    evtSource.onerror = function() {
      evtSource.close();
      showStatus('hls', 'Connection to server lost. Check the server console for details.', 'error');
      btn.disabled = false; btn.style.cursor = 'pointer';
      btn.innerHTML = '<i class="ti ti-download"></i>&nbsp;Download Lecture';
      document.getElementById('hls-detect-btn').disabled = false;
      document.getElementById('hls-clear-btn').disabled = false;
    };

  } catch(e) {
    showStatus('hls', 'Error: ' + e.message, 'error');
    btn.disabled = false; btn.style.cursor = 'pointer';
    btn.innerHTML = '<i class="ti ti-download"></i>&nbsp;Download Lecture';
    document.getElementById('hls-detect-btn').disabled = false;
    document.getElementById('hls-clear-btn').disabled = false;
  }
}
