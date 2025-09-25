/* Tam işlevsel script - hata kontrolleri ve stabilite eklendi.
   Yalnızca bu dosyayı projenizdeki varsa eskisiyle değiştirin.
   Diğer dosyalara dokunmadım.
*/

// --- Yardımcılar ---
const $ = id => document.getElementById(id);

let typingTimer = null;
const DEBOUNCE_MS = 600;

// Basit hata/uyarı gösterimi
function showMessage(msg){
  const out = $('output');
  out.textContent = msg;
}

// Dil kodu dönüşümü (speechSynthesis için küçük düzeltmeler)
function speechLangFor(code){
  // bazı kodlar speechSynthesis tarafından farklı formatta beklenebilir
  if(code === 'zh-CN') return 'zh-CN';
  if(code === 'zh-TW') return 'zh-TW';
  if(code === 'pt') return 'pt-PT';
  if(code === 'en') return 'en-US';
  return code;
}

// --- Çeviri ---
async function translateText(){
  const input = $('inputText').value.trim();
  let from = $('fromLang').value;
  let to = $('toLang').value;

  if(!input){
    showMessage('⚠️ Lütfen bir metin girin!');
    return;
  }

  // MyMemory "auto" desteklemediği için kullanıcı otomatik olarak auto seçerse fallback kullanıyoruz
  if(from === 'auto') from = 'en';

  showMessage('⏳ Çeviriliyor...');

  try{
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(input)}&langpair=${from}|${to}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log('MyMemory cevap:', data);

    const translated = data && data.responseData && data.responseData.translatedText ? data.responseData.translatedText : null;

    if(!translated){
      showMessage('❌ Çeviri alınamadı (API yanıtı boş).');
      return;
    }

    $('output').textContent = translated;
    saveToHistory(input, translated, to);
  }catch(err){
    console.error('Çeviri hatası:', err);
    showMessage('❌ Çeviri sırasında hata oluştu.');
  }
}

// --- Sesli okuma ---
function speakText(){
  const text = $('output').textContent || '';
  if(!text || text.includes('⚠️') || text.includes('❌') || text.includes('💡')){
    alert('Sesli okunacak çeviri bulunamadı!');
    return;
  }
  const code = speechLangFor($('toLang').value);
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = code;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// --- Kopyala ---
function copyTranslation(){
  const text = $('output').textContent || '';
  if(!text || text.includes('⚠️') || text.includes('❌') || text.includes('💡')){
    alert('Kopyalanacak geçerli bir çeviri yok!');
    return;
  }
  navigator.clipboard.writeText(text).then(()=>{
    alert('✅ Çeviri panoya kopyalandı!');
  }).catch(err => {
    console.error('Kopyalama hatası', err);
    alert('Kopyalama başarısız.');
  });
}

// --- Geçmiş & Favoriler ---
function saveToHistory(input, output, lang){
  try{
    const h = JSON.parse(localStorage.getItem('translationHistory')||'[]');
    h.unshift({input, output, lang, at: new Date().toISOString()});
    localStorage.setItem('translationHistory', JSON.stringify(h.slice(0,200))); // max 200
    renderHistory();
  }catch(e){ console.error(e); }
}

function renderHistory(){
  const list = JSON.parse(localStorage.getItem('translationHistory')||'[]');
  const el = $('historyList');
  el.innerHTML = '';
  list.forEach((it, idx)=>{
    const li = document.createElement('li');
    li.innerHTML = `<div class="hist-item"><strong>${escapeHtml(it.input)}</strong><div class="muted">${it.at.split('T')[0]}</div><div>➝ ${escapeHtml(it.output)}</div></div><div><button onclick="addToFavorites(${idx})">⭐</button></div>`;
    el.appendChild(li);
  });
}

function clearHistory(){
  localStorage.removeItem('translationHistory');
  renderHistory();
}

function addToFavorites(idx){
  const hist = JSON.parse(localStorage.getItem('translationHistory')||'[]');
  const item = hist[idx];
  if(!item) return;
  const favs = JSON.parse(localStorage.getItem('favorites')||'[]');
  if(!favs.some(f=> f.input===item.input && f.output===item.output)){
    favs.unshift(item);
    localStorage.setItem('favorites', JSON.stringify(favs.slice(0,200)));
    renderFavorites();
  }
}

function renderFavorites(){
  const favs = JSON.parse(localStorage.getItem('favorites')||'[]');
  const el = $('favoritesList');
  el.innerHTML = '';
  favs.forEach(it=>{
    const li = document.createElement('li');
    li.innerHTML = `<div class="hist-item"><strong>${escapeHtml(it.input)}</strong><div class="muted">${it.at?it.at.split('T')[0]:''}</div><div>➝ ${escapeHtml(it.output)}</div></div>`;
    el.appendChild(li);
  });
}

function clearFavorites(){
  localStorage.removeItem('favorites');
  renderFavorites();
}

// --- Utility ---
function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// --- Swap languages ---
function swapLanguages(){
  const from = $('fromLang');
  const to = $('toLang');
  if(from.value === 'auto'){ alert('🌍 Otomatik algılamada değişim yapılamaz!'); return; }
  const tmp = from.value;
  from.value = to.value;
  to.value = tmp;
}

// --- Auto translate (debounce) ---
function autoTranslate(){
  clearTimeout(typingTimer);
  typingTimer = setTimeout(()=>{ translateText(); }, DEBOUNCE_MS);
}

// --- Dark mode toggle (robust) ---
function toggleDarkMode(){
  document.body.classList.toggle('dark-mode');
  const on = document.body.classList.contains('dark-mode');
  try{ localStorage.setItem('theme', on ? 'dark' : 'light'); }catch(e){}
  const btn = $('darkToggle');
  if(btn) btn.textContent = on ? '☀️ Light Mode' : '🌙 Dark Mode';
}

// --- Init ---
function initApp(){
  // connect buttons
  const translateBtn = $('translateBtn');
  if(translateBtn) translateBtn.addEventListener('click', translateText);

  const speakBtn = $('speakBtn');
  if(speakBtn) speakBtn.addEventListener('click', speakText);

  const copyBtn = $('copyBtn');
  if(copyBtn) copyBtn.addEventListener('click', copyTranslation);

  const swapBtn = $('swapBtn');
  if(swapBtn) swapBtn.addEventListener('click', swapLanguages);

  const input = $('inputText');
  if(input) input.addEventListener('input', autoTranslate);

  const clearHist = $('clearHistoryBtn');
  if(clearHist) clearHist.addEventListener('click', clearHistory);

  const clearFav = $('clearFavBtn');
  if(clearFav) clearFav.addEventListener('click', clearFavorites);

  const darkBtn = $('darkToggle');
  if(darkBtn) darkBtn.addEventListener('click', toggleDarkMode);

  const yt = $('youtubeBtn');
  if(yt) yt.addEventListener('click', ()=> window.open('https://www.youtube.com/@MTechnow','_blank'));

  // restore theme
  const saved = localStorage.getItem('theme');
  if(saved === 'dark') document.body.classList.add('dark-mode');

  // render lists
  renderHistory();
  renderFavorites();
}

// start when DOM ready
document.addEventListener('DOMContentLoaded', initApp);
