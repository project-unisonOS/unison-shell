const echoInput = document.getElementById('echoText')
const echoResult = document.getElementById('echoResult')
const sendEchoBtn = document.getElementById('sendEcho')
const saveOnboardingBtn = document.getElementById('saveOnboarding')
const onboardingStatus = document.getElementById('onboardingStatus')
const languageSelect = document.getElementById('language')
const requestConfirmBtn = document.getElementById('requestConfirm')
let sendConfirmBtn = document.getElementById('sendConfirm')
const confirmAlt = document.getElementById('confirmAlt')
const confirmResult = document.getElementById('confirmResult')

// Multimodal
const captureSpeechBtn = document.getElementById('captureSpeech')
const captureVisionBtn = document.getElementById('captureVision')
const sendSpeechEventBtn = document.getElementById('sendSpeechEvent')
const sendVisionEventBtn = document.getElementById('sendVisionEvent')
const multimodalStatus = document.getElementById('multimodalStatus')
const multimodalResult = document.getElementById('multimodalResult')
const hudWakeword = document.getElementById('hudWakeword')

const ORCH_URL = (window.process && window.process.env && window.process.env.UNISON_ORCH_URL) || 'http://localhost:8080'
const CONTEXT_URL = (window.process && window.process.env && window.process.env.UNISON_CONTEXT_URL) || 'http://localhost:8081'
const SPEECH_URL = (window.process && window.process.env && window.process.env.UNISON_SPEECH_URL) || 'http://localhost:8084'
const VISION_URL = (window.process && window.process.env && window.process.env.UNISON_VISION_URL) || 'http://localhost:8086'
const RENDERER_URL = (window.process && window.process.env && window.process.env.UNISON_RENDERER_URL) || 'http://localhost:8092'

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  try { return { ok: res.ok, status: res.status, json: JSON.parse(text) } }
  catch { return { ok: res.ok, status: res.status, text } }
}

async function getJson(url) {
  const res = await fetch(url, { method: 'GET' })
  const text = await res.text()
  try { return { ok: res.ok, status: res.status, json: JSON.parse(text) } }
  catch { return { ok: res.ok, status: res.status, text } }
}

function enableConfirmButton() {
  if (!sendConfirmBtn) return
  try {
    sendConfirmBtn.disabled = false
    sendConfirmBtn.removeAttribute('disabled')
    sendConfirmBtn.setAttribute('aria-disabled', 'false')
    sendConfirmBtn.style.opacity = '1'
    sendConfirmBtn.style.pointerEvents = 'auto'
    console.log('[shell] confirm button state after enable:', {
      disabledProp: sendConfirmBtn.disabled,
      hasDisabledAttr: sendConfirmBtn.hasAttribute('disabled')
    })
    // As a last resort, if the button still appears disabled, replace with a fresh node
    if (sendConfirmBtn.disabled || sendConfirmBtn.hasAttribute('disabled')) {
      console.warn('[shell] replacing confirm button node to drop disabled state')
      const parent = sendConfirmBtn.parentElement
      const replacement = sendConfirmBtn.cloneNode(true)
      replacement.disabled = false
      replacement.removeAttribute('disabled')
      replacement.setAttribute('aria-disabled', 'false')
      replacement.style.opacity = '1'
      replacement.style.pointerEvents = 'auto'
      parent.replaceChild(replacement, sendConfirmBtn)
      // Rebind listener
      replacement.addEventListener('click', async () => {
        if (!lastConfirmToken) return
        replacement.disabled = true
        const r = await postJson(`${ORCH_URL}/event/confirm`, { confirmation_token: lastConfirmToken })
        confirmResult.textContent = JSON.stringify(r.json || r, null, 2)
        lastConfirmToken = null
      })
      // Update reference
      // eslint-disable-next-line no-global-assign
      sendConfirmBtn = replacement
    }
  } catch (e) {
    console.warn('[shell] enableConfirmButton error', e)
  }
}

sendEchoBtn.addEventListener('click', async () => {
  const msg = echoInput.value || 'hello from shell'
  const envelope = {
    timestamp: new Date().toISOString(),
    source: 'unison-shell',
    intent: 'echo',
    payload: { message: msg }
  }
  const resp = await postJson(`${ORCH_URL}/event`, envelope)
  echoResult.textContent = JSON.stringify(resp.json || resp.text || resp, null, 2)
})

saveOnboardingBtn.addEventListener('click', async () => {
  const lang = languageSelect.value
  const person_id = 'local-user'
  // Save to context Tier B (profile) under a namespaced key
  const kvPut = {
    person_id,
    tier: 'B',
    items: {
      [`${person_id}:profile:language`]: lang,
      [`${person_id}:profile:onboarding_complete`]: true
    }
  }
  const resp = await postJson(`${CONTEXT_URL}/kv/put`, kvPut)
  onboardingStatus.textContent = resp.ok ? `Saved (Tier B) for ${person_id}` : `Failed: ${resp.status}`
})

// Wake-word HUD (best-effort)
async function refreshWakewordHud() {
  if (!hudWakeword) return
  try {
    const resp = await getJson(`${RENDERER_URL}/wakeword`)
    if (resp.ok && resp.json && resp.json.wakeword) {
      hudWakeword.textContent = `Wake word: "${resp.json.wakeword}"`
    } else {
      hudWakeword.textContent = 'Wake word: unavailable'
    }
  } catch (e) {
    hudWakeword.textContent = 'Wake word: error'
  }
}
refreshWakewordHud().catch(() => {})

let lastConfirmToken = null
requestConfirmBtn?.addEventListener('click', async () => {
  confirmAlt.textContent = ''
  confirmResult.textContent = ''
  sendConfirmBtn.disabled = true
  lastConfirmToken = null

  const env2 = {
    timestamp: new Date().toISOString(),
    source: 'unison-shell',
    intent: 'summarize.doc',
    payload: {},
    safety_context: { data_classification: 'confidential' }
  }
  const resp = await postJson(`${ORCH_URL}/event`, env2)
  const body = resp.json || {}
  confirmResult.textContent = JSON.stringify(body, null, 2)
  if (body && body.confirmation_token) {
    lastConfirmToken = body.confirmation_token
    const alt = body.policy_suggested_alternative || (body.policy_raw && body.policy_raw.decision && body.policy_raw.decision.suggested_alternative) || ''
    const altText = alt ? `Suggested alternative: ${alt}` : 'Confirmation required.'
    confirmAlt.textContent = `${altText}\nToken: ${lastConfirmToken}`
    // Force-enable
    console.log('[shell] require_confirmation=true token=', lastConfirmToken)
    sendConfirmBtn.classList.remove('disabled')
    enableConfirmButton()
    // Safety re-checks
    setTimeout(enableConfirmButton, 0)
    setTimeout(enableConfirmButton, 50)
    setTimeout(enableConfirmButton, 250)
  } else {
    confirmAlt.textContent = 'No confirmation required.'
    console.log('[shell] no confirmation required or missing token', body?.require_confirmation, body?.confirmation_token)
  }
})

sendConfirmBtn?.addEventListener('click', async () => {
  if (!lastConfirmToken) return
  sendConfirmBtn.disabled = true
  const r = await postJson(`${ORCH_URL}/event/confirm`, { confirmation_token: lastConfirmToken })
  confirmResult.textContent = JSON.stringify(r.json || r, null, 2)
  lastConfirmToken = null
})

// Multimodal I/O
let lastSpeechTranscript = null
let lastVisionImageUrl = null

captureSpeechBtn?.addEventListener('click', async () => {
  multimodalStatus.textContent = ''
  multimodalResult.textContent = ''
  sendSpeechEventBtn.disabled = true
  lastSpeechTranscript = null
  // MVP: use a placeholder base64 audio (tiny silence)
  const placeholderAudio = "UklGRigAAABXQVZFZm10IBAAAAAAQAEAAEAfAAAQAQABAAgAZGF0YQQAAAA="
  const resp = await postJson(`${SPEECH_URL}/speech/stt`, { audio: placeholderAudio })
  multimodalResult.textContent = JSON.stringify(resp.json || resp, null, 2)
  if (resp.ok && resp.json && resp.json.transcript) {
    lastSpeechTranscript = resp.json.transcript
    multimodalStatus.textContent = `Transcript: ${lastSpeechTranscript}`
    sendSpeechEventBtn.disabled = false
    sendSpeechEventBtn.classList.remove('disabled')
    sendSpeechEventBtn.style.opacity = '1'
    sendSpeechEventBtn.style.pointerEvents = 'auto'
  } else {
    multimodalStatus.textContent = 'STT failed.'
  }
})

captureVisionBtn?.addEventListener('click', async () => {
  multimodalStatus.textContent = ''
  multimodalResult.textContent = ''
  sendVisionEventBtn.disabled = true
  lastVisionImageUrl = null
  const resp = await postJson(`${VISION_URL}/vision/capture`, {})
  multimodalResult.textContent = JSON.stringify(resp.json || resp, null, 2)
  if (resp.ok && resp.json && resp.json.image_url) {
    lastVisionImageUrl = resp.json.image_url
    multimodalStatus.textContent = `Image captured (data URL).`
    sendVisionEventBtn.disabled = false
    sendVisionEventBtn.classList.remove('disabled')
    sendVisionEventBtn.style.opacity = '1'
    sendVisionEventBtn.style.pointerEvents = 'auto'
  } else {
    multimodalStatus.textContent = 'Image capture failed.'
  }
})

sendSpeechEventBtn?.addEventListener('click', async () => {
  if (!lastSpeechTranscript) return
  const envelope = {
    timestamp: new Date().toISOString(),
    source: 'io-speech',
    intent: 'echo',
    payload: { transcript: lastSpeechTranscript }
  }
  const resp = await postJson(`${ORCH_URL}/event`, envelope)
  multimodalResult.textContent = JSON.stringify(resp.json || resp, null, 2)
})

sendVisionEventBtn?.addEventListener('click', async () => {
  if (!lastVisionImageUrl) return
  const envelope = {
    timestamp: new Date().toISOString(),
    source: 'io-vision',
    intent: 'echo',
    payload: { image_url: lastVisionImageUrl }
  }
  const resp = await postJson(`${ORCH_URL}/event`, envelope)
  multimodalResult.textContent = JSON.stringify(resp.json || resp, null, 2)
})
